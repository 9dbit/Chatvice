import type { Merchant } from "@shared/schema";
import type { EffectiveSubscriptionPlan } from "./subscriptionPlanUtils";

export function merchantBillingPlan(plan: EffectiveSubscriptionPlan, merchant: Merchant): EffectiveSubscriptionPlan {
  if (merchant.subscriptionPlanId !== "custom") return plan;
  return {
    ...plan,
    conversationsLimit: merchant.customConversationsLimit ?? plan.conversationsLimit,
    agentsLimit: merchant.customAgentsLimit ?? plan.agentsLimit,
    supervisorsLimit: merchant.customSupervisorsLimit ?? plan.supervisorsLimit,
    sourcesLimit: merchant.customSourcesLimit ?? plan.sourcesLimit,
    suggestedQuestionsLimit: merchant.customSuggestedQuestionsLimit ?? plan.suggestedQuestionsLimit,
    monthlyPrice: merchant.customMonthlyPrice ?? plan.monthlyPrice,
    annualPrice: merchant.customAnnualPrice ?? plan.annualPrice,
  };
}

export function billingPeriodStart(end: Date, interval: string | null): Date {
  const start = new Date(end);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - (interval === "annual" || interval === "yearly" ? 12 : 1));
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(day, lastDay));
  return start;
}
