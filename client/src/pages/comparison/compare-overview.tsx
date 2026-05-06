import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PublicPageLayout from "../public-layout";
import { competitorsData } from "./competitors-data";

const competitors = Object.values(competitorsData);

const highlights = [
  {
    icon: Zap,
    title: "AI-first, not retrofitted",
    description: "Chatvice was designed from day one around AI automation — not a help desk that added a chatbot later.",
  },
  {
    icon: CheckCircle2,
    title: "Flat, predictable pricing",
    description: "No per-seat fees, no per-conversation caps that surprise you mid-month. One flat price covers everything.",
  },
  {
    icon: Shield,
    title: "Built for Southeast Asia",
    description: "QRIS payments, Bahasa Indonesia, WhatsApp OTP, and pricing in accessible ranges — not Western-market defaults.",
  },
];

export default function CompareOverviewPage() {
  return (
    <PublicPageLayout
      title="Chatvice Alternatives & Comparisons (2025) | Chatvice"
      description="See how Chatvice compares to Tawk.to, Intercom, Tidio, Zendesk, Freshdesk, LiveChat, and Drift. Detailed feature-by-feature comparisons to help you choose the right AI customer service platform."
    >
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-12 py-16">

        <div className="text-center mb-14">
          <Badge variant="secondary" className="mb-4">Competitor Comparisons</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
            How Chatvice stacks up
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Evaluating customer service platforms? We've done the research for you. Compare Chatvice side-by-side with the most popular alternatives on the market.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {highlights.map((item) => (
            <Card key={item.title}>
              <CardContent className="pt-6 flex flex-col gap-3">
                <item.icon className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold text-base">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-6">All comparisons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {competitors.map((c) => (
            <Card
              key={c.slug}
              className="hover-elevate group transition-shadow"
              data-testid={`compare-card-${c.slug}`}
            >
              <CardContent className="pt-6 pb-5 flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">Chatvice vs {c.name}</h3>
                  <Badge variant="outline" className="shrink-0 text-xs">2025</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {c.tagline}
                </p>
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.competitorPricing}</span>
                    {" "}vs{" "}
                    <span className="font-medium text-foreground">{c.chatvicePricing}</span>
                  </div>
                  <Link
                    href={`/vs/${c.slug}`}
                    data-testid={`compare-link-${c.slug}`}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 px-2"
                    >
                      Compare
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to make the switch?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Start your free trial today — no credit card required. Full AI automation, knowledge base, and human escalation from day one.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register">
              <Button className="bg-purple-600 hover:bg-purple-700" data-testid="compare-cta-register">
                Get Started Free
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" data-testid="compare-cta-pricing">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </PublicPageLayout>
  );
}
