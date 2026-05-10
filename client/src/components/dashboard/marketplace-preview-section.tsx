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
  ChevronRight,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

interface BoosterItem {
  boosterType: string;
  name: string;
  quotaAmount: number;
  quotaField: string;
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
  kind: "addon" | "booster";
  iconName: string;
  gradientFrom: string;
  gradientTo: string;
  valueText?: string;
  labelText?: string;
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

function splitBoosterName(name: string): { value: string; label: string } {
  const match = name.match(/^(\+[\d,]+)\s+(.+)$/);
  if (match) return { value: match[1], label: match[2] };
  return { value: "", label: name };
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
        kind: "addon",
        iconName: item.addonType,
        gradientFrom: g.from,
        gradientTo: g.to,
      };
    }
  );

  const boosterProducts: UnifiedProduct[] = (boostersData?.items ?? []).map(
    (item) => {
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
    }
  );

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
                onClick={() =>
                  navigate(`/dashboard/marketplace/${product.productId}`)
                }
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
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Add-on
                      </p>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
