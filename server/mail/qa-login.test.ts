import test from "node:test";
import assert from "node:assert/strict";
import { renderQaLoginPage } from "./qa-login";

test("private QA login is a first-party form with a real password field and no trackers",()=>{
  const html=renderQaLoginPage();
  assert.match(html,/<form method="post" action="\/qa\/login"/);
  assert.match(html,/name="username"/);
  assert.match(html,/name="password" type="password"/);
  assert.match(html,/value="mailqa"/);
  assert.doesNotMatch(html,/googletagmanager|google-analytics|meta-pixel|fonts\.googleapis\.com/i);
  assert.doesNotMatch(html,/<script/i);
  assert.doesNotMatch(html,/#Chatadmin1/);
});
test("login failure message is generic and never echoes credentials",()=>{
  const html=renderQaLoginPage(true);
  assert.match(html,/role="alert"/);
  assert.doesNotMatch(html,/#Chatadmin1/);
});
