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
  User,
  DollarSign,
  Gift,
  Wallet,
  Inbox,
  Bell,
  Store,
  UserPlus,
  KeyRound,
  Heart,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SchemaMarkup } from "@/components/seo/schema-markup";

const landingSoftwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Chatvice",
  "description": "AI-powered customer service chatbot platform for businesses. Automate support, reduce costs, and delight customers with intelligent AI agents powered by LEXA1.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://chatvice.app",
  "offers": [
    { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD", "description": "Free plan with basic features" },
    { "@type": "Offer", "name": "Starter", "price": "29", "priceCurrency": "USD", "description": "1 agent, 1,000 messages/month, basic features" },
    { "@type": "Offer", "name": "Pro", "price": "99", "priceCurrency": "USD", "description": "5 agents, 10,000 messages/month, human escalation, analytics" },
    { "@type": "Offer", "name": "Enterprise", "description": "Unlimited agents and messages, SLA, dedicated support" }
  ]
};

interface LandingPageSettings {
  id: string;
  heroBackgroundUrl: string | null;
  heroBackgroundOffsetX: number;
  heroBackgroundOffsetY: number;
  heroBackgroundMobileOffsetX: number;
  heroBackgroundMobileOffsetY: number;
  heroContentPaddingTop: number;
  heroContentMobilePaddingTop: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  runningTextEnabled: boolean;
  runningTextContent: string;
  runningTextSpeed: number;
  runningTextBgColor: string;
  runningTextColor: string;
  featuresLayout: string;
  extras: Record<string, any> | null;
}
import { useTheme } from "@/components/theme-provider";
import { subscriptionPlans } from "@shared/schema";
import { formatPriceIdr, planDisplayName } from "@/lib/pricing";

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

function FlippingHeroText() {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  // Get taglines from translations
  const taglines = [
    t('hero.taglines.0') || "Scale your support team instantly —\nno extra hires needed.",
    t('hero.taglines.1') || "Deliver flawless, consistent responses\nevery single time.",
    t('hero.taglines.2') || "Transform how you connect\nwith customers, 24/7.",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % taglines.length);
        setIsFlipping(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [taglines.length]);

  return (
    <p 
      className="text-base md:text-2xl text-white/90 max-w-xl leading-tight mb-3 md:mb-4 text-left transition-all duration-300 whitespace-pre-line"
      style={{
        transform: isFlipping ? 'rotateX(90deg)' : 'rotateX(0deg)',
        opacity: isFlipping ? 0 : 1,
        transformOrigin: 'center center',
      }}
    >
      {taglines[currentIndex]}
    </p>
  );
}
import chatviceLogoLight from "@assets/Chatvice-02_1769691434945.png";
import chatviceLogoDark from "@assets/Chatvice-04_1769691434945.png";
import advancedReportingImage from "@assets/banner_human_analytics.png";
import compareAiModelsImage from "@assets/compare-ai-models_1764865696016.webp";
import designedForSimplicityImage from "@assets/banner_human_simplicity.png";
import engineeredForSecurityImage from "@assets/banner_human_security.png";
import purposeBuiltForLlmsImage from "@assets/banner_human_ai_engine.png";
import maleAvatar from "@assets/345c6d52234bbc72407ea25d49ad945e_1764867029228.jpg";
import femaleAvatar from "@assets/b80ad9fd48f0b1e8d404775c495633be_1764867029228.jpg";
import heroBackgroundImage from "@assets/IMG_0185_1764870218768.jpeg";
import heroBackgroundVideo from "@assets/copy_53B9DA66-03D2-4D92-A023-B952385D4A77_1766983330206.mov";

function RunningTextBanner({ settings }: { settings?: LandingPageSettings }) {
  const textContent = settings?.runningTextContent || "MEET LEXA1. THE NEXT POWERFUL AI CHATBOT.";
  const bgColor = settings?.runningTextBgColor || "#7c3aed";
  const textColor = settings?.runningTextColor || "#ffffff";
  const speed = settings?.runningTextSpeed || 30;
  const isEnabled = settings?.runningTextEnabled ?? true;
  const items = Array(10).fill(null);
  
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Desktop speed is 5x slower (20% of mobile speed)
  // Mobile speed is also reduced by 70% (3.33x slower than original)
  const actualSpeed = isMobile ? speed * 3.33 : speed * 5;
  
  if (!isEnabled) {
    return null;
  }
  
  return (
    <div 
      className="overflow-hidden whitespace-nowrap flex items-center flex-shrink-0 h-[140px] md:h-[300px]"
      style={{ 
        backgroundColor: bgColor,
        fontStyle: 'normal',
        fontWeight: 800,
        letterSpacing: '-0.07em',
        lineHeight: 0.8,
        textTransform: 'uppercase',
      }}
    >
      <div className="marquee-inner items-center h-full" style={{ animationDuration: `${actualSpeed}s` }}>
        {items.map((_, index) => (
          <span 
            key={index}
            className="font-bold flex-shrink-0 inline-flex items-center text-[137px] md:text-[clamp(200px,25vw,350px)] pr-8 md:pr-12"
            style={{ 
              fontFamily: "'D-DIN', sans-serif",
              lineHeight: 1,
              color: textColor,
            }}
          >
            {textContent}
          </span>
        ))}
        {items.map((_, index) => (
          <span 
            key={`dup-${index}`}
            className="font-bold flex-shrink-0 inline-flex items-center text-[137px] md:text-[clamp(200px,25vw,350px)] pr-8 md:pr-12"
            style={{ 
              fontFamily: "'D-DIN', sans-serif",
              lineHeight: 1,
              color: textColor,
            }}
          >
            {textContent}
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
  const { t } = useLanguage();
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
    { labelKey: "nav.home", href: "/" },
    { labelKey: "nav.features", href: "/features" },
    { labelKey: "nav.pricing", href: "/pricing" },
    { labelKey: "nav.api", href: "/api-docs" },
    { labelKey: "nav.faq", href: "/faq" },
    { labelKey: "nav.about", href: "/about" },
    { labelKey: "nav.chatPlatform", href: "https://web.chatvice.app", external: true },
  ];

  return (
    <div className="overflow-x-hidden w-full">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-background ${isScrolled ? "border-b border-border shadow-sm" : ""}`}>
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-4 h-16">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0" data-testid="link-logo">
              <img src={chatviceLogo} alt="Chatvice" className="h-7 sm:h-8 w-auto" />
            </Link>
            
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                link.external ? (
                  <a 
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-nav-${link.labelKey.split('.')[1]}`}
                  >
                    {t(link.labelKey)}
                  </a>
                ) : (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-nav-${link.labelKey.split('.')[1]}`}
                  >
                    {t(link.labelKey)}
                  </Link>
                )
              ))}
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              {isCheckingAuth ? (
                <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
              ) : isLoggedIn ? (
                <Link href="/dashboard">
                  <Button data-testid="button-dashboard">{t('nav.dashboard')}</Button>
                </Link>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" data-testid="button-login">{t('nav.signIn')}</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-get-started">
                      {t('nav.getStarted')}
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
              link.external ? (
                <a 
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-medium py-3 border-b border-border"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t(link.labelKey)}
                </a>
              ) : (
                <Link 
                  key={link.href}
                  href={link.href}
                  className="text-lg font-medium py-3 border-b border-border"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t(link.labelKey)}
                </Link>
              )
            ))}
            <div className="flex flex-col gap-3 pt-4">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">{t('nav.signIn')}</Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">{t('nav.getStarted')}</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface WidgetConfig {
  isDark: boolean;
  brandColor: string;
  headerColor: string;
  buttonColor: string;
  avatar: string;
}

function WidgetCustomizerSection() {
  const { t } = useLanguage();
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
            {t('widgetCustomizer.badge')}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('widgetCustomizer.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t('widgetCustomizer.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-6">{t('widgetCustomizer.appearance')}</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t('widgetCustomizer.themeMode')}</p>
                    <p className="text-sm text-muted-foreground">{t('widgetCustomizer.themeModeDesc')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfig(c => ({ ...c, isDark: false }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!config.isDark ? "bg-purple-600 text-white" : "bg-muted hover:bg-muted/80"}`}
                      data-testid="button-theme-light"
                    >
                      {t('widgetCustomizer.light')}
                    </button>
                    <button
                      onClick={() => setConfig(c => ({ ...c, isDark: true }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${config.isDark ? "bg-purple-600 text-white" : "bg-muted hover:bg-muted/80"}`}
                      data-testid="button-theme-dark"
                    >
                      {t('widgetCustomizer.dark')}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-3">{t('widgetCustomizer.brandColor')}</p>
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
                  <p className="font-medium mb-3">{t('widgetCustomizer.headerColor')}</p>
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
                  <p className="font-medium mb-3">{t('widgetCustomizer.buttonColor')}</p>
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
                  <p className="font-medium mb-3">{t('widgetCustomizer.agentAvatar')}</p>
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
            <Lexa1ChatWidget config={config} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Lexa1ChatWidget({ config }: { config: WidgetConfig }) {
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

  const bgClass = config.isDark ? "bg-gray-900" : "bg-white";
  const borderClass = config.isDark ? "border-gray-700" : "border-purple-200";
  const msgBgClass = config.isDark ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200";
  const scrollBgClass = config.isDark ? "bg-gray-900" : "bg-gray-50";
  const inputClass = config.isDark ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" : "bg-white border-gray-200 text-gray-900";
  const poweredByClass = config.isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`w-full max-w-sm rounded-2xl border ${borderClass} shadow-2xl overflow-hidden ${bgClass}`}>
      <div className="p-4" style={{ backgroundColor: config.headerColor }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
            <img src={config.avatar} alt="Lexa1" className="w-full h-full object-cover" />
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

      <div ref={scrollRef} className={`h-72 overflow-y-auto p-4 space-y-4 ${scrollBgClass}`}>
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "bot" && (
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <img src={config.avatar} alt="Lexa1" className="w-full h-full object-cover" />
              </div>
            )}
            <div 
              className={`rounded-2xl p-3 max-w-[85%] ${msg.role === "user" ? "text-white rounded-br-sm" : `${msgBgClass} border rounded-bl-sm shadow-sm`}`}
              style={msg.role === "user" ? { backgroundColor: config.brandColor } : undefined}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
              <img src={config.avatar} alt="Lexa1" className="w-full h-full object-cover" />
            </div>
            <div className={`${msgBgClass} border rounded-2xl rounded-bl-sm p-3 shadow-sm`}>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: config.brandColor, animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: config.brandColor, animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: config.brandColor, animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={`px-4 pb-2 flex flex-wrap gap-2 ${scrollBgClass}`}>
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => {
              if (isTyping) return;
              setMessages(prev => [...prev, { role: "user", content: q }]);
              setIsTyping(true);
              askMutation.mutate(q);
            }}
            disabled={isTyping}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              isTyping 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:opacity-80"
            }`}
            style={{
              borderColor: config.brandColor,
              color: config.brandColor,
              backgroundColor: isTyping ? 'transparent' : `${config.brandColor}15`
            }}
            data-testid={`button-suggested-${i}`}
          >
            {q}
          </button>
        ))}
      </div>

      <div className={`p-4 border-t ${borderClass} ${bgClass}`}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button 
              className="p-2 transition-colors" 
              style={{ color: config.brandColor }}
              title="Upload image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button 
              className="p-2 transition-colors" 
              style={{ color: config.brandColor }}
              title="Take photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask Lexa1 anything..."
            className={`flex-1 ${inputClass}`}
            data-testid="input-demo-chat"
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={isTyping}
            style={{ backgroundColor: config.buttonColor }}
            data-testid="button-demo-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className={`text-[10px] mt-2 ${poweredByClass}`}>
          Powered by <span className="font-semibold" style={{ color: config.brandColor }}>Lexa1</span> AI Engine
        </p>
      </div>
    </div>
  );
}

function HeroSection() {
  const { t } = useLanguage();
  const { data: settings } = useQuery<LandingPageSettings>({
    queryKey: ["/api/landing-settings"],
  });

  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Force play video on iOS/iPad
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure muted attribute is set for iOS
    video.muted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');

    // Try to play the video
    const playVideo = () => {
      video.play().catch(() => {
        // If autoplay fails, try again on user interaction
        const handleInteraction = () => {
          video.play();
          document.removeEventListener('touchstart', handleInteraction);
          document.removeEventListener('click', handleInteraction);
        };
        document.addEventListener('touchstart', handleInteraction, { once: true });
        document.addEventListener('click', handleInteraction, { once: true });
      });
    };

    // Play immediately and also when video becomes visible
    playVideo();
    
    // Also try to play when the page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        playVideo();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const bgOffsetX = isMobile 
    ? (settings?.heroBackgroundMobileOffsetX ?? 0) 
    : (settings?.heroBackgroundOffsetX ?? 0);
  const bgOffsetY = isMobile 
    ? (settings?.heroBackgroundMobileOffsetY ?? 50) 
    : (settings?.heroBackgroundOffsetY ?? -570);
  const contentPaddingTop = isMobile 
    ? (settings?.heroContentMobilePaddingTop ?? 220) 
    : (settings?.heroContentPaddingTop ?? 70);

  const backgroundUrl = settings?.heroBackgroundUrl || heroBackgroundImage;

  return (
    <section className="relative">
      <div className="h-16" />
      
      <RunningTextBanner settings={settings} />

      <div className="relative h-[500px] md:h-[calc(100vh-64px-300px)] overflow-hidden">
        <div className="fixed inset-0 w-full -z-10 hero-parallax overflow-hidden">
          <video 
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onEnded={(e) => {
              const video = e.currentTarget;
              video.currentTime = 0;
              video.play();
            }}
            className="w-full h-auto object-cover"
            style={{ 
              position: 'absolute',
              top: `${bgOffsetY}px`,
              left: '0',
              width: '100%',
              minWidth: '100%',
            }}
          >
            <source src={`${heroBackgroundVideo}#t=0.001`} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent via-60% to-[hsl(var(--background))]" />
        </div>

        <div className="relative flex flex-col justify-start h-full" style={{ paddingTop: `${contentPaddingTop}px` }}>
          <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="max-w-xl md:max-w-3xl text-left">
              <p className="text-white/80 text-sm md:text-xl font-medium mb-1 md:mb-2 tracking-wide" style={{ fontFamily: "'D-DIN', sans-serif" }}>
                09 December 2025
              </p>
              <h1 className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tight leading-[0.8] text-white mb-1 md:mb-2" style={{ fontFamily: "'D-DIN', sans-serif" }}>
                Meet<br />
                <span className="text-[#7c3aed]">LEXA1</span>
              </h1>
              <FlippingHeroText />
              <div className="flex flex-col sm:flex-row gap-2">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto min-w-[180px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-6 md:px-8 font-semibold text-sm md:text-base" data-testid="button-hero-start">
                    {t('hero.cta')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/features" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[180px] border-white/50 text-white backdrop-blur-sm px-6 md:px-8 text-sm md:text-base" data-testid="button-hero-features">
                    <Play className="w-4 h-4 mr-2" />
                    {t('hero.ctaSecondary')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Platform Promo Section */}
      <div className="relative bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        
        <div className="w-full px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-start gap-12">
            {/* Left Content - Left aligned */}
            <div className="flex-1 text-left">
              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white mb-4 px-4 py-1" data-testid="badge-chat-platform-promo">
                <Sparkles className="w-3 h-3 mr-1" />
                {t('chatPlatformPromo.badge')}
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent" style={{ fontFamily: "'D-DIN', sans-serif" }} data-testid="text-chat-platform-title">
                {t('chatPlatformPromo.title')}
              </h2>
              <p className="text-xl md:text-2xl font-medium text-purple-600 dark:text-purple-400 mb-4 italic" data-testid="text-chat-platform-tagline">
                {t('chatPlatformPromo.tagline')}
              </p>
              <p className="text-base text-muted-foreground mb-8 max-w-xl leading-relaxed" data-testid="text-chat-platform-subtitle">
                {t('chatPlatformPromo.subtitle')}
              </p>
              
              {/* Feature Points - 2x2 Grid */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20" data-testid="feature-chat-platform-keepintouch">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <p className="font-semibold text-sm">{t('chatPlatformPromo.feature1')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('chatPlatformPromo.feature1Desc')}</p>
                </div>
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20" data-testid="feature-chat-platform-history">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <p className="font-semibold text-sm">{t('chatPlatformPromo.feature2')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('chatPlatformPromo.feature2Desc')}</p>
                </div>
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20" data-testid="feature-chat-platform-multistore">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Store className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <p className="font-semibold text-sm">{t('chatPlatformPromo.feature3')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('chatPlatformPromo.feature3Desc')}</p>
                </div>
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20" data-testid="feature-chat-platform-seamless">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <p className="font-semibold text-sm">{t('chatPlatformPromo.feature4')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('chatPlatformPromo.feature4Desc')}</p>
                </div>
              </div>
              
              {/* Workflow Title */}
              <h3 className="text-lg font-semibold mb-4 text-foreground" data-testid="text-workflow-title">
                {t('chatPlatformPromo.workflowTitle')}
              </h3>
              
              {/* Workflow Steps - 2x2 grid on mobile, horizontal on desktop */}
              <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-2 md:gap-3 mb-8">
                {/* Step 1 */}
                <div className="flex items-center gap-2 bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-full px-3 md:px-4 py-2 border border-white/20 shadow-sm" data-testid="step-chat-platform-signup">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">1</div>
                  <span className="text-sm font-medium">{t('chatPlatformPromo.step1')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                
                {/* Step 2 */}
                <div className="flex items-center gap-2 bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-full px-3 md:px-4 py-2 border border-white/20 shadow-sm" data-testid="step-chat-platform-pin">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">2</div>
                  <span className="text-sm font-medium">{t('chatPlatformPromo.step2')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                
                {/* Step 3 */}
                <div className="flex items-center gap-2 bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-full px-3 md:px-4 py-2 border border-white/20 shadow-sm" data-testid="step-chat-platform-explore">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">3</div>
                  <span className="text-sm font-medium">{t('chatPlatformPromo.step3')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
                
                {/* Step 4 */}
                <div className="flex items-center gap-2 bg-white/60 dark:bg-white/10 backdrop-blur-md rounded-full px-3 md:px-4 py-2 border border-white/20 shadow-sm" data-testid="step-chat-platform-chat">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">4</div>
                  <span className="text-sm font-medium">{t('chatPlatformPromo.step4')}</span>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a 
                  href="https://web.chatvice.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  data-testid="link-chat-platform-cta"
                >
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 font-semibold"
                    data-testid="button-chat-platform-cta"
                  >
                    {t('chatPlatformPromo.cta')}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
            
            {/* Right - Phone Mockup with Chat Platform UI */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Phone Frame */}
                <div className="relative w-[280px] h-[560px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  {/* Screen - Chat Platform UI */}
                  <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden relative border border-border">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-6 py-2 bg-muted/50">
                      <span className="text-foreground text-xs font-medium">9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-2 border border-foreground/50 rounded-sm">
                          <div className="w-3 h-1 bg-foreground/50 rounded-sm m-0.5" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Chat Header */}
                    <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                        <Store className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">TechStore ID</p>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          Online
                        </p>
                      </div>
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    </div>
                    
                    {/* Chat Messages */}
                    <div className="px-3 py-3 space-y-3 h-[320px] overflow-hidden">
                      {/* AI Message */}
                      <div className="flex gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 max-w-[180px]">
                          <p className="text-xs text-foreground">Hello! Welcome to TechStore. How can I help you?</p>
                        </div>
                      </div>
                      
                      {/* User Message */}
                      <div className="flex justify-end">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[180px]">
                          <p className="text-xs">I want to check my order status</p>
                        </div>
                      </div>
                      
                      {/* AI Response */}
                      <div className="flex gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 max-w-[180px]">
                          <p className="text-xs text-foreground">Sure! Order #12345 is on the way. Estimated arrival tomorrow.</p>
                        </div>
                      </div>
                      
                      {/* Product Card */}
                      <div className="flex gap-2">
                        <div className="w-7 h-7 flex-shrink-0"></div>
                        <div className="bg-muted rounded-xl p-2 max-w-[200px] border border-border">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center">
                              <Cpu className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">Pro Smartphone</p>
                              <p className="text-xs text-green-500">View Details</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Input Area */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-3 bg-background border-t border-border">
                      <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-2">
                        <span className="text-xs text-muted-foreground flex-1">Type a message...</span>
                        <Send className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                  </div>
                  {/* Home Indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/30 rounded-full" />
                </div>
                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full blur-xl opacity-50" />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full blur-xl opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-background">

        <div className="pt-[50px] md:pt-0 py-10 md:py-16 relative z-10">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="text-left mb-10">
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                <Sparkles className="w-3 h-3 mr-1" />
                {t('features.badge')}
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'D-DIN', sans-serif" }}>
                {t('features.title')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                {t('features.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group flex flex-col hover-elevate cursor-pointer">
                <div className="relative rounded-xl overflow-hidden shadow-xl mb-4 aspect-[5/3]">
                  <img 
                    src={advancedReportingImage} 
                    alt="Advanced Reporting" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="px-1">
                  <Badge className="bg-[#7c3aed] text-white mb-2 text-xs">Analytics</Badge>
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-1" style={{ fontFamily: "'D-DIN', sans-serif" }}>Advanced Reporting</h3>
                  <p className="text-muted-foreground text-xs md:text-sm">Real-time dashboards with AI-powered insights.</p>
                </div>
              </div>

              <div className="group flex flex-col hover-elevate cursor-pointer">
                <div className="relative rounded-xl overflow-hidden shadow-xl mb-4 aspect-[5/3]">
                  <img 
                    src={engineeredForSecurityImage} 
                    alt="Enterprise Security" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="px-1">
                  <Badge className="bg-[#7c3aed] text-white mb-2 text-xs">Security</Badge>
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-1" style={{ fontFamily: "'D-DIN', sans-serif" }}>Enterprise Security</h3>
                  <p className="text-muted-foreground text-xs md:text-sm">Bank-level encryption and SOC 2 compliance.</p>
                </div>
              </div>

              <div className="group flex flex-col hover-elevate cursor-pointer">
                <div className="relative rounded-xl overflow-hidden shadow-xl mb-4 aspect-[5/3]">
                  <img 
                    src={designedForSimplicityImage} 
                    alt="Easy Setup" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="px-1">
                  <Badge className="bg-[#7c3aed] text-white mb-2 text-xs">Simplicity</Badge>
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-1" style={{ fontFamily: "'D-DIN', sans-serif" }}>Easy Setup</h3>
                  <p className="text-muted-foreground text-xs md:text-sm">Deploy your AI agent in minutes. No coding required.</p>
                </div>
              </div>

              <div className="group flex flex-col hover-elevate cursor-pointer">
                <div className="relative rounded-xl overflow-hidden shadow-xl mb-4 aspect-[5/3]">
                  <img 
                    src={purposeBuiltForLlmsImage} 
                    alt="Multi-Model AI" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="px-1">
                  <Badge className="bg-[#7c3aed] text-white mb-2 text-xs">AI Engine</Badge>
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-1" style={{ fontFamily: "'D-DIN', sans-serif" }}>Multi-Model AI</h3>
                  <p className="text-muted-foreground text-xs md:text-sm">Powered by OpenAI, Google, and Anthropic.</p>
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
    <section className="py-16 bg-muted/30 parallax-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className={`text-left parallax-fade-in parallax-delay-${index + 1}`}>
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

function BenefitsSections() {
  const { t } = useLanguage();
  const benefits = [
    { icon: TrendingUp, text: "Increase online sales" },
    { icon: Users, text: "Improve customer satisfaction" },
    { icon: Bot, text: "Automate customer service" },
  ];

  const testimonials = [
    {
      stars: 5,
      company: "Tech Solutions ID",
      location: "Indonesia",
      quote: "We've been using Chatvice for about a year now. It has greatly enhanced our ability to assist our customers.",
    },
    {
      stars: 5,
      company: "Jakarta Commerce",
      location: "Indonesia",
      quote: "LOVE this platform! Being able to help people live has really helped sales and engagement.",
    },
    {
      stars: 5,
      company: "Bali Hotels Group",
      location: "Indonesia",
      quote: "The AI responses are incredibly accurate. Our team can focus on complex issues while AI handles routine queries.",
    },
  ];

  return (
    <>
      {/* Increase Sales Section */}
      <section className="py-12 md:py-20 bg-background">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 mb-3 text-xs">
                INCREASE ONLINE SALES
              </Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-3 leading-tight">
                Engage with Chatvice, sell with ease
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 leading-relaxed">
                Your visitors are already interested — now put Chatvice to work. Start conversations with pre-set messages, recommend products, and guide them to the ideal purchase.
              </p>
              <Button asChild variant="outline" size="sm" className="text-xs" data-testid="button-sales-tools">
                <Link href="/features">
                  Sales boosting tools
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="order-1 lg:order-2">
              {/* Chatvice Widget Style Frame */}
              <div className="max-w-[320px] mx-auto">
                <Card className="overflow-hidden border-purple-200 dark:border-purple-800 shadow-xl">
                  {/* Widget Header */}
                  <div className="bg-purple-600 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Chatvice</p>
                      <p className="text-xs text-purple-100">Online</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  {/* Chat Messages */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 space-y-3">
                    {/* Customer Message */}
                    <div className="flex justify-end">
                      <div className="bg-purple-600 text-white rounded-2xl rounded-br-md px-3 py-2 text-xs max-w-[80%]">
                        Hi! Do you have any sunglasses for men?
                      </div>
                    </div>
                    {/* Agent Message */}
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-xs shadow-sm max-w-[80%]">
                        <p className="font-medium mb-1">Absolutely!</p>
                        <p className="text-muted-foreground">We've got some great options that might catch your eye.</p>
                      </div>
                    </div>
                    {/* Product Cards */}
                    <div className="flex gap-2 ml-8">
                      <Card className="p-2 flex-1 bg-white dark:bg-gray-800 shadow-sm border-purple-100 dark:border-purple-900">
                        <div className="h-12 bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-900 dark:to-purple-800 rounded mb-1" />
                        <p className="text-[10px] font-medium">Wooden Frame</p>
                        <Badge className="w-full mt-1 justify-center text-[10px] bg-purple-600 text-white cursor-pointer">View</Badge>
                      </Card>
                      <Card className="p-2 flex-1 bg-white dark:bg-gray-800 shadow-sm border-purple-100 dark:border-purple-900">
                        <div className="h-12 bg-gradient-to-br from-purple-300 to-purple-400 dark:from-purple-800 dark:to-purple-700 rounded mb-1" />
                        <p className="text-[10px] font-medium">Classic Style</p>
                        <Badge className="w-full mt-1 justify-center text-[10px] bg-purple-600 text-white cursor-pointer">View</Badge>
                      </Card>
                    </div>
                  </div>
                  {/* Input Area */}
                  <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
                        Type your message...
                      </div>
                      <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                        <Send className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Support Section */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div>
              {/* Chatvice Widget Style Frame */}
              <div className="max-w-[320px] mx-auto">
                <Card className="overflow-hidden border-purple-200 dark:border-purple-800 shadow-xl">
                  {/* Widget Header */}
                  <div className="bg-purple-600 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <HeadphonesIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Retreat Hotel</p>
                      <p className="text-xs text-purple-100">Support Team</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  {/* Chat Messages */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 space-y-3">
                    {/* Customer Message */}
                    <div className="flex justify-end">
                      <div className="bg-purple-600 text-white rounded-2xl rounded-br-md px-3 py-2 text-xs max-w-[85%]">
                        Hi, my plane landed 30 minutes early. Can I get picked up sooner?
                      </div>
                    </div>
                    {/* Agent Message */}
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-xs shadow-sm max-w-[80%]">
                        <p>Hi Olivia!</p>
                        <p className="mt-1">I'll arrange an earlier pick-up for you.</p>
                      </div>
                    </div>
                    {/* AI Response */}
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-xs shadow-sm max-w-[80%]">
                        <p>You'll get the details soon so you can kick off your getaway right away!</p>
                        <Badge className="mt-1 text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">AI-powered</Badge>
                      </div>
                    </div>
                    {/* Customer Response */}
                    <div className="flex justify-end">
                      <div className="bg-purple-600 text-white rounded-2xl rounded-br-md px-3 py-2 text-xs max-w-[80%]">
                        Great! Thank you!
                      </div>
                    </div>
                  </div>
                  {/* Input Area */}
                  <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
                        Type your message...
                      </div>
                      <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                        <Send className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
            <div>
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 mb-3 text-xs">
                IMPROVE CUSTOMER SATISFACTION
              </Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-3 leading-tight">
                Make premium support your new standard
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 leading-relaxed">
                Streamline your communication by handling all customer messages in Chatvice. With instant access to customer info, you'll deliver the top-notch service your customers deserve.
              </p>
              <Button asChild variant="outline" size="sm" className="text-xs" data-testid="button-support-features">
                <Link href="/features">
                  Efficient support features
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Automate Section */}
      <section className="py-12 md:py-20 bg-purple-50 dark:bg-purple-950/10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-3 text-xs">
                AUTOMATE CUSTOMER SERVICE
              </Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-3 leading-tight">
                Automate support and sales with AI customer service chatbots
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 leading-relaxed">
                When your support agents deal with repetitive tasks or common questions, use Chatvice AI to handle inquiries automatically. Let chatbots manage the routine and your team focus on delivering exceptional experience.
              </p>
              <Button asChild variant="outline" size="sm" className="text-xs" data-testid="button-automate-features">
                <Link href="/features">
                  Automate with Chatvice AI
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="order-1 lg:order-2">
              {/* Chatvice Widget Style Frame */}
              <div className="max-w-[320px] mx-auto">
                <Card className="overflow-hidden border-purple-200 dark:border-purple-800 shadow-xl">
                  {/* Widget Header */}
                  <div className="bg-purple-600 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Coffee Bot</p>
                      <p className="text-xs text-purple-100">AI Assistant</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                  {/* Chat Messages */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 space-y-3">
                    {/* Bot Message */}
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 text-xs shadow-sm max-w-[85%]">
                        Hi! I'm Coffee Bot. How can I help you today?
                      </div>
                    </div>
                    {/* Quick Reply Buttons */}
                    <div className="flex flex-wrap gap-1 ml-8">
                      {["Coffee workshops", "Events", "Book a table", "Your order"].map((opt) => (
                        <Badge key={opt} variant="outline" className="text-[10px] cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-800">
                          {opt}
                        </Badge>
                      ))}
                    </div>
                    {/* Events Card */}
                    <div className="ml-8">
                      <Card className="p-2 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
                        <p className="text-[10px] font-medium text-purple-700 dark:text-purple-300">Exciting events ahead:</p>
                        <div className="flex gap-2 mt-2">
                          <div className="flex-1 bg-white dark:bg-gray-800 rounded p-1.5 text-center shadow-sm">
                            <p className="text-[9px] font-medium">Latte Degustation</p>
                            <p className="text-[8px] text-muted-foreground">Dec 14, 7:30 pm</p>
                          </div>
                          <div className="flex-1 bg-white dark:bg-gray-800 rounded p-1.5 text-center shadow-sm">
                            <p className="text-[9px] font-medium">History of Coffee</p>
                            <p className="text-[8px] text-muted-foreground">Jan 8, 8:00 pm</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                  {/* Input Area */}
                  <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
                        Type your message...
                      </div>
                      <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                        <Send className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advance Reporting Section */}
      <section className="py-12 md:py-20 bg-background">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-8">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-3 text-xs">
              ADVANCE REPORTING
            </Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3 leading-tight">
              Data-driven insights at your fingertips
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Track performance, analyze trends, and make informed decisions with our comprehensive merchant dashboard analytics.
            </p>
          </div>
          
          {/* Dashboard Screenshots Grid - Light Mode Style */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Analytics Overview Card */}
            <Card className="overflow-hidden border-gray-200 shadow-lg bg-white">
              <div className="bg-gray-50 border-b border-gray-100 p-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-gray-600 ml-2">Analytics Overview</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-purple-700">2,847</p>
                    <p className="text-[10px] text-gray-600">Total Conversations</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-green-700">94.2%</p>
                    <p className="text-[10px] text-gray-600">Satisfaction Rate</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-600">Response Time</span>
                    <span className="text-xs font-semibold text-gray-800">1.2s avg</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: "85%" }} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Conversation Trends Card */}
            <Card className="overflow-hidden border-gray-200 shadow-lg bg-white">
              <div className="bg-gray-50 border-b border-gray-100 p-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-gray-600 ml-2">Conversation Trends</span>
              </div>
              <div className="p-4">
                <div className="flex items-end gap-1 h-24 mb-2">
                  {[45, 62, 38, 75, 55, 82, 68].map((h, i) => (
                    <div key={i} className="flex-1 bg-purple-500 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-gray-500">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-[10px] text-gray-600">+23% from last week</span>
                </div>
              </div>
            </Card>

            {/* AI Performance Card */}
            <Card className="overflow-hidden border-gray-200 shadow-lg bg-white">
              <div className="bg-gray-50 border-b border-gray-100 p-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-gray-600 ml-2">AI Performance</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">AI Resolution Rate</p>
                    <p className="text-[10px] text-gray-500">Auto-resolved conversations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-purple-700">78%</span>
                  <Badge className="bg-green-100 text-green-700 text-[9px]">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                    +5%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600">Handled by AI</span>
                    <span className="font-medium text-gray-800">2,218</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600">Escalated to Human</span>
                    <span className="font-medium text-gray-800">629</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Session Duration Card */}
            <Card className="overflow-hidden border-gray-200 shadow-lg bg-white">
              <div className="bg-gray-50 border-b border-gray-100 p-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-gray-600 ml-2">Session Duration</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-center mb-3">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#9333ea" strokeWidth="3" strokeDasharray="75 25" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-800">3.2m</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-600">Average session duration</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs font-semibold text-gray-800">1.8m</p>
                    <p className="text-[9px] text-gray-500">AI sessions</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs font-semibold text-gray-800">5.1m</p>
                    <p className="text-[9px] text-gray-500">Human sessions</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Top Queries Card */}
            <Card className="overflow-hidden border-gray-200 shadow-lg bg-white">
              <div className="bg-gray-50 border-b border-gray-100 p-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-gray-600 ml-2">Top Customer Queries</span>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { query: "Order status", count: 423, pct: 85 },
                  { query: "Return policy", count: 312, pct: 65 },
                  { query: "Product availability", count: 287, pct: 58 },
                  { query: "Shipping info", count: 198, pct: 42 },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-700">{item.query}</span>
                      <span className="text-gray-500">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Agent Performance Card */}
            <Card className="overflow-hidden border-gray-200 shadow-lg bg-white">
              <div className="bg-gray-50 border-b border-gray-100 p-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-gray-600 ml-2">Agent Performance</span>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { name: "Sarah M.", rating: 4.9, chats: 145 },
                  { name: "John D.", rating: 4.8, chats: 132 },
                  { name: "Lisa K.", rating: 4.7, chats: 128 },
                ].map((agent, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-[10px] font-bold">
                      {agent.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-800">{agent.name}</p>
                      <p className="text-[9px] text-gray-500">{agent.chats} chats</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-medium text-gray-700">{agent.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Button asChild variant="outline" size="sm" className="text-xs" data-testid="button-view-analytics">
              <Link href="/features">
                Explore all analytics features
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-4xl font-bold mb-2">
              They say... chatting has never been easier
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="p-4 md:p-6 hover-elevate">
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="font-semibold text-sm mb-1">{t.company}</p>
                <p className="text-[10px] text-muted-foreground mb-1">{t.location}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">"{t.quote}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 24/7/365 Support Section */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">
              {t('support247.title')}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mb-4 leading-relaxed">
              {t('support247.description1')}
            </p>
            <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed">
              {t('support247.description2')}
            </p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {["A", "M", "S", "L", "R"][i - 1]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                </div>
              ))}
            </div>
            <Button asChild className="bg-purple-600 hover:bg-purple-700 text-sm" data-testid="button-chat-expert">
              <a href="mailto:hello@chatvice.app">
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('support247.chatExpert')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Intuitive Software Description */}
      <section className="py-12 md:py-20 bg-background">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-bold mb-4 leading-tight">
              {t('intuitive.title')} <span className="text-purple-600">{t('intuitive.highlight')}</span>. {t('intuitive.description')}
            </h2>
          </div>
        </div>
      </section>
    </>
  );
}

function TimelineSection() {
  const { t } = useLanguage();
  const milestones = [
    {
      date: t('timeline.milestones.inception.date'),
      title: t('timeline.milestones.inception.title'),
      description: t('timeline.milestones.inception.description'),
      icon: Rocket,
      status: "completed"
    },
    {
      date: t('timeline.milestones.platform.date'),
      title: t('timeline.milestones.platform.title'),
      description: t('timeline.milestones.platform.description'),
      icon: Code,
      status: "completed"
    },
    {
      date: t('timeline.milestones.ai.date'),
      title: t('timeline.milestones.ai.title'),
      description: t('timeline.milestones.ai.description'),
      icon: Brain,
      status: "completed"
    },
    {
      date: t('timeline.milestones.widget.date'),
      title: t('timeline.milestones.widget.title'),
      description: t('timeline.milestones.widget.description'),
      icon: MessageCircle,
      status: "completed"
    },
    {
      date: t('timeline.milestones.payment.date'),
      title: t('timeline.milestones.payment.title'),
      description: t('timeline.milestones.payment.description'),
      icon: Target,
      status: "completed"
    },
    {
      date: t('timeline.milestones.launch.date'),
      title: t('timeline.milestones.launch.title'),
      description: t('timeline.milestones.launch.description'),
      icon: Award,
      status: "upcoming"
    },
  ];

  return (
    <section className="py-20 md:py-32 parallax-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-left mb-16 parallax-fade-in">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            <Calendar className="w-3 h-3 mr-1" />
            {t('timeline.badge')}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('timeline.title')}<br />{t('timeline.titleLine2')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t('timeline.subtitle')}
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-4 md:left-1/2 transform md:-translate-x-1/2 h-full w-0.5 bg-purple-200 dark:bg-purple-800/50" />
          
          <div className="space-y-4 md:space-y-12">
            {milestones.map((milestone, index) => (
              <div key={index} className={`flex flex-row md:flex-row gap-3 md:gap-8 items-start md:items-center ${index % 2 === 0 ? "md:flex-row parallax-slide-left" : "md:flex-row-reverse parallax-slide-right"} parallax-delay-${(index % 5) + 1}`}>
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
  const { t } = useLanguage();
  const features = [
    {
      icon: Brain,
      title: t('features.lexa1.title'),
      description: t('features.lexa1.description'),
    },
    {
      icon: Database,
      title: t('features.knowledgeBase.title'),
      description: t('features.knowledgeBase.description'),
    },
    {
      icon: HeadphonesIcon,
      title: t('features.humanEscalation.title'),
      description: t('features.humanEscalation.description'),
    },
    {
      icon: MessageCircle,
      title: t('features.widget.title'),
      description: t('features.widget.description'),
    },
    {
      icon: Shield,
      title: t('features.verification.title'),
      description: t('features.verification.description'),
    },
    {
      icon: Globe,
      title: t('features.multiLanguage.title'),
      description: t('features.multiLanguage.description'),
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-muted/30 parallax-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-left mb-16 parallax-fade-in">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            {t('nav.features')}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className={`hover-elevate p-6 group parallax-scale parallax-delay-${(index % 5) + 1}`}>
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <feature.icon className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-left">{feature.title}</h3>
              <p className="text-muted-foreground text-sm text-left">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="text-left mt-12 parallax-fade-in">
          <Link href="/features">
            <Button size="lg" variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/30">
              {t('features.viewAll')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingPreview() {
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });
  
  const { data: dbPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
  });

  const [previewCurrency, setPreviewCurrency] = useState<"IDR" | "USD">("IDR");
  
  const trialDays = (platformSettings as any)?.trial_days ? parseInt((platformSettings as any).trial_days) : 14;
  const allPlanKeys = ["free", "starter", "pro", "enterprise", "custom"] as const;

  const getDbPlan = (planId: string) => dbPlans.find((p: any) => p.id === planId);

  const getPrice = (planKey: string) => {
    const dbPlan = getDbPlan(planKey);
    const basePlan = subscriptionPlans[planKey as keyof typeof subscriptionPlans];
    const priceUsd = dbPlan?.monthlyPrice ?? basePlan.monthlyPrice;
    if (priceUsd === -1) return "Contact";
    const idr = (dbPlan?.monthlyPriceIdr as number | undefined) ?? (basePlan as any).monthlyPriceIdr ?? (priceUsd > 0 ? priceUsd * 17500 : 0);
    return formatPriceIdr(idr, previewCurrency);
  };

  const getFeatures = (planKey: string) => {
    const dbPlan = getDbPlan(planKey);
    if (dbPlan?.features) return dbPlan.features;
    return subscriptionPlans[planKey as keyof typeof subscriptionPlans].features;
  };

  const getPlanName = (planKey: string) => {
    const dbPlan = getDbPlan(planKey);
    return dbPlan?.name ?? planDisplayName(planKey, subscriptionPlans[planKey as keyof typeof subscriptionPlans].name);
  };

  const isNonFreePrice = (planKey: string) => {
    const dbPlan = getDbPlan(planKey);
    const basePlan = subscriptionPlans[planKey as keyof typeof subscriptionPlans];
    const price = dbPlan?.monthlyPrice ?? basePlan.monthlyPrice;
    return price !== -1 && price !== 0;
  };

  const getCta = (planId: string) => {
    if (planId === "free") return "Start Free";
    if (planId === "enterprise" || planId === "custom") return "Contact";
    return "Try Free";
  };

  return (
    <section className="py-16 md:py-24 parallax-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-left mb-10 parallax-fade-in">
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Choose the plan that fits your business. All plans include a {trialDays}-day free trial.
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 scrollbar-hide parallax-fade-in">
          {allPlanKeys.map((planKey) => {
            const isPro = planKey === "pro";
            const isEnterprise = planKey === "enterprise" || planKey === "custom";
            return (
              <Card 
                key={planKey} 
                className={`p-4 relative flex-shrink-0 w-[220px] ${isPro ? "pro-frosted-card" : ""} ${isEnterprise && !isPro ? "bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background border-purple-200 dark:border-purple-800/50" : ""}`}
                data-testid={`landing-plan-${planKey}`}
              >
                {isPro && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-xs px-2 py-0.5">
                    Popular
                  </Badge>
                )}
                <div className="mb-4">
                  <h3 className="text-base font-bold mb-1">{getPlanName(planKey)}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{getPrice(planKey)}</span>
                    {isNonFreePrice(planKey) && <span className="text-xs text-muted-foreground">/mo</span>}
                  </div>
                </div>
                <ul className="space-y-1.5 mb-4 min-h-[100px]">
                  {getFeatures(planKey).slice(0, 4).map((feature: string, i: number) => (
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

function AffiliateSection() {
  const affiliateFeatures = [
    {
      icon: DollarSign,
      title: "20% Commission",
      description: "Earn 20% of every subscription payment from your referrals for the first year.",
    },
    {
      icon: Clock,
      title: "30-Day Cookie",
      description: "Your referrals are tracked for 30 days, giving you credit even if they sign up later.",
    },
    {
      icon: Wallet,
      title: "Monthly Payouts",
      description: "Get paid monthly via PayPal or bank transfer. Minimum payout is $50.",
    },
    {
      icon: Gift,
      title: "Exclusive Bonuses",
      description: "Top affiliates earn additional bonuses and access to exclusive promotions.",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-muted/30 parallax-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-12 parallax-fade-in">
          <Badge className="mb-4">
            <Users className="w-3 h-3 mr-1" />
            Affiliate Program
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Earn Money Sharing Chatvice
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join our affiliate program and earn commissions for every customer you refer. 
            Start earning passive income today.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 parallax-fade-in">
          {affiliateFeatures.map((feature, index) => (
            <Card key={index} className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="text-center parallax-fade-in">
          <Link href="/affiliate">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700" data-testid="button-affiliate-cta">
              Join Affiliate Program
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-purple-600 text-white parallax-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl parallax-fade-in">
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
            <a href="mailto:hello@chatvice.app">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
                Talk to Sales
              </Button>
            </a>
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
      { label: "Careers", href: "mailto:hello@chatvice.app" },
      { label: "Press", href: "/press" },
      { label: "Partners", href: "mailto:hello@chatvice.app" },
    ],
    resources: [
      { label: "Documentation", href: "/docs" },
      { label: "Help Center", href: "/help" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "mailto:hello@chatvice.app" },
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
                <li key={link.label}>
                  {link.href.startsWith("mailto:") ? (
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("mailto:") ? (
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  )}
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
  useParallaxScroll();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SchemaMarkup id="landing-software-app-jsonld" schema={landingSoftwareAppSchema} />
      <Navbar />
      <HeroSection />
      <StatsSection />
      <BenefitsSections />
      <WidgetCustomizerSection />
      <TimelineSection />
      <FeaturesPreview />
      <PricingPreview />
      <AffiliateSection />
      <CTASection />
      <Footer />
    </div>
  );
}
