import test from "node:test";
import assert from "node:assert/strict";
import { makeOriginRequest, handleEdgeRequest } from "../src/index.mjs";

const env = {
  UPSTREAM_ORIGIN: "https://chatvice-production.up.railway.app",
  ALLOWED_HOSTS: "chat.chatvice.app",
};

test("rejects unconfigured host and never calls upstream", async () => {
  let called = false;
  const res = await handleEdgeRequest(
    new Request("https://pay.chatvice.app/api/payment/webhook"),
    env,
    async () => { called = true; return new Response("Unexpected"); }
  );
  assert.equal(res.status, 421);
  assert.equal(called, false);
});

test("preserves chat subdomain path, query, method and session cookie", async () => {
  const req = new Request("https://chat.chatvice.app/api/customer/stores?page=2&size=5", {
    headers: { Cookie: "sid=test-cookie-value" },
  });
  const res = await handleEdgeRequest(req, env, async (upstream) => {
    assert.equal(upstream.url, "https://chatvice-production.up.railway.app/api/customer/stores?page=2&size=5");
    assert.equal(upstream.method, "GET");
    assert.equal(upstream.headers.get("x-forwarded-host"), "chat.chatvice.app");
    assert.equal(upstream.headers.get("x-forwarded-proto"), "https");
    assert.equal(upstream.headers.get("cookie"), "sid=test-cookie-value");
    return new Response("OK", { status: 200, headers: { "Set-Cookie": "session=abc; Secure; HttpOnly" } });
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("set-cookie"), "session=abc; Secure; HttpOnly");
});

test("POST request bodies are streamed to the configured origin", async () => {
  const request = new Request("https://chat.chatvice.app/api/customer/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://chat.chatvice.app" },
    body: JSON.stringify({ action: "begin" }),
  });
  let calls = 0;
  const response = await handleEdgeRequest(request, env, async (upstream) => {
    calls += 1;
    assert.equal(upstream.method, "POST");
    assert.equal(upstream.headers.get("origin"), "https://chat.chatvice.app");
    assert.deepEqual(await upstream.json(), { action: "begin" });
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 201);
});

test("blocks accidental upstream misconfiguration and HTTP without forwarding", () => {
  const req = new Request("https://chat.chatvice.app/");
  assert.equal(makeOriginRequest(req, { ALLOWED_HOSTS: "chat.chatvice.app" }).status, 503);
  assert.equal(makeOriginRequest(req, { ...env, UPSTREAM_ORIGIN: "http://127.0.0.1/" }).status, 503);
  assert.equal(makeOriginRequest(new Request("http://chat.chatvice.app/"), env).status, 400);
});

test("pay and blaster remain disabled by default but can be opted in after UAT", () => {
  const pay = new Request("https://pay.chatvice.app/order?id=1");
  assert.equal(makeOriginRequest(pay, env).status, 421);
  const planned = makeOriginRequest(pay, {
    ...env,
    ALLOWED_HOSTS: "chat.chatvice.app,pay.chatvice.app",
  });
  assert.equal(planned.request.url, "https://chatvice-production.up.railway.app/order?id=1");
  assert.equal(planned.request.headers.get("x-forwarded-host"), "pay.chatvice.app");
});

test("origin network errors return a sanitized 502 response", async () => {
  const res = await handleEdgeRequest(
    new Request("https://chat.chatvice.app/api/health"),
    env,
    async () => { throw new Error("private backend connection failure"); }
  );
  assert.equal(res.status, 502);
  assert.equal((await res.text()).includes("private"), false);
});

test("double-slash paths cannot redirect cookies and authorization to another origin", async () => {
  for (const path of ["//external.example/collect?x=1", "/%2f%2fexternal.example/collect"]) {
    const response = await handleEdgeRequest(new Request("https://chat.chatvice.app" + path, {
      headers: { Cookie: "session=private", Authorization: "Bearer private" },
    }), env, async (upstream) => {
      const target = new URL(upstream.url);
      assert.equal(target.origin, env.UPSTREAM_ORIGIN);
      assert.equal(target.pathname, new URL("https://chat.chatvice.app" + path).pathname);
      assert.equal(upstream.headers.get("cookie"), "session=private");
      return new Response("OK");
    });
    assert.equal(response.status, 200);
  }
});
