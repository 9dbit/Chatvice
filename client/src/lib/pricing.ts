export const KURS_IDR_PER_USD = 17500;

export type Currency = "IDR" | "USD";

export interface PlanPricing {
  id: string;
  name: string;
  monthlyPriceIdr: number;
  annualPriceIdr: number;
  overageRateIdr: number;
  conversationsLimit: number;
  agentsLimit?: number;
  supervisorsLimit?: number;
  sourcesLimit?: number;
}

export const NEXT_PLAN_ID: Record<string, string> = {
  free: "starter",
  starter: "pro",
  pro: "enterprise",
  enterprise: "custom",
};

// Canonical 4-tier IDR pricing dataset. UI fallbacks live here so any
// surface (landing, /pricing, dashboard) renders consistent numbers
// when the DB-backed plan list has not loaded yet. DB overrides take
// precedence — these are baseline defaults that match shared/schema.ts.
export const CANONICAL_TIERS: PlanPricing[] = [
  { id: "free", name: "Free", monthlyPriceIdr: 0, annualPriceIdr: 0, overageRateIdr: 0, conversationsLimit: 50 },
  { id: "starter", name: "Starter", monthlyPriceIdr: 299_000, annualPriceIdr: 2_990_000, overageRateIdr: 250, conversationsLimit: 2_000 },
  { id: "pro", name: "Pro", monthlyPriceIdr: 899_000, annualPriceIdr: 8_990_000, overageRateIdr: 200, conversationsLimit: 8_000 },
  { id: "enterprise", name: "Business", monthlyPriceIdr: 2_299_000, annualPriceIdr: 22_990_000, overageRateIdr: 150, conversationsLimit: 25_000 },
  { id: "custom", name: "Enterprise", monthlyPriceIdr: 8_499_000, annualPriceIdr: 76_491_000, overageRateIdr: 100, conversationsLimit: 120_000 },
];

export function getCanonicalTier(planId: string): PlanPricing | undefined {
  return CANONICAL_TIERS.find((t) => t.id === planId);
}

// Estimate top-up cost for a given quantity using a plan's overage rate
// plus the official 0/10/20% bundle discount tiers.
export function estimateTopUpIdr(qty: number, overageRateIdr: number): number {
  const discount = qty >= 5000 ? 0.20 : qty >= 1500 ? 0.10 : 0;
  return Math.round(qty * overageRateIdr * (1 - discount));
}

export function formatIdr(n: number | null | undefined): string {
  if (!n || n <= 0) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function formatPriceIdr(idr: number, currency: Currency): string {
  if (currency === "IDR") return formatIdr(idr);
  if (idr === 0) return "$0";
  const usd = idr / KURS_IDR_PER_USD;
  return usd >= 10 ? `$${Math.round(usd).toLocaleString("en-US")}` : `$${usd.toFixed(2)}`;
}

export interface TopUpPack {
  id: string;
  conversations: number;
  priceIdr: number;
  label: string;
  badge?: string;
}

export const TOPUP_PACKS: TopUpPack[] = [
  { id: "small", conversations: 500, priceIdr: 100_000, label: "500 percakapan" },
  { id: "medium", conversations: 1500, priceIdr: 270_000, label: "1.500 percakapan", badge: "Hemat 10%" },
  { id: "large", conversations: 5000, priceIdr: 800_000, label: "5.000 percakapan", badge: "Hemat 20%" },
];

// Re-export the canonical Custom Plan calculator helpers (live in shared/
// so server-side checkout can re-validate the same numbers).
export {
  CUSTOM_PLAN_BASELINE,
  CUSTOM_PLAN_LIMITS,
  CUSTOM_PLAN_MARKUP,
  calculateCustomPlanPrice,
  normalizeCustomPlanConfig,
} from "@shared/customPlanPricing";
export type {
  CustomPlanConfig,
  CustomPlanBreakdown,
} from "@shared/customPlanPricing";

export function planDisplayName(planId: string, fallback?: string): string {
  const map: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    enterprise: "Business",
    custom: "Enterprise",
  };
  return map[planId] || fallback || planId;
}
