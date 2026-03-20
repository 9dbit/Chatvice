import OpenAI from "openai";
import { storage } from "./storage";
import { randomBytes } from "crypto";
import { blogArticles } from "../client/src/pages/company/blog-data";

function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const CATEGORIES = ["Product", "Tutorial", "Industry", "Comparison", "Insights"];

const COMPETITORS = [
  "LiveChat",
  "Tawk.to",
  "Chatport",
  "Freshdesk",
  "Zendesk",
  "Intercom",
  "Tidio",
  "Drift",
];

const HERO_IMAGE_KEYS: Record<string, string[]> = {
  Product: ["introducing-lexa1-ai-engine", "best-practices-training-ai-agent"],
  Tutorial: ["best-practices-training-ai-agent", "multi-language-support-strategy"],
  Industry: ["ai-transforming-customer-service-indonesia", "human-ai-collaboration-customer-support"],
  Comparison: ["chatvice-vs-livechat-zendesk-intercom", "ai-transforming-customer-service-indonesia"],
  Insights: ["human-ai-collaboration-customer-support", "multi-language-support-strategy"],
};

function getCompetitorForDay(date: Date): string {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return COMPETITORS[dayOfYear % COMPETITORS.length];
}

function getHeroImageKey(category: string, date: Date): string {
  const keys = HERO_IMAGE_KEYS[category] || HERO_IMAGE_KEYS["Product"];
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return keys[dayOfYear % keys.length];
}

function slugify(title: string, date: Date): string {
  const dateStr = date.toISOString().slice(0, 10);
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-$/, "");
  return `${dateStr}-${base}`;
}

function buildPrompt(category: string, competitor: string, date: Date): string {
  const dateStr = date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const categoryGuide: Record<string, string> = {
    Product: `Write about a specific Chatvice feature or product update. Highlight unique value propositions like the LEXA1 AI engine, semantic knowledge base, proactive chat, Telegram supervisor bridge, or product catalog crawler. Mention how Chatvice helps businesses in Indonesia and Southeast Asia.`,
    Tutorial: `Write a step-by-step tutorial for using Chatvice effectively. Topics can include: setting up your knowledge base, configuring escalation triggers, using the AI media analysis, managing supervisors, or embedding the chat widget. Be practical and actionable with at least 5 concrete steps.`,
    Industry: `Write about trends in AI customer service for the Indonesian market or Southeast Asia. Cover topics like digital transformation, mobile-first customers, 24/7 service expectations, or the rise of AI chatbots in e-commerce, banking, or retail sectors.`,
    Comparison: `Write a detailed comparison between Chatvice and ${competitor}. Use a fair, balanced tone but highlight areas where Chatvice excels: pricing in IDR, Bahasa Indonesia support, built-in supervisor escalation, proactive chat, Telegram bridge, and no per-agent fees. Use data tables for feature comparisons.`,
    Insights: `Write a thought-leadership piece about the future of customer service, human-AI collaboration, customer expectations in 2025-2026, or lessons learned from AI chatbot deployments in Indonesia. Provide data points and actionable conclusions.`,
  };

  return `You are a senior content writer for Chatvice, an AI-powered customer service chatbot platform built for the Indonesian market. Write a comprehensive blog article with the following requirements:

Category: ${category}
Date: ${dateStr}
${category === "Comparison" ? `Competitor to compare: ${competitor}` : ""}

Content guidelines:
- ${categoryGuide[category]}
- Minimum 800 words
- Language: English
- Tone: Professional but approachable; helpful and informative
- SEO-optimized: naturally include relevant keywords like "AI chatbot", "customer service automation", "Chatvice", "Indonesia customer service"
- Use HTML formatting with proper <h2>, <h3>, <ul>, <ol>, <li>, <p>, <strong>, <em>, <blockquote> tags
- Include at least one data table where relevant (wrapped in <div class="overflow-x-auto"><table>...</table></div>)
- End with a call to action linking to /register or /pricing

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just JSON):
{
  "title": "SEO-friendly article title (max 70 chars)",
  "excerpt": "One-sentence summary for listing pages (max 150 chars)",
  "metaDescription": "SEO meta description (max 160 chars)",
  "content": "Full HTML content of the article (minimum 800 words)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;
}

export async function generateDailyBlogPosts(): Promise<void> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const competitor = getCompetitorForDay(today);

  console.log(`[blog-gen] Starting daily blog generation for ${dateStr}, competitor rotation: ${competitor}`);

  for (const category of CATEGORIES) {
    try {
      const prompt = buildPrompt(category, competitor, today);

      const openai = getOpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const rawContent = response.choices[0]?.message?.content?.trim() || "";

      let parsed: { title: string; excerpt: string; metaDescription: string; content: string; tags: string[] };
      try {
        parsed = JSON.parse(rawContent);
      } catch {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse JSON from AI response");
        parsed = JSON.parse(jsonMatch[0]);
      }

      if (!parsed.title || !parsed.content) {
        throw new Error("AI response missing required fields");
      }

      const slug = slugify(parsed.title, today);
      const id = "bp_" + randomBytes(8).toString("hex");

      const post = await storage.createBlogPost({
        id,
        slug,
        title: parsed.title,
        excerpt: parsed.excerpt || "",
        metaDescription: parsed.metaDescription || "",
        content: parsed.content,
        category,
        author: "Chatvice Team",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        featured: false,
        published: true,
        heroImageKey: getHeroImageKey(category, today),
        publishedAt: today,
      });

      await storage.createBlogGenerationLog({
        date: dateStr,
        category,
        status: "success",
        postId: post.id,
      });

      console.log(`[blog-gen] Generated: [${category}] "${parsed.title}"`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[blog-gen] Failed to generate ${category} post:`, errMsg);
      await storage.createBlogGenerationLog({
        date: dateStr,
        category,
        status: "error",
        errorMessage: errMsg,
      }).catch(() => {});
    }
  }

  console.log(`[blog-gen] Daily blog generation complete for ${dateStr}`);
}

export async function seedBlogPostsFromStaticData(): Promise<void> {
  try {
    const existingCount = await storage.countBlogPosts();
    if (existingCount > 0) return;

    console.log("[blog-gen] Seeding blog posts from static data...");
    for (const article of blogArticles) {
      try {
        const id = "bp_" + randomBytes(8).toString("hex");
        await storage.createBlogPost({
          id,
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          metaDescription: article.metaDescription,
          content: article.content,
          category: article.category,
          author: article.author,
          tags: article.tags,
          featured: article.featured,
          published: true,
          heroImageKey: article.slug,
          publishedAt: new Date(article.date),
        });
      } catch (e) {
        console.warn("[blog-gen] Skipping duplicate seed slug:", article.slug);
      }
    }
    console.log("[blog-gen] Blog seeding complete");
  } catch (error) {
    console.error("[blog-gen] Seed error:", error);
  }
}
