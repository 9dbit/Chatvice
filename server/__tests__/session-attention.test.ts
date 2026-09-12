import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  canSessionRequireAttention,
  resolveSessionAttention,
  type SessionAttentionStorage,
} from "../sessionAttention";

const ROUTES_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "..", "routes.ts"),
  "utf8",
);

function getPostRouteSource(route: string): string {
  const start = ROUTES_SOURCE.indexOf(`app.post("${route}"`);
  const nextRoute = ROUTES_SOURCE.indexOf("\n  app.", start + 1);

  expect(start).toBeGreaterThanOrEqual(0);
  return ROUTES_SOURCE.slice(start, nextRoute === -1 ? undefined : nextRoute);
}

function createStorageMock() {
  const updateSession = vi.fn(async (_id: string, data: Record<string, unknown>) => ({
    id: "sess_1",
    ...data,
  }));
  const markNotificationsSeenBySession = vi.fn(async () => 2);

  return {
    storage: {
      updateSession,
      markNotificationsSeenBySession,
    } as unknown as SessionAttentionStorage,
    updateSession,
    markNotificationsSeenBySession,
  };
}

describe("session attention resolution", () => {
  it("clears attention and related notifications after a response", async () => {
    const {
      storage,
      updateSession,
      markNotificationsSeenBySession,
    } = createStorageMock();

    await resolveSessionAttention(storage, "sess_1", {
      supervisorId: "sup_1",
    });

    expect(updateSession).toHaveBeenCalledWith("sess_1", {
      supervisorId: "sup_1",
      needsSupervisorAttention: false,
    });
    expect(markNotificationsSeenBySession).toHaveBeenCalledWith("sess_1");
  });

  it("ends a chat and clears attention in the same resolution call", async () => {
    const {
      storage,
      updateSession,
      markNotificationsSeenBySession,
    } = createStorageMock();
    const endedAt = new Date("2026-09-12T16:00:00.000Z");

    await resolveSessionAttention(storage, "sess_1", {
      status: "ended",
      lastActivity: endedAt,
    });

    expect(updateSession).toHaveBeenCalledWith("sess_1", {
      status: "ended",
      lastActivity: endedAt,
      needsSupervisorAttention: false,
    });
    expect(markNotificationsSeenBySession).toHaveBeenCalledWith("sess_1");
  });

  it.each(["ended", "closed", "archived"])(
    "does not allow %s sessions to require attention",
    (status) => {
      expect(canSessionRequireAttention(status)).toBe(false);
    },
  );

  it("allows active sessions to require attention again", () => {
    expect(canSessionRequireAttention("active")).toBe(true);
  });

  it.each([
    "/api/supervisor/send",
    "/api/session/send-message",
    "/api/session/offer-product",
    "/api/telegram/webhook/:merchantId",
    "/api/merchant/tickets/:id/reply",
  ])("resolves attention from the supported response route %s", (route) => {
    expect(getPostRouteSource(route)).toContain("resolveSessionAttention(storage");
  });
});