import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { registerWorkSchedulerRoutes } from "../workSchedulerRoutes";
import { registerKnowledgeEntryRoutes } from "../knowledgeEntryRoutes";
import { billingPeriodStart, merchantBillingPlan } from "../billingUsage";

const own = { id: "own", merchantId: "m1", assigneeId: "own", assigneeType: "agent" };
const foreign = { id: "foreign", merchantId: "m2" };
function fixture(kind: "scheduler" | "knowledge") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).session = { merchantId: "m1" }; next(); });
  const requireMerchant = (req: any, res: any, next: any) => req.headers["x-deny"] ? res.sendStatus(401) : next();
  let entries: any[] = [{ ...own, name: "Policies", content: "Old policy", agentId: "own", isLinked: false, isActive: true }];
  const storage = {
    getAgent: vi.fn(async (id: string) => id === "own" ? own : foreign),
    getSupervisor: vi.fn(async (id: string) => id === "own" ? own : foreign),
    getMerchant: vi.fn(async () => own), updateMerchant: vi.fn(async () => own),
    getWorkShifts: vi.fn(async () => [own]), getWorkShift: vi.fn(async (id: string) => id === "own" ? own : foreign),
    createWorkShift: vi.fn(async (d: any) => ({ ...d, id: "new" })), updateWorkShift: vi.fn(async (_id: string, d: any) => ({ ...own, ...d })), deleteWorkShift: vi.fn(async () => true),
    getShiftAssignments: vi.fn(async () => [own]), createShiftAssignment: vi.fn(async (d: any) => ({ ...d, id: "new" })), deleteShiftAssignment: vi.fn(async () => true),
    getWorkReports: vi.fn(async () => [own]), createWorkReport: vi.fn(async (d: any) => ({ ...d, id: "new" })), updateWorkReport: vi.fn(async (_id: string, d: any) => ({ ...own, ...d })),
    getKnowledgeEntries: vi.fn(async () => entries), getKnowledgeByAgent: vi.fn(async () => null),
    getKnowledgeEntry: vi.fn(async (id: string) => entries.find(e => e.id === id) ?? foreign),
    getMaxSortOrder: vi.fn(async () => 0), createKnowledgeEntry: vi.fn(async (data: any) => { entries.push(data); return data; }),
    updateKnowledgeEntry: vi.fn(async (id: string, data: any) => { entries = entries.map(e => e.id === id ? { ...e, ...data } : e); return entries.find(e => e.id === id); }),
    getAgents: vi.fn(async () => [own, { id: "other", merchantId: "m1" }]),
    getAllActiveKnowledgeContent: vi.fn(async (_m: string, agentId: string) => entries.filter(e => e.isActive && (e.isLinked || e.agentId === agentId)).map(e => `[${e.name}]\n${e.content}`).join("\n\n")),
    setKnowledge: vi.fn(async () => ({})), deleteKnowledgeEntry: vi.fn(async () => true),
  };
  const processKnowledgeBase = vi.fn(async () => {});
  if (kind === "scheduler") registerWorkSchedulerRoutes(app, { storage: storage as any, requireMerchant });
  else registerKnowledgeEntryRoutes(app, { storage: storage as any, requireMerchant, processKnowledgeBase });
  return { app, storage, processKnowledgeBase };
}

describe("Management merchant boundaries", () => {
  it.each(["patch", "delete"] as const)("rejects %s of another merchant's shift without writing", async method => {
    const { app, storage } = fixture("scheduler");
    await request(app)[method]("/api/work-scheduler/shifts/foreign").send({ name: "Changed" }).expect(404);
    expect(storage.updateWorkShift).not.toHaveBeenCalled(); expect(storage.deleteWorkShift).not.toHaveBeenCalled();
  });
  it("does not allow shifting ownership or IDs through a shift patch", async () => {
    const { app, storage } = fixture("scheduler");
    await request(app).patch("/api/work-scheduler/shifts/own").send({ merchantId: "m2", id: "new" }).expect(400);
    expect(storage.updateWorkShift).not.toHaveBeenCalled();
  });
  it.each([{ shiftId: "foreign", assigneeId: "own", assigneeType: "agent" }, { shiftId: "own", assigneeId: "foreign", assigneeType: "supervisor" }])("rejects foreign shift/assignee %j", async body => {
    const { app, storage } = fixture("scheduler");
    await request(app).post("/api/work-scheduler/assignments").send(body).expect(404);
    expect(storage.createShiftAssignment).not.toHaveBeenCalled();
  });
  it("rejects deletion of foreign assignments and changes to foreign reports", async () => {
    const { app, storage } = fixture("scheduler");
    await request(app).delete("/api/work-scheduler/assignments/foreign").expect(404);
    await request(app).patch("/api/work-scheduler/reports/foreign").send({ status: "completed" }).expect(404);
    expect(storage.deleteShiftAssignment).not.toHaveBeenCalled(); expect(storage.updateWorkReport).not.toHaveBeenCalled();
  });
  it("accepts an owned shift and assignment and rejects a sequential duplicate", async () => {
    const { app, storage } = fixture("scheduler");
    const shift = await request(app).post("/api/work-scheduler/shifts").send({ name: "Evening", dayType: "everyday", startTime: "22:00", endTime: "06:00", isNightShift: true }).expect(200);
    expect(shift.body.merchantId).toBe("m1");
    const body = { shiftId: "own", assigneeId: "own", assigneeType: "agent" };
    await request(app).post("/api/work-scheduler/assignments").send(body).expect(200);
    storage.getShiftAssignments.mockResolvedValueOnce([{ ...own, ...body }] as any);
    await request(app).post("/api/work-scheduler/assignments").send(body).expect(409);
  });
  it("validates time, timezone, assignee type, and report dates before writes", async () => {
    const { app, storage } = fixture("scheduler");
    await request(app).post("/api/work-scheduler/shifts").send({ name: "Day", startTime: "25:99", endTime: "17:00" }).expect(400);
    await request(app).patch("/api/work-scheduler/timezone").send({ timezone: "Not/AZone" }).expect(400);
    await request(app).post("/api/work-scheduler/assignments").send({ shiftId: "own", assigneeId: "own", assigneeType: "admin" }).expect(400);
    await request(app).post("/api/work-scheduler/reports").send({ assigneeId: "own", assigneeType: "agent", date: "invalid" }).expect(400);
    expect(storage.createWorkShift).not.toHaveBeenCalled(); expect(storage.updateMerchant).not.toHaveBeenCalled(); expect(storage.createWorkReport).not.toHaveBeenCalled();
    await request(app).patch("/api/work-scheduler/timezone").send({ timezone: "Asia/Jakarta" }).expect(200);
  });
  it("retains the merchant authentication gate", async () => {
    const { app } = fixture("scheduler");
    await request(app).get("/api/work-scheduler/shifts").set("x-deny", "1").expect(401);
  });
});

describe("Knowledge save and agent assignment", () => {
  it("saves content and name together and updates the fallback used by chat", async () => {
    const { app, storage, processKnowledgeBase } = fixture("knowledge");
    await request(app).post("/api/knowledge-entries/own/save").send({ content: "Support hours: 9–5", name: "Hours" }).expect(200);
    const after = await request(app).get("/api/knowledge-entries?agentId=own").expect(200);
    expect(after.body[0]).toMatchObject({ name: "Hours", content: "Support hours: 9–5" });
    expect(storage.setKnowledge).toHaveBeenCalledWith("m1", "[Hours]\nSupport hours: 9–5", "own");
    expect(storage.setKnowledge).toHaveBeenCalledWith("m1", "", "other");
    expect(processKnowledgeBase).toHaveBeenCalledWith("m1", "[Hours]\nSupport hours: 9–5", "own");
  });
  it("sharing then deactivating removes knowledge from both agents", async () => {
    const { app, storage } = fixture("knowledge");
    await request(app).post("/api/knowledge-entries/own/toggle-link").send({}).expect(200);
    expect(storage.setKnowledge).toHaveBeenCalledWith("m1", "[Policies]\nOld policy", "other");
    storage.setKnowledge.mockClear();
    await request(app).patch("/api/knowledge-entries/own").send({ isActive: false }).expect(200);
    expect(storage.setKnowledge).toHaveBeenCalledWith("m1", "", "own");
    expect(storage.setKnowledge).toHaveBeenCalledWith("m1", "", "other");
  });
  it("rejects foreign agent reads and entry creation", async () => {
    const { app, storage } = fixture("knowledge");
    await request(app).get("/api/knowledge-entries?agentId=foreign").expect(404);
    await request(app).post("/api/knowledge-entries").send({ name: "Test", agentId: "foreign" }).expect(404);
    expect(storage.createKnowledgeEntry).not.toHaveBeenCalled();
  });
  it("cannot unlink shared knowledge into a foreign agent", async () => {
    const { app, storage } = fixture("knowledge");
    await request(app).post("/api/knowledge-entries/own/toggle-link").send({}).expect(200);
    storage.updateKnowledgeEntry.mockClear();
    await request(app).post("/api/knowledge-entries/own/toggle-link").send({ agentId: "foreign" }).expect(404);
    expect(storage.updateKnowledgeEntry).not.toHaveBeenCalled();
  });
  it("rejects malformed content before changing persisted entries", async () => {
    const { app, storage } = fixture("knowledge");
    await request(app).post("/api/knowledge-entries/own/save").send({ content: { bad: true } }).expect(400);
    await request(app).patch("/api/knowledge-entries/own").send({ name: "  " }).expect(400);
    expect(storage.updateKnowledgeEntry).not.toHaveBeenCalled();
  });
  it("updates fallback text even when vector indexing is skipped", async () => {
    const { app, storage, processKnowledgeBase } = fixture("knowledge");
    await request(app).post("/api/knowledge-entries/own/save").send({ content: "New policy", skipEmbeddings: true }).expect(200);
    expect(storage.setKnowledge).toHaveBeenCalledWith("m1", "[Policies]\nNew policy", "own");
    expect(processKnowledgeBase).not.toHaveBeenCalled();
  });
});

describe("Billing period and custom plan display", () => {
  it.each(["annual", "yearly"])("uses twelve months for %s", interval => {
    expect(billingPeriodStart(new Date("2026-11-06T10:00:00Z"), interval).toISOString()).toBe("2025-11-06T10:00:00.000Z");
  });
  it("clamps monthly and leap-year boundaries", () => {
    expect(billingPeriodStart(new Date("2026-03-31T10:00:00Z"), "monthly").toISOString()).toBe("2026-02-28T10:00:00.000Z");
    expect(billingPeriodStart(new Date("2024-02-29T10:00:00Z"), "annual").toISOString()).toBe("2023-02-28T10:00:00.000Z");
  });
  it("preserves zero and unlimited custom limits before boosters are added", () => {
    const plan = { conversationsLimit: 100, agentsLimit: 3, supervisorsLimit: 3, sourcesLimit: 4 } as any;
    const actual = merchantBillingPlan(plan, { subscriptionPlanId: "custom", customConversationsLimit: -1, customAgentsLimit: 0, customSupervisorsLimit: 8 } as any);
    expect(actual).toMatchObject({ conversationsLimit: -1, agentsLimit: 0, supervisorsLimit: 8, sourcesLimit: 4 });
    expect(merchantBillingPlan(plan, { subscriptionPlanId: "starter", customAgentsLimit: 0 } as any)).toBe(plan);
  });
});

describe("Retired payment simulation", () => {
  it("cannot activate a plan or initiate a gateway transaction", async () => {
    const { registerRetiredBillingRoutes } = await import("../billingSafety");
    const app = express(); app.use(express.json());
    const auth = (_req: any, _res: any, next: any) => next();
    registerRetiredBillingRoutes(app, { requireMerchant: auth, requireAdmin: auth });
    for (const path of ["demo-checkout", "demo-payment", "test-twelvepay"]) {
      const response = await request(app).post(`/api/billing/${path}`).send({ planId: "enterprise", transactionId: "fake" }).expect(410);
      expect(response.body.success).not.toBe(true);
      expect(response.body.error).toContain("Simulated billing is unavailable");
    }
  });
});
