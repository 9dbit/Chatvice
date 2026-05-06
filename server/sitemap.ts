import type { BlogPost } from "@shared/schema";

const DEFAULT_BASE_URL = "https://chatvice.app";

interface StaticPage {
  url: string;
  priority: string;
  changefreq: string;
}

const STATIC_PAGES: StaticPage[] = [
  { url: "/", priority: "1.0", changefreq: "daily" },
  { url: "/features", priority: "0.9", changefreq: "weekly" },
  { url: "/pricing", priority: "0.9", changefreq: "weekly" },
  { url: "/faq", priority: "0.8", changefreq: "monthly" },
  { url: "/docs", priority: "0.8", changefreq: "weekly" },
  { url: "/blog", priority: "0.8", changefreq: "daily" },
  { url: "/help", priority: "0.7", changefreq: "monthly" },
  { url: "/api-docs", priority: "0.6", changefreq: "monthly" },
  { url: "/changelog", priority: "0.6", changefreq: "weekly" },
  { url: "/integrations", priority: "0.7", changefreq: "monthly" },
  { url: "/about", priority: "0.7", changefreq: "monthly" },
  { url: "/contact", priority: "0.7", changefreq: "monthly" },
  { url: "/careers", priority: "0.6", changefreq: "monthly" },
  { url: "/press", priority: "0.5", changefreq: "monthly" },
  { url: "/partners", priority: "0.6", changefreq: "monthly" },
  { url: "/affiliate", priority: "0.6", changefreq: "monthly" },
  { url: "/status", priority: "0.5", changefreq: "daily" },
  { url: "/demo", priority: "0.7", changefreq: "monthly" },
  { url: "/privacy", priority: "0.3", changefreq: "yearly" },
  { url: "/terms", priority: "0.3", changefreq: "yearly" },
  { url: "/cookies", priority: "0.3", changefreq: "yearly" },
  { url: "/gdpr", priority: "0.3", changefreq: "yearly" },
  { url: "/security", priority: "0.4", changefreq: "yearly" },
  // Solution pages (Indonesian long-tail SEO landing pages)
  { url: "/chatbot-customer-service", priority: "0.9", changefreq: "weekly" },
  { url: "/ai-chatbot-whatsapp", priority: "0.9", changefreq: "weekly" },
  { url: "/live-chat-website", priority: "0.9", changefreq: "weekly" },
  { url: "/chatbot-toko-online", priority: "0.9", changefreq: "weekly" },
  { url: "/ai-chatbot-gratis", priority: "0.9", changefreq: "weekly" },
  { url: "/alternatif-tawkto", priority: "0.9", changefreq: "weekly" },
  // Competitor comparison overview + individual pages
  { url: "/compare", priority: "0.90", changefreq: "weekly" },
  { url: "/vs/livechat", priority: "0.85", changefreq: "weekly" },
  { url: "/vs/tawkto", priority: "0.85", changefreq: "weekly" },
  { url: "/vs/chatport", priority: "0.85", changefreq: "weekly" },
  { url: "/vs/freshdesk", priority: "0.85", changefreq: "weekly" },
  { url: "/vs/zendesk", priority: "0.85", changefreq: "weekly" },
  { url: "/vs/intercom", priority: "0.85", changefreq: "weekly" },
  { url: "/vs/tidio", priority: "0.85", changefreq: "weekly" },
  { url: "/vs/drift", priority: "0.85", changefreq: "weekly" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateSitemap(baseUrl: string, blogPosts: BlogPost[]): string {
  const cleanBaseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const page of STATIC_PAGES) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(cleanBaseUrl + page.url)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  for (const post of blogPosts) {
    const lastmod = post.publishedAt
      ? new Date(post.publishedAt).toISOString().split("T")[0]
      : (post.generatedAt ? new Date(post.generatedAt).toISOString().split("T")[0] : today);

    const isComparison = post.category?.toLowerCase() === "comparison";

    if (isComparison) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(cleanBaseUrl + "/vs/" + post.slug)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.85</priority>\n`;
      xml += `  </url>\n`;
    } else {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(cleanBaseUrl + "/blog/" + post.slug)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }
  }

  xml += `</urlset>`;
  return xml;
}

interface SitemapCache {
  xml: string;
  generatedAt: number;
}

let sitemapCache: SitemapCache | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export function getCachedSitemap(): string | null {
  if (sitemapCache && Date.now() - sitemapCache.generatedAt < CACHE_TTL_MS) {
    return sitemapCache.xml;
  }
  return null;
}

export function setCachedSitemap(xml: string): void {
  sitemapCache = { xml, generatedAt: Date.now() };
}

export function invalidateSitemapCache(): void {
  sitemapCache = null;
}

export { DEFAULT_BASE_URL };
