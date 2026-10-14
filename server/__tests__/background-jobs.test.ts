// @vitest-environment node
import { describe, expect, it } from "vitest";
import { backgroundJobsEnabled } from "../backgroundJobs";

describe("background job ownership during Railway migration", () => {
  it("keeps the existing Replit worker active without extra configuration", () => {
    expect(backgroundJobsEnabled({ REPLIT_DEPLOYMENT_ID: "old-production" })).toBe(true);
  });
  it("does not run jobs in a newly deployed Railway preview", () => {
    expect(backgroundJobsEnabled({ RAILWAY_PROJECT_ID: "chatvice" })).toBe(false);
  });
  it("requires explicit opt-in to activate the Railway worker after cutover", () => {
    expect(backgroundJobsEnabled({ RAILWAY_PROJECT_ID: "chatvice", ENABLE_BACKGROUND_JOBS: "true" })).toBe(true);
  });
  it("fails closed for false or malformed explicit settings on either host", () => {
    for (const value of ["false", "", "1", "yes", "tru"]) {
      expect(backgroundJobsEnabled({ ENABLE_BACKGROUND_JOBS: value })).toBe(false);
      expect(backgroundJobsEnabled({ RAILWAY_PROJECT_ID: "chatvice", ENABLE_BACKGROUND_JOBS: value })).toBe(false);
    }
  });
});
