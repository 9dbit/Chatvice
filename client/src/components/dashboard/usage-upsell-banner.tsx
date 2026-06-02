import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Sparkles, ArrowRight, Zap } from "lucide-react";
import { TopUpQuotaDialog } from "./topup-quota-dialog";

interface BillingStatus {
  planId: string;
  planName: string;
  conversationsUsed: number;
  conversationsLimit: number;
}

interface PlanInfo {
  id: string;
  name: string;
  monthlyPriceIdr?: number;
  conversationsLimit: number;
  overageRateIdr?: number;
}

const NEXT_PLAN: Record<string, string> = {
  free: "starter",
  starter: "pro",
  pro: "enterprise",
  enterprise: "custom",
};

function formatIdr(n: number): string {
  if (!n) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function UsageUpsellBanner() {
  const [topupOpen, setTopupOpen] = useState(false);
  const { data: billingStatus } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
  });
  const { data: plans = [] } = useQuery<PlanInfo[]>({
    queryKey: ["/api/subscription-plans"],
  });

  if (!billingStatus || !(plans ?? []).length) return null;
  const { planId, conversationsUsed, conversationsLimit } = billingStatus;
  if (!conversationsLimit || conversationsLimit === -1) return null;

  const usagePct = (conversationsUsed / conversationsLimit) * 100;
  if (usagePct < 80) return null;

  const currentPlan = plans.find((p) => p.id === planId);
  const nextPlanId = NEXT_PLAN[planId];
  const nextPlan = nextPlanId ? plans.find((p) => p.id === nextPlanId) : null;

  const isCritical = usagePct >= 90;
  const overageRate = currentPlan?.overageRateIdr || 0;
  const overConversations = Math.max(0, conversationsUsed - conversationsLimit);
  const overageCost = overConversations * overageRate;

  // Savings calculation: if user upgrades, how much they save vs. paying overage
  // at the projected end-of-month volume.
  const projectionMultiplier = isCritical ? 1.15 : 1.05;
  const projectedConversations = Math.round(conversationsUsed * projectionMultiplier);
  const projectedOverConversations = Math.max(0, projectedConversations - conversationsLimit);
  const projectedOverageCost = projectedOverConversations * overageRate;
  const upgradePrice = nextPlan?.monthlyPriceIdr || 0;
  const upgradeDelta = upgradePrice - (currentPlan?.monthlyPriceIdr || 0);
  const savingsIfUpgrade = projectedOverageCost - upgradeDelta;

  return (
    <Card
      className={`p-5 border-2 ${isCritical
        ? "border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
        : "border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20"
      }`}
      data-testid="banner-usage-upsell"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className={`shrink-0 w-12 h-12 rounded-md flex items-center justify-center ${isCritical
          ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
          : "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
        }`}>
          {isCritical ? <AlertTriangle className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-base" data-testid="text-upsell-title">
              {isCritical
                ? `Kuota hampir habis — ${Math.round(usagePct)}% terpakai`
                : `Penggunaan tinggi — ${Math.round(usagePct)}% kuota`}
            </h3>
            <Badge variant={isCritical ? "destructive" : "secondary"} className="text-xs">
              {conversationsUsed.toLocaleString("id-ID")} / {conversationsLimit.toLocaleString("id-ID")}
            </Badge>
          </div>

          {isCritical && nextPlan && savingsIfUpgrade > 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-savings-pitch">
              Upgrade ke <span className="font-medium text-foreground">{nextPlan.name}</span> sekarang dan
              {" "}<span className="font-semibold text-emerald-600 dark:text-emerald-400">hemat {formatIdr(savingsIfUpgrade)}</span>
              {" "}di akhir bulan vs bayar overage{overageRate > 0 ? ` Rp ${overageRate}/conversation` : ""}.
            </p>
          ) : isCritical ? (
            <p className="text-sm text-muted-foreground">
              Anda akan dikenakan biaya overage {overageRate > 0 ? `${formatIdr(overageRate)} per conversation tambahan` : "saat kuota habis"}.
              {overageCost > 0 ? ` Saat ini sudah Rp ${overageCost.toLocaleString("id-ID")} biaya tambahan.` : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pertimbangkan upgrade {nextPlan ? `ke ${nextPlan.name}` : "plan"} sebelum kuota habis untuk menghindari biaya overage.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0">
          {nextPlan && (
            <Link href="/dashboard/billing-details">
              <Button
                size="sm"
                className={isCritical ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                data-testid="button-upgrade-now"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Upgrade ke {nextPlan.name}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          )}
          {planId !== "free" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTopupOpen(true)}
              data-testid="button-topup-quota"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Top-up percakapan
            </Button>
          )}
          <Link href="/pricing">
            <Button size="sm" variant="ghost" data-testid="button-view-plans">
              Lihat plan
            </Button>
          </Link>
        </div>
      </div>
      <TopUpQuotaDialog open={topupOpen} onOpenChange={setTopupOpen} />
    </Card>
  );
}
