import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encryptMailBinary,decryptMailBinary,MAIL_BINARY_OVERHEAD } from "./crypto";
const key="mail/tenant_a/00000000-0000-4000-8000-000000000001/file1";
process.env.CHATVICE_MAIL_ENCRYPTION_KEY="c".repeat(64);
test("binary mail encryption preserves arbitrary bytes with randomized authenticated envelopes",()=>{
  const original=Buffer.concat([Buffer.from([0,255,128,0]),randomBytes(1024*1024)]);
  const a=encryptMailBinary(key,original),b=encryptMailBinary(key,original);
  assert.equal(a.length,original.length+MAIL_BINARY_OVERHEAD);
  assert.notDeepEqual(a,b);
  assert.deepEqual(decryptMailBinary(key,a),original);
  assert.equal(a.includes(original.subarray(0,64)),false);
});
test("binary envelopes reject tenant, message, object, key and byte substitution",()=>{
  const encrypted=encryptMailBinary(key,Buffer.from("private attachment"));
  for(const scope of [key.replace("tenant_a","tenant_b"),key.replace("000001","000002"),key+"x"])
    assert.throws(()=>decryptMailBinary(scope,encrypted));
  for(const position of [0,8,20,36,encrypted.length-1]){
    const changed=Buffer.from(encrypted);changed[position]^=1;
    assert.throws(()=>decryptMailBinary(key,changed));
  }
  process.env.CHATVICE_MAIL_ENCRYPTION_KEY="d".repeat(64);
  assert.throws(()=>decryptMailBinary(key,encrypted));
  delete process.env.CHATVICE_MAIL_ENCRYPTION_KEY;
  assert.throws(()=>encryptMailBinary(key,Buffer.from("private")));
  process.env.CHATVICE_MAIL_ENCRYPTION_KEY="c".repeat(64);
});
test("unversioned plaintext and malformed object scopes never bypass decryption",()=>{
  assert.throws(()=>decryptMailBinary(key,Buffer.from("legacy plaintext")));
  assert.throws(()=>encryptMailBinary("mail/tenant_a/../secret",Buffer.from("x")));
});
