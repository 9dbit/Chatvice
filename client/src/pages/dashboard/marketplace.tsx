import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Calendar,
  Hotel,
  CheckCircle,
  Loader2,
  ShoppingBag,
  QrCode,
  ArrowRight,
  Users,
  Bot,
  MessageSquare,
  Globe,
  BookOpen,
  Eye,
  Zap,
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

const addonIcons: Record<string, LucideIcon> = {
  appointment_scheduling: Calendar,
  hospitality: Hotel,
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

function formatUsd(usd: number) {
  return `$${usd}`;
}

function getInitialTab(): "addons" | "boosters" {
  if (typeof window === "undefined") return "addons";
  const params = new URLSearchParams(window.location.search);
  return params.get("tab") === "boosters" ? "boosters" : "addons";
}

export default function MarketplacePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"addons" | "boosters">(getInitialTab);
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    title: string;
    kind: "addon" | "booster";
    payment: InitiatePaymentResponse | null;
  }>({ open: false, title: "", kind: "addon", payment: null });

  const { data: addonsData, isLoading: loadingAddons } = useQuery<MarketplaceResponse>({
    queryKey: ["/api/marketplace/addons"],
  });

  const { data: boostersData, isLoading: loadingBoosters } = useQuery<BoosterResponse>({
    queryKey: ["/api/marketplace/boosters"],
  });

  const { data: merchantAddons = [] } = useQuery<MerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
  });

  const subscribeAddonMutation = useMutation({
    mutationFn: async (addonType: string) => {
      const res = await fetch("/api/merchant/addons/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ addonType, paymentMethod: "12pay" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to start payment");
      return body as InitiatePaymentResponse;
    },
    onSuccess: (payment, addonType) => {
      const item = addonsData?.items.find((i) => i.addonType === addonType);
      setPaymentDialog({ open: true, title: item?.name || "Add-on", kind: "addon", payment });
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
      if (!res.ok) throw new Error(body.error || "Failed to start payment");
      return body as InitiatePaymentResponse;
    },
    onSuccess: (payment, boosterType) => {
      const item = boostersData?.items.find((i) => i.boosterType === boosterType);
      setPaymentDialog({ open: true, title: item?.name || "Booster", kind: "booster", payment });
    },
    onError: (err: any) => {
      toast({
        title: "Tidak bisa memulai pembayaran",
        description: err?.message || "Terjadi kesalahan, coba lagi.",
        variant: "destructive",
      });
    },
  });

  const isAddonActive = (addonType: string) => {
    const a = merchantAddons.find((m) => m.addonType === addonType);
    if (!a) return false;
    const onTrial = a.trialEndsAt && new Date(a.trialEndsAt) > new Date();
    return a.isActive || !!onTrial;
  };

  const addons = addonsData?.items ?? [];
  const boosters = boostersData?.items ?? [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Tingkatkan kemampuan agent dengan add-on premium &amp; booster paket. Harga utama USD, ekuivalen Rupiah.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/additional-services")} data-testid="button-manage-active-services">
          Kelola layanan aktif
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const next = (v === "boosters" ? "boosters" : "addons") as "addons" | "boosters";
          setActiveTab(next);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (next === "boosters") url.searchParams.set("tab", "boosters");
            else url.searchParams.delete("tab");
            window.history.replaceState({}, "", url.toString());
          }
        }}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="addons" data-testid="tab-addons">Add-on Services</TabsTrigger>
          <TabsTrigger value="boosters" data-testid="tab-boosters">Boosters</TabsTrigger>
        </TabsList>

        {/* ── ADD-ONS ────────────────────────────────────────────── */}
        <TabsContent value="addons" className="space-y-4">
          {loadingAddons ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : addons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <Sparkles className="w-10 h-10 text-muted-foreground" />
                <p className="text-muted-foreground">Belum ada add-on yang tersedia.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addons.map((item) => {
                const Icon = addonIcons[item.addonType] || Sparkles;
                const active = isAddonActive(item.addonType);
                const isPending = subscribeAddonMutation.isPending && subscribeAddonMutation.variables === item.addonType;
                return (
                  <Card key={item.addonType} data-testid={`card-marketplace-${item.addonType}`}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-primary/10 shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            <span>{item.name}</span>
                            {active && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aktif
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                            <span className="text-3xl font-bold tracking-tight">
                              {formatUsd(item.monthlyPriceUsd)}
                            </span>
                            <span className="text-xs text-muted-foreground">/ bulan</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            ≈ {item.monthlyPriceIdrFormatted} / bulan
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {item.description && (
                        <CardDescription className="text-sm leading-relaxed">
                          {item.description}
                        </CardDescription>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => subscribeAddonMutation.mutate(item.addonType)}
                          disabled={active || isPending}
                          data-testid={`button-subscribe-${item.addonType}`}
                        >
                          {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <QrCode className="w-4 h-4 mr-2" />
                          )}
                          {active ? "Sudah berlangganan" : "Subscribe"}
                        </Button>
                        {!active && (
                          <Button
                            variant="outline"
                            onClick={() => navigate("/dashboard/additional-services")}
                            data-testid={`button-trial-${item.addonType}`}
                          >
                            Coba gratis 7 hari
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── BOOSTERS ───────────────────────────────────────────── */}
        <TabsContent value="boosters" className="space-y-4">
          {loadingBoosters ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : boosters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <Zap className="w-10 h-10 text-muted-foreground" />
                <p className="text-muted-foreground">Belum ada booster yang tersedia.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boosters.map((b) => {
                const Icon = boosterIconMap[b.iconName] || Zap;
                const isPending = buyBoosterMutation.isPending && buyBoosterMutation.variables === b.boosterType;
                return (
                  <Card
                    key={b.boosterType}
                    className="overflow-hidden flex flex-col"
                    data-testid={`card-booster-${b.boosterType}`}
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${b.gradientFrom} ${b.gradientTo} flex items-center justify-center shadow-md shrink-0`}
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        {b.isFeatured && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Populer
                          </Badge>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{b.name}</CardTitle>
                        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                          <span className="text-3xl font-bold tracking-tight" data-testid={`text-booster-usd-${b.boosterType}`}>
                            {formatUsd(b.priceUsd)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {b.billingMode === "monthly" ? "/bulan" : "/sekali bayar"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`text-booster-idr-${b.boosterType}`}>
                          ≈ {b.priceIdrFormatted} {b.billingMode === "monthly" ? "/ bulan" : ""}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto">
                      <Button
                        className="w-full"
                        onClick={() => buyBoosterMutation.mutate(b.boosterType)}
                        disabled={isPending}
                        data-testid={`button-buy-booster-${b.boosterType}`}
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <QrCode className="w-4 h-4 mr-2" />
                        )}
                        Beli sekarang
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={paymentDialog.open}
        onOpenChange={(o) => {
          if (!o) {
            setPaymentDialog({ open: false, title: "", kind: "addon", payment: null });
            queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
            queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
          }
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="dialog-marketplace-payment">
          <DialogHeader>
            <DialogTitle>Selesaikan pembayaran</DialogTitle>
            <DialogDescription>
              {paymentDialog.payment ? (
                <>
                  Bayar <strong>Rp {paymentDialog.payment.amountIDR.toLocaleString("id-ID")}</strong>
                  {" "}untuk mengaktifkan <strong>{paymentDialog.title}</strong>.
                </>
              ) : (
                "Memuat..."
              )}
            </DialogDescription>
          </DialogHeader>
          {paymentDialog.payment?.qrisString ? (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-white rounded-lg">
                <QRCodeSVG value={paymentDialog.payment.qrisString} size={200} />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Pindai QR code di atas dengan aplikasi pembayaran QRIS Anda.
                Akan otomatis aktif setelah pembayaran terverifikasi.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Menunggu data pembayaran...
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => {
              const wasBooster = paymentDialog.kind === "booster";
              setPaymentDialog({ open: false, title: "", kind: "addon", payment: null });
              queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
              queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
              if (wasBooster) {
                setActiveTab("boosters");
              } else {
                navigate("/dashboard/additional-services");
              }
            }}
            data-testid="button-close-payment-dialog"
          >
            Tutup &amp; lihat status
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
