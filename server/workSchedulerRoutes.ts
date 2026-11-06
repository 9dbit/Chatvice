import type { Express, RequestHandler } from "express";
import type { storage as productionStorage } from "./storage";
import { z } from "zod";

const shiftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dayType: z.enum(["everyday", "weekday", "weekend", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]).default("weekday"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  isNightShift: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).strict();
const assignmentSchema = z.object({ shiftId: z.string().min(1), assigneeId: z.string().min(1), assigneeType: z.enum(["agent", "supervisor"]) }).strict();
const reportSchema = z.object({
  assigneeId: z.string().min(1), assigneeType: z.enum(["agent", "supervisor"]),
  date: z.coerce.date(), clockIn: z.coerce.date().nullable().optional(), clockOut: z.coerce.date().nullable().optional(),
  hoursWorked: z.number().int().nonnegative().default(0), minutesWorked: z.number().int().nonnegative().default(0),
  status: z.enum(["pending", "completed", "absent", "late", "in_progress"]).default("pending"),
}).strict();

type SchedulerStorage = Pick<typeof productionStorage, "getMerchant" | "updateMerchant" | "getAgent" | "getSupervisor" | "getWorkShifts" | "getWorkShift" | "createWorkShift" | "updateWorkShift" | "deleteWorkShift" | "getShiftAssignments" | "createShiftAssignment" | "deleteShiftAssignment" | "getWorkReports" | "createWorkReport" | "updateWorkReport">;
export function registerWorkSchedulerRoutes(app: Express, { storage, requireMerchant }: { storage: SchedulerStorage; requireMerchant: RequestHandler }) {
  const ownsAssignee = async (merchantId: string, id: string, type: string) => {
    const assignee = type === "agent" ? await storage.getAgent(id) : await storage.getSupervisor(id);
    return assignee?.merchantId === merchantId;
  };
  // ============== WORK SCHEDULER ROUTES ==============

  // Get merchant work timezone
  app.get("/api/work-scheduler/timezone", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      res.json({ timezone: merchant?.workTimezone || "Asia/Jakarta" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update merchant work timezone
  app.patch("/api/work-scheduler/timezone", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { timezone } = req.body;
      if (!timezone || typeof timezone !== "string") {
        return res.status(400).json({ error: "Invalid timezone" });
      }
      try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); }
      catch { return res.status(400).json({ error: "Invalid timezone" }); }
      await storage.updateMerchant(merchantId, { workTimezone: timezone });
      res.json({ success: true, timezone });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Get all shifts for merchant
  app.get("/api/work-scheduler/shifts", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const shifts = await storage.getWorkShifts(merchantId);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create shift
  app.post("/api/work-scheduler/shifts", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const parsed = shiftSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid shift", details: parsed.error.flatten() });
      const shift = await storage.createWorkShift({ merchantId, ...parsed.data });
      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update shift
  app.patch("/api/work-scheduler/shifts/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      const current = await storage.getWorkShift(id);
      if (!current || current.merchantId !== req.session.merchantId) return res.status(404).json({ error: "Shift not found" });
      const parsed = shiftSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid shift", details: parsed.error.flatten() });
      const shift = await storage.updateWorkShift(id, parsed.data);
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete shift
  app.delete("/api/work-scheduler/shifts/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      const current = await storage.getWorkShift(id);
      if (!current || current.merchantId !== req.session.merchantId) return res.status(404).json({ error: "Shift not found" });
      await storage.deleteWorkShift(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get shift assignments
  app.get("/api/work-scheduler/assignments", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const assignments = await storage.getShiftAssignments(merchantId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create shift assignment
  app.post("/api/work-scheduler/assignments", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const parsed = assignmentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid shift assignment" });
      const { shiftId, assigneeId, assigneeType } = parsed.data;
      const shift = await storage.getWorkShift(shiftId);
      if (!shift || shift.merchantId !== merchantId || !await ownsAssignee(merchantId, assigneeId, assigneeType)) {
        return res.status(404).json({ error: "Shift or assignee not found" });
      }
      const assignments = await storage.getShiftAssignments(merchantId);
      if (assignments.some(a => a.shiftId === shiftId && a.assigneeId === assigneeId && a.assigneeType === assigneeType)) {
        return res.status(409).json({ error: "This assignee already has this shift" });
      }
      const assignment = await storage.createShiftAssignment({ merchantId, ...parsed.data });
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete shift assignment
  app.delete("/api/work-scheduler/assignments/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      const assignments = await storage.getShiftAssignments(req.session.merchantId!);
      if (!assignments.some(a => a.id === id)) return res.status(404).json({ error: "Assignment not found" });
      await storage.deleteShiftAssignment(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get work reports
  app.get("/api/work-scheduler/reports", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const reports = await storage.getWorkReports(merchantId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create work report
  app.post("/api/work-scheduler/reports", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid report", details: parsed.error.flatten() });
      if (!await ownsAssignee(merchantId, parsed.data.assigneeId, parsed.data.assigneeType)) return res.status(404).json({ error: "Assignee not found" });
      const report = await storage.createWorkReport({ merchantId, ...parsed.data });
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update work report
  app.patch("/api/work-scheduler/reports/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      const merchantId = req.session.merchantId!;
      const reports = await storage.getWorkReports(merchantId);
      const current = reports.find(r => r.id === id);
      if (!current) return res.status(404).json({ error: "Report not found" });
      const parsed = reportSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid report", details: parsed.error.flatten() });
      if (!await ownsAssignee(merchantId, parsed.data.assigneeId ?? current.assigneeId, parsed.data.assigneeType ?? current.assigneeType)) return res.status(404).json({ error: "Assignee not found" });
      const report = await storage.updateWorkReport(id, parsed.data);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

}
