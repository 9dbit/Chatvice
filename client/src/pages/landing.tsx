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
import { subscriptionPlans } from "@shared/schema";
import chatviceLogoLight from "@assets/Chatvice-02_1764703423166.png";
import chatviceLogoDark from "@assets/Chatvice-04_1764704922816.png";
import advancedReportingImage from "@assets/advanced-reporting_1764865696013.webp";
import compareAiModelsImage from "@assets/compare-ai-models_1764865696016.webp";
import designedForSimplicityImage from "@assets/designed-for-simplicity_1764865696016.webp";
import engineeredForSecurityImage from "@assets/engineered-for-security_1764865696016.webp";
import purposeBuiltForLlmsImage from "@assets/purpose-built-for-llms_1764865696017.webp";
import maleAvatar from "@assets/345c6d52234bbc72407ea25d49ad945e_1764867029228.jpg";
import femaleAvatar from "@assets/b80ad9fd48f0b1e8d404775c495633be_1764867029228.jpg";
import heroBackgroundImage from "@assets/IMG_0185_1764870218768.jpeg";

function RunningTextBanner() {
  const textContent = "MEET LEXA1. THE NEXT POWERFUL AI CHATBOT.";
  const items = Array(15).fill(null);
  
  return (
    <div 
      className="overflow-hidden whitespace-nowrap flex items-center flex-shrink-0 h-[180px] md:h-[300px]"
      style={{ 
        backgroundColor: '#7c3aed',
        fontStyle: 'normal',
        fontWeight: 800,
        letterSpacing: '-0.07em',
        lineHeight: 0.8,
        textTransform: 'uppercase',
      }}
    >
      <div 
        className="flex flex-shrink-0 marquee-inner items-center"
        style={{
          animation: 'marquee 243s linear infinite',
          height: '100%'
        }}
      >
        {items.map((_, index) => (
          <span 
            key={index}
            className="font-bold text-white flex-shrink-0 flex items-center text-[150px] md:text-[clamp(200px,25vw,350px)]"
            style={{ 
              fontFamily: "'D-DIN', sans-serif",
              paddingRight: '3rem',
              lineHeight: 1
            }}
          >
            {textContent}  .  
          </span>
        ))}
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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-background ${isScrolled ? "border-b border-border shadow-sm" : ""}`}>
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
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

interface WidgetConfig {
  isDark: boolean;
  brandColor: string;
  headerColor: string;
  buttonColor: string;
  avatar: string;
}

function CustomizableWidget({ config }: { config: WidgetConfig }) {
  const [messages] = useState<Array<{ role: "user" | "bot"; content: string }>>([
    { role: "bot", content: "Hi! I'm Lexa1, your intelligent AI assistant. How can I help you today?" },
    { role: "user", content: "What can you do?" },
    { role: "bot", content: "I can answer questions, help with customer support, manage knowledge bases, and seamlessly escalate to human agents when needed!" }
  ]);

  const bgClass = config.isDark ? "bg-gray-900" : "bg-white";
  const textClass = config.isDark ? "text-white" : "text-gray-900";
  const borderClass = config.isDark ? "border-gray-700" : "border-gray-200";
  const msgBgClass = config.isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900";

  return (
    <div className={`w-full max-w-sm rounded-2xl border ${borderClass} shadow-2xl overflow-hidden ${bgClass}`}>
      <div className="p-4" style={{ backgroundColor: config.headerColor }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
            <img src={config.avatar} alt="Agent" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-bold text-white text-lg">Lexa1</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white/80">Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`h-64 overflow-y-auto p-4 space-y-4 ${bgClass}`}>
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "bot" && (
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <img src={config.avatar} alt="Agent" className="w-full h-full object-cover" />
              </div>
            )}
            <div 
              className={`rounded-2xl p-3 max-w-[85%] ${msg.role === "user" ? "text-white rounded-br-sm" : `${msgBgClass} rounded-bl-sm`}`}
              style={msg.role === "user" ? { backgroundColor: config.brandColor } : undefined}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`p-4 border-t ${borderClass} ${bgClass}`}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className={`flex-1 px-4 py-2 rounded-full border ${borderClass} ${bgClass} ${textClass} text-sm focus:outline-none`}
            readOnly
          />
          <button 
            className="p-2 rounded-full text-white"
            style={{ backgroundColor: config.buttonColor }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className={`text-[10px] mt-2 ${config.isDark ? "text-gray-400" : "text-gray-500"}`}>
          Powered by <span className="font-semibold" style={{ color: config.brandColor }}>Chatvice</span>
        </p>
      </div>
    </div>
  );
}

function WidgetCustomizerSection() {
  const [config, setConfig] = useState<WidgetConfig>({
    isDark: false,
    brandColor: "#7c3aed",
    headerColor: "#7c3aed",
    buttonColor: "#7c3aed",
    avatar: maleAvatar,
  });

  const colorPresets = [
    { name: "Purple", value: "#7c3aed" },
    { name: "Blue", value: "#2563eb" },
    { name: "Green", value: "#16a34a" },
    { name: "Red", value: "#dc2626" },
    { name: "Orange", value: "#ea580c" },
    { name: "Pink", value: "#db2777" },
  ];

  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-left mb-16">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            <Settings className="w-3 h-3 mr-1" />
            Widget Customization
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Design Your Perfect Chat Widget
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Customize colors, themes, and avatar to match your brand identity. Try it live!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-6">Appearance Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Theme Mode</p>
                    <p className="text-sm text-muted-foreground">Switch between light and dark</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfig(c => ({ ...c, isDark: false }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!config.isDark ? "bg-purple-600 text-white" : "bg-muted hover:bg-muted/80"}`}
                      data-testid="button-theme-light"
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setConfig(c => ({ ...c, isDark: true }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${config.isDark ? "bg-purple-600 text-white" : "bg-muted hover:bg-muted/80"}`}
                      data-testid="button-theme-dark"
                    >
                      Dark
                    </button>
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-3">Brand Color</p>
                  <div className="flex gap-2">
                    {colorPresets.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setConfig(c => ({ ...c, brandColor: color.value }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${config.brandColor === color.value ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        data-testid={`button-color-brand-${color.name.toLowerCase()}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-3">Header Color</p>
                  <div className="flex gap-2">
                    {colorPresets.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setConfig(c => ({ ...c, headerColor: color.value }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${config.headerColor === color.value ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        data-testid={`button-color-header-${color.name.toLowerCase()}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-3">Button Color</p>
                  <div className="flex gap-2">
                    {colorPresets.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setConfig(c => ({ ...c, buttonColor: color.value }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${config.buttonColor === color.value ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        data-testid={`button-color-button-${color.name.toLowerCase()}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-3">Agent Avatar</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setConfig(c => ({ ...c, avatar: maleAvatar }))}
                      className={`w-16 h-16 rounded-full overflow-hidden border-4 transition-all ${config.avatar === maleAvatar ? "border-purple-600 scale-110" : "border-transparent"}`}
                      data-testid="button-avatar-male"
                    >
                      <img src={maleAvatar} alt="Male Avatar" className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => setConfig(c => ({ ...c, avatar: femaleAvatar }))}
                      className={`w-16 h-16 rounded-full overflow-hidden border-4 transition-all ${config.avatar === femaleAvatar ? "border-purple-600 scale-110" : "border-transparent"}`}
                      data-testid="button-avatar-female"
                    >
                      <img src={femaleAvatar} alt="Female Avatar" className="w-full h-full object-cover" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex justify-center lg:sticky lg:top-24">
            <CustomizableWidget config={config} />
          </div>
        </div>
      </div>
    </section>
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
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-purple-200 dark:border-purple-800/50 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
            <img src={maleAvatar} alt="Lexa1" className="w-full h-full object-cover" />
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

      <div ref={scrollRef} className="h-72 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "bot" && (
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <img src={maleAvatar} alt="Lexa1" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={`rounded-2xl p-3 max-w-[85%] ${msg.role === "user" ? "bg-purple-600 text-white rounded-br-sm" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-sm shadow-sm"}`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
              <img src={maleAvatar} alt="Lexa1" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm p-3 shadow-sm">
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
        <div className="px-4 pb-2 flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-900">
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
        <p className="text-[10px] text-muted-foreground mt-2">
          Powered by <span className="font-semibold text-purple-600">Lexa1</span> AI Engine
        </p>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative">
      <div className="h-16" />
      
      <RunningTextBanner />

      <div className="relative h-[500px] md:h-[calc(100vh-64px-300px)]">
        <div 
          className="absolute inset-0 w-full bg-cover bg-no-repeat -z-10"
          style={{ 
            backgroundImage: `url(${heroBackgroundImage})`,
            backgroundPosition: 'center -400px',
            backgroundSize: 'cover'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent via-60% to-[hsl(var(--background))]" />
        </div>

        <div className="relative flex flex-col justify-end h-full">
          <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 pb-12 md:pb-24 mt-[170px]">
            <div className="max-w-xl md:max-w-3xl text-left">
              <p className="text-white/80 text-sm md:text-xl font-medium mb-3 md:mb-6 tracking-wide" style={{ fontFamily: "'D-DIN', sans-serif" }}>
                09 December 2025
              </p>
              <h1 className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tight leading-[0.95] text-white mb-4 md:mb-8" style={{ fontFamily: "'D-DIN', sans-serif" }}>
                Meet<br />
                <span className="text-[#7c3aed]">LEXA1</span>
              </h1>
              <p className="text-base md:text-2xl text-white/90 max-w-xl leading-relaxed mb-6 md:mb-10 text-left">
                AI-powered customer service platform that transforms how you connect with customers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-6 md:px-8 font-semibold text-sm md:text-base" data-testid="button-hero-start">
                    Start Building Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/features">
                  <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 backdrop-blur-sm px-6 md:px-8 text-sm md:text-base" data-testid="button-hero-features">
                    Explore Features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-background">

        <div className="py-10 md:py-16 relative z-10">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-left mb-16">
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                <Sparkles className="w-3 h-3 mr-1" />
                Why Chatvice
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'D-DIN', sans-serif" }}>
                Powerful Features
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Everything you need to deliver exceptional customer service
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="group relative rounded-2xl overflow-hidden shadow-xl h-80 md:h-[420px] hover-elevate cursor-pointer">
                <img 
                  src={advancedReportingImage} 
                  alt="Advanced Reporting" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <Badge className="bg-[#7c3aed] text-white mb-3">Analytics</Badge>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'D-DIN', sans-serif" }}>Advanced Reporting</h3>
                  <p className="text-white/80 text-sm md:text-base">Real-time dashboards with AI-powered insights to track customer satisfaction and agent performance.</p>
                </div>
              </div>

              <div className="group relative rounded-2xl overflow-hidden shadow-xl h-80 md:h-[420px] hover-elevate cursor-pointer">
                <img 
                  src={engineeredForSecurityImage} 
                  alt="Enterprise Security" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <Badge className="bg-[#7c3aed] text-white mb-3">Security</Badge>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'D-DIN', sans-serif" }}>Enterprise Security</h3>
                  <p className="text-white/80 text-sm md:text-base">Bank-level encryption and SOC 2 compliance to protect your customer conversations.</p>
                </div>
              </div>

              <div className="group relative rounded-2xl overflow-hidden shadow-xl h-80 md:h-[420px] hover-elevate cursor-pointer">
                <img 
                  src={designedForSimplicityImage} 
                  alt="Easy Setup" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <Badge className="bg-[#7c3aed] text-white mb-3">Simplicity</Badge>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'D-DIN', sans-serif" }}>Easy Setup</h3>
                  <p className="text-white/80 text-sm md:text-base">Deploy your AI agent in minutes with our intuitive dashboard. No coding required.</p>
                </div>
              </div>

              <div className="group relative rounded-2xl overflow-hidden shadow-xl h-80 md:h-[420px] hover-elevate cursor-pointer">
                <img 
                  src={purposeBuiltForLlmsImage} 
                  alt="Multi-Model AI" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <Badge className="bg-[#7c3aed] text-white mb-3">AI Engine</Badge>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'D-DIN', sans-serif" }}>Multi-Model AI</h3>
                  <p className="text-white/80 text-sm md:text-base">Powered by multiple LLM providers including OpenAI, Google, and Anthropic for best responses.</p>
                </div>
              </div>
            </div>
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
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-left">
              <div className="w-12 h-12 mb-4 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
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
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-left mb-16">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            <Calendar className="w-3 h-3 mr-1" />
            Development Timeline
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Building the Future of<br />Customer Service
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Key milestones in our journey to launch LEXA1, the AI engine powering Chatvice.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 h-full w-0.5 bg-purple-200 dark:bg-purple-800/50" />
          
          <div className="space-y-4 md:space-y-12">
            {milestones.map((milestone, index) => (
              <div key={index} className={`flex flex-row md:flex-row gap-3 md:gap-8 items-start md:items-center ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                <div className={`hidden md:block flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
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
                
                <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center z-10 shrink-0 ${milestone.status === "upcoming" ? "bg-purple-600 text-white" : "bg-purple-100 dark:bg-purple-900/50 text-purple-600"}`}>
                  <milestone.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                
                <div className="flex-1 md:hidden">
                  <div className={`${milestone.status === "upcoming" ? "border-l-2 border-purple-500 pl-3" : "pl-3"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={milestone.status === "upcoming" ? "default" : "secondary"} className={`text-xs ${milestone.status === "upcoming" ? "bg-purple-600" : ""}`}>
                        {milestone.date}
                      </Badge>
                      {milestone.status === "completed" && (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    <h3 className="text-base font-bold mb-1">{milestone.title}</h3>
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  </div>
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
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-left mb-16">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Features
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything You Need for<br />AI Customer Service
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Chatvice powered by LEXA1 gives you all the tools to build, deploy, and scale intelligent customer support.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover-elevate p-6 group">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <feature.icon className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-left">{feature.title}</h3>
              <p className="text-muted-foreground text-sm text-left">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="text-left mt-12">
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
  const allPlanKeys = ["free", "starter", "pro", "enterprise", "custom"] as const;

  const getPrice = (plan: typeof subscriptionPlans[keyof typeof subscriptionPlans]) => {
    if (plan.monthlyPrice === -1) return "Contact";
    if (plan.monthlyPrice === 0) return "$0";
    return `$${plan.monthlyPrice}`;
  };

  const getCta = (planId: string) => {
    if (planId === "free") return "Start Free";
    if (planId === "enterprise" || planId === "custom") return "Contact";
    return "Try Free";
  };

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-left mb-10">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Choose the plan that fits your business. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 scrollbar-hide">
          {allPlanKeys.map((planKey) => {
            const plan = subscriptionPlans[planKey];
            const isPro = planKey === "pro";
            const isEnterprise = planKey === "enterprise" || planKey === "custom";
            return (
              <Card 
                key={planKey} 
                className={`p-4 relative flex-shrink-0 w-[220px] ${isPro ? "border-purple-500 shadow-lg shadow-purple-500/10" : ""} ${isEnterprise ? "bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background border-purple-200 dark:border-purple-800/50" : ""}`}
              >
                {isPro && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-xs px-2 py-0.5">
                    Popular
                  </Badge>
                )}
                <div className="mb-4">
                  <h3 className="text-base font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{getPrice(plan)}</span>
                    {plan.monthlyPrice !== -1 && <span className="text-xs text-muted-foreground">/mo</span>}
                  </div>
                </div>
                <ul className="space-y-1.5 mb-4 min-h-[100px]">
                  {plan.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-left">
                      <Check className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={isEnterprise ? "/contact" : "/pricing"}>
                  <Button 
                    size="sm"
                    className={`w-full text-xs ${isPro || isEnterprise ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                    variant={isPro || isEnterprise ? "default" : "outline"}
                  >
                    {getCta(planKey)}
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>

        <div className="text-left mt-6">
          <Link href="/pricing" className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium">
            View full pricing details
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-purple-600 text-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <Badge className="bg-white/20 text-white mb-6">
            <Rocket className="w-3 h-3 mr-1" />
            Launch: December 9, 2025
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-left">
            Ready to Transform Your<br />Customer Service?
          </h2>
          <p className="text-lg text-purple-100 mb-8 text-left">
            Join thousands of businesses already using LEXA1 to deliver exceptional customer experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
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
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <img src={chatviceLogo} alt="Chatvice" className="h-8" />
            </Link>
            <p className="text-sm text-muted-foreground mb-4 text-left">
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
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <WidgetCustomizerSection />
      <TimelineSection />
      <FeaturesPreview />
      <PricingPreview />
      <CTASection />
      <Footer />
    </div>
  );
}
