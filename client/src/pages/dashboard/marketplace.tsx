import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface MerchantAddon {
  id: string;
  addonType: string;
  isActive: boolean;
  trialEndsAt: string | null;
}

interface InitiatePaymentResponse {
  orderId: string;
  addonType: string;
  paymentMethod: string;
  amount: number;
  amountIDR: number;
  currency: string;
  qrisUrl: string | null;
  qrisString: string | null;
  transactionId: string;
  expiresAt: string | null;
}

const addonIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  appointment_scheduling: Calendar,
  hospitality: Hotel,
};

export default function MarketplacePage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    item: MarketplaceItem | null;
    payment: InitiatePaymentResponse | null;
  }>({ open: false, item: null, payment: null });

  const { data, isLoading } = useQuery<MarketplaceResponse>({
    queryKey: ["/api/marketplace/addons"],
  });

  const { data: merchantAddons = [] } = useQuery<MerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
  });

  const subscribeMutation = useMutation({
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
      const item = data?.items.find((i) => i.addonType === addonType) ?? null;
      setPaymentDialog({ open: true, item, payment });
    },
    onError: (err: any) => {
      toast({
        title: "Tidak bisa memulai pembayaran",
        description: err?.message || "Terjadi kesalahan, coba lagi.",
        variant: "destructive",
      });
    },
  });

  const items = data?.items ?? [];
  const isAddonActive = (addonType: string) => {
    const a = merchantAddons.find((m) => m.addonType === addonType);
    if (!a) return false;
    const onTrial = a.trialEndsAt && new Date(a.trialEndsAt) > new Date();
    return a.isActive || !!onTrial;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Tambah kemampuan AI agent Anda dengan add-on premium. Harga dalam Rupiah, langganan bulanan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/additional-services")}>
          Kelola layanan aktif
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Sparkles className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">Belum ada add-on yang tersedia.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const Icon = addonIcons[item.addonType] || Sparkles;
            const active = isAddonActive(item.addonType);
            const isPending = subscribeMutation.isPending && subscribeMutation.variables === item.addonType;
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
                      <div className="mt-1">
                        <span className="text-lg font-semibold text-primary">
                          {item.monthlyPriceIdrFormatted}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">/ bulan</span>
                      </div>
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
                      onClick={() => subscribeMutation.mutate(item.addonType)}
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
                        Lihat detail / coba gratis
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={paymentDialog.open}
        onOpenChange={(o) => {
          if (!o) {
            setPaymentDialog({ open: false, item: null, payment: null });
            queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
          }
        }}
      >
        <DialogContent className="sm:max-w-md" data-testid="dialog-marketplace-payment">
          <DialogHeader>
            <DialogTitle>Selesaikan pembayaran</DialogTitle>
            <DialogDescription>
              {paymentDialog.item ? (
                <>
                  Bayar <strong>{paymentDialog.payment?.amountIDR
                    ? `Rp ${paymentDialog.payment.amountIDR.toLocaleString("id-ID")}`
                    : paymentDialog.item.monthlyPriceIdrFormatted}</strong>
                  {" "}untuk mengaktifkan <strong>{paymentDialog.item.name}</strong>.
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
                Add-on akan otomatis aktif setelah pembayaran terverifikasi.
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
              setPaymentDialog({ open: false, item: null, payment: null });
              queryClient.invalidateQueries({ queryKey: ["/api/merchant/addons"] });
              navigate("/dashboard/additional-services");
            }}
          >
            Tutup & lihat status
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
