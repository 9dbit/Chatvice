import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, CheckCircle2, Copy, CheckCheck, Share2 } from "lucide-react";
import { SiWhatsapp, SiX, SiLinkedin } from "react-icons/si";
import PublicPageLayout from "@/pages/public-layout";
import type { SolutionPageData } from "./solutions-data";
import { solutionsBySlug } from "./solutions-data";

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

function buildShareText(h1: string, subtitle: string): string {
  return `${h1} — ${subtitle}`;
}

function ShareButtons({ slug, h1, subtitle }: { slug: string; h1: string; subtitle: string }) {
  const [copied, setCopied] = useState(false);

  const url = buildShareUrl(slug);
  const text = buildShareText(h1, subtitle);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        data-testid="button-share-copy-link"
        className="gap-2"
      >
        {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied!" : "Copy Link"}
      </Button>
      <a href={waUrl} target="_blank" rel="noopener noreferrer" data-testid="link-share-whatsapp">
        <Button size="sm" variant="outline" className="gap-2">
          <SiWhatsapp className="w-4 h-4 text-green-500" />
          WhatsApp
        </Button>
      </a>
      <a href={twitterUrl} target="_blank" rel="noopener noreferrer" data-testid="link-share-twitter">
        <Button size="sm" variant="outline" className="gap-2">
          <SiX className="w-4 h-4" />
          X
        </Button>
      </a>
      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" data-testid="link-share-linkedin">
        <Button size="sm" variant="outline" className="gap-2">
          <SiLinkedin className="w-4 h-4 text-blue-600" />
          LinkedIn
        </Button>
      </a>
    </div>
  );
}

interface SolutionPageProps {
  solution: SolutionPageData;
}

export default function SolutionPage({ solution }: SolutionPageProps) {
  const allPages = Object.values(solutionsBySlug);
  const relatedPages = allPages.filter((s) => solution.relatedSlugs.includes(s.slug));

  const slugToLabel: Record<string, string> = {
    "chatbot-customer-service": "Chatbot Customer Service",
    "ai-chatbot-whatsapp": "AI Chatbot WhatsApp",
    "live-chat-website": "Live Chat Website",
    "chatbot-toko-online": "Chatbot Toko Online",
    "ai-chatbot-gratis": "Chatbot Gratis",
    "alternatif-tawkto": "Alternatif Tawk.to",
    "chatbot-jakarta": "Chatbot Jakarta",
    "chatbot-surabaya": "Chatbot Surabaya",
    "chatbot-bandung": "Chatbot Bandung",
    "chatbot-restoran": "Chatbot Restoran",
    "chatbot-klinik": "Chatbot Klinik",
    "chatbot-properti": "Chatbot Properti",
    "chatbot-pendidikan": "Chatbot Pendidikan",
  };

  return (
    <PublicPageLayout title={solution.metaTitle} description={solution.metaDescription}>
      <section className="bg-purple-600 text-white py-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <Badge className="bg-white/20 text-white mb-4">Solusi</Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-6 max-w-3xl leading-tight">
            {solution.h1}
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mb-8 leading-relaxed">
            {solution.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50" data-testid="button-solution-hero-cta">
                Mulai Gratis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" data-testid="button-solution-pricing">
                Lihat Harga
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {solution.stats.map((stat, i) => (
              <div key={i} className="text-center" data-testid={`stat-item-${i}`}>
                <p className="text-3xl md:text-4xl font-bold text-purple-600 mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              Tentang Solusi Ini
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Mengapa Bisnis Indonesia Membutuhkan Ini?
            </h2>
            <div className="space-y-4">
              {solution.introParagraphs.map((para, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed text-base">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="mb-10">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
              Fitur Unggulan
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">
              Semua yang Anda Butuhkan, Sudah Ada
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solution.features.map((feature, i) => (
              <Card key={i} className="hover-elevate group" data-testid={`card-feature-${i}`}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:bg-purple-600 transition-colors">
                    <feature.icon className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                Use Cases
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Cocok untuk Berbagai Jenis Bisnis
              </h2>
              <ul className="space-y-3">
                {solution.useCases.map((useCase, i) => (
                  <li key={i} className="flex items-start gap-3" data-testid={`use-case-${i}`}>
                    <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-sm leading-relaxed">{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-4">
                Kenapa Chatvice?
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Keunggulan yang Membuat Kami Berbeda
              </h2>
              <ul className="space-y-3">
                {solution.whyChatvice.map((point, i) => (
                  <li key={i} className="flex items-start gap-3" data-testid={`why-chatvice-${i}`}>
                    <Check className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-sm leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {relatedPages.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
            <h2 className="text-2xl font-bold mb-8">Solusi Lainnya yang Mungkin Relevan</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPages.map((related) => (
                <Link key={related.slug} href={`/${related.slug}`}>
                  <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-related-${related.slug}`}>
                    <CardHeader>
                      <CardTitle className="text-base">{slugToLabel[related.slug] || related.slug}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{related.subtitle}</p>
                      <p className="text-sm text-purple-600 mt-3 flex items-center gap-1">
                        Pelajari lebih lanjut <ArrowRight className="w-3 h-3" />
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-12 border-t border-border">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Share2 className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-foreground">Bagikan halaman ini:</span>
            </div>
            <ShareButtons slug={solution.slug} h1={solution.h1} subtitle={solution.subtitle} />
          </div>
        </div>
      </section>

      <section className="py-20 bg-purple-600 text-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{solution.ctaHeading}</h2>
          <p className="text-purple-100 text-lg mb-8 max-w-xl mx-auto">{solution.ctaSubtext}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50" data-testid="button-solution-final-cta">
                Daftar Gratis Sekarang
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" data-testid="button-solution-features">
                Lihat Semua Fitur
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
