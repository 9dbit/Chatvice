import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles, Users, Bot, MessageSquare, Globe, BookOpen, Eye, Zap,
  ArrowRight, ShoppingBag, QrCode, Loader2, type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { QRCodeSVG } from "qrcode.react";

interface BoosterItem {
  boosterType: string;
  name: string;
  priceUsd: number;
  priceIdr: number;
  priceIdrFormatted: string;
  billingMode: "monthly" | "one_time";
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

interface InitiatePaymentResponse {
  orderId: string;
  boosterType: string;
  paymentMethod: string;
  amount: number;
  amountIDR: number;
  currency: string;
  qrisUrl: string | null;
  qrisString: string | null;
  transactionId: string;
  expiresAt: string | null;
}

const iconMap: Record<string, LucideIcon> = {
  Users, Bot, MessageSquare, Globe, BookOpen, Eye, Zap,
};

export function MarketplacePreviewSection() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    title: string;
    payment: InitiatePaymentResponse | null;
  }>({ open: false, title: "", payment: null });

  const { data, isLoading } = useQuery<BoosterResponse>({
    queryKey: ["/api/marketplace/boosters"],
  });

  const buyMutation = useMutation({
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
      const item = data?.items.find((i) => i.boosterType === boosterType);
      setPaymentDialog({ open: true, title: item?.name || "Booster", payment });
    },
    onError: (err: any) => {
      toast({
        title: "Tidak bisa memulai pembayaran",
        description: err?.message || "Terjadi kesalahan, coba lagi.",
        variant: "destructive",
      });
    },
  });

  // Already sorted by server (sortOrder asc); take featured top 4.
  // If admins un-feature everything, fall back to top 4 by sortOrder so the
  // preview never silently disappears from the overview.
  const all = data?.items ?? [];
  const featuredOnly = all.filter((b) => b.isFeatured);
  const featured = (featuredOnly.length > 0 ? featuredOnly : all).slice(0, 4);

  if (isLoading) {
    return (
      <Card data-testid="card-marketplace-preview-loading">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Marketplace — Tambah kapasitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (featured.length === 0) return null;

  return (
    <Card data-testid="card-marketplace-preview">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Marketplace — Tambah kapasitas</CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Populer
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/marketplace?tab=boosters")}
          data-testid="button-view-all-marketplace"
        >
          Lihat semua
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Mobile: horizontal scroll; Desktop: 4-col grid */}
        <div className="flex sm:grid sm:grid-cols-4 gap-3 overflow-x-auto sm:overflow-visible -mx-2 px-2 sm:mx-0 sm:px-0 snap-x snap-mandatory sm:snap-none">
          {featured.map((b) => {
            const Icon = iconMap[b.iconName] || Zap;
            const isPending = buyMutation.isPending && buyMutation.variables === b.boosterType;
            return (
              <div
                key={b.boosterType}
                className="flex flex-col gap-2 p-3 rounded-md border bg-card shrink-0 w-44 sm:w-auto snap-start"
                data-testid={`preview-booster-${b.boosterType}`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${b.gradientFrom} ${b.gradientTo} flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{b.name}</p>
                  <div className="flex items-baseline gap-1 mt-1 flex-wrap">
                    <span className="text-lg font-bold tracking-tight">${b.priceUsd}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {b.billingMode === "monthly" ? "/bulan" : "/sekali bayar"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    ≈ {b.priceIdrFormatted}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-auto"
                  onClick={() => buyMutation.mutate(b.boosterType)}
                  disabled={isPending}
                  data-testid={`button-buy-preview-${b.boosterType}`}
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <QrCode className="w-3 h-3 mr-1" />
                  )}
                  Beli
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>

      <Dialog
        open={paymentDialog.open}
        onOpenChange={(o) => {
          if (!o) {
            setPaymentDialog({ open: false, title: "", payment: null });
            queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
          }
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="dialog-preview-booster-payment">
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
              setPaymentDialog({ open: false, title: "", payment: null });
              queryClient.invalidateQueries({ queryKey: ["/api/billing/status"] });
              navigate("/dashboard/marketplace?tab=boosters");
            }}
            data-testid="button-close-preview-payment"
          >
            Tutup &amp; lihat semua booster
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
