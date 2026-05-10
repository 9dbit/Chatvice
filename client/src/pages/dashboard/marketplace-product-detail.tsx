import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { QRCodeSVG } from "qrcode.react";

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

  const subscribeAddonMutation = useMutation({
    mutationFn: async (addonType: string) => {
      const res = await fetch("/api/merchant/addons/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addonType, paymentMethod: "12pay" }),
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
        body: JSON.stringify({ boosterType, paymentMethod: "12pay" }),
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
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/marketplace")}
          data-testid="button-back-marketplace"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Marketplace
        </Button>
        <p className="text-muted-foreground">Produk tidak ditemukan.</p>
      </div>
    );
  }

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
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/marketplace")}
          data-testid="button-back-marketplace"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Marketplace
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

        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => subscribeAddonMutation.mutate(addon.addonType)}
            disabled={active || isPending}
            data-testid={`button-subscribe-detail-${addon.addonType}`}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <QrCode className="w-4 h-4 mr-2" />
            )}
            {active ? "Sudah berlangganan" : "Subscribe via QRIS"}
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
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/marketplace?tab=boosters")}
          data-testid="button-back-marketplace"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Marketplace
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

        <Button
          onClick={() => buyBoosterMutation.mutate(booster.boosterType)}
          disabled={isPending}
          data-testid={`button-buy-detail-${booster.boosterType}`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <QrCode className="w-4 h-4 mr-2" />
          )}
          Beli sekarang via QRIS
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

type PaymentPhase = "qr" | "confirmed" | "expired";

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
  const [phase, setPhase] = useState<PaymentPhase>("qr");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!open || !payment?.transactionId || phase !== "qr") {
      stopPolling();
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/merchant/addons/payment-status/${encodeURIComponent(payment.transactionId)}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const status: string = data.status || "";
        if (status === "PAID" || status === "SETTLED") {
          stopPolling();
          queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
          queryClient.refetchQueries({ queryKey: ["/api/merchant/addons"] });
          queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
          setPhase("confirmed");
        } else if (status === "EXPIRED" || status === "CANCELLED" || status === "FAILED") {
          stopPolling();
          setPhase("expired");
        }
      } catch {
        // Network error — keep polling
      }
    };

    poll(); // immediate first check, don't wait 3s
    intervalRef.current = setInterval(poll, 3000);
    return stopPolling;
  }, [open, payment?.transactionId, phase]);

  // Reset phase whenever a new payment dialog is opened
  useEffect(() => {
    if (open) setPhase("qr");
    else stopPolling();
  }, [open]);

  const handleClose = () => {
    stopPolling();
    onClose();
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
              <DialogTitle>Pembayaran kedaluwarsa</DialogTitle>
              <DialogDescription>
                QR code sudah tidak berlaku. Silakan coba lagi.
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" onClick={handleClose} data-testid="button-close-detail-payment">
              Tutup
            </Button>
          </>
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
            {payment?.qrisString ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-lg">
                  <QRCodeSVG value={payment.qrisString} size={200} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                  <span>Menunggu konfirmasi pembayaran...</span>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Pindai QR code di atas dengan aplikasi pembayaran QRIS Anda.
                  Akan otomatis aktif setelah pembayaran terverifikasi.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Menunggu data
                pembayaran...
              </div>
            )}
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
