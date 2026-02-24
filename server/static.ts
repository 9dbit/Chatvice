import express, { type Express } from "express";
import fs from "fs";
import path from "path";

const BASE_URL = "https://chatvice.app";

const PAGE_SEO: Record<string, { title: string; description: string }> = {
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
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function injectSeoMeta(html: string, urlPath: string): string {
  const cleanPath = urlPath === "/" ? "/" : urlPath.replace(/\/$/, "").split("?")[0];
  const seo = PAGE_SEO[cleanPath];
  if (!seo) return html;

  const canonicalUrl = `${BASE_URL}${cleanPath === "/" ? "" : cleanPath}`;
  const pageSlug = cleanPath === "/" ? "home" : cleanPath.replace(/^\//, "");
  const ogImageUrl = `${BASE_URL}/og/${pageSlug}.png`;

  const escapedTitle = escapeHtml(seo.title);
  const escapedDesc = escapeHtml(seo.description);

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapedTitle}</title>`
  );

  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapedDesc}" />`
  );

  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  html = html.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapedTitle}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapedDesc}" />`
  );
  html = html.replace(
    /<meta property="og:image" content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${ogImageUrl}" />`
  );

  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${escapedTitle}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${escapedDesc}" />`
  );
  html = html.replace(
    /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${ogImageUrl}" />`
  );

  return html;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const uploadsPath = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsPath));

  app.use(express.static(distPath));

  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");
    html = injectSeoMeta(html, req.originalUrl);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
