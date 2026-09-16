import type { Express, RequestHandler } from "express";
import { subscriptionPlans } from "@shared/schema";

export const PLAN_LIMIT_LABELS = {
  conversationsLimit: "Conversations/Month",
  agentsLimit: "AI Agents",
  supervisorsLimit: "Supervisors",
  sourcesLimit: "Knowledge Sources",
  suggestedQuestionsLimit: "Suggested Questions",
  domainsLimit: "Allowed Domains",
  chatRetentionHours: "Chat History",
  bgRemovalLimit: "BG Removal/Month",
} as const;

const PRICE_FIELD_LABELS = {
  monthlyPrice: "Monthly Price",
  annualPrice: "Annual Price",
  monthlyPriceIdr: "Monthly Price (Rp)",
  annualPriceIdr: "Annual Price (Rp)",
  overageRateIdr: "Overage Rate",
} as const;

const editableFields = [...Object.keys(PRICE_FIELD_LABELS), ...Object.keys(PLAN_LIMIT_LABELS)] as const;

type PlanStorage = {
  getPlatformSetting(key: string): Promise<string | null | undefined>;
  setPlatformSetting(key: string, value: string): Promise<unknown>;
};

type Dependencies = {
  requireAdmin: RequestHandler;
  storage: PlanStorage;
  getAllEffectiveSubscriptionPlans: () => Promise<unknown[]>;
  clearPlanCache: () => void;
  getCached: (key: string) => unknown | null;
  setCache: (key: string, data: unknown, ttlSeconds: number) => void;
  invalidateCache: (keyPrefix: string) => void;
};

function validationError(body: Record<string, unknown>): string | null {
  for (const [field, label] of Object.entries(PRICE_FIELD_LABELS)) {
    const value = body[field];
    if (value !== undefined && (!Number.isInteger(value) || (value as number) < 0)) {
      return `${label} must be a whole number of 0 or greater.`;
    }
  }
  for (const [field, label] of Object.entries(PLAN_LIMIT_LABELS)) {
    const value = body[field];
    if (value !== undefined && (!Number.isInteger(value) || (value as number) < -1)) {
      return `${label} must be -1 (unlimited) or a whole number of 0 or greater.`;
    }
  }
  return null;
}

export function registerSubscriptionPlanRoutes(app: Express, deps: Dependencies): void {
  app.get("/api/subscription-plans", async (_req, res) => {
    try {
      const cached = deps.getCached("subscription-plans");
      if (cached) return res.json(cached);
      const plans = await deps.getAllEffectiveSubscriptionPlans();
      deps.setCache("subscription-plans", plans, 300);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/admin/subscription-plans/:planId", deps.requireAdmin, async (req, res) => {
    try {
      const { planId } = req.params;
      const defaultPlan = subscriptionPlans[planId as keyof typeof subscriptionPlans];
      if (!defaultPlan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const error = validationError(req.body);
      if (error) return res.status(400).json({ error });

      const customPlansJson = await deps.storage.getPlatformSetting("subscription_plans_custom") || "{}";
      let customOverrides: Record<string, Record<string, unknown>> = {};
      try {
        customOverrides = JSON.parse(customPlansJson);
      } catch {
        customOverrides = {};
      }

      const nextOverride = { ...(customOverrides[planId] || {}) };
      for (const field of editableFields) {
        if (req.body[field] !== undefined) nextOverride[field] = req.body[field];
      }
      customOverrides[planId] = nextOverride;
      await deps.storage.setPlatformSetting("subscription_plans_custom", JSON.stringify(customOverrides));

      deps.clearPlanCache();
      deps.invalidateCache("subscription-plans");

      res.json({
        success: true,
        plan: { ...defaultPlan, id: planId, ...nextOverride },
      });
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
}