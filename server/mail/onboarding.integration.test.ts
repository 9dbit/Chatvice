import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID,createHmac} from "node:crypto";
import {spawnSync} from "node:child_process";
import pg from "pg";
import express from "express";

if(process.env.CHATVICE_MAIL_INTEGRATION_DB!=="isolated-ci"||!process.env.DATABASE_URL)throw Error("Disposable CI database required");
const root=new URL(process.env.DATABASE_URL),name="chatvice_onboarding_"+randomUUID().replace(/-/g,"");
const admin=new pg.Pool({connectionString:root.href,max:1});
await admin.query(`CREATE DATABASE "${name}"`);
const url=new URL(root.href);url.pathname="/"+name;
Object.assign(process.env,{DATABASE_URL:url.href,CHATVICE_MAIL_APP_ROLE:"isolated-mail",CHATVICE_MAIL_ONBOARDING_ENABLED:"true",
  CHATVICE_MAIL_ROUTER_DOMAINS:"accounts.example.invalid",CHATVICE_MAIL_ROUTER_FORWARD_TO:"router@transport.example.invalid",
  CHATVICE_MAIL_ROUTER_SECRET:"b".repeat(64),CHATVICE_MAIL_ENCRYPTION_KEY:"c".repeat(64),CHATVICE_MAIL_SESSION_SECRET:"d".repeat(64),
  CHATVICE_MAIL_APP_ORIGIN:"https://mail.example.invalid",CHATVICE_MAIL_ALLOWED_ORIGINS:"https://mail.example.invalid",
  CHATVICE_MAIL_ENABLED:"true",CHATVICE_MAIL_OUTBOUND_ENABLED:"true",RESEND_API_KEY:"re_synthetic_test_key_only",
  CHATVICE_MAIL_PROVIDER:"resend",CHATVICE_MAIL_AI_ENABLED:"false",CHATVICE_MAIL_ATTACHMENTS_ENABLED:"false"});
const setup=spawnSync("node",["scripts/mail-app-schema.mjs"],{encoding:"utf8",env:{...process.env,
  CHATVICE_MAIL_SCHEMA_INSTALL:"reviewed-isolated-only",CHATVICE_MAIL_SCHEMA_EXPECTED_HOST:root.hostname,
  CHATVICE_MAIL_INITIAL_TENANT:"onboarding_ci",CHATVICE_MAIL_QA_BOOTSTRAP:"false"}});
assert.equal(setup.status,0,setup.stderr);
const {pool}=await import("../db");
const {createStandaloneMailbox,activateMailbox,acceptProvisioningProbe,runProvisioningChecks,tokenHash,registerMailActivation}=await import("./onboarding");
const {findManagedRecipient,verifyRouteEnvelope,resolveRoutedRecipient,registerMailRouterLookup}=await import("./router");
const {registerMailLogin}=await import("./login");
const {registerMailRoutes}=await import("./routes");
const {decryptMailField}=await import("./crypto");
const {verifyMailPassword,hashMailPassword}=await import("./password");
const {ingestIncomingMail}=await import("./ingest");
const tenant="onboarding_ci",domain=randomUUID(),legacy=randomUUID(),password="Synthetic unique passphrase for onboarding tests 2026!";
await pool.query("INSERT INTO mail_domains(id,tenant_id,domain,status,verification_token) VALUES($1,$2,'accounts.example.invalid','verified','fixture')",[domain,tenant]);
await pool.query("INSERT INTO mail_mailboxes(id,tenant_id,domain_id,local_part,display_name) VALUES($1,$2,$3,'existing','Existing mailbox')",[legacy,tenant,domain]);
const app=express();registerMailRouterLookup(app);app.use(express.json({verify:(req,_res,buf)=>{req.rawBody=Buffer.from(buf)}}));
registerMailLogin(app,pool,process.env.CHATVICE_MAIL_APP_ORIGIN!,process.env.CHATVICE_MAIL_SESSION_SECRET!);
registerMailActivation(app);registerMailRoutes(app);
const server=app.listen(0,"127.0.0.1");await new Promise<void>(r=>server.once("listening",r));
const base=`http://127.0.0.1:${(server.address() as any).port}`;
const actualFetch=globalThis.fetch;
function api(path:string,body?:unknown,cookie?:string,origin="https://mail.example.invalid"){
  return actualFetch(base+path,{method:body===undefined?"GET":"POST",headers:{Origin:origin,"Content-Type":"application/json",...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
function signed(to:string,mid="<fixture@example.invalid>",ts=Date.now()){
  const payload=Buffer.from(JSON.stringify({v:1,to,mid,id:randomUUID(),ts})).toString("base64url");
  return payload+"."+createHmac("sha256",process.env.CHATVICE_MAIL_ROUTER_SECRET!).update(payload).digest("hex");
}
let created:Awaited<ReturnType<typeof createStandaloneMailbox>>,token="",cookie="";
test("concurrent create is atomic, creates one independent identity, and never changes existing mailbox",async()=>{
  const before=(await pool.query("SELECT * FROM mail_mailboxes WHERE id=$1",[legacy])).rows;
  const results=await Promise.allSettled([1,2].map(()=>createStandaloneMailbox(tenant,{domainId:domain,localPart:"new-user",displayName:"New User"})));
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1);
  assert.equal((results.find(x=>x.status==="rejected") as PromiseRejectedResult).reason.status,409);
  created=(results.find(x=>x.status==="fulfilled") as PromiseFulfilledResult<any>).value;
  token=new URL(created.activationUrl).hash.slice(7);
  const u=(await pool.query("SELECT * FROM mail_login_users WHERE email=$1",[created.address])).rows[0];
  assert.equal(u.enabled,false);assert.equal(u.is_admin,false);assert.equal(await verifyMailPassword(password,u.password_hash),false);
  const memberships=(await pool.query("SELECT mailbox_id,role FROM mail_memberships WHERE user_id=$1",[u.user_id])).rows;
  assert.deepEqual(memberships,[{mailbox_id:created.id,role:"member"}]);
  assert.deepEqual((await pool.query("SELECT * FROM mail_mailboxes WHERE id=$1",[legacy])).rows,before);
  assert.equal((await pool.query("SELECT token_hash FROM mail_account_invitations WHERE mailbox_id=$1",[created.id])).rows[0].token_hash,tokenHash(token));
  assert.equal((await api("/api/mail-auth/login",{email:created.address,password})).status,401);
});
test("tenant, alias and domain guards reject creation without leaving partial identities",async()=>{
  await assert.rejects(createStandaloneMailbox("another_tenant",{domainId:domain,localPart:"bad"}),e=>(e as any).status===404);
  await pool.query("INSERT INTO mail_aliases(id,tenant_id,domain_id,mailbox_id,local_part) VALUES($1,$2,$3,$4,'taken-alias')",[randomUUID(),tenant,domain,legacy]);
  await assert.rejects(createStandaloneMailbox(tenant,{domainId:domain,localPart:"taken-alias"}),e=>(e as any).status===409);
  const unknown=randomUUID();await pool.query("INSERT INTO mail_domains(id,tenant_id,domain,verification_token) VALUES($1,$2,'unready.example.invalid','fixture')",[unknown,tenant]);
  await assert.rejects(createStandaloneMailbox(tenant,{domainId:unknown,localPart:"bad"}),e=>(e as any).status===409);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mail_login_users")).rows[0].n,1);
});
test("activation rejects CSRF, weak passwords, expired tokens and replay; login exposes only its inbox",async()=>{
  assert.equal((await api("/api/mail-auth/activate",{token,password},undefined,"https://evil.example.invalid")).status,403);
  assert.equal((await api("/api/mail-auth/activate",{token,password:"short"})).status,400);
  await pool.query("UPDATE mail_account_invitations SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[tokenHash(token)]);
  await assert.rejects(activateMailbox(token,password),e=>(e as any).status===410);
  await pool.query("UPDATE mail_account_invitations SET expires_at=now()+interval '1 hour' WHERE token_hash=$1",[tokenHash(token)]);
  const results=await Promise.all([api("/api/mail-auth/activate",{token,password}),api("/api/mail-auth/activate",{token,password})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,410]);
  const login=await api("/api/mail-auth/login",{email:created.address,password});assert.equal(login.status,200);
  assert.equal((await login.json()).admin,false);cookie=login.headers.get("set-cookie")!.split(";")[0];
  const boxes=await api("/api/mail/mailboxes",undefined,cookie);assert.deepEqual((await boxes.json()).map((x:any)=>x.id),[created.id]);
  assert.equal((await api("/api/mail/onboarding/status",undefined,cookie)).status,403);
  assert.equal((await api("/api/mail/mailboxes",{accountMode:"standalone",domainId:domain,localPart:"forbidden"},cookie)).status,403);
});
test("trusted envelope defeats forged To/CC/BCC routing and rejects unsigned central deliveries",async()=>{
  const recipient=created.address,mid="<fixture@example.invalid>",value=signed(recipient);
  assert.equal(verifyRouteEnvelope(value,mid,process.env.CHATVICE_MAIL_ROUTER_SECRET!)?.to,recipient);
  assert.equal(verifyRouteEnvelope(value,mid+"forged",process.env.CHATVICE_MAIL_ROUTER_SECRET!),null);
  assert.equal(verifyRouteEnvelope(value.slice(0,-1)+(value.endsWith("0")?"1":"0"),mid,process.env.CHATVICE_MAIL_ROUTER_SECRET!),null);
  assert.equal(verifyRouteEnvelope(signed(recipient,mid,Date.now()-8*86400000),mid,process.env.CHATVICE_MAIL_ROUTER_SECRET!),null);
  assert.equal(await resolveRoutedRecipient({to:["existing@accounts.example.invalid"]}),null);
  assert.deepEqual(await resolveRoutedRecipient({to:[process.env.CHATVICE_MAIL_ROUTER_FORWARD_TO]}),{ignored:true});
  const route=await resolveRoutedRecipient({headers:{"X-Chatvice-Route-V1":value},message_id:mid,to:["existing@accounts.example.invalid"],received_for:[process.env.CHATVICE_MAIL_ROUTER_FORWARD_TO]});
  assert.ok(route&&!route.ignored);
  const mail={eventId:route.eventId,from:"sender@example.invalid",to:["existing@accounts.example.invalid"],cc:["existing@accounts.example.invalid"],bcc:["existing@accounts.example.invalid"],subject:"Private",text:"Envelope isolation",envelopeRecipients:[route.recipient]};
  assert.equal((await ingestIncomingMail(mail)).saved,1);assert.equal((await ingestIncomingMail(mail)).duplicate,1);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mail_messages WHERE mailbox_id=$1",[legacy])).rows[0].n,0);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mail_messages WHERE mailbox_id=$1",[created.id])).rows[0].n,1);
  assert.equal(await findManagedRecipient("existing@accounts.example.invalid"),null);
  assert.equal(await findManagedRecipient("unknown@accounts.example.invalid"),null);
});
test("lookup requires shared secret and disabled mailboxes stop receiving",async()=>{
  const lookup=()=>actualFetch(base+"/api/mail/router/recipient",{method:"POST",headers:{Authorization:"Bearer "+process.env.CHATVICE_MAIL_ROUTER_SECRET,"Content-Type":"application/json"},body:JSON.stringify({address:created.address})});
  assert.equal((await api("/api/mail/router/recipient",{address:created.address})).status,401);
  assert.equal((await lookup()).status,204);
  await pool.query("UPDATE mail_mailboxes SET enabled=false WHERE id=$1",[created.id]);assert.equal((await lookup()).status,404);
  await pool.query("UPDATE mail_mailboxes SET enabled=true WHERE id=$1",[created.id]);
});
test("provider acceptance is not Ready; only the authenticated returning probe verifies delivery",async()=>{
  let sent:any,headers:any;
  globalThis.fetch=(async(_url:any,init:any)=>{sent=JSON.parse(init.body);headers=init.headers;return new Response(JSON.stringify({id:"synthetic-provider-id"}),{status:200,headers:{"Content-Type":"application/json"}});}) as any;
  try{await runProvisioningChecks();}finally{globalThis.fetch=actualFetch;}
  let p=(await pool.query("SELECT * FROM mail_mailbox_provisioning WHERE mailbox_id=$1",[created.id])).rows[0];
  assert.equal(p.state,"checking");assert.equal(p.inbound_verified_at,null);assert.equal(p.provider_id,"synthetic-provider-id");
  assert.equal(sent.to[0],created.address);assert.equal(headers["Idempotency-Key"],"chatvice-mail/"+p.probe_id);
  assert.equal(await acceptProvisioningProbe(legacy,sent.text),false);
  assert.equal(await acceptProvisioningProbe(created.id,`CHATVICE-SETUP-V1:${p.probe_id}:${"0".repeat(64)}`),false);
  assert.equal(await acceptProvisioningProbe(created.id,sent.text),true);assert.equal(await acceptProvisioningProbe(created.id,sent.text),true);
  p=(await pool.query("SELECT * FROM mail_mailbox_provisioning WHERE mailbox_id=$1",[created.id])).rows[0];assert.equal(p.state,"verified");assert.ok(p.inbound_verified_at);assert.equal(p.probe_secret,"");
});
test("admin invitation rotation invalidates the previous link and cannot reset active accounts",async()=>{
  await pool.query("INSERT INTO mail_login_users(id,tenant_id,user_id,email,password_hash,is_admin) VALUES($1,$2,$2,'admin@example.invalid',$3,true)",[randomUUID(),tenant,await hashMailPassword(password)]);
  const a=await api("/api/mail-auth/login",{email:"admin@example.invalid",password});const ac=a.headers.get("set-cookie")!.split(";")[0];
  const pending=await createStandaloneMailbox(tenant,{domainId:domain,localPart:"rotate"}),old=new URL(pending.activationUrl).hash.slice(7);
  const r=await api(`/api/mail/mailboxes/${pending.id}/onboarding/invitation`,{},ac);assert.equal(r.status,200);
  const replacement=await r.json();await assert.rejects(activateMailbox(old,password),e=>(e as any).status===410);
  await activateMailbox(new URL(replacement.activationUrl).hash.slice(7),password);
  assert.equal((await api(`/api/mail/mailboxes/${pending.id}/onboarding/invitation`,{},ac)).status,409);
  await pool.query("UPDATE mail_login_users SET enabled=false WHERE email=$1",[pending.address]);
  assert.equal((await api(`/api/mail/mailboxes/${pending.id}/onboarding/invitation`,{},ac)).status,409,'disabled active identities must not be reset through onboarding');
  await pool.query("UPDATE mail_login_users SET enabled=true WHERE email=$1",[pending.address]);
  const status=await (await api("/api/mail/onboarding/status",undefined,ac)).json();assert.equal(status.mailboxes.find((x:any)=>x.mailbox_id===created.id).status,"ready");
  assert.equal(status.mailboxes.find((x:any)=>x.mailbox_id===pending.id).status,"pending");
});
test.after(async()=>{globalThis.fetch=actualFetch;await new Promise<void>(r=>server.close(()=>r()));await pool.end();await admin.query(`DROP DATABASE "${name}"`);await admin.end();});
