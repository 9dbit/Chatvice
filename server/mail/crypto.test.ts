import test from "node:test";
import assert from "node:assert/strict";
import { encryptMailField, decryptMailField, isMailEncryptionReady } from "./crypto";
const tenantA="merchant_mail_ci_A",tenantB="merchant_mail_ci_B";
const idA="00000000-0000-4000-8000-000000000001";
const idB="00000000-0000-4000-8000-000000000002";
test("mail encryption fails closed without an exact 256-bit key",()=>{
  const old=process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
  try{
    delete process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
    assert.equal(isMailEncryptionReady(),false);
    assert.throws(()=>encryptMailField(tenantA,idA,"message-text","customer secret"),/not configured/);
    process.env.CHATVICE_MAIL_ENCRYPTION_KEY="short";
    assert.equal(isMailEncryptionReady(),false);
  }finally{
    if(old===undefined)delete process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
    else process.env.CHATVICE_MAIL_ENCRYPTION_KEY=old;
  }
});
test("AES-256-GCM ciphertext has fresh random nonce and never includes plaintext",()=>{
  const old=process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
  process.env.CHATVICE_MAIL_ENCRYPTION_KEY="a".repeat(64);
  try{
    const value="Customer invoice 100000000 and private bank account";
    const a=encryptMailField(tenantA,idA,"message-text",value);
    const b=encryptMailField(tenantA,idA,"message-text",value);
    assert.notEqual(a,b);
    assert.match(a,/^cvenc1\./);
    assert.equal(a.includes("Customer"),false);
    assert.equal(decryptMailField(tenantA,idA,"message-text",a),value);
    assert.equal(decryptMailField(tenantA,idA,"message-text",b),value);
    assert.equal(decryptMailField(tenantA,idA,"message-text",""),"");
    assert.equal(encryptMailField(tenantA,idA,"message-text",""),"");
  }finally{
    if(old===undefined)delete process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
    else process.env.CHATVICE_MAIL_ENCRYPTION_KEY=old;
  }
});
test("AAD rejects cross-tenant, cross-message and cross-purpose ciphertext swaps",()=>{
  const old=process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
  process.env.CHATVICE_MAIL_ENCRYPTION_KEY="b".repeat(64);
  try{
    const a=encryptMailField(tenantA,idA,"message-text","private");
    assert.throws(()=>decryptMailField(tenantB,idA,"message-text",a));
    assert.throws(()=>decryptMailField(tenantA,idB,"message-text",a));
    assert.throws(()=>decryptMailField(tenantA,idA,"message-subject",a));
    const parts=a.split(".");
    const last=parts[parts.length-1];
    parts[parts.length-1]=last.slice(0,-1)+(last.endsWith("A")?"B":"A");
    assert.throws(()=>decryptMailField(tenantA,idA,"message-text",parts.join(".")));
    assert.throws(()=>decryptMailField(tenantA,idA,"message-text","raw customer text"));
  }finally{
    if(old===undefined)delete process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
    else process.env.CHATVICE_MAIL_ENCRYPTION_KEY=old;
  }
});
