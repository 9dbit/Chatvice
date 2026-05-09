import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateBaseUrl, renderTemplate, summarizeForCustomer, encryptApiKey, decryptApiKey, generateApiKey, executeIntentLookup } from "../customConnector";
import type { CustomDataSource, CustomDataIntent } from "@shared/schema";

vi.mock("../storage", () => ({
  storage: {
    createCustomDataAuditLog: vi.fn(async () => ({ id: "cda_test" })),
    getCustomDataIntent: vi.fn(),
  },
}));

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

const baseIntent: CustomDataIntent = {
  id: "cdi_1",
  sourceId: "cds_1",
  intentKey: "deposit_status",
  name: "Cek Status Deposit",
  description: "",
  triggerKeywords: "deposit",
  httpMethod: "GET",
  endpointPath: "/api/deposit/{username}",
  requiredFields: [{ key: "username", label: "Username", type: "text", required: true }] as any,
  responseTemplate: "Status deposit Anda: {status}",
  isEnabled: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("validateBaseUrl", () => {
  it("rejects empty", () => {
    expect(validateBaseUrl("").ok).toBe(false);
  });
  it("rejects non-http schemes", () => {
    expect(validateBaseUrl("ftp://example.com").ok).toBe(false);
  });
  it("rejects loopback", () => {
    expect(validateBaseUrl("http://127.0.0.1/x").ok).toBe(false);
    expect(validateBaseUrl("http://localhost/x").ok).toBe(false);
  });
  it("rejects RFC1918 ranges", () => {
    expect(validateBaseUrl("http://10.0.0.1/").ok).toBe(false);
    expect(validateBaseUrl("http://192.168.1.1/").ok).toBe(false);
    expect(validateBaseUrl("http://172.16.0.1/").ok).toBe(false);
  });
  it("rejects cloud metadata host", () => {
    expect(validateBaseUrl("http://169.254.169.254/").ok).toBe(false);
    expect(validateBaseUrl("http://metadata.google.internal/").ok).toBe(false);
  });
  it("accepts public https URL", () => {
    expect(validateBaseUrl("https://api.merchant.example.com/v1").ok).toBe(true);
  });
});

describe("renderTemplate / summarizeForCustomer", () => {
  it("substitutes simple keys", () => {
    expect(renderTemplate("Hi {name}", { name: "Andi" })).toBe("Hi Andi");
  });
  it("falls back when key missing", () => {
    expect(renderTemplate("Hi {name}", {})).toContain("tidak diketahui");
  });
  it("never emits raw JSON when template is empty", () => {
    const out = renderTemplate("", { status: "OK", amount: 50000 });
    expect(out).not.toContain("{\"");
    expect(out).toContain("Status: OK");
    expect(out).toContain("Amount: 50000");
  });
  it("summarizes arrays", () => {
    const out = summarizeForCustomer([{ a: 1 }, { a: 2 }]);
    expect(out).toContain("1.");
    expect(out).toContain("2.");
  });
});

describe("encryptApiKey / decryptApiKey", () => {
  beforeEach(() => {
    process.env.CUSTOM_DATA_ENC_KEY = "test-enc-key-1234567890";
  });
  it("round-trips a generated key", () => {
    const k = generateApiKey();
    const enc = encryptApiKey(k);
    expect(enc).not.toContain(k);
    expect(decryptApiKey(enc)).toBe(k);
  });
  it("returns falsy on null/empty input", () => {
    expect(decryptApiKey(null)).toBeFalsy();
    expect(decryptApiKey("")).toBeFalsy();
  });
  it("returns falsy on tampered ciphertext", () => {
    const enc = encryptApiKey("abc");
    expect(decryptApiKey(enc.slice(0, -2) + "00")).toBeFalsy();
  });
});

describe("executeIntentLookup failure modes", () => {
  beforeEach(() => {
    process.env.CUSTOM_DATA_ENC_KEY = "test-enc-key-1234567890";
    vi.restoreAllMocks();
  });
  it("rejects when required fields are missing", async () => {
    const res = await executeIntentLookup({
      merchantId: "m1",
      source: baseSource,
      intent: baseIntent,
      fields: {},
      sessionId: "s1",
    });
    expect(res.ok).toBe(false);
    expect(res.errorMessage).toContain("Missing required fields");
  });
  it("rejects when number-type field has non-numeric value", async () => {
    const intent = { ...baseIntent, requiredFields: [{ key: "amount", label: "Jumlah", type: "number", required: true }] as any };
    const res = await executeIntentLookup({
      merchantId: "m1",
      source: baseSource,
      intent,
      fields: { amount: "abc" },
      sessionId: "s1",
    });
    expect(res.ok).toBe(false);
    expect(res.errorMessage).toContain("invalid");
  });
  it("rejects when base URL points to private IP", async () => {
    const src = { ...baseSource, baseUrl: "http://10.0.0.1" };
    const res = await executeIntentLookup({
      merchantId: "m1",
      source: src,
      intent: baseIntent,
      fields: { username: "andi" },
      sessionId: "s1",
    });
    expect(res.ok).toBe(false);
  });
  it("returns failure on non-2xx panel response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }) as any);
    const res = await executeIntentLookup({
      merchantId: "m1",
      source: baseSource,
      intent: baseIntent,
      fields: { username: "andi" },
      sessionId: "s2",
    });
    expect(res.ok).toBe(false);
    expect(res.httpStatus).toBe(500);
    fetchSpy.mockRestore();
  });
  it("returns failure on malformed JSON body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not json {", { status: 200 }) as any);
    const res = await executeIntentLookup({
      merchantId: "m1",
      source: baseSource,
      intent: baseIntent,
      fields: { username: "andi" },
      sessionId: "s3",
    });
    expect(res.ok).toBe(false);
    fetchSpy.mockRestore();
  });
  it("returns failure on 3xx redirect from panel", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 302, headers: { Location: "http://127.0.0.1/" } }) as any);
    const res = await executeIntentLookup({
      merchantId: "m1",
      source: baseSource,
      intent: baseIntent,
      fields: { username: "andi" },
      sessionId: "s4",
    });
    expect(res.ok).toBe(false);
    expect(res.httpStatus).toBe(302);
    fetchSpy.mockRestore();
  });
  it("returns success and renders template on 2xx JSON", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: "APPROVED" }), { status: 200 }) as any);
    const res = await executeIntentLookup({
      merchantId: "m1",
      source: baseSource,
      intent: baseIntent,
      fields: { username: "andi-success" },
      sessionId: "s5",
    });
    expect(res.ok).toBe(true);
    expect(res.text).toContain("APPROVED");
    fetchSpy.mockRestore();
  });
});
