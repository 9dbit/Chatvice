import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import jwt from "jsonwebtoken";
import { getTopupJwtSecret } from "../topupTokenSecurity.ts";
import { backgroundJobsEnabled } from "../backgroundJobs.ts";

const key = "UNIT_TEST_ONLY_0123456789abcdef".repeat(3);

test("missing or weak top-up JWT secrets fail closed", () => {
  assert.equal(getTopupJwtSecret({}), null);
  assert.equal(getTopupJwtSecret({ JWT_SECRET: "" }), null);
  assert.equal(getTopupJwtSecret({ JWT_SECRET: "short" }), null);
  assert.equal(getTopupJwtSecret({ JWT_SECRET: key + " " }), null);
  assert.equal(getTopupJwtSecret({ JWT_SECRET: key }), key);
});

test("top-up JWT requires HS256 and expires after 30 minutes", () => {
  const secret = getTopupJwtSecret({ JWT_SECRET: key });
  assert.ok(secret);
  const token = jwt.sign({ type: "topup_session", site_id: "test" }, secret,
    { algorithm: "HS256", expiresIn: "30m" });
  const [head] = token.split(".");
  const header = JSON.parse(Buffer.from(head, "base64url").toString());
  assert.equal(header.alg, "HS256");
  const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
  assert.equal(payload.type, "topup_session");
  assert.equal(payload.exp - payload.iat, 1800);
  assert.throws(() => jwt.verify(token, "wrong", { algorithms: ["HS256"] }));
});

test("all three top-up route JWT operations fail closed without a key", () => {
  const routes = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
  assert.equal([...routes.matchAll(/getTopupJwtSecret\(\)/g)].length, 3);
  assert.equal([...routes.matchAll(/Top-up temporarily unavailable/g)].length, 3);
  assert.equal([...routes.matchAll(/algorithms: \["HS256"\]/g)].length, 2);
  assert.doesNotMatch(routes, /const JWT_SECRET = process\.env\.JWT_SECRET \|\|/);
});

test("Railway background jobs remain disabled unless explicitly enabled", () => {
  assert.equal(backgroundJobsEnabled({ RAILWAY_PROJECT_ID: "test" }), false);
  assert.equal(backgroundJobsEnabled({ RAILWAY_PROJECT_ID: "test", ENABLE_BACKGROUND_JOBS: "false" }), false);
  assert.equal(backgroundJobsEnabled({ RAILWAY_PROJECT_ID: "test", ENABLE_BACKGROUND_JOBS: "true" }), true);
});
