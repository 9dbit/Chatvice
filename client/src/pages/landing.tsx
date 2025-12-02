import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Zap,
  Users,
  BarChart3,
  Globe,
  Database,
  CheckCircle2,
  ArrowRight,
  Bot,
  HeadphonesIcon,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
  FileText,
  Link2,
  Settings,
  Play,
  Send,
  ChevronDown,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/theme-provider";
import chatviceLogoLight from "@assets/Chatvice-02_1764703423166.png";
import chatviceLogoDark from "@assets/Chatvice-04_1764704922816.png";

const trustedByLogos = [
  { name: "Siemens", initials: "S" },
  { name: "Postman", initials: "PM" },
  { name: "PWC", initials: "PWC" },
  { name: "Alpian", initials: "A" },
  { name: "Opal", initials: "O" },
  { name: "TechCorp", initials: "TC" },
  { name: "DataFlow", initials: "DF" },
  { name: "CloudSync", initials: "CS" },
];

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { resolvedTheme } = useTheme();
  const chatviceLogo = resolvedTheme === "dark" ? chatviceLogoDark : chatviceLogoLight;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    
    const validateSession = async () => {
      const storedMerchantId = localStorage.getItem("merchantId");
      if (!storedMerchantId) {
        setIsLoggedIn(false);
        setIsCheckingAuth(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/merchant/${storedMerchantId}`, {
          credentials: "include",
        });
        if (response.ok) {
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem("merchantId");
          localStorage.removeItem("userType");
          setIsLoggedIn(false);
        }
      } catch {
        setIsLoggedIn(false);
      }
      setIsCheckingAuth(false);
    };
    
    validateSession();
    
    const checkAuth = () => {
      const hasStoredId = !!localStorage.getItem("merchantId");
      if (!hasStoredId) {
        setIsLoggedIn(false);
      }
    };
    window.addEventListener("storage", checkAuth);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer" data-testid="link-logo">
            <img src={chatviceLogo} alt="Chatvice" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing">Pricing</a>
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Resources
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isCheckingAuth ? (
              <div className="w-20 h-8 bg-muted animate-pulse rounded-md" />
            ) : isLoggedIn ? (
              <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-foreground text-background hover:bg-foreground/90 h-8 px-3" data-testid="button-dashboard">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 px-3" data-testid="button-login">
                  Sign in
                </Link>
                <Link href="/register" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-foreground text-background hover:bg-foreground/90 h-8 px-3" data-testid="button-get-started">
                  Try for Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function TrustedBySection() {
  return (
    <div className="py-12 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Trusted by <span className="text-foreground font-bold">10,000+</span> businesses worldwide
          </p>
          <div className="flex items-center gap-8 overflow-hidden">
            {trustedByLogos.map((logo, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center font-bold text-xs">
                  {logo.initials}
                </div>
                <span className="font-semibold text-sm hidden lg:block">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InteractiveChatWidget() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; content: string }>>([
    { role: "bot", content: "Hi! I'm Chatvice, your AI assistant. Ask me anything about how I can help your business!" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest("POST", "/api/demo/ask", { question });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "bot", content: data.answer }]);
      setIsTyping(false);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "bot", content: "I'm a demo AI assistant. In the full version, I can answer questions based on your knowledge base, handle customer inquiries, and escalate to human agents when needed!" }]);
      setIsTyping(false);
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: input }]);
    setInput("");
    setIsTyping(true);
    askMutation.mutate(input);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-full max-w-sm bg-card rounded-2xl border border-card-border shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">Chatvice</p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>
        </div>
      </div>
      <div ref={scrollRef} className="h-72 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "bot" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`rounded-2xl p-3 max-w-[85%] ${msg.role === "user" ? "bg-foreground text-background rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Try asking me something..."
            className="flex-1"
            data-testid="input-demo-chat"
          />
          <Button size="icon" onClick={handleSend} disabled={isTyping} data-testid="button-demo-send">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="pt-28 pb-8 md:pt-36 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              AI agents for<br />
              magical customer<br />
              experiences
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Chatvice is the complete platform for building & deploying AI support agents for your business.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 px-8" data-testid="button-hero-get-started">
                  Build your agent
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                No credit card required
              </div>
            </div>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-400/30 via-purple-400/20 to-orange-400/30 blur-3xl rounded-full" />
            <div className="relative">
              <InteractiveChatWidget />
            </div>
          </div>
        </div>
      </div>
      <TrustedBySection />
    </section>
  );
}

function HighlightsSection() {
  const highlights = [
    {
      icon: Sparkles,
      title: "Purpose-built for LLMs",
      description: "Language models with reasoning capabilities for effective responses to complex queries.",
      gradient: "from-blue-500/10 to-purple-500/10"
    },
    {
      icon: Settings,
      title: "Designed for simplicity",
      description: "Create, manage, and deploy AI Agents easily, even without technical skills.",
      gradient: "from-green-500/10 to-teal-500/10"
    },
    {
      icon: Shield,
      title: "Engineered for security",
      description: "Enjoy peace of mind with robust encryption and strict compliance standards.",
      gradient: "from-orange-500/10 to-red-500/10"
    },
  ];

  return (
    <section className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-3 py-1">
            <Sparkles className="w-3 h-3 mr-1" />
            Highlights
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            The complete platform for<br />AI support agents
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chatvice is designed for building AI support agents that solve your customers' hardest problems while improving business outcomes.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {highlights.map((item, index) => (
            <Card key={index} className="hover-elevate transition-all duration-300 overflow-hidden group">
              <div className={`h-48 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                <div className="w-20 h-20 rounded-2xl bg-background/80 backdrop-blur flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <item.icon className="w-10 h-10 text-foreground" />
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{item.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  
  const steps = [
    {
      number: "01",
      title: "Build & deploy your agent",
      description: "Train an agent on your business data, configure the actions it can take, then deploy it for your customers.",
      icon: Bot,
    },
    {
      number: "02",
      title: "Agent solves your customers' problems",
      description: "The agent will answer questions and access external systems to gather data and take actions.",
      icon: MessageSquare,
    },
    {
      number: "03",
      title: "Refine & optimize",
      description: "Review conversations, improve responses, and optimize your agent over time.",
      icon: Settings,
    },
    {
      number: "04",
      title: "Route complex issues to a human",
      description: "Seamlessly escalate certain queries to human agents when the AI agent is unable to solve the problem.",
      icon: HeadphonesIcon,
    },
    {
      number: "05",
      title: "Review analytics & insights",
      description: "Since the agent is talking with customers all day, it's able to gather important insights about your business.",
      icon: BarChart3,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">How it works</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            An end-to-end solution for<br />conversational AI
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            With Chatvice, your customers can effortlessly find answers, resolve issues, and take meaningful actions through seamless AI-driven conversations.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${activeStep === index ? "bg-card border border-card-border shadow-lg" : "hover:bg-muted/50"}`}
                data-testid={`button-step-${index + 1}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${activeStep === index ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg mb-1 ${activeStep === index ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.title}
                    </h3>
                    {activeStep === index && (
                      <p className="text-muted-foreground">{step.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="lg:sticky lg:top-24">
            <div className="bg-card rounded-2xl border border-card-border shadow-xl p-8 min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                  {(() => {
                    const StepIcon = steps[activeStep].icon;
                    return <StepIcon className="w-12 h-12 text-primary" />;
                  })()}
                </div>
                <h3 className="text-2xl font-bold mb-3">{steps[activeStep].title}</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">{steps[activeStep].description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Database,
      title: "Sync with real-time data",
      description: "Connect your agent to systems like order management tools, CRMs, and more to seamlessly access data.",
      size: "large"
    },
    {
      icon: Zap,
      title: "Take actions on your systems",
      description: "Configure actions that your agent can perform within your systems or through integrations.",
      size: "large"
    },
    {
      icon: Settings,
      title: "Compare AI models",
      description: "Experiment with various models and configurations to make sure you have the best setup.",
      size: "small"
    },
    {
      icon: HeadphonesIcon,
      title: "Smart escalation",
      description: "Give your agent instructions in natural language on when to escalate queries to human agents.",
      size: "small"
    },
    {
      icon: BarChart3,
      title: "Advanced reporting",
      description: "Gain insights and optimize agent performance with detailed analytics.",
      size: "small"
    },
  ];

  const integrations = [
    "Zendesk", "Slack", "Stripe", "Salesforce", "Notion", "WhatsApp", "Zapier", "Messenger"
  ];

  return (
    <section id="features" className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Features</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Build the perfect<br />customer-facing AI agent
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chatvice gives you all the tools you need to train your perfect AI agent and connect it to your systems.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {features.filter(f => f.size === "large").map((feature, index) => (
            <Card key={index} className="hover-elevate transition-all duration-200 p-8">
              <div className="h-48 bg-gradient-to-br from-muted/50 to-muted rounded-xl mb-6 flex items-center justify-center">
                <feature.icon className="w-16 h-16 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {features.filter(f => f.size === "small").map((feature, index) => (
            <Card key={index} className="hover-elevate transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-foreground" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="p-8 bg-gradient-to-br from-muted/30 to-muted/10">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold mb-2">Works with your tools</h3>
            <p className="text-muted-foreground">Integrate diverse data sources to enrich your agent's knowledge and capabilities.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {integrations.map((integration, index) => (
              <div key={index} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border">
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold">
                  {integration[0]}
                </div>
                <span className="text-sm font-medium">{integration}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card className="p-6 hover-elevate">
            <h3 className="font-semibold mb-2">API</h3>
            <p className="text-sm text-muted-foreground">APIs, client libraries, and components to deeply integrate support into your product.</p>
          </Card>
          <Card className="p-6 hover-elevate">
            <h3 className="font-semibold mb-2">Whitelabel</h3>
            <p className="text-sm text-muted-foreground">Remove any Chatvice branding from the chat widget.</p>
          </Card>
          <Card className="p-6 hover-elevate">
            <h3 className="font-semibold mb-2">Always improving</h3>
            <p className="text-sm text-muted-foreground">Syncs with your systems and learns from previous interactions.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const benefits = [
    {
      title: "Personalized answers",
      description: "Your agent knows the logged in user and can retrieve their information to provide personalized answers.",
      icon: Users,
    },
    {
      title: "Instant actions",
      description: "Take immediate actions on behalf of your customers like updating subscriptions or processing refunds.",
      icon: Zap,
    },
    {
      title: "Empathetic & on-brand",
      description: "Configure your agent's personality to match your brand voice and provide empathetic responses.",
      icon: MessageSquare,
    },
    {
      title: "Smart escalations",
      description: "Automatically detect when customers need human help and seamlessly transfer to your team.",
      icon: HeadphonesIcon,
    },
    {
      title: "Observability",
      description: "Monitor every conversation, track performance metrics, and identify areas for improvement.",
      icon: BarChart3,
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Benefits</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Works like the best<br />customer service agents
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chatvice is designed to work with your existing tools and workflows.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="hover-elevate transition-all duration-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{benefit.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Get started with basic AI support",
      features: [
        "50 AI conversations/month",
        "1 AI Agent",
        "1 Team member",
        "Basic widget",
        "Community support",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small businesses",
      features: [
        "500 AI conversations/month",
        "1 AI Agent",
        "2 Team members",
        "Widget customization",
        "Email support",
        "Basic analytics",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Pro",
      price: "$79",
      period: "/month",
      description: "For growing businesses",
      features: [
        "5,000 AI conversations/month",
        "3 AI Agents",
        "5 Team members",
        "Advanced analytics",
        "Priority support",
        "Custom triggers",
        "Knowledge base",
        "API access",
        "Custom domain",
        "Identity verification",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$299",
      period: "/month",
      description: "For large organizations",
      features: [
        "50,000 AI conversations/month",
        "10 AI Agents",
        "Unlimited team members",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
        "White-label solution",
        "Advanced security",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade as you grow. No hidden fees.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${plan.popular ? "border-foreground shadow-xl lg:scale-105 z-10" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-foreground text-background">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    className={`w-full ${plan.popular ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-foreground text-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Ready to transform your<br />customer experience?
        </h2>
        <p className="text-lg opacity-80 mb-8">
          Join 10,000+ businesses using Chatvice to deliver exceptional support experiences.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90" data-testid="button-cta-start">
              Build your agent
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-background/30 text-background hover:bg-background/10" data-testid="button-cta-demo">
            Watch Demo
          </Button>
        </div>
        <p className="text-sm opacity-60 mt-6 flex items-center justify-center gap-2">
          <CreditCard className="w-4 h-4" />
          No credit card required • 7-day free trial
        </p>
      </div>
    </section>
  );
}

function Footer() {
  const links = {
    Product: ["Features", "Pricing", "Integrations", "API", "Changelog"],
    Company: ["About", "Blog", "Careers", "Press", "Partners"],
    Resources: ["Documentation", "Help Center", "Contact", "Status", "Security"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
  };

  return (
    <footer className="py-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-background" />
              </div>
              <span className="font-bold text-lg">Chatvice</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered customer service for modern businesses.
            </p>
          </div>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Chatvice. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <HighlightsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <BenefitsSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
