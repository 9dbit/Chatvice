import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
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
  Send,
  ChevronDown,
  Menu,
  X,
  Play,
  Calendar,
  Rocket,
  Code,
  Cpu,
  Layers,
  Target,
  Award,
  Star,
  Check,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Twitter,
  Linkedin,
  Github,
  Instagram,
  ChevronRight,
  Brain,
  Workflow,
  MessageCircle,
  Upload,
  Image as ImageIcon,
  Camera,
  Video,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/theme-provider";
import chatviceLogoLight from "@assets/Chatvice-02_1764703423166.png";
import chatviceLogoDark from "@assets/Chatvice-04_1764704922816.png";
import heroImage from "@assets/IMG_0144_1764718203655.jpeg";
import dashboardImage from "@assets/IMG_0106_1764617165315.png";

function RunningTextBanner() {
  const fullText = "LAUNCHING NEW POWERFUL AI ENGINE LEXA1 \u2022 This 09 December 2025 \u2022 From event design and production to marketing and technology, our expert speakers will share their insights and best practices";
  const repeatedText = Array(6).fill(fullText).join(" \u2022 ");
  
  return (
    <div className="bg-purple-600 text-white py-3 overflow-hidden whitespace-nowrap relative">
      <div className="marquee-wrapper">
        <div className="marquee-content">
          <span className="text-sm font-bold tracking-wider">{repeatedText}</span>
        </div>
        <div className="marquee-content" aria-hidden="true">
          <span className="text-sm font-bold tracking-wider">{repeatedText}</span>
        </div>
      </div>
    </div>
  );
}

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navLinks = [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "API", href: "/api-docs" },
    { label: "FAQ", href: "/faq" },
    { label: "About", href: "/about" },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0" data-testid="link-logo">
              <img src={chatviceLogo} alt="Chatvice" className="h-7 sm:h-8 w-auto" />
            </Link>
            
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`link-nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isCheckingAuth ? (
                <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
              ) : isLoggedIn ? (
                <Link href="/dashboard">
                  <Button data-testid="button-dashboard">Dashboard</Button>
                </Link>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" data-testid="button-login">Sign in</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-get-started">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              )}
              <button 
                className="lg:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-20 px-4 lg:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href}
                className="text-lg font-medium py-3 border-b border-border"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-4">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">Sign in</Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">Get Started Free</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Lexa1ChatWidget() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "bot"; content: string }>>([
    { role: "bot", content: "Hi! I'm Lexa1, your intelligent AI assistant powered by Chatvice. Ask me anything about our platform, features, or how I can help your business!" }
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
      setMessages(prev => [...prev, { role: "bot", content: "I'm Lexa1, the AI engine powering Chatvice. I can answer questions about our customer service platform, knowledge base management, human escalation features, and more. How can I help you today?" }]);
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

  const suggestedQuestions = [
    "What is Chatvice?",
    "How does AI escalation work?",
    "Tell me about pricing",
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-full max-w-sm bg-card rounded-2xl border border-purple-200 dark:border-purple-800/50 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border-2 border-white/30">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg">Lexa1</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white/80">AI Engine Online</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="h-72 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-950/20">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "bot" && (
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`rounded-2xl p-3 max-w-[85%] ${msg.role === "user" ? "bg-purple-600 text-white rounded-br-sm" : "bg-white dark:bg-card border border-border rounded-bl-sm shadow-sm"}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-card border border-border rounded-2xl rounded-bl-sm p-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(q);
                setTimeout(() => {
                  setMessages(prev => [...prev, { role: "user", content: q }]);
                  setInput("");
                  setIsTyping(true);
                  askMutation.mutate(q);
                }, 100);
              }}
              className="text-xs px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
              data-testid={`button-suggested-${i}`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button className="p-2 text-muted-foreground hover:text-purple-600 transition-colors" title="Upload image">
              <ImageIcon className="w-4 h-4" />
            </button>
            <button className="p-2 text-muted-foreground hover:text-purple-600 transition-colors" title="Take photo">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask Lexa1 anything..."
            className="flex-1 border-purple-200 dark:border-purple-800/50 focus-visible:ring-purple-500"
            data-testid="input-demo-chat"
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={isTyping}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-demo-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          Powered by <span className="font-semibold text-purple-600">Lexa1</span> AI Engine
        </p>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="pt-20 lg:pt-24">
      <div className="bg-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-purple-200 text-lg font-medium">09 December 2025</p>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                  Meet<br />
                  <span className="text-purple-200">LEXA1</span>
                </h1>
              </div>
              <p className="text-lg text-purple-100 max-w-lg leading-relaxed">
                From AI-powered customer service to intelligent escalation and knowledge management, 
                our expert-built platform will transform how you connect with customers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 px-8 font-semibold" data-testid="button-hero-start">
                    Start Building Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/features">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8" data-testid="button-hero-features">
                    Explore Features
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 to-purple-800/30 blur-3xl rounded-full" />
              <div className="relative">
                <Lexa1ChatWidget />
              </div>
            </div>
          </div>
        </div>
      </div>

      <RunningTextBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <img 
            src={dashboardImage} 
            alt="Chatvice Dashboard" 
            className="w-full h-auto"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <Badge className="bg-purple-600 text-white mb-4">Platform Preview</Badge>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Powerful Dashboard, Simple Experience
            </h3>
            <p className="text-white/80 max-w-xl">
              Manage your AI agents, train knowledge bases, and monitor conversations all in one place.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "99.9%", label: "Uptime SLA", icon: Shield },
    { value: "<1s", label: "Response Time", icon: Zap },
    { value: "50+", label: "Integrations", icon: Layers },
    { value: "24/7", label: "AI Support", icon: Bot },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineSection() {
  const milestones = [
    {
      date: "August 2025",
      title: "Project Inception",
      description: "Chatvice development begins with a vision to revolutionize customer service through AI.",
      icon: Rocket,
      status: "completed"
    },
    {
      date: "September 2025",
      title: "Core Platform Built",
      description: "Multi-tenant architecture, merchant dashboard, and supervisor panel completed.",
      icon: Code,
      status: "completed"
    },
    {
      date: "October 2025",
      title: "AI Integration",
      description: "OpenAI GPT-4 integration with vector embeddings for semantic knowledge search.",
      icon: Brain,
      status: "completed"
    },
    {
      date: "November 2025",
      title: "Widget & Escalation",
      description: "Embeddable chat widget with real-time human escalation and supervisor assignment.",
      icon: MessageCircle,
      status: "completed"
    },
    {
      date: "November 2025",
      title: "Payment Integration",
      description: "1-Pay Indonesian payment gateway with QRIS support for local transactions.",
      icon: Target,
      status: "completed"
    },
    {
      date: "December 9, 2025",
      title: "LEXA1 Launch",
      description: "Official launch of LEXA1 AI Engine - the next generation of intelligent customer service.",
      icon: Award,
      status: "upcoming"
    },
  ];

  return (
    <section className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            <Calendar className="w-3 h-3 mr-1" />
            Development Timeline
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Building the Future of<br />Customer Service
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Key milestones in our journey to launch LEXA1, the AI engine powering Chatvice.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-purple-200 dark:bg-purple-800/50 hidden md:block" />
          
          <div className="space-y-8 md:space-y-12">
            {milestones.map((milestone, index) => (
              <div key={index} className={`flex flex-col md:flex-row gap-4 md:gap-8 items-center ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                  <Card className={`p-6 ${milestone.status === "upcoming" ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : ""}`}>
                    <div className={`flex items-center gap-2 mb-2 ${index % 2 === 0 ? "md:justify-end" : ""}`}>
                      <Badge variant={milestone.status === "upcoming" ? "default" : "secondary"} className={milestone.status === "upcoming" ? "bg-purple-600" : ""}>
                        {milestone.date}
                      </Badge>
                      {milestone.status === "completed" && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{milestone.title}</h3>
                    <p className="text-muted-foreground">{milestone.description}</p>
                  </Card>
                </div>
                
                <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${milestone.status === "upcoming" ? "bg-purple-600 text-white" : "bg-purple-100 dark:bg-purple-900/50 text-purple-600"}`}>
                  <milestone.icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesPreview() {
  const features = [
    {
      icon: Brain,
      title: "LEXA1 AI Engine",
      description: "Advanced language model with reasoning capabilities for accurate, context-aware responses.",
    },
    {
      icon: Database,
      title: "Smart Knowledge Base",
      description: "Vector embeddings for semantic search. Import from websites, files, or manual input.",
    },
    {
      icon: HeadphonesIcon,
      title: "Human Escalation",
      description: "Seamless handoff to supervisors with round-robin assignment and real-time chat takeover.",
    },
    {
      icon: MessageCircle,
      title: "Embeddable Widget",
      description: "Beautiful, customizable chat widget that works on any website with simple embed code.",
    },
    {
      icon: Shield,
      title: "Identity Verification",
      description: "JWT-based customer authentication for secure, personalized conversations.",
    },
    {
      icon: Globe,
      title: "Multi-Language Support",
      description: "Automatic language detection with AI responses in customer's preferred language.",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Features
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything You Need for<br />AI Customer Service
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chatvice powered by LEXA1 gives you all the tools to build, deploy, and scale intelligent customer support.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover-elevate p-6 group">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <feature.icon className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/features">
            <Button size="lg" variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/30">
              View All Features
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingPreview() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small businesses getting started with AI support.",
      features: [
        "1 AI Agent",
        "1,000 messages/month",
        "Basic knowledge base",
        "Email support",
        "Standard widget",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      price: "$99",
      period: "/month",
      description: "For growing teams that need more power and flexibility.",
      features: [
        "5 AI Agents",
        "10,000 messages/month",
        "Advanced knowledge base",
        "Priority support",
        "Custom widget styling",
        "Human escalation",
        "Analytics dashboard",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with advanced requirements.",
      features: [
        "Unlimited AI Agents",
        "Unlimited messages",
        "Full API access",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee",
        "On-premise option",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your business. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} className={`p-6 relative ${plan.popular ? "border-purple-500 shadow-lg shadow-purple-500/10" : ""}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600">
                  Most Popular
                </Badge>
              )}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-purple-600 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/pricing">
                <Button 
                  className={`w-full ${plan.popular ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-purple-600 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Badge className="bg-white/20 text-white mb-6">
          <Rocket className="w-3 h-3 mr-1" />
          Launch: December 9, 2025
        </Badge>
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Ready to Transform Your<br />Customer Service?
        </h2>
        <p className="text-lg text-purple-100 mb-8 max-w-2xl mx-auto">
          Join thousands of businesses already using LEXA1 to deliver exceptional customer experiences.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 px-8 font-semibold">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
              Talk to Sales
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const footerLinks = {
    product: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/integrations" },
      { label: "API", href: "/api-docs" },
      { label: "Changelog", href: "/changelog" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Partners", href: "/partners" },
    ],
    resources: [
      { label: "Documentation", href: "/docs" },
      { label: "Help Center", href: "/help" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
      { label: "Status", href: "/status" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "GDPR", href: "/gdpr" },
      { label: "Security", href: "/security" },
    ],
  };

  const { resolvedTheme } = useTheme();
  const chatviceLogo = resolvedTheme === "dark" ? chatviceLogoDark : chatviceLogoLight;

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <img src={chatviceLogo} alt="Chatvice" className="h-8" />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              AI-powered customer service platform built for the future.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-4 h-4 text-purple-600" />
              <span>Powered by <span className="font-semibold text-purple-600">LEXA1</span></span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Chatvice. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
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
      <HeroSection />
      <StatsSection />
      <TimelineSection />
      <FeaturesPreview />
      <PricingPreview />
      <CTASection />
      <Footer />
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
