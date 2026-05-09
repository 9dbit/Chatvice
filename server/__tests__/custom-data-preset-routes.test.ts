import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerCustomDataPresetRoutes } from "../customDataPresetRoutes";
import type { CustomDataIntent, CustomDataSource } from "@shared/schema";

const baseSource: CustomDataSource = {
  id: "cds_http",
  merchantId: "m1",
  name: "Panel",
  baseUrl: "https://example.com",
  apiKeyEncrypted: null,
  apiKeyHint: null,
  headerAuthName: "X-API-Key",
  healthPath: "/health",
  cacheTtlSec: 30,
  rateLimitPerMin: 60,
  isEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildApp(opts: {
  authed?: boolean;
  source?: CustomDataSource | null;
  existingIntents?: CustomDataIntent[];
} = {}) {
  const app = express();
  app.use(express.json());
  const storage = {
    getCustomDataSource: vi.fn(async (_m: string) =>
      opts.source === undefined ? baseSource : opts.source,
    ),
    getCustomDataIntents: vi.fn(async (_s: string) => opts.existingIntents ?? []),
    createCustomDataIntent: vi.fn(async (data: any) => ({
      ...data,
      id: "cdi_http_new",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CustomDataIntent)),
  };
  registerCustomDataPresetRoutes(app, {
    requireMerchant: (_req, res, next) => {
      if (opts.authed === false) return res.status(401).json({ error: "Unauthorized" });
      next();
    },
    getMerchantId: () => "m1",
    storage,
  });
  return { app, storage };
}

describe("HTTP — GET /api/merchant/custom-data-source/presets", () => {
  it("returns 200 with all wizard presets", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/merchant/custom-data-source/presets");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.map((p: any) => p.id).sort()).toEqual(["ecommerce", "finansial", "judi"]);
  });

  it("returns 401 when the requireMerchant middleware blocks", async () => {
    const { app } = buildApp({ authed: false });
    const res = await request(app).get("/api/merchant/custom-data-source/presets");
    expect(res.status).toBe(401);
  });
});

describe("HTTP — POST /api/merchant/custom-data-intents/from-preset", () => {
  it("returns 200 + the created intent on success", async () => {
    const { app, storage } = buildApp();
    const res = await request(app)
      .post("/api/merchant/custom-data-intents/from-preset")
      .send({ preset: "judi", intentKey: "deposit_status" });
    expect(res.status).toBe(200);
    expect(res.body.intentKey).toBe("deposit_status");
    expect(res.body.sourceId).toBe(baseSource.id);
    expect(storage.createCustomDataIntent).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when no source exists yet", async () => {
    const { app } = buildApp({ source: null });
    const res = await request(app)
      .post("/api/merchant/custom-data-intents/from-preset")
      .send({ preset: "judi", intentKey: "deposit_status" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/source/i);
  });

  it("returns 404 for an unknown preset id", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/merchant/custom-data-intents/from-preset")
      .send({ preset: "nope", intentKey: "deposit_status" });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 404 for a known preset but unknown intentKey", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/merchant/custom-data-intents/from-preset")
      .send({ preset: "judi", intentKey: "totally_made_up" });
    expect(res.status).toBe(404);
  });

  it("returns 409 with the conflicting intentKey when an intent already exists", async () => {
    const existing = [{
      id: "cdi_existing",
      sourceId: baseSource.id,
      intentKey: "deposit_status",
      name: "x", description: "", triggerKeywords: "",
      httpMethod: "GET", endpointPath: "/x",
      requiredFields: [], responseTemplate: "",
      isEnabled: true, sortOrder: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }] as unknown as CustomDataIntent[];
    const { app, storage } = buildApp({ existingIntents: existing });
    const res = await request(app)
      .post("/api/merchant/custom-data-intents/from-preset")
      .send({ preset: "judi", intentKey: "deposit_status" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
    expect(res.body.intentKey).toBe("deposit_status");
    expect(storage.createCustomDataIntent).not.toHaveBeenCalled();
  });

  it("returns 401 when the requireMerchant middleware blocks", async () => {
    const { app } = buildApp({ authed: false });
    const res = await request(app)
      .post("/api/merchant/custom-data-intents/from-preset")
      .send({ preset: "judi", intentKey: "deposit_status" });
    expect(res.status).toBe(401);
  });

  it.each(["judi", "finansial", "ecommerce"] as const)(
    "scaffolds the first example intent for preset %s end-to-end via HTTP",
    async (preset) => {
      const seedKeys: Record<string, string> = {
        judi: "deposit_status",
        finansial: "saldo_rekening",
        ecommerce: "status_pesanan",
      };
      const { app, storage } = buildApp();
      const res = await request(app)
        .post("/api/merchant/custom-data-intents/from-preset")
        .send({ preset, intentKey: seedKeys[preset] });
      expect(res.status).toBe(200);
      expect(res.body.intentKey).toBe(seedKeys[preset]);
      expect(storage.createCustomDataIntent).toHaveBeenCalledTimes(1);
    },
  );
});
