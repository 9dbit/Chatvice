import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID, createHmac } from "node:crypto";
import pg from "pg";
import express from "express";
import supertest from "supertest";
import { ingestIncomingMail } from "./ingest";
import { registerMailRoutes } from "./routes";
import { registerAttachment, MailAttachmentPolicyError } from "./attachment-quota";
import { persistInboundMailAttachments } from "./attachments";
import { newPrivateAttachmentKey } from "./object-store";
import { pool as appPool } from "../db";
import {registerMailLogin,MAIL_COOKIE} from "./login";
import {hashMailPassword} from "./password";
import {processMailOutboxOnce} from "./outbox";

const fixture = {
  tenantA:"merchant_mail_ci_A",
  tenantB:"merchant_mail_ci_B",
  boxA:randomUUID(),
  boxB:randomUUID(),
  domainA:randomUUID(),
  domainB:randomUUID(),
  supervisor:"staff_mail_ci_A",
};
const secret="integration-test-inbound-secret-replace-only-ci";
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
let server:ReturnType<typeof express>;
before(async()=>{
  if(!process.env.DATABASE_URL || process.env.CHATVICE_MAIL_INTEGRATION_DB!=="isolated-ci"){
    throw new Error("Mail integration tests require isolated CI database and explicit guard");
  }
  // Only in disposable CI database, never against real Chatvice merchant data.
  await pool.query("CREATE TABLE merchants (id varchar(32) PRIMARY KEY)");
  await pool.query("CREATE TABLE supervisors (id varchar(32) PRIMARY KEY, merchant_id varchar(32) NOT NULL)");
  await pool.query("CREATE TABLE leads (id varchar(32) PRIMARY KEY, merchant_id varchar(32) NOT NULL, customer_name text, customer_email text, stage text, score integer, source text, last_contact_at timestamp, created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now())");
  await pool.query(readFileSync("migrations/20261026_chatvice_mail_v1.sql","utf8"));
  await pool.query(readFileSync("migrations/20261026_chatvice_mail_attachments_v2.sql","utf8"));
  await pool.query(readFileSync("migrations/20261027_chatvice_mail_delivery_recipients_v3.sql","utf8"));
  await pool.query("INSERT INTO merchants(id) VALUES($1),($2)",[fixture.tenantA,fixture.tenantB]);
  await pool.query("INSERT INTO supervisors(id,merchant_id) VALUES ($1,$2)",[fixture.supervisor,fixture.tenantA]);
  await pool.query(`INSERT INTO mail_domains(id,tenant_id,domain,verification_token,status) VALUES
    ($1,$2,'ci-alpha.example','ci_a','verified'),($3,$4,'ci-beta.example','ci_b','verified')`,[
    fixture.domainA,fixture.tenantA,fixture.domainB,fixture.tenantB
  ]);
  await pool.query(`INSERT INTO mail_mailboxes(id,tenant_id,domain_id,local_part)
    VALUES($1,$2,$3,'hello'),($4,$5,$6,'hello')`,[
    fixture.boxA,fixture.tenantA,fixture.domainA,fixture.boxB,fixture.tenantB,fixture.domainB
  ]);
  await pool.query(`INSERT INTO mail_memberships(id,tenant_id,mailbox_id,user_id,role)
    VALUES($1,$2,$3,$4,'viewer')`,[randomUUID(),fixture.tenantA,fixture.boxA,fixture.supervisor]);
  process.env.CHATVICE_MAIL_ENABLED="true";
  process.env.CHATVICE_MAIL_ENCRYPTION_KEY="b".repeat(64);
  process.env.CHATVICE_MAIL_OUTBOUND_ENABLED="false";
  process.env.CHATVICE_MAIL_ALLOWED_ORIGINS="http://test.local";
  process.env.CHATVICE_MAIL_INBOUND_SECRET=secret;
  server=express();
  server.use(express.json({verify:(req,_res,buf)=>{(req as any).rawBody=buf}}));
  server.use((req,_res,next)=>{
    const subject=req.get("x-ci-subject");
    let session:any;
    if(subject==="merchantA")session={userType:"merchant",userId:fixture.tenantA,merchantId:fixture.tenantA};
    else if(subject==="merchantB")session={userType:"merchant",userId:fixture.tenantB,merchantId:fixture.tenantB};
    else if(subject==="viewerA")session={userType:"supervisor",userId:fixture.supervisor,merchantId:fixture.tenantA};
    (req as any).session=session;
    next();
  });
  registerMailRoutes(server);
});

after(async()=>{
  await pool.end();
  await appPool.end();
});

test("isolated login uses host-only sessions, live mailbox permissions and immediate revocation",async()=>{
  await pool.query(readFileSync("migrations/20261027_chatvice_mail_login.sql","utf8"));
  const loginId=randomUUID(),otherId=randomUUID(),password="Synthetic-password-for-ci-12345";
  const hash=await hashMailPassword(password);
  await pool.query(`INSERT INTO mail_login_users(id,tenant_id,user_id,email,password_hash,is_admin)
    VALUES($1,$2,$3,'viewer@ci-alpha.example',$4,false),
    ($5,$6,$6,'owner@ci-beta.example',$4,true)`,[
    loginId,fixture.tenantA,fixture.supervisor,hash,otherId,fixture.tenantB
  ]);
  const app=express();app.set("trust proxy",1);app.use(express.json());
  registerMailLogin(app,appPool,"https://mail-ci.example","f".repeat(64));
  registerMailRoutes(app);
  const unauth=await supertest(app).get("/api/mail/mailboxes");assert.equal(unauth.status,401);
  const forbidden=await supertest(app).post("/api/mail-auth/login").set("Origin","https://evil.example")
    .send({email:"viewer@ci-alpha.example",password});assert.equal(forbidden.status,403);
  const signIn=async(email:string)=>supertest(app).post("/api/mail-auth/login")
    .set("Origin","https://mail-ci.example").send({email,password});
  const response=await signIn("viewer@ci-alpha.example");assert.equal(response.status,200);
  const setCookie=String(response.headers["set-cookie"]?.[0]||"");
  assert.match(setCookie,/^__Host-chatvice_mail=[a-f0-9]{64};/);
  for(const flag of ["Secure","HttpOnly","SameSite=Strict","Path=/"])assert.ok(setCookie.includes(flag));
  assert.equal(setCookie.includes("Domain="),false);
  const cookie=setCookie.split(";")[0];
  const stored=await pool.query("SELECT token_hash FROM mail_login_sessions WHERE login_id=$1",[loginId]);
  assert.equal(stored.rowCount,1);assert.notEqual(stored.rows[0].token_hash,cookie.split("=")[1]);
  const boxes=await supertest(app).get("/api/mail/mailboxes").set("Cookie",cookie);
  assert.equal(boxes.status,200);assert.deepEqual(boxes.body.map((x:any)=>x.id),[fixture.boxA]);
  const foreign=await supertest(app).get("/api/mail/threads?mailboxId="+fixture.boxB).set("Cookie",cookie);
  assert.equal(foreign.status,403);
  // Engine writes require its own explicit trusted origin and viewer cannot compose.
  const oldOrigin=process.env.CHATVICE_MAIL_ALLOWED_ORIGINS;
  process.env.CHATVICE_MAIL_ALLOWED_ORIGINS="https://mail-ci.example";
  try{
    const denied=await supertest(app).post("/api/mail/compose").set("Cookie",cookie)
      .set("Origin","https://mail-ci.example").send({mailboxId:fixture.boxA,to:["test@example.com"],draft:true});
    assert.equal(denied.status,403);
    const admin=await supertest(app).get("/api/mail/domains").set("Cookie",cookie);assert.equal(admin.status,403);
  }finally{process.env.CHATVICE_MAIL_ALLOWED_ORIGINS=oldOrigin;}
  const duplicateCookie=await supertest(app).get("/api/mail-auth/session").set("Cookie",cookie+"; "+cookie);
  assert.equal(duplicateCookie.status,401);
  await pool.query("UPDATE mail_login_users SET credential_version=credential_version+1 WHERE id=$1",[loginId]);
  assert.equal((await supertest(app).get("/api/mail-auth/session").set("Cookie",cookie)).status,401);
  const owner=await signIn("owner@ci-beta.example");assert.equal(owner.status,200);
  const ownerCookie=String(owner.headers["set-cookie"]?.[0]).split(";")[0];
  const own=await supertest(app).get("/api/mail/mailboxes").set("Cookie",ownerCookie);
  assert.equal(own.status,200);assert.deepEqual(own.body.map((x:any)=>x.id),[fixture.boxB]);
  const logout=await supertest(app).post("/api/mail-auth/logout").set("Cookie",ownerCookie)
    .set("Origin","https://mail-ci.example");assert.equal(logout.status,200);
  assert.equal((await supertest(app).get("/api/mail-auth/session").set("Cookie",ownerCookie)).status,401);
  assert.equal(MAIL_COOKIE,"__Host-chatvice_mail");
});
test("receiving never borrows a sending-only provider credential",async()=>{
  const names=["CHATVICE_MAIL_PROVIDER","RESEND_API_KEY","RESEND_RECEIVING_API_KEY","RESEND_WEBHOOK_SECRET"];
  const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));
  const oldFetch=globalThis.fetch;let calls=0;
  process.env.CHATVICE_MAIL_PROVIDER="resend";
  process.env.RESEND_API_KEY="re_sending_only_fixture";
  delete process.env.RESEND_RECEIVING_API_KEY;
  const key=Buffer.alloc(32,7),id="msg_receiving_guard",timestamp=String(Math.floor(Date.now()/1000));
  process.env.RESEND_WEBHOOK_SECRET="whsec_"+key.toString("base64");
  const payload=JSON.stringify({type:"email.received",data:{email_id:"12345678"}});
  const signature="v1,"+createHmac("sha256",key).update(id+"."+timestamp+".").update(payload).digest("base64");
  globalThis.fetch=async()=>{calls++;throw new Error("Sending key must not be used for reads");};
  try{
    const r=await supertest(server).post("/api/mail/provider/resend/webhook")
      .set("Content-Type","application/json").set("svix-id",id).set("svix-timestamp",timestamp)
      .set("svix-signature",signature).send(payload);
    assert.equal(r.status,503);assert.equal(calls,0);
  }finally{
    globalThis.fetch=oldFetch;
    for(const k of names){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}
  }
});

test("disabled attachment feature rejects uploads before reading multipart bytes",async()=>{
  const old=process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED;
  process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED="false";
  const fetchBefore=globalThis.fetch;let network=0;
  globalThis.fetch=async()=>{network++;throw new Error("Disabled attachments must not access storage");};
  try{
    const r=await supertest(server).post(`/api/mail/messages/${randomUUID()}/attachments`)
      .set("x-ci-subject","merchantA").set("Origin","http://test.local")
      .attach("file",Buffer.from("synthetic bytes"),"disabled.txt");
    assert.equal(r.status,503);assert.equal(network,0);
  }finally{
    globalThis.fetch=fetchBefore;
    if(old===undefined)delete process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED;else process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED=old;
  }
});

test("fresh migrations create all eleven mail tables without touching unrelated data",async()=>{
  const q=await pool.query(`SELECT count(*)::integer AS count FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'mail_%'`);
  assert.equal(q.rows[0].count,11);
});
test("encryption is mandatory and mail API fails closed if master key disappears",async()=>{
  const key=process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
  delete process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
  try {
    const request=await supertest(server).get("/api/mail/mailboxes")
      .set("x-ci-subject","merchantA");
    assert.equal(request.status,503);
    assert.equal(request.body.error,"Private mail encryption is not configured");
  }finally{process.env.CHATVICE_MAIL_ENCRYPTION_KEY=key;}
});
test("mailbox listings honor tenant and supervisor membership",async()=>{
  const a=await supertest(server).get("/api/mail/mailboxes").set("x-ci-subject","merchantA");
  assert.equal(a.status,200);assert.deepEqual(a.body.map((x:any)=>x.id),[fixture.boxA]);
  const b=await supertest(server).get("/api/mail/mailboxes").set("x-ci-subject","merchantB");
  assert.equal(b.status,200);assert.deepEqual(b.body.map((x:any)=>x.id),[fixture.boxB]);
  const member=await supertest(server).get("/api/mail/mailboxes").set("x-ci-subject","viewerA");
  assert.equal(member.status,200);assert.equal(member.body.length,1);
  const guest=await supertest(server).get("/api/mail/mailboxes");
  assert.equal(guest.status,401);
  assert.match(guest.headers["cache-control"]||"",/no-store/);
  assert.match(guest.headers["x-robots-tag"]||"",/noindex/);
});
test("signed inbound routes strictly by verified recipients and deduplicates events",async()=>{
  const input={
   eventId:"ci_dupe_1",from:"customer@example.org",
   to:["hello@ci-alpha.example","hello@ci-beta.example"],
   subject:"Quote",text:"Please send a quotation"
  };
  const raw=JSON.stringify(input);
  const timestamp=String(Date.now());
  const signature=createHmac("sha256",secret).update(timestamp+".").update(raw).digest("hex");
  const call=()=>supertest(server).post("/api/mail/inbound")
   .set("x-mail-timestamp",timestamp).set("x-mail-signature",signature)
   .set("content-type","application/json").send(raw);
  const first=await call();
  assert.equal(first.status,202);assert.equal(first.body.saved,2);
  const again=await call();
  assert.equal(again.status,202);assert.equal(again.body.deduplicated,2);
  const encrypted=await pool.query(`SELECT m.id,m.tenant_id,m.subject,m.text_body,t.subject AS thread_subject
    FROM mail_messages m JOIN mail_threads t ON t.id=m.thread_id
    WHERE m.source_event_id='normalized:ci_dupe_1'`);
  assert.equal(encrypted.rows.length,2);
  for(const row of encrypted.rows){
    assert.ok(row.subject.startsWith("cvenc1."));
    assert.ok(row.text_body.startsWith("cvenc1."));
    assert.ok(row.thread_subject.startsWith("cvenc1."));
    assert.equal(row.text_body.includes("Please send a quotation"),false);
  }
  const decrypted=await supertest(server).get("/api/mail/threads")
    .query({mailboxId:fixture.boxA}).set("x-ci-subject","merchantA");
  assert.equal(decrypted.status,200);
  assert.equal(decrypted.body[0].subject,"Quote");
  assert.equal(decrypted.body[0].text_body,"Please send a quotation");
  const count=await pool.query("SELECT mailbox_id,count(*)::integer AS n FROM mail_messages GROUP BY mailbox_id");
  assert.equal(count.rows.length,2);
  assert.ok(count.rows.every(x=>x.n===1));
  const forged=await supertest(server).post("/api/mail/inbound")
   .set("x-mail-timestamp",timestamp).set("x-mail-signature","0".repeat(64))
   .send(input);
  assert.equal(forged.status,401);
});
test("tenant cannot read other tenant threads and viewer cannot write",async()=>{
  const forbidden=await supertest(server).get("/api/mail/threads").query({mailboxId:fixture.boxB}).set("x-ci-subject","merchantA");
  assert.equal(forbidden.status,403);
  const allowed=await supertest(server).get("/api/mail/threads").query({mailboxId:fixture.boxA}).set("x-ci-subject","viewerA");
  assert.equal(allowed.status,200);assert.equal(allowed.body.length,1);
  const id=allowed.body[0].message_id;
  const blocked=await supertest(server).patch("/api/mail/messages/"+id)
   .set("x-ci-subject","viewerA").set("origin","http://test.local").send({isRead:true});
  assert.equal(blocked.status,404);
  const changed=await supertest(server).patch("/api/mail/messages/"+id)
   .set("x-ci-subject","merchantA").set("origin","http://test.local").send({isRead:true});
  assert.equal(changed.status,200);
  const cross=await supertest(server).patch("/api/mail/messages/"+id)
   .set("x-ci-subject","merchantB").set("origin","http://test.local").send({isRead:false});
  assert.equal(cross.status,404);
});
test("mutating mail APIs reject missing and untrusted origins",async()=>{
  const noOrigin=await supertest(server).post("/api/mail/compose")
   .set("x-ci-subject","merchantA").send({mailboxId:fixture.boxA,to:["contact@example.org"],subject:"hello",text:"hi"});
  assert.equal(noOrigin.status,403);
  const badOrigin=await supertest(server).post("/api/mail/compose")
   .set("x-ci-subject","merchantA").set("origin","https://attacker.example")
   .send({mailboxId:fixture.boxA,to:["contact@example.org"],subject:"hello",text:"hi"});
  assert.equal(badOrigin.status,403);
  const noOutbound=await supertest(server).post("/api/mail/compose")
   .set("x-ci-subject","merchantA").set("origin","http://test.local")
   .send({mailboxId:fixture.boxA,to:["contact@example.org"],subject:"hello",text:"hi"});
  assert.equal(noOutbound.status,503);
});
test("unverified domain cannot be sent from, and verified domains cannot be double claimed",async()=>{
  const pend=randomUUID(), box=randomUUID();
  await pool.query("INSERT INTO mail_domains(id,tenant_id,domain,verification_token) VALUES ($1,$2,'ci-pending.example','p')",[pend,fixture.tenantA]);
  await pool.query("INSERT INTO mail_mailboxes(id,tenant_id,domain_id,local_part) VALUES($1,$2,$3,'no-reply')",[box,fixture.tenantA,pend]);
  const attempt=await supertest(server).post("/api/mail/compose")
   .set("x-ci-subject","merchantA").set("origin","http://test.local")
   .send({mailboxId:box,to:["contact@example.org"],subject:"hello",text:"hi"});
  assert.equal(attempt.status,409);
  await assert.rejects(()=>pool.query("INSERT INTO mail_domains(id,tenant_id,domain,verification_token,status) VALUES ($1,$2,'ci-alpha.example','forged','verified')",[randomUUID(),fixture.tenantB]),(err:any)=>err?.code==="23505");
});

test("mail draft attachments stay quarantined, tenant-locked and no-store until clean",async()=>{
 const vars={
  CHATVICE_MAIL_ATTACHMENTS_ENABLED:process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED,
  CHATVICE_MAIL_R2_ACCOUNT_ID:process.env.CHATVICE_MAIL_R2_ACCOUNT_ID,
  CHATVICE_MAIL_R2_BUCKET:process.env.CHATVICE_MAIL_R2_BUCKET,
  CHATVICE_MAIL_R2_ACCESS_KEY_ID:process.env.CHATVICE_MAIL_R2_ACCESS_KEY_ID,
  CHATVICE_MAIL_R2_SECRET_ACCESS_KEY:process.env.CHATVICE_MAIL_R2_SECRET_ACCESS_KEY,
  CHATVICE_MAIL_CLAMAV_HOST:process.env.CHATVICE_MAIL_CLAMAV_HOST,
  CHATVICE_MAIL_OUTBOUND_ENABLED:process.env.CHATVICE_MAIL_OUTBOUND_ENABLED,
  CHATVICE_MAIL_PROVIDER:process.env.CHATVICE_MAIL_PROVIDER,
  RESEND_API_KEY:process.env.RESEND_API_KEY,
 };
 const oldFetch=globalThis.fetch;
 process.env.CHATVICE_MAIL_ATTACHMENTS_ENABLED="true";
 process.env.CHATVICE_MAIL_R2_ACCOUNT_ID="b".repeat(32);
 process.env.CHATVICE_MAIL_R2_BUCKET="ci-private-mail";
 process.env.CHATVICE_MAIL_R2_ACCESS_KEY_ID="ci-access";
 process.env.CHATVICE_MAIL_R2_SECRET_ACCESS_KEY="ci-secret";
 delete process.env.CHATVICE_MAIL_CLAMAV_HOST; // pending is the secure default
 const content=Buffer.from("sensitive customer invoice");
 const objectStore=new Map<string,Buffer>();
 globalThis.fetch=async(input,init)=>{
  const url=String(input);
  assert.match(url,/^https:\/\/b{32}\.r2\.cloudflarestorage\.com\/ci-private-mail\/mail\//);
  if(init?.method==="PUT"){
    objectStore.set(url,Buffer.from(init.body as Uint8Array));
    return new Response(null,{status:200});
  }
  if(init?.method==="DELETE"){
    objectStore.delete(url);return new Response(null,{status:204});
  }
  const bytes=objectStore.get(url);
  return bytes?new Response(bytes,{status:200,headers:{"content-length":String(bytes.length)}}):
    new Response(null,{status:404});
 };
 try{
  const make=await supertest(server).post("/api/mail/compose").set("x-ci-subject","merchantA")
    .set("origin","http://test.local")
    .send({mailboxId:fixture.boxA,to:["person@example.org"],subject:"Invoice",text:"Please review",draft:true});
  assert.equal(make.status,201);
  const messageId=make.body.id;
  const forbidden=await supertest(server).post("/api/mail/messages/"+messageId+"/attachments")
    .set("x-ci-subject","viewerA").set("origin","http://test.local")
    .attach("file",content,"invoice.txt");
  assert.equal(forbidden.status,404);
  const result=await supertest(server).post("/api/mail/messages/"+messageId+"/attachments")
    .set("x-ci-subject","merchantA").set("origin","http://test.local")
    .attach("file",content,"invoice.txt");
  assert.equal(result.status,201);
  assert.equal(result.body.scanStatus,"pending");
  const attachmentId=result.body.id;
  const list=await supertest(server).get("/api/mail/messages/"+messageId+"/attachments")
    .set("x-ci-subject","viewerA");
  assert.equal(list.status,200);assert.equal(list.body[0].id,attachmentId);
  assert.equal(Object.hasOwn(list.body[0],"object_key"),false);
  const pending=await supertest(server).get("/api/mail/attachments/"+attachmentId+"/download")
    .set("x-ci-subject","merchantA");
  assert.equal(pending.status,423);
  const cross=await supertest(server).get("/api/mail/attachments/"+attachmentId+"/download")
    .set("x-ci-subject","merchantB");
  assert.equal(cross.status,404);
  await pool.query("UPDATE mail_attachments SET scan_status='clean' WHERE id=$1",[attachmentId]);
  const clean=await supertest(server).get("/api/mail/attachments/"+attachmentId+"/download")
    .set("x-ci-subject","merchantA");
  assert.equal(clean.status,200);
  assert.equal(Buffer.isBuffer(clean.body)?clean.body.toString("utf8"):clean.text,"sensitive customer invoice");
  assert.match(clean.headers["content-disposition"],/^attachment;/);
  assert.match(clean.headers["cache-control"],/no-store/);
  assert.equal(objectStore.size,1);
  // This only queues a DB job. No external provider worker runs in CI.
  process.env.CHATVICE_MAIL_OUTBOUND_ENABLED="true";
  process.env.CHATVICE_MAIL_PROVIDER="resend";
  process.env.RESEND_API_KEY="re_test_provider_ci";
  const send=await supertest(server).post("/api/mail/drafts/"+messageId+"/send")
    .set("x-ci-subject","merchantA").set("origin","http://test.local").send({});
  assert.equal(send.status,200);
  assert.equal(send.body.status,"queued");
  const repeated=await supertest(server).post("/api/mail/drafts/"+messageId+"/send")
    .set("x-ci-subject","merchantA").set("origin","http://test.local").send({});
  assert.equal(repeated.status,404);
 }finally{
  globalThis.fetch=oldFetch;
  for(const [k,v] of Object.entries(vars)){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
 }
});

test("mailbox storage and message attachment caps are enforced inside PostgreSQL transaction",async()=>{
 const draft=await supertest(server).post("/api/mail/compose").set("x-ci-subject","merchantB")
  .set("origin","http://test.local")
  .send({mailboxId:fixture.boxB,to:["test@example.org"],subject:"Quota test",text:"test",draft:true});
 assert.equal(draft.status,201);
 const messageId=draft.body.id as string;
 await pool.query("UPDATE mail_mailboxes SET quota_bytes=64 WHERE id=$1",[fixture.boxB]);
 try{
  for(let n=0;n<8;n++){
   const result=await registerAttachment({
    tenantId:fixture.tenantB,messageId,
    key:newPrivateAttachmentKey(fixture.tenantB,messageId),
    filename:"file.txt",mediaType:"text/plain",length:4,
    status:"pending",expectedMessageStatus:"draft"
   });
   assert.equal(result,"created");
  }
  await assert.rejects(()=>registerAttachment({
   tenantId:fixture.tenantB,messageId,
   key:newPrivateAttachmentKey(fixture.tenantB,messageId),
   filename:"ninth.txt",mediaType:"text/plain",length:4,
   status:"pending",expectedMessageStatus:"draft"
  }),e=>e instanceof MailAttachmentPolicyError);
  const count=await pool.query("SELECT count(*)::integer AS n FROM mail_attachments WHERE message_id=$1",[messageId]);
  assert.equal(count.rows[0].n,8);
  const second=await supertest(server).post("/api/mail/compose").set("x-ci-subject","merchantB")
    .set("origin","http://test.local")
    .send({mailboxId:fixture.boxB,to:["test@example.org"],subject:"Mailbox quota",text:"test",draft:true});
  assert.equal(second.status,201);
  await pool.query("UPDATE mail_mailboxes SET quota_bytes=33 WHERE id=$1",[fixture.boxB]);
  await assert.rejects(()=>registerAttachment({
    tenantId:fixture.tenantB,messageId:second.body.id,
    key:newPrivateAttachmentKey(fixture.tenantB,second.body.id),
    filename:"extra.txt",mediaType:"text/plain",length:2,
    status:"pending",expectedMessageStatus:"draft"
   }),e=>e instanceof MailAttachmentPolicyError);
 }finally{
  await pool.query("UPDATE mail_mailboxes SET quota_bytes=1073741824 WHERE id=$1",[fixture.boxB]);
 }
});

test("inbound attachments reconcile on webhook replay without cross-tenant copies leaking",async()=>{
 const vars=["CHATVICE_MAIL_R2_ACCOUNT_ID","CHATVICE_MAIL_R2_BUCKET","CHATVICE_MAIL_R2_ACCESS_KEY_ID","CHATVICE_MAIL_R2_SECRET_ACCESS_KEY","CHATVICE_MAIL_CLAMAV_HOST"] as const;
 const old=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
 const oldFetch=globalThis.fetch;
 process.env.CHATVICE_MAIL_R2_ACCOUNT_ID="c".repeat(32);
 process.env.CHATVICE_MAIL_R2_BUCKET="ci-private-mail";
 process.env.CHATVICE_MAIL_R2_ACCESS_KEY_ID="ci-key";
 process.env.CHATVICE_MAIL_R2_SECRET_ACCESS_KEY="ci-secret";
 delete process.env.CHATVICE_MAIL_CLAMAV_HOST;
 const sent:string[]=[];
 globalThis.fetch=async(input,init)=>{
  sent.push(String(input));
  assert.equal(init?.method,"PUT");
  return new Response(null,{status:200});
 };
 try{
  const inbound=await ingestIncomingMail({
   eventId:"ci_with_attachment",from:"customer@example.org",
   to:["hello@ci-alpha.example","hello@ci-beta.example"],
   subject:"Inbound file",text:"See attachment"
  });
  assert.equal(inbound.messages.length,2);
  const files=[{
   providerId:"00000000-0000-4000-8000-000000000044",
   filename:"invoice.pdf",mediaType:"application/pdf",
   bytes:Buffer.from("private invoice")
  }];
  const created=await persistInboundMailAttachments(inbound.messages,files);
  assert.equal(created.stored,2);
  const again=await persistInboundMailAttachments(inbound.messages,files);
  assert.equal(again.duplicates,2);
  assert.equal(sent.length,2);
  const result=await pool.query(`SELECT a.tenant_id,a.object_key,a.scan_status
    FROM mail_attachments a WHERE a.provider_attachment_id=$1`,[files[0].providerId]);
  assert.equal(result.rowCount,2);
  assert.ok(result.rows.every((v:any)=>v.scan_status==="pending"));
  assert.equal(new Set(result.rows.map((v:any)=>v.object_key)).size,2);
  for(const v of result.rows)assert.ok(v.object_key.startsWith("mail/"+v.tenant_id+"/"));
 }finally{
  globalThis.fetch=oldFetch;
  for(const k of vars){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
 }
});

test("workspace pagination, unread and starred filters aggregate every message in a conversation",async()=>{
 const box=randomUUID();
 await pool.query("INSERT INTO mail_mailboxes(id,tenant_id,domain_id,local_part) VALUES($1,$2,$3,'workspace-list')",[box,fixture.tenantA,fixture.domainA]);
 for(let n=0;n<43;n++)await ingestIncomingMail({eventId:`workspace-list-${n}`,from:"customer@example.org",to:["workspace-list@ci-alpha.example"],subject:`Conversation ${n}`,text:`Message ${n}`,messageId:`<workspace-${n}@ci.example>`});
 await ingestIncomingMail({eventId:"workspace-list-reply",from:"customer@example.org",to:["workspace-list@ci-alpha.example"],subject:"Re: Conversation 0",text:"Latest reply",inReplyTo:"<workspace-0@ci.example>"});
 await pool.query("UPDATE mail_messages SET is_read=true WHERE mailbox_id=$1",[box]);
 await pool.query("UPDATE mail_messages SET is_read=false,is_starred=true WHERE mailbox_id=$1 AND source_event_id='workspace-list-0'",[box]);
 const list=(query:Record<string,unknown>)=>supertest(server).get("/api/mail/threads").query({mailboxId:box,...query}).set("x-ci-subject","merchantA");
 const first=await list({limit:40}),last=await list({limit:40,offset:40});
 assert.equal(first.status,200);assert.equal(last.status,200);
 assert.equal(first.body.length,40);assert.equal(last.body.length,3);
 assert.equal(new Set([...first.body,...last.body].map(t=>t.id)).size,43);
 const unread=await list({filter:"unread"}),starred=await list({filter:"starred"});
 assert.equal(unread.status,200);assert.equal(unread.body.length,1);
 assert.equal(unread.body[0].message_count,2);
 assert.equal(unread.body[0].is_read,false);assert.equal(unread.body[0].is_starred,true);
 assert.equal(unread.body[0].text_body,"Latest reply");
 assert.equal(starred.body[0].id,unread.body[0].id);
 const stats=await supertest(server).get(`/api/mail/mailboxes/${box}/stats`).set("x-ci-subject","merchantA");
 assert.equal(stats.status,200);assert.deepEqual(stats.body,[{folder:"inbox",total:43,unread:1}]);
 const denied=await supertest(server).get(`/api/mail/mailboxes/${box}/stats`).set("x-ci-subject","merchantB");
 assert.equal(denied.status,404);
 assert.equal((await list({filter:"unknown"})).status,400);
});

test("conversation actions are origin-, tenant-, mailbox- and permission-scoped and preserve drafts",async()=>{
 const incoming=await ingestIncomingMail({eventId:"workspace-action",from:"customer@example.org",to:["hello@ci-alpha.example"],subject:"Action test",text:"Preserve this email",messageId:"<workspace-action@ci.example>"});
 const messageId=incoming.messages[0].id;
 const row=await pool.query("SELECT thread_id FROM mail_messages WHERE id=$1",[messageId]);
 const threadId=row.rows[0].thread_id;
 const action=(subject:string,data:Record<string,unknown>,origin="http://test.local")=>supertest(server).patch(`/api/mail/threads/${threadId}`).set("x-ci-subject",subject).set("origin",origin).send({mailboxId:fixture.boxA,sourceFolder:"inbox",...data});
 assert.equal((await action("viewerA",{isRead:true})).status,404);
 assert.equal((await action("merchantB",{isRead:true})).status,404);
 assert.equal((await action("merchantA",{isRead:true},"https://attacker.example")).status,403);
 assert.equal((await action("merchantA",{mailboxId:fixture.boxB,isRead:true})).status,404);
 const draft=await supertest(server).post("/api/mail/compose").set("x-ci-subject","merchantA").set("origin","http://test.local").send({mailboxId:fixture.boxA,to:["customer@example.org"],subject:"Reply",text:"Still editing",draft:true,replyToId:messageId});
 assert.equal(draft.status,201);
 const changed=await action("merchantA",{folder:"archive",isRead:true,isStarred:true});
 assert.equal(changed.status,200);assert.equal(changed.body.updated,1);
 const result=await pool.query("SELECT folder,status,is_read,is_starred,text_body FROM mail_messages WHERE id=$1",[messageId]);
 assert.equal(result.rows[0].folder,"archive");assert.equal(result.rows[0].status,"received");
 assert.equal(result.rows[0].is_read,true);assert.equal(result.rows[0].is_starred,true);
 assert.ok(result.rows[0].text_body.startsWith("cvenc1."));
 const stillDraft=await pool.query("SELECT folder,status FROM mail_messages WHERE id=$1",[draft.body.id]);
 assert.deepEqual(stillDraft.rows[0],{folder:"drafts",status:"draft"});
 assert.equal((await action("merchantA",{sourceFolder:"drafts",folder:"trash"})).status,409);
 assert.equal((await action("merchantA",{sourceFolder:"archive",folder:"trash"})).status,200);
 assert.equal((await action("merchantA",{sourceFolder:"trash",folder:"inbox"})).status,200);
 assert.equal((await action("merchantA",{sourceFolder:"inbox",folder:"sent"})).status,400);
 await pool.query("UPDATE mail_mailboxes SET enabled=false WHERE id=$1",[fixture.boxA]);
 try{assert.equal((await action("merchantA",{isRead:false})).status,404);}
 finally{await pool.query("UPDATE mail_mailboxes SET enabled=true WHERE id=$1",[fixture.boxA]);}
});

test("workspace capabilities expose booleans only and mailbox roles match write permission",async()=>{
 const owner=await supertest(server).get("/api/mail/capabilities").set("x-ci-subject","merchantA");
 const viewer=await supertest(server).get("/api/mail/capabilities").set("x-ci-subject","viewerA");
 assert.equal(owner.status,200);assert.equal(owner.body.admin,true);assert.equal(owner.body.outbound,false);
 assert.equal(viewer.body.admin,false);
 assert.deepEqual(Object.keys(owner.body).sort(),["admin","ai","attachments","outbound"]);
 assert.ok(Object.values(owner.body).every(value=>typeof value==="boolean"));
 const boxes=await supertest(server).get("/api/mail/mailboxes").set("x-ci-subject","viewerA");
 assert.equal(boxes.body[0].can_write,false);
 const owned=await supertest(server).get("/api/mail/mailboxes").set("x-ci-subject","merchantA");
 assert.ok(owned.body.every(b=>b.can_write===true));
 assert.equal((await supertest(server).get("/api/mail/capabilities")).status,401);
});

test("recipient-free drafts save privately and BCC is exposed only to authorized draft editors",async()=>{
 const made=await supertest(server).post('/api/mail/compose').set('x-ci-subject','merchantA')
  .set('origin','http://test.local').send({mailboxId:fixture.boxA,subject:'Notes before addressing',text:'Private draft',draft:true});
 assert.equal(made.status,201);
 const id=made.body.id,thread=made.body.threadId;
 const read=(subject:string)=>supertest(server).get(`/api/mail/drafts/${id}`).set('x-ci-subject',subject);
 const owner=await read('merchantA');
 assert.equal(owner.status,200);assert.deepEqual(owner.body.to,[]);assert.equal(owner.body.text,'Private draft');
 assert.equal((await read('viewerA')).status,404);assert.equal((await read('merchantB')).status,404);
 assert.equal((await supertest(server).get(`/api/mail/drafts/${id}`)).status,401);
 const patch=await supertest(server).patch(`/api/mail/drafts/${id}`).set('x-ci-subject','merchantA')
  .set('origin','http://test.local').send({to:['person@example.org'],cc:['reviewer@example.org'],bcc:['hidden@example.org']});
 assert.equal(patch.status,200);
 const edit=await read('merchantA');
 assert.deepEqual(edit.body.cc,['reviewer@example.org']);assert.deepEqual(edit.body.bcc,['hidden@example.org']);
 assert.equal(edit.body.mailboxId,fixture.boxA);assert.match(edit.headers['cache-control'],/no-store/);
 const preview=await supertest(server).get(`/api/mail/threads/${thread}`).set('x-ci-subject','viewerA');
 assert.equal(preview.status,200);assert.equal(Object.hasOwn(preview.body[0],'bcc_emails'),false);
 assert.equal(JSON.stringify(preview.body).includes('hidden@example.org'),false);
 await pool.query("UPDATE mail_memberships SET role='member' WHERE mailbox_id=$1 AND user_id=$2",[fixture.boxA,fixture.supervisor]);
 try{assert.equal((await read('viewerA')).status,200);}
 finally{await pool.query("UPDATE mail_memberships SET role='viewer' WHERE mailbox_id=$1 AND user_id=$2",[fixture.boxA,fixture.supervisor]);}
 await pool.query('UPDATE mail_mailboxes SET enabled=false WHERE id=$1',[fixture.boxA]);
 try{assert.equal((await read('merchantA')).status,404);}
 finally{await pool.query('UPDATE mail_mailboxes SET enabled=true WHERE id=$1',[fixture.boxA]);}
});

test("clearing draft recipients preserves content and cannot queue until To is valid",async()=>{
 const variables=['CHATVICE_MAIL_OUTBOUND_ENABLED','CHATVICE_MAIL_PROVIDER','RESEND_API_KEY'];
 const previous=Object.fromEntries(variables.map(k=>[k,process.env[k]]));
 process.env.CHATVICE_MAIL_OUTBOUND_ENABLED='true';process.env.CHATVICE_MAIL_PROVIDER='resend';
 process.env.RESEND_API_KEY='re_synthetic_queue_only';
 try{
  const made=await supertest(server).post('/api/mail/compose').set('x-ci-subject','merchantA')
   .set('origin','http://test.local').send({mailboxId:fixture.boxA,to:['old@example.org'],cc:['copy@example.org'],bcc:['private@example.org'],text:'Keep me',draft:true});
  assert.equal(made.status,201);
  const id=made.body.id;
  const clearing=await supertest(server).patch(`/api/mail/drafts/${id}`).set('x-ci-subject','merchantA')
   .set('origin','http://test.local').send({to:[],cc:[],bcc:[]});
  assert.equal(clearing.status,200);
  const editor=await supertest(server).get(`/api/mail/drafts/${id}`).set('x-ci-subject','merchantA');
  assert.deepEqual(editor.body.to,[]);assert.deepEqual(editor.body.cc,[]);assert.deepEqual(editor.body.bcc,[]);assert.equal(editor.body.text,'Keep me');
  const send=()=>supertest(server).post(`/api/mail/drafts/${id}/send`).set('x-ci-subject','merchantA').set('origin','http://test.local').send({});
  assert.equal((await send()).status,409);
  const saved=await pool.query('SELECT status,folder FROM mail_messages WHERE id=$1',[id]);
  assert.deepEqual(saved.rows[0],{status:'draft',folder:'drafts'});
  const direct=await supertest(server).post('/api/mail/compose').set('x-ci-subject','merchantA')
   .set('origin','http://test.local').send({mailboxId:fixture.boxA,text:'Not a draft',draft:false});
  assert.equal(direct.status,400);
  await supertest(server).patch(`/api/mail/drafts/${id}`).set('x-ci-subject','merchantA')
   .set('origin','http://test.local').send({to:['valid@example.org'],cc:['copy@example.org'],bcc:['hidden@example.org']}).expect(200);
  assert.equal((await send()).status,200); // queue only; no external worker or message
  assert.equal((await send()).status,404);
  assert.equal((await supertest(server).get(`/api/mail/drafts/${id}`).set('x-ci-subject','merchantA')).status,404);
 }finally{for(const k of variables){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
});

test("reply-address aliases are listed only for authorized mailbox memberships",async()=>{
 await pool.query("INSERT INTO mail_aliases(id,tenant_id,domain_id,mailbox_id,local_part) VALUES($1,$2,$3,$4,'reply-team')",[randomUUID(),fixture.tenantA,fixture.domainA,fixture.boxA]);
 const member=await supertest(server).get('/api/mail/mailboxes').set('x-ci-subject','viewerA');
 assert.equal(member.status,200);assert.ok(member.body[0].aliases.includes('reply-team@ci-alpha.example'));
 const other=await supertest(server).get('/api/mail/mailboxes').set('x-ci-subject','merchantB');
 assert.equal(JSON.stringify(other.body).includes('reply-team@ci-alpha.example'),false);
});

test("signed delivery webhooks retain RFC Message-IDs for reply threading and deduplicate replay",async()=>{
 const names=["CHATVICE_MAIL_PROVIDER","RESEND_WEBHOOK_SECRET"];
 const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 const key=Buffer.alloc(32,9),providerId="delivery-thread-provider-fixture";
 const rfcId="<return-message@resend.dev>";
 process.env.CHATVICE_MAIL_PROVIDER="resend";
 process.env.RESEND_WEBHOOK_SECRET="whsec_"+key.toString("base64");
 try{
  const draft=await supertest(server).post("/api/mail/compose").set("x-ci-subject","merchantA")
   .set("origin","http://test.local").send({mailboxId:fixture.boxA,to:["customer@example.org"],
    subject:"Reply threading regression",text:"Synthetic outgoing mail",draft:true});
  assert.equal(draft.status,201);
  const {id,threadId}=draft.body;
  // Synthetic provider acceptance only: no outbox worker or external message runs.
  await pool.query(`UPDATE mail_messages SET status='sent',folder='sent',provider_message_id=$1
   WHERE id=$2 AND tenant_id=$3 AND mailbox_id=$4`,[providerId,id,fixture.tenantA,fixture.boxA]);
  const eventId="msg_delivery_thread_regression",timestamp=String(Math.floor(Date.now()/1000));
  const payload=JSON.stringify({type:"email.delivered",data:{email_id:providerId,message_id:rfcId}});
  const signature="v1,"+createHmac("sha256",key).update(eventId+"."+timestamp+".").update(payload).digest("base64");
  const deliver=()=>supertest(server).post("/api/mail/provider/resend/webhook")
   .set("content-type","application/json").set("svix-id",eventId)
   .set("svix-timestamp",timestamp).set("svix-signature",signature).send(payload);
  assert.equal((await deliver()).status,200);
  assert.equal((await deliver()).status,200);
  const stored=await pool.query(`SELECT rfc_message_id,status FROM mail_messages
   WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3`,[id,fixture.tenantA,fixture.boxA]);
  assert.deepEqual(stored.rows[0],{rfc_message_id:rfcId,status:"delivered"});
  const events=await pool.query(`SELECT count(*)::integer AS n FROM mail_delivery_events
   WHERE message_id=$1 AND tenant_id=$2 AND provider_event_id=$3`,[id,fixture.tenantA,eventId]);
  assert.equal(events.rows[0].n,1);
  const reply=await ingestIncomingMail({eventId:"resend:reply-thread-regression",from:"customer@example.org",
   to:["hello@ci-alpha.example"],subject:"Re: Reply threading regression",text:"Synthetic incoming reply",
   messageId:"<inbound-return@customer.example>",inReplyTo:rfcId});
  assert.equal(reply.saved,1);
  const conversation=await pool.query(`SELECT thread_id FROM mail_messages
   WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3`,[reply.messages[0].id,fixture.tenantA,fixture.boxA]);
  assert.equal(conversation.rows[0].thread_id,threadId);
 }finally{
  for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}
 }
});

test("outbox expires old jobs without transport, preserves active leases and reconciles final provider evidence",async()=>{
 const names=["CHATVICE_MAIL_OUTBOUND_ENABLED","CHATVICE_MAIL_PROVIDER","RESEND_API_KEY","RESEND_WEBHOOK_SECRET"];
 const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 const oldFetch=globalThis.fetch,sentIds:string[]=[];
 const key=Buffer.alloc(32,11);
 process.env.CHATVICE_MAIL_OUTBOUND_ENABLED="true";
 process.env.CHATVICE_MAIL_PROVIDER="resend";
 process.env.RESEND_API_KEY="re_synthetic_worker_fixture";
 process.env.RESEND_WEBHOOK_SECRET="whsec_"+key.toString("base64");
 globalThis.fetch=async(input,init)=>{
  assert.equal(String(input),"https://api.resend.com/emails");
  const body=JSON.parse(String(init?.body));
  const id=body.tags.find((tag:{name:string})=>tag.name==="chatvice_id").value;
  sentIds.push(id);
  return new Response(JSON.stringify({id:"synthetic-provider-"+id}),{status:200});
 };
 try{
  const cases:Record<string,{id:string;threadId:string}>={};
  for(const name of ["oldQueued","oldSending","oldWithoutLease","activeSending","recentWaiting","fresh"]){
   const draft=await supertest(server).post("/api/mail/compose").set("x-ci-subject","merchantA")
    .set("origin","http://test.local").send({mailboxId:fixture.boxA,to:["customer@example.org"],
     subject:"Outbox regression "+name,text:"Synthetic worker fixture",draft:true});
   assert.equal(draft.status,201);
   cases[name]={id:draft.body.id,threadId:draft.body.threadId};
  }
  await pool.query(`UPDATE mail_messages SET status='queued',folder='sent',
    queued_at=now()-interval '24 hours',next_attempt_at=now()+interval '1 day'
    WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3`,[cases.oldQueued.id,fixture.tenantA,fixture.boxA]);
  await pool.query(`UPDATE mail_messages SET status='sending',folder='sent',
    queued_at=now()-interval '24 hours',lock_acquired_at=now()-interval '4 minutes'
    WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3`,[cases.oldSending.id,fixture.tenantA,fixture.boxA]);
  await pool.query(`UPDATE mail_messages SET status='sending',folder='sent',
    queued_at=now()-interval '24 hours',lock_acquired_at=NULL
    WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3`,[cases.oldWithoutLease.id,fixture.tenantA,fixture.boxA]);
  const lease=await pool.query(`UPDATE mail_messages SET status='sending',folder='sent',
    queued_at=now()-interval '24 hours',lock_acquired_at=now()
    WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3 RETURNING lock_acquired_at`,[
     cases.activeSending.id,fixture.tenantA,fixture.boxA]);
  await pool.query(`UPDATE mail_messages SET status='queued',folder='sent',
    next_attempt_at=now()+interval '1 day'
    WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3`,[cases.recentWaiting.id,fixture.tenantA,fixture.boxA]);
  await pool.query(`UPDATE mail_messages SET status='queued',folder='sent',
    next_attempt_at=now()-interval '1 day'
    WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3`,[cases.fresh.id,fixture.tenantA,fixture.boxA]);
  const result=await processMailOutboxOnce();
  assert.ok(result.failed>=3);assert.ok(result.sent>=1);
  assert.ok(sentIds.includes(cases.fresh.id));
  for(const name of ["oldQueued","oldSending","oldWithoutLease","activeSending","recentWaiting"])
   assert.equal(sentIds.includes(cases[name].id),false);
  const stored=await pool.query(`SELECT id,status,lock_acquired_at,retry_count FROM mail_messages
    WHERE tenant_id=$1 AND mailbox_id=$2 AND id=ANY($3::uuid[])`,[
     fixture.tenantA,fixture.boxA,Object.values(cases).map(item=>item.id)]);
  const rows=new Map(stored.rows.map(row=>[row.id,row]));
  for(const name of ["oldQueued","oldSending","oldWithoutLease"]){
   assert.equal(rows.get(cases[name].id)?.status,"failed");
   assert.equal(rows.get(cases[name].id)?.lock_acquired_at,null);
   assert.equal(rows.get(cases[name].id)?.retry_count,0);
  }
  assert.equal(rows.get(cases.activeSending.id)?.status,"sending");
  assert.deepEqual(rows.get(cases.activeSending.id)?.lock_acquired_at,lease.rows[0].lock_acquired_at);
  assert.equal(rows.get(cases.activeSending.id)?.retry_count,0);
  assert.equal(rows.get(cases.recentWaiting.id)?.status,"queued");
  assert.equal(rows.get(cases.fresh.id)?.status,"sent");
  const visible=await supertest(server).get(`/api/mail/threads/${cases.oldQueued.threadId}`)
   .set("x-ci-subject","merchantA");
  assert.equal(visible.status,200);assert.equal(visible.body[0].status,"failed");
  const delivery=async(name:string,type:string)=>{
   const eventId="msg_"+randomUUID(),timestamp=String(Math.floor(Date.now()/1000));
   const payload=JSON.stringify({type,data:{email_id:"late-provider-"+cases[name].id,
    tags:{chatvice_id:cases[name].id},message_id:"<late-return@resend.dev>"}});
   const signature="v1,"+createHmac("sha256",key).update(eventId+"."+timestamp+".")
    .update(payload).digest("base64");
   const response=await supertest(server).post("/api/mail/provider/resend/webhook")
    .set("content-type","application/json").set("svix-id",eventId)
    .set("svix-timestamp",timestamp).set("svix-signature",signature).send(payload);
   assert.equal(response.status,200);
   const state=await pool.query(`SELECT status FROM mail_messages
    WHERE id=$1 AND tenant_id=$2 AND mailbox_id=$3`,[cases[name].id,fixture.tenantA,fixture.boxA]);
   return state.rows[0].status;
  };
  assert.equal(await delivery("oldQueued","email.sent"),"failed");
  assert.equal(await delivery("oldQueued","email.delivered"),"delivered");
  assert.equal(await delivery("oldQueued","email.sent"),"delivered");
  assert.equal(await delivery("oldSending","email.bounced"),"bounced");
  assert.equal(await delivery("oldSending","email.sent"),"bounced");
 }finally{
  globalThis.fetch=oldFetch;
  for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}
 }
});

test("authorized readers receive text for HTML-only mail without exposing raw HTML",async()=>{
 const eventId="ci-html-only-"+randomUUID();
 const html='<p>Hello &amp; welcome.</p><p>Second paragraph.<br>Next line.</p><a href="https://mail-tracker.example.invalid/link">Project details</a><script>globalThis.__mailHtmlExecuted=true</script><img src="https://mail-tracker.example.invalid/pixel"><iframe src="https://mail-tracker.example.invalid/frame">Hidden frame</iframe>';
 const result=await ingestIncomingMail({eventId,from:"html-sender@example.org",to:["hello@ci-alpha.example"],subject:"HTML-only message",text:" \n\t",html});
 assert.equal(result.saved,1);
 const stored=await pool.query("SELECT thread_id,text_body,html_body FROM mail_messages WHERE id=$1",[result.messages[0].id]);
 assert.ok(stored.rows[0].html_body.startsWith("cvenc1."));
 assert.equal(stored.rows[0].html_body.includes("mail-tracker.example.invalid"),false);
 const path="/api/mail/threads/"+stored.rows[0].thread_id;
 for(const subject of ["merchantA","viewerA"]){
  const response=await supertest(server).get(path).set("x-ci-subject",subject);
  assert.equal(response.status,200);
  assert.equal(response.body[0].text_body,"Hello & welcome.\n\nSecond paragraph.\nNext line.\n\nProject details");
  assert.equal("html_body" in response.body[0],false);
  assert.equal(JSON.stringify(response.body).includes("mail-tracker.example.invalid"),false);
 }
 assert.equal((await supertest(server).get(path).set("x-ci-subject","merchantB")).status,404);
 const plainText="  Keep original text and spacing.\n\n<strong>Literal markup</strong>  ";
 const plain=await ingestIncomingMail({eventId:eventId+"-plain",from:"html-sender@example.org",to:["hello@ci-alpha.example"],subject:"Both body formats",text:plainText,html:"<p>Different HTML body</p>"});
 const plainThread=await pool.query("SELECT thread_id FROM mail_messages WHERE id=$1",[plain.messages[0].id]);
 const response=await supertest(server).get("/api/mail/threads/"+plainThread.rows[0].thread_id).set("x-ci-subject","merchantA");
 assert.equal(response.status,200);assert.equal(response.body[0].text_body,plainText);
});

test("recipient delivery evidence covers To, CC and BCC without leaking private addresses",async()=>{
 const names=["CHATVICE_MAIL_PROVIDER","RESEND_WEBHOOK_SECRET"];
 const previous=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 const signingKey=Buffer.alloc(32,17);
 process.env.CHATVICE_MAIL_PROVIDER="resend";
 process.env.RESEND_WEBHOOK_SECRET="whsec_"+signingKey.toString("base64");
 const to="delivery-to@example.org",cc="delivery-copy@example.org",bcc="hidden-delivery@example.org";
 type Draft={id:string;threadId:string;providerId:string};
 try{
  const make=async(status="sent"):Promise<Draft>=>{
   const response=await supertest(server).post("/api/mail/compose").set("x-ci-subject","merchantA")
    .set("origin","http://test.local").send({mailboxId:fixture.boxA,to:[to,to.toUpperCase()],
     cc:[cc,to],bcc:[bcc],subject:"Synthetic recipient delivery",text:"Synthetic delivery evidence only",draft:true});
   assert.equal(response.status,201);
   const providerId="recipient-provider-"+randomUUID();
   await pool.query(`UPDATE mail_messages SET status=$1,folder='sent',provider_message_id=$2
    WHERE id=$3 AND tenant_id=$4 AND mailbox_id=$5`,[status,providerId,response.body.id,fixture.tenantA,fixture.boxA]);
   return {id:response.body.id,threadId:response.body.threadId,providerId};
  };
  const state=async(draft:Draft)=>(await pool.query('SELECT status FROM mail_messages WHERE id=$1',[draft.id])).rows[0].status;
  const sendEvent=async(draft:Draft,type:string,recipients?:string[],eventId="recipient-event-"+randomUUID())=>{
   const timestamp=String(Math.floor(Date.now()/1000));
   const payload=JSON.stringify({type,data:{email_id:draft.providerId,...(recipients===undefined?{}:{to:recipients})}});
   const signature="v1,"+createHmac("sha256",signingKey).update(eventId+"."+timestamp+".").update(payload).digest("base64");
   const response=await supertest(server).post("/api/mail/provider/resend/webhook")
    .set("content-type","application/json").set("svix-id",eventId)
    .set("svix-timestamp",timestamp).set("svix-signature",signature).send(payload);
   assert.equal(response.status,200);
   return state(draft);
  };
  const noLeak=async(draft:Draft)=>{
   const outcome=(await pool.query('SELECT status,delivered_at FROM mail_messages WHERE id=$1',[draft.id])).rows[0];
   if(outcome.status==='delivered')assert.ok(outcome.delivered_at);else assert.equal(outcome.delivered_at,null);
   const response=await supertest(server).get('/api/mail/threads/'+draft.threadId).set('x-ci-subject','merchantA');
   assert.equal(response.status,200);
   const serialized=JSON.stringify(response.body);
   for(const field of ['bcc_emails','recipient_keys','provider_event_id'])assert.equal(field in response.body[0],false);
   assert.equal(serialized.includes(bcc),false);
   const events=await pool.query('SELECT provider_event_id,event_type,recipient_keys FROM mail_delivery_events WHERE message_id=$1',[draft.id]);
   assert.equal(JSON.stringify(events.rows).includes(bcc),false);
   for(const event of events.rows)for(const key of event.recipient_keys)assert.match(key,/^[a-f0-9]{64}$/);
   return events.rows;
  };
  // Deduplication spans To/CC duplicates, distinct events for the same recipient,
  // and literal Svix replay. None can stand in for another expected address.
  const all=await make(),firstEvent="recipient-replayed-"+randomUUID();
  assert.equal(await sendEvent(all,'email.delivered',[to],firstEvent),'sent');
  assert.equal(await sendEvent(all,'email.delivered',[to],firstEvent),'sent');
  assert.equal(await sendEvent(all,'email.delivered',[to.toUpperCase()]),'sent');
  assert.equal(await sendEvent(all,'email.delivered',[cc]),'sent');
  const partial=await noLeak(all);
  assert.equal(partial.filter(event=>event.provider_event_id===firstEvent).length,1);
  assert.ok(partial.every(event=>event.recipient_keys.length===1));
  assert.equal(await sendEvent(all,'email.delivered',[bcc]),'delivered');
  await noLeak(all);
  // A BCC bounce remains visible at the aggregate level even after every
  // recipient had delivered evidence, regardless of signed event order.
  for(const bounceFirst of [false,true]){
   const mixed=await make();
   if(bounceFirst)assert.equal(await sendEvent(mixed,'email.bounced',[bcc]),'bounced');
   await sendEvent(mixed,'email.delivered',[to]);
   await sendEvent(mixed,'email.delivered',[cc]);
   assert.equal(await sendEvent(mixed,'email.delivered',[bcc]),bounceFirst?'bounced':'delivered');
   const bounceEvent="recipient-bounce-"+randomUUID();
   assert.equal(await sendEvent(mixed,'email.bounced',[bcc],bounceEvent),'bounced');
   assert.equal(await sendEvent(mixed,'email.bounced',[bcc],bounceEvent),'bounced');
   const events=await noLeak(mixed);
   assert.equal(events.filter(event=>event.provider_event_id===bounceEvent).length,1);
  }
  const unattributed=await make();
  assert.equal(await sendEvent(unattributed,'email.delivered'),'sent');
  assert.equal(await sendEvent(unattributed,'email.delivered',['unrelated@example.org']),'sent');
  assert.equal(await sendEvent(unattributed,'email.delivered',[to,cc]),'sent');
  assert.equal(await sendEvent(unattributed,'email.delivered',[bcc]),'delivered');
  const unknownEvents=await noLeak(unattributed);
  assert.equal(unknownEvents.filter(event=>event.recipient_keys.length===0).length,2);
  const expired=await make('failed');
  assert.equal(await sendEvent(expired,'email.sent',[to,cc,bcc]),'failed');
  assert.equal(await sendEvent(expired,'email.delivered',[to]),'failed');
  assert.equal(await sendEvent(expired,'email.delivered',[cc,bcc]),'delivered');
  await noLeak(expired);
 }finally{
  for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}
 }
});
