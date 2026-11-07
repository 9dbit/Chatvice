import { describe, it, expect } from "vitest";
import { openAIOptions, geminiOptions } from "../aiConfig";
import { mediaDirectory } from "../mediaPaths";

describe("migration configuration", () => {
  it("never sends direct keys to a configured Replit proxy", () => {
    expect(openAIOptions({ OPENAI_API_KEY: "direct", AI_INTEGRATIONS_OPENAI_BASE_URL: "https://proxy.invalid" })).toEqual({ apiKey: "direct" });
    expect(geminiOptions({ GEMINI_API_KEY: "direct", AI_INTEGRATIONS_GEMINI_BASE_URL: "https://proxy.invalid" })).toEqual({ apiKey: "direct" });
  });
  it("rejects proxy-only credentials on Railway", () => {
    expect(() => openAIOptions({ RAILWAY_PROJECT_ID: "p", AI_INTEGRATIONS_OPENAI_API_KEY: "proxy" })).toThrow("OPENAI_API_KEY");
    expect(() => geminiOptions({ RAILWAY_PROJECT_ID: "p", AI_INTEGRATIONS_GEMINI_API_KEY: "proxy" })).toThrow("GEMINI_API_KEY");
  });
  it("preserves the Replit configuration off Railway", () => {
    expect(openAIOptions({ AI_INTEGRATIONS_OPENAI_API_KEY: "proxy", AI_INTEGRATIONS_OPENAI_BASE_URL: "https://proxy.invalid" })).toEqual({ apiKey: "proxy", baseURL: "https://proxy.invalid" });
  });
  it("resolves both local writes and static reads against the persistent root", () => {
    expect(mediaDirectory("uploads", { MEDIA_ROOT: "/data" })).toBe("/data/uploads");
    expect(mediaDirectory("exports", { MEDIA_ROOT: "/data" })).toBe("/data/exports");
    expect(mediaDirectory("uploads", {})).toBe(`${process.cwd()}/uploads`);
  });
});
