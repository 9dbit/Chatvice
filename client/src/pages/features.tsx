import { Link } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  MessageCircle,
  Database,
  Shield,
  Zap,
  Globe,
  Users,
  BarChart3,
  Bot,
  HeadphonesIcon,
  Settings,
  Sparkles,
  ArrowRight,
  Check,
  Upload,
  Search,
  Workflow,
  Clock,
  Camera,
  Lock,
  Key,
  Send,
  Store,
  UserPlus,
  Bell,
  Wallet,
  Gift,
  DollarSign,
  Eye,
  FileText,
  MessageSquare,
  RefreshCw,
  Phone,
  Image as ImageIcon,
  ShieldCheck,
  Code,
  Cpu,
  TrendingUp,
  Target,
  AlertTriangle,
  BookOpen,
  Layers,
} from "lucide-react";
import PublicPageLayout from "./public-layout";

function useParallaxScroll() {
  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.parallax-fade-in, .parallax-slide-left, .parallax-slide-right, .parallax-scale');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        if (rect.top < windowHeight * 0.85) {
          el.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}

export default function FeaturesPage() {
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });
  
  const trialDays = (platformSettings as any)?.trial_days ? parseInt((platformSettings as any).trial_days) : 14;

  const mainFeatures = [
    {
      icon: Brain,
      title: "LEXA1 AI Engine",
      description: "LEXA1 is our proprietary AI engine built specifically for customer service excellence. It combines OpenAI GPT-4.1-mini with semantic vector search to understand customer intent — not just keywords — delivering accurate, context-aware responses in under one second, 24 hours a day.",
      highlights: [
        "Context-aware multi-turn conversations",
        "Semantic search from your knowledge base",
        "AI-generated personalized greetings",
        "Automatic language detection (50+ languages)",
        "AI media analysis — images & documents",
        "Conversation memory optimization",
      ],
    },
    {
      icon: Database,
      title: "Smart Knowledge Base",
      description: "Train your AI agent on your actual business data with zero technical expertise. Upload documents, crawl your website, type Q&A pairs, or let AI generate content for you. LEXA1 uses vector embeddings to find semantically relevant answers — even when customers don't phrase things exactly right.",
      highlights: [
        "Website crawler with auto-sync",
        "PDF, DOCX, TXT document upload",
        "AI-powered article generation",
        "AI auto-format on save",
        "Review & Search-Replace tools",
        "Drag-and-drop card reordering",
      ],
    },
    {
      icon: HeadphonesIcon,
      title: "Human Escalation",
      description: "When AI alone isn't enough, Chatvice seamlessly hands off conversations to real human supervisors. Configure escalation triggers (keywords, sentiment, time-based), assign chats via round-robin, and let supervisors take over in real time — all without the customer noticing any disruption.",
      highlights: [
        "Keyword & sentiment-based triggers",
        "Automatic or manual escalation",
        "Round-robin assignment",
        "Real-time chat takeover",
        "Supervisor-to-customer live messaging",
        "Escalation history and audit trail",
      ],
    },
    {
      icon: MessageCircle,
      title: "Embeddable Chat Widget",
      description: "Add a fully branded AI chat widget to any website with a single line of code. Customize colors, avatar, welcome message, suggested questions, social links, and widget position to match your brand identity. The widget works beautifully on desktop and mobile, with auto-open and proactive greeting modes.",
      highlights: [
        "1-line embed, no coding required",
        "Full brand customization (colors, avatar, text)",
        "Suggested questions & quick replies",
        "Photo, video & file uploads in chat",
        "Auto-open & proactive greeting modes",
        "Social media links integration",
      ],
    },
    {
      icon: Shield,
      title: "Identity Verification",
      description: "Protect sensitive conversations with JWT-based customer identity verification. When merchants pass a signed token from their own system, LEXA1 personalizes every response with verified customer data — name, order history, account status — without exposing sensitive information to unauthorized users.",
      highlights: [
        "JWT token-based authentication",
        "Merchant-controlled secret key",
        "Domain restriction & CORS control",
        "Customer data binding in conversations",
        "Seamless SSO-like integration",
        "Secure for e-commerce & fintech",
      ],
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Serve customers in their native language without hiring multilingual agents. LEXA1 automatically detects the customer's language and responds fluently in that same language — including Bahasa Indonesia, English, Mandarin, Arabic, and 50+ others — using your own knowledge base as the source of truth.",
      highlights: [
        "50+ languages supported",
        "Automatic language detection per message",
        "Knowledge base searched in any language",
        "Bahasa Indonesia first-class support",
        "No separate training per language",
        "Seamless language switching mid-chat",
      ],
    },
  ];

  const advancedFeatures = [
    {
      icon: Eye,
      title: "Proactive Chat & Live Visitor Tracking",
      description: "See every visitor on your website in real time — their country, time on page, and browsing behavior. Supervisors can proactively start a conversation before the visitor even asks a question. The widget auto-opens when a supervisor sends the first message, turning passive visitors into active leads.",
      highlights: [
        "Real-time visitor dashboard",
        "IP-based geolocation with country flags",
        "Supervisor-initiated proactive messages",
        "Widget auto-opens on proactive message",
        "Toggleable per merchant",
      ],
    },
    {
      icon: Send,
      title: "Two-Way Telegram Supervisor Bridge",
      description: "Supervisors don't need to stay logged into the dashboard. Link your Telegram account once, and receive escalated chats directly as Telegram DMs — complete with conversation context and recent messages. Reply in Telegram and the customer sees it instantly in the chat widget.",
      highlights: [
        "Escalation alerts as Telegram DMs",
        "Reply to customers directly from Telegram",
        "Customer messages forwarded in real time",
        "Webhook setup from the Integrations page",
        "Per-supervisor Telegram linking",
      ],
    },
    {
      icon: Store,
      title: "AI Product Catalog Crawler",
      description: "Point LEXA1 at your product pages and it will scan, screenshot, and extract product information using OpenAI Vision. Your AI agent can then recommend the right products to customers based on their needs — all from a review-approved product catalog that you control.",
      highlights: [
        "Puppeteer-powered page screenshots",
        "GPT-4.1 Vision product extraction",
        "Mandatory human review before going live",
        "AI product recommendation in chat",
        "Works with any website layout",
      ],
    },
    {
      icon: MessageSquare,
      title: "Closing Statement",
      description: "Automatically send a polite closing message when a chat goes inactive, so no conversation is left hanging. Configure it to include your business name and the customer's name for a personal touch. Merchants can also trigger closing statements manually from the supervisor panel.",
      highlights: [
        "Auto-close on configurable inactivity timer",
        "Personalized with business & customer names",
        "Manual trigger available to supervisors",
        "Customizable closing message template",
        "Works in both AI and human-mode sessions",
      ],
    },
    {
      icon: Clock,
      title: "Work Scheduler",
      description: "Define working hours and shift schedules for supervisors and AI agents separately. Outside scheduled hours, LEXA1 handles everything automatically. Inside hours, supervisors can take over. This ensures customers always know who is available and when.",
      highlights: [
        "Per-supervisor shift configuration",
        "AI agent availability scheduling",
        "Timezone-aware scheduling",
        "Out-of-hours automated responses",
        "Calendar-style shift management",
      ],
    },
    {
      icon: AlertTriangle,
      title: "Chat Security Monitoring",
      description: "Protect your business from bad actors with AI-powered security monitoring. Powered by Google Gemini 2.5 Flash, this system analyzes supervisor conversations in real time to detect suspicious activities, policy violations, and unusual patterns — with configurable sensitivity and instant alerts.",
      highlights: [
        "Gemini 2.5 Flash real-time analysis",
        "Configurable sensitivity levels",
        "Suspicious activity alerts",
        "Supervisor conversation oversight",
        "Admin notification system",
      ],
    },
    {
      icon: FileText,
      title: "Google Sheet Transaction Lookup",
      description: "Connect your Google Sheet to LEXA1 and let customers query their transaction data in natural language. LEXA1 detects transaction-related questions, fetches the relevant row from your sheet in real time, and injects the data into its response — no backend changes required on your side.",
      highlights: [
        "Natural language transaction queries",
        "Real-time Google Sheet fetch",
        "Data injected into AI response",
        "No customer-facing portal needed",
        "Works with any structured sheet layout",
      ],
    },
    {
      icon: Phone,
      title: "Customer Chat Platform",
      description: "Beyond the embedded widget, Chatvice powers a full standalone chat app at chat.chatvice.app — designed for mobile customers who prefer a dedicated interface. First-time users verify via WhatsApp/SMS OTP; returning users log in with phone + PIN. Merchant routing via subdomain.",
      highlights: [
        "Standalone mobile-first chat app",
        "Two-tier auth: OTP (first time) + PIN (return)",
        "WhatsApp & SMS OTP verification",
        "Subdomain-based merchant routing",
        "Cross-platform: works on any mobile browser",
      ],
    },
    {
      icon: RefreshCw,
      title: "Automatic Chat Cleanup & Logs",
      description: "Old sessions don't clutter your database. A background job automatically archives expired sessions based on your plan's retention policy and generates detailed chat logs with full transcripts — so you always have a clean, auditable history without manual maintenance.",
      highlights: [
        "Plan-based retention policy",
        "Background archiving job",
        "Full transcript generation",
        "Downloadable chat logs",
        "GDPR-friendly data lifecycle",
      ],
    },
    {
      icon: Gift,
      title: "Affiliate & Withdrawal System",
      description: "Turn your satisfied merchants into a sales force with a built-in affiliate program. Affiliates earn commissions on referred signups, track their earnings in a dedicated dashboard, and submit withdrawal requests with their preferred payment method — which admins review and approve from the Master Control Panel.",
      highlights: [
        "Commission tracking per referral",
        "Affiliate dashboard with earnings overview",
        "Saved payment methods for payouts",
        "Minimum payout threshold configuration",
        "Admin withdrawal approval workflow",
      ],
    },
    {
      icon: DollarSign,
      title: "Promo Code & Discount System",
      description: "Run targeted promotions with a full-featured discount code engine. Create codes that apply percentage discounts to specific plans, set maximum usage limits, define expiry dates, and monitor redemption in real time from the Admin Panel — without any developer involvement.",
      highlights: [
        "Percentage-based discount codes",
        "Plan-specific targeting",
        "Usage limit per code",
        "Expiry date configuration",
        "Real-time redemption tracking in admin",
      ],
    },
    {
      icon: Target,
      title: "Custom Plan & Budget Simulator",
      description: "Merchants who need something beyond standard plans can use the interactive Budget Simulator to configure exactly what they need — number of agents, supervisors, knowledge sources, conversations — and submit a custom plan request. Your sales team receives the full configuration and can quote accordingly.",
      highlights: [
        "Interactive slider-based configurator",
        "Real-time price estimation",
        "Custom plan request submission",
        "Sales team notification on request",
        "No developer action required",
      ],
    },
    {
      icon: BookOpen,
      title: "AI Knowledge Base Tools",
      description: "Managing a large knowledge base is hard — Chatvice makes it effortless. AI can auto-generate new articles, auto-format messy content on save, detect duplicate or misplaced entries with one click (Review & Organize), and find-and-replace text across all entries simultaneously (Search & Replace).",
      highlights: [
        "AI article generation from scratch",
        "Auto-format content on save",
        "Review & Organize: AI duplication detection",
        "Approve / Decline / Modify workflow per suggestion",
        "Search & Replace across all knowledge entries",
      ],
    },
  ];

  const additionalFeatures = [
    { icon: Bot, title: "Multiple AI Agents", description: "Create separate agents for sales, support, billing — each with its own knowledge base and personality" },
    { icon: Settings, title: "Custom System Prompts", description: "Define your AI's persona, tone, rules, and response style per agent" },
    { icon: BarChart3, title: "Analytics Dashboard", description: "Track conversations, escalation rates, response times, CSAT scores, and AI accuracy" },
    { icon: Users, title: "Team Management", description: "Invite unlimited supervisors, manage roles and permissions, monitor team activity in real time" },
    { icon: Send, title: "Telegram Bridge", description: "Link any supervisor's Telegram account to receive escalation alerts and reply to customers directly from Telegram DMs" },
    { icon: Eye, title: "Proactive Chat", description: "Spot live website visitors and start a conversation before they even type their first message" },
    { icon: MessageSquare, title: "Closing Statement", description: "Automatic or manual farewell messages when a chat ends, personalized with the customer's name" },
    { icon: Store, title: "Product Catalog Crawler", description: "AI scans your product pages, extracts product info, and enables intelligent product recommendations in chat" },
    { icon: FileText, title: "Google Sheet Lookup", description: "Customers can ask about their transactions in natural language; LEXA1 fetches the answer live from your Google Sheet" },
    { icon: Clock, title: "Work Scheduler", description: "Set shifts for supervisors and AI agents — the right resource handles chats at the right time" },
    { icon: Wallet, title: "Affiliate Payouts", description: "Affiliates request withdrawals with saved payment methods; admins approve from the Master Control Panel" },
    { icon: Bell, title: "Smart Notification Sounds", description: "Context-aware audio alerts for new chats, replies, and angry customers — per-user preferences" },
    { icon: ImageIcon, title: "AI Media Analysis", description: "Customers upload photos and documents; LEXA1 analyzes them using Vision AI and responds accordingly" },
    { icon: ShieldCheck, title: "Profanity Filtering", description: "Built-in profanity detection on customer messages, configurable sensitivity per merchant" },
    { icon: UserPlus, title: "OAuth Login", description: "Merchants and supervisors sign in with Google or GitHub for frictionless authentication" },
    { icon: Layers, title: "Quick Replies", description: "Supervisors save and reuse frequently sent messages as one-click quick replies" },
    { icon: Code, title: "External Chat Bridge API", description: "Connect external platforms to Chatvice via API key — send messages and receive replies programmatically" },
    { icon: Cpu, title: "Embedding Reprocessing", description: "Knowledge base updates automatically regenerate vector embeddings for all agents instantly" },
    { icon: Lock, title: "Data Encryption", description: "All data encrypted at rest and in transit with TLS and AES-256" },
    { icon: Search, title: "Semantic Search", description: "Meaning-based knowledge lookup — finds answers even when customers phrase things differently" },
    { icon: TrendingUp, title: "Merchant Analytics", description: "Admin-facing analytics with 12+ filter categories: spending, team counts, ratings, escalation rates" },
    { icon: Key, title: "API Access", description: "Full REST API and webhooks for custom integrations with any external system" },
  ];

  useParallaxScroll();
  
  return (
    <PublicPageLayout
      title="Features - AI Customer Service Platform | Chatvice"
      description="Explore every Chatvice feature: LEXA1 AI engine, proactive chat, Telegram bridge, smart knowledge base, human escalation, multi-language support, embeddable widget, product crawler, security monitoring, and more."
    >
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Badge className="bg-white/20 text-white mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Features
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-left">
            Every Tool You Need for<br />World-Class AI Support
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mb-8 text-left">
            Chatvice powered by LEXA1 gives you an entire customer service platform — from AI automation to human escalation, proactive chat, Telegram integration, and deep analytics — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50" data-testid="button-features-start-trial">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" data-testid="button-features-view-pricing">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 parallax-section">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-left mb-16 parallax-fade-in">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              Core Platform
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              The foundation of every Chatvice deployment — powerful, proven, and built for businesses of all sizes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => (
              <Card key={index} className={`hover-elevate group parallax-scale parallax-delay-${(index % 5) + 1}`} data-testid={`card-core-feature-${index}`}>
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
                    <feature.icon className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-purple-600 shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 parallax-section">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-left mb-16 parallax-fade-in">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              Advanced & Unique
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Advanced Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Features that go beyond the basics — the tools that make Chatvice stand apart from every other customer service platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {advancedFeatures.map((feature, index) => (
              <Card key={index} className={`hover-elevate group parallax-scale parallax-delay-${(index % 5) + 1}`} data-testid={`card-advanced-feature-${index}`}>
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
                    <feature.icon className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-purple-600 shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 parallax-section">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-left mb-16 parallax-fade-in">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              Everything Included
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Even More</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Every detail matters. Here's everything else packed into Chatvice.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => (
              <Card key={index} className={`p-6 hover-elevate parallax-scale parallax-delay-${(index % 5) + 1}`} data-testid={`card-additional-feature-${index}`}>
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-1 text-left">{feature.title}</h3>
                <p className="text-sm text-muted-foreground text-left">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 parallax-section">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="parallax-slide-left">
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                AI Engine
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-left">
                Meet LEXA1
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                LEXA1 is our proprietary AI engine built specifically for customer service. 
                It combines the power of GPT-4.1-mini with semantic vector search and business context 
                to deliver accurate, helpful responses — in any language, in under a second.
              </p>
              <p className="text-muted-foreground mb-6">
                Unlike generic chatbot platforms, LEXA1 is trained on your knowledge base, 
                knows when to escalate to a human, and can analyze images and documents 
                your customers send. It's not just a chatbot — it's a full AI support agent.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Context-Aware Understanding</p>
                    <p className="text-sm text-muted-foreground">
                      Understands the meaning behind questions across a full multi-turn conversation, not just the last message.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Your Business Knowledge</p>
                    <p className="text-sm text-muted-foreground">
                      Trained on your documents, website, and Q&A pairs. Answers using your data, your tone, your rules.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Smart Human Handoff</p>
                    <p className="text-sm text-muted-foreground">
                      Knows exactly when to escalate — angry customers, complex issues, or configured trigger phrases.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Vision & Document Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      Customers can upload photos and files. LEXA1 reads them and responds with relevant help.
                    </p>
                  </div>
                </li>
              </ul>
              <Link href="/register">
                <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-try-lexa1">
                  Try LEXA1 Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="relative parallax-slide-right">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-purple-600/20 rounded-3xl blur-3xl" />
              <Card className="relative p-8 text-center">
                <Brain className="w-24 h-24 mx-auto text-purple-600 mb-6" />
                <h3 className="text-2xl font-bold mb-2">LEXA1</h3>
                <p className="text-muted-foreground">AI Engine — Powered by GPT-4.1</p>
                <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">99%</p>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">&lt;1s</p>
                    <p className="text-xs text-muted-foreground">Response</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">50+</p>
                    <p className="text-xs text-muted-foreground">Languages</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">24/7</p>
                    <p className="text-xs text-muted-foreground">Availability</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">∞</p>
                    <p className="text-xs text-muted-foreground">Concurrent Chats</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-left">
            Ready to Transform Your Customer Service?
          </h2>
          <p className="text-lg text-purple-100 mb-8 max-w-2xl text-left">
            Start your {trialDays}-day free trial today. No credit card required. Full access to all features from day one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50" data-testid="button-features-cta-start">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" data-testid="button-features-cta-sales">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
