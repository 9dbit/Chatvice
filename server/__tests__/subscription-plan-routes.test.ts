import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { PLAN_LIMIT_LABELS, registerSubscriptionPlanRoutes } from "../subscriptionPlanRoutes";
import { subscriptionPlans } from "@shared/schema";

function buildApp() {
  const app = express();
  app.use(express.json());

  let persisted = "{}";
  let responseCache: unknown = null;
  let effectiveCache: unknown[] | null = null;
  const storage = {
    getPlatformSetting: vi.fn(async () => persisted),
    setPlatformSetting: vi.fn(async (_key: string, value: string) => {
      persisted = value;
    }),
  };
  const deps = {
    requireAdmin: (_req: any, _res: any, next: any) => next(),
    storage,
    getAllEffectiveSubscriptionPlans: vi.fn(async () => {
      if (effectiveCache) return effectiveCache;
      const overrides = JSON.parse(persisted);
      effectiveCache = Object.entries(subscriptionPlans).map(([id, plan]) => ({
        ...plan,
        id,
        ...(overrides[id] || {}),
      }));
      return effectiveCache;
    }),
    clearPlanCache: vi.fn(() => {
      effectiveCache = null;
    }),
    getCached: vi.fn(() => responseCache),
    setCache: vi.fn((_key: string, value: unknown) => {
      responseCache = value;
    }),
    invalidateCache: vi.fn(() => {
      responseCache = null;
    }),
  };
  registerSubscriptionPlanRoutes(app, deps);
  return { app, deps, storage, getPersisted: () => JSON.parse(persisted) };
}

describe("subscription plan limit editing", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(Object.keys(PLAN_LIMIT_LABELS))(
    "accepts 0, a positive integer, and -1 for %s",
    async (field) => {
      const { app, getPersisted } = buildApp();
      for (const value of [0, 12, -1]) {
        const res = await request(app)
          .put("/api/admin/subscription-plans/free")
          .send({ [field]: value });
        expect(res.status).toBe(200);
        expect(res.body.plan[field]).toBe(value);
        expect(getPersisted().free[field]).toBe(value);
      }
    },
  );

  it.each([
    ["domainsLimit", -2],
    ["domainsLimit", 1.5],
    ["domainsLimit", "many"],
    ["agentsLimit", -20],
  ])("rejects invalid %s value %j without overwriting the last configuration", async (field, value) => {
    const { app, storage, getPersisted } = buildApp();
    await request(app).put("/api/admin/subscription-plans/free").send({ [field]: 7 }).expect(200);
    storage.setPlatformSetting.mockClear();

    const res = await request(app)
      .put("/api/admin/subscription-plans/free")
      .send({ [field]: value });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain(PLAN_LIMIT_LABELS[field as keyof typeof PLAN_LIMIT_LABELS]);
    expect(res.body.error).toContain("-1 (unlimited)");
    expect(storage.setPlatformSetting).not.toHaveBeenCalled();
    expect(getPersisted().free[field]).toBe(7);
  });

  it("returns a valid update from the effective endpoint after both caches are invalidated", async () => {
    const { app, deps } = buildApp();
    const before = await request(app).get("/api/subscription-plans").expect(200);
    expect(before.body.find((plan: any) => plan.id === "free").domainsLimit).not.toBe(23);

    await request(app)
      .put("/api/admin/subscription-plans/free")
      .send({ domainsLimit: 23 })
      .expect(200);

    const after = await request(app).get("/api/subscription-plans").expect(200);
    expect(after.body.find((plan: any) => plan.id === "free").domainsLimit).toBe(23);
    expect(deps.clearPlanCache).toHaveBeenCalledOnce();
    expect(deps.invalidateCache).toHaveBeenCalledWith("subscription-plans");
    expect(deps.getAllEffectiveSubscriptionPlans).toHaveBeenCalledTimes(2);
  });

  it("rejects unknown plan IDs before reading or writing custom overrides", async () => {
    const { app, storage, getPersisted } = buildApp();
    const res = await request(app)
      .put("/api/admin/subscription-plans/not-a-plan")
      .send({ domainsLimit: 5 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Plan not found");
    expect(storage.getPlatformSetting).not.toHaveBeenCalled();
    expect(storage.setPlatformSetting).not.toHaveBeenCalled();
    expect(getPersisted()).toEqual({});
  });
});