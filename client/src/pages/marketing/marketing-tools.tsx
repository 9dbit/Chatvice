import { useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  Zap,
  TrendingUp,
  DollarSign,
  Check,
  X,
  ShoppingCart,
  Hotel,
  Gamepad2,
  Building2,
  ArrowRight,
  MessageCircle,
  Brain,
  Shield,
  BarChart3,
  CreditCard,
  Bot,
  Users,
  Globe,
  Rocket,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import PublicPageLayout from "../public-layout";
import { useTheme } from "@/components/theme-provider";
import chatviceLogoLight from "@assets/Chatvice-02_1769691434945.png";
import chatviceLogoDark from "@assets/Chatvice-04_1769691434945.png";
import heroBackgroundImage from "@assets/IMG_0185_1764870218768.jpeg";
import analyticsImage from "@assets/banner_human_analytics.png";
import simplicityImage from "@assets/banner_human_simplicity.png";
import securityImage from "@assets/banner_human_security.png";
import aiEngineImage from "@assets/banner_human_ai_engine.png";

const PLAN_FEATURES = {
  free: {
    name: "Free",
    price: "$0",
    priceSub: "forever",
    color: "border-border",
    badge: null,
    features: [
      { text: "1 AI Agent", ok: true },
      { text: "1 Supervisor", ok: true },
      { text: "20 conversations/month", ok: true },
      { text: "1 Knowledge source", ok: true },
      { text: "1 hr chat history", ok: true },
      { text: "Basic widget customization", ok: true },
      { text: "Community support", ok: true },
      { text: "Remove Chatvice branding", ok: false },
      { text: "Analytics", ok: false },
      { text: "API access", ok: false },
    ],
  },
  starter: {
    name: "Starter",
    price: "$29",
    priceSub: "/month",
    yearlyNote: "$24/mo billed yearly",
    color: "border-purple-300 dark:border-purple-700",
    badge: null,
    features: [
      { text: "1 AI Agent", ok: true },
      { text: "1 Supervisor", ok: true },
      { text: "2,000 conversations/month", ok: true },
      { text: "5 Knowledge sources", ok: true },
      { text: "24 hrs chat history", ok: true },
      { text: "5 Suggested questions", ok: true },
      { text: "Full widget customization", ok: true },
      { text: "Remove Chatvice branding", ok: true },
      { text: "Basic analytics", ok: true },
      { text: "Email support", ok: true },
      { text: "Custom domain", ok: false },
      { text: "API access", ok: false },
      { text: "Identity verification", ok: false },
    ],
  },
  pro: {
    name: "Pro",
    price: "$99",
    priceSub: "/month",
    yearlyNote: "$83/mo billed yearly",
    color: "border-purple-500",
    badge: "Most Popular",
    features: [
      { text: "3 AI Agents", ok: true },
      { text: "3 Supervisors", ok: true },
      { text: "10,000 conversations/month", ok: true },
      { text: "20 Knowledge sources", ok: true },
      { text: "48 hrs chat history", ok: true },
      { text: "Advanced analytics", ok: true },
      { text: "Priority email support", ok: true },
      { text: "Custom triggers", ok: true },
      { text: "API access", ok: true },
      { text: "Custom domain", ok: true },
      { text: "Identity verification", ok: true },
      { text: "Allowed domains control", ok: true },
      { text: "White-label", ok: false },
      { text: "SLA guarantee", ok: false },
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "$499",
    priceSub: "/month",
    yearlyNote: "$416/mo billed yearly",
    color: "border-amber-400 dark:border-amber-600",
    badge: null,
    features: [
      { text: "10 AI Agents", ok: true },
      { text: "5 Supervisors", ok: true },
      { text: "50,000 conversations/month", ok: true },
      { text: "Unlimited knowledge sources", ok: true },
      { text: "168 hrs (7 days) chat history", ok: true },
      { text: "Advanced analytics", ok: true },
      { text: "Dedicated support manager", ok: true },
      { text: "Custom integrations", ok: true },
      { text: "SLA guarantee", ok: true },
      { text: "White-label solution", ok: true },
      { text: "Custom domain", ok: true },
      { text: "Identity verification", ok: true },
      { text: "Priority queue", ok: true },
      { text: "On-premise option", ok: false },
    ],
  },
  custom: {
    name: "Custom",
    price: "Custom",
    priceSub: "pricing",
    color: "border-rose-400 dark:border-rose-600",
    badge: "Enterprise+",
    features: [
      { text: "Everything in Enterprise", ok: true },
      { text: "Unlimited AI Agents", ok: true },
      { text: "Unlimited Supervisors", ok: true },
      { text: "Unlimited conversations", ok: true },
      { text: "Custom architecture & workflow", ok: true },
      { text: "Dedicated account manager", ok: true },
      { text: "Custom SLA", ok: true },
      { text: "On-premise deployment", ok: true },
      { text: "24/7 Premium support", ok: true },
      { text: "Personalized onboarding", ok: true },
    ],
  },
};

function SectionWrapper({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className={`pdf-section ${className ?? ""}`}>
      {children}
    </div>
  );
}

function SectionLabel({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
        {number}
      </span>
      <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">
        {title}
      </span>
    </div>
  );
}

export default function MarketingToolsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const proposalRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const chatviceLogo =
    resolvedTheme === "dark" ? chatviceLogoDark : chatviceLogoLight;

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const sections = proposalRef.current?.querySelectorAll(".pdf-section");
      if (!sections || sections.length === 0) return;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;

      let firstPage = true;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: resolvedTheme === "dark" ? "#09090b" : "#ffffff",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        if (!firstPage) {
          pdf.addPage();
        }
        firstPage = false;

        if (imgHeight <= pageHeight - margin * 2) {
          const yOffset = margin + (pageHeight - margin * 2 - imgHeight) / 2;
          pdf.addImage(imgData, "JPEG", margin, yOffset, contentWidth, imgHeight);
        } else {
          let yPos = 0;
          while (yPos < canvas.height) {
            const sliceHeight = Math.min(
              canvas.height - yPos,
              Math.round((canvas.width * (pageHeight - margin * 2)) / contentWidth)
            );
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeight;
            const ctx = sliceCanvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(canvas, 0, -yPos);
            }
            const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
            const sliceImgHeight = (sliceHeight * contentWidth) / canvas.width;
            if (yPos > 0) pdf.addPage();
            pdf.addImage(sliceData, "JPEG", margin, margin, contentWidth, sliceImgHeight);
            yPos += sliceHeight;
          }
        }
      }

      pdf.save("Chatvice-Product-Proposal.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PublicPageLayout
      title="Marketing Tools — Product Proposal | Chatvice"
      description="Download Chatvice's official product proposal PDF. A complete sales deck covering features, pricing, use cases, and competitive advantages."
    >
      {/* ── Page Header ── */}
      <section className="bg-purple-600 text-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Badge className="bg-white/20 text-white mb-4">
            <Download className="w-3 h-3 mr-1" />
            Marketing Tools
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Product Proposal Deck
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mb-8">
            A complete sales deck ready to share with clients, partners, and prospects.
            Read it below or download the full PDF to your device.
          </p>
          <Button
            size="lg"
            className="bg-white text-purple-600 hover:bg-purple-50"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            data-testid="button-download-pdf-top"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </section>

      {/* ── Proposal Preview ── */}
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-16 space-y-4" ref={proposalRef}>

        {/* SLIDE 1 – COVER */}
        <SectionWrapper id="slide-cover" className="relative rounded-xl overflow-hidden min-h-[480px] flex flex-col justify-end">
          <img
            src={heroBackgroundImage}
            alt="Chatvice hero"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
          <div className="relative z-10 p-10 md:p-14">
            <img src={chatviceLogoDark} alt="Chatvice" className="h-10 mb-8 brightness-0 invert" />
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4">
              Turn Every Visitor<br />Into Revenue —<br />
              <span className="text-purple-400">Instantly.</span>
            </h1>
            <p className="text-lg text-white/80 mb-8">
              AI Live Chat + Automation + Conversion Engine
            </p>
            <div className="flex flex-wrap gap-4">
              {[
                { icon: Zap, label: "Response < 1 sec" },
                { icon: TrendingUp, label: "Conversion +30%" },
                { icon: DollarSign, label: "Cost ↓ up to 70%" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 text-white text-sm font-medium"
                >
                  <Icon className="w-4 h-4 text-purple-400" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>

        {/* SLIDE 2 – PROBLEM */}
        <SectionWrapper id="slide-problem" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={2} title="The Problem" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            Most Businesses Lose Customers<br />
            <span className="text-purple-600">Before They Even Say Hello.</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            {[
              { label: "Slow response loses leads instantly" },
              { label: "Lost leads — not followed up" },
              { label: "High manpower cost at scale" },
              { label: "24/7 support is impossible for humans" },
              { label: "No visibility into customer behavior" },
            ].map(({ label }) => (
              <div key={label} className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/30">
                <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xl font-bold text-muted-foreground">
            "Speed is revenue. Delay is loss."
          </p>
        </SectionWrapper>

        {/* SLIDE 3 – SOLUTION */}
        <SectionWrapper id="slide-solution" className="bg-purple-600 text-white rounded-xl p-10">
          <SectionLabel number={3} title="The Solution" />
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            AI-Powered Conversations<br />That Convert.
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Bot, text: "Automates customer replies 24/7" },
              { icon: CreditCard, text: "Closes transactions directly in chat" },
              { icon: Users, text: "Escalates seamlessly to human agents" },
              { icon: Globe, text: "Embeds on any website in minutes" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 bg-white/10 rounded-lg p-4">
                <Icon className="w-5 h-5 text-purple-200 shrink-0 mt-0.5" />
                <span className="text-white/90 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <p className="text-xl font-bold text-purple-200">
              "Your AI Sales Team — Working 24/7"
            </p>
          </div>
        </SectionWrapper>

        {/* SLIDE 4 – PRODUCT OVERVIEW */}
        <SectionWrapper id="slide-overview" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={4} title="Product Overview" />
          <h2 className="text-3xl font-bold mb-8">How Chatvice Works</h2>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { step: "01", icon: Globe, title: "Install Widget", desc: "Paste one line of code. Goes live on your website in under 5 minutes. No developer needed." },
              { step: "02", icon: Brain, title: "Train AI Knowledge Base", desc: "Feed Chatvice your FAQs, product info, and docs. The AI learns your business instantly." },
              { step: "03", icon: BarChart3, title: "Monitor & Escalate", desc: "Track conversations, escalate complex queries to supervisors, and analyze performance." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-sm font-bold flex items-center justify-center shrink-0">
                    {step}
                  </span>
                  <Icon className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <img src={simplicityImage} alt="Easy setup" className="rounded-lg w-full object-cover h-40" />
            <img src={aiEngineImage} alt="AI engine" className="rounded-lg w-full object-cover h-40" />
          </div>
        </SectionWrapper>

        {/* SLIDE 5 – CORE FEATURES */}
        <SectionWrapper id="slide-features" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={5} title="Core Features" />
          <h2 className="text-3xl font-bold mb-8">Everything You Need to Convert</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: Bot,
                img: aiEngineImage,
                title: "AI Chat Engine (LEXA1)",
                desc: "Auto-reply with natural language. Multi-language support. Learns from your knowledge base with semantic search.",
              },
              {
                icon: MessageCircle,
                img: simplicityImage,
                title: "Live Chat System",
                desc: "Real-time WebSocket messaging with typing indicators. Multi-agent dashboard for your support team.",
              },
              {
                icon: Zap,
                img: null,
                title: "Smart Automation",
                desc: "Auto follow-up, behavior-based triggers, lead qualification — all running while you sleep.",
              },
              {
                icon: CreditCard,
                img: null,
                title: "In-Chat Transactions",
                desc: "Payment links, QRIS, VA, e-wallets — all inside the chat. Auto-confirmation via webhook. Your unique edge.",
              },
              {
                icon: BarChart3,
                img: analyticsImage,
                title: "Analytics & Insight",
                desc: "Chat history, conversion tracking, customer behavior reports. Know what's working.",
              },
              {
                icon: Shield,
                img: securityImage,
                title: "Enterprise Security",
                desc: "Domain binding, identity verification, allowed-domains control, SLA-grade infrastructure.",
              },
            ].map(({ icon: Icon, img, title, desc }) => (
              <div key={title} className="border border-border rounded-lg overflow-hidden">
                {img && (
                  <img src={img} alt={title} className="w-full h-28 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-sm">{title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionWrapper>

        {/* SLIDE 6 – POSITIONING */}
        <SectionWrapper id="slide-positioning" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={6} title="Positioning" />
          <h2 className="text-3xl font-bold mb-8">
            Chatvice Is Not Just a Chatbot.
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">What we are NOT</p>
              <div className="space-y-3">
                {["Chatbot AI", "Live Chat Tool", "Customer Service Tool"].map((label) => (
                  <div key={label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <X className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-muted-foreground line-through">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-600 mb-4 uppercase tracking-wide">What we ARE</p>
              <div className="space-y-3">
                {[
                  { label: "AI Conversation Infrastructure", icon: Brain },
                  { label: "Revenue Automation Layer", icon: TrendingUp },
                  { label: "AI Sales & Support Engine", icon: Rocket },
                ].map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/30">
                    <Icon className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 p-6 bg-purple-600 rounded-xl text-center">
            <p className="text-white font-bold text-lg">"From Chat → Conversion → Revenue"</p>
          </div>
        </SectionWrapper>

        {/* SLIDE 7 – COMPETITIVE ADVANTAGE */}
        <SectionWrapper id="slide-competitive" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={7} title="Competitive Advantage" />
          <h2 className="text-3xl font-bold mb-8">Why Chatvice Wins</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Feature</th>
                  <th className="text-center py-3 px-4 font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/20">Chatvice</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Traditional Live Chat</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">WhatsApp CS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Response Speed", chatvice: "⚡ Instant AI", traditional: "Human delay", whatsapp: "Manual" },
                  { feature: "Cost", chatvice: "Low", traditional: "High", whatsapp: "High" },
                  { feature: "24/7 Availability", chatvice: true, traditional: false, whatsapp: false },
                  { feature: "Automation", chatvice: "Advanced", traditional: "Limited", whatsapp: "None" },
                  { feature: "In-chat Payment", chatvice: true, traditional: false, whatsapp: false },
                  { feature: "Human Escalation", chatvice: "Seamless", traditional: "Yes", whatsapp: false },
                  { feature: "Analytics", chatvice: "Advanced", traditional: "Basic", whatsapp: false },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 font-medium">{row.feature}</td>
                    <td className="py-3 px-4 bg-purple-50 dark:bg-purple-950/20 text-center">
                      {typeof row.chatvice === "boolean" ? (
                        row.chatvice ? <Check className="w-4 h-4 text-purple-600 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      ) : (
                        <span className="text-purple-700 dark:text-purple-300 font-medium">{row.chatvice}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground">
                      {typeof row.traditional === "boolean" ? (
                        row.traditional ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      ) : row.traditional}
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground">
                      {typeof row.whatsapp === "boolean" ? (
                        row.whatsapp ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      ) : row.whatsapp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionWrapper>

        {/* SLIDE 8 – VALUE PROPOSITION */}
        <SectionWrapper id="slide-value" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={8} title="Value Proposition" />
          <h2 className="text-3xl font-bold mb-8">The Business Case for Chatvice</h2>
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {[
              { icon: DollarSign, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30", title: "Cost Effective", points: ["Replace 3–5 CS staff", "Reduce opex up to 70%", "No overtime, no sick days"] },
              { icon: Zap, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-100 dark:border-yellow-900/30", title: "Instant Response", points: ["<1 second reply time", "Zero missed leads", "Always available 24/7"] },
              { icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30", title: "More Conversions", points: ["Instant engagement", "Guided purchase flow", "AI upsell suggestions"] },
            ].map(({ icon: Icon, color, bg, title, points }) => (
              <div key={title} className={`border rounded-xl p-5 ${bg}`}>
                <Icon className={`w-6 h-6 ${color} mb-3`} />
                <h3 className="font-bold mb-3">{title}</h3>
                <ul className="space-y-1">
                  {points.map((p) => (
                    <li key={p} className="text-xs text-muted-foreground flex items-center gap-2">
                      <Check className="w-3 h-3 text-current shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="bg-purple-600 rounded-xl p-6 text-white">
            <p className="text-lg font-bold mb-3 text-center">
              "Your customers don't wait. Why should your response?"
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-purple-100">
              <span>1 CS staff = ±Rp 4–6 juta/bulan</span>
              <span className="text-purple-300 font-bold">vs</span>
              <span>Chatvice = mulai dari Free</span>
            </div>
          </div>
        </SectionWrapper>

        {/* SLIDE 9 – USE CASES */}
        <SectionWrapper id="slide-usecases" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={9} title="Use Cases" />
          <h2 className="text-3xl font-bold mb-8">Built for Every Industry</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: ShoppingCart,
                color: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30",
                iconColor: "text-blue-600",
                title: "E-Commerce",
                points: ["Auto product Q&A & recommendations", "Checkout & order status in chat", "Cart abandonment follow-up"],
              },
              {
                icon: Hotel,
                color: "bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30",
                iconColor: "text-teal-600",
                title: "Hospitality",
                points: ["Room booking & availability via chat", "AI concierge for guests", "Service request handling 24/7"],
              },
              {
                icon: Gamepad2,
                color: "bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30",
                iconColor: "text-purple-600",
                title: "Gaming / Top-Up",
                points: ["Automated deposit flow in-chat", "Anti-fraud domain binding", "Instant transaction confirmation"],
              },
              {
                icon: Building2,
                color: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30",
                iconColor: "text-amber-600",
                title: "Corporate / Service",
                points: ["Intelligent lead generation", "Appointment booking automation", "Internal helpdesk & support"],
              },
            ].map(({ icon: Icon, color, iconColor, title, points }) => (
              <div key={title} className={`border rounded-xl p-5 ${color}`}>
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                  <h3 className="font-bold">{title}</h3>
                </div>
                <ul className="space-y-2">
                  {points.map((p) => (
                    <li key={p} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Check className="w-3 h-3 text-current shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionWrapper>

        {/* SLIDE 10 – PRICING */}
        <SectionWrapper id="slide-pricing" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={10} title="Pricing" />
          <h2 className="text-3xl font-bold mb-2">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground mb-8">
            All plans include a 14-day free trial. Annual billing saves 20%.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Object.values(PLAN_FEATURES).map((plan) => (
              <div
                key={plan.name}
                className={`relative border-2 rounded-xl p-5 flex flex-col gap-3 ${plan.color} ${plan.badge === "Most Popular" ? "shadow-lg shadow-purple-500/10" : ""}`}
              >
                {plan.badge && (
                  <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap ${plan.badge === "Most Popular" ? "bg-purple-600" : "bg-rose-500"}`}>
                    {plan.badge}
                  </Badge>
                )}
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.priceSub}</span>
                  </div>
                  {"yearlyNote" in plan && (
                    <p className="text-xs text-muted-foreground mt-1">{(plan as any).yearlyNote}</p>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className={`flex items-start gap-2 text-xs ${f.ok ? "" : "text-muted-foreground/50"}`}>
                      {f.ok ? (
                        <Check className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-0.5" />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground italic">
            "Less than 1 coffee per month — for a 24/7 AI sales team."
          </p>
        </SectionWrapper>

        {/* SLIDE 11 – DEMO FLOW */}
        <SectionWrapper id="slide-demo" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={11} title="Demo Flow" />
          <h2 className="text-3xl font-bold mb-8">From Visitor to Payment — In One Conversation.</h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-purple-200 dark:bg-purple-800" />
            <div className="space-y-4">
              {[
                { step: "01", title: "Visitor enters your website", desc: "The Chatvice widget loads instantly — no page speed impact." },
                { step: "02", title: "AI greets the visitor", desc: "LEXA1 sends a personalized greeting based on the page they're viewing." },
                { step: "03", title: "Visitor asks a question", desc: "Natural language conversation — feels like chatting with a real expert." },
                { step: "04", title: "AI answers & recommends", desc: "Pulls from your knowledge base, recommends products or services." },
                { step: "05", title: "Visitor clicks 'Buy'", desc: "The AI presents payment options directly inside the chat." },
                { step: "06", title: "Payment processed", desc: "QRIS / VA / e-wallet — transaction completed without leaving the chat." },
                { step: "07", title: "AI confirms the order", desc: "Instant confirmation message with order details. Deal closed." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="relative flex items-start gap-4 pl-12">
                  <div className="absolute left-3 w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center z-10 -translate-x-1/2">
                    {step}
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 flex-1">
                    <h3 className="font-bold text-sm">{title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionWrapper>

        {/* SLIDE 12 – VISION */}
        <SectionWrapper id="slide-vision" className="bg-card border border-border rounded-xl p-10">
          <SectionLabel number={12} title="Future Vision" />
          <h2 className="text-3xl font-bold mb-4">The Big Play</h2>
          <p className="text-muted-foreground mb-8">
            Chatvice is building the AI communication infrastructure for the next generation of businesses.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Brain, title: "AI Memory", desc: "Personalized, behavior-based responses. Chatvice remembers every customer interaction." },
              { icon: Sparkles, title: "Scheduled AI Follow-up", desc: "Smart reminders and re-engagement — automated but personal." },
              { icon: Globe, title: "Cross-Platform", desc: "Web → Mobile → WhatsApp → API. Meet customers wherever they are." },
              { icon: Zap, title: "Behavior Prediction", desc: "Trigger conversations before the customer asks. Proactive, not reactive." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-5 border border-border rounded-xl bg-muted/20">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionWrapper>

        {/* SLIDE 13 – CTA */}
        <SectionWrapper id="slide-cta" className="bg-purple-600 text-white rounded-xl p-10 text-center">
          <SectionLabel number={13} title="Get Started" />
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Start Converting Your<br />Visitors Today.
          </h2>
          <p className="text-purple-100 text-lg mb-8 max-w-xl mx-auto">
            14-day free trial. No credit card required. Live in 5 minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <Link href="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50" data-testid="button-cta-try-free">
                Try Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="border-white/50 text-white backdrop-blur-sm" data-testid="button-cta-start-trial">
                Start Free Trial
              </Button>
            </Link>
            <a href="mailto:hello@chatvice.app">
              <Button size="lg" variant="outline" className="border-white/50 text-white backdrop-blur-sm" data-testid="button-cta-contact-sales">
                Contact Sales
              </Button>
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-purple-200">
            <span className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              chatvice.app
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              hello@chatvice.app
            </span>
          </div>
        </SectionWrapper>
      </div>

      {/* ── Bottom CTA ── */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to share this proposal?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Download the full PDF and send it to clients, partners, or your team.
          </p>
          <Button
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            data-testid="button-download-pdf-bottom"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF — Chatvice-Product-Proposal.pdf
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Multi-page A4 PDF · Includes all 13 sections · Instant browser download
          </p>
        </div>
      </section>
    </PublicPageLayout>
  );
}
