// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { send, construct } = vi.hoisted(() => ({ send: vi.fn(), construct: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
    constructor(key: string) { construct(key); }
  },
}));
import { getEmailBaseUrl, getUncachableResendClient, sendVerificationEmail, sendPasswordResetEmail } from "../resendClient";

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "REPLIT_CONNECTORS_HOSTNAME", "REPL_IDENTITY", "WEB_REPL_RENEWAL", "APP_URL", "RAILWAY_PROJECT_ID", "REPLIT_DEPLOYMENT_ID", "REPLIT_DEV_DOMAIN"]) {
    vi.stubEnv(key, "");
  }
  send.mockResolvedValue({ error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("portable email", () => {
  it("uses direct Resend credentials without contacting the Replit connector", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "Chatvice <mail@example.com>");
    const fetch = vi.spyOn(globalThis, "fetch");
    const result = await getUncachableResendClient();
    expect(construct).toHaveBeenCalledWith("test-key");
    expect(result.fromEmail).toBe("Chatvice <mail@example.com>");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves the Replit connector fallback", async () => {
    vi.stubEnv("REPLIT_CONNECTORS_HOSTNAME", "connector.example.com");
    vi.stubEnv("REPL_IDENTITY", "test-token");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      items: [{ settings: { api_key: "connector-key", from_email: "sender@example.com" } }],
    })));
    const result = await getUncachableResendClient();
    expect(construct).toHaveBeenCalledWith("connector-key");
    expect(result.fromEmail).toBe("sender@example.com");
    expect(fetch).toHaveBeenCalledWith("https://connector.example.com/api/v2/connection?include_secrets=true&connector_names=resend", {
      headers: { Accept: "application/json", "X_REPLIT_TOKEN": "repl test-token" },
    });
  });

  it("fails clearly without credentials", async () => {
    await expect(getUncachableResendClient()).rejects.toThrow(/RESEND_API_KEY/);
  });

  it("creates verification and reset links on the configured validation domain", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RAILWAY_PROJECT_ID", "validation");
    vi.stubEnv("APP_URL", "https://validation.example.com/");
    expect(await sendVerificationEmail("user@example.com", "verify-token", "Tester")).toBe(true);
    expect(send.mock.calls[0][0].html).toContain("https://validation.example.com/verify-email?token=verify-token");
    expect(await sendPasswordResetEmail("user@example.com", "reset-token", "Tester")).toBe(true);
    expect(send.mock.calls[1][0].html).toContain("https://validation.example.com/reset-password?token=reset-token");
  });

  it("requires APP_URL on Railway and rejects unsafe URLs", () => {
    vi.stubEnv("RAILWAY_PROJECT_ID", "validation");
    expect(() => getEmailBaseUrl()).toThrow(/APP_URL/);
    vi.stubEnv("APP_URL", "javascript:alert(1)");
    expect(() => getEmailBaseUrl()).toThrow(/HTTP/);
    vi.stubEnv("APP_URL", "https://user:secret@example.com");
    expect(() => getEmailBaseUrl()).toThrow(/credentials/);
  });

  it("retains existing Replit production, development and local defaults", () => {
    expect(getEmailBaseUrl()).toBe("http://localhost:5000");
    vi.stubEnv("REPLIT_DEV_DOMAIN", "dev.example.com");
    expect(getEmailBaseUrl()).toBe("https://dev.example.com");
    vi.stubEnv("REPLIT_DEPLOYMENT_ID", "production");
    expect(getEmailBaseUrl()).toBe("https://chatvice.app");
  });
});
