import { storage } from './storage';
import { subscriptionPlans, type SubscriptionPlanId } from '@shared/schema';

export interface EffectiveSubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyPriceIdr: number;
  annualPriceIdr: number;
  overageRateIdr: number;
  conversationsLimit: number;
  agentsLimit: number;
  supervisorsLimit: number;
  sourcesLimit: number;
  suggestedQuestionsLimit: number;
  supervisorsPerAgentLimit: number;
  domainsLimit: number;
  chatRetentionHours: number;
  bgRemovalLimit: number;
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
  
  const applyOverride = <T>(field: string, defaultVal: T): T => {
    return overrides[field] !== undefined ? overrides[field] : defaultVal;
  };

  return {
    ...basePlan,
    id: planId,
    monthlyPrice: applyOverride('monthlyPrice', basePlan.monthlyPrice),
    annualPrice: applyOverride('annualPrice', basePlan.annualPrice),
    monthlyPriceIdr: applyOverride('monthlyPriceIdr', (basePlan as any).monthlyPriceIdr ?? 0),
    annualPriceIdr: applyOverride('annualPriceIdr', (basePlan as any).annualPriceIdr ?? 0),
    overageRateIdr: applyOverride('overageRateIdr', (basePlan as any).overageRateIdr ?? 0),
    conversationsLimit: applyOverride('conversationsLimit', basePlan.conversationsLimit),
    agentsLimit: applyOverride('agentsLimit', basePlan.agentsLimit),
    supervisorsLimit: applyOverride('supervisorsLimit', basePlan.supervisorsLimit),
    sourcesLimit: applyOverride('sourcesLimit', basePlan.sourcesLimit),
    suggestedQuestionsLimit: applyOverride('suggestedQuestionsLimit', basePlan.suggestedQuestionsLimit),
    supervisorsPerAgentLimit: applyOverride('supervisorsPerAgentLimit', basePlan.supervisorsPerAgentLimit),
    domainsLimit: applyOverride('domainsLimit', basePlan.domainsLimit),
    chatRetentionHours: applyOverride('chatRetentionHours', basePlan.chatRetentionHours),
    bgRemovalLimit: applyOverride('bgRemovalLimit', basePlan.bgRemovalLimit),
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
