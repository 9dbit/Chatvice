import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Users,
  Bot,
  MessageSquare,
  Globe,
  BookOpen,
  Eye,
  Zap,
  Calendar,
  Hotel,
  ChevronRight,
  ShoppingBag,
  X,
  QrCode,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  PartyPopper,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

/* ------------------------------------------------------------------ */
/* Interfaces                                                           */
/* ------------------------------------------------------------------ */

export interface BoosterItem {
  boosterType: string;
  name: string;
  priceUsd: number;
  priceIdr: number;
  priceIdrFormatted: string;
  billingMode: "monthly" | "one_time";
  quotaAmount: number;
  quotaField: string;
  iconName: string;
  gradientFrom: string;
  gradientTo: string;
  isFeatured: boolean;
}

export interface BoosterResponse {
  items: BoosterItem[];
}

export interface AddonItem {
  addonType: string;
  name: string;
  description: string | null;
  monthlyPriceUsd: number;
  monthlyPriceIdr: number;
  monthlyPriceIdrFormatted: string;
  isEnabled: boolean;
}

export interface AddonResponse {
  items: AddonItem[];
}

export interface MarketplaceMerchantAddon {
  addonType: string;
  isActive: boolean;
  trialEndsAt: string | null;
}

interface PaymentResponse {
  orderId: string;
  transactionId: string;
  amountIDR: number;
  qrisString: string | null;
  expiresAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Icon / gradient maps                                                  */
/* ------------------------------------------------------------------ */

const boosterIconMap: Record<string, LucideIcon> = {
  Users, Bot, MessageSquare, Globe, BookOpen, Eye, Zap,
};

const addonIconMap: Record<string, LucideIcon> = {
  appointment_scheduling: Calendar,
  hospitality: Hotel,
};

const addonGradientMap: Record<string, { from: string; to: string }> = {
  appointment_scheduling: { from: "from-blue-500", to: "to-indigo-600" },
  hospitality: { from: "from-amber-400", to: "to-orange-500" },
};

const DEFAULT_GRADIENT = { from: "from-violet-500", to: "to-purple-700" };

const boosterBenefits: Record<string, { headline: string; bullets: string[] }> = {
  conversations_2k: {
    headline: "Tambah kuota percakapan instan",
    bullets: [
      "2.000 percakapan langsung dikreditkan ke saldo akun",
      "Berlaku untuk semua AI agent di akun Anda",
      "Tidak ada batas waktu penggunaan saldo",
      "Ideal saat volume chat meningkat di peak season",
      "Proses aktivasi otomatis setelah pembayaran terkonfirmasi",
    ],
  },
  supervisor_seat: {
    headline: "Perluas kapasitas tim supervisor",
    bullets: [
      "1 slot supervisor baru siap diaktifkan",
      "Akses penuh ke Supervisor Panel & eskalasi chat",
      "Supervisor dapat menangani semua sesi eskalasi",
      "Integrasi notifikasi Telegram tersedia",
      "Berlaku permanen selama berlangganan aktif",
    ],
  },
  domains_2: {
    headline: "Pasang widget di lebih banyak domain",
    bullets: [
      "Tambah 2 domain tervalidasi ke whitelist widget",
      "Lindungi widget dari penyalahgunaan domain tak dikenal",
      "Mendukung subdomain dan domain khusus",
      "Konfigurasi per-domain langsung dari dashboard",
      "Berlaku permanen, tidak perlu perpanjangan",
    ],
  },
  agent_seat: {
    headline: "Buat lebih banyak AI agent",
    bullets: [
      "1 slot AI agent baru siap dikonfigurasi",
      "Setiap agent punya knowledge base & system prompt sendiri",
      "Cocok untuk multi-brand atau multi-produk",
      "Agent dapat dipasang di widget yang berbeda",
      "Berlaku permanen selama berlangganan aktif",
    ],
  },
  sources_10: {
    headline: "Perbesar knowledge base agent Anda",
    bullets: [
      "10 sumber pengetahuan tambahan siap diisi",
      "Dukung URL crawl, upload dokumen, atau input manual",
      "Semakin banyak sumber = jawaban AI semakin akurat",
      "Auto-sync untuk URL yang di-crawl",
      "Berlaku permanen, tidak ada batas waktu",
    ],
  },
  vision_50: {
    headline: "Analisis gambar & dokumen pelanggan",
    bullets: [
      "50 kuota analisis media AI (gambar & dokumen)",
      "AI Vision membaca gambar, tangkap layar, dan PDF",
      "Membantu agent menjawab pertanyaan berbasis foto produk",
      "Powered by OpenAI GPT-4 Vision",
      "Kuota dikreditkan instan setelah pembayaran terkonfirmasi",
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function splitBoosterName(name: string): { value: string; label: string } {
  const m = name.match(/^(\+[\d,]+)\s+(.+)$/);
  return m ? { value: m[1], label: m[2] } : { value: "", label: name };
}

function safeMsg(body: any, fallback: string): string {
  if (!body) return fallback;
  if (typeof body.error === "string") return body.error;
  if (body.error) return JSON.stringify(body.error);
  if (typeof body.message === "string") return body.message;
  return fallback;
}

function isAddonActive(merchantAddons: MarketplaceMerchantAddon[], addonType: string): boolean {
  const a = merchantAddons.find((m) => m.addonType === addonType);
  if (!a) return false;
  const onTrial = a.trialEndsAt && new Date(a.trialEndsAt) > new Date();
  return a.isActive || !!onTrial;
}

/* ------------------------------------------------------------------ */
/* Types for unified grid items                                         */
/* ------------------------------------------------------------------ */

interface UnifiedProduct {
  productId: string;
  name: string;
  kind: "addon" | "booster";
  iconName: string;
  gradientFrom: string;
  gradientTo: string;
  valueText?: string;
  labelText?: string;
}

/* ------------------------------------------------------------------ */
/* Product detail popup                                                 */
/* ------------------------------------------------------------------ */

type Phase = "info" | "qr" | "success" | "failed";

export function ProductPopup({
  productId,
  addonsData,
  boostersData,
  merchantAddons,
  onClose,
}: {
  productId: string | null;
  addonsData: AddonResponse | undefined;
  boostersData: BoosterResponse | undefined;
  merchantAddons: MarketplaceMerchantAddon[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("info");
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [tcOpen, setTcOpen] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<Phase>("info");
  phaseRef.current = phase;

  const isAddon = productId?.startsWith("addon-") ?? false;
  const isBooster = productId?.startsWith("booster-") ?? false;
  const typeKey = isAddon
    ? productId!.slice("addon-".length)
    : productId?.slice("booster-".length) ?? "";

  const addon = isAddon
    ? (addonsData?.items ?? []).find((i) => i.addonType === typeKey) ?? null
    : null;
  const booster = isBooster
    ? (boostersData?.items ?? []).find((i) => i.boosterType === typeKey) ?? null
    : null;

  const addonActive = addon ? isAddonActive(merchantAddons, addon.addonType) : false;

  /* Mutations */
  const addonMutation = useMutation({
    mutationFn: async (addonType: string) => {
      const res = await fetch("/api/merchant/addons/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addonType, paymentMethod: "12pay" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(safeMsg(body, "Terjadi kesalahan, coba lagi."));
      return body as PaymentResponse;
    },
    onSuccess: (data) => { setPayment(data); setPhase("qr"); },
    onError: (err: any) =>
      toast({ title: "Tidak bisa memulai pembayaran", description: err?.message, variant: "destructive" }),
  });

  const boosterMutation = useMutation({
    mutationFn: async (boosterType: string) => {
      const res = await fetch("/api/merchant/boosters/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ boosterType, paymentMethod: "12pay" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(safeMsg(body, "Terjadi kesalahan, coba lagi."));
      return body as PaymentResponse;
    },
    onSuccess: (data) => { setPayment(data); setPhase("qr"); },
    onError: (err: any) =>
      toast({ title: "Tidak bisa memulai pembayaran", description: err?.message, variant: "destructive" }),
  });

  /* Polling for payment success */
  useEffect(() => {
    if (phase !== "qr" || !payment?.transactionId) return;

    const poll = async () => {
      if (phaseRef.current !== "qr") return;
      try {
        const res = await fetch(
          `/api/merchant/addons/payment-status/${payment.transactionId}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const s = (data.status ?? "").toLowerCase();
        if (s === "paid" || s === "settled") {
          clearInterval(pollingRef.current!);
          queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
          queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
          setPhase("success");
        } else if (s === "failed" || s === "expired" || s === "cancelled") {
          clearInterval(pollingRef.current!);
          setPhase("failed");
        }
      } catch {}
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [phase, payment?.transactionId]);

  /* Reset state when popup opens/closes */
  useEffect(() => {
    if (!productId) {
      setPhase("info");
      setPayment(null);
      setTcOpen(false);
    }
  }, [productId]);

  const icon = addon
    ? addonIconMap[addon.addonType] || Sparkles
    : booster
    ? boosterIconMap[booster.iconName] || Zap
    : Sparkles;

  const gradient = addon
    ? addonGradientMap[addon.addonType] || DEFAULT_GRADIENT
    : booster
    ? { from: booster.gradientFrom, to: booster.gradientTo }
    : DEFAULT_GRADIENT;

  const Icon = icon;
  const product = addon || booster;
  const isPending = addonMutation.isPending || boosterMutation.isPending;

  const handleBuy = () => {
    if (addon) addonMutation.mutate(addon.addonType);
    else if (booster) boosterMutation.mutate(booster.boosterType);
  };

  /* ---------- render phases ---------- */

  const renderQR = () => (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="text-sm text-muted-foreground text-center">
        Bayar{" "}
        <strong className="text-foreground">
          Rp {payment?.amountIDR?.toLocaleString("id-ID") ?? "—"}
        </strong>{" "}
        via QRIS untuk mengaktifkan <strong className="text-foreground">{product?.name}</strong>.
      </p>
      {payment?.qrisString ? (
        <div className="p-3 bg-white rounded-xl shadow-inner">
          <QRCodeSVG value={payment.qrisString} size={180} />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat QR code...
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Menunggu konfirmasi pembayaran...
      </div>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full px-4 mt-1"
        onClick={() => { setPhase("info"); setPayment(null); }}
      >
        Batal
      </Button>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <PartyPopper className="w-12 h-12 text-green-500" />
      <p className="font-semibold text-lg text-foreground">Pembayaran berhasil!</p>
      <p className="text-sm text-muted-foreground">
        {addon ? `${addon.name} telah diaktifkan di akun Anda.` : `Kuota ${booster?.name} berhasil ditambahkan.`}
      </p>
      <Button size="sm" className="rounded-full px-6 mt-2" onClick={onClose}>
        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Selesai
      </Button>
    </div>
  );

  const renderFailed = () => (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <AlertCircle className="w-10 h-10 text-destructive" />
      <p className="font-semibold text-foreground">Pembayaran gagal atau kedaluwarsa</p>
      <p className="text-sm text-muted-foreground">Silakan coba lagi.</p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full px-4 mt-1"
        onClick={() => { setPhase("info"); setPayment(null); }}
      >
        Coba lagi
      </Button>
    </div>
  );

  const renderInfo = () => {
    if (!product) return null;
    const benefits = booster ? boosterBenefits[booster.boosterType] : null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* ── Left column: price + terms ── */}
        <div className="space-y-4">
          {/* Price */}
          <div className="bg-muted/40 rounded-xl px-4 py-3">
            {addon ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">${addon.monthlyPriceUsd}</span>
                  <span className="text-sm text-muted-foreground">/ bulan</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">≈ {addon.monthlyPriceIdrFormatted} / bulan</p>
              </>
            ) : booster ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">${booster.priceUsd}</span>
                  <span className="text-sm text-muted-foreground">
                    {booster.billingMode === "monthly" ? "/ bulan" : "/ sekali bayar"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">≈ {booster.priceIdrFormatted}</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-2">
                  {booster.billingMode === "monthly" ? "Langganan bulanan" : "Pembelian sekali"}
                </Badge>
              </>
            ) : null}
          </div>

          {addonActive && (
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Add-on ini sudah aktif di akun Anda.
            </div>
          )}

          <Separator />

          {/* Terms & Conditions */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              onClick={() => setTcOpen((v) => !v)}
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span className="underline underline-offset-2">Syarat & Ketentuan</span>
              <ChevronRight
                className={`w-3 h-3 ml-auto transition-transform ${tcOpen ? "rotate-90" : ""}`}
              />
            </button>
            {tcOpen && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground list-disc list-inside pl-1">
                <li>Pembayaran diproses oleh 12Pay melalui QRIS dan bersifat non-refundable.</li>
                {addon && <li>Biaya berlangganan ditagih setiap bulan. Anda dapat membatalkan kapan saja melalui menu Billing.</li>}
                {booster && <li>Kuota dikreditkan ke akun secara instan setelah pembayaran terverifikasi. Non-transferable.</li>}
                <li>Aktivasi otomatis setelah pembayaran berhasil dikonfirmasi oleh gateway.</li>
                <li>Chatvice berhak mengubah harga dengan pemberitahuan minimal 30 hari sebelumnya.</li>
              </ul>
            )}
          </div>
        </div>

        {/* ── Right column: description / benefits ── */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Yang Anda dapatkan
          </p>

          {/* Addon description from DB */}
          {addon?.description && (
            <p className="text-sm text-foreground leading-relaxed">{addon.description}</p>
          )}

          {/* Booster: headline + rich bullet list */}
          {booster && benefits && (
            <>
              <p className="text-sm font-medium text-foreground">{benefits.headline}</p>
              <ul className="space-y-2">
                {benefits.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Fallback for boosters without a mapped description */}
          {booster && !benefits && (
            <p className="text-sm text-foreground leading-relaxed">
              Tambah <strong>{booster.quotaAmount.toLocaleString()}</strong> kuota{" "}
              {booster.name.replace(/^\+[\d,]+\s+/, "")} ke akun Anda secara instan.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={!!productId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-sm sm:max-w-2xl p-0 gap-0 overflow-hidden border-border/50 shadow-2xl bg-background/85 backdrop-blur-xl max-h-[90vh] flex flex-col"
        data-testid="dialog-product-detail"
      >
        {/* Header — always visible */}
        <div className="flex items-start gap-3 p-4 pb-3 shrink-0">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient.from} ${gradient.to} flex items-center justify-center shrink-0 shadow-md`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-semibold text-foreground leading-tight line-clamp-2">
              {product?.name ?? "—"}
            </DialogTitle>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {isAddon ? "Add-on" : "Booster"}
              </Badge>
              {booster?.isFeatured && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 text-white">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Populer
                </Badge>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 hover-elevate text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="button-close-product-popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Separator className="shrink-0" />

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {phase === "info" && renderInfo()}
          {phase === "qr" && renderQR()}
          {phase === "success" && renderSuccess()}
          {phase === "failed" && renderFailed()}
        </div>

        {/* Sticky footer — only in info phase */}
        {phase === "info" && (
          <div className="shrink-0 p-4 pt-3 border-t border-border/50 bg-background/60 backdrop-blur-sm flex flex-col gap-2">
            <Button
              className="w-full rounded-full"
              onClick={handleBuy}
              disabled={addonActive || isPending}
              data-testid={`button-buy-popup-${productId}`}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <QrCode className="w-4 h-4 mr-2" />
              )}
              {addonActive ? "Sudah berlangganan" : addon ? "Subscribe via QRIS" : "Beli via QRIS"}
            </Button>
            {addon && !addonActive && (
              <p className="text-center text-xs text-muted-foreground">
                Atau{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                  onClick={() => { onClose(); setTimeout(() => window.location.assign("/dashboard/additional-services"), 50); }}
                >
                  coba gratis 7 hari
                </button>
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Main section component                                               */
/* ------------------------------------------------------------------ */

export function MarketplacePreviewSection() {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: boostersData, isLoading: loadingBoosters } =
    useQuery<BoosterResponse>({ queryKey: ["/api/marketplace/boosters"] });

  const { data: addonsData, isLoading: loadingAddons } =
    useQuery<AddonResponse>({ queryKey: ["/api/marketplace/addons"] });

  const { data: merchantAddons = [] } = useQuery<MarketplaceMerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
  });

  const isLoading = loadingBoosters || loadingAddons;

  const addonProducts: UnifiedProduct[] = (addonsData?.items ?? []).map((item) => {
    const g = addonGradientMap[item.addonType] || DEFAULT_GRADIENT;
    return {
      productId: `addon-${item.addonType}`,
      name: item.name,
      kind: "addon",
      iconName: item.addonType,
      gradientFrom: g.from,
      gradientTo: g.to,
    };
  });

  const boosterProducts: UnifiedProduct[] = (boostersData?.items ?? []).map((item) => {
    const { value, label } = splitBoosterName(item.name);
    return {
      productId: `booster-${item.boosterType}`,
      name: item.name,
      kind: "booster",
      iconName: item.iconName,
      gradientFrom: item.gradientFrom,
      gradientTo: item.gradientTo,
      valueText: value || `+${item.quotaAmount.toLocaleString()}`,
      labelText: label,
    };
  });

  const allProducts: UnifiedProduct[] = [...addonProducts, ...boosterProducts];

  if (isLoading) {
    return (
      <Card data-testid="card-marketplace-preview-loading">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Marketplace</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allProducts.length === 0) return null;

  return (
    <>
      <Card data-testid="card-marketplace-preview">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 flex-wrap pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <CardTitle className="text-base text-foreground">Marketplace</CardTitle>
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              {allProducts.length} products
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-4 h-8 text-sm font-medium"
            onClick={() => navigate("/dashboard/marketplace")}
            data-testid="button-view-all-marketplace"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            {allProducts.map((product) => {
              const Icon =
                product.kind === "addon"
                  ? (addonIconMap[product.iconName] || Sparkles)
                  : (boosterIconMap[product.iconName] || Zap);

              return (
                <button
                  key={product.productId}
                  type="button"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
                  onClick={() => setSelectedId(product.productId)}
                  data-testid={`tile-${product.productId}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.gradientFrom} ${product.gradientTo} flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {product.kind === "booster" && product.valueText ? (
                      <>
                        <p className="text-2xl font-bold text-foreground leading-none">
                          {product.valueText}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                          {product.labelText}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Add-on</p>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ProductPopup
        productId={selectedId}
        addonsData={addonsData}
        boostersData={boostersData}
        merchantAddons={merchantAddons}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
