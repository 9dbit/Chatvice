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
test("public signup protects unverified identity, creates isolated mailbox, limits outbound and preserves other mailboxes",async()=>{
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
  const badSend=await api("/api/mail/compose",{mailboxId:boxes[0].id,to:[
    "one@example.invalid","two@example.invalid","three@example.invalid","four@example.invalid"],
    text:"No bulk mail",draft:false},{cookie});
  assert.equal(badSend.status,429);
  for(let i=0;i<10;i++){
    const sent=await api("/api/mail/compose",{mailboxId:boxes[0].id,to:["recipient@example.invalid"],
      subject:"Synthetic "+i,text:"Quota test",draft:false},{cookie});
    assert.equal(sent.status,201,"public account sending 1 through 10");
  }
  assert.equal((await api("/api/mail/compose",{mailboxId:boxes[0].id,to:["recipient@example.invalid"],
    subject:"Over limit",text:"No",draft:false},{cookie})).status,429);
  assert.equal((await pool.query("SELECT used FROM mail_public_send_limits WHERE mailbox_id=$1",[boxes[0].id])).rows[0].used,10);
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

  assert.equal((await api("/api/mail-auth/signup/request",{...newSignup,localPart:"another-user"})).status,202);
  assert.equal(outbound.length,1,"one external contact cannot create a second public mailbox");
  assert.equal((await api("/api/mail-auth/signup/request",{...newSignup,localPart:"studio-guest",contactEmail:"other@external.example"})).status,202);
  assert.equal(outbound.length,1,"existing username must not trigger another verification email");
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
