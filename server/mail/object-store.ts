import { createHash, createHmac, randomUUID } from "node:crypto";

export const MAX_MAIL_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const MAX_MAIL_ATTACHMENTS = 8;

type R2Settings = {
  accountId: string; bucket: string; accessKeyId: string; secretAccessKey: string;
};
function settings(): R2Settings {
  const accountId = process.env.CHATVICE_MAIL_R2_ACCOUNT_ID || "";
  const bucket = process.env.CHATVICE_MAIL_R2_BUCKET || "";
  const accessKeyId = process.env.CHATVICE_MAIL_R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.CHATVICE_MAIL_R2_SECRET_ACCESS_KEY || "";
  if (!/^[a-f\d]{32}$/i.test(accountId) || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) ||
      !accessKeyId || !secretAccessKey) {
    throw new Error("Private Mail object storage is not configured");
  }
  return {accountId:accountId.toLowerCase(),bucket,accessKeyId,secretAccessKey};
}
export function isMailObjectStorageConfigured(): boolean {
  try { settings(); return true; } catch { return false; }
}
const sha256 = (input: Buffer | string): string => createHash("sha256").update(input).digest("hex");
function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256",key).update(value).digest();
}
function encodedPath(key: string, bucket: string): string {
  if (!/^mail\/[a-zA-Z0-9/_-]+$/.test(key) ||
      key.length > 300 || key.split("/").some(segment=>!segment || segment==="." || segment==="..")) {
    throw new Error("Invalid private object key");
  }
  // Encode each segment independently; never permit query fragments or URL traversal.
  return "/" + [bucket,...key.split("/")].map(encodeURIComponent).join("/");
}
export function newPrivateAttachmentKey(tenantId: string, messageId: string): string {
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(tenantId) || !/^[0-9a-f-]{36}$/i.test(messageId))
    throw new Error("Invalid attachment scope");
  return `mail/${tenantId}/${messageId}/${randomUUID().replace(/-/g,"")}`;
}
export function attachmentKeyFromProviderId(tenantId:string,messageId:string,providerId:string):string {
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(tenantId) || !/^[0-9a-f-]{36}$/i.test(messageId) ||
      !providerId || providerId.length>255) throw new Error("Invalid attachment identity");
  const digest=sha256(providerId);
  return `mail/${tenantId}/${messageId}/${digest}`;
}
function authorization(method: "PUT"|"GET"|"DELETE", key: string, body: Buffer, config: R2Settings, now:Date){
  const date=now.toISOString().replace(/[-:]|\.\d{3}/g,"");
  const day=date.slice(0,8), host=`${config.accountId}.r2.cloudflarestorage.com`;
  const uri=encodedPath(key,config.bucket);
  const payloadHash=sha256(body);
  const signedHeaders="host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders=`host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${date}\n`;
  const canonicalRequest=`${method}\n${uri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope=`${day}/auto/s3/aws4_request`;
  const stringToSign=`AWS4-HMAC-SHA256\n${date}\n${scope}\n${sha256(canonicalRequest)}`;
  const signingKey=hmac(hmac(hmac(hmac("AWS4"+config.secretAccessKey,day),"auto"),"s3"),"aws4_request");
  const signature=hmac(signingKey,stringToSign).toString("hex");
  return {
    url:`https://${host}${uri}`,
    headers:{
      "Authorization":`AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-date":date,"x-amz-content-sha256":payloadHash,
      "Content-Type":"application/octet-stream"
    },
  };
}
/** Server-side only, never expose the signed URL or R2 credentials to browsers. */
export async function putPrivateAttachment(key:string, data:Buffer):Promise<void>{
  if (!Buffer.isBuffer(data) || !data.length || data.length>MAX_MAIL_ATTACHMENT_BYTES)
    throw new Error("Mail attachment exceeds private upload policy");
  const config=settings();
  const signed=authorization("PUT",key,data,config,new Date());
  const result=await fetch(signed.url,{method:"PUT",headers:signed.headers,body:new Uint8Array(data),
    redirect:"manual",signal:AbortSignal.timeout(20000)});
  if(!result.ok) throw new Error("Private object upload failed");
}
export async function getPrivateAttachment(key:string):Promise<Buffer>{
  const config=settings();
  const signed=authorization("GET",key,Buffer.alloc(0),config,new Date());
  const result=await fetch(signed.url,{method:"GET",headers:signed.headers,redirect:"manual",
    signal:AbortSignal.timeout(20000)});
  if(result.status!==200 || !result.body)throw new Error("Private object unavailable");
  const advertised=Number(result.headers.get("content-length")||0);
  if(advertised>MAX_MAIL_ATTACHMENT_BYTES){await result.body.cancel();throw new Error("Private object exceeds download policy");}
  const reader=result.body.getReader();
  let size=0;const chunks:Buffer[]=[];
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>MAX_MAIL_ATTACHMENT_BYTES)throw new Error("Private object exceeds download policy");
      chunks.push(Buffer.from(value));
    }
  }catch(err){await reader.cancel().catch(()=>{});throw err;}
  return Buffer.concat(chunks,size);
}
export async function deletePrivateAttachment(key:string):Promise<void>{
  const config=settings();
  const signed=authorization("DELETE",key,Buffer.alloc(0),config,new Date());
  const result=await fetch(signed.url,{method:"DELETE",headers:signed.headers,
    redirect:"manual",signal:AbortSignal.timeout(15000)});
  if(!result.ok && result.status!==404)throw new Error("Private object deletion failed");
}
