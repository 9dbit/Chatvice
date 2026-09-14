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
      className={`group relative flex h-full w-full rounded-[22px] text-left outline-none transition-transform duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
    >
      {children}
    </button>
  );
}

function ProductCover({
  from,
  to,
  icon: Icon,
  label,
}: {
  from: string;
  to: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-t-[21px] bg-gradient-to-br ${from} ${to}`}
      role="img"
      aria-label={`${label} product cover`}
    >
      <div className="absolute -right-[18%] -top-[18%] h-[64%] w-[64%] rounded-full border border-white/25 bg-white/10" />
      <div className="absolute -bottom-[28%] -left-[18%] h-[72%] w-[72%] rounded-full bg-black/10 blur-sm" />
      <div className="absolute left-[12%] top-[12%] h-[18%] w-[18%] rounded-full border border-white/20 bg-white/10 backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-[34%] w-[34%] items-center justify-center rounded-[28%] border border-white/30 bg-white/20 shadow-2xl shadow-black/20 backdrop-blur-md transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105 group-hover:-rotate-2">
          <Icon className="h-[52%] w-[52%] text-white" strokeWidth={1.8} />
        </div>
      </div>
      <div className="absolute inset-x-[10%] bottom-[9%] flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
        <span>Chatvice</span>
        <ShoppingBag className="h-3.5 w-3.5" />
      </div>
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
      <article className="relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-sm transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10 dark:bg-card/90">
        <div className="relative">
          <ProductCover from={gradient.from} to={gradient.to} icon={Icon} label={item.name} />
          <div className="absolute left-3 top-3">
            <Badge className="border-white/25 bg-black/25 text-[10px] text-white shadow-sm backdrop-blur-md hover:bg-black/25">Add-on</Badge>
          </div>
          {active && <Badge className="absolute right-3 top-3 gap-1 border-white/25 bg-emerald-600/90 text-[10px] text-white hover:bg-emerald-600/90"><CheckCircle2 className="h-3 w-3" /> Active</Badge>}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-base font-semibold tracking-tight text-foreground">{item.name}</h3>
          <p className="mt-2 line-clamp-3 min-h-[60px] text-xs leading-5 text-muted-foreground">{item.description || "Enhance your customer experience with this additional service."}</p>
          <div className="mt-5 border-t border-border/60 pt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight">${item.monthlyPriceUsd}</span>
              <span className="text-[11px] text-muted-foreground">USD / month</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">≈ {item.monthlyPriceIdrFormatted} / month</p>
          </div>
          <span className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm">
            {active ? "View service details" : "View details & subscribe"} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </article>
    </ProductButton>
  );
}

function BoosterCard({
  item,
  onSelect,
  testId,
  description,
}: {
  item: BoosterResponse["items"][number];
  onSelect: () => void;
  testId?: string;
  description?: string;
}) {
  const Icon = boosterIconMap[item.iconName] || Zap;
  const nameMatch = item.name.match(/^(\+[\d,]+)\s+(.+)$/);
  const value = nameMatch?.[1];
  const label = nameMatch?.[2] || item.name;
  return (
    <ProductButton onClick={onSelect} testId={testId || `tile-marketplace-booster-${item.boosterType}`}>
      <article className="relative flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-sm transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10 dark:bg-card/90">
        <div className="relative">
          <ProductCover from={item.gradientFrom} to={item.gradientTo} icon={Icon} label={label} />
          <Badge className="absolute left-3 top-3 border-white/25 bg-black/25 text-[10px] text-white shadow-sm backdrop-blur-md hover:bg-black/25">
            {item.billingMode === "monthly" ? "Monthly booster" : "One-time booster"}
          </Badge>
          {item.isFeatured && <Badge className="absolute right-3 top-3 gap-1 border-white/25 bg-white/90 text-[10px] text-slate-900 hover:bg-white/90"><Sparkles className="h-3 w-3" /> Popular</Badge>}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-base font-semibold tracking-tight">{label}</h3>
          <p className="mt-2 line-clamp-3 min-h-[60px] text-xs leading-5 text-muted-foreground">
            {description || `${value ? `${value} capacity included. ` : ""}Add ${item.quotaAmount.toLocaleString("id-ID")} units to your account quota.`}
          </p>
          <div className="mt-5 border-t border-border/60 pt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold">${item.priceUsd}</span>
              <span className="text-[11px] text-muted-foreground">USD {item.billingMode === "monthly" ? "/ month" : "/ one-time"}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">≈ {item.priceIdrFormatted} {item.billingMode === "monthly" ? "/ month" : "/ one-time"}</p>
          </div>
          <span className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm">
            View details & buy <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </article>
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1].map((i) => <Skeleton key={i} className="aspect-[3/5] rounded-[22px]" />)}</div>
        ) : addons.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{addons.map((item) => <AddonCard key={item.addonType} item={item} active={isAddonActive(merchantAddons, item.addonType)} onSelect={() => setSelectedId(`addon-${item.addonType}`)} />)}</div>
        ) : <div className="rounded-[22px] border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No add-on services available.</div>}
      </ShelfSection>

      {(loadingBoosters || conversation) && (
        <ShelfSection eyebrow="Conversation booster" description="Tambah kuota percakapan instan" icon={MessageSquare}>
          {loadingBoosters ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="aspect-[3/5] rounded-[22px]" /></div> : conversation && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <BoosterCard
                item={conversation}
                onSelect={() => setSelectedId(`booster-${conversation.boosterType}`)}
                testId="tile-marketplace-conv-booster"
                description={`${conversationBoosters.length} packages available, from ${conversationBoosters[0]?.quotaAmount.toLocaleString("id-ID")} to ${conversationBoosters.at(-1)?.quotaAmount.toLocaleString("id-ID")} additional conversations.`}
              />
            </div>
          )}
        </ShelfSection>
      )}

      <ShelfSection eyebrow="Boosters" description={t("dashboard.marketplace.boosterSectionDesc")} icon={Zap}>
        {loadingBoosters ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="aspect-[3/5] rounded-[22px]" />)}</div> : otherBoosters.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{otherBoosters.map((item) => <BoosterCard key={item.boosterType} item={item} onSelect={() => setSelectedId(`booster-${item.boosterType}`)} />)}</div> : <div className="rounded-[22px] border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No boosters available.</div>}
      </ShelfSection>

      <ProductPopup productId={selectedId} addonsData={addonsData} boostersData={boostersData} merchantAddons={merchantAddons} onClose={() => setSelectedId(null)} />
    </div>
  );
}