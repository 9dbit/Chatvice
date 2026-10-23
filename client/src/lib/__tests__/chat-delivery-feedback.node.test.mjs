import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyChatDeliveryError, shouldShowHumanHandoffNotice, HUMAN_HANDOFF_NOTICE,
} from "../chat-delivery-feedback.ts";

test("subscription problems show a safe, actionable notice", () => {
  for (const code of ["TRIAL_EXPIRED", "SUBSCRIPTION_EXPIRED", "SUBSCRIPTION_INACTIVE"]) {
    const error = Object.assign(new Error("Private customer billing info"), { code });
    const result = classifyChatDeliveryError(error);
    assert.equal(result.kind, "account");
    assert.doesNotMatch(result.message, /Private|billing info|trial|subscription/i);
  }
});

test("conversation quota returned in structured error reaches the limit popup", () => {
  const error = Object.assign(new Error("Monthly conversation limit reached"), {
    code: "CONVERSATION_LIMIT_REACHED", limit: 50,
  });
  const result = classifyChatDeliveryError(error);
  assert.equal(result.kind, "quota");
  assert.equal(result.limit, 50);
});

test("rate limits and network failures are not confused with paid plan quota", () => {
  assert.equal(classifyChatDeliveryError(new Error("429: Too Many Requests")).kind, "throttled");
  assert.equal(classifyChatDeliveryError(new TypeError("Failed to fetch")).kind, "network");
  assert.equal(classifyChatDeliveryError(new Error("502: gateway unavailable")).kind, "network");
});

test("unknown messages are sanitized and do not reveal upstream error details", () => {
  const message = classifyChatDeliveryError(new Error("Error: bearer sk-private-unknown")).message;
  assert.doesNotMatch(message, /sk-private|bearer|Error:/i);
});

test("human-mode empty responses announce a paused AI without enabling AI", () => {
  assert.equal(shouldShowHumanHandoffNotice({ answer:"", mode:"HUMAN" }), true);
  assert.equal(shouldShowHumanHandoffNotice({ answer:"Hello", mode:"HUMAN" }), false);
  assert.equal(shouldShowHumanHandoffNotice({ answer:"", mode:"AI" }), false);
  assert.equal(shouldShowHumanHandoffNotice({ answer:"", mode:"HUMAN", limitFallback:true }), false);
  assert.equal(shouldShowHumanHandoffNotice({ answer:"", mode:"HUMAN", triggerHit:true }), false);
  assert.match(HUMAN_HANDOFF_NOTICE, /human agent/i);
});

test("falsy and non-Error objects fail closed", () => {
  assert.equal(classifyChatDeliveryError(null).kind, "unavailable");
  assert.equal(classifyChatDeliveryError({ code:"TRIAL_EXPIRED", message:"secret" }).kind, "unavailable");
});
