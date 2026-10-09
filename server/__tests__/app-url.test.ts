// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getConfiguredAppUrl } from "../appUrl";

describe("deployment URL", () => {
  it("uses the configured origin on Railway instead of request or source domains", () => {
    expect(getConfiguredAppUrl({ APP_URL: "https://validation.example.com/", RAILWAY_PROJECT_ID: "target", REPLIT_DEV_DOMAIN: "source.example.com" })).toBe("https://validation.example.com");
  });
  it("allows a local URL with an explicit port for development", () => {
    expect(getConfiguredAppUrl({ APP_URL: "http://localhost:5000/" })).toBe("http://localhost:5000");
  });
  it("leaves source defaults to callers when APP_URL is absent outside Railway", () => {
    expect(getConfiguredAppUrl({ REPLIT_DEPLOYMENT_ID: "source" })).toBeUndefined();
  });
  it("requires a destination URL on Railway", () => {
    expect(() => getConfiguredAppUrl({ RAILWAY_PROJECT_ID: "target" })).toThrow(/APP_URL is required/);
  });
  it("rejects malformed, non-HTTP and credential-bearing URLs without disclosing the input", () => {
    for (const value of ["invalid-secret", "javascript:secret", "https://user:secret@example.com"]) {
      try { getConfiguredAppUrl({ APP_URL: value }); throw new Error("accepted"); }
      catch (error) {
        expect((error as Error).message).toMatch(/APP_URL/);
        expect((error as Error).message).not.toContain("secret");
      }
    }
  });
});
