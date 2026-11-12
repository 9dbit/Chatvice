import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import pg from "pg";
import express from "express";

if(process.env.CHATVICE_MAIL_INTEGRATION_DB!=="isolated-ci"||!process.env.DATABASE_URL ||
   !["127.0.0.1","localhost"].includes(new URL(process.env.DATABASE_URL).hostname))
  throw Error("Disposable isolated Mail signup CI database required");
const baseDb=new URL(process.env.DATABASE_URL),name="mail_public_signup_"+randomUUID().replace(/-/g,"");
const admin=new pg.Pool({connectionString:baseDb.href,max:1});
await admin.query('CREATE DATABASE "'+name+'"');
const dbUrl=new URL(baseDb.href);dbUrl.pathname="/"+name;
const origin="https://mail.example.invalid";
Object.assign(process.env,{
  DATABASE_URL:dbUrl.href,CHATVICE_MAIL_APP_ROLE:"isolated-mail",CHATVICE_MAIL_ENABLED:"true",
  CHATVICE_MAIL_PUBLIC_SIGNUP_ENABLED:"true",CHATVICE_MAIL_PUBLIC_SIGNUP_DOMAIN:"chatvice.app",
  CHATVICE_MAIL_PUBLIC_SIGNUP_FROM:"hello@chatvice.app",CHATVICE_MAIL_TURNSTILE_SITE_KEY:"site-key-fixture",
  CHATVICE_MAIL_TURNSTILE_SECRET:"secret-key-fixture",CHATVICE_MAIL_INITIAL_TENANT:"public_signup_ci",
  CHATVICE_MAIL_ONBOARDING_ENABLED:"true",CHATVICE_MAIL_ROUTER_DOMAINS:"chatvice.app",
  CHATVICE_MAIL_ROUTER_FORWARD_TO:"router@transport.example.invalid",CHATVICE_MAIL_ROUTER_SECRET:"b".repeat(64),
  CHATVICE_MAIL_ENCRYPTION_KEY:"c".repeat(64),CHATVICE_MAIL_SESSION_SECRET:"d".repeat(64),
  CHATVICE_MAIL_APP_ORIGIN:origin,CHATVICE_MAIL_ALLOWED_ORIGINS:origin,
  CHATVICE_MAIL_OUTBOUND_ENABLED:"true",CHATVICE_MAIL_PROVIDER:"resend",
  CHATVICE_MAIL_AI_ENABLED:"false",CHATVICE_MAIL_ATTACHMENTS_ENABLED:"false",RESEND_API_KEY:"re_synthetic_not_live_key",
});
const installed=spawnSync("node",["scripts/mail-app-schema.mjs"],{encoding:"utf8",env:{
  ...process.env,CHATVICE_MAIL_SCHEMA_INSTALL:"reviewed-isolated-only",
  CHATVICE_MAIL_SCHEMA_EXPECTED_HOST:baseDb.hostname,CHATVICE_MAIL_QA_BOOTSTRAP:"false"
}});
assert.equal(installed.status,0,installed.stderr);
const {pool}=await import("../db");
const {registerMailLogin}=await import("./login");
const {registerMailPublicSignup}=await import("./public-signup");
const {registerMailActivation}=await import("./onboarding");
const {registerMailRoutes}=await import("./routes");
const {tokenHash}=await import("./onboarding");
const {hashMailPassword}=await import("./password");
const domain=randomUUID();
await pool.query("INSERT INTO mail_domains(id,tenant_id,domain,status,verification_token) VALUES($1,'public_signup_ci','chatvice.app','verified','fixture')",[domain]);
const app=express();app.use(express.json());registerMailLogin(app,pool,origin,process.env.CHATVICE_MAIL_SESSION_SECRET!);
registerMailPublicSignup(app);registerMailActivation(app);registerMailRoutes(app);
const srv=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>srv.once("listening",resolve));
const host="http://127.0.0.1:"+(srv.address() as any).port;
const originalFetch=globalThis.fetch;
const outbound:{to:string[];text:string}[]=[];
globalThis.fetch=(async(url:any,options:any={})=>{
  const address=String(url);
  if(address==="https://challenges.cloudflare.com/turnstile/v0/siteverify"){
    const token=new URLSearchParams(options.body).get("response");
    return new Response(JSON.stringify({success:token==="synthetic-human-token",hostname:"mail.example.invalid",action:"mail_signup"}),{
      status:200,headers:{"Content-Type":"application/json"}
    });
  }
  if(address==="https://api.resend.com/emails"){
    const message=JSON.parse(options.body);outbound.push({to:message.to,text:message.text});
    return new Response(JSON.stringify({id:"synthetic-message-"+outbound.length}),{
      status:200,headers:{"Content-Type":"application/json"}
    });
  }
  return originalFetch(url,options);
}) as typeof fetch;
const api=(path:string,body?:unknown,opts:{cookie?:string;origin?:string}={})=>originalFetch(host+path,{
  method:body===undefined?"GET":"POST",
  headers:{"Origin":opts.origin||origin,"Content-Type":"application/json",...(opts.cookie?{"Cookie":opts.cookie}:{})},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
});
const newSignup={contactEmail:"owner@external.example",localPart:"studio-guest",displayName:"Studio Guest",
  turnstileToken:"synthetic-human-token"};
test("public signup verifies contacts, creates independently isolated mailboxes, and sends without a daily quota",async()=>{
  const config=await (await api("/api/mail-auth/signup/config")).json();
  assert.deepEqual(config,{enabled:true,domain:"chatvice.app",siteKey:"site-key-fixture"});
  assert.equal((await api("/api/mail-auth/signup/request",{...newSignup,turnstileToken:"invalid-human-token"})).status,403);
  assert.equal(outbound.length,0);
  assert.equal((await api("/api/mail-auth/signup/request",newSignup,{origin:"https://attacker.example.invalid"})).status,403);
  assert.equal((await api("/api/mail-auth/signup/request",{...newSignup,localPart:"hello"})).status,400);
  const request=await api("/api/mail-auth/signup/request",newSignup);
  assert.equal(request.status,202);
  assert.deepEqual(await request.json(),{accepted:true});
  assert.equal(outbound.length,1);
  assert.deepEqual(outbound[0].to,["owner@external.example"]);
  assert.equal((await pool.query("SELECT count(*)::int n FROM mail_login_users")).rows[0].n,0,
    "unverified contact must not create a mailbox identity");
  assert.equal((await pool.query("SELECT count(*)::int n FROM mail_mailboxes")).rows[0].n,0);
  const link=outbound[0].text.match(/https:\/\/mail\.example\.invalid\/signup\/verify#token=[0-9a-f]{64}/)?.[0];
  assert.ok(link);
  const token=new URL(link).hash.slice("#token=".length);
  assert.equal((await api("/api/mail-auth/signup/verify",{token:"a".repeat(64)})).status,410);
  assert.equal((await api("/api/mail-auth/signup/verify",{token},{origin:"https://attacker.example.invalid"})).status,403);
  await pool.query("UPDATE mail_public_signups SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[tokenHash(token)]);
  assert.equal((await api("/api/mail-auth/signup/verify",{token})).status,410);
  await pool.query("UPDATE mail_public_signups SET expires_at=now()+interval '15 minutes' WHERE token_hash=$1",[tokenHash(token)]);
  const verified=await api("/api/mail-auth/signup/verify",{token});
  assert.equal(verified.status,200);
  const response=await verified.json();
  assert.equal(response.address,"studio-guest@chatvice.app");
  assert.ok(response.activationUrl.startsWith(origin+"/activate#token="));
  assert.equal((await api("/api/mail-auth/signup/verify",{token})).status,410,"email link must be single-use");
  const authToken=new URL(response.activationUrl).hash.slice("#token=".length);
  const passphrase="Unique test passphrase 2026--only for disposable CI!";
  assert.equal((await api("/api/mail-auth/login",{email:response.address,password:passphrase})).status,401);
  assert.equal((await api("/api/mail-auth/activate",{token:authToken,password:passphrase})).status,200);
  assert.equal((await api("/api/mail-auth/activate",{token:authToken,password:passphrase})).status,410);
  const login=await api("/api/mail-auth/login",{email:response.address,password:passphrase});
  assert.equal(login.status,200);
  const cookie=login.headers.get("set-cookie")!.split(";")[0];
  assert.equal((await api("/api/mail/onboarding/status",undefined,{cookie})).status,403,
    "public members must never get administrator setup powers");
  const boxes=await (await api("/api/mail/mailboxes",undefined,{cookie})).json();
  assert.equal(boxes.length,1);
  assert.equal(boxes[0].local_part,"studio-guest");
  // Every public member shares an isolated Mail tenant, but must not see or edit CRM records.
  const leadId="lead_public_ci";
  const senderEmail="crm-contact@example.invalid";
  await pool.query("INSERT INTO leads(id,merchant_id,customer_name,customer_email,stage,source) VALUES($1,'public_signup_ci','Private CRM Name',$2,'hot','internal')",[leadId,senderEmail]);
  const threadId=randomUUID(),incomingId=randomUUID();
  await pool.query("INSERT INTO mail_threads(id,tenant_id,mailbox_id,subject) VALUES($1,'public_signup_ci',$2,'synthetic')",[threadId,boxes[0].id]);
  await pool.query(`INSERT INTO mail_messages(id,tenant_id,mailbox_id,thread_id,direction,folder,status,from_email,to_emails,subject,text_body)
    VALUES($1,'public_signup_ci',$2,$3,'inbound','inbox','received',$4,'[]'::jsonb,'synthetic','synthetic')`,[incomingId,boxes[0].id,threadId,senderEmail]);
  const mailContext=await api("/api/mail/threads/"+threadId+"/context",undefined,{cookie});
  assert.equal(mailContext.status,200);
  assert.deepEqual(await mailContext.json(),{sender:senderEmail,lead:null},"public inbox must not leak shared tenant CRM data");
  assert.equal((await api("/api/mail/threads/"+threadId+"/convert-to-lead",{}, {cookie})).status,403);
  process.env.CHATVICE_MAIL_AI_ENABLED="true";
  process.env.CHATVICE_MAIL_AI_API_KEY="synthetic-key-no-provider-request";
  try{
    const trialCaps=await (await api("/api/mail/capabilities",undefined,{cookie})).json();
    assert.equal(trialCaps.ai,false);assert.equal(trialCaps.crm,false);
    assert.equal((await api("/api/mail/threads/"+threadId+"/ai",
      {task:"summary",acknowledgeExternalProcessing:true},{cookie})).status,403,
      "public accounts cannot consume shared AI token budget");
  }finally{
    process.env.CHATVICE_MAIL_AI_ENABLED="false";
    delete process.env.CHATVICE_MAIL_AI_API_KEY;
  }
  assert.equal((await pool.query("SELECT customer_name FROM leads WHERE id=$1",[leadId])).rows[0].customer_name,"Private CRM Name");
  const badSend=await api("/api/mail/compose",{mailboxId:boxes[0].id,to:[
    "one@example.invalid","two@example.invalid","three@example.invalid","four@example.invalid"],
    text:"No bulk mail",draft:false},{cookie});
  assert.equal(badSend.status,429);
  for(let i=0;i<12;i++){
    const sent=await api("/api/mail/compose",{mailboxId:boxes[0].id,to:["recipient@example.invalid"],
      subject:"Synthetic "+i,text:"No fixed daily quota",draft:false},{cookie});
    assert.equal(sent.status,201,"public send allowed below minute burst threshold");
  }
  assert.equal((await api("/api/mail/compose",{mailboxId:boxes[0].id,to:["recipient@example.invalid"],
    subject:"Rate-control test",text:"No",draft:false},{cookie})).status,429,
    "short burst safety is independent of the removed daily limit");
  assert.equal((await pool.query("SELECT count(*)::int n FROM mail_public_send_limits WHERE mailbox_id=$1",[boxes[0].id])).rows[0].n,0,
    "legacy fixed daily quota is never written");
  const draft=await api("/api/mail/compose",{mailboxId:boxes[0].id,to:["recipient@example.invalid"],
    text:"Draft can be saved",draft:true},{cookie});
  assert.equal(draft.status,201);
  const draftId=(await draft.json()).id;
  assert.equal((await api("/api/mail/drafts/"+draftId+"/send",{}, {cookie})).status,429);
  assert.equal((await pool.query("SELECT status FROM mail_messages WHERE id=$1",[draftId])).rows[0].status,"draft");
  process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED="true";
  try{
    const capabilities=await (await api("/api/mail/capabilities",undefined,{cookie})).json();
    assert.equal(capabilities.attachments,false,"do not advertise uploads to public accounts");
    assert.equal((await api("/api/mail/messages/"+draftId+"/attachments",{}, {cookie})).status,403,
      "public trial upload must be denied before multipart storage");
  }finally{process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED="false";}

  // The SAME verified contact can register an additional independent mailbox.
  assert.equal((await api("/api/mail-auth/signup/request",{...newSignup,localPart:"another-user"})).status,202);
  assert.equal(outbound.length,2,"the same external contact must receive another verification email");
  const secondLink=outbound[1].text.match(/https:\/\/mail\.example\.invalid\/signup\/verify#token=[0-9a-f]{64}/)?.[0];
  assert.ok(secondLink);
  const token2=new URL(secondLink).hash.slice("#token=".length);
  const verified2=await api("/api/mail-auth/signup/verify",{token:token2});
  assert.equal(verified2.status,200);
  const data2=await verified2.json();
  assert.equal(data2.address,"another-user@chatvice.app");
  const password2="Second independent mailbox strong secret 2026";
  const activation2=new URL(data2.activationUrl).hash.slice("#token=".length);
  assert.equal((await api("/api/mail-auth/activate",{token:activation2,password:password2})).status,200);
  const login2=await api("/api/mail-auth/login",{email:data2.address,password:password2});
  assert.equal(login2.status,200);
  const cookie2=login2.headers.get("set-cookie")!.split(";")[0];
  const boxes2=await (await api("/api/mail/mailboxes",undefined,{cookie:cookie2})).json();
  assert.equal(boxes2.length,1,"new mailbox account cannot see first mailbox");
  assert.equal(boxes2[0].local_part,"another-user");
  assert.equal((await (await api("/api/mail/mailboxes",undefined,{cookie})).json()).length,1,
    "first account still sees only its own mailbox");
  assert.notEqual(boxes2[0].id,boxes[0].id);
  assert.equal((await api("/api/mail/compose",{mailboxId:boxes[0].id,
    to:["recipient@example.invalid"],text:"Unauthorized mailbox",draft:false},{cookie:cookie2})).status,403);
  // Shared contact-level burst control is enforced even across its many mailboxes.
  assert.equal((await api("/api/mail/compose",{mailboxId:boxes2[0].id,
    to:["recipient@example.invalid"],text:"Rate probe",draft:false},{cookie:cookie2})).status,429);
  // Advancing the one-minute burst window removes the restriction. There is
  // deliberately NO daily counter or fixed count of outgoing messages.
  await pool.query("DELETE FROM mail_login_limits WHERE attempts>=12");
  assert.equal((await api("/api/mail/compose",{mailboxId:boxes2[0].id,
    to:["recipient@example.invalid"],text:"Allowed after burst window",draft:false},{cookie:cookie2})).status,201);
  assert.equal((await api("/api/mail-auth/signup/request",{...newSignup,localPart:"studio-guest",contactEmail:"other@external.example"})).status,202);
  assert.equal(outbound.length,2,"existing username must not trigger another verification email");
  process.env.CHATVICE_MAIL_PUBLIC_SIGNUP_ENABLED="false";
  assert.equal((await (await api("/api/mail-auth/signup/config")).json()).enabled,false);
  assert.equal((await api("/api/mail-auth/signup/request",newSignup)).status,503);
  assert.equal((await api("/api/mail/mailboxes",undefined,{cookie})).status,200,
    "disabling signup must not disable already registered inboxes");
});
test.after(async()=>{
  globalThis.fetch=originalFetch;
  await new Promise<void>(resolve=>srv.close(()=>resolve()));
  await pool.end();
  await admin.query('DROP DATABASE "'+name+'"');await admin.end();
});
