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
test("fresh migration creates all eight mail tables without touching unrelated data",async()=>{
  const q=await pool.query(`SELECT count(*)::integer AS count FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'mail_%'`);
  assert.equal(q.rows[0].count,8);
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
