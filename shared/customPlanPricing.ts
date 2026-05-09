// Canonical Custom Plan calculator pricing constants.
// Used by both client (live preview) and server (re-validation) so the
// estimated price the merchant sees in the calculator equals the amount
// charged at checkout.

export const CUSTOM_PLAN_BASELINE = {
  conversations: 120_000,
  agents: 25,
  supervisors: 20,
  basePriceIdr: 8_499_000,
} as const;

export const CUSTOM_PLAN_LIMITS = {
  conversationsMin: 120_000,
  conversationsMax: 1_000_000,
  conversationsStep: 10_000,
  agentsMin: 25,
  agentsMax: 200,
  agentsStep: 1,
  supervisorsMin: 20,
  supervisorsMax: 200,
  supervisorsStep: 1,
} as const;

export const CUSTOM_PLAN_MARKUP = {
  perThousandConversationsIdr: 50_000,
  perAgentIdr: 250_000,
  perSupervisorIdr: 175_000,
} as const;

export interface CustomPlanConfig {
  conversations: number;
  agents: number;
  supervisors: number;
  billingInterval?: "monthly" | "annual";
}

export interface CustomPlanBreakdown {
  baseIdr: number;
  conversationsExtraIdr: number;
  agentsExtraIdr: number;
  supervisorsExtraIdr: number;
  monthlyPriceIdr: number;
  annualPriceIdr: number;
  totalIdr: number;
  conversations: number;
  agents: number;
  supervisors: number;
  billingInterval: "monthly" | "annual";
}

function clamp(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(value)) return min;
  const snapped = Math.round(value / step) * step;
  return Math.max(min, Math.min(max, snapped));
}

export function normalizeCustomPlanConfig(input: Partial<CustomPlanConfig>): CustomPlanConfig {
  return {
    conversations: clamp(
      input.conversations ?? CUSTOM_PLAN_BASELINE.conversations,
      CUSTOM_PLAN_LIMITS.conversationsMin,
      CUSTOM_PLAN_LIMITS.conversationsMax,
      CUSTOM_PLAN_LIMITS.conversationsStep,
    ),
    agents: clamp(
      input.agents ?? CUSTOM_PLAN_BASELINE.agents,
      CUSTOM_PLAN_LIMITS.agentsMin,
      CUSTOM_PLAN_LIMITS.agentsMax,
      CUSTOM_PLAN_LIMITS.agentsStep,
    ),
    supervisors: clamp(
      input.supervisors ?? CUSTOM_PLAN_BASELINE.supervisors,
      CUSTOM_PLAN_LIMITS.supervisorsMin,
      CUSTOM_PLAN_LIMITS.supervisorsMax,
      CUSTOM_PLAN_LIMITS.supervisorsStep,
    ),
    billingInterval: input.billingInterval === "annual" ? "annual" : "monthly",
  };
}

export function calculateCustomPlanPrice(input: Partial<CustomPlanConfig>): CustomPlanBreakdown {
  const cfg = normalizeCustomPlanConfig(input);
  const baseIdr = CUSTOM_PLAN_BASELINE.basePriceIdr;

  const extraConv = Math.max(0, cfg.conversations - CUSTOM_PLAN_BASELINE.conversations);
  const conversationsExtraIdr =
    Math.ceil(extraConv / 1000) * CUSTOM_PLAN_MARKUP.perThousandConversationsIdr;

  const extraAgents = Math.max(0, cfg.agents - CUSTOM_PLAN_BASELINE.agents);
  const agentsExtraIdr = extraAgents * CUSTOM_PLAN_MARKUP.perAgentIdr;

  const extraSup = Math.max(0, cfg.supervisors - CUSTOM_PLAN_BASELINE.supervisors);
  const supervisorsExtraIdr = extraSup * CUSTOM_PLAN_MARKUP.perSupervisorIdr;

  const monthlyPriceIdr = baseIdr + conversationsExtraIdr + agentsExtraIdr + supervisorsExtraIdr;
  // 25% annual discount on the monthly equivalent (matches existing tiers)
  const annualPriceIdr = Math.round(monthlyPriceIdr * 0.75) * 12;

  const totalIdr = cfg.billingInterval === "annual" ? annualPriceIdr : monthlyPriceIdr;

  return {
    baseIdr,
    conversationsExtraIdr,
    agentsExtraIdr,
    supervisorsExtraIdr,
    monthlyPriceIdr,
    annualPriceIdr,
    totalIdr,
    conversations: cfg.conversations,
    agents: cfg.agents,
    supervisors: cfg.supervisors,
    billingInterval: cfg.billingInterval ?? "monthly",
  };
}
