import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  Globe,
  Hotel,
  MessageSquare,
  BookOpen,
  Bot,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
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

function isAddonActive(merchantAddons: MarketplaceMerchantAddon[], addonType: string) {
  const item = merchantAddons.find((entry) => entry.addonType === addonType);
  if (!item) return false;
  return item.isActive || !!(item.trialEndsAt && new Date(item.trialEndsAt) > new Date());
}

function ShelfSection({
  eyebrow,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Icon className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block">{description}</span>
      </div>
      {children}
    </section>
  );
}

function ProductButton({
  id,
  onClick,
  testId,
  children,
  className = "",
}: {
  id?: string;
  onClick: () => void;
  testId: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`group relative w-full rounded-[22px] text-left outline-none transition-transform duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      {children}
    </button>
  );
}

function GradientIcon({
  from,
  to,
  icon: Icon,
  size = "md",
}: {
  from: string;
  to: string;
  icon: LucideIcon;
  size?: "md" | "lg";
}) {
  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br ${from} ${to} shadow-lg shadow-primary/10 ${size === "lg" ? "h-16 w-16" : "h-12 w-12"}`}>
      <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <Icon className={size === "lg" ? "h-8 w-8 text-white" : "h-6 w-6 text-white"} />
    </div>
  );
}

function AddonCard({
  item,
  active,
  onSelect,
}: {
  item: AddonResponse["items"][number];
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = addonIconMap[item.addonType] || Sparkles;
  const gradient = addonGradientMap[item.addonType] || DEFAULT_GRADIENT;
  return (
    <ProductButton onClick={onSelect} testId={`tile-marketplace-addon-${item.addonType}`}>
      <div className="relative h-full min-h-[196px] overflow-hidden rounded-[22px] border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10 dark:bg-card/90">
        <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/[0.06] blur-2xl transition-transform duration-500 group-hover:scale-150" />
        <div className="relative flex items-start justify-between gap-3">
          <GradientIcon from={gradient.from} to={gradient.to} icon={Icon} />
          {active && (
            <Badge className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Active
            </Badge>
          )}
        </div>
        <div className="relative mt-5">
          <h3 className="text-[15px] font-semibold tracking-tight">{item.name}</h3>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight">${item.monthlyPriceUsd}</span>
            <span className="text-[11px] text-muted-foreground">/ month</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">≈ {item.monthlyPriceIdrFormatted} / month</p>
          <p className="mt-4 line-clamp-2 min-h-[32px] text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            {active ? "View service details" : "View details & subscribe"} <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </ProductButton>
  );
}

function BoosterCard({
  item,
  onSelect,
}: {
  item: BoosterResponse["items"][number];
  onSelect: () => void;
}) {
  const Icon = boosterIconMap[item.iconName] || Zap;
  const nameMatch = item.name.match(/^(\+[\d,]+)\s+(.+)$/);
  const value = nameMatch?.[1];
  const label = nameMatch?.[2] || item.name;
  return (
    <ProductButton onClick={onSelect} testId={`tile-marketplace-booster-${item.boosterType}`}>
      <div className="relative h-full min-h-[188px] overflow-hidden rounded-[22px] border border-border/70 bg-card p-4 shadow-sm transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10 dark:bg-card/90">
        <div className="flex items-start justify-between gap-3">
          <GradientIcon from={item.gradientFrom} to={item.gradientTo} icon={Icon} />
          {item.isFeatured && (
            <Badge variant="secondary" className="rounded-full px-2 py-1 text-[10px] font-medium">
              <Sparkles className="mr-1 h-3 w-3" /> Popular
            </Badge>
          )}
        </div>
        <div className="mt-4">
          {value && <p className="text-[11px] font-medium text-muted-foreground">{value}</p>}
          <h3 className="mt-0.5 text-sm font-semibold tracking-tight">{label}</h3>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-bold">${item.priceUsd}</span>
            <span className="text-[10px] text-muted-foreground">{item.billingMode === "monthly" ? "/ month" : "/ one-time"}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">≈ {item.priceIdrFormatted}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            View details & buy <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </ProductButton>
  );
}

export default function MarketplacePage() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: addonsData, isLoading: loadingAddons } = useQuery<AddonResponse>({ queryKey: ["/api/marketplace/addons"] });
  const { data: boostersData, isLoading: loadingBoosters } = useQuery<BoosterResponse>({ queryKey: ["/api/marketplace/boosters"] });
  const { data: merchantAddons = [] } = useQuery<MarketplaceMerchantAddon[]>({ queryKey: ["/api/merchant/addons"] });
  const addons = addonsData?.items ?? [];
  const boosters = boostersData?.items ?? [];
  const conversationBoosters = useMemo(() => boosters.filter((item) => item.boosterType.startsWith("conversations_")).sort((a, b) => a.quotaAmount - b.quotaAmount), [boosters]);
  const otherBoosters = useMemo(() => boosters.filter((item) => !item.boosterType.startsWith("conversations_")), [boosters]);
  const conversation = conversationBoosters.find((item) => item.boosterType === "conversations_2k") ?? conversationBoosters[0];

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 pb-10">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <ShoppingBag className="h-4 w-4" /> Chatvice shelf
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Marketplace</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("dashboard.marketplace.subtitle")}</p>
        </div>
        <Button onClick={() => navigate("/dashboard/additional-services")} data-testid="button-manage-active-services" className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90">
          Manage active services <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </header>

      <ShelfSection eyebrow="Add-on services" description={t("dashboard.marketplace.addonSectionDesc")} icon={Sparkles}>
        {loadingAddons ? (
          <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-[196px] rounded-[22px]" />)}</div>
        ) : addons.length ? (
          <div className="grid gap-4 md:grid-cols-2">{addons.map((item) => <AddonCard key={item.addonType} item={item} active={isAddonActive(merchantAddons, item.addonType)} onSelect={() => setSelectedId(`addon-${item.addonType}`)} />)}</div>
        ) : <div className="rounded-[22px] border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No add-on services available.</div>}
      </ShelfSection>

      {(loadingBoosters || conversation) && (
        <ShelfSection eyebrow="Conversation booster" description="Tambah kuota percakapan instan" icon={MessageSquare}>
          {loadingBoosters ? <Skeleton className="h-[142px] rounded-[22px]" /> : conversation && (
            <ProductButton onClick={() => setSelectedId(`booster-${conversation.boosterType}`)} testId="tile-marketplace-conv-booster">
              <div className="relative overflow-hidden rounded-[22px] border border-primary/20 bg-gradient-to-r from-primary/[0.10] via-card to-card p-5 shadow-sm transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/10 sm:p-6">
                <div className="absolute -right-8 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                  <GradientIcon from={conversation.gradientFrom} to={conversation.gradientTo} icon={MessageSquare} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">Tambah Percakapan</h3><Badge variant="secondary" className="text-[10px]">{conversationBoosters.length} paket tersedia</Badge></div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Pilih dari {conversationBoosters[0]?.quotaAmount.toLocaleString("id-ID")} hingga {conversationBoosters.at(-1)?.quotaAmount.toLocaleString("id-ID")} percakapan tambahan. Dikreditkan instan setelah pembayaran terkonfirmasi.</p>
                    <div className="mt-3 flex flex-wrap items-baseline gap-1.5"><span className="text-xs font-semibold">Mulai dari</span><span className="text-xl font-bold">${conversationBoosters[0]?.priceUsd}</span><span className="text-[11px] text-muted-foreground">/ sekali bayar · ≈ {conversationBoosters[0]?.priceIdrFormatted}</span></div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">View details & buy <ArrowUpRight className="h-4 w-4" /></span>
                </div>
              </div>
            </ProductButton>
          )}
        </ShelfSection>
      )}

      <ShelfSection eyebrow="Boosters" description={t("dashboard.marketplace.boosterSectionDesc")} icon={Zap}>
        {loadingBoosters ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[188px] rounded-[22px]" />)}</div> : otherBoosters.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{otherBoosters.map((item) => <BoosterCard key={item.boosterType} item={item} onSelect={() => setSelectedId(`booster-${item.boosterType}`)} />)}</div> : <div className="rounded-[22px] border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No boosters available.</div>}
      </ShelfSection>

      <ProductPopup productId={selectedId} addonsData={addonsData} boostersData={boostersData} merchantAddons={merchantAddons} onClose={() => setSelectedId(null)} />
    </div>
  );
}