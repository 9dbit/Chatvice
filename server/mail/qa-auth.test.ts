import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { authenticateQaHeaders, issueQaSessionCookie, verifyQaSessionCookie, QA_COOKIE_NAME } from "./qa-auth";

const token="c".repeat(64);
const password="#ExampleQA1"; // Test fixture only, never a customer or Railway password.
const salt=Buffer.from("b".repeat(32),"hex");
const hash="scrypt1."+salt.toString("hex")+"."+
  scryptSync(password,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString("hex");
const basic=(user:string,pass:string)=>"Basic "+Buffer.from(user+":"+pass).toString("base64");

test("QA Basic login accepts the dedicated human password but not the internal bearer token",async()=>{
  assert.equal(await authenticateQaHeaders({authorization:basic("mailqa",password)},token,hash),"basic");
  assert.equal(await authenticateQaHeaders({authorization:basic("mailqa","wrong")},token,hash),null);
  assert.equal(await authenticateQaHeaders({authorization:basic("other",password)},token,hash),null);
  assert.equal(await authenticateQaHeaders({authorization:basic("mailqa",token)},token,hash),null);
  assert.equal(await authenticateQaHeaders({authorization:"Bearer "+token},token,hash),"bearer");
  assert.equal(await authenticateQaHeaders({authorization:"Bearer "+"d".repeat(64)},token,hash),null);
  assert.equal(await authenticateQaHeaders({authorization:"Basic garbage$"},token,hash),null);
});
test("QA session cookies are HttpOnly, Secure, short-lived, and bound to the private token",async()=>{
  const now=Date.now();
  const cookie=issueQaSessionCookie(token,now);
  assert.match(cookie,/; HttpOnly;/);
  assert.match(cookie,/; Secure;/);
  assert.match(cookie,/; SameSite=Strict$/);
  assert.ok(cookie.startsWith(QA_COOKIE_NAME+"="));
  assert.equal(verifyQaSessionCookie(cookie.split(";")[0],token,now+10),true);
  assert.equal(await authenticateQaHeaders({cookie:cookie.split(";")[0]},token,hash,now+10),"session");
  assert.equal(verifyQaSessionCookie(cookie.split(";")[0],token,now+3600001),false);
  assert.equal(verifyQaSessionCookie(cookie.split(";")[0],"d".repeat(64),now+10),false);
  const parts=cookie.split(";");
  const changed=parts[0].slice(0,-1)+(parts[0].endsWith("a")?"b":"a");
  assert.equal(verifyQaSessionCookie(changed,token,now+10),false);
});
test("QA ignores forged cookies and rejects missing auth",async()=>{
  assert.equal(await authenticateQaHeaders({},token,hash),null);
  assert.equal(await authenticateQaHeaders({cookie:QA_COOKIE_NAME+"=broken"},token,hash),null);
  assert.equal(await authenticateQaHeaders({authorization:"Basic "+Buffer.from("mailqa:"+password).toString("base64")},token,"invalid"),null);
});
