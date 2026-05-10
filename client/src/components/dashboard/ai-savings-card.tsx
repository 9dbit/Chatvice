import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, PiggyBank, Bot } from "lucide-react";

interface BillingStatus {
  planId: string;
  billingInterval?: string | null;
  monthlyPriceIdr?: number;
  annualPriceIdr?: number;
  conversationsUsed: number;
  conversationsLimit: number;
}

interface AiSavingsResponse {
  monthStart: string;
  aiDeflected: number;
  humanHandled: number;
  totalThisMonth: number;
  supervisorHandleCostIdr: number;
  estimatedSavingsIdr: number;
}

function formatIdr(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(".0", "")} jt`;
  if (abs >= 1_000) return `${sign}Rp ${Math.round(abs / 1_000).toLocaleString("id-ID")} rb`;
  return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
}

export function AiSavingsCard() {
  const { data: billing } = useQuery<BillingStatus>({ queryKey: ["/api/billing/status"] });
  const { data: savings } = useQuery<AiSavingsResponse>({
    queryKey: ["/api/billing/ai-savings"],
  });

  if (!savings) return null;

  const aiDeflected = savings.aiDeflected;
  const totalHandled = savings.totalThisMonth;
  if (totalHandled === 0) return null;

  const supervisorRate = savings.supervisorHandleCostIdr;
  const estimatedSavings = savings.estimatedSavingsIdr; // Month-scoped: aiDeflected × Rp 87,500

  // Plan cost (per month) for ROI display only — does NOT change the headline.
  const isAnnual = billing?.billingInterval === "annual";
  const annualPlanIdr = billing?.annualPriceIdr ?? 0;
  const monthlyPlanIdr = billing?.monthlyPriceIdr ?? 0;
  const planCostMonthly = isAnnual && annualPlanIdr > 0
    ? Math.round(annualPlanIdr / 12)
    : monthlyPlanIdr;

  const netSavings = estimatedSavings - planCostMonthly;
  const roi = planCostMonthly > 0 ? Math.round((netSavings / planCostMonthly) * 100) : null;
  const isPositive = netSavings >= 0;
  const resolutionRate = totalHandled > 0 ? Math.round((aiDeflected / totalHandled) * 100) : 0;

  return (
    <Card
      className={`border-2 bg-gradient-to-br to-transparent ${isPositive
        ? "border-emerald-200 dark:border-emerald-900 from-emerald-50/60 dark:from-emerald-950/30"
        : "border-amber-200 dark:border-amber-900 from-amber-50/60 dark:from-amber-950/30"
      }`}
      data-testid="card-ai-savings"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PiggyBank className={`w-5 h-5 ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`} />
          Estimated Savings This Month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="text-3xl font-bold text-emerald-700 dark:text-emerald-300"
            data-testid="text-estimated-savings"
          >
            {formatIdr(estimatedSavings)}
          </span>
          <span className="text-xs text-muted-foreground">/bulan ini</span>
          {roi !== null && (
            <Badge
              className={`text-xs gap-1 ${isPositive ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}
              data-testid="badge-roi"
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              ROI {roi}%
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="text-muted-foreground flex items-center gap-1">
              <Bot className="w-3 h-3" />
              AI deflected (bulan ini)
            </p>
            <p className="font-medium" data-testid="text-ai-deflected">
              {aiDeflected.toLocaleString("id-ID")} chat
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Tingkat resolusi</p>
            <p className="font-medium" data-testid="text-resolution-rate">
              {resolutionRate}%
            </p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-current/10">
          Estimasi: {formatIdr(supervisorRate)} per chat yang biasanya ditangani supervisor ×
          {" "}{aiDeflected.toLocaleString("id-ID")} chat AI = {formatIdr(estimatedSavings)}.
          {planCostMonthly > 0
            ? ` Setelah biaya plan (${formatIdr(planCostMonthly)}/bulan${isAnnual ? ", dari paket tahunan" : ""}): ${formatIdr(netSavings)}.`
            : " Tidak ada biaya plan (Free)."}
        </p>
      </CardContent>
    </Card>
  );
}
