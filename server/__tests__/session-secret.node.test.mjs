import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSessionSecret } from "../sessionSecret.ts";

const strong = "UNIT_TEST_ONLY_0123456789abcdef".repeat(3);

test("production requires an explicitly configured strong session secret", () => {
  for (const weak of [undefined, "", "short", "a".repeat(31), strong + " "]) {
    const env = { NODE_ENV: "production" };
    if (weak !== undefined) env.SESSION_SECRET = weak;
    assert.throws(() => getSessionSecret(env), /SESSION_SECRET is missing or invalid/);
  }
  assert.equal(getSessionSecret({ NODE_ENV: "production", SESSION_SECRET: strong }), strong);
});

test("development retains existing session secret fallback", () => {
  assert.equal(getSessionSecret({ NODE_ENV: "development" }), "chatvice-secret-key-change-in-production");
  assert.equal(getSessionSecret({ NODE_ENV: "test", SESSION_SECRET: "dev-secret" }), "dev-secret");
});

test("session key errors never include the secret", () => {
  const invalid = "unit-test-secret-should-not-leak ";
  assert.throws(() => getSessionSecret({ NODE_ENV: "production", SESSION_SECRET: invalid }),
    error => !error.message.includes(invalid));
});

test("production session config does not contain the predictable inline fallback", () => {
  const routes = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
  assert.match(routes, /secret: getSessionSecret\(\)/);
  assert.doesNotMatch(routes, /secret: process\.env\.SESSION_SECRET \|\|/);
});
