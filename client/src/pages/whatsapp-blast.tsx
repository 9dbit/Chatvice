import { Link } from "wouter";
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
  Zap,
  Shield,
  Clock,
  Target,
  Globe,
  Check,
  ArrowRight,
  Rocket,
  Settings,
  FileText,
  Phone,
  CheckCircle2,
  TrendingUp,
  Mail,
  Layers,
  Bot,
  Sparkles,
  DollarSign,
  UserPlus,
  MessageCircle,
} from "lucide-react";
import { SiWhatsapp, SiMeta } from "react-icons/si";
import PublicPageLayout from "./public-layout";

import heroIllustration from "@assets/wa-blast-hero.png";
import broadcastIllustration from "@assets/wa-blast-broadcast.png";
import analyticsIllustration from "@assets/wa-blast-analytics.png";
import integrationIllustration from "@assets/wa-blast-integration.png";

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

export default function WhatsAppBlastPage() {
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

  return (
    <PublicPageLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10 dark:from-green-500/5 dark:to-emerald-500/5" />
          <div className="container mx-auto px-4 relative">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="parallax-slide-left opacity-0 translate-x-[-50px] transition-all duration-700">
                <Badge className="mb-4 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" data-testid="badge-wa-hero">
                  <SiWhatsapp className="w-3 h-3 mr-1" />
                  WhatsApp Business Solution
                </Badge>
                <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight" data-testid="text-hero-title">
                  Jangkau Ribuan Pelanggan dengan{" "}
                  <span className="text-green-500">WhatsApp Blast</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed" data-testid="text-hero-description">
                  Kirim pesan broadcast ke ribuan kontak secara bersamaan. Tingkatkan engagement, 
                  penjualan, dan loyalitas pelanggan dengan platform WhatsApp marketing terpadu.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/register">
                    <Button size="lg" className="bg-green-600 border-green-700" data-testid="button-wa-blast-cta">
                      <SiWhatsapp className="w-4 h-4 mr-2" />
                      Mulai Sekarang
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button size="lg" variant="outline" data-testid="button-wa-blast-demo">
                      Lihat Demo
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2" data-testid="text-benefit-free">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>500 pesan gratis</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="text-benefit-no-cc">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Tanpa kartu kredit</span>
                  </div>
                </div>
              </div>
              <div className="parallax-slide-right opacity-0 translate-x-[50px] transition-all duration-700">
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-2xl" />
                  <img 
                    src={heroIllustration} 
                    alt="WhatsApp Blast Dashboard" 
                    className="relative rounded-2xl shadow-2xl border border-border"
                    data-testid="img-hero-illustration"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 border-y border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[
                { value: "98%", label: "Tingkat Pengiriman" },
                { value: "70%", label: "Open Rate" },
                { value: "5x", label: "ROI Lebih Tinggi" },
                { value: "24/7", label: "Dukungan Teknis" },
              ].map((stat, index) => (
                <div key={index} className="text-center parallax-fade-in opacity-0 translate-y-[20px] transition-all duration-500" style={{ transitionDelay: `${index * 100}ms` }} data-testid={`stat-${index}`}>
                  <div className="text-2xl md:text-4xl font-bold text-green-500 mb-1" data-testid={`text-stat-value-${index}`}>{stat.value}</div>
                  <div className="text-sm text-muted-foreground" data-testid={`text-stat-label-${index}`}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-700">
              <Badge className="mb-4" data-testid="badge-features">Fitur Lengkap</Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-4" data-testid="text-features-title">
                Semua yang Anda Butuhkan untuk WhatsApp Marketing
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-desc">
                Platform broadcast WhatsApp terlengkap dengan fitur enterprise-grade untuk skala bisnis apapun.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="hover-elevate parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-500"
                  style={{ transitionDelay: `${index * 100}ms` }}
                  data-testid={`card-feature-${index}`}
                >
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
                      <feature.icon className="w-6 h-6 text-green-500" />
                    </div>
                    <CardTitle className="text-lg" data-testid={`text-feature-title-${index}`}>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed" data-testid={`text-feature-desc-${index}`}>
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-700">
              <Badge className="mb-4" data-testid="badge-how-it-works">Cara Kerja</Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-4" data-testid="text-how-it-works-title">
                Mulai Broadcast dalam 3 Langkah Mudah
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Hubungkan WhatsApp",
                  description: "Hubungkan nomor WhatsApp Business Anda melalui Meta Cloud API atau WhatsApp Web.",
                  icon: Phone,
                },
                {
                  step: "2",
                  title: "Siapkan Kontak & Template",
                  description: "Import daftar kontak dan buat template pesan dengan variabel personalisasi.",
                  icon: FileText,
                },
                {
                  step: "3",
                  title: "Kirim & Pantau",
                  description: "Kirim broadcast dan pantau hasilnya secara real-time di dashboard analytics.",
                  icon: BarChart3,
                },
              ].map((step, index) => (
                <div 
                  key={index} 
                  className="relative parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-500"
                  style={{ transitionDelay: `${index * 150}ms` }}
                  data-testid={`step-card-${index}`}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4" data-testid={`step-number-${index}`}>
                      {step.step}
                    </div>
                    <h3 className="text-xl font-semibold mb-2" data-testid={`text-step-title-${index}`}>{step.title}</h3>
                    <p className="text-muted-foreground" data-testid={`text-step-desc-${index}`}>{step.description}</p>
                  </div>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-green-500/50 to-transparent" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 parallax-scale opacity-0 scale-95 transition-all duration-700">
              <img 
                src={broadcastIllustration} 
                alt="WhatsApp Broadcast Process" 
                className="rounded-2xl shadow-xl border border-border mx-auto max-w-4xl w-full"
                data-testid="img-broadcast-illustration"
              />
            </div>
          </div>
        </section>

        {/* Integration Modes Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-700">
              <Badge className="mb-4" data-testid="badge-integration">Mode Integrasi</Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-4" data-testid="text-integration-title">
                Pilih Metode Integrasi yang Sesuai
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-integration-desc">
                Dua opsi integrasi untuk memenuhi berbagai kebutuhan bisnis Anda.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {integrationModes.map((mode, index) => (
                <Card 
                  key={index} 
                  className={`relative overflow-hidden parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-500 ${
                    index === 0 ? 'border-green-500/50' : ''
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                  data-testid={`card-integration-${index}`}
                >
                  {index === 0 && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <mode.icon className="w-10 h-10 text-green-500" />
                      <Badge variant={index === 0 ? "default" : "secondary"} data-testid={`badge-integration-mode-${index}`}>{mode.badge}</Badge>
                    </div>
                    <CardTitle className="text-xl mt-3" data-testid={`text-integration-card-title-${index}`}>{mode.title}</CardTitle>
                    <CardDescription data-testid={`text-integration-card-desc-${index}`}>{mode.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {mode.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-center gap-2 text-sm" data-testid={`text-integration-feature-${index}-${fIndex}`}>
                          <Check className="w-4 h-4 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 parallax-scale opacity-0 scale-95 transition-all duration-700">
              <img 
                src={integrationIllustration} 
                alt="WhatsApp Integration" 
                className="rounded-2xl shadow-xl border border-border mx-auto max-w-4xl w-full"
                data-testid="img-integration-illustration"
              />
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-700">
              <Badge className="mb-4" data-testid="badge-usecases">Use Cases</Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-4" data-testid="text-usecases-title">
                Berbagai Skenario Penggunaan
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((useCase, index) => (
                <Card 
                  key={index} 
                  className="text-center hover-elevate parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-500"
                  style={{ transitionDelay: `${index * 100}ms` }}
                  data-testid={`card-usecase-${index}`}
                >
                  <CardContent className="pt-6">
                    <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <useCase.icon className="w-7 h-7 text-green-500" />
                    </div>
                    <h3 className="font-semibold mb-2" data-testid={`text-usecase-title-${index}`}>{useCase.title}</h3>
                    <p className="text-sm text-muted-foreground" data-testid={`text-usecase-desc-${index}`}>{useCase.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-700">
              <Badge className="mb-4" data-testid="badge-pricing">Harga</Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
                Pilih Paket yang Sesuai Kebutuhan
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-desc">
                Mulai gratis, upgrade sesuai pertumbuhan bisnis Anda.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
              {pricingTiers.map((tier, index) => (
                <Card 
                  key={index} 
                  className={`relative overflow-hidden parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-500 ${
                    tier.popular ? 'border-green-500 shadow-lg shadow-green-500/10' : ''
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                  data-testid={`card-pricing-tier-${tier.name.toLowerCase()}`}
                >
                  {tier.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
                  )}
                  <CardHeader>
                    {tier.popular && (
                      <Badge className="w-fit mb-2 bg-green-500" data-testid={`badge-pricing-popular-${tier.name.toLowerCase()}`}>Paling Populer</Badge>
                    )}
                    <CardTitle className="text-xl" data-testid={`text-pricing-tier-name-${tier.name.toLowerCase()}`}>{tier.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold" data-testid={`text-pricing-price-${tier.name.toLowerCase()}`}>{tier.price}</span>
                      <span className="text-muted-foreground" data-testid={`text-pricing-period-${tier.name.toLowerCase()}`}>{tier.period}</span>
                    </div>
                    <CardDescription className="mt-2" data-testid={`text-pricing-tier-desc-${tier.name.toLowerCase()}`}>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-center gap-2 text-sm" data-testid={`text-pricing-feature-${tier.name.toLowerCase()}-${fIndex}`}>
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/register">
                      <Button 
                        className={`w-full ${tier.popular ? 'bg-green-600 border-green-700' : ''}`}
                        variant={tier.buttonVariant}
                        data-testid={`button-pricing-${tier.name.toLowerCase()}`}
                      >
                        {tier.buttonText}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Message Costs */}
            <div className="max-w-3xl mx-auto parallax-fade-in opacity-0 translate-y-[30px] transition-all duration-700">
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Biaya Per Pesan (Pay-as-you-go)
                  </CardTitle>
                  <CardDescription>
                    Selain kuota bulanan, Anda juga bisa membeli pesan tambahan dengan biaya berikut:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {messageCosts.map((cost, index) => (
                      <div key={index} className="bg-background rounded-lg p-4 border">
                        <div className="font-semibold text-green-500">{cost.category}</div>
                        <div className="text-2xl font-bold">{cost.price}</div>
                        <div className="text-xs text-muted-foreground">{cost.description}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Analytics Preview Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="parallax-slide-left opacity-0 translate-x-[-50px] transition-all duration-700">
                <Badge className="mb-4" data-testid="badge-analytics">Analytics</Badge>
                <h2 className="text-2xl md:text-4xl font-bold mb-4" data-testid="text-analytics-title">
                  Pantau Performa Kampanye Secara Real-time
                </h2>
                <p className="text-muted-foreground mb-6" data-testid="text-analytics-desc">
                  Dashboard analytics yang komprehensif untuk memahami performa setiap kampanye broadcast Anda.
                </p>
                <ul className="space-y-4">
                  {[
                    { icon: Send, text: "Status pengiriman (terkirim, pending, gagal)" },
                    { icon: CheckCircle2, text: "Tingkat dibaca dan respons pelanggan" },
                    { icon: TrendingUp, text: "Grafik performa kampanye over time" },
                    { icon: Users, text: "Segmentasi audiens yang efektif" },
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3" data-testid={`text-analytics-feature-${index}`}>
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-green-500" />
                      </div>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="parallax-slide-right opacity-0 translate-x-[50px] transition-all duration-700">
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-2xl" />
                  <img 
                    src={analyticsIllustration} 
                    alt="WhatsApp Blast Analytics Dashboard" 
                    className="relative rounded-2xl shadow-2xl border border-border"
                    data-testid="img-analytics-illustration"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center parallax-scale opacity-0 scale-95 transition-all duration-700">
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 rounded-3xl blur-3xl" />
                <Card className="relative border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5" data-testid="card-cta">
                  <CardContent className="py-12 px-8">
                    <SiWhatsapp className="w-16 h-16 text-green-500 mx-auto mb-6" />
                    <h2 className="text-2xl md:text-4xl font-bold mb-4" data-testid="text-cta-title">
                      Siap Meningkatkan Engagement Pelanggan?
                    </h2>
                    <p className="text-muted-foreground mb-8 max-w-xl mx-auto" data-testid="text-cta-desc">
                      Mulai gunakan WhatsApp Blast hari ini dan jangkau ribuan pelanggan dengan pesan yang dipersonalisasi.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <Link href="/register">
                        <Button size="lg" className="bg-green-600 border-green-700" data-testid="button-cta-register">
                          <SiWhatsapp className="w-4 h-4 mr-2" />
                          Daftar Gratis Sekarang
                        </Button>
                      </Link>
                      <Link href="/pricing">
                        <Button size="lg" variant="outline" data-testid="button-cta-pricing">
                          Lihat Semua Paket
                        </Button>
                      </Link>
                    </div>
                    <p className="text-sm text-muted-foreground mt-6" data-testid="text-cta-trial">
                      {trialDays} hari uji coba gratis. Tidak perlu kartu kredit.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}
