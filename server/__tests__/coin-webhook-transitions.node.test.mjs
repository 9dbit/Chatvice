import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decideCoinWebhookTransition } from "../coinWebhookTransitions.ts";

test("paid callbacks never fabricate coin-credit completion", () => {
  const states = ["PENDING", "FAILED", "EXPIRED", "PAID"];
  for (const state of states) {
    const result = decideCoinWebhookTransition(state, "PAID");
    assert.equal(result?.status, "PAID_BUT_NOT_CREDITED");
    assert.equal(result.expectedStatuses.includes(state), true);
  }
  for (const state of ["PAID_BUT_NOT_CREDITED", "COMPLETED"]) {
    assert.equal(decideCoinWebhookTransition(state, "PAID"), null);
  }
});

test("late failures cannot downgrade paid or credited orders", () => {
  for (const incoming of ["FAILED", "EXPIRED"]) {
    for (const current of ["PAID", "PAID_BUT_NOT_CREDITED", "COMPLETED"]) {
      assert.equal(decideCoinWebhookTransition(current, incoming), null);
    }
    assert.equal(decideCoinWebhookTransition("PENDING", incoming)?.status, incoming);
  }
  assert.equal(decideCoinWebhookTransition("FAILED", "FAILED"), null);
  assert.equal(decideCoinWebhookTransition("EXPIRED", "EXPIRED"), null);
  assert.equal(decideCoinWebhookTransition("PENDING", "GARBAGE"), null);
});

test("compare-and-set allows only one winning callback under concurrent retries", async () => {
  let state = "PENDING";
  let writes = 0;
  const cas = async incoming => {
    const transition = decideCoinWebhookTransition(state, incoming);
    await Promise.resolve(); // both callbacks can observe the same old state
    if (!transition || !transition.expectedStatuses.includes(state)) return false;
    state = transition.status;
    writes++;
    return true;
  };
  const result = await Promise.all([cas("PAID"), cas("PAID")]);
  assert.deepEqual(result.sort(), [false, true]);
  assert.equal(writes, 1);
  assert.equal(state, "PAID_BUT_NOT_CREDITED");
});

test("webhook uses database compare-and-set instead of unconditional order update", () => {
  const routes = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
  const webhook = routes.slice(routes.indexOf('app.post("/webhook/twelvepay"'), routes.indexOf("// ============== WIDGET SITES MANAGEMENT"));
  assert.match(webhook, /decideCoinWebhookTransition\(/);
  assert.match(webhook, /updateCoinOrderIfStatus\(/);
  assert.doesNotMatch(webhook, /creditedAt:\s*new Date\(/);
  assert.doesNotMatch(webhook, /status:\s*"COMPLETED"/);
});
