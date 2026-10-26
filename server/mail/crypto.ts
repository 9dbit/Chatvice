import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Authenticated encryption for customer email content at rest.
 * Requires a stable 256-bit master secret; a lost key makes old mail unrecoverable.
 * The per-tenant derived key and per-message authenticated context prevent
 * ciphertext being transplanted between tenants/messages/fields.
 *
 * This is NOT end-to-end encryption: authorized server processes must be able
 * to decrypt mail in order to deliver, search previews, and display it.
 */
const PREFIX="cvenc1.";
const PURPOSES = ["message-text","message-html","message-subject","thread-subject"] as const;
export type MailSecretField = typeof PURPOSES[number];

function masterKey():Buffer {
  const raw=(process.env.CHATVICE_MAIL_ENCRYPTION_KEY||"").trim();
  if (!/^[0-9a-f]{64}$/i.test(raw)) {
    throw new Error("Mail encryption key is not configured (64 hex chars required)");
  }
  return Buffer.from(raw,"hex");
}
export function isMailEncryptionReady():boolean{
  try { masterKey(); return true; } catch { return false; }
}
function deriveKey(tenantId:string):Buffer {
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(tenantId)) throw new Error("Invalid mail encryption tenant");
  const key=masterKey();
  const material=hkdfSync("sha256",key,Buffer.from("chatvice-mail-encryption-v1"),
    Buffer.from("tenant:"+tenantId),32);
  key.fill(0);
  return Buffer.from(material);
}

// Binary objects use a separate version/purpose from database fields. Binding
// the complete private key prevents moving ciphertext to another attachment.
const BINARY_MAGIC=Buffer.from("CVMAILB1");
export const MAIL_BINARY_OVERHEAD=BINARY_MAGIC.length+12+16;
function binaryScope(objectKey:string):{tenant:string;aad:Buffer}{
  const match=/^mail\/([a-zA-Z0-9_-]{1,32})\/([0-9a-f-]{36})\/([a-zA-Z0-9_-]{1,128})$/i.exec(objectKey);
  if(!match)throw new Error("Invalid binary mail scope");
  return {tenant:match[1],aad:Buffer.from("chatvice-mail|binary|v1|"+objectKey)};
}
export function encryptMailBinary(objectKey:string,value:Buffer):Buffer{
  if(!Buffer.isBuffer(value) || !value.length)throw new Error("Invalid binary mail content");
  const scope=binaryScope(objectKey),key=deriveKey(scope.tenant),iv=randomBytes(12);
  try{
    const cipher=createCipheriv("aes-256-gcm",key,iv);
    cipher.setAAD(scope.aad);
    const data=Buffer.concat([cipher.update(value),cipher.final()]);
    return Buffer.concat([BINARY_MAGIC,iv,cipher.getAuthTag(),data]);
  }finally{key.fill(0);}
}
export function decryptMailBinary(objectKey:string,value:Buffer):Buffer{
  const scope=binaryScope(objectKey);
  if(!Buffer.isBuffer(value) || value.length<=MAIL_BINARY_OVERHEAD ||
     !value.subarray(0,BINARY_MAGIC.length).equals(BINARY_MAGIC))
    throw new Error("Encrypted mail object required; legacy objects require migration");
  const offset=BINARY_MAGIC.length,key=deriveKey(scope.tenant);
  try{
    const decipher=createDecipheriv("aes-256-gcm",key,value.subarray(offset,offset+12));
    decipher.setAAD(scope.aad);
    decipher.setAuthTag(value.subarray(offset+12,offset+28));
    return Buffer.concat([decipher.update(value.subarray(MAIL_BINARY_OVERHEAD)),decipher.final()]);
  }finally{key.fill(0);}
}
function associated(tenantId:string,recordId:string,field:MailSecretField){
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(recordId) ||
      !PURPOSES.includes(field))throw new Error("Invalid mail encryption scope");
  return Buffer.from(`chatvice-mail|v1|${tenantId}|${recordId}|${field}`,"utf8");
}
export function encryptMailField(
  tenantId:string, recordId:string, field:MailSecretField, value:string,
):string {
  if(typeof value!=="string")throw new Error("Invalid mail field");
  if(!value)return "";
  const key=deriveKey(tenantId);
  const iv=randomBytes(12);
  try{
    const cipher=createCipheriv("aes-256-gcm",key,iv);
    cipher.setAAD(associated(tenantId,recordId,field));
    const data=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
    return PREFIX+iv.toString("base64url")+"."+cipher.getAuthTag().toString("base64url")+"."+data.toString("base64url");
  }finally {key.fill(0);}
}
export function decryptMailField(
  tenantId:string,recordId:string,field:MailSecretField,value:string,
):string{
  if(typeof value!=="string")throw new Error("Invalid encrypted mail field");
  if(!value)return "";
  if(!value.startsWith(PREFIX))throw new Error("Mail ciphertext is missing");
  const parts=value.slice(PREFIX.length).split(".");
  if(parts.length!==3 || parts.some(v=>!/^[a-zA-Z0-9_-]+$/.test(v)))throw new Error("Invalid mail ciphertext");
  const iv=Buffer.from(parts[0],"base64url"),tag=Buffer.from(parts[1],"base64url"),data=Buffer.from(parts[2],"base64url");
  if(iv.length!==12 || tag.length!==16 || data.length>4_000_000)throw new Error("Invalid mail ciphertext structure");
  const key=deriveKey(tenantId);
  try{
    const decipher=createDecipheriv("aes-256-gcm",key,iv);
    decipher.setAAD(associated(tenantId,recordId,field));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data),decipher.final()]).toString("utf8");
  }finally{key.fill(0);}
}

