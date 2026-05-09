import { describe, it, expect, vi } from "vitest";
import { listPresetsForApi, scaffoldPresetIntent, PRESET_INTENTS } from "../customConnector";
import type { CustomDataIntent, CustomDataSource } from "@shared/schema";

const baseSource: CustomDataSource = {
  id: "cds_1",
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

function makeDeps(overrides: {
  source?: CustomDataSource | undefined | null;
  existingIntents?: CustomDataIntent[];
  createImpl?: (data: any) => Promise<CustomDataIntent>;
} = {}) {
  return {
    getCustomDataSource: vi.fn(async (_m: string) => overrides.source === undefined ? baseSource : overrides.source),
    getCustomDataIntents: vi.fn(async (_s: string) => overrides.existingIntents ?? []),
    createCustomDataIntent: vi.fn(overrides.createImpl ?? (async (data: any) => ({
      ...data,
      id: "cdi_new",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CustomDataIntent))),
  };
}

describe("listPresetsForApi", () => {
  it("returns all three wizard presets in stable shape", () => {
    const presets = listPresetsForApi();
    const ids = presets.map(p => p.id).sort();
    expect(ids).toEqual(["ecommerce", "finansial", "judi"]);
    for (const p of presets) {
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(Array.isArray(p.intents)).toBe(true);
      expect(p.intents.length).toBeGreaterThan(0);
      for (const it of p.intents) {
        expect(it.intentKey).toBeTruthy();
        expect(it.httpMethod).toBeTruthy();
        expect(it.endpointPath.startsWith("/")).toBe(true);
        expect(Array.isArray(it.requiredFields)).toBe(true);
      }
    }
  });

  it("does not leak server-only fields like triggerKeywords or responseTemplate", () => {
    const presets = listPresetsForApi();
    for (const p of presets) {
      for (const it of p.intents) {
        expect(it).not.toHaveProperty("triggerKeywords");
        expect(it).not.toHaveProperty("responseTemplate");
        expect(it).not.toHaveProperty("isEnabled");
      }
    }
  });
});

describe("scaffoldPresetIntent — POST /api/merchant/custom-data-intents/from-preset logic", () => {
  it("returns 400 when the merchant has no custom data source yet", async () => {
    const deps = makeDeps({ source: null });
    const res = await scaffoldPresetIntent({
      merchantId: "m1",
      preset: "judi",
      intentKey: "deposit_status",
      deps,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(400);
      expect(res.error).toMatch(/source/i);
    }
    expect(deps.createCustomDataIntent).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown preset id", async () => {
    const deps = makeDeps();
    const res = await scaffoldPresetIntent({
      merchantId: "m1",
      preset: "does-not-exist",
      intentKey: "anything",
      deps,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(404);
    expect(deps.createCustomDataIntent).not.toHaveBeenCalled();
  });

  it("returns 404 for a known preset but unknown intentKey", async () => {
    const deps = makeDeps();
    const res = await scaffoldPresetIntent({
      merchantId: "m1",
      preset: "judi",
      intentKey: "not_a_real_intent",
      deps,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(404);
  });

  it("returns 409 when an intent with the same key already exists (idempotent)", async () => {
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
    const deps = makeDeps({ existingIntents: existing });
    const res = await scaffoldPresetIntent({
      merchantId: "m1",
      preset: "judi",
      intentKey: "deposit_status",
      deps,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(409);
      expect(res.intentKey).toBe("deposit_status");
    }
    expect(deps.createCustomDataIntent).not.toHaveBeenCalled();
  });

  it.each(["judi", "finansial", "ecommerce"] as const)(
    "scaffolds the first example intent for preset %s",
    async (preset) => {
      const seed = PRESET_INTENTS[preset][0];
      const deps = makeDeps();
      const res = await scaffoldPresetIntent({
        merchantId: "m1",
        preset,
        intentKey: seed.intentKey,
        deps,
      });
      expect(res.ok).toBe(true);
      expect(deps.createCustomDataIntent).toHaveBeenCalledTimes(1);
      const arg = deps.createCustomDataIntent.mock.calls[0][0];
      expect(arg.sourceId).toBe(baseSource.id);
      expect(arg.intentKey).toBe(seed.intentKey);
      expect(arg.endpointPath).toBe(seed.endpointPath);
      expect(arg.httpMethod).toBe(seed.httpMethod);
    }
  );
});
