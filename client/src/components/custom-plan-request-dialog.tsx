import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Loader2,
  Calculator,
  MessageSquare,
  Users,
  Database,
  Bot,
  Sparkles,
  Shield,
  Zap,
  HeadphonesIcon,
  Globe,
  BadgeCheck,
  BarChart3,
  Crown,
  Check,
  ArrowLeft,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import {
  formatIdr,
  calculateCustomPlanPrice,
  CUSTOM_PLAN_BASELINE,
  CUSTOM_PLAN_LIMITS,
  CUSTOM_PLAN_MARKUP,
} from "@/lib/pricing";
import type { Merchant } from "@shared/schema";

const includedFeatures = [
  { id: "custom_domain", label: "Custom Domain", icon: Globe },
  { id: "identity_verification", label: "Identity Verification", icon: BadgeCheck },
  { id: "priority_queue", label: "Priority Queue", icon: Zap },
  { id: "advanced_analytics", label: "Advanced Analytics", icon: BarChart3 },
  { id: "sla_guarantee", label: "SLA Guarantee 99.9%", icon: Shield },
  { id: "dedicated_support", label: "Dedicated Account Manager", icon: HeadphonesIcon },
  { id: "white_label", label: "White-label Penuh", icon: Crown },
];

interface CustomPlanRequestDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  skipAuthCheck?: boolean;
}

type Step = "calculator" | "confirm";

export function CustomPlanRequestDialog({
  trigger,
  onSuccess,
  skipAuthCheck = false,
}: CustomPlanRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("calculator");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<number>(CUSTOM_PLAN_BASELINE.conversations);
  const [agents, setAgents] = useState<number>(CUSTOM_PLAN_BASELINE.agents);
  const [supervisors, setSupervisors] = useState<number>(CUSTOM_PLAN_BASELINE.supervisors);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  // Always fetch merchant when the dialog is open. We must detect a logged-in
  // session even on public pages (skipAuthCheck=true) so the merchant can
  // continue straight to payment instead of being bounced to /register.
  // The shared queryClient is configured with on401: "returnNull", so this
  // call is safe for unauthenticated visitors — it just resolves to undefined.
  const { data: merchant, isLoading: isMerchantLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchant/me"],
    enabled: open,
  });

  const breakdown = useMemo(
    () => calculateCustomPlanPrice({ conversations, agents, supervisors, billingInterval }),
    [conversations, agents, supervisors, billingInterval],
  );

  // Reset to calculator step whenever the dialog reopens
  useEffect(() => {
    if (open) setStep("calculator");
  }, [open]);

  // Close immediately (no animation) when the user navigates to a different route
  useEffect(() => {
    setOpen(false);
  }, [location]);

  interface SubscribeResponse {
    paymentMethod: "qris";
    transactionId: string;
    orderId: string;
    qrisString?: string;
    qrisImage?: string;
    qrisImageUrl?: string;
    amount: number;
    amountFormatted?: string;
    expiryTime?: string;
    planId: "custom";
    planName: string;
    invoiceId?: string;
    invoiceNumber?: string;
    billingInterval: "monthly" | "annual";
  }

  const subscribeMutation = useMutation<SubscribeResponse>({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/merchant/custom-plan/subscribe", {
        conversations,
        agents,
        supervisors,
        billingInterval,
      });
      return (await response.json()) as SubscribeResponse;
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/pending-payment-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/me"] });
      toast({
        title: "Custom Plan dipesan",
        description: "Lanjutkan pembayaran QRIS untuk mengaktifkan paket Anda.",
      });
      setOpen(false);
      onSuccess?.();
      // Send merchant to billing page where the QRIS modal will pop up using
      // the shared `pending-payment-details` query (same flow as standard
      // tier checkout).
      setLocation("/dashboard/billing?pending=1");
    },
    onError: (error: any) => {
      toast({
        title: "Gagal membuat pembayaran",
        description: error.message || "Terjadi kesalahan. Coba lagi sebentar.",
        variant: "destructive",
      });
    },
  });

  const formatNumber = (num: number) => num.toLocaleString("id-ID");

  // Login wall for public surfaces — keeps existing behavior.
  if (!skipAuthCheck && !isMerchantLoading && !merchant) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" data-testid="button-custom-plan-request">
              <Calculator className="w-4 h-4 mr-2" />
              Try Pricing Calculator
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login dulu untuk subscribe Custom Plan</DialogTitle>
            <DialogDescription>
              Anda perlu login sebagai merchant untuk meneruskan ke pembayaran.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={() => (window.location.href = "/login")}>Login</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // For unauthenticated landing visitors with skipAuthCheck=true we still
  // show the calculator; the "Agree & Subscribe" CTA will redirect to
  // register/login when they don't have a session.
  const handleSubscribeClick = () => {
    if (!skipAuthCheck && !merchant) {
      setLocation("/login?redirect=/dashboard/billing");
      return;
    }
    if (skipAuthCheck && !merchant) {
      // Public visitor: send to registration with the configuration in the URL
      // so post-signup we can resume the calculator flow.
      const params = new URLSearchParams({
        plan: "custom",
        conv: String(conversations),
        ag: String(agents),
        sup: String(supervisors),
        cycle: billingInterval,
      });
      setLocation(`/register?${params.toString()}`);
      return;
    }
    subscribeMutation.mutate();
  };

  const showAnnualSavings = billingInterval === "annual";
  const annualSavingsIdr = breakdown.monthlyPriceIdr * 12 - breakdown.annualPriceIdr;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" data-testid="button-custom-plan-request">
            <Calculator className="w-4 h-4 mr-2" />
            Try Pricing Calculator
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto pro-frosted-card">
        {step === "calculator" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-600" />
                Custom Plan Calculator
              </DialogTitle>
              <DialogDescription>
                Geser slider sesuai kebutuhan tim Anda. Estimasi harga
                ter-update otomatis. Mulai dari Rp 8.499.000/bulan untuk
                kapasitas baseline (di atas tier Enterprise).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white text-center">
                <div className="text-sm opacity-80 mb-1">
                  Estimasi {billingInterval === "annual" ? "Total Tahunan" : "Harga Bulanan"}
                </div>
                <div
                  className="text-4xl font-bold"
                  data-testid="text-estimated-price"
                >
                  {formatIdr(breakdown.totalIdr)}
                  <span className="text-lg font-normal opacity-80">
                    {billingInterval === "annual" ? "/tahun" : "/bulan"}
                  </span>
                </div>
                {showAnnualSavings && (
                  <div className="text-xs opacity-80 mt-2">
                    Hemat {formatIdr(annualSavingsIdr)} dibanding bulanan
                  </div>
                )}
                <div className="text-xs opacity-60 mt-2">
                  Termasuk semua fitur premium di bawah. Harga final dihitung
                  ulang server saat checkout.
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm">
                <Button
                  type="button"
                  size="sm"
                  variant={billingInterval === "monthly" ? "default" : "outline"}
                  onClick={() => setBillingInterval("monthly")}
                  data-testid="button-cycle-monthly"
                >
                  Bulanan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={billingInterval === "annual" ? "default" : "outline"}
                  onClick={() => setBillingInterval("annual")}
                  data-testid="button-cycle-annual"
                >
                  Tahunan (Hemat 25%)
                </Button>
              </div>

              <div className="space-y-6 bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Kapasitas
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="flex items-center gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Percakapan/bulan</span>
                    </Label>
                    <span
                      className="font-semibold text-purple-600"
                      data-testid="text-conversations-value"
                    >
                      {formatNumber(conversations)}
                    </span>
                  </div>
                  <Slider
                    value={[conversations]}
                    onValueChange={([val]) => setConversations(val)}
                    min={CUSTOM_PLAN_LIMITS.conversationsMin}
                    max={CUSTOM_PLAN_LIMITS.conversationsMax}
                    step={CUSTOM_PLAN_LIMITS.conversationsStep}
                    className="cursor-pointer"
                    data-testid="slider-conversations"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatNumber(CUSTOM_PLAN_LIMITS.conversationsMin)}</span>
                    <span>{formatNumber(CUSTOM_PLAN_LIMITS.conversationsMax)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="flex items-center gap-2 text-sm">
                      <Bot className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>AI Agents</span>
                    </Label>
                    <span
                      className="font-semibold text-purple-600"
                      data-testid="text-agents-value"
                    >
                      {agents}
                    </span>
                  </div>
                  <Slider
                    value={[agents]}
                    onValueChange={([val]) => setAgents(val)}
                    min={CUSTOM_PLAN_LIMITS.agentsMin}
                    max={CUSTOM_PLAN_LIMITS.agentsMax}
                    step={CUSTOM_PLAN_LIMITS.agentsStep}
                    className="cursor-pointer"
                    data-testid="slider-agents"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{CUSTOM_PLAN_LIMITS.agentsMin}</span>
                    <span>{CUSTOM_PLAN_LIMITS.agentsMax}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Supervisors</span>
                    </Label>
                    <span
                      className="font-semibold text-purple-600"
                      data-testid="text-supervisors-value"
                    >
                      {supervisors}
                    </span>
                  </div>
                  <Slider
                    value={[supervisors]}
                    onValueChange={([val]) => setSupervisors(val)}
                    min={CUSTOM_PLAN_LIMITS.supervisorsMin}
                    max={CUSTOM_PLAN_LIMITS.supervisorsMax}
                    step={CUSTOM_PLAN_LIMITS.supervisorsStep}
                    className="cursor-pointer"
                    data-testid="slider-supervisors"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{CUSTOM_PLAN_LIMITS.supervisorsMin}</span>
                    <span>{CUSTOM_PLAN_LIMITS.supervisorsMax}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="flex items-center gap-2 text-sm">
                      <Database className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Knowledge Sources</span>
                    </Label>
                    <span className="font-semibold text-purple-600">
                      Unlimited
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sudah termasuk paket — tanpa biaya tambahan.
                  </p>
                </div>
              </div>

              {/* Live breakdown */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="font-semibold mb-2">Rincian harga bulanan:</div>
                <Row label="Base Custom Plan" value={formatIdr(breakdown.baseIdr)} />
                <Row
                  label={`Tambahan percakapan (di atas ${formatNumber(CUSTOM_PLAN_BASELINE.conversations)})`}
                  value={formatIdr(breakdown.conversationsExtraIdr)}
                  testId="text-extra-conv"
                />
                <Row
                  label={`Tambahan agents (di atas ${CUSTOM_PLAN_BASELINE.agents})`}
                  value={formatIdr(breakdown.agentsExtraIdr)}
                  testId="text-extra-agents"
                />
                <Row
                  label={`Tambahan supervisors (di atas ${CUSTOM_PLAN_BASELINE.supervisors})`}
                  value={formatIdr(breakdown.supervisorsExtraIdr)}
                  testId="text-extra-sup"
                />
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Total per bulan</span>
                  <span data-testid="text-total-monthly">
                    {formatIdr(breakdown.monthlyPriceIdr)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Markup: {formatIdr(CUSTOM_PLAN_MARKUP.perThousandConversationsIdr)} per 1.000 percakapan,{" "}
                  {formatIdr(CUSTOM_PLAN_MARKUP.perAgentIdr)}/agent,{" "}
                  {formatIdr(CUSTOM_PLAN_MARKUP.perSupervisorIdr)}/supervisor
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Crown className="w-4 h-4 text-purple-600" />
                  Fitur Premium Termasuk
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {includedFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                        data-testid={`feature-${feature.id}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <Icon className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300 truncate">
                          {feature.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-testid="button-cancel-request"
                >
                  Batal
                </Button>
                <Button
                  onClick={() => setStep("confirm")}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-agree-subscribe"
                >
                  Agree & Subscribe
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-purple-600" />
                Konfirmasi Custom Plan
              </DialogTitle>
              <DialogDescription>
                Periksa kembali konfigurasi Anda sebelum lanjut ke pembayaran.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-5 text-white">
                <div className="text-sm opacity-80">Total yang akan ditagih</div>
                <div
                  className="text-3xl font-bold"
                  data-testid="text-confirm-total"
                >
                  {formatIdr(breakdown.totalIdr)}
                  <span className="text-base font-normal opacity-80 ml-1">
                    {billingInterval === "annual" ? "/tahun" : "/bulan"}
                  </span>
                </div>
              </div>

              <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
                <div className="font-semibold mb-1">Konfigurasi paket:</div>
                <Row
                  label="Percakapan/bulan"
                  value={formatNumber(conversations)}
                  testId="text-confirm-conv"
                />
                <Row
                  label="AI Agents"
                  value={String(agents)}
                  testId="text-confirm-agents"
                />
                <Row
                  label="Supervisors"
                  value={String(supervisors)}
                  testId="text-confirm-sup"
                />
                <Row label="Knowledge Sources" value="Unlimited" />
                <Row
                  label="Siklus penagihan"
                  value={billingInterval === "annual" ? "Tahunan" : "Bulanan"}
                />
              </div>

              <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
                <div className="font-semibold mb-1">Rincian harga:</div>
                <Row label="Base Custom Plan" value={formatIdr(breakdown.baseIdr)} />
                <Row
                  label="Tambahan percakapan"
                  value={formatIdr(breakdown.conversationsExtraIdr)}
                />
                <Row
                  label="Tambahan agents"
                  value={formatIdr(breakdown.agentsExtraIdr)}
                />
                <Row
                  label="Tambahan supervisors"
                  value={formatIdr(breakdown.supervisorsExtraIdr)}
                />
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Subtotal bulanan</span>
                  <span>{formatIdr(breakdown.monthlyPriceIdr)}</span>
                </div>
                {billingInterval === "annual" && (
                  <>
                    <Row
                      label="Diskon tahunan (25%)"
                      value={`- ${formatIdr(annualSavingsIdr)}`}
                    />
                    <div className="pt-2 border-t flex justify-between font-semibold">
                      <span>Total tahunan</span>
                      <span>{formatIdr(breakdown.annualPriceIdr)}</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Setelah klik <span className="font-medium">Continue to Payment</span>,
                kami akan membuat pembayaran QRIS dan paket otomatis aktif begitu
                pembayaran dikonfirmasi.
              </p>

              <div className="flex justify-between gap-3 pt-4 border-t flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("calculator")}
                  disabled={subscribeMutation.isPending}
                  data-testid="button-back-to-calculator"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali
                </Button>
                <Button
                  onClick={handleSubscribeClick}
                  disabled={subscribeMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-continue-payment"
                >
                  {subscribeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Continue to Payment
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
