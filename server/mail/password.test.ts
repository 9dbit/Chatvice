import test from "node:test";
import assert from "node:assert/strict";
import {hashMailPassword,verifyMailPassword} from "./password";
test("mail credentials use random salted scrypt and reject wrong or malformed credentials",async()=>{
  const password="synthetic-password-very-long-123";
  const a=await hashMailPassword(password),b=await hashMailPassword(password);
  assert.notEqual(a,b);assert.equal(a.includes(password),false);
  assert.equal(await verifyMailPassword(password,a),true);
  assert.equal(await verifyMailPassword("incorrect",a),false);
  assert.equal(await verifyMailPassword(password,null),false);
  assert.equal(await verifyMailPassword(password,"scrypt1.bad"),false);
  assert.equal(await verifyMailPassword("x".repeat(257),a),false);
  await assert.rejects(()=>hashMailPassword("short"));
});
