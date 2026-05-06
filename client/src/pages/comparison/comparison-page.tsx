import { useEffect, useMemo } from "react";
import { SchemaMarkup } from "@/components/seo/schema-markup";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check,
  X,
  ArrowRight,
  Zap,
  Star,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import PublicPageLayout from "../public-layout";
import type { CompetitorData } from "./competitors-data";

interface ComparisonPageProps {
  competitor: CompetitorData;
}

export default function ComparisonPage({ competitor }: ComparisonPageProps) {
  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": competitor.faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.a,
        },
      })),
    };
    const scriptId = `vs-${competitor.slug}-faq-jsonld`;
    let el = document.getElementById(scriptId);
    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      (el as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(faqSchema);
    return () => {
      const toRemove = document.getElementById(scriptId);
      if (toRemove) toRemove.remove();
    };
  }, [competitor.slug, competitor.faqs]);

  const breadcrumbSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://chatvice.app" },
      { "@type": "ListItem", "position": 2, "name": `Chatvice vs ${competitor.name}`, "item": `https://chatvice.app/vs/${competitor.slug}` }
    ]
  }), [competitor.slug, competitor.name]);

  const chatviceFeatureCount = competitor.features.filter(
    (f) => f.chatvice === true || (typeof f.chatvice === "string" && f.chatvice.length > 0)
  ).length;
  const competitorFeatureCount = competitor.features.filter(
    (f) => f.competitor === true || (typeof f.competitor === "string" && f.competitor.length > 0)
  ).length;

  return (
    <PublicPageLayout
      title={competitor.metaTitle}
      description={competitor.metaDescription}
    >
      <SchemaMarkup id={`vs-${competitor.slug}-breadcrumb-jsonld`} schema={breadcrumbSchema} />
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Badge className="bg-white/20 text-white mb-4">
            <TrendingDown className="w-3 h-3 mr-1" />
            Comparison
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Chatvice vs {competitor.name}
          </h1>
          <p className="text-lg md:text-xl text-purple-100 max-w-3xl mb-8 leading-relaxed">
            {competitor.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-white text-purple-600 hover:bg-purple-50"
                data-testid="button-hero-start-trial"
              >
                Try Chatvice Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                data-testid="button-hero-view-pricing"
              >
                See Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="text-center p-6">
              <div className="text-4xl font-bold text-purple-600 mb-1">{chatviceFeatureCount}</div>
              <div className="text-sm text-muted-foreground font-medium">features in Chatvice</div>
              <div className="text-xs text-muted-foreground mt-1">out of {competitor.features.length} compared</div>
            </Card>
            <Card className="text-center p-6">
              <div className="text-4xl font-bold text-muted-foreground mb-1">{competitorFeatureCount}</div>
              <div className="text-sm text-muted-foreground font-medium">features in {competitor.name}</div>
              <div className="text-xs text-muted-foreground mt-1">out of {competitor.features.length} compared</div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              Feature Comparison
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Chatvice vs {competitor.name}: Feature by Feature
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See exactly what you get with each platform before making your decision.
            </p>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/50 px-4 py-3 font-semibold text-sm">
              <div>Feature</div>
              <div className="text-center text-purple-600">Chatvice</div>
              <div className="text-center text-muted-foreground">{competitor.name}</div>
            </div>
            {competitor.features.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 px-4 py-3 text-sm border-t border-border items-center ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                data-testid={`comparison-row-${i}`}
              >
                <div className="font-medium pr-4">{row.feature}</div>
                <div className="text-center">
                  {row.chatvice === true ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                  ) : row.chatvice === false ? (
                    <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                  ) : (
                    <span className="text-purple-600 font-medium text-xs">{row.chatvice}</span>
                  )}
                </div>
                <div className="text-center">
                  {row.competitor === true ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                  ) : row.competitor === false ? (
                    <X className="w-5 h-5 text-muted-foreground/40 mx-auto" />
                  ) : (
                    <span className="text-muted-foreground text-xs">{row.competitor}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              5 Key Reasons
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Businesses Switch from {competitor.name} to Chatvice
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitor.differentiators.map((item, i) => (
              <Card key={i} className="p-6" data-testid={`differentiator-card-${i}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-base leading-tight">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pricing Comparison
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See which platform delivers more value for your budget.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="p-8 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg">Chatvice</div>
                  <div className="text-xs text-muted-foreground">AI-first customer service</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-1">{competitor.chatvicePricing}</div>
              <div className="text-sm text-muted-foreground mb-6">{competitor.chatvicePricingNote}</div>
              <ul className="space-y-2 mb-6">
                {["Full AI automation included", "Flat pricing — all agents included", "14-day free trial, no credit card", "Knowledge base + semantic search", "Human escalation + analytics"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full bg-purple-600 hover:bg-purple-700" data-testid="button-pricing-chatvice-cta">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>

            <Card className="p-8 opacity-80">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-bold text-lg">{competitor.name}</div>
                  <div className="text-xs text-muted-foreground">{competitor.targetAudience.split(" ").slice(0, 5).join(" ")}...</div>
                </div>
              </div>
              <div className="text-3xl font-bold text-muted-foreground mb-1">{competitor.competitorPricing}</div>
              <div className="text-sm text-muted-foreground mb-6">{competitor.competitorPricingNote}</div>
              <div className="p-4 bg-muted/50 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground italic">
                  {competitor.competitorWeakness}
                </p>
              </div>
              <Button variant="outline" className="w-full" disabled>
                {competitor.name} Pricing
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Chatvice vs {competitor.name}: Common Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              {competitor.faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-border rounded-lg px-6"
                  data-testid={`faq-item-${i}`}
                >
                  <AccordionTrigger className="text-left font-medium py-4 hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Switch from {competitor.name}?
          </h2>
          <p className="text-purple-100 text-lg max-w-2xl mx-auto mb-8">
            Join businesses that have already moved to Chatvice. Start your 14-day free trial
            today — no credit card required, no implementation consultant needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-white text-purple-600 hover:bg-purple-50"
                data-testid="button-cta-start-trial"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/features">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                data-testid="button-cta-see-features"
              >
                See All Features
              </Button>
            </Link>
          </div>
          <p className="text-purple-200 text-sm mt-6">
            Questions? <a href="mailto:hello@chatvice.app" className="underline underline-offset-2">Contact our team</a> — we'll help you migrate.
          </p>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground">Compare Chatvice with other platforms</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { name: "Tawk.to", slug: "tawkto" },
              { name: "Intercom", slug: "intercom" },
              { name: "Tidio", slug: "tidio" },
              { name: "Zendesk", slug: "zendesk" },
              { name: "Freshdesk", slug: "freshdesk" },
              { name: "LiveChat", slug: "livechat" },
              { name: "Drift", slug: "drift" },
            ]
              .filter((c) => c.slug !== competitor.slug)
              .map((c) => (
                <Link key={c.slug} href={`/vs/${c.slug}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-compare-${c.slug}`}
                  >
                    Chatvice vs {c.name}
                  </Button>
                </Link>
              ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
