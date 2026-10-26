import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { verifyNormalizedInboundSignature, verifyResendSignature, normalizeEmail, extractReplyHeader } from "./security";
import { sendResendMail, MailProviderError, fetchResendReceived } from "./provider";

test("normalized inbound HMAC must sign the exact raw JSON bytes", () => {
 const secret="s".repeat(40), ts=String(Date.now());
 const raw=Buffer.from('{"a":1,"b":2}');
 const sig=createHmac("sha256",secret).update(ts+".").update(raw).digest("hex");
 assert.equal(verifyNormalizedInboundSignature(raw,ts,sig,secret),true);
 assert.equal(verifyNormalizedInboundSignature(Buffer.from('{"b":2,"a":1}'),ts,sig,secret),false);
 assert.equal(verifyNormalizedInboundSignature(raw,ts,sig.slice(0,10),secret),false);
 assert.equal(verifyNormalizedInboundSignature(raw,String(Date.now()-3600000),sig,secret),false);
 assert.equal(verifyNormalizedInboundSignature(raw,ts,sig,"short"),false);
});
test("Svix signature validation permits valid v1 but fails closed on stale and tampered bodies",()=>{
 const key=randomBytes(32),secret="whsec_"+key.toString("base64");
 const id="msg_test_123", timestamp=String(Math.floor(Date.now()/1000));
 const payload=Buffer.from('{"type":"email.received"}');
 const signature="v1,"+createHmac("sha256",key).update(id+"."+timestamp+".").update(payload).digest("base64");
 const headers={id,timestamp,signature:"v2,not_used "+signature};
 assert.equal(verifyResendSignature(payload,headers,secret),true);
 assert.equal(verifyResendSignature(Buffer.from('{"type":"email.failed"}'),headers,secret),false);
 assert.equal(verifyResendSignature(payload,{...headers,timestamp:"1000000000"},secret),false);
 assert.equal(verifyResendSignature(payload,{...headers,signature:"v1,invalid"},secret),false);
 assert.equal(verifyResendSignature(payload,headers,"wrong"),false);
});
test("email address parsing and header extraction are bounded and non-executable",()=>{
 assert.equal(normalizeEmail("Alice Smith <Alice@Example.COM>"),"alice@example.com");
 assert.equal(normalizeEmail("  HELLO@chatvice.app "), "hello@chatvice.app");
 assert.equal(normalizeEmail("foo\r\nBcc:attacker@example.com"),null);
 assert.equal(normalizeEmail("not-an-email"),null);
 assert.equal(extractReplyHeader({"In-Reply-To":"<hello@example.com>"}),"<hello@example.com>");
});
test("Resend outbound signs stable idempotency key without exposing API key in message",async()=>{
 const old=globalThis.fetch;
 let called=0;
 globalThis.fetch=async(input,init)=>{
  called++;
  assert.equal(String(input),"https://api.resend.com/emails");
  const h=new Headers(init?.headers);
  assert.equal(h.get("idempotency-key"),"chatvice-mail/00000000-0000-4000-8000-000000000001");
  assert.equal(h.get("authorization"),"Bearer re_exampleKey12345");
  const data=JSON.parse(String(init?.body));
  assert.deepEqual(data.tags,[{name:"chatvice_id",value:"00000000-0000-4000-8000-000000000001"}]);
  assert.deepEqual(data.to,["test@example.com"]);
  return new Response(JSON.stringify({id:"provider-id"}),{status:200,headers:{"content-type":"application/json"}});
 };
 try{
  const id=await sendResendMail({id:"00000000-0000-4000-8000-000000000001",from:"hello@chatvice.app",to:["test@example.com"],cc:[],bcc:[],subject:"Hi",text:"Hello"}, "re_exampleKey12345");
  assert.equal(id,"provider-id");assert.equal(called,1);
 } finally {globalThis.fetch=old;}
});
test("Resend temporary failures can retry, permanent failures cannot",async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response("internal error",{status:503});
  await assert.rejects(()=>sendResendMail({id:"x",from:"hello@chatvice.app",to:["test@example.com"],cc:[],bcc:[],subject:"Hi",text:"Hello"},"re_exampleKey12345"),
   (e:unknown)=>e instanceof MailProviderError && e.retryable===true && !e.message.includes("internal"));
  globalThis.fetch=async()=>new Response("unauthorized",{status:401});
  await assert.rejects(()=>sendResendMail({id:"x",from:"hello@chatvice.app",to:["test@example.com"],cc:[],bcc:[],subject:"Hi",text:"Hello"},"re_exampleKey12345"),
   (e:unknown)=>e instanceof MailProviderError && e.retryable===false);
 } finally{globalThis.fetch=old;}
});
test("Resend inbound fetch uses fixed provider hostname and rejects unsafe IDs",async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async(input)=>{assert.equal(String(input),"https://api.resend.com/emails/receiving/12345678");return new Response('{"id":"12345678"}',{status:200});};
  assert.deepEqual(await fetchResendReceived("12345678","re_exampleKey12345"),{id:"12345678"});
  await assert.rejects(()=>fetchResendReceived("../private","re_exampleKey12345"));
 } finally {globalThis.fetch=old;}
});

test("outbound serializes exact attachment bytes and rejects malformed attachment payloads before transport",async()=>{
 const old=globalThis.fetch;let calls=0;
 const original=Buffer.from([0,255,128,13,10,0,65]);
 const message={id:"00000000-0000-4000-8000-000000000055",from:"hello@chatvice.app",to:["test@example.com"],cc:[],bcc:[],subject:"File",text:"Synthetic",attachments:[{filename:"invoice.bin",content:original.toString("base64")}]};
 globalThis.fetch=async(_input,init)=>{
  calls++;const body=JSON.parse(String(init?.body));
  assert.equal(body.attachments.length,1);
  assert.equal(body.attachments[0].filename,"invoice.bin");
  assert.deepEqual(Buffer.from(body.attachments[0].content,"base64"),original);
  return new Response('{"id":"attachment-provider-fixture"}',{status:200});
 };
 try{
  assert.equal(await sendResendMail(message,"re_synthetic_attachment_key"),"attachment-provider-fixture");
  assert.equal(calls,1);
  for(const attachment of [{filename:"bad.txt",content:"invalid!"},{filename:"bad\\r\\nname.txt",content:"YQ=="},{filename:"empty.txt",content:""}]){
   await assert.rejects(()=>sendResendMail({...message,attachments:[attachment]},"re_synthetic_attachment_key"),
    (e:unknown)=>e instanceof MailProviderError && !e.retryable);
  }
  assert.equal(calls,1);
 }finally{globalThis.fetch=old;}
});

test("large outbound attachments retain all bytes and the aggregate budget cannot be bypassed",async()=>{
 const old=globalThis.fetch;let calls=0;
 const bytes=Buffer.alloc(8477526,65),encoded=bytes.toString("base64");
 const mail={id:"00000000-0000-4000-8000-000000000056",from:"hello@chatvice.app",to:["test@example.com"],cc:[],bcc:[],subject:"Large synthetic file",text:"Synthetic",attachments:[{filename:"large.bin",content:encoded}]};
 globalThis.fetch=async(_input,init)=>{
  calls++;const body=JSON.parse(String(init?.body));
  assert.equal(body.attachments[0].content.length,encoded.length);
  assert.deepEqual(Buffer.from(body.attachments[0].content,"base64"),bytes);
  return new Response('{"id":"large-provider-fixture"}',{status:200});
 };
 try{
  assert.equal(await sendResendMail(mail,"re_large_synthetic_key"),"large-provider-fixture");
  await assert.rejects(()=>sendResendMail({...mail,attachments:[...mail.attachments,{filename:"second.bin",content:encoded}]},"re_large_synthetic_key"),
   (e:unknown)=>e instanceof MailProviderError && !e.retryable);
  assert.equal(calls,1);
 }finally{globalThis.fetch=old;}
});
