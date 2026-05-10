import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Calendar,
  Hotel,
  CheckCircle,
  ShoppingBag,
  Zap,
  Users,
  Bot,
  MessageSquare,
  Globe,
  BookOpen,
  Eye,
  type LucideIcon,
} from "lucide-react";
import {
  ProductPopup,
  type AddonResponse,
  type BoosterResponse,
  type MarketplaceMerchantAddon,
} from "@/components/dashboard/marketplace-preview-section";

const addonIconMap: Record<string, LucideIcon> = {
  appointment_scheduling: Calendar,
  hospitality: Hotel,
};

const addonGradientMap: Record<string, { from: string; to: string }> = {
  appointment_scheduling: { from: "from-blue-500", to: "to-indigo-600" },
  hospitality: { from: "from-amber-400", to: "to-orange-500" },
};

const boosterIconMap: Record<string, LucideIcon> = {
  Users, Bot, MessageSquare, Globe, BookOpen, Eye, Zap,
};

const DEFAULT_GRADIENT = { from: "from-violet-500", to: "to-purple-700" };

function isAddonActive(merchantAddons: MarketplaceMerchantAddon[], addonType: string): boolean {
  const a = merchantAddons.find((m) => m.addonType === addonType);
  if (!a) return false;
  const onTrial = a.trialEndsAt && new Date(a.trialEndsAt) > new Date();
  return a.isActive || !!onTrial;
}

export default function MarketplacePage() {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: addonsData, isLoading: loadingAddons } = useQuery<AddonResponse>({
    queryKey: ["/api/marketplace/addons"],
  });

  const { data: boostersData, isLoading: loadingBoosters } = useQuery<BoosterResponse>({
    queryKey: ["/api/marketplace/boosters"],
  });

  const { data: merchantAddons = [] } = useQuery<MarketplaceMerchantAddon[]>({
    queryKey: ["/api/merchant/addons"],
  });

  const addons = addonsData?.items ?? [];
  const boosters = boostersData?.items ?? [];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Marketplace
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tingkatkan kemampuan agent dengan add-on premium &amp; booster paket. Harga utama USD, ekuivalen Rupiah.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard/additional-services")}
          data-testid="button-manage-active-services"
        >
          Kelola layanan aktif
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — Add-on Services                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Add-on Services
          </Badge>
          <p className="text-xs text-muted-foreground">Layanan tambahan berlangganan bulanan</p>
        </div>

        {loadingAddons ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <Card key={i}>
                <CardHeader className="space-y-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-8 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : addons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Sparkles className="w-10 h-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Belum ada add-on yang tersedia.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addons.map((item) => {
              const Icon = addonIconMap[item.addonType] || Sparkles;
              const g = addonGradientMap[item.addonType] || DEFAULT_GRADIENT;
              const active = isAddonActive(merchantAddons, item.addonType);
              return (
                <button
                  key={item.addonType}
                  type="button"
                  className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                  onClick={() => setSelectedId(`addon-${item.addonType}`)}
                  data-testid={`tile-marketplace-addon-${item.addonType}`}
                >
                  <Card className="hover-elevate h-full transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.from} ${g.to} flex items-center justify-center shrink-0 shadow-sm`}
                        >
                          <Icon className="w-6 h-6 text-white" />
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
                          <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-2xl font-bold tracking-tight">
                              ${item.monthlyPriceUsd}
                            </span>
                            <span className="text-xs text-muted-foreground">/ bulan</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ≈ {item.monthlyPriceIdrFormatted} / bulan
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {item.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <p className="text-xs text-primary font-medium">
                        Lihat detail &amp; berlangganan →
                      </p>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-border" />

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — Boosters                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs font-medium">
            <Zap className="w-3 h-3" />
            Boosters
          </Badge>
          <p className="text-xs text-muted-foreground">Tambah kuota instan — pembelian sekali</p>
        </div>

        {loadingBoosters ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardHeader className="space-y-3">
                  <Skeleton className="h-14 w-14 rounded-2xl" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-20" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : boosters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Zap className="w-10 h-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Belum ada booster yang tersedia.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boosters.map((b) => {
              const Icon = boosterIconMap[b.iconName] || Zap;
              return (
                <button
                  key={b.boosterType}
                  type="button"
                  className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                  onClick={() => setSelectedId(`booster-${b.boosterType}`)}
                  data-testid={`tile-marketplace-booster-${b.boosterType}`}
                >
                  <Card className="hover-elevate h-full transition-all duration-200 overflow-hidden">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${b.gradientFrom} ${b.gradientTo} flex items-center justify-center shadow-md shrink-0`}
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        {b.isFeatured && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Populer
                          </Badge>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{b.name}</CardTitle>
                        <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-2xl font-bold tracking-tight">
                            ${b.priceUsd}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {b.billingMode === "monthly" ? "/ bulan" : "/ sekali bayar"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ≈ {b.priceIdrFormatted}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-primary font-medium">
                        Lihat detail &amp; beli →
                      </p>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Shared product detail popup ── */}
      <ProductPopup
        productId={selectedId}
        addonsData={addonsData}
        boostersData={boostersData}
        merchantAddons={merchantAddons}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
