import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, FileText, Check, Share2, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { SiWhatsapp, SiX, SiLinkedin } from "react-icons/si";
import PublicPageLayout from "../public-layout";
import { solutionsData } from "../solutions/solutions-data";

const slugToLabel: Record<string, string> = {
  "chatbot-customer-service": "Chatbot Customer Service",
  "ai-chatbot-whatsapp": "AI Chatbot WhatsApp",
  "live-chat-website": "Live Chat Website",
  "chatbot-toko-online": "Chatbot Toko Online",
  "ai-chatbot-gratis": "Chatbot Gratis",
  "alternatif-tawkto": "Alternatif Tawk.to",
};

function buildShareUrl(slug: string): string {
  const base = `${window.location.origin}/${slug}`;
  const merchantId = localStorage.getItem("merchantId");
  const params = new URLSearchParams({
    utm_source: "chatvice",
    utm_medium: "merchant-share",
    utm_campaign: "solution-page",
    ...(merchantId ? { utm_content: merchantId } : {}),
  });
  return `${base}?${params.toString()}`;
}

function SolutionShareRow({ slug, h1, subtitle }: { slug: string; h1: string; subtitle: string }) {
  const [copied, setCopied] = useState(false);

  const url = buildShareUrl(slug);
  const text = `${h1} — ${subtitle}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <Card data-testid={`card-solution-share-${slug}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-2">
              {slugToLabel[slug] || slug}
            </Badge>
            <CardTitle className="text-base leading-snug">{h1}</CardTitle>
          </div>
          <Link href={`/${slug}`}>
            <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground shrink-0" data-testid={`link-solution-open-${slug}`}>
              <ExternalLink className="w-3 h-3" />
              Buka
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{subtitle}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            data-testid={`button-copy-link-${slug}`}
            className="gap-2"
          >
            {copied ? <CheckCheck className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-whatsapp-${slug}`}>
            <Button size="sm" variant="outline" className="gap-2">
              <SiWhatsapp className="w-3 h-3 text-green-500" />
              WhatsApp
            </Button>
          </a>
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-twitter-${slug}`}>
            <Button size="sm" variant="outline" className="gap-2">
              <SiX className="w-3 h-3" />
              X
            </Button>
          </a>
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-linkedin-${slug}`}>
            <Button size="sm" variant="outline" className="gap-2">
              <SiLinkedin className="w-3 h-3 text-blue-600" />
              LinkedIn
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

async function generateProposalPDF() {
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;

  const PURPLE = [109, 40, 217] as const;
  const PURPLE_LIGHT = [237, 233, 254] as const;
  const WHITE = [255, 255, 255] as const;
  const DARK = [24, 24, 27] as const;
  const GRAY = [113, 113, 122] as const;
  const GRAY_LIGHT = [244, 244, 245] as const;
  const GREEN = [22, 163, 74] as const;
  const RED = [220, 38, 38] as const;
  const AMBER = [217, 119, 6] as const;

  function setFont(
    size: number,
    style: "normal" | "bold" | "italic" = "normal",
    color: readonly [number, number, number] = DARK
  ) {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", style);
    pdf.setTextColor(...color);
  }

  function fill(color: readonly [number, number, number]) {
    pdf.setFillColor(...color);
  }

  function drawRect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: readonly [number, number, number]
  ) {
    fill(color);
    pdf.rect(x, y, w, h, "F");
  }

  function drawPageHeader(
    slideNum: number,
    title: string,
    bgColor: readonly [number, number, number] = PURPLE
  ) {
    drawRect(0, 0, W, H, WHITE);
    drawRect(0, 0, W, 42, bgColor);
    setFont(8, "normal", [255, 255, 255] as const);
    pdf.text(`CHATVICE · PRODUCT PROPOSAL  ·  SLIDE ${slideNum} / 13`, 14, 10);
    setFont(22, "bold", [255, 255, 255] as const);
    pdf.text(title, 14, 30);
    drawRect(0, 42, W, 0.5, [200, 200, 200] as const);
  }

  function bullet(
    x: number,
    y: number,
    text: string,
    ok: boolean | null = null
  ): number {
    if (ok === true) {
      pdf.setTextColor(...GREEN);
      pdf.text("✓", x, y);
    } else if (ok === false) {
      pdf.setTextColor(...RED);
      pdf.text("✗", x, y);
    } else {
      pdf.setTextColor(...PURPLE);
      pdf.text("•", x, y);
    }
    setFont(9, "normal", DARK);
    const lines = pdf.splitTextToSize(text, W - x - 24);
    pdf.text(lines, x + 6, y);
    return (lines.length - 1) * 4.5;
  }

  // ─────────────────────────────────────────────
  // SLIDE 1 — COVER
  // ─────────────────────────────────────────────
  drawRect(0, 0, W, H, PURPLE);
  drawRect(0, H - 60, W, 60, [88, 28, 185] as const);
  setFont(11, "bold", [255, 255, 255] as const);
  pdf.text("CHATVICE", 14, 24);
  setFont(9, "normal", [196, 181, 253] as const);
  pdf.text("AI CUSTOMER SERVICE PLATFORM", 14, 32);
  setFont(28, "bold", [255, 255, 255] as const);
  const headline = pdf.splitTextToSize(
    "Turn Every Visitor\nInto Revenue —\nInstantly.",
    W - 28
  );
  pdf.text(headline, 14, 70);
  setFont(11, "normal", [196, 181, 253] as const);
  pdf.text("AI Live Chat  ·  Automation  ·  Conversion Engine", 14, 130);

  const stats = [
    ["< 1 sec", "Response Time"],
    ["+30%", "Conversion Rate"],
    ["−70%", "Support Cost"],
  ];
  stats.forEach(([val, label], i) => {
    const bx = 14 + i * 62;
    drawRect(bx, 148, 56, 28, [88, 28, 185] as const);
    setFont(16, "bold", [255, 255, 255] as const);
    pdf.text(val, bx + 28, 161, { align: "center" });
    setFont(7, "normal", [196, 181, 253] as const);
    pdf.text(label, bx + 28, 169, { align: "center" });
  });

  setFont(8, "normal", [196, 181, 253] as const);
  pdf.text("chatvice.app  ·  hello@chatvice.app", 14, H - 14);
  setFont(8, "normal", [196, 181, 253] as const);
  pdf.text("CONFIDENTIAL — FOR PARTNER USE ONLY", W - 14, H - 14, {
    align: "right",
  });

  // ─────────────────────────────────────────────
  // SLIDE 2 — THE PROBLEM
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(2, "The Problem");
  setFont(13, "bold", DARK);
  pdf.text(
    "Most Businesses Lose Customers Before They Even Say Hello.",
    14,
    58
  );

  const problems = [
    "Slow response (>5 min) causes 78% of leads to abandon",
    "Human CS teams cannot scale beyond business hours",
    "High operational cost — 1 CS agent = Rp 4–6 juta/month",
    "No visibility into what customers are asking or why they leave",
    "Inconsistent answers damage brand trust and repeat purchases",
  ];
  problems.forEach((p, i) => {
    drawRect(14, 68 + i * 24, W - 28, 20, GRAY_LIGHT);
    setFont(9, "normal", DARK);
    bullet(20, 81 + i * 24, p, false);
  });

  drawRect(14, 200, W - 28, 20, PURPLE);
  setFont(12, "bold", [255, 255, 255] as const);
  pdf.text('"Speed is revenue. Delay is loss."', W / 2, 213, {
    align: "center",
  });

  // ─────────────────────────────────────────────
  // SLIDE 3 — THE SOLUTION
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(3, "The Solution");

  drawRect(14, 50, W - 28, 30, PURPLE_LIGHT);
  setFont(14, "bold", PURPLE);
  pdf.text("AI-Powered Conversations That Convert.", 14 + (W - 28) / 2, 69, {
    align: "center",
  });

  const solutions = [
    ["AI Chatbot 24/7", "Answers every customer instantly, even at 3am"],
    ["In-Chat Payments", "Close transactions without leaving the conversation"],
    ["Human Escalation", "Seamlessly hand off to supervisors when needed"],
    ["Embeds Anywhere", "1 line of code — live on your website in 5 minutes"],
  ];
  solutions.forEach(([title, desc], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = 14 + col * 91;
    const by = 92 + row * 56;
    drawRect(bx, by, 85, 50, GRAY_LIGHT);
    setFont(10, "bold", PURPLE);
    pdf.text(title, bx + 8, by + 14);
    setFont(8, "normal", GRAY);
    const lines = pdf.splitTextToSize(desc, 68);
    pdf.text(lines, bx + 8, by + 24);
  });

  drawRect(14, 210, W - 28, 20, DARK);
  setFont(12, "bold", [255, 255, 255] as const);
  pdf.text('"Your AI Sales Team — Working 24/7"', W / 2, 223, {
    align: "center",
  });

  // ─────────────────────────────────────────────
  // SLIDE 4 — PRODUCT OVERVIEW
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(4, "Product Overview");
  setFont(12, "bold", DARK);
  pdf.text("How Chatvice Works — 3 Simple Steps", 14, 58);

  const steps = [
    [
      "01  Install Widget",
      "Paste one line of code. Live on your website in under 5 minutes. No developer needed.",
    ],
    [
      "02  Train Knowledge Base",
      "Feed Chatvice your FAQs, product info, and docs. The AI learns your business instantly.",
    ],
    [
      "03  Monitor & Convert",
      "Track conversations, escalate complex queries to supervisors, and analyze performance.",
    ],
  ];
  steps.forEach(([title, desc], i) => {
    drawRect(14, 68 + i * 48, W - 28, 42, i === 1 ? PURPLE_LIGHT : GRAY_LIGHT);
    setFont(11, "bold", i === 1 ? PURPLE : DARK);
    pdf.text(title, 22, 83 + i * 48);
    setFont(9, "normal", GRAY);
    const lines = pdf.splitTextToSize(desc, W - 50);
    pdf.text(lines, 22, 93 + i * 48);
  });

  setFont(9, "normal", GRAY);
  pdf.text(
    "Chatvice integrates with your existing website via a lightweight JavaScript snippet.",
    14,
    220
  );
  pdf.text(
    "No backend changes required. Works with WordPress, Shopify, custom HTML, and more.",
    14,
    228
  );

  // ─────────────────────────────────────────────
  // SLIDE 5 — CORE FEATURES
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(5, "Core Features");

  const features = [
    [
      "AI Chat Engine (LEXA1)",
      "Auto-reply with natural language. Multi-language. Learns from your knowledge base via semantic search.",
    ],
    [
      "Live Chat System",
      "Real-time WebSocket messaging with typing indicators. Multi-agent supervisor dashboard.",
    ],
    [
      "Smart Automation",
      "Auto follow-up, behavior-based triggers, lead qualification — running while you sleep.",
    ],
    [
      "In-Chat Transactions",
      "Payment links, QRIS, VA, e-wallets — all inside the chat. Auto-confirmation via webhook.",
    ],
    [
      "Analytics & Insight",
      "Chat history, conversion tracking, customer behavior reports. Know what's working.",
    ],
    [
      "Enterprise Security",
      "Domain binding, identity verification, allowed-domains control, SLA-grade infrastructure.",
    ],
  ];
  features.forEach(([title, desc], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = 14 + col * 91;
    const by = 50 + row * 64;
    drawRect(bx, by, 85, 58, GRAY_LIGHT);
    drawRect(bx, by, 85, 4, PURPLE);
    setFont(9, "bold", PURPLE);
    pdf.text(title, bx + 6, by + 16);
    setFont(8, "normal", GRAY);
    const lines = pdf.splitTextToSize(desc, 72);
    pdf.text(lines, bx + 6, by + 26);
  });

  // ─────────────────────────────────────────────
  // SLIDE 6 — POSITIONING
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(6, "Positioning");
  setFont(13, "bold", DARK);
  pdf.text("Chatvice Is Not Just a Chatbot.", 14, 58);

  const notItems = ["Chatbot AI", "Live Chat Tool", "Customer Service Tool"];
  const isItems = [
    "AI Conversation Infrastructure",
    "Revenue Automation Layer",
    "AI Sales & Support Engine",
  ];

  setFont(9, "bold", RED);
  pdf.text("What we are NOT", 14, 74);
  notItems.forEach((item, i) => {
    drawRect(14, 78 + i * 22, 85, 18, GRAY_LIGHT);
    setFont(9, "normal", GRAY);
    bullet(20, 90 + i * 22, item, false);
  });

  setFont(9, "bold", GREEN);
  pdf.text("What we ARE", 106, 74);
  isItems.forEach((item, i) => {
    drawRect(106, 78 + i * 22, 90, 18, PURPLE_LIGHT);
    setFont(9, "normal", DARK);
    bullet(112, 90 + i * 22, item, true);
  });

  drawRect(14, 152, W - 28, 24, PURPLE);
  setFont(13, "bold", [255, 255, 255] as const);
  pdf.text('"From Chat → Conversion → Revenue"', W / 2, 167, {
    align: "center",
  });

  setFont(9, "normal", GRAY);
  pdf.text(
    "Chatvice is the revenue layer between your website and your customer's wallet.",
    14,
    192
  );

  // ─────────────────────────────────────────────
  // SLIDE 7 — COMPETITIVE ADVANTAGE
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(7, "Competitive Advantage");
  setFont(12, "bold", DARK);
  pdf.text("Why Chatvice Wins", 14, 58);

  const tableHeaders = ["Feature", "Chatvice", "Traditional Live Chat", "WhatsApp CS"];
  const colW = [52, 46, 58, 40];
  const colX = [14, 66, 112, 170];

  drawRect(14, 64, W - 28, 10, PURPLE);
  tableHeaders.forEach((h, i) => {
    setFont(8, "bold", [255, 255, 255] as const);
    pdf.text(h, colX[i] + 2, 71);
  });

  const rows = [
    ["Response Speed", "⚡ Instant AI", "Human delay", "Manual"],
    ["Operational Cost", "Low", "High", "High"],
    ["24/7 Availability", "Yes", "No", "No"],
    ["Automation", "Advanced", "Limited", "None"],
    ["In-chat Payment", "Yes", "No", "No"],
    ["Human Escalation", "Seamless", "Yes", "No"],
    ["Analytics", "Advanced", "Basic", "No"],
  ];
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? WHITE : GRAY_LIGHT;
    drawRect(14, 74 + ri * 14, W - 28, 14, bg);
    drawRect(colX[1], 74 + ri * 14, colW[1], 14, PURPLE_LIGHT);
    row.forEach((cell, ci) => {
      const isYes = cell === "Yes" || cell === "Seamless" || cell.startsWith("⚡");
      const isNo = cell === "No";
      const textColor =
        ci === 1 ? PURPLE : isYes ? GREEN : isNo ? RED : DARK;
      setFont(ci === 0 ? 8 : 8, ci === 0 ? "normal" : "normal", textColor);
      pdf.text(cell, colX[ci] + 2, 83 + ri * 14);
    });
  });

  // ─────────────────────────────────────────────
  // SLIDE 8 — VALUE PROPOSITION
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(8, "Value Proposition");
  setFont(12, "bold", DARK);
  pdf.text("The Business Case for Chatvice", 14, 58);

  const vProps = [
    {
      title: "Cost Effective",
      color: GREEN,
      bg: [240, 253, 244] as const,
      points: ["Replace 3–5 CS staff", "Reduce opex up to 70%", "No overtime, no sick days"],
    },
    {
      title: "Instant Response",
      color: AMBER,
      bg: [255, 251, 235] as const,
      points: ["<1 second reply time", "Zero missed leads", "Always available 24/7"],
    },
    {
      title: "More Conversions",
      color: PURPLE,
      bg: PURPLE_LIGHT,
      points: ["Instant engagement", "Guided purchase flow", "AI upsell suggestions"],
    },
  ];
  vProps.forEach(({ title, color, bg, points }, i) => {
    const bx = 14 + i * 61;
    drawRect(bx, 66, 55, 88, bg);
    setFont(9, "bold", color);
    pdf.text(title, bx + 4, 78);
    points.forEach((p, j) => {
      setFont(8, "normal", DARK);
      bullet(bx + 4, 90 + j * 18, p, true);
    });
  });

  drawRect(14, 168, W - 28, 32, DARK);
  setFont(11, "bold", [255, 255, 255] as const);
  pdf.text(
    '"Your customers don\'t wait. Why should your response?"',
    W / 2,
    180,
    { align: "center" }
  );
  setFont(8, "normal", [161, 161, 170] as const);
  pdf.text("1 CS staff = ±Rp 4–6 juta/bulan", W / 2, 190, {
    align: "center",
  });
  pdf.text("Chatvice = mulai dari Free (Rp 0)", W / 2, 197, {
    align: "center",
  });

  // ─────────────────────────────────────────────
  // SLIDE 9 — USE CASES
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(9, "Use Cases");
  setFont(12, "bold", DARK);
  pdf.text("Built for Every Industry", 14, 58);

  const useCases = [
    {
      title: "E-Commerce",
      color: [59, 130, 246] as const,
      points: [
        "Auto product Q&A & recommendations",
        "Checkout & order status in chat",
        "Cart abandonment follow-up",
      ],
    },
    {
      title: "Hospitality",
      color: [20, 184, 166] as const,
      points: [
        "Room booking & availability",
        "AI concierge for guests 24/7",
        "Service request handling",
      ],
    },
    {
      title: "Gaming / Top-Up",
      color: PURPLE,
      points: [
        "Automated deposit flow in-chat",
        "Anti-fraud domain binding",
        "Instant transaction confirmation",
      ],
    },
    {
      title: "Corporate / Service",
      color: AMBER,
      points: [
        "Intelligent lead generation",
        "Appointment booking automation",
        "Internal helpdesk & support",
      ],
    },
  ];
  useCases.forEach(({ title, color, points }, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = 14 + col * 97;
    const by = 66 + row * 76;
    drawRect(bx, by, 89, 70, GRAY_LIGHT);
    drawRect(bx, by, 89, 6, color);
    setFont(10, "bold", color);
    pdf.text(title, bx + 6, by + 18);
    points.forEach((p, j) => {
      setFont(8, "normal", DARK);
      bullet(bx + 6, by + 30 + j * 14, p, true);
    });
  });

  // ─────────────────────────────────────────────
  // SLIDE 10 — PRICING
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(10, "Pricing");
  setFont(11, "bold", DARK);
  pdf.text("Simple, Transparent Pricing", 14, 54);
  setFont(8, "normal", GRAY);
  pdf.text("All plans include a 14-day free trial. Annual billing saves 20%.", 14, 62);

  const pricingPlans = [
    { name: "Free", price: "$0/mo", note: "forever", color: GRAY_LIGHT, textColor: DARK },
    { name: "Starter", price: "$29/mo", note: "→ $24 annual", color: PURPLE_LIGHT, textColor: PURPLE },
    { name: "Pro", price: "$99/mo", note: "→ $83 annual", color: PURPLE, textColor: [255, 255, 255] as const },
    { name: "Enterprise", price: "$499/mo", note: "→ $416 annual", color: [254, 243, 199] as const, textColor: AMBER },
    { name: "Custom", price: "Custom", note: "pricing", color: DARK, textColor: [255, 255, 255] as const },
  ];
  pricingPlans.forEach(({ name, price, note, color, textColor }, i) => {
    const bx = 14 + i * 38;
    drawRect(bx, 68, 35, 70, color);
    setFont(8, "bold", textColor);
    pdf.text(name, bx + 17.5, 78, { align: "center" });
    setFont(11, "bold", textColor);
    pdf.text(price, bx + 17.5, 92, { align: "center" });
    setFont(7, "normal", textColor);
    pdf.text(note, bx + 17.5, 100, { align: "center" });
  });

  const planFeatures = [
    ["AI Agents", "1", "1", "3", "10", "Unlimited"],
    ["Conversations/mo", "20", "2,000", "10,000", "50,000", "Unlimited"],
    ["Supervisors", "1", "1", "3", "5", "Unlimited"],
    ["Knowledge Sources", "1", "5", "20", "Unlimited", "Unlimited"],
    ["Remove Branding", "No", "Yes", "Yes", "Yes", "Yes"],
    ["Analytics", "No", "Basic", "Advanced", "Advanced", "Custom"],
    ["API Access", "No", "No", "Yes", "Yes", "Yes"],
    ["SLA Guarantee", "No", "No", "No", "Yes", "Custom"],
  ];
  planFeatures.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? WHITE : GRAY_LIGHT;
    drawRect(14, 144 + ri * 12, W - 28, 12, bg);
    row.forEach((cell, ci) => {
      const bx = ci === 0 ? 14 : 14 + (ci) * 38;
      const isYes = cell === "Yes" || cell === "Advanced" || cell === "Unlimited" || cell === "Custom";
      const isNo = cell === "No";
      const color = isYes ? GREEN : isNo ? RED : DARK;
      setFont(ci === 0 ? 7 : 7, "normal", color);
      pdf.text(cell, ci === 0 ? bx + 2 : bx + 17.5 + 2, 152 + ri * 12, ci === 0 ? {} : { align: "center" });
    });
  });

  setFont(8, "italic", GRAY);
  pdf.text(
    '"Less than 1 coffee per month — for a 24/7 AI sales team."',
    W / 2,
    244,
    { align: "center" }
  );

  // ─────────────────────────────────────────────
  // SLIDE 11 — DEMO FLOW
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(11, "Demo Flow");
  setFont(12, "bold", DARK);
  pdf.text("From Visitor to Payment — In One Conversation.", 14, 58);

  const demoSteps = [
    ["01", "Visitor enters your website", "The Chatvice widget loads instantly — no page speed impact."],
    ["02", "AI greets the visitor", "LEXA1 sends a personalized greeting based on the page they're viewing."],
    ["03", "Visitor asks a question", "Natural language conversation — feels like chatting with a real expert."],
    ["04", "AI answers & recommends", "Pulls from your knowledge base, recommends products or services."],
    ["05", "Visitor clicks 'Buy'", "The AI presents payment options directly inside the chat."],
    ["06", "Payment processed", "QRIS / VA / e-wallet — transaction completed without leaving the chat."],
    ["07", "AI confirms the order", "Instant confirmation message with order details. Deal closed."],
  ];
  demoSteps.forEach(([num, title, desc], i) => {
    const by = 66 + i * 28;
    drawRect(14, by, 12, 22, PURPLE);
    setFont(9, "bold", [255, 255, 255] as const);
    pdf.text(num, 20, by + 14, { align: "center" });
    drawRect(28, by, W - 42, 22, i % 2 === 0 ? GRAY_LIGHT : PURPLE_LIGHT);
    setFont(9, "bold", i % 2 === 0 ? DARK : PURPLE);
    pdf.text(title, 34, by + 9);
    setFont(8, "normal", GRAY);
    pdf.text(desc, 34, by + 17);
  });

  // ─────────────────────────────────────────────
  // SLIDE 12 — VISION
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawPageHeader(12, "Future Vision");
  setFont(12, "bold", DARK);
  pdf.text("The Big Play — Chatvice Roadmap", 14, 58);
  setFont(9, "normal", GRAY);
  pdf.text(
    "Chatvice is building the AI communication infrastructure for the next generation of businesses.",
    14,
    68
  );

  const visions = [
    ["AI Memory", "Personalized, behavior-based responses. Chatvice remembers every customer interaction across sessions."],
    ["Scheduled AI Follow-up", "Smart reminders and re-engagement — automated but personal. No lead goes cold."],
    ["Cross-Platform Expansion", "Web → Mobile → WhatsApp → API. Meet customers wherever they are."],
    ["Behavior Prediction", "Trigger conversations before the customer asks. Proactive, not reactive engagement."],
  ];
  visions.forEach(([title, desc], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = 14 + col * 97;
    const by = 78 + row * 72;
    drawRect(bx, by, 89, 66, GRAY_LIGHT);
    drawRect(bx, by, 8, 66, PURPLE);
    setFont(9, "bold", PURPLE);
    pdf.text(title, bx + 14, by + 14);
    setFont(8, "normal", GRAY);
    const lines = pdf.splitTextToSize(desc, 72);
    pdf.text(lines, bx + 14, by + 24);
  });

  drawRect(14, 226, W - 28, 18, PURPLE_LIGHT);
  setFont(9, "bold", PURPLE);
  pdf.text(
    "Goal: Become the #1 AI Revenue Platform for Southeast Asia by 2026",
    W / 2,
    237,
    { align: "center" }
  );

  // ─────────────────────────────────────────────
  // SLIDE 13 — CTA
  // ─────────────────────────────────────────────
  pdf.addPage();
  drawRect(0, 0, W, H, PURPLE);
  drawRect(0, H - 50, W, 50, [88, 28, 185] as const);

  setFont(10, "bold", [196, 181, 253] as const);
  pdf.text("CHATVICE · SLIDE 13 / 13", 14, 14);

  setFont(26, "bold", [255, 255, 255] as const);
  const cta = pdf.splitTextToSize("Start Converting\nYour Visitors Today.", W - 28);
  pdf.text(cta, W / 2, 60, { align: "center" });

  setFont(11, "normal", [196, 181, 253] as const);
  pdf.text("14-day free trial. No credit card required. Live in 5 minutes.", W / 2, 105, {
    align: "center",
  });

  const actions = [
    ["Try Free (No CC)", "chatvice.app/register"],
    ["Start Free Trial", "chatvice.app/register"],
    ["Contact Sales", "hello@chatvice.app"],
  ];
  actions.forEach(([label, url], i) => {
    const bx = 14 + i * 62;
    drawRect(bx, 118, 56, 22, [140, 90, 230] as const);
    setFont(9, "bold", [255, 255, 255] as const);
    pdf.text(label, bx + 28, 127, { align: "center" });
    setFont(7, "normal", [196, 181, 253] as const);
    pdf.text(url, bx + 28, 134, { align: "center" });
  });

  const contactItems = [
    "🌐  chatvice.app",
    "✉  hello@chatvice.app",
    "📍  Indonesia",
  ];
  setFont(9, "normal", [255, 255, 255] as const);
  contactItems.forEach((item, i) => {
    pdf.text(item, W / 2, 160 + i * 12, { align: "center" });
  });

  setFont(8, "normal", [196, 181, 253] as const);
  pdf.text("© 2025 Chatvice. All rights reserved.", W / 2, H - 18, {
    align: "center",
  });
  pdf.text("CONFIDENTIAL — FOR PARTNER USE ONLY", W / 2, H - 10, {
    align: "center",
  });

  pdf.save("Chatvice-Product-Proposal.pdf");
}

export default function MarketingToolsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 80));
    try {
      await generateProposalPDF();
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("PDF generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PublicPageLayout
      title="Marketing Tools — Product Proposal | Chatvice"
      description="Download Chatvice's official product proposal PDF. A complete 13-slide sales deck covering features, pricing, use cases, and competitive advantages."
    >
      {/* Hero */}
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <Badge className="bg-white/20 text-white mb-5">
            <FileText className="w-3 h-3 mr-1" />
            Sales Deck
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            Chatvice Product Proposal
          </h1>
          <p className="text-lg text-purple-100 max-w-xl mx-auto">
            A complete 13-slide proposal deck — ready to share with clients,
            partners, and investors. Download the PDF instantly.
          </p>
        </div>
      </section>

      {/* Download card */}
      <section className="py-20 bg-background">
        <div className="max-w-xl mx-auto px-6">
          <div className="border border-border rounded-xl p-10 text-center bg-card shadow-sm">
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-purple-600" />
            </div>

            <h2 className="text-xl font-bold mb-2">
              Chatvice-Product-Proposal.pdf
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              13 slides · A4 · English · PDF format
            </p>

            {error && (
              <p className="text-sm text-destructive mb-4 p-3 bg-destructive/10 rounded-lg">
                {error}
              </p>
            )}

            <Button
              size="lg"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white h-14 text-base"
              onClick={handleDownload}
              disabled={isGenerating}
              data-testid="button-download-pdf"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Download Proposal PDF
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground mt-4">
              Free download · No sign-up required
            </p>
          </div>

          {/* What's inside */}
          <div className="mt-10">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 text-center">
              What's inside
            </h3>
            <ul className="space-y-3">
              {[
                "Cover, Problem & Solution overview",
                "Product features, positioning & competitive advantages",
                "Use cases for e-commerce, hospitality, gaming & corporate",
                "Full pricing table: Free, Starter, Pro, Enterprise, Custom",
                "Live demo flow (visitor → payment) & future vision",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Solution Pages as Shareable Resources */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <div className="mb-10 text-center">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              <Share2 className="w-3 h-3 mr-1" />
              Shareable Pages
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Share Solution Pages with Prospects
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Each page targets a specific buyer intent and is optimised for Indonesian search. Share them directly with leads — your referral is automatically tracked via UTM parameters.
            </p>
          </div>
          <div className="grid gap-4" data-testid="solution-pages-list">
            {solutionsData.map((s) => (
              <SolutionShareRow key={s.slug} slug={s.slug} h1={s.h1} subtitle={s.subtitle} />
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
