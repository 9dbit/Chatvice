import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  greetingDelayToMilliseconds,
  hasReplayableProactiveGreeting,
} from "../proactiveGreetingDelivery";

const ROUTES_PATH = path.resolve(__dirname, "..", "routes.ts");

describe("proactive greeting delivery recovery", () => {
  it("honors a one-second configured delay", () => {
    expect(greetingDelayToMilliseconds(1)).toBe(1000);
  });

  it("replays the auto-open signal only after a delayed visitor socket can see its persisted greeting", () => {
    const pendingVisitor = {
      visitorSession: true,
      proactiveGreetingSent: true,
      status: "active",
    };

    // Socket connects before the greeting generation finishes: the normal
    // broadcast handles this already-subscribed connection.
    expect(hasReplayableProactiveGreeting(pendingVisitor, [])).toBe(false);

    // Socket connects late or reconnects after the greeting was persisted.
    expect(hasReplayableProactiveGreeting(pendingVisitor, [{ from: "ai" }])).toBe(true);
  });

  it("does not replay an auto-open after the visitor has upgraded to a real chat", () => {
    expect(hasReplayableProactiveGreeting(
      { visitorSession: false, proactiveGreetingSent: true, status: "active" },
      [{ from: "ai" }],
    )).toBe(false);
  });

  it("does not replay a greeting for a visitor who has already left", () => {
    expect(hasReplayableProactiveGreeting(
      { visitorSession: true, proactiveGreetingSent: true, status: "archived" },
      [{ from: "ai" }],
    )).toBe(false);
  });
});

describe("blocked-domain diagnostics", () => {
  it("keeps visitor tracking blocked while providing an actionable browser diagnostic", () => {
    const source = fs.readFileSync(ROUTES_PATH, "utf8");

    expect(source).toContain('res.status(403).json({ tracked: false, domainNotAllowed: true })');
    expect(source).toContain('Visitor tracking was blocked because');
    expect(source).toContain('Widget → Allowed Domains');
  });
});