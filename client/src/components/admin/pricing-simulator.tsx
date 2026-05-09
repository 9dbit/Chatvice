import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, AlertTriangle, Calculator, Server, Coins } from "lucide-react";

interface CostMonitorRow {
  merchantId: string;
  companyName: string;
  planId: string;
  planName: string;
  conversationsUsed: number;
  conversationsLimit: number;
  estCostIdr: number;
  monthlyRevenueIdr: number;
  grossMarginIdr: number;
  costToRevenueRatio: number | null;
  unprofitable: boolean;
}

interface CostMonitorResponse {
  summary: {
    merchantsTotal: number;
    unprofitableCount: number;
    totalConversations: number;
    totalCostIdr: number;
    totalRevenueIdr: number;
    grossMarginIdr: number;
    marginPct: number;
    costPerConversationIdr: number;
  };
  merchants: CostMonitorRow[];
  faqCache: { size: number; hits: number; misses: number; hitRate: number };
}

interface PlanInfo {
  id: string;
  name: string;
  monthlyPriceIdr?: number;
  conversationsLimit: number;
  overageRateIdr?: number;
}

const fmtIdr = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
const fmtNum = (n: number) => n.toLocaleString("id-ID");

export function PricingSimulator() {
  const { data, isLoading } = useQuery<CostMonitorResponse>({
    queryKey: ["/api/admin/cost-monitor"],
  });
  const { data: plans = [] } = useQuery<PlanInfo[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const [selectedPlanId, setSelectedPlanId] = useState<string>("pro");
  const [costPerConv, setCostPerConv] = useState<number>(79);
  const [usagePct, setUsagePct] = useState<number>(70);

  const plan = plans.find((p) => p.id === selectedPlanId);
  const conversationsAtUsage = plan ? Math.round((plan.conversationsLimit || 0) * (usagePct / 100)) : 0;

  const sim = useMemo(() => {
    if (!plan) return null;
    const revenue = plan.monthlyPriceIdr || 0;
    const baseCost = conversationsAtUsage * costPerConv;
    const margin = revenue - baseCost;
    const ratio = revenue > 0 ? baseCost / revenue : 0;
    const breakEvenConv = costPerConv > 0 ? Math.floor(revenue / costPerConv) : 0;
    const breakEvenPct = (plan.conversationsLimit || 0) > 0
      ? Math.round((breakEvenConv / plan.conversationsLimit) * 100)
      : 0;
    return { revenue, baseCost, margin, ratio, breakEvenConv, breakEvenPct };
  }, [plan, conversationsAtUsage, costPerConv]);

  return (
    <div className="space-y-6" data-testid="pricing-simulator">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            Cost & Profit Simulator
          </CardTitle>
          <CardDescription>
            Modelkan margin per plan dengan asumsi biaya AI per percakapan dan rasio pemakaian kuota.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Plan</Label>
              <select
                className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                data-testid="select-sim-plan"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {fmtIdr(p.monthlyPriceIdr || 0)} / bulan
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Estimasi biaya AI per percakapan (Rp)</Label>
              <Input
                type="number"
                value={costPerConv}
                onChange={(e) => setCostPerConv(parseInt(e.target.value) || 0)}
                className="mt-1"
                data-testid="input-sim-cost"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default Rp 79 (GPT-4.1-mini dengan optimasi prompt-cache + FAQ cache).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Pemakaian kuota</Label>
                <span className="text-sm font-medium">{usagePct}%</span>
              </div>
              <Slider
                value={[usagePct]}
                onValueChange={(v) => setUsagePct(v[0])}
                min={0}
                max={120}
                step={5}
                className="mt-2"
                data-testid="slider-sim-usage"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {fmtNum(conversationsAtUsage)} percakapan dari batas {fmtNum(plan?.conversationsLimit || 0)}
              </p>
            </div>
          </div>

          {sim && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Revenue / bulan</div>
                  <div className="text-lg font-bold mt-1" data-testid="text-sim-revenue">{fmtIdr(sim.revenue)}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Estimasi biaya AI</div>
                  <div className="text-lg font-bold mt-1" data-testid="text-sim-cost">{fmtIdr(sim.baseCost)}</div>
                </Card>
                <Card className={`p-3 ${sim.margin < 0 ? "border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" : "border-emerald-300 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20"}`}>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {sim.margin < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    Gross margin
                  </div>
                  <div className={`text-lg font-bold mt-1 ${sim.margin < 0 ? "text-red-600" : "text-emerald-600"}`} data-testid="text-sim-margin">
                    {fmtIdr(sim.margin)}
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Cost / Revenue</div>
                  <div className="text-lg font-bold mt-1" data-testid="text-sim-ratio">
                    {sim.revenue > 0 ? `${(sim.ratio * 100).toFixed(1)}%` : "—"}
                  </div>
                </Card>
              </div>
              <div className="p-3 rounded-md border bg-muted/30 text-sm">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Break-even
                </div>
                <p className="text-muted-foreground">
                  Plan ini mulai rugi jika pemakaian melewati{" "}
                  <span className="font-semibold text-foreground">{fmtNum(sim.breakEvenConv)}</span> percakapan
                  {plan && plan.conversationsLimit ? ` (${sim.breakEvenPct}% kuota)` : ""}.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-600" />
              Realitas Margin Saat Ini
            </CardTitle>
            <CardDescription>
              Snapshot dari semua merchant aktif berdasarkan asumsi biaya Rp {data.summary.costPerConversationIdr} / percakapan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Total Revenue</div>
                <div className="text-base font-bold mt-1">{fmtIdr(data.summary.totalRevenueIdr)}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Total Cost</div>
                <div className="text-base font-bold mt-1">{fmtIdr(data.summary.totalCostIdr)}</div>
              </Card>
              <Card className={`p-3 ${data.summary.grossMarginIdr < 0 ? "border-red-300 dark:border-red-900" : ""}`}>
                <div className="text-xs text-muted-foreground">Gross Margin</div>
                <div className={`text-base font-bold mt-1 ${data.summary.grossMarginIdr < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmtIdr(data.summary.grossMarginIdr)} ({data.summary.marginPct.toFixed(1)}%)
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Merchant Rugi</div>
                <div className="text-base font-bold mt-1">
                  <Badge variant={data.summary.unprofitableCount > 0 ? "destructive" : "secondary"}>
                    {data.summary.unprofitableCount} / {data.summary.merchantsTotal}
                  </Badge>
                </div>
              </Card>
            </div>

            <Separator className="my-3" />

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-2">Merchant</th>
                    <th className="py-2 pr-2">Plan</th>
                    <th className="py-2 pr-2 text-right">Conv.</th>
                    <th className="py-2 pr-2 text-right">Revenue</th>
                    <th className="py-2 pr-2 text-right">Cost</th>
                    <th className="py-2 pr-2 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.merchants.slice(0, 25).map((m) => (
                    <tr key={m.merchantId} className="border-b" data-testid={`row-sim-${m.merchantId}`}>
                      <td className="py-2 pr-2 font-medium truncate max-w-[180px]">{m.companyName}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline" className="text-xs">{m.planName}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-right">{fmtNum(m.conversationsUsed)}</td>
                      <td className="py-2 pr-2 text-right">{fmtIdr(m.monthlyRevenueIdr)}</td>
                      <td className="py-2 pr-2 text-right">{fmtIdr(m.estCostIdr)}</td>
                      <td className={`py-2 pr-2 text-right font-medium ${m.grossMarginIdr < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {fmtIdr(m.grossMarginIdr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.merchants.length > 25 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Menampilkan 25 dari {data.merchants.length} merchant (diurutkan margin terendah lebih dulu).
                </p>
              )}
            </div>

            <Separator className="my-3" />
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Server className="w-3 h-3" /> FAQ cache: {data.faqCache.size} entri</span>
              <span>Hits: {data.faqCache.hits}</span>
              <span>Misses: {data.faqCache.misses}</span>
              <span>Hit rate: {(data.faqCache.hitRate * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Memuat data cost monitor...</p>}
    </div>
  );
}
