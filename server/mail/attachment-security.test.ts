import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import {
  putPrivateAttachment,getPrivateAttachment,deletePrivateAttachment,
  newPrivateAttachmentKey,attachmentKeyFromProviderId,MAX_MAIL_ATTACHMENT_BYTES
} from "./object-store";
import { scanMailAttachment } from "./scanner";
import { loadResendReceivedAttachments, cleanMailFilename } from "./resend-attachments";

const vars=[
  "CHATVICE_MAIL_R2_ACCOUNT_ID","CHATVICE_MAIL_R2_BUCKET",
  "CHATVICE_MAIL_R2_ACCESS_KEY_ID","CHATVICE_MAIL_R2_SECRET_ACCESS_KEY",
  "CHATVICE_MAIL_ATTACHMENT_DOWNLOAD_HOSTS",
  "CHATVICE_MAIL_CLAMAV_HOST","CHATVICE_MAIL_CLAMAV_PORT"
] as const;
const initial=Object.fromEntries(vars.map(x=>[x,process.env[x]]));
function reset(){
  for(const v of vars){
    if(initial[v]===undefined)delete process.env[v];
    else process.env[v]=initial[v];
  }
}
test("R2 object store uses server-only SigV4, fixed host, no public URL, and bounded binary content",async()=>{
 const oldFetch=globalThis.fetch;
 process.env.CHATVICE_MAIL_R2_ACCOUNT_ID="a".repeat(32);
 process.env.CHATVICE_MAIL_R2_BUCKET="chatvice-private-mail";
 process.env.CHATVICE_MAIL_R2_ACCESS_KEY_ID="access-for-test";
 process.env.CHATVICE_MAIL_R2_SECRET_ACCESS_KEY="secret-for-test";
 const content=Buffer.from("Private invoice");
 const key=newPrivateAttachmentKey("tenant_a","00000000-0000-4000-8000-000000000001");
 const requests:string[]=[];
 globalThis.fetch=async(input,init)=>{
  const uri=String(input);requests.push(uri);
  const u=new URL(uri);
  assert.equal(u.protocol,"https:");
  assert.equal(u.hostname,"a".repeat(32)+".r2.cloudflarestorage.com");
  assert.ok(u.pathname.startsWith("/chatvice-private-mail/mail/tenant_a/"));
  const headers=new Headers(init?.headers);
  assert.match(headers.get("authorization")||"",/^AWS4-HMAC-SHA256 Credential=access-for-test\/\d{8}\/auto\/s3\/aws4_request/);
  assert.match(headers.get("authorization")||"",/SignedHeaders=host;x-amz-content-sha256;x-amz-date/);
  if(init?.method==="PUT"){
   const sent=Buffer.from(init.body as Uint8Array);
   assert.deepEqual(sent,content);
   assert.equal(headers.get("x-amz-content-sha256"),createHash("sha256").update(content).digest("hex"));
   return new Response(null,{status:200});
  }
  if(init?.method==="DELETE")return new Response(null,{status:204});
  return new Response(content,{status:200,headers:{"content-length":String(content.length)}});
 };
 try{
  await putPrivateAttachment(key,content);
  assert.deepEqual(await getPrivateAttachment(key),content);
  await deletePrivateAttachment(key);
  assert.equal(requests.length,3);
  await assert.rejects(()=>putPrivateAttachment("mail/tenant_a/../sensitive",content));
  await assert.rejects(()=>putPrivateAttachment(key,Buffer.alloc(MAX_MAIL_ATTACHMENT_BYTES+1)));
  assert.equal(requests.length,3);
  assert.equal(attachmentKeyFromProviderId("tenant_a","00000000-0000-4000-8000-000000000001","same-id"),
     attachmentKeyFromProviderId("tenant_a","00000000-0000-4000-8000-000000000001","same-id"));
 } finally{globalThis.fetch=oldFetch;reset();}
});
async function fakeClamd(reply:string){
 const server=createServer(socket=>{
  let received=Buffer.alloc(0);
  socket.on("data",chunk=>{
   received=Buffer.concat([received,chunk]);
   // Clamd streams binary protocol; four trailing zero bytes close a scan.
   if(received.subarray(0,10).toString("utf8")==="zINSTREAM\0" &&
       received.length>=14 && received.subarray(received.length-4).equals(Buffer.alloc(4))){
     socket.end(reply+"\0");
   }
  });
 });
 await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
 const address=server.address();
 if(!address || typeof address==="string")throw new Error("bad test server");
 return {server,port:address.port};
}
test("clamd malware scanner grants clean only on exact healthy response",async()=>{
 for(const [response,status] of [["stream: OK","clean"],["stream: Eicar-Test FOUND","blocked"],["stream: ERROR","pending"]] as const){
  const x=await fakeClamd(response);
  process.env.CHATVICE_MAIL_CLAMAV_HOST="127.0.0.1";
  process.env.CHATVICE_MAIL_CLAMAV_PORT=String(x.port);
  try{assert.equal(await scanMailAttachment(Buffer.from("file")) ,status);}
  finally{await new Promise<void>(resolve=>x.server.close(()=>resolve()));}
 }
 delete process.env.CHATVICE_MAIL_CLAMAV_HOST;
 assert.equal(await scanMailAttachment(Buffer.from("file")),"pending");
 reset();
});
test("Resend attachment retrieval allows only explicit HTTPS CDN hosts and enforces bounds",async()=>{
 process.env.CHATVICE_MAIL_ATTACHMENT_DOWNLOAD_HOSTS="files.resend.test";
 const oldFetch=globalThis.fetch;
 let network=0;
 globalThis.fetch=async(input)=>{
  network++;
  const uri=String(input);
  if(uri.startsWith("https://api.resend.com/"))return new Response(JSON.stringify({data:[{
   id:"00000000-0000-4000-8000-000000000008",filename:"hello.pdf",
   content_type:"application/pdf",download_url:"https://files.resend.test/a.pdf?signature=x"
  }]}),{status:200,headers:{"content-type":"application/json"}});
  assert.equal(uri,"https://files.resend.test/a.pdf?signature=x");
  return new Response("attachment",{status:200});
 };
 try{
  const files=await loadResendReceivedAttachments("00000000-0000-4000-8000-000000000008","re_test_for_inbound");
  assert.equal(files.length,1);assert.equal(files[0].bytes.toString(),"attachment");
  assert.equal(network,2);
  assert.equal(cleanMailFilename("../a\r\nb.pdf"),".._a__b.pdf");
  process.env.CHATVICE_MAIL_ATTACHMENT_DOWNLOAD_HOSTS="";
  await assert.rejects(()=>loadResendReceivedAttachments("00000000-0000-4000-8000-000000000008","re_test_for_inbound"),/allowlisted/);
 }finally{globalThis.fetch=oldFetch;reset();}
});

test("virtual-host S3 endpoint signs bucket in hostname with single-slash object path",async()=>{
 const oldFetch=globalThis.fetch;
 const names=[
  "CHATVICE_MAIL_S3_ENDPOINT","CHATVICE_MAIL_S3_BUCKET",
  "CHATVICE_MAIL_S3_REGION","CHATVICE_MAIL_S3_URL_STYLE",
  "CHATVICE_MAIL_S3_ACCESS_KEY_ID","CHATVICE_MAIL_S3_SECRET_ACCESS_KEY"
 ] as const;
 const old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 process.env.CHATVICE_MAIL_S3_ENDPOINT="https://t3.storageapi.dev";
 process.env.CHATVICE_MAIL_S3_BUCKET="mail-qa-safe";
 process.env.CHATVICE_MAIL_S3_REGION="auto";
 process.env.CHATVICE_MAIL_S3_URL_STYLE="virtual-host";
 process.env.CHATVICE_MAIL_S3_ACCESS_KEY_ID="qa-access";
 process.env.CHATVICE_MAIL_S3_SECRET_ACCESS_KEY="qa-secret";
 let requests=0;
 const value=Buffer.from("private QA test file");
 globalThis.fetch=async(input,init)=>{
  requests++;
  const uri=new URL(String(input));
  assert.equal(uri.origin,"https://mail-qa-safe.t3.storageapi.dev");
  assert.match(uri.pathname,/^\/mail\/tenant_a\//);
  assert.equal(uri.pathname.startsWith("//"),false);
  assert.equal(init?.redirect,"manual");
  const h=new Headers(init?.headers);
  assert.match(h.get("authorization")||"",/Credential=qa-access\/\d{8}\/auto\/s3\/aws4_request/);
  assert.equal(h.get("x-amz-content-sha256"),createHash("sha256").update(init?.method==="PUT"?value:Buffer.alloc(0)).digest("hex"));
  if(init?.method==="GET")return new Response(value,{status:200});
  return new Response(null,{status:init?.method==="DELETE"?204:200});
 };
 try{
  const key=newPrivateAttachmentKey("tenant_a","00000000-0000-4000-8000-000000000001");
  await putPrivateAttachment(key,value);
  assert.deepEqual(await getPrivateAttachment(key),value);
  await deletePrivateAttachment(key);
  assert.equal(requests,3);
  process.env.CHATVICE_MAIL_S3_ENDPOINT="http://127.0.0.1:1234";
  await assert.rejects(()=>putPrivateAttachment(key,value),/clean HTTPS origin/);
 }finally{
  globalThis.fetch=oldFetch;
  for(const k of names){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
 }
});
