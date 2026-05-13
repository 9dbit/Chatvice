import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  Hotel,
  Sparkles,
  Users,
  Bot,
  MessageSquare,
  Globe,
  BookOpen,
  Eye,
  Zap,
  QrCode,
  Loader2,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  PartyPopper,
  Copy,
  Clock,
  CreditCard,
  Building2,
  AlertCircle,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { QRCodeSVG } from "qrcode.react";
import chatviceDarkLogo from "@assets/Chatvice-02_1778420788538.png";
import chatviceLightLogo from "@assets/Chatvice-04_1767550221276.png";
import qrisLogoImg from "@assets/IMG_6802_1778414496751.jpeg";

interface MarketplaceItem {
  id: number;
  addonType: string;
  name: string;
  description: string | null;
  monthlyPriceUsd: number;
  monthlyPriceIdr: number;
  monthlyPriceIdrFormatted: string;
  isEnabled: boolean;
}

interface MarketplaceResponse {
  items: MarketplaceItem[];
  exchangeRate: number;
  currency: string;
}

interface BoosterItem {
  id: number;
  boosterType: string;
  name: string;
  priceUsd: number;
  priceIdr: number;
  priceIdrFormatted: string;
  billingMode: "monthly" | "one_time";
  quotaField: string;
  quotaAmount: number;
  iconName: string;
  gradientFrom: string;
  gradientTo: string;
  isFeatured: boolean;
}

interface BoosterResponse {
  items: BoosterItem[];
  exchangeRate: number;
  currency: string;
}

interface MerchantAddon {
  id: string;
  addonType: string;
  isActive: boolean;
  trialEndsAt: string | null;
}

interface InitiatePaymentResponse {
  orderId: string;
  addonType?: string;
  boosterType?: string;
  paymentMethod: string;
  amount: number;
  amountIDR: number;
  currency: string;
  qrisUrl: string | null;
  qrisString: string | null;
  transactionId: string;
  expiresAt: string | null;
  vaNumber?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  uniqueCode?: number;
  totalAmount?: number;
}

const addonIconMap: Record<string, LucideIcon> = {
  appointment_scheduling: Calendar,
  hospitality: Hotel,
};

const addonGradientMap: Record<string, { from: string; to: string }> = {
  appointment_scheduling: { from: "from-blue-500", to: "to-indigo-600" },
  hospitality: { from: "from-amber-400", to: "to-orange-500" },
};

const boosterIconMap: Record<string, LucideIcon> = {
  Users,
  Bot,
  MessageSquare,
  Globe,
  BookOpen,
  Eye,
  Zap,
};

function safeErrorMessage(body: any, fallback: string): string {
  if (!body) return fallback;
  if (typeof body.error === "string") return body.error;
  if (body.error) return JSON.stringify(body.error);
  if (typeof body.message === "string") return body.message;
  return fallback;
}

type PaymentMethod = "qris" | "va" | "bank";

const VA_BANKS = [
  { code: "002", name: "Bank Rakyat Indonesia (BRI)" },
  { code: "008", name: "Bank Mandiri" },
  { code: "022", name: "CIMB Niaga" },
  { code: "013", name: "Bank Permata" },
  { code: "011", name: "Bank Danamon" },
  { code: "016", name: "Maybank Indonesia" },
  { code: "490", name: "Bank Neo Commerce (BNC)" },
  { code: "451", name: "Bank Syariah Indonesia (BSI)" },
];

const TRANSFER_BANKS = [
  { code: "BNI", name: "Bank Negara Indonesia (BNI)" },
  { code: "BRI", name: "Bank Rakyat Indonesia (BRI)" },
  { code: "MANDIRI", name: "Bank Mandiri" },
  { code: "BCA", name: "Bank Central Asia (BCA)" },
];

const VA_BANK_NAMES: Record<string, string> = Object.fromEntries(
  VA_BANKS.map((b) => [b.code, b.name])
);

export default function MarketplaceProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId ?? "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const isAddon = productId.startsWith("addon-");
  const isBooster = productId.startsWith("booster-");
  const typeKey = isAddon
    ? productId.slice("addon-".length)
    : productId.slice("booster-".length);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("qris");
  const [selectedBank, setSelectedBank] = useState<string>("");

  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    payment: InitiatePaymentResponse | null;
  }>({ open: false, payment: null });

  const { data: addonsData, isLoading: loadingAddons } =
    useQuery<MarketplaceResponse>({
      queryKey: ["/api/marketplace/addons"],
      enabled: isAddon,
    });

  const { data: boostersData, isLoading: loadingBoosters } =
    useQuery<BoosterResponse>({
      queryKey: ["/api/marketplace/boosters"],
      enabled: isBooster,
    });

  const { data: merchantAddons = [] } = useQuery<MerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
    enabled: isAddon,
  });

  const addon = isAddon
    ? (addonsData?.items ?? []).find((i) => i.addonType === typeKey) ?? null
    : null;

  const booster = isBooster
    ? (boostersData?.items ?? []).find((i) => i.boosterType === typeKey) ?? null
    : null;

  const isAddonActive = (addonType: string) => {
    const a = merchantAddons.find((m) => m.addonType === addonType);
    if (!a) return false;
    const onTrial = a.trialEndsAt && new Date(a.trialEndsAt) > new Date();
    return a.isActive || !!onTrial;
  };

  const getAddonTrialEndsAt = (addonType: string): Date | null => {
    const a = merchantAddons.find((m) => m.addonType === addonType);
    if (!a || !a.trialEndsAt) return null;
    const d = new Date(a.trialEndsAt);
    return d > new Date() ? d : null;
  };

  const formatTrialDate = (date: Date): string => {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const serverMethod =
    selectedPaymentMethod === "qris"
      ? "12pay"
      : selectedPaymentMethod === "bank"
      ? "bank_transfer"
      : "va";

  const subscribeAddonMutation = useMutation({
    mutationFn: async (addonType: string) => {
      const res = await fetch("/api/merchant/addons/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          addonType,
          paymentMethod: serverMethod,
          bankCode: selectedBank || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(safeErrorMessage(body, "Failed to start payment"));
      return body as InitiatePaymentResponse;
    },
    onSuccess: (payment) => {
      setPaymentDialog({ open: true, payment });
    },
    onError: (err: any) => {
      toast({
        title: "Tidak bisa memulai pembayaran",
        description: err?.message || "Terjadi kesalahan, coba lagi.",
        variant: "destructive",
      });
    },
  });

  const buyBoosterMutation = useMutation({
    mutationFn: async (boosterType: string) => {
      const res = await fetch("/api/merchant/boosters/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          boosterType,
          paymentMethod: serverMethod,
          bankCode: selectedBank || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(safeErrorMessage(body, "Failed to start payment"));
      return body as InitiatePaymentResponse;
    },
    onSuccess: (payment) => {
      setPaymentDialog({ open: true, payment });
    },
    onError: (err: any) => {
      toast({
        title: "Tidak bisa memulai pembayaran",
        description: err?.message || "Terjadi kesalahan, coba lagi.",
        variant: "destructive",
      });
    },
  });

  const handleBuy = (addonType?: string, boosterType?: string) => {
    if (selectedPaymentMethod === "va" || selectedPaymentMethod === "bank") {
      if (!selectedBank) {
        toast({ title: "Pilih bank terlebih dahulu", variant: "destructive" });
        return;
      }
    }
    if (addonType) subscribeAddonMutation.mutate(addonType);
    else if (boosterType) buyBoosterMutation.mutate(boosterType);
  };

  const isLoading = (isAddon && loadingAddons) || (isBooster && loadingBoosters);

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-9 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  if (!addon && !booster) {
    return (
      <div className="max-w-2xl space-y-4">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-4"
          onClick={() => navigate("/dashboard/marketplace")}
          data-testid="button-back-marketplace"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <p className="text-muted-foreground">Produk tidak ditemukan.</p>
      </div>
    );
  }

  const PaymentMethodSelector = ({ disabled }: { disabled?: boolean }) => (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Metode Pembayaran</p>
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            { id: "qris" as const, label: "QRIS", Icon: QrCode },
            { id: "va" as const, label: "Virtual Account", Icon: CreditCard },
            { id: "bank" as const, label: "Bank Transfer", Icon: Building2 },
          ] as { id: PaymentMethod; label: string; Icon: LucideIcon }[]
        ).map((m) => {
          const IconComp = m.Icon;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSelectedPaymentMethod(m.id);
                setSelectedBank("");
              }}
              className={[
                "flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                selectedPaymentMethod === m.id
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground",
              ].join(" ")}
              data-testid={`button-payment-method-${m.id}`}
            >
              <IconComp className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate">{m.label}</span>
            </button>
          );
        })}
      </div>

      {selectedPaymentMethod === "va" && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Pilih Bank VA</p>
          <Select value={selectedBank} onValueChange={setSelectedBank} disabled={disabled}>
            <SelectTrigger className="w-full" data-testid="select-va-bank">
              <SelectValue placeholder="Pilih bank..." />
            </SelectTrigger>
            <SelectContent>
              {VA_BANKS.map((b) => (
                <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedPaymentMethod === "bank" && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Pilih Bank Tujuan</p>
          <Select value={selectedBank} onValueChange={setSelectedBank} disabled={disabled}>
            <SelectTrigger className="w-full" data-testid="select-transfer-bank">
              <SelectValue placeholder="Pilih bank..." />
            </SelectTrigger>
            <SelectContent>
              {TRANSFER_BANKS.map((b) => (
                <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  if (addon) {
    const Icon = addonIconMap[addon.addonType] || Sparkles;
    const gradient = addonGradientMap[addon.addonType] || {
      from: "from-violet-500",
      to: "to-purple-700",
    };
    const active = isAddonActive(addon.addonType);
    const trialEndsAt = getAddonTrialEndsAt(addon.addonType);
    const isPending =
      subscribeAddonMutation.isPending &&
      subscribeAddonMutation.variables === addon.addonType;

    return (
      <div className="max-w-2xl space-y-6">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-4"
          onClick={() => navigate("/dashboard/marketplace")}
          data-testid="button-back-marketplace"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>

        {active && (
          <div
            className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/40"
            data-testid="banner-addon-active"
          >
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Add-on ini sedang aktif
              </p>
              <p className="text-xs text-green-700/80 dark:text-green-400/80 mt-0.5">
                {trialEndsAt
                  ? `Masa percobaan berakhir ${formatTrialDate(trialEndsAt)}`
                  : `${addon.name} sudah berjalan di akun Anda.`}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient.from} ${gradient.to} flex items-center justify-center shadow-lg shrink-0`}
          >
            <Icon className="w-10 h-10 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                {addon.name}
              </h1>
              {active && (
                <Badge variant="secondary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Aktif
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">Add-on Service</p>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-4xl font-bold tracking-tight">
            ${addon.monthlyPriceUsd}
          </span>
          <span className="text-muted-foreground text-sm ml-2">/ bulan</span>
          <p className="text-sm text-muted-foreground">
            ≈ {addon.monthlyPriceIdrFormatted} / bulan
          </p>
        </div>

        {addon.description && (
          <p className="text-muted-foreground leading-relaxed">
            {addon.description}
          </p>
        )}

        {!active && <PaymentMethodSelector disabled={isPending} />}

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => handleBuy(addon.addonType)}
            disabled={active || isPending}
            data-testid={`button-subscribe-detail-${addon.addonType}`}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : selectedPaymentMethod === "qris" ? (
              <QrCode className="w-4 h-4 mr-2" />
            ) : selectedPaymentMethod === "va" ? (
              <CreditCard className="w-4 h-4 mr-2" />
            ) : (
              <Building2 className="w-4 h-4 mr-2" />
            )}
            {active
              ? "Sudah berlangganan"
              : selectedPaymentMethod === "qris"
              ? "Subscribe via QRIS"
              : selectedPaymentMethod === "va"
              ? "Subscribe via VA"
              : "Subscribe via Transfer"}
          </Button>
          {!active && (
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/additional-services")}
              data-testid={`button-trial-detail-${addon.addonType}`}
            >
              Coba gratis 7 hari
            </Button>
          )}
        </div>

        <PaymentDialog
          open={paymentDialog.open}
          payment={paymentDialog.payment}
          title={addon.name}
          onClose={() => {
            setPaymentDialog({ open: false, payment: null });
            queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
            queryClient.refetchQueries({ queryKey: ["/api/merchant/addons"] });
            queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
          }}
        />
      </div>
    );
  }

  if (booster) {
    const Icon = boosterIconMap[booster.iconName] || Zap;
    const isPending =
      buyBoosterMutation.isPending &&
      buyBoosterMutation.variables === booster.boosterType;

    return (
      <div className="max-w-2xl space-y-6">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-4"
          onClick={() => navigate("/dashboard/marketplace?tab=boosters")}
          data-testid="button-back-marketplace"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${booster.gradientFrom} ${booster.gradientTo} flex items-center justify-center shadow-lg shrink-0`}
          >
            <Icon className="w-10 h-10 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                {booster.name}
              </h1>
              {booster.isFeatured && (
                <Badge variant="secondary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Populer
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">Booster</p>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-4xl font-bold tracking-tight">
            ${booster.priceUsd}
          </span>
          <span className="text-muted-foreground text-sm ml-2">
            {booster.billingMode === "monthly" ? "/ bulan" : "/ sekali bayar"}
          </span>
          <p className="text-sm text-muted-foreground">
            ≈ {booster.priceIdrFormatted}
            {booster.billingMode === "monthly" ? " / bulan" : ""}
          </p>
        </div>

        <p className="text-muted-foreground">
          Tambah <strong>{booster.quotaAmount.toLocaleString()}</strong> kuota{" "}
          {booster.quotaField.replace(/_/g, " ")} ke akun Anda.
        </p>

        <PaymentMethodSelector disabled={isPending} />

        <Button
          onClick={() => handleBuy(undefined, booster.boosterType)}
          disabled={isPending}
          data-testid={`button-buy-detail-${booster.boosterType}`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : selectedPaymentMethod === "qris" ? (
            <QrCode className="w-4 h-4 mr-2" />
          ) : selectedPaymentMethod === "va" ? (
            <CreditCard className="w-4 h-4 mr-2" />
          ) : (
            <Building2 className="w-4 h-4 mr-2" />
          )}
          {selectedPaymentMethod === "qris"
            ? "Beli sekarang via QRIS"
            : selectedPaymentMethod === "va"
            ? "Beli sekarang via VA"
            : "Beli sekarang via Transfer"}
        </Button>

        <PaymentDialog
          open={paymentDialog.open}
          payment={paymentDialog.payment}
          title={booster.name}
          onClose={() => {
            setPaymentDialog({ open: false, payment: null });
            queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
            navigate("/dashboard/marketplace?tab=boosters");
          }}
        />
      </div>
    );
  }

  return null;
}

type PaymentPhase = "qr" | "va" | "bank_transfer" | "confirmed" | "expired";

function resolvePhase(payment: InitiatePaymentResponse): PaymentPhase {
  const pm = payment.paymentMethod;
  if (pm === "va" || payment.vaNumber) return "va";
  if (pm === "bank_transfer" || payment.accountNumber) return "bank_transfer";
  return "qr";
}

function PaymentDialog({
  open,
  payment,
  title,
  onClose,
}: {
  open: boolean;
  payment: InitiatePaymentResponse | null;
  title: string;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [phase, setPhase] = useState<PaymentPhase>("qr");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<PaymentPhase>("qr");
  phaseRef.current = phase;

  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if ((phase !== "qr" && phase !== "va") || !payment?.expiresAt) return;
    const computeRemaining = () =>
      Math.max(
        0,
        Math.floor((new Date(payment.expiresAt!).getTime() - Date.now()) / 1000)
      );
    setTimeRemaining(computeRemaining());
    const interval = setInterval(() => {
      const r = computeRemaining();
      setTimeRemaining(r);
      if (r <= 0) {
        clearInterval(interval);
        if (phase === "va") setTimeout(() => setPhase("expired"), 1500);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, payment?.expiresAt]);

  useEffect(() => {
    if (!open || !payment?.transactionId || (phase !== "qr" && phase !== "va")) {
      stopPolling();
      return;
    }

    const poll = async () => {
      if (phaseRef.current !== "qr" && phaseRef.current !== "va") return;
      try {
        const res = await fetch(
          `/api/merchant/addons/payment-status/${encodeURIComponent(payment.transactionId)}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const status: string = (data.status || "").toLowerCase();
        if (status === "paid" || status === "settled") {
          stopPolling();
          queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
          queryClient.refetchQueries({ queryKey: ["/api/merchant/addons"] });
          queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
          setPhase("confirmed");
        } else if (
          status === "expired" ||
          status === "cancelled" ||
          status === "failed"
        ) {
          stopPolling();
          setPhase("expired");
        }
      } catch {
        // Network error — keep polling
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 3000);
    return stopPolling;
  }, [open, payment?.transactionId, phase]);

  useEffect(() => {
    if (open && payment) setPhase(resolvePhase(payment));
    else if (!open) {
      stopPolling();
      setPhase("qr");
    }
  }, [open, payment]);

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  const resetToSelector = () => {
    stopPolling();
    setPhase("qr");
    onClose();
  };

  const mm = String(Math.floor(timeRemaining / 60)).padStart(2, "0");
  const ss = String(timeRemaining % 60).padStart(2, "0");
  const isExpired = timeRemaining <= 0 && !!payment?.expiresAt;

  const renderQR = () => (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200">
        <div className="bg-white px-4 py-3 flex items-center justify-between gap-3">
          <img
            src={isDark ? chatviceLightLogo : chatviceDarkLogo}
            alt="Chatvice"
            className="h-7 object-contain"
          />
          <img src={qrisLogoImg} alt="QRIS" className="h-8 object-contain" />
        </div>
        <div className="border-t border-dashed border-gray-200" />
        <div className="bg-white p-4 space-y-3">
          <div className="flex gap-4 items-start">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                {payment?.qrisString ? (
                  <QRCodeSVG value={payment.qrisString} size={148} />
                ) : (
                  <div className="w-[148px] h-[148px] flex items-center justify-center bg-gray-50 rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Produk</p>
                <p className="text-sm font-semibold text-gray-800 leading-tight">{title}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Pembayaran</p>
                <p className="text-base font-bold text-gray-900">Rp {payment?.amountIDR?.toLocaleString("id-ID") ?? "—"}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Order ID</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-600 font-mono truncate">{payment?.orderId ?? "—"}</p>
                  {payment?.orderId && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(payment.orderId);
                        toast({ title: "Order ID disalin" });
                      }}
                      className="shrink-0 p-0.5 rounded hover-elevate"
                      data-testid="button-copy-order-id"
                    >
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                {isExpired ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 font-medium">
                    <Clock className="w-3 h-3" /> Kedaluwarsa
                  </span>
                ) : payment?.expiresAt ? (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 font-medium border ${
                      timeRemaining <= 60
                        ? "bg-red-50 text-red-600 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    <Clock className="w-3 h-3" /> {mm}:{ss}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Menunggu konfirmasi...
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-end gap-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 text-xs"
            onClick={resetToSelector}
            data-testid="button-change-payment-method"
          >
            Batal / Ganti Metode
          </Button>
        </div>
      </div>
    </div>
  );

  const renderVA = () => {
    const bankName = VA_BANK_NAMES[payment?.bankCode ?? ""] || payment?.bankCode || "—";
    return (
      <div className="space-y-3">
        <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200">
          <div className="bg-white px-4 py-3 flex items-center justify-between gap-3">
            <img
              src={isDark ? chatviceLightLogo : chatviceDarkLogo}
              alt="Chatvice"
              className="h-7 object-contain"
            />
            <div className="flex items-center gap-1.5 text-primary">
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-semibold">Virtual Account</span>
            </div>
          </div>
          <div className="border-t border-dashed border-gray-200" />
          <div className="bg-white p-4 space-y-3">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Bank</p>
              <p className="text-sm font-semibold text-gray-800">{bankName}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Nomor Virtual Account</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold font-mono text-gray-900">{payment?.vaNumber || "—"}</p>
                {payment?.vaNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(payment.vaNumber!);
                      toast({ title: "Nomor VA disalin" });
                    }}
                    className="p-0.5 rounded hover-elevate"
                    data-testid="button-copy-va-number"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Pembayaran</p>
              <p className="text-base font-bold text-gray-900">Rp {payment?.amountIDR?.toLocaleString("id-ID") ?? "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Order ID</p>
              <p className="text-xs text-gray-600 font-mono truncate">{payment?.orderId || "—"}</p>
            </div>
            <div>
              {timeRemaining <= 0 && !!payment?.expiresAt ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 font-medium">
                  <Clock className="w-3 h-3" /> Kedaluwarsa
                </span>
              ) : payment?.expiresAt ? (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 font-medium border ${
                    timeRemaining <= 60
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                  data-testid="text-va-countdown"
                >
                  <Clock className="w-3 h-3" /> {mm}:{ss}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Menunggu pembayaran...
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-end gap-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4 text-xs"
              onClick={resetToSelector}
              data-testid="button-change-payment-method-va"
            >
              Batal / Ganti Metode
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderBankTransfer = () => {
    const baseAmount = payment?.amountIDR ?? 0;
    const uniqueCode = payment?.uniqueCode ?? 0;
    const totalAmount = payment?.totalAmount ?? baseAmount + uniqueCode;
    return (
      <div className="space-y-3">
        <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200">
          <div className="bg-white px-4 py-3 flex items-center justify-between gap-3">
            <img
              src={isDark ? chatviceLightLogo : chatviceDarkLogo}
              alt="Chatvice"
              className="h-7 object-contain"
            />
            <div className="flex items-center gap-1.5 text-primary">
              <Building2 className="w-5 h-5" />
              <span className="text-xs font-semibold">Bank Transfer</span>
            </div>
          </div>
          <div className="border-t border-dashed border-gray-200" />
          <div className="bg-white p-4 space-y-3">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Bank Tujuan</p>
              <p className="text-sm font-semibold text-gray-800">{payment?.bankName || payment?.bankCode || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Atas Nama</p>
              <p className="text-sm text-gray-800">{payment?.accountName || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Nomor Rekening</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold font-mono text-gray-900">{payment?.accountNumber || "—"}</p>
                {payment?.accountNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(payment.accountNumber!);
                      toast({ title: "Nomor rekening disalin" });
                    }}
                    className="p-0.5 rounded hover-elevate"
                    data-testid="button-copy-account-number"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            {uniqueCode > 0 && (
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Kode Unik</p>
                <p className="text-sm text-gray-800">+Rp {uniqueCode.toLocaleString("id-ID")}</p>
              </div>
            )}
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Transfer</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-gray-900">Rp {totalAmount.toLocaleString("id-ID")}</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(String(totalAmount));
                    toast({ title: "Total disalin" });
                  }}
                  className="p-0.5 rounded hover-elevate"
                  data-testid="button-copy-total-amount"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-[10px] text-amber-700">
                Transfer jumlah tepat termasuk kode unik untuk verifikasi otomatis.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Info className="w-3 h-3" />
              Pembayaran diverifikasi manual oleh tim kami dalam 1x24 jam.
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-end gap-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4 text-xs"
              onClick={resetToSelector}
              data-testid="button-change-payment-method-bank"
            >
              Batal / Ganti Metode
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-detail-payment">
        {phase === "confirmed" ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/60 flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold" data-testid="text-payment-success-title">
                Pembayaran berhasil!
              </h2>
              <p className="text-sm text-muted-foreground">
                {payment?.boosterType
                  ? <>Kuota <strong>{title}</strong> telah ditambahkan ke akun Anda.</>
                  : <><strong>{title}</strong> telah diaktifkan di akun Anda.</>}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center mt-2">
              {payment?.boosterType ? (
                <Button
                  onClick={() => {
                    handleClose();
                    navigate("/dashboard/marketplace?tab=boosters");
                  }}
                  data-testid="button-view-boosters"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Kembali ke Marketplace
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    handleClose();
                    navigate("/dashboard/additional-services");
                  }}
                  data-testid="button-view-active-addons"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Lihat add-on aktif
                </Button>
              )}
              <Button variant="outline" onClick={handleClose} data-testid="button-close-payment-success">
                Tutup
              </Button>
            </div>
          </div>
        ) : phase === "expired" ? (
          <>
            <DialogHeader>
              <DialogTitle>Pembayaran gagal atau kedaluwarsa</DialogTitle>
              <DialogDescription>
                Silakan tutup dan pilih metode pembayaran lagi.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-2">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <Button variant="outline" onClick={handleClose} data-testid="button-close-detail-payment">
              Tutup
            </Button>
          </>
        ) : phase === "va" ? (
          renderVA()
        ) : phase === "bank_transfer" ? (
          renderBankTransfer()
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Selesaikan pembayaran</DialogTitle>
              <DialogDescription>
                {payment ? (
                  <>
                    Bayar{" "}
                    <strong>Rp {payment.amountIDR.toLocaleString("id-ID")}</strong>{" "}
                    untuk mengaktifkan <strong>{title}</strong>.
                  </>
                ) : (
                  "Memuat..."
                )}
              </DialogDescription>
            </DialogHeader>
            {renderQR()}
            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-close-detail-payment"
            >
              Tutup &amp; lihat status
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
