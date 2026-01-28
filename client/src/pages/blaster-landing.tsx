import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Users,
  BarChart3,
  Shield,
  Clock,
  Target,
  Check,
  ArrowRight,
  Rocket,
  FileText,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import { SiWhatsapp, SiMeta } from "react-icons/si";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMainAppUrl } from "@/lib/blaster-routes";

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

export default function BlasterLandingPage() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
  });
  
  const trialDays = (platformSettings as any)?.trial_days ? parseInt((platformSettings as any).trial_days) : 14;
  useParallaxScroll();

  const features = [
    {
      icon: Send,
      title: "Broadcast Massal",
      description: "Kirim pesan ke ribuan kontak sekaligus dengan satu klik. Template pesan yang dipersonalisasi dengan variabel dinamis.",
    },
    {
      icon: Users,
      title: "Manajemen Kontak",
      description: "Import kontak dari CSV, kelola daftar kontak, dan segmentasi audiens untuk kampanye yang lebih tertarget.",
    },
    {
      icon: FileText,
      title: "Template Pesan",
      description: "Buat template pesan yang dapat digunakan kembali dengan placeholder untuk nama, produk, dan informasi lainnya.",
    },
    {
      icon: BarChart3,
      title: "Analitik Real-time",
      description: "Pantau status pengiriman, tingkat dibaca, dan respons pelanggan secara real-time di dashboard.",
    },
    {
      icon: MessageCircle,
      title: "Integrasi Chat",
      description: "Balasan dari blast otomatis masuk ke panel supervisor. Lanjutkan percakapan dengan pelanggan dengan mudah.",
    },
    {
      icon: Shield,
      title: "Keamanan Enterprise",
      description: "Enkripsi end-to-end, verifikasi webhook dengan signature HMAC, dan compliance dengan kebijakan Meta.",
    },
  ];

  const pricingTiers = [
    {
      name: "Basic",
      price: "Gratis",
      period: "",
      description: "Cocok untuk bisnis kecil yang baru memulai",
      features: [
        "500 pesan / bulan",
        "500 kontak maksimal",
        "1 channel WhatsApp",
        "Template dasar",
        "Analitik sederhana",
      ],
      buttonText: "Mulai Gratis",
      buttonVariant: "outline" as const,
      popular: false,
    },
    {
      name: "Pro",
      price: "Rp 299.000",
      period: "/ bulan",
      description: "Untuk bisnis berkembang dengan kebutuhan lebih",
      features: [
        "5.000 pesan / bulan",
        "10.000 kontak maksimal",
        "3 channel WhatsApp",
        "Template kustom",
        "Analitik lengkap",
        "Penjadwalan kampanye",
        "Prioritas dukungan",
      ],
      buttonText: "Upgrade ke Pro",
      buttonVariant: "default" as const,
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Rp 999.000",
      period: "/ bulan",
      description: "Solusi lengkap untuk bisnis besar",
      features: [
        "50.000 pesan / bulan",
        "100.000 kontak maksimal",
        "Unlimited channel",
        "API akses penuh",
        "Webhook kustom",
        "Dedicated support",
        "SLA guarantee",
        "Custom integration",
      ],
      buttonText: "Hubungi Sales",
      buttonVariant: "outline" as const,
      popular: false,
    },
  ];

  const messageCosts = [
    { category: "Marketing", price: "Rp 500", description: "Promosi, penawaran, newsletter" },
    { category: "Utility", price: "Rp 300", description: "Notifikasi, update status, pengingat" },
    { category: "OTP", price: "Rp 200", description: "Verifikasi, autentikasi 2 faktor" },
  ];

  const useCases = [
    {
      icon: Rocket,
      title: "Peluncuran Produk",
      description: "Umumkan produk baru ke seluruh database pelanggan Anda secara instan.",
    },
    {
      icon: DollarSign,
      title: "Promo & Diskon",
      description: "Kirim penawaran eksklusif dan kode diskon langsung ke WhatsApp pelanggan.",
    },
    {
      icon: Clock,
      title: "Pengingat Otomatis",
      description: "Ingatkan jadwal appointment, pembayaran, atau event yang akan datang.",
    },
    {
      icon: TrendingUp,
      title: "Re-engagement",
      description: "Aktifkan kembali pelanggan yang sudah lama tidak bertransaksi.",
    },
  ];

  const integrationModes = [
    {
      icon: SiMeta,
      title: "Meta Cloud API",
      description: "Integrasi resmi dengan Meta untuk pesan enterprise-grade dengan deliverability tinggi.",
      badge: "Recommended",
      features: ["Throughput tinggi", "99.9% uptime", "Official support"],
    },
    {
      icon: SiWhatsapp,
      title: "WhatsApp Web.js",
      description: "Opsi alternatif menggunakan WhatsApp Web untuk fleksibilitas lebih.",
      badge: "Alternative",
      features: ["Setup mudah", "Tanpa approval", "Cocok untuk testing"],
    },
  ];

  const handleStartFree = () => {
    const mainUrl = getMainAppUrl("/login");
    window.location.href = mainUrl;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <SiWhatsapp className="h-7 w-7 text-green-500" />
              <span className="font-bold text-xl">Chatvice Blaster</span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Fitur
              </a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Harga
              </a>
              <a href="#use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Use Cases
              </a>
              <a href={getMainAppUrl("/")} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                AI Chatbot
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="outline" onClick={handleStartFree} className="hidden sm:flex" data-testid="button-login">
                Login
              </Button>
              <Button onClick={handleStartFree} className="bg-green-600 hover:bg-green-700 border-green-700" data-testid="button-cta">
                Mulai Gratis
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="flex flex-col gap-4">
                <a href="#features" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                  Fitur
                </a>
                <a href="#pricing" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                  Harga
                </a>
                <a href="#use-cases" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                  Use Cases
                </a>
                <a href={getMainAppUrl("/")} className="text-sm font-medium">
                  AI Chatbot
                </a>
              </nav>
            </div>
          )}
        </div>
      </header>

      <section className="py-16 md:py-24 bg-gradient-to-b from-green-500/5 to-transparent" data-testid="section-hero">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-6 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" data-testid="badge-hero">
              <SiWhatsapp className="w-3 h-3 mr-1" />
              WhatsApp Marketing Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight" data-testid="text-hero-title">
              Jangkau Ribuan Pelanggan dengan{" "}
              <span className="text-green-500">WhatsApp Blast</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8" data-testid="text-hero-desc">
              Platform WhatsApp marketing terpadu untuk broadcast pesan, manajemen kontak, 
              dan analitik real-time. Tingkatkan engagement dan penjualan bisnis Anda.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={handleStartFree} className="bg-green-600 hover:bg-green-700 border-green-700" data-testid="button-hero-cta">
                <SiWhatsapp className="w-5 h-5 mr-2" />
                Mulai Gratis {trialDays} Hari
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">Lihat Fitur</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-24" data-testid="section-features">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-features-title">
              Fitur Lengkap untuk WhatsApp Marketing
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Semua yang Anda butuhkan untuk menjalankan kampanye WhatsApp yang sukses
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="parallax-fade-in" data-testid={`card-feature-${index}`}>
                <CardHeader>
                  <div className="p-3 rounded-lg bg-green-500/10 w-fit mb-3">
                    <feature.icon className="h-6 w-6 text-green-500" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="py-16 md:py-24 bg-muted/50" data-testid="section-use-cases">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Cocok untuk Berbagai Kebutuhan
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              WhatsApp Blast dapat digunakan untuk berbagai kampanye marketing
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index} className="text-center parallax-fade-in" data-testid={`card-usecase-${index}`}>
                <CardHeader>
                  <div className="p-4 rounded-full bg-green-500/10 w-fit mx-auto mb-3">
                    <useCase.icon className="h-8 w-8 text-green-500" />
                  </div>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24" data-testid="section-integration">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pilih Mode Integrasi
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Kami mendukung dua mode integrasi WhatsApp untuk fleksibilitas maksimal
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {integrationModes.map((mode, index) => (
              <Card key={index} className={`parallax-fade-in ${index === 0 ? 'border-green-500/50' : ''}`} data-testid={`card-integration-${index}`}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <mode.icon className="h-8 w-8 text-green-500" />
                    </div>
                    <Badge variant={index === 0 ? "default" : "secondary"} className={index === 0 ? "bg-green-600" : ""}>
                      {mode.badge}
                    </Badge>
                  </div>
                  <CardTitle>{mode.title}</CardTitle>
                  <CardDescription>{mode.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {mode.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 md:py-24 bg-muted/50" data-testid="section-pricing">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Harga Transparan, Tanpa Biaya Tersembunyi
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Pilih paket yang sesuai dengan kebutuhan bisnis Anda
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-12">
            {pricingTiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`parallax-fade-in relative ${tier.popular ? 'border-green-500 shadow-lg' : ''}`}
                data-testid={`card-pricing-${index}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-600">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={tier.buttonVariant} 
                    className={`w-full ${tier.popular ? 'bg-green-600 hover:bg-green-700 border-green-700' : ''}`}
                    onClick={handleStartFree}
                  >
                    {tier.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="max-w-2xl mx-auto" data-testid="card-message-cost">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Biaya Per Pesan</CardTitle>
              <CardDescription>Biaya tambahan berdasarkan kategori pesan (di luar kuota paket)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {messageCosts.map((cost, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{cost.category}</p>
                      <p className="text-xs text-muted-foreground">{cost.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-green-600">{cost.price}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-green-600 text-white" data-testid="section-cta">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Siap Meningkatkan Engagement Pelanggan?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Mulai kirim broadcast WhatsApp ke ribuan pelanggan hari ini. 
            Gratis {trialDays} hari tanpa kartu kredit.
          </p>
          <Button size="lg" variant="secondary" onClick={handleStartFree} data-testid="button-cta-final">
            Mulai Gratis Sekarang
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="py-8 border-t">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <SiWhatsapp className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Chatvice Blaster</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href={getMainAppUrl("/privacy")} className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </a>
              <a href={getMainAppUrl("/terms")} className="text-sm text-muted-foreground hover:text-foreground">
                Terms
              </a>
              <a href={getMainAppUrl("/contact")} className="text-sm text-muted-foreground hover:text-foreground">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
