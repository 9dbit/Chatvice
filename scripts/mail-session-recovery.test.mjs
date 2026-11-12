import test from "node:test";
import assert from "node:assert/strict";
import { MAIL_SESSION_EXPIRED_EVENT, mailFetch, mailApiRequest, preferredMailboxId } from "../client/src/lib/mail-session.ts";

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
function mockBrowser(status, body = null) {
  const events = [];
  globalThis.window = { dispatchEvent(event) { events.push(event.type); return true; } };
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    return new Response(body === null ? null : JSON.stringify(body), {
      status, headers: { "Content-Type": "application/json" },
    });
  };
  return events;
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test("401 from a Mail API request emits the isolated session expiry event", async () => {
  const events = mockBrowser(401, { error: "Authentication required" });
  await assert.rejects(mailApiRequest("GET", "/api/mail/mailboxes"), /Authentication required/);
  assert.deepEqual(events, [MAIL_SESSION_EXPIRED_EVENT]);
});

test("401 from activity polling also signals session expiry", async () => {
  const events = mockBrowser(401);
  const response = await mailFetch("/api/mail/mailboxes/example/activity");
  assert.equal(response.status, 401);
  assert.deepEqual(events, [MAIL_SESSION_EXPIRED_EVENT]);
});

test("authorization denial is not misclassified as an expired login", async () => {
  const events = mockBrowser(403, { error: "Not allowed" });
  await assert.rejects(mailApiRequest("GET", "/api/mail/domains"), /Not allowed/);
  assert.deepEqual(events, []);
});

test("a successful response passes through without changing auth state", async () => {
  const events = mockBrowser(200, { data: [] });
  const response = await mailApiRequest("GET", "/api/mail/mailboxes");
  assert.deepEqual(await response.json(), { data: [] });
  assert.deepEqual(events, []);
});

test("mailFetch respects the request abort signal", async () => {
  const events = mockBrowser(200);
  const controller = new AbortController();
  const response = await mailFetch("/api/mail/mailboxes", { signal: controller.signal });
  assert.equal(response.status, 200);
  assert.deepEqual(events, []);
});

test("prefers the signed-in mailbox over the first alphabetic mailbox", () => {
  const boxes = [
    {id:"64cor",local_part:"64cor",domain:"chatvice.app",enabled:true},
    {id:"hello",local_part:"hello",domain:"chatvice.app",enabled:true},
    {id:"archived",local_part:"old",domain:"chatvice.app",enabled:false},
  ];
  assert.equal(preferredMailboxId(boxes, "HELLO@CHATVICE.APP"), "hello");
  assert.equal(preferredMailboxId(boxes, "unassigned@chatvice.app"), "64cor");
  assert.equal(preferredMailboxId(boxes, "old@chatvice.app"), "64cor");
  assert.equal(preferredMailboxId([],"hello@chatvice.app"), "");
});
