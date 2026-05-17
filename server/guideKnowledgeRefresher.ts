/**
 * Chatvice Guide Knowledge Refresher
 * Runs every 24 hours to use GPT-4.1-mini to synthesize an up-to-date,
 * teaching-oriented knowledge document and save it to platform_settings.
 * Falls back to the static comprehensive knowledge if OpenAI is unavailable.
 */

import OpenAI from "openai";
import { storage } from "./storage";
import { buildFullDashboardKnowledge } from "../shared/guide-knowledge";

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/**
 * Uses GPT-4.1-mini to synthesize a fresh, concise, teaching-oriented
 * guide knowledge document from the comprehensive static knowledge.
 * The output is optimized for AI retrieval — clear structure, concrete steps.
 */
export async function refreshGuideKnowledge(): Promise<{ success: boolean; preview: string; timestamp: string }> {
  const timestamp = new Date().toISOString();

  try {
    const openai = getOpenAI();

    if (!openai) {
      console.log("[guide-refresh] OpenAI not configured — using static knowledge fallback");
      const staticKnowledge = buildFullDashboardKnowledge();
      await storage.setPlatformSetting("guide_knowledge_content", staticKnowledge);
      await storage.setPlatformSetting("guide_knowledge_last_refreshed", timestamp);
      return {
        success: true,
        preview: staticKnowledge.slice(0, 200),
        timestamp,
      };
    }

    const staticKnowledge = buildFullDashboardKnowledge();

    console.log("[guide-refresh] Generating AI-synthesized guide knowledge...");

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a technical writer specializing in SaaS product documentation. 
Your task is to take the provided Chatvice dashboard knowledge base and rewrite it as a highly-optimized 
AI retrieval document. 

Rules:
- Keep ALL page names, URLs (/dashboard/...), and feature details accurate — do NOT invent or change them
- Preserve all [LINK:...] and [BTN:...] formatting exactly as provided
- Structure content so an AI assistant can quickly find the right section
- Make step-by-step instructions even clearer and more actionable
- Add "WHEN TO USE THIS" hints at the start of each major section
- Keep the full depth of information — do not summarize away important details
- Write in Indonesian (Bahasa Indonesia) as the primary language
- Total output should be comprehensive (at least 2000 words) — do not truncate`,
        },
        {
          role: "user",
          content: `Please rewrite and optimize this Chatvice dashboard knowledge base for AI retrieval. 
Keep all URLs, feature names, and [LINK:]/[BTN:] tags exactly as they are. 
Make the content clearer, more structured, and easier for an AI to use when answering merchant questions.

SOURCE KNOWLEDGE:
${staticKnowledge}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const generatedContent = response.choices[0]?.message?.content;

    if (!generatedContent || generatedContent.length < 500) {
      throw new Error("Generated content too short or empty");
    }

    await storage.setPlatformSetting("guide_knowledge_content", generatedContent);
    await storage.setPlatformSetting("guide_knowledge_last_refreshed", timestamp);

    console.log(`[guide-refresh] Knowledge refreshed successfully (${generatedContent.length} chars)`);

    return {
      success: true,
      preview: generatedContent.slice(0, 200),
      timestamp,
    };
  } catch (error: any) {
    console.error("[guide-refresh] Error refreshing guide knowledge:", error.message);

    // Fall back to static knowledge on error
    try {
      const staticKnowledge = buildFullDashboardKnowledge();
      await storage.setPlatformSetting("guide_knowledge_content", staticKnowledge);
      await storage.setPlatformSetting("guide_knowledge_last_refreshed", timestamp);
      console.log("[guide-refresh] Fell back to static knowledge after error");
      return {
        success: true,
        preview: staticKnowledge.slice(0, 200),
        timestamp,
      };
    } catch (fallbackError: any) {
      console.error("[guide-refresh] Fallback to static knowledge also failed:", fallbackError.message);
      return {
        success: false,
        preview: "",
        timestamp,
      };
    }
  }
}

/**
 * Schedules the guide knowledge refresh to run:
 * - Once at startup (after a short delay to let the DB settle)
 * - Every 24 hours thereafter at 02:00 UTC
 */
export function scheduleGuideKnowledgeRefresh(): void {
  // Run once at startup after 30 seconds
  setTimeout(() => {
    refreshGuideKnowledge().catch(err =>
      console.error("[guide-refresh] Startup refresh error:", err)
    );
  }, 30 * 1000);

  // Schedule daily at 02:00 UTC
  const now = new Date();
  const next02UTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + (now.getUTCHours() >= 2 ? 1 : 0),
    2, 0, 0, 0,
  ));
  const msUntilNext = next02UTC.getTime() - now.getTime();

  console.log(`[guide-refresh] Next knowledge refresh scheduled in ${Math.round(msUntilNext / 60000)} minutes`);

  setTimeout(() => {
    refreshGuideKnowledge().catch(err =>
      console.error("[guide-refresh] Scheduled refresh error:", err)
    );
    setInterval(() => {
      refreshGuideKnowledge().catch(err =>
        console.error("[guide-refresh] Scheduled refresh error:", err)
      );
    }, 24 * 60 * 60 * 1000);
  }, msUntilNext);
}
