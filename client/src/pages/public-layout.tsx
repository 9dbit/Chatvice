import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { Menu, X, Brain, Twitter, Linkedin, Github, Instagram, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import chatviceLogoLight from "@assets/Chatvice-02_1769691434945.png";
import chatviceLogoDark from "@assets/Chatvice-04_1769691434945.png";
import { competitorsData } from "./comparison/competitors-data";

const compareLinks = Object.values(competitorsData).map((c) => ({
  label: `vs ${c.name}`,
  href: `/vs/${c.slug}`,
}));

export function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { resolvedTheme } = useTheme();
  const isOnComparePage = location.startsWith("/vs/") || location === "/compare";
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
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "API", href: "/api-docs" },
    { label: "FAQ", href: "/faq" },
    { label: "About", href: "/about" },
    { label: "Marketing Tools", href: "/marketing-tools" },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-background border-b border-border"}`}>
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-4 h-16">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0">
              <img src={chatviceLogo} alt="Chatvice" className="h-7 sm:h-8 w-auto" />
            </Link>
            
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger
                  data-testid="nav-compare-trigger"
                  className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-foreground outline-none ${isOnComparePage ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Compare
                  <ChevronDown className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/compare"
                      data-testid="nav-compare-overview"
                      className={`cursor-pointer font-medium ${location === "/compare" ? "text-foreground" : ""}`}
                    >
                      All comparisons →
                    </Link>
                  </DropdownMenuItem>
                  {compareLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link
                        href={link.href}
                        data-testid={`nav-compare-${link.href.split("/vs/")[1]}`}
                        className={`cursor-pointer ${location === link.href ? "font-medium text-foreground" : ""}`}
                      >
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isCheckingAuth ? (
                <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
              ) : isLoggedIn ? (
                <Link href="/dashboard">
                  <Button>Dashboard</Button>
                </Link>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost">Sign in</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-purple-600 hover:bg-purple-700">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              )}
              <button 
                className="lg:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-20 px-4 lg:hidden overflow-y-auto">
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
            <div className="border-b border-border">
              <Link
                href="/compare"
                className={`block text-lg font-medium py-3 transition-colors ${isOnComparePage ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Compare
              </Link>
              <div className="flex flex-col gap-1 pb-3 pl-3">
                {compareLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-testid={`mobile-compare-${link.href.split("/vs/")[1]}`}
                    className={`text-base py-2 transition-colors ${location === link.href ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
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

export function PublicFooter() {
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
      { label: "Marketing Tools", href: "/marketing-tools" },
    ],
    solutions: [
      { label: "Chatbot Customer Service", href: "/chatbot-customer-service" },
      { label: "AI Chatbot WhatsApp", href: "/ai-chatbot-whatsapp" },
      { label: "Live Chat Website", href: "/live-chat-website" },
      { label: "Chatbot Toko Online", href: "/chatbot-toko-online" },
      { label: "Chatbot Gratis", href: "/ai-chatbot-gratis" },
      { label: "Alternatif Tawk.to", href: "/alternatif-tawkto" },
      { label: "Chatbot Jakarta", href: "/chatbot-jakarta" },
      { label: "Chatbot Surabaya", href: "/chatbot-surabaya" },
      { label: "Chatbot Bandung", href: "/chatbot-bandung" },
      { label: "Chatbot Medan", href: "/chatbot-medan" },
      { label: "Chatbot Makassar", href: "/chatbot-makassar" },
      { label: "Chatbot Bali", href: "/chatbot-bali" },
      { label: "Chatbot Yogyakarta", href: "/chatbot-yogyakarta" },
      { label: "Chatbot Restoran", href: "/chatbot-restoran" },
      { label: "Chatbot Klinik", href: "/chatbot-klinik" },
      { label: "Chatbot Properti", href: "/chatbot-properti" },
      { label: "Chatbot Pendidikan", href: "/chatbot-pendidikan" },
      { label: "Chatbot E-Commerce", href: "/chatbot-ecommerce" },
      { label: "Chatbot Logistik", href: "/chatbot-logistik" },
      { label: "Chatbot Perbankan", href: "/chatbot-perbankan" },
    ],
    compare: [
      { label: "Compare All", href: "/compare" },
      { label: "vs Tawk.to", href: "/vs/tawkto" },
      { label: "vs Intercom", href: "/vs/intercom" },
      { label: "vs Tidio", href: "/vs/tidio" },
      { label: "vs Zendesk", href: "/vs/zendesk" },
      { label: "vs Freshdesk", href: "/vs/freshdesk" },
      { label: "vs LiveChat", href: "/vs/livechat" },
      { label: "vs Drift", href: "/vs/drift" },
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
        <div className="grid grid-cols-2 md:grid-cols-7 gap-8 mb-12">
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
            <h4 className="font-semibold mb-4">Solutions</h4>
            <ul className="space-y-2">
              {footerLinks.solutions.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Compare</h4>
            <ul className="space-y-2">
              {footerLinks.compare.map((link) => (
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

interface PublicPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function PublicPageLayout({ children, title, description }: PublicPageLayoutProps) {
  useEffect(() => {
    const defaultTitle = "Chatvice - AI Customer Service Platform";
    const defaultDescription = "AI-powered customer service chatbot platform. Automate support, reduce costs, and delight customers with intelligent AI agents.";
    
    // Set document title
    document.title = title || defaultTitle;
    
    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute("content", description || defaultDescription);
    
    // Set Open Graph tags
    const ogTags: Record<string, string> = {
      "og:title": title || defaultTitle,
      "og:description": description || defaultDescription,
      "og:type": "website",
      "og:site_name": "Chatvice",
    };
    
    Object.entries(ogTags).forEach(([property, content]) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    });
    
    // Set canonical URL
    const currentUrl = window.location.origin + window.location.pathname;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", currentUrl);
  }, [title, description]);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
