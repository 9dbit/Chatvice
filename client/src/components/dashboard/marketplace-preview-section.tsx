import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Users, Bot, MessageSquare, Globe, BookOpen, Eye, Zap,
  ArrowRight, ShoppingBag, type LucideIcon,
} from "lucide-react";

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

const iconMap: Record<string, LucideIcon> = {
  Users, Bot, MessageSquare, Globe, BookOpen, Eye, Zap,
};

export function MarketplacePreviewSection() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<BoosterResponse>({
    queryKey: ["/api/marketplace/boosters"],
  });

  const featured = (data?.items ?? [])
    .filter((b) => b.isFeatured)
    .slice(0, 4);

  if (isLoading || featured.length === 0) return null;

  return (
    <Card data-testid="card-marketplace-preview">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Marketplace Boosters</CardTitle>
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
            return (
              <button
                key={b.boosterType}
                type="button"
                onClick={() => navigate("/dashboard/marketplace?tab=boosters")}
                className="group flex flex-col items-start gap-2 p-3 rounded-md text-left hover-elevate active-elevate-2 shrink-0 w-40 sm:w-auto snap-start"
                data-testid={`preview-booster-${b.boosterType}`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${b.gradientFrom} ${b.gradientTo} flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="w-full min-w-0">
                  <p className="text-xs font-medium truncate">{b.name}</p>
                  <div className="flex items-baseline gap-1 mt-1 flex-wrap">
                    <span className="text-lg font-bold tracking-tight">${b.priceUsd}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {b.billingMode === "monthly" ? "/mo" : "once"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    ≈ {b.priceIdrFormatted}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
