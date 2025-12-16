import { storage } from './storage';
import { subscriptionPlans, type SubscriptionPlanId } from '@shared/schema';

export interface EffectiveSubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  conversationsLimit: number;
  agentsLimit: number;
  supervisorsLimit: number;
  sourcesLimit: number;
  suggestedQuestionsLimit: number;
  features: readonly string[];
  restrictions?: readonly string[];
}

let cachedPlanOverrides: Record<string, any> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000;

async function getPlanOverridesFromDB(): Promise<Record<string, any>> {
  const now = Date.now();
  if (cachedPlanOverrides && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedPlanOverrides;
  }
  
  try {
    const customPlansJson = await storage.getPlatformSetting("subscription_plans_custom") || "{}";
    cachedPlanOverrides = JSON.parse(customPlansJson);
    cacheTimestamp = now;
    return cachedPlanOverrides ?? {};
  } catch {
    return {};
  }
}

export async function getEffectiveSubscriptionPlan(planId: string): Promise<EffectiveSubscriptionPlan | null> {
  const basePlan = subscriptionPlans[planId as keyof typeof subscriptionPlans];
  if (!basePlan) return null;
  
  const customOverrides = await getPlanOverridesFromDB();
  const overrides = customOverrides[planId] || {};
  
  return {
    ...basePlan,
    id: planId,
    monthlyPrice: overrides.monthlyPrice !== undefined ? overrides.monthlyPrice : basePlan.monthlyPrice,
    annualPrice: overrides.annualPrice !== undefined ? overrides.annualPrice : basePlan.annualPrice,
    conversationsLimit: overrides.conversationsLimit !== undefined ? overrides.conversationsLimit : basePlan.conversationsLimit,
    agentsLimit: overrides.agentsLimit !== undefined ? overrides.agentsLimit : basePlan.agentsLimit,
    supervisorsLimit: overrides.supervisorsLimit !== undefined ? overrides.supervisorsLimit : basePlan.supervisorsLimit,
    sourcesLimit: overrides.sourcesLimit !== undefined ? overrides.sourcesLimit : basePlan.sourcesLimit,
    suggestedQuestionsLimit: overrides.suggestedQuestionsLimit !== undefined ? overrides.suggestedQuestionsLimit : basePlan.suggestedQuestionsLimit,
  };
}

export async function getAllEffectiveSubscriptionPlans(): Promise<EffectiveSubscriptionPlan[]> {
  const planIds = Object.keys(subscriptionPlans) as SubscriptionPlanId[];
  const plans: EffectiveSubscriptionPlan[] = [];
  
  for (const planId of planIds) {
    const plan = await getEffectiveSubscriptionPlan(planId);
    if (plan) {
      plans.push(plan);
    }
  }
  
  return plans;
}

export function clearPlanCache(): void {
  cachedPlanOverrides = null;
  cacheTimestamp = 0;
}
