import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  X,
  ArrowRight,
  Zap,
  HelpCircle,
} from "lucide-react";
import PublicPageLayout from "./public-layout";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });
  
  const trialDays = (platformSettings as any)?.trial_days ? parseInt((platformSettings as any).trial_days) : 14;

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small businesses getting started with AI support.",
      monthlyPrice: 29,
      yearlyPrice: 24,
      features: [
        { text: "1 AI Agent", included: true },
        { text: "1 Supervisor", included: true },
        { text: "2,000 conversations/month", included: true },
        { text: "5 Knowledge sources", included: true },
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
      name: "Pro",
      description: "For growing teams that need more power and flexibility.",
      monthlyPrice: 99,
      yearlyPrice: 83,
      features: [
        { text: "3 AI Agents", included: true },
        { text: "3 Supervisors", included: true },
        { text: "10,000 conversations/month", included: true },
        { text: "20 Knowledge sources", included: true },
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
      name: "Enterprise",
      description: "For large organizations with custom needs.",
      monthlyPrice: 499,
      yearlyPrice: 416,
      features: [
        { text: "10 AI Agents", included: true },
        { text: "5 Supervisors", included: true },
        { text: "50,000 conversations/month", included: true },
        { text: "Unlimited knowledge sources", included: true },
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
      name: "Custom",
      description: "Tailored solutions for unique requirements.",
      monthlyPrice: null,
      yearlyPrice: null,
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
      cta: "Contact Sales",
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

  return (
    <PublicPageLayout>
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
          
          <div className="flex items-center gap-3">
            <span className={`text-sm ${!isYearly ? "text-white" : "text-purple-200"}`}>Monthly</span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-white"
            />
            <span className={`text-sm ${isYearly ? "text-white" : "text-purple-200"}`}>
              Yearly
              <Badge className="ml-2 bg-green-500 text-white text-xs">Save 20%</Badge>
            </span>
          </div>
        </div>
      </section>

      <section className="py-20 -mt-8">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`p-8 relative flex flex-col ${plan.popular ? "border-purple-500 shadow-xl shadow-purple-500/10 scale-105" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">
                    Most Popular
                  </Badge>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  
                  {plan.monthlyPrice ? (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold">
                        ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-bold">Custom</div>
                  )}
                  
                  {isYearly && plan.monthlyPrice && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Billed ${(plan.yearlyPrice || 0) * 12}/year
                    </p>
                  )}
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

                <Link href={plan.monthlyPrice ? "/register" : "/contact"}>
                  <Button 
                    className={`w-full ${plan.popular ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
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
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 font-semibold">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold bg-purple-50 dark:bg-purple-950/20">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold">Enterprise</th>
                  <th className="text-center py-4 px-4 font-semibold">Custom</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "AI Agents", free: "1", starter: "1", pro: "3", enterprise: "10", custom: "Unlimited" },
                  { feature: "Supervisors", free: "1", starter: "1", pro: "3", enterprise: "5", custom: "Unlimited" },
                  { feature: "Monthly Conversations", free: "20", starter: "2,000", pro: "10,000", enterprise: "50,000", custom: "Unlimited" },
                  { feature: "Knowledge Sources", free: "1", starter: "5", pro: "20", enterprise: "Unlimited", custom: "Unlimited" },
                  { feature: "Chat History Retention", free: "1 hour", starter: "12 hours", pro: "24 hours", enterprise: "24 hours", custom: "24 hours" },
                  { feature: "Suggested Questions", free: "0", starter: "5", pro: "5", enterprise: "5", custom: "Unlimited" },
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
