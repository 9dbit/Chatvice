import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowRight,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

interface BoosterItem {
  boosterType: string;
  name: string;
  iconName: string;
  gradientFrom: string;
  gradientTo: string;
  isFeatured: boolean;
}

interface BoosterResponse {
  items: BoosterItem[];
}

interface MarketplaceItem {
  addonType: string;
  name: string;
  isEnabled: boolean;
}

interface MarketplaceResponse {
  items: MarketplaceItem[];
}

interface UnifiedProduct {
  productId: string;
  name: string;
  shortName: string;
  kind: "addon" | "booster";
  iconName: string;
  gradientFrom: string;
  gradientTo: string;
}

const boosterIconMap: Record<string, LucideIcon> = {
  Users,
  Bot,
  MessageSquare,
  Globe,
  BookOpen,
  Eye,
  Zap,
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

function shortName(name: string): string {
  if (name.length <= 12) return name;
  const words = name.split(" ");
  if (words.length > 1) return words.slice(0, 2).join(" ");
  return name.slice(0, 12);
}

export function MarketplacePreviewSection() {
  const [, navigate] = useLocation();

  const { data: boostersData, isLoading: loadingBoosters } =
    useQuery<BoosterResponse>({
      queryKey: ["/api/marketplace/boosters"],
    });

  const { data: addonsData, isLoading: loadingAddons } =
    useQuery<MarketplaceResponse>({
      queryKey: ["/api/marketplace/addons"],
    });

  const isLoading = loadingBoosters || loadingAddons;

  const addonProducts: UnifiedProduct[] = (addonsData?.items ?? []).map(
    (item) => {
      const g = addonGradientMap[item.addonType] || DEFAULT_GRADIENT;
      return {
        productId: `addon-${item.addonType}`,
        name: item.name,
        shortName: shortName(item.name),
        kind: "addon",
        iconName: item.addonType,
        gradientFrom: g.from,
        gradientTo: g.to,
      };
    }
  );

  const boosterProducts: UnifiedProduct[] = (boostersData?.items ?? []).map(
    (item) => ({
      productId: `booster-${item.boosterType}`,
      name: item.name,
      shortName: shortName(item.name),
      kind: "booster",
      iconName: item.iconName,
      gradientFrom: item.gradientFrom,
      gradientTo: item.gradientTo,
    })
  );

  const allProducts: UnifiedProduct[] = [...addonProducts, ...boosterProducts];

  if (isLoading) {
    return (
      <Card data-testid="card-marketplace-preview-loading">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Marketplace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allProducts.length === 0) return null;

  return (
    <Card data-testid="card-marketplace-preview">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Marketplace</CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            {allProducts.length} produk
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/marketplace")}
          data-testid="button-view-all-marketplace"
        >
          Lihat semua
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-2 gap-y-4">
          {allProducts.map((product) => {
            const Icon =
              product.kind === "addon"
                ? (addonIconMap[product.iconName] || Sparkles)
                : (boosterIconMap[product.iconName] || Zap);

            return (
              <button
                key={product.productId}
                className="flex flex-col items-center gap-1.5 cursor-pointer group focus:outline-none"
                onClick={() =>
                  navigate(`/dashboard/marketplace/${product.productId}`)
                }
                data-testid={`tile-${product.productId}`}
                type="button"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${product.gradientFrom} ${product.gradientTo} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-[10px] text-center leading-tight text-muted-foreground group-hover:text-foreground transition-colors max-w-[56px] break-words">
                  {product.shortName}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
