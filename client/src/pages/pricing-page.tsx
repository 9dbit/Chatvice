import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SchemaMarkup } from "@/components/seo/schema-markup";
import {
  Check,
  X,
  ArrowRight,
  Zap,
  HelpCircle,
  Gift,
  Clock,
  Copy,
  Calculator,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PublicPageLayout from "./public-layout";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CustomPlanRequestDialog } from "@/components/custom-plan-request-dialog";

interface ActivePromotion {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountPercent: number;
  targetPlans: string[];
  billingCycle: string;
  endDate: string;
  showUpsell: boolean;
  bgColor?: string | null;
  textColor?: string | null;
  bannerMode?: string | null;
  bannerImageUrl?: string | null;
}

import { formatPriceIdr, planDisplayName, type Currency } from "@/lib/pricing";

const formatPrice = (_priceUsd: number, priceIdr: number, currency: Currency): string =>
  formatPriceIdr(priceIdr, currency);

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [currency, setCurrency] = useState<Currency>("IDR");
  const { toast } = useToast();
  
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });
  
  // Fetch subscription plans from database
  const { data: dbPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });
  
  // Fetch active public promotions
  const { data: activePromos = [] } = useQuery<ActivePromotion[]>({
    queryKey: ["/api/promotions/active"],
  });
  
  const trialDays = (platformSettings as any)?.trial_days ? parseInt((platformSettings as any).trial_days) : 14;

  // Get the first active promotion that applies to current billing cycle
  const currentBillingCycle = isYearly ? "annual" : "monthly";
  const applicablePromo = activePromos.find(p => 
    p.billingCycle === "both" || p.billingCycle === currentBillingCycle
  );

  // Check if promotion applies to a specific plan
  const getPromoForPlan = (planId: string) => {
    if (!applicablePromo) return null;
    const targets = applicablePromo.targetPlans || [];
    if (targets.includes("all")) return applicablePromo;
    if (targets.includes(planId)) return applicablePromo;
    if (targets.includes("upgrade") && (planId === "starter" || planId === "pro")) return applicablePromo;
    return null;
  };

  // Calculate discounted price
  const getDiscountedPrice = (price: number, planId: string) => {
    const promo = getPromoForPlan(planId);
    if (!promo) return price;
    return Math.round(price * (1 - promo.discountPercent / 100));
  };

  // Format remaining days for promo
  const getPromoRemainingDays = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Map database plans to display format
  const getDbPlan = (planId: string) => {
    return dbPlans.find((p: any) => p.id === planId);
  };
  
  const getDbPlanPrice = (planId: string, priceType: 'monthly' | 'annual') => {
    const dbPlan = getDbPlan(planId);
    if (dbPlan) {
      return priceType === 'monthly' ? dbPlan.monthlyPrice : dbPlan.annualPrice;
    }
    return null;
  };

  const getDbPlanPriceIdr = (planId: string, priceType: 'monthly' | 'annual') => {
    const dbPlan = getDbPlan(planId);
    if (dbPlan) {
      const v = priceType === 'monthly' ? dbPlan.monthlyPriceIdr : dbPlan.annualPriceIdr;
      return typeof v === 'number' ? v : 0;
    }
    return 0;
  };

  const getDbPlanName = (planId: string, fallback?: string) => {
    const dbPlan = getDbPlan(planId);
    return (dbPlan?.name as string) || planDisplayName(planId, fallback);
  };

  // Helper to format limit values
  const formatLimit = (value: number | undefined, suffix: string = "") => {
    if (value === undefined || value === null) return "0";
    if (value === -1) return "Unlimited";
    return value.toLocaleString() + suffix;
  };

  // Generate dynamic features from database plan
  const generatePlanFeatures = (planId: string, defaults: { agents: number; supervisors: number; conversations: number; sources: number }) => {
    const dbPlan = getDbPlan(planId);
    
    const agents = dbPlan?.agentsLimit ?? defaults.agents;
    const supervisors = dbPlan?.supervisorsLimit ?? defaults.supervisors;
    const conversations = dbPlan?.conversationsLimit ?? defaults.conversations;
    const sources = dbPlan?.sourcesLimit ?? defaults.sources;
    
    return {
      agents: agents === -1 ? "Unlimited" : agents,
      supervisors: supervisors === -1 ? "Unlimited" : supervisors,
      conversations: conversations === -1 ? "Unlimited" : conversations.toLocaleString(),
      sources: sources === -1 ? "Unlimited" : sources,
    };
  };

  const freeLimits = generatePlanFeatures('free', { agents: 1, supervisors: 1, conversations: 20, sources: 1 });
  const starterLimits = generatePlanFeatures('starter', { agents: 1, supervisors: 1, conversations: 2000, sources: 5 });
  const proLimits = generatePlanFeatures('pro', { agents: 3, supervisors: 3, conversations: 10000, sources: 20 });
  const enterpriseLimits = generatePlanFeatures('enterprise', { agents: 10, supervisors: 5, conversations: 50000, sources: -1 });

  // Get additional limits for comparison table
  const getDbLimit = (planId: string, field: string, defaultVal: number) => {
    const plan = getDbPlan(planId);
    const value = plan?.[field] ?? defaultVal;
    if (value === -1) return "Unlimited";
    return typeof value === 'number' ? value.toLocaleString() : value;
  };
  
  const getChatRetention = (planId: string, defaultHours: number) => {
    const plan = getDbPlan(planId);
    const hours = plan?.chatRetentionHours ?? defaultHours;
    if (hours === -1) return "Unlimited";
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const plans = [
    {
      planId: "starter",
      name: getDbPlanName("starter", "Starter"),
      description: "Untuk UMKM & toko online yang baru memulai.",
      monthlyPrice: getDbPlanPrice('starter', 'monthly') ?? 19,
      yearlyPrice: getDbPlanPrice('starter', 'annual') ?? 14,
      monthlyPriceIdr: getDbPlanPriceIdr('starter', 'monthly') || 299_000,
      yearlyPriceIdr: getDbPlanPriceIdr('starter', 'annual') || 224_250,
      features: [
        { text: `${starterLimits.agents} AI Agent${starterLimits.agents !== 1 ? 's' : ''}`, included: true },
        { text: `${starterLimits.supervisors} Supervisor${starterLimits.supervisors !== 1 ? 's' : ''}`, included: true },
        { text: `${starterLimits.conversations} conversations/month`, included: true },
        { text: `${starterLimits.sources} Knowledge sources`, included: true },
        { text: "Widget customization", included: true },
        { text: "Email support", included: true },
        { text: "Basic analytics", included: true },
        { text: "Remove Chatvice branding", included: true },
        { text: "Custom domain", included: false },
        { text: "API access", included: false },
        { text: "Identity verification", included: false },
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      planId: "pro",
      name: getDbPlanName("pro", "Pro"),
      description: "Sweet spot untuk bisnis menengah — paling laris.",
      monthlyPrice: getDbPlanPrice('pro', 'monthly') ?? 57,
      yearlyPrice: getDbPlanPrice('pro', 'annual') ?? 43,
      monthlyPriceIdr: getDbPlanPriceIdr('pro', 'monthly') || 899_000,
      yearlyPriceIdr: getDbPlanPriceIdr('pro', 'annual') || 674_250,
      features: [
        { text: `${proLimits.agents} AI Agent${proLimits.agents !== 1 ? 's' : ''}`, included: true },
        { text: `${proLimits.supervisors} Supervisor${proLimits.supervisors !== 1 ? 's' : ''}`, included: true },
        { text: `${proLimits.conversations} conversations/month`, included: true },
        { text: `${proLimits.sources} Knowledge sources`, included: true },
        { text: "Advanced analytics", included: true },
        { text: "Priority email support", included: true },
        { text: "Custom triggers", included: true },
        { text: "API access", included: true },
        { text: "Custom domain", included: true },
        { text: "Identity verification", included: true },
        { text: "Allowed domains control", included: true },
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      planId: "enterprise",
      name: getDbPlanName("enterprise", "Business"),
      description: "Untuk e-commerce besar & perusahaan dengan volume tinggi.",
      monthlyPrice: getDbPlanPrice('enterprise', 'monthly') ?? 145,
      yearlyPrice: getDbPlanPrice('enterprise', 'annual') ?? 109,
      monthlyPriceIdr: getDbPlanPriceIdr('enterprise', 'monthly') || 2_299_000,
      yearlyPriceIdr: getDbPlanPriceIdr('enterprise', 'annual') || 1_724_250,
      features: [
        { text: `${enterpriseLimits.agents} AI Agent${enterpriseLimits.agents !== 1 && enterpriseLimits.agents !== "Unlimited" ? 's' : ''}`, included: true },
        { text: `${enterpriseLimits.supervisors} Supervisor${enterpriseLimits.supervisors !== 1 && enterpriseLimits.supervisors !== "Unlimited" ? 's' : ''}`, included: true },
        { text: `${enterpriseLimits.conversations} conversations/month`, included: true },
        { text: `${enterpriseLimits.sources === "Unlimited" ? "Unlimited" : enterpriseLimits.sources} knowledge sources`, included: true },
        { text: "Advanced analytics", included: true },
        { text: "Dedicated support manager", included: true },
        { text: "Custom integrations", included: true },
        { text: "SLA guarantee", included: true },
        { text: "White-label solution", included: true },
        { text: "Custom domain", included: true },
        { text: "Identity verification", included: true },
        { text: "Priority queue", included: true },
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      planId: "custom",
      name: getDbPlanName("custom", "Enterprise"),
      description: "Korporat, marketplace, banking — solusi custom volume besar.",
      monthlyPrice: getDbPlanPrice('custom', 'monthly') ?? 475,
      yearlyPrice: getDbPlanPrice('custom', 'annual') ?? 356,
      monthlyPriceIdr: getDbPlanPriceIdr('custom', 'monthly') || 7_499_000,
      yearlyPriceIdr: getDbPlanPriceIdr('custom', 'annual') || 5_624_250,
      isCalculator: true as const,
      features: [
        { text: "Everything in Enterprise", included: true },
        { text: "Unlimited AI Agents", included: true },
        { text: "Unlimited Supervisors", included: true },
        { text: "Custom architecture", included: true },
        { text: "Dedicated account manager", included: true },
        { text: "Custom SLA", included: true },
        { text: "On-premise deployment option", included: true },
        { text: "24/7 Premium support", included: true },
        { text: "Personalized onboarding", included: true },
        { text: "Strategic account management", included: true },
      ],
      cta: "Try Pricing Calculator",
      popular: false,
    },
  ];

  const faqs = [
    {
      q: "Is there a free trial?",
      a: `Yes! All plans include a ${trialDays}-day free trial with full access to features. No credit card required.`
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept 1-Pay (QRIS) for Indonesian users, supporting GoPay, OVO, DANA, ShopeePay, and all e-wallets."
    },
    {
      q: "Can I change plans later?",
      a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
    },
    {
      q: "What happens if I exceed my message limit?",
      a: "You'll receive notifications as you approach your limit. You can upgrade or purchase additional message packs."
    },
    {
      q: "Do you offer refunds?",
      a: "We offer a 30-day money-back guarantee for annual subscriptions if you're not satisfied."
    },
    {
      q: "Is there a discount for annual billing?",
      a: "Yes! Annual billing saves you 20% compared to monthly billing."
    },
  ];

  const pricingSchema = useMemo(() => {
    const paidPlans = plans.filter(p => p.monthlyPrice !== null);
    return {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Chatvice",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://chatvice.app",
      "description": "AI-powered customer service chatbot platform with human escalation, real-time chat, and customizable widget for businesses.",
      "offers": paidPlans.map(plan => ({
        "@type": "Offer",
        "name": `Chatvice ${plan.name}`,
        "description": plan.description,
        "price": String(plan.monthlyPrice),
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": String(plan.monthlyPrice),
          "priceCurrency": "USD",
          "unitText": "MONTH",
          "billingDuration": "P1M"
        },
        "availability": "https://schema.org/InStock",
        "url": "https://chatvice.app/pricing"
      })),
    };
  }, [plans]);

  return (
    <PublicPageLayout
      title="Pricing - Plans & Pricing | Chatvice"
      description="Choose the perfect Chatvice plan for your business. Start free with our 14-day trial. Flexible monthly and annual pricing for startups to enterprises."
    >
      <SchemaMarkup id="pricing-software-application" schema={pricingSchema} />
      {/* Promotional Banner - Desktop: 1200x300px (4:1), Mobile: 426x182px */}
      {applicablePromo && (() => {
        const bannerMode = applicablePromo.bannerMode || "color";
        const hasImage = applicablePromo.bannerImageUrl;
        const hasMobileImage = (applicablePromo as any).bannerImageMobileUrl;
        const showText = bannerMode === "color" || bannerMode === "overlay";
        const showImage = (bannerMode === "image" || bannerMode === "overlay") && hasImage;
        
        return (
          <div 
            className="relative flex items-end justify-center w-full overflow-hidden aspect-[426/182] md:aspect-[4/1]" 
            style={{ 
              backgroundColor: showImage ? "transparent" : (applicablePromo.bgColor || "#16a34a"),
              color: applicablePromo.textColor || "#ffffff"
            }}
            data-testid="promo-banner"
          >
            {showImage && (
              <>
                <img 
                  src={applicablePromo.bannerImageUrl!} 
                  alt="" 
                  className={`absolute inset-0 w-full h-full object-cover ${hasMobileImage ? 'hidden md:block' : ''}`}
                  data-testid="promo-banner-image"
                />
                {hasMobileImage && (
                  <img 
                    src={(applicablePromo as any).bannerImageMobileUrl} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover md:hidden"
                    data-testid="promo-banner-image-mobile"
                  />
                )}
              </>
            )}
            {bannerMode === "overlay" && showImage && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
            )}
            {showText && (
              <div className="relative w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pb-4 sm:pb-6 flex flex-col items-start justify-end gap-1 text-left">
                <h2 className="flex items-center gap-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold drop-shadow-lg">
                  <Gift className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                  <span>{applicablePromo.name}</span>
                </h2>
                <p className="text-sm sm:text-base md:text-lg font-medium opacity-95">
                  Save {applicablePromo.discountPercent}% with code
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-white/20 px-3 py-1 rounded font-mono font-bold text-sm sm:text-base">{applicablePromo.code}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 bg-white/10 border-white/30 hover:bg-white/20 text-inherit"
                    onClick={() => {
                      navigator.clipboard.writeText(applicablePromo.code);
                      toast({ title: "Code copied!", description: `${applicablePromo.code} copied to clipboard` });
                    }}
                    data-testid="button-copy-promo-code"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm opacity-80 mt-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Ends in {getPromoRemainingDays(applicablePromo.endDate)} days</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Badge className="bg-white/20 text-white mb-4">
            <Zap className="w-3 h-3 mr-1" />
            Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-left">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mb-8 text-left">
            Choose the plan that fits your business. All plans include a {trialDays}-day free trial.
          </p>
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className={`text-sm ${!isYearly ? "text-white" : "text-purple-200"}`}>Bulanan</span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-white"
                data-testid="switch-billing-cycle"
              />
              <span className={`text-sm ${isYearly ? "text-white" : "text-purple-200"}`}>
                Tahunan
                <Badge className="ml-2 bg-green-500 text-white text-xs">Hemat 25%</Badge>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${currency === "IDR" ? "text-white" : "text-purple-200"}`}>Rupiah</span>
              <Switch
                checked={currency === "USD"}
                onCheckedChange={(v) => setCurrency(v ? "USD" : "IDR")}
                className="data-[state=checked]:bg-white"
                data-testid="switch-currency"
              />
              <span className={`text-sm ${currency === "USD" ? "text-white" : "text-purple-200"}`}>USD</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 -mt-8">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`p-8 relative flex flex-col ${plan.popular ? "pro-frosted-card scale-105" : ""}`}
                data-testid={`card-plan-${plan.planId}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0">
                    <Zap className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  
                  {plan.monthlyPrice ? (() => {
                    const planId = plan.planId;
                    const originalUsd = isYearly ? (plan.yearlyPrice || 0) : plan.monthlyPrice;
                    const originalIdr = isYearly ? plan.yearlyPriceIdr : plan.monthlyPriceIdr;
                    const promo = getPromoForPlan(planId);
                    const discountedUsd = getDiscountedPrice(originalUsd, planId);
                    const discountedIdr = promo ? Math.round(originalIdr * (1 - promo.discountPercent / 100)) : originalIdr;
                    const hasDiscount = !!promo && discountedUsd < originalUsd;
                    
                    return (
                      <>
                        {hasDiscount && (
                          <Badge className="bg-green-500 text-white text-xs mb-2" data-testid={`badge-discount-${planId}`}>
                            Hemat {promo?.discountPercent}%
                          </Badge>
                        )}
                        <div className="flex items-baseline justify-center gap-1 flex-wrap">
                          {hasDiscount && (
                            <span className="text-xl text-muted-foreground line-through mr-1">
                              {formatPrice(originalUsd, originalIdr, currency)}
                            </span>
                          )}
                          <span className={`text-4xl md:text-5xl font-bold ${hasDiscount ? 'text-green-600' : ''}`} data-testid={`text-price-${planId}`}>
                            {formatPrice(hasDiscount ? discountedUsd : originalUsd, hasDiscount ? discountedIdr : originalIdr, currency)}
                          </span>
                          <span className="text-muted-foreground text-sm">/bulan</span>
                        </div>
                        {currency === "IDR" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ≈ ${hasDiscount ? discountedUsd : originalUsd} USD
                          </p>
                        )}
                      </>
                    );
                  })() : (
                    <div className="text-4xl font-bold">Custom</div>
                  )}
                  
                  {isYearly && plan.monthlyPrice && (() => {
                    const planId = plan.planId;
                    const discountedUsd = getDiscountedPrice(plan.yearlyPrice || 0, planId);
                    const discountedIdr = (() => {
                      const promo = getPromoForPlan(planId);
                      return promo ? Math.round(plan.yearlyPriceIdr * (1 - promo.discountPercent / 100)) : plan.yearlyPriceIdr;
                    })();
                    const annualTotal = currency === "IDR" 
                      ? `Rp ${(discountedIdr * 12).toLocaleString("id-ID")}` 
                      : `$${discountedUsd * 12}`;
                    return (
                      <p className="text-sm text-muted-foreground mt-2">
                        Ditagih {annualTotal}/tahun • Hemat 25%
                      </p>
                    );
                  })()}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-purple-600 shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                      )}
                      <span className={feature.included ? "" : "text-muted-foreground/50"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {("isCalculator" in plan && plan.isCalculator) ? (
                  <CustomPlanRequestDialog
                    skipAuthCheck
                    trigger={
                      <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        size="lg"
                        data-testid={`button-plan-${plan.planId}`}
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        Try Pricing Calculator
                      </Button>
                    }
                  />
                ) : (
                  <Link href="/register">
                    <Button 
                      className={`w-full ${plan.popular ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                      data-testid={`button-plan-${plan.planId}`}
                    >
                      {plan.monthlyPrice === 0 ? "Mulai Gratis" : `Mulai Trial ${trialDays} Hari`}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-left mb-12">
            <h2 className="text-3xl font-bold mb-4">Compare Plans</h2>
            <p className="text-muted-foreground">Detailed feature comparison across all plans</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold">Fitur</th>
                  <th className="text-center py-4 px-4 font-semibold">{getDbPlanName("free", "Free")}</th>
                  <th className="text-center py-4 px-4 font-semibold">{getDbPlanName("starter", "Starter")}</th>
                  <th className="text-center py-4 px-4 font-semibold bg-purple-50 dark:bg-purple-950/20">{getDbPlanName("pro", "Pro")}</th>
                  <th className="text-center py-4 px-4 font-semibold">{getDbPlanName("enterprise", "Business")}</th>
                  <th className="text-center py-4 px-4 font-semibold">{getDbPlanName("custom", "Enterprise")}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI Agents", free: String(freeLimits.agents), starter: String(starterLimits.agents), pro: String(proLimits.agents), enterprise: String(enterpriseLimits.agents), custom: "Unlimited" },
                  { feature: "Supervisors", free: String(freeLimits.supervisors), starter: String(starterLimits.supervisors), pro: String(proLimits.supervisors), enterprise: String(enterpriseLimits.supervisors), custom: "Unlimited" },
                  { feature: "Monthly Conversations", free: freeLimits.conversations, starter: starterLimits.conversations, pro: proLimits.conversations, enterprise: enterpriseLimits.conversations, custom: "Unlimited" },
                  { feature: "Knowledge Sources", free: String(freeLimits.sources), starter: String(starterLimits.sources), pro: String(proLimits.sources), enterprise: String(enterpriseLimits.sources), custom: "Unlimited" },
                  { feature: "Chat History Retention", free: getChatRetention('free', 1), starter: getChatRetention('starter', 24), pro: getChatRetention('pro', 48), enterprise: getChatRetention('enterprise', 168), custom: "Unlimited" },
                  { feature: "Suggested Questions", free: getDbLimit('free', 'suggestedQuestionsLimit', 0), starter: getDbLimit('starter', 'suggestedQuestionsLimit', 5), pro: getDbLimit('pro', 'suggestedQuestionsLimit', 5), enterprise: getDbLimit('enterprise', 'suggestedQuestionsLimit', 5), custom: "Unlimited" },
                  { feature: "Widget Customization", free: "Basic", starter: true, pro: true, enterprise: true, custom: true },
                  { feature: "Remove Branding", free: false, starter: true, pro: true, enterprise: true, custom: true },
                  { feature: "Custom Triggers", free: false, starter: false, pro: true, enterprise: true, custom: true },
                  { feature: "API Access", free: false, starter: false, pro: true, enterprise: true, custom: true },
                  { feature: "Custom Domain", free: false, starter: false, pro: true, enterprise: true, custom: true },
                  { feature: "Identity Verification", free: false, starter: false, pro: true, enterprise: true, custom: true },
                  { feature: "Allowed Domains Control", free: false, starter: false, pro: true, enterprise: true, custom: true },
                  { feature: "Analytics", free: false, starter: "Basic", pro: "Advanced", enterprise: "Advanced", custom: "Full" },
                  { feature: "White-label Solution", free: false, starter: false, pro: false, enterprise: true, custom: true },
                  { feature: "SLA Guarantee", free: false, starter: false, pro: false, enterprise: true, custom: true },
                  { feature: "Custom Integrations", free: false, starter: false, pro: false, enterprise: true, custom: true },
                  { feature: "Dedicated Support", free: false, starter: false, pro: false, enterprise: true, custom: true },
                  { feature: "On-premise Option", free: false, starter: false, pro: false, enterprise: false, custom: true },
                  { feature: "Support", free: "Community", starter: "Email", pro: "Priority Email", enterprise: "Dedicated Manager", custom: "24/7 Premium" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-4 px-4 font-medium">{row.feature}</td>
                    <td className="text-center py-4 px-4">
                      {typeof row.free === "boolean" ? (
                        row.free ? <Check className="w-5 h-5 text-purple-600 mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                      ) : row.free}
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof row.starter === "boolean" ? (
                        row.starter ? <Check className="w-5 h-5 text-purple-600 mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                      ) : row.starter}
                    </td>
                    <td className="text-center py-4 px-4 bg-purple-50 dark:bg-purple-950/20">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? <Check className="w-5 h-5 text-purple-600 mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                      ) : row.pro}
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof row.enterprise === "boolean" ? (
                        row.enterprise ? <Check className="w-5 h-5 text-purple-600 mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                      ) : row.enterprise}
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof row.custom === "boolean" ? (
                        row.custom ? <Check className="w-5 h-5 text-purple-600 mx-auto" /> : <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                      ) : row.custom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-left mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {faqs.map((faq, i) => (
              <Card key={i} className="p-6">
                <h3 className="font-semibold mb-2 flex items-start gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  {faq.q}
                </h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-left">
            Start Your Free Trial Today
          </h2>
          <p className="text-lg text-purple-100 mb-8 max-w-2xl text-left">
            No credit card required. Get full access to all features for 14 days.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicPageLayout>
  );
}
