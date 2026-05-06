import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SchemaMarkup } from "./seo/schema-markup";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Chatvice",
  "url": "https://chatvice.app",
  "logo": "https://chatvice.app/og/home.png",
  "description": "AI-powered customer service chatbot platform for businesses. Automate support, reduce costs, and delight customers with intelligent AI agents powered by LEXA1.",
  "sameAs": [
    "https://twitter.com/chatvice",
    "https://www.linkedin.com/company/chatvice",
    "https://github.com/chatvice",
    "https://www.instagram.com/chatvice"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "hello@chatvice.app",
    "availableLanguage": ["English", "Indonesian"]
  }
};

interface LandingPageSettings {
  logoUrl?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
}

const pageOgConfig: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Chatvice | AI Customer Service Platform",
    description: "Platform AI customer service terdepan untuk bisnis Indonesia. Otomasi support, live chat, dan eskalasi ke manusia.",
  },
  "/features": {
    title: "Fitur Lengkap | Chatvice",
    description: "Fitur AI chatbot, live chat, knowledge base, eskalasi otomatis, analitik real-time, dan integrasi widget untuk website Anda.",
  },
  "/pricing": {
    title: "Harga & Paket | Chatvice",
    description: "Pilihan paket fleksibel mulai dari gratis. Starter, Pro, dan Enterprise dengan fitur AI customer service lengkap.",
  },
  "/faq": {
    title: "FAQ - Pertanyaan Umum | Chatvice",
    description: "Jawaban untuk pertanyaan umum seputar Chatvice, AI chatbot, integrasi, dan cara kerja platform customer service.",
  },
  "/about": {
    title: "Tentang Kami | Chatvice",
    description: "Kenali tim di balik Chatvice, misi kami untuk merevolusi customer service dengan AI di Indonesia.",
  },
  "/blog": {
    title: "Blog & Artikel | Chatvice",
    description: "Tips, tutorial, dan insight terbaru seputar AI customer service, chatbot, dan strategi bisnis digital.",
  },
  "/docs": {
    title: "Dokumentasi | Chatvice",
    description: "Panduan lengkap integrasi dan penggunaan Chatvice. API docs, widget setup, dan konfigurasi chatbot.",
  },
  "/help": {
    title: "Pusat Bantuan | Chatvice",
    description: "Pusat bantuan Chatvice. Temukan solusi, panduan, dan dukungan untuk mengoptimalkan chatbot Anda.",
  },
  "/contact": {
    title: "Hubungi Kami | Chatvice",
    description: "Hubungi tim Chatvice untuk pertanyaan, partnership, atau dukungan teknis. Kami siap membantu.",
  },
  "/api-docs": {
    title: "API Documentation | Chatvice",
    description: "RESTful API documentation untuk integrasi Chatvice ke aplikasi Anda. Endpoints, authentication, dan contoh kode.",
  },
  "/changelog": {
    title: "Changelog & Update | Chatvice",
    description: "Update terbaru, fitur baru, dan perbaikan di platform Chatvice. Ikuti perkembangan produk kami.",
  },
  "/integrations": {
    title: "Integrasi | Chatvice",
    description: "Integrasikan Chatvice dengan tools favorit Anda. WhatsApp, Telegram, Instagram, dan platform lainnya.",
  },
  "/careers": {
    title: "Karir | Chatvice",
    description: "Bergabung dengan tim Chatvice. Lihat lowongan terbaru dan jadilah bagian dari revolusi AI customer service.",
  },
  "/press": {
    title: "Press & Media | Chatvice",
    description: "Press kit, media resources, dan berita terbaru dari Chatvice untuk jurnalis dan media partner.",
  },
  "/partners": {
    title: "Program Partner | Chatvice",
    description: "Jadilah partner Chatvice. Program reseller, affiliate, dan agency partnership untuk pertumbuhan bersama.",
  },
  "/affiliate": {
    title: "Program Affiliate | Chatvice",
    description: "Dapatkan komisi dengan merekomendasikan Chatvice. Program affiliate dengan komisi kompetitif.",
  },
  "/status": {
    title: "Status Layanan | Chatvice",
    description: "Monitor uptime dan status layanan Chatvice secara real-time. Cek kesehatan sistem kami.",
  },
  "/demo": {
    title: "Demo Widget | Chatvice",
    description: "Coba langsung demo chat widget Chatvice. Lihat bagaimana AI chatbot bekerja untuk bisnis Anda.",
  },
  "/privacy": {
    title: "Kebijakan Privasi | Chatvice",
    description: "Kebijakan privasi Chatvice. Bagaimana kami melindungi data dan privasi pengguna.",
  },
  "/terms": {
    title: "Syarat & Ketentuan | Chatvice",
    description: "Syarat dan ketentuan penggunaan layanan Chatvice. Baca sebelum menggunakan platform kami.",
  },
  "/cookies": {
    title: "Kebijakan Cookie | Chatvice",
    description: "Kebijakan penggunaan cookie di Chatvice. Cara kami menggunakan cookie untuk pengalaman terbaik.",
  },
  "/gdpr": {
    title: "GDPR Compliance | Chatvice",
    description: "Kepatuhan GDPR Chatvice. Bagaimana kami memenuhi standar perlindungan data Eropa.",
  },
  "/security": {
    title: "Keamanan | Chatvice",
    description: "Standar keamanan Chatvice. Enkripsi, proteksi data, dan langkah keamanan platform kami.",
  },
  "/login": {
    title: "Login | Chatvice",
    description: "Masuk ke dashboard Chatvice untuk mengelola chatbot, analitik, dan tim support Anda.",
  },
  "/register": {
    title: "Daftar Gratis | Chatvice",
    description: "Buat akun Chatvice gratis dan mulai otomasi customer service bisnis Anda dengan AI.",
  },
  "/topup": {
    title: "Top Up Coin | Chatvice",
    description: "Top up coin Chatvice untuk layanan premium. Berbagai metode pembayaran tersedia.",
  },
  "/vs/tawkto": {
    title: "Chatvice vs Tawk.to: AI Customer Service vs Free Live Chat (2025)",
    description: "Chatvice vs Tawk.to comparison 2025. See why businesses switch from Tawk.to's basic live chat to Chatvice's AI-powered automation with knowledge base, human escalation, and analytics.",
  },
  "/vs/intercom": {
    title: "Chatvice vs Intercom: Affordable AI Customer Service Alternative (2025)",
    description: "Chatvice vs Intercom 2025. Why fast-growing businesses choose Chatvice over Intercom. Compare AI features, pricing, and ease of use. Save up to 80% vs Intercom's $74+/seat pricing.",
  },
  "/vs/tidio": {
    title: "Chatvice vs Tidio: Full AI Platform vs Limited Chatbot (2025)",
    description: "Chatvice vs Tidio comparison 2025. Compare LEXA1 AI vs Lyro AI, knowledge base quality, human escalation, pricing, and Indonesian market support.",
  },
  "/vs/zendesk": {
    title: "Chatvice vs Zendesk: AI Chat vs Legacy Help Desk (2025)",
    description: "Chatvice vs Zendesk 2025 comparison. Why businesses choose Chatvice's AI-first approach over Zendesk's complex ticketing system. Compare AI capabilities, pricing, and setup time.",
  },
  "/vs/freshdesk": {
    title: "Chatvice vs Freshdesk: AI Customer Service vs Help Desk Platform (2025)",
    description: "Chatvice vs Freshdesk comparison 2025. Compare AI chat automation, pricing, setup complexity, and features. See why businesses choose Chatvice for real-time AI customer service.",
  },
  "/vs/livechat": {
    title: "Chatvice vs LiveChat: AI Automation vs Human-First Chat (2025)",
    description: "Chatvice vs LiveChat comparison 2025. Compare AI automation vs live agent chat, pricing per seat vs flat pricing, knowledge base quality, and ease of setup.",
  },
  "/vs/drift": {
    title: "Chatvice vs Drift: Affordable AI Customer Service vs Expensive B2B Chat (2025)",
    description: "Chatvice vs Drift 2025. Why growing businesses choose Chatvice over Drift's $2,500+/month pricing. Compare AI features, ease of use, and value.",
  },
};

function updateOrCreateMeta(property: string, content: string, isName: boolean = false) {
  const selector = isName ? `meta[name='${property}']` : `meta[property='${property}']`;
  let element = document.querySelector(selector);
  
  if (!element) {
    element = document.createElement('meta');
    if (isName) {
      element.setAttribute('name', property);
    } else {
      element.setAttribute('property', property);
    }
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function updateOrCreateLink(rel: string, href: string, type?: string, sizes?: string) {
  let selector = `link[rel='${rel}']`;
  if (type) selector += `[type='${type}']`;
  if (sizes) selector += `[sizes='${sizes}']`;
  
  let element = document.querySelector(selector);
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    if (type) element.setAttribute('type', type);
    if (sizes) element.setAttribute('sizes', sizes);
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', href);
}

function getMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ico':
      return 'image/x-icon';
    case 'png':
      return 'image/png';
    case 'svg':
      return 'image/svg+xml';
    case 'gif':
      return 'image/gif';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

function updateFavicon(faviconUrl: string) {
  const mimeType = getMimeType(faviconUrl);
  const cacheBuster = `?v=${Date.now()}`;
  const urlWithCache = faviconUrl + cacheBuster;
  
  const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  existingLinks.forEach(link => link.remove());
  
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = mimeType;
  link.href = urlWithCache;
  document.head.appendChild(link);
  
  const shortcutLink = document.createElement('link');
  shortcutLink.rel = 'shortcut icon';
  shortcutLink.type = mimeType;
  shortcutLink.href = urlWithCache;
  document.head.appendChild(shortcutLink);
  
  const appleTouchLink = document.createElement('link');
  appleTouchLink.rel = 'apple-touch-icon';
  appleTouchLink.href = urlWithCache;
  document.head.appendChild(appleTouchLink);
}

export function DynamicHead() {
  const lastFaviconUrl = useRef<string | null>(null);
  const [location] = useLocation();
  
  const { data: settings, isError } = useQuery<LandingPageSettings>({
    queryKey: ["/api/landing-settings"],
    staleTime: 60000,
    retry: 2,
  });

  useEffect(() => {
    const pagePath = location === "/" ? "/" : location.replace(/\/$/, "");
    const pageConfig = pageOgConfig[pagePath];
    const baseUrl = settings?.canonicalUrl?.replace(/\/$/, '') || 'https://chatvice.app';
    const currentPath = location === '/' ? '' : location;
    const pageCanonicalUrl = `${baseUrl}${currentPath}`;
    const pageSlug = pagePath === "/" ? "home" : pagePath.replace(/^\//, "");
    const ogImageUrl = `${baseUrl}/og/${pageSlug}.png`;
    
    if (pageConfig) {
      document.title = pageConfig.title;
      updateOrCreateMeta('og:title', pageConfig.title);
      updateOrCreateMeta('twitter:title', pageConfig.title, true);
      updateOrCreateMeta('description', pageConfig.description, true);
      updateOrCreateMeta('og:description', pageConfig.description);
      updateOrCreateMeta('twitter:description', pageConfig.description, true);
      updateOrCreateMeta('og:image', ogImageUrl);
      updateOrCreateMeta('og:image:width', '1200');
      updateOrCreateMeta('og:image:height', '630');
      updateOrCreateMeta('twitter:image', ogImageUrl, true);
    } else if (settings) {
      if (settings.metaTitle) {
        document.title = settings.metaTitle;
        updateOrCreateMeta('og:title', settings.metaTitle);
        updateOrCreateMeta('twitter:title', settings.metaTitle, true);
      }
      if (settings.metaDescription) {
        updateOrCreateMeta('description', settings.metaDescription, true);
        updateOrCreateMeta('og:description', settings.metaDescription);
        updateOrCreateMeta('twitter:description', settings.metaDescription, true);
      }
      if (settings.ogImageUrl) {
        updateOrCreateMeta('og:image', settings.ogImageUrl);
        updateOrCreateMeta('og:image:width', '1200');
        updateOrCreateMeta('og:image:height', '630');
        updateOrCreateMeta('twitter:image', settings.ogImageUrl, true);
      }
    }
    
    updateOrCreateLink('canonical', pageCanonicalUrl);
    updateOrCreateMeta('og:url', pageCanonicalUrl);
    updateOrCreateMeta('twitter:url', pageCanonicalUrl, true);
  }, [location, settings, isError]);

  useEffect(() => {
    if (isError && !settings) return;
    if (!settings) return;

    if (settings.faviconUrl && settings.faviconUrl !== lastFaviconUrl.current) {
      updateFavicon(settings.faviconUrl);
      lastFaviconUrl.current = settings.faviconUrl;
    }
  }, [settings, isError]);

  return <SchemaMarkup id="org-jsonld" schema={organizationSchema} />;
}
