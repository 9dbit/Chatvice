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
