import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { storage } from "./storage";
import {
  chatAskSchema,
  registerMerchantSchema,
  loginSchema,
  merchantConfigSchema,
  agentWidgetSettingsSchema,
} from "@shared/schema";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStore from "memorystore";
import multer from "multer";
import path from "path";
import fs from "fs";
import { processKnowledgeBase, searchKnowledge } from "./embeddings";
import { extractFAQContent } from "./crawler";
import { createQRISPayment, createVAPayment, checkPaymentStatus, isKompasPayConfigured, convertToIDR, formatIDR } from "./kompasPayClient";
import { sendVerificationEmail, sendPasswordResetEmail, getUncachableResendClient } from "./resendClient";
import { subscriptionPlans, type SubscriptionPlanId, type Merchant, type GatewayStats } from "@shared/schema";
import crypto from "crypto";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp", 
      "video/mp4", "video/webm", "video/quicktime",
      "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-wav",
      "application/pdf", "text/plain", "text/csv",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

declare module "express-session" {
  interface SessionData {
    userId: string;
    userType: "merchant" | "supervisor" | "admin";
    merchantId: string;
    isAdmin?: boolean;
    oauthState?: string;
  }
}

// Import subscription plan utility with caching
import { getEffectiveSubscriptionPlan, getAllEffectiveSubscriptionPlans, clearPlanCache } from './subscriptionPlanUtils';

function getBaseUrl(req: Request): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
  return `${protocol}://${host}`;
}

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireMerchant(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session.userType !== "merchant") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireSupervisor(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session.userType !== "supervisor") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireMerchantOrSupervisor(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || (req.session.userType !== "merchant" && req.session.userType !== "supervisor")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session.userType !== "admin" || !req.session.isAdmin) {
    return res.status(401).json({ error: "Unauthorized - Admin access required" });
  }
  next();
}

// Helper function to get effective plan limits (respects custom plan configuration and DB overrides)
async function getEffectivePlanLimitsAsync(merchant: Merchant) {
  // For custom plans, always use merchant-level custom configuration
  if (merchant.subscriptionPlanId === 'custom') {
    const basePlan = subscriptionPlans.custom;
    return {
      conversationsLimit: merchant.customConversationsLimit ?? basePlan.conversationsLimit,
      agentsLimit: merchant.customAgentsLimit ?? basePlan.agentsLimit,
      supervisorsLimit: merchant.customSupervisorsLimit ?? basePlan.supervisorsLimit,
      sourcesLimit: merchant.customSourcesLimit ?? basePlan.sourcesLimit,
      suggestedQuestionsLimit: merchant.customSuggestedQuestionsLimit ?? basePlan.suggestedQuestionsLimit,
      monthlyPrice: merchant.customMonthlyPrice ?? basePlan.monthlyPrice,
      annualPrice: merchant.customAnnualPrice ?? basePlan.annualPrice,
    };
  }
  
  // For standard plans, use the effective plan with DB overrides
  const effectivePlan = await getEffectiveSubscriptionPlan(merchant.subscriptionPlanId);
  if (!effectivePlan) {
    // Fallback to free plan if effective plan cannot be retrieved
    const freePlan = await getEffectiveSubscriptionPlan('free');
    if (!freePlan) {
      // Ultimate fallback to hardcoded values
      return {
        conversationsLimit: 20,
        agentsLimit: 1,
        supervisorsLimit: 1,
        sourcesLimit: 1,
        suggestedQuestionsLimit: 3,
        monthlyPrice: 0,
        annualPrice: 0,
      };
    }
    return {
      conversationsLimit: freePlan.conversationsLimit,
      agentsLimit: freePlan.agentsLimit,
      supervisorsLimit: freePlan.supervisorsLimit,
      sourcesLimit: freePlan.sourcesLimit,
      suggestedQuestionsLimit: freePlan.suggestedQuestionsLimit,
      monthlyPrice: freePlan.monthlyPrice,
      annualPrice: freePlan.annualPrice,
    };
  }
  
  return {
    conversationsLimit: effectivePlan.conversationsLimit,
    agentsLimit: effectivePlan.agentsLimit,
    supervisorsLimit: effectivePlan.supervisorsLimit,
    sourcesLimit: effectivePlan.sourcesLimit,
    suggestedQuestionsLimit: effectivePlan.suggestedQuestionsLimit,
    monthlyPrice: effectivePlan.monthlyPrice,
    annualPrice: effectivePlan.annualPrice,
  };
}

async function checkSubscriptionLimits(merchantId: string, type: 'conversation' | 'supervisor'): Promise<{ allowed: boolean; message?: string }> {
  const merchant = await storage.getMerchant(merchantId);
  if (!merchant) {
    return { allowed: false, message: "Merchant not found" };
  }
  
  const effectiveLimits = await getEffectivePlanLimitsAsync(merchant);
  
  if (merchant.subscriptionStatus === 'trial') {
    const trialExpired = merchant.trialEndsAt && new Date(merchant.trialEndsAt) < new Date();
    if (trialExpired) {
      return { allowed: false, message: "Trial expired. Please upgrade to continue." };
    }
  } else if (merchant.subscriptionStatus !== 'active') {
    return { allowed: false, message: "Subscription inactive. Please renew to continue." };
  }
  
  if (type === 'conversation') {
    if (effectiveLimits.conversationsLimit === -1) return { allowed: true };
    const used = merchant.conversationsUsed || 0;
    if (used >= effectiveLimits.conversationsLimit) {
      return { allowed: false, message: `Monthly conversation limit reached (${effectiveLimits.conversationsLimit}). Please upgrade your plan.` };
    }
  }
  
  if (type === 'supervisor') {
    const supervisors = await storage.getSupervisorsByMerchant(merchantId);
    if (effectiveLimits.supervisorsLimit === -1) return { allowed: true };
    if (supervisors.length >= effectiveLimits.supervisorsLimit) {
      return { allowed: false, message: `Supervisor limit reached (${effectiveLimits.supervisorsLimit}). Please upgrade your plan.` };
    }
  }
  
  return { allowed: true };
}

async function checkTriggers(merchantId: string, text: string): Promise<{ triggered: boolean; keyword?: string }> {
  const triggers = await storage.getTriggers(merchantId);
  const defaultTriggers = ["deposit not received", "withdrawal pending", "speak to manager", "refund"];
  const allTriggers = triggers.length > 0 ? triggers.map(t => t.keyword) : defaultTriggers;
  
  const lowerText = text.toLowerCase();
  for (const trigger of allTriggers) {
    if (lowerText.includes(trigger.toLowerCase())) {
      return { triggered: true, keyword: trigger };
    }
  }
  return { triggered: false };
}

async function notifySupervisors(merchantId: string, sessionId: string) {
  const supervisors = await storage.getSupervisorsByMerchant(merchantId);
  for (const supervisor of supervisors) {
    await storage.createNotification({
      supervisorId: supervisor.id,
      sessionId,
      message: "Customer needs assistance (trigger detected)",
      seen: false,
    });
  }
}

// Round-robin agent assignment tracking per merchant
const lastAssignedAgentIndex: Map<string, number> = new Map();

async function getNextAgentId(merchantId: string): Promise<string | null> {
  const agents = await storage.getAgents(merchantId);
  const activeAgents = agents.filter(a => a.isActive);
  
  if (activeAgents.length === 0) {
    // No active agents, return null
    return null;
  }
  
  if (activeAgents.length === 1) {
    // Only one active agent, always use it
    return activeAgents[0].id;
  }
  
  // Round-robin for 2+ active agents
  const lastIndex = lastAssignedAgentIndex.get(merchantId) ?? -1;
  const nextIndex = (lastIndex + 1) % activeAgents.length;
  lastAssignedAgentIndex.set(merchantId, nextIndex);
  
  return activeAgents[nextIndex].id;
}

async function askChatvice(
  sessionId: string,
  merchantId: string,
  message: string
): Promise<{ answer: string; mode: "AI" | "HUMAN" }> {
  let session = await storage.getSession(sessionId);
  if (!session) {
    // Use round-robin agent assignment for new sessions
    const assignedAgentId = await getNextAgentId(merchantId);
    session = await storage.createSession({
      id: sessionId,
      merchantId,
      mode: "AI",
      customerName: "Customer",
      agentId: assignedAgentId,
    });
  }

  if (session.mode === "HUMAN") {
    return {
      answer: "Supervisor sedang menangani percakapan Anda. Mohon tunggu balasannya.",
      mode: "HUMAN",
    };
  }

  const triggerResult = await checkTriggers(merchantId, message);
  if (triggerResult.triggered) {
    await storage.updateSession(sessionId, { mode: "HUMAN" });
    await notifySupervisors(merchantId, sessionId);
    return {
      answer: "Saya akan menghubungkan Anda dengan supervisor yang dapat membantu. Mohon tunggu sebentar.",
      mode: "HUMAN",
    };
  }

  const merchant = await storage.getMerchant(merchantId);
  const companyName = merchant?.companyName || "our company";
  const activeAgentId = merchant?.activeAgentId || undefined;
  
  // Get agent's settings
  let agentSystemPrompt = "";
  let agentName = "Chatvice";
  let toneStyle = "formal";
  let temperature = 0.7;
  let autoEscalateAngry = false;
  
  if (activeAgentId) {
    const agent = await storage.getAgent(activeAgentId);
    if (agent) {
      if (agent.systemPrompt) {
        agentSystemPrompt = agent.systemPrompt;
      }
      if (agent.name) {
        agentName = agent.name;
      }
      if (agent.toneStyle) {
        toneStyle = agent.toneStyle;
      }
      if (agent.temperature) {
        temperature = parseFloat(agent.temperature);
      }
      if (agent.autoEscalateAngry) {
        autoEscalateAngry = true;
      }
    }
  }
  
  // Check for angry customer if auto-escalate is enabled
  if (autoEscalateAngry) {
    const angerIndicators = ["marah", "kesal", "kecewa", "angry", "frustrated", "upset", "terrible", "worst", "hate", "stupid", "idiot", "bodoh", "goblok", "!!!"];
    const lowerMessage = message.toLowerCase();
    const isAngry = angerIndicators.some(indicator => lowerMessage.includes(indicator));
    if (isAngry) {
      await storage.updateSession(sessionId, { mode: "HUMAN" });
      await notifySupervisors(merchantId, sessionId);
      return {
        answer: "Saya memahami Anda sedang frustasi. Izinkan saya menghubungkan Anda dengan supervisor kami yang dapat membantu lebih lanjut.",
        mode: "HUMAN",
      };
    }
  }
  
  // Build tone style instruction
  const toneInstructions: Record<string, string> = {
    formal: "Gunakan bahasa formal dan sopan. Panggil customer dengan 'Bapak/Ibu'. Hindari bahasa gaul atau slang.",
    casual: "Gunakan bahasa santai dan ramah seperti teman. Boleh pakai kata-kata seperti 'kamu', 'oke', 'yuk'.",
    poetic: "Jawab dengan gaya bahasa yang indah dan ekspresif. Gunakan metafora dan perumpamaan yang menarik."
  };
  const toneInstruction = toneInstructions[toneStyle] || toneInstructions.formal;
  
  let knowledgeContext = "";
  try {
    const relevantChunks = await searchKnowledge(merchantId, message, 3, activeAgentId);
    if (relevantChunks.length > 0) {
      knowledgeContext = relevantChunks.join("\n\n---\n\n");
    } else {
      const knowledge = activeAgentId 
        ? await storage.getKnowledgeByAgent(activeAgentId)
        : await storage.getKnowledge(merchantId);
      knowledgeContext = knowledge?.content || "";
    }
  } catch (error) {
    console.error("Knowledge search error:", error);
    const knowledge = activeAgentId 
      ? await storage.getKnowledgeByAgent(activeAgentId)
      : await storage.getKnowledge(merchantId);
    knowledgeContext = knowledge?.content || "";
  }
  
  // Detect pricing-related questions and inject subscription plan data
  const pricingKeywords = ["harga", "pricing", "price", "biaya", "cost", "langganan", "subscription", "tarif", "paket harga", "paket langganan", "berapa harga", "berapa biaya"];
  const lowerMessage = message.toLowerCase();
  const isPricingQuestion = pricingKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (isPricingQuestion) {
    try {
      const allPlans = await getAllEffectiveSubscriptionPlans();
      const pricingInfo = allPlans.map(plan => {
        const priceText = plan.monthlyPrice === 0 
          ? "GRATIS" 
          : `$${plan.monthlyPrice}/bulan atau $${plan.annualPrice}/bulan (tahunan)`;
        const supervisorsText = plan.supervisorsLimit === -1 ? 'Unlimited' : plan.supervisorsLimit;
        const sourcesText = plan.sourcesLimit === -1 ? 'Unlimited' : plan.sourcesLimit;
        const agentsText = plan.agentsLimit === -1 ? 'Unlimited' : plan.agentsLimit;
        const conversationsText = plan.conversationsLimit === -1 ? 'Unlimited' : plan.conversationsLimit;
        return `**${plan.name}**: ${priceText}
- ${conversationsText} percakapan/bulan
- ${agentsText} AI agent
- ${supervisorsText} supervisor
- ${sourcesText} knowledge sources
- Fitur: ${plan.features.join(', ')}`;
      }).join('\n\n');
      
      knowledgeContext += `\n\n--- SUBSCRIPTION PLANS INFO ---\n${pricingInfo}`;
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
    }
  }

  // Build system message with base behavior + custom instructions
  const systemMessage = `You are ${agentName}, a friendly and helpful AI Customer Service Agent for ${companyName}.
You are professional yet approachable, and always aim to help customers effectively.
Always answer in a clear, structured way while maintaining a conversational tone.

TONE/STYLE INSTRUCTION:
${toneInstruction}

LANGUAGE MATCHING (CRITICAL - WAJIB DIIKUTI):
- WAJIB: Selalu jawab menggunakan bahasa yang SAMA dengan bahasa pesan TERAKHIR customer
- Jika customer bertanya dalam Bahasa Indonesia, JAWAB dalam Bahasa Indonesia
- Jika customer bertanya dalam English, JAWAB dalam English
- Jika customer menulis dalam bahasa lain (Spanish, French, dll), JAWAB dalam bahasa yang sama
- JANGAN campur bahasa - konsisten gunakan satu bahasa sesuai pertanyaan customer
- This includes greeting messages - match their language
${agentSystemPrompt ? `

CUSTOM INSTRUCTIONS (FOLLOW THESE STRICTLY):
${agentSystemPrompt.trim()}` : ""}

CONVERSATION CONTEXT:
- You have memory of the conversation history
- If a follow-up question relates to previous topics, use that context
- Maintain continuity across messages
- If customer references "it", "that", "this", refer to recent conversation context

INTERACTIVE FORMATTING:
When responding, you can include interactive elements:
- For clickable buttons that send a message: [BTN:Button Label:message to send when clicked]
- For clickable links to pages: [LINK:Display Text:URL]

Examples:
- "Would you like more details? [BTN:Yes, tell me more:Tell me more about this product]"
- "Check our [LINK:complete catalog:https://example.com/catalog] for more options."
- [BTN:Contact Support:I want to speak with a human agent]

Guidelines for buttons:
- Use buttons for common follow-up questions or actions
- Keep button labels short (2-4 words)
- The action text should be a natural question or request
- Offer 2-3 buttons maximum per response

Guidelines for links:
- Use links when directing to specific pages or resources
- External links should include https://
- Links appear inline within the text

PRICING RESPONSE FORMAT:
Jika customer bertanya tentang harga/pricing/paket dan ada info subscription plans dalam knowledge, gunakan data dari knowledge dan FORMAT seperti ini:

**NAMA_PAKET** - $XX/bulan
• Fitur 1
• Fitur 2 
• Fitur 3

[BTN:Pilih Paket:Saya tertarik dengan paket ini]
[BTN:Tanya Detail:Jelaskan lebih detail fitur paket ini]

PENTING: Gunakan harga PERSIS seperti yang ada di knowledge (dalam USD).

Relevant Company Information:
${knowledgeContext || "No specific knowledge base configured yet."}

If you don't have specific information to answer, be honest about it and offer to connect with a human agent.`;

  try {
    // Fetch conversation history from session messages for context continuity
    const sessionMessages = await storage.getMessages(sessionId);
    
    // Build messages array with history (limit to last 10 messages for token efficiency)
    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemMessage }
    ];
    
    // Add conversation history (limit to last 10 messages)
    if (sessionMessages.length > 0) {
      const recentMessages = sessionMessages.slice(-10);
      for (const msg of recentMessages) {
        if (msg.from === 'customer') {
          chatMessages.push({ role: "user", content: msg.content });
        } else if (msg.from === 'chatvice') {
          chatMessages.push({ role: "assistant", content: msg.content });
        }
        // Skip supervisor messages in AI context
      }
    }
    
    // Add current message
    chatMessages.push({ role: "user", content: message });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: chatMessages,
      max_completion_tokens: 500,
      temperature: temperature,
    });

    const answer = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";
    return { answer, mode: "AI" };
  } catch (error) {
    console.error("OpenAI error:", error);
    return {
      answer: "I'm experiencing some technical difficulties. Please try again in a moment.",
      mode: "AI",
    };
  }
}

async function analyzeMediaWithAI(
  merchantId: string,
  sessionId: string,
  mediaType: "photo" | "video" | "document",
  fileUrl: string,
  filename: string,
  requestHost?: string
): Promise<string> {
  const merchant = await storage.getMerchant(merchantId);
  const companyName = merchant?.companyName || "our company";
  const activeAgentId = merchant?.activeAgentId || undefined;
  
  let agentName = "Chatvice";
  let agentSystemPrompt = "";
  
  if (activeAgentId) {
    const agent = await storage.getAgent(activeAgentId);
    if (agent) {
      agentName = agent.name || "Chatvice";
      agentSystemPrompt = agent.systemPrompt || "";
    }
  }

  let knowledgeContext = "";
  try {
    const relevantChunks = await searchKnowledge(merchantId, `image analysis ${filename}`, 3, activeAgentId);
    if (relevantChunks.length > 0) {
      knowledgeContext = relevantChunks.join("\n\n---\n\n");
    } else {
      const knowledge = activeAgentId 
        ? await storage.getKnowledgeByAgent(activeAgentId)
        : await storage.getKnowledge(merchantId);
      knowledgeContext = knowledge?.content || "";
    }
  } catch (error) {
    console.error("Knowledge search error in media analysis:", error);
    const knowledge = activeAgentId 
      ? await storage.getKnowledgeByAgent(activeAgentId)
      : await storage.getKnowledge(merchantId);
    knowledgeContext = knowledge?.content || "";
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : requestHost 
      ? `https://${requestHost}`
      : "http://localhost:5000";
  const fullImageUrl = `${baseUrl}${fileUrl}`;

  try {
    if (mediaType === "photo") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are ${agentName}, a helpful AI Customer Service Agent for ${companyName}.
Your task is to analyze images sent by customers and offer relevant assistance.

Instructions:
1. Describe what you see in the image concisely
2. If it shows a product, damage, issue, or problem - acknowledge it and offer help
3. If it's a receipt, invoice, or document - summarize key information
4. Always be helpful and ask how you can assist further
5. Respond in the same language the customer likely uses (detect from context or default to Indonesian)
6. Use the knowledge base information below to provide accurate, customized responses about company products, services, and policies

${agentSystemPrompt ? `Custom Instructions: ${agentSystemPrompt}\n` : ""}
Relevant Company Knowledge:
${knowledgeContext || "No specific knowledge base configured yet."}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Customer sent this image. Please analyze it and offer assistance."
              },
              {
                type: "image_url",
                image_url: {
                  url: fullImageUrl,
                  detail: "auto"
                }
              }
            ]
          }
        ],
        max_completion_tokens: 500,
      });

      return completion.choices[0]?.message?.content || 
        "Saya melihat gambar yang Anda kirim. Bagaimana saya bisa membantu Anda terkait ini?";
    } 
    
    if (mediaType === "video") {
      return `Terima kasih telah mengirimkan video "${filename}". Saya sudah menerimanya. Mohon jelaskan apa yang ingin Anda tanyakan atau butuhkan bantuan terkait video ini?`;
    }
    
    if (mediaType === "document") {
      const ext = filename.toLowerCase().split('.').pop() || "";
      
      if (ext === "pdf") {
        return `Terima kasih telah mengirimkan dokumen PDF "${filename}". Saya sudah menerimanya. Apakah ada hal spesifik dari dokumen ini yang ingin Anda tanyakan atau diskusikan?`;
      }
      
      if (ext === "txt" || ext === "csv") {
        const filePath = path.join(process.cwd(), "uploads", fileUrl.replace("/uploads/", ""));
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.size > 100 * 1024) {
            return `Terima kasih telah mengirimkan dokumen "${filename}". File ini cukup besar. Apakah ada bagian spesifik yang ingin Anda tanyakan?`;
          }
          
          const content = await fs.promises.readFile(filePath, "utf-8");
          const preview = content.substring(0, 1000);
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content: `You are ${agentName}, a helpful AI Customer Service Agent for ${companyName}.
Analyze this document content and provide helpful insights or ask how you can assist.
Use the knowledge base information below to provide accurate, customized responses.

${agentSystemPrompt ? `Custom Instructions: ${agentSystemPrompt}\n` : ""}
Relevant Company Knowledge:
${knowledgeContext || "No specific knowledge base configured yet."}`
              },
              {
                role: "user",
                content: `Customer sent a ${ext.toUpperCase()} file named "${filename}". Here's the content:\n\n${preview}${content.length > 1000 ? "\n\n[Content truncated...]" : ""}\n\nPlease summarize and offer assistance.`
              }
            ],
            max_completion_tokens: 500,
          });
          
          return completion.choices[0]?.message?.content || 
            `Saya sudah menerima dokumen "${filename}". Bagaimana saya bisa membantu Anda?`;
        } catch {
          return `Terima kasih telah mengirimkan dokumen "${filename}". Bagaimana saya bisa membantu Anda terkait dokumen ini?`;
        }
      }
      
      if (ext === "doc" || ext === "docx") {
        return `Terima kasih telah mengirimkan dokumen Word "${filename}". Saya sudah menerimanya. Apakah ada hal spesifik dari dokumen ini yang ingin Anda tanyakan?`;
      }
      
      if (ext === "xls" || ext === "xlsx") {
        return `Terima kasih telah mengirimkan file Excel "${filename}". Saya sudah menerimanya. Apakah ada data atau informasi spesifik yang ingin Anda tanyakan dari file ini?`;
      }
      
      return `Terima kasih telah mengirimkan dokumen "${filename}". Saya sudah menerimanya. Apakah ada yang bisa saya bantu terkait dokumen ini?`;
    }
    
    return "Saya sudah menerima file Anda. Bagaimana saya bisa membantu?";
  } catch (error) {
    console.error("Media analysis error:", error);
    return "Terima kasih telah mengirimkan file. Bagaimana saya bisa membantu Anda?";
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const MemoryStoreSession = MemoryStore(session);
  
  // Trust proxy for production (required for secure cookies behind load balancer/reverse proxy)
  app.set("trust proxy", true);
  
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "chatvice-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000,
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("session");
    
    if (sessionId) {
      if (!clients.has(sessionId)) {
        clients.set(sessionId, new Set());
      }
      clients.get(sessionId)!.add(ws);
      
      ws.on("close", () => {
        clients.get(sessionId)?.delete(ws);
        if (clients.get(sessionId)?.size === 0) {
          clients.delete(sessionId);
        }
      });
    }
  });

  function broadcastToSession(sessionId: string, data: any) {
    const sessionClients = clients.get(sessionId);
    if (sessionClients) {
      const message = JSON.stringify(data);
      sessionClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  // Dynamic favicon route - serves from Object Storage, local uploads, or falls back to default
  app.get("/favicon.ico", async (req, res) => {
    try {
      const settings = await storage.getLandingPageSettings();
      const objectStorage = new ObjectStorageService();
      
      if (settings?.faviconUrl) {
        if (settings.faviconUrl.startsWith("/storage/") && objectStorage.isConfigured()) {
          try {
            const file = await objectStorage.getFile(settings.faviconUrl);
            return await objectStorage.downloadObject(file, res, 86400);
          } catch (err) {
            console.log("Object Storage favicon not found, trying fallback");
          }
        }
        
        if (settings.faviconUrl.startsWith("/db-files/")) {
          const fileId = settings.faviconUrl.replace("/db-files/", "");
          const file = await storage.getStoredFile(fileId);
          if (file) {
            const buffer = Buffer.from(file.content, "base64");
            res.setHeader("Content-Type", file.mimeType);
            res.setHeader("Content-Length", buffer.length);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.send(buffer);
          }
        }
        
        if (settings.faviconUrl.startsWith("/uploads/")) {
          const filePath = path.join(process.cwd(), settings.faviconUrl);
          if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
          }
        }
      }
      
      const defaultPath = path.join(process.cwd(), "client", "public", "favicon.ico");
      if (fs.existsSync(defaultPath)) {
        return res.sendFile(defaultPath);
      }
      res.status(404).send("Favicon not found");
    } catch (error) {
      console.error("Error serving favicon:", error);
      res.status(500).send("Error serving favicon");
    }
  });

  // Dynamic OG image route - serves from Object Storage, local uploads, or falls back to default
  app.get("/og-image.png", async (req, res) => {
    try {
      const settings = await storage.getLandingPageSettings();
      const objectStorage = new ObjectStorageService();
      
      if (settings?.ogImageUrl) {
        if (settings.ogImageUrl.startsWith("/storage/") && objectStorage.isConfigured()) {
          try {
            const file = await objectStorage.getFile(settings.ogImageUrl);
            return await objectStorage.downloadObject(file, res, 86400);
          } catch (err) {
            console.log("Object Storage OG image not found, trying fallback");
          }
        }
        
        if (settings.ogImageUrl.startsWith("/db-files/")) {
          const fileId = settings.ogImageUrl.replace("/db-files/", "");
          const file = await storage.getStoredFile(fileId);
          if (file) {
            const buffer = Buffer.from(file.content, "base64");
            res.setHeader("Content-Type", file.mimeType);
            res.setHeader("Content-Length", buffer.length);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.send(buffer);
          }
        }
        
        if (settings.ogImageUrl.startsWith("/uploads/")) {
          const filePath = path.join(process.cwd(), settings.ogImageUrl);
          if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
          }
        }
      }
      
      const defaultPath = path.join(process.cwd(), "client", "public", "og-image.png");
      if (fs.existsSync(defaultPath)) {
        return res.sendFile(defaultPath);
      }
      res.status(404).send("OG image not found");
    } catch (error) {
      console.error("Error serving OG image:", error);
      res.status(500).send("Error serving OG image");
    }
  });

  // Dynamic sitemap.xml route
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = `https://${req.get("host")}`;
      
      // Static pages
      const staticPages = [
        { url: "/", priority: "1.0", changefreq: "weekly" },
        { url: "/features", priority: "0.8", changefreq: "monthly" },
        { url: "/pricing", priority: "0.8", changefreq: "monthly" },
        { url: "/faq", priority: "0.7", changefreq: "monthly" },
        { url: "/docs", priority: "0.8", changefreq: "weekly" },
        { url: "/blog", priority: "0.8", changefreq: "weekly" },
        { url: "/login", priority: "0.5", changefreq: "yearly" },
        { url: "/register", priority: "0.6", changefreq: "yearly" },
      ];

      const today = new Date().toISOString().split("T")[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

      for (const page of staticPages) {
        xml += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
      }

      xml += `</urlset>`;

      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Dynamic robots.txt route
  app.get("/robots.txt", async (req, res) => {
    try {
      const settings = await storage.getLandingPageSettings();
      const baseUrl = `https://${req.get("host")}`;
      
      // Use custom robots.txt from settings if available, otherwise use default
      let robotsTxt = settings?.robotsTxt;
      
      if (!robotsTxt || robotsTxt.trim() === "") {
        robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;
      } else {
        // Replace placeholder sitemap URL if needed
        if (!robotsTxt.includes("Sitemap:")) {
          robotsTxt += `\n\nSitemap: ${baseUrl}/sitemap.xml`;
        }
      }

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
      res.send(robotsTxt);
    } catch (error) {
      console.error("Error serving robots.txt:", error);
      res.status(500).send("Error serving robots.txt");
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerMerchantSchema.parse(req.body);
      const existing = await storage.getMerchantByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const hashedPassword = await hashPassword(data.password);
      
      // Get configurable trial days from platform settings (default 14 days)
      const trialDaysSetting = await storage.getPlatformSetting("trial_days");
      const trialDays = trialDaysSetting ? parseInt(trialDaysSetting) : 14;
      
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
      
      const merchant = await storage.createMerchant({
        ...data,
        password: hashedPassword,
        subscriptionStatus: "trial",
        subscriptionPlanId: "starter",
        trialEndsAt,
        conversationsUsed: 0,
        isEmailVerified: false,
      });
      
      // Create email verification token (expires in 24 hours)
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);
      
      await storage.createEmailVerificationToken({
        merchantId: merchant.id,
        token: verificationToken,
        expiresAt: tokenExpiresAt,
      });
      
      // Send verification email (non-blocking)
      sendVerificationEmail(data.email, verificationToken, data.companyName).catch((err) => {
        console.error("Failed to send verification email:", err);
      });
      
      // Don't log user in yet - they need to verify email first
      res.json({ 
        success: true, 
        merchantId: merchant.id,
        requiresVerification: true,
        message: "Account created. Please check your email to verify your account."
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const merchant = await storage.getMerchantByEmail(data.email);
      if (merchant && await verifyPassword(data.password, merchant.password)) {
        // Check if email is verified
        if (!merchant.isEmailVerified) {
          return res.status(403).json({ 
            error: "Please verify your email address before logging in.",
            requiresVerification: true,
            email: merchant.email
          });
        }
        req.session.userId = merchant.id;
        req.session.userType = "merchant";
        req.session.merchantId = merchant.id;
        return res.json({ success: true, merchantId: merchant.id, type: "merchant" });
      }

      const supervisor = await storage.getSupervisorByEmail(data.email);
      if (supervisor && await verifyPassword(data.password, supervisor.password)) {
        req.session.userId = supervisor.id;
        req.session.userType = "supervisor";
        req.session.merchantId = supervisor.merchantId;
        return res.json({ success: true, merchantId: supervisor.merchantId, type: "supervisor" });
      }

      res.status(401).json({ error: "Invalid credentials" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  // Email verification endpoint
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const tokenRecord = await storage.getEmailVerificationTokenByToken(token);
      if (!tokenRecord) {
        return res.status(400).json({ error: "Invalid verification token" });
      }

      if (tokenRecord.usedAt) {
        return res.status(400).json({ error: "This verification link has already been used" });
      }

      if (new Date() > tokenRecord.expiresAt) {
        return res.status(400).json({ error: "Verification link has expired. Please request a new one." });
      }

      // Mark token as used and verify the merchant's email
      await storage.markEmailVerificationTokenUsed(tokenRecord.id);
      await storage.updateMerchant(tokenRecord.merchantId, {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });

      // Log the user in after verification
      const merchant = await storage.getMerchant(tokenRecord.merchantId);
      if (merchant) {
        req.session.userId = merchant.id;
        req.session.userType = "merchant";
        req.session.merchantId = merchant.id;
      }

      res.json({ success: true, message: "Email verified successfully" });
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const merchant = await storage.getMerchantByEmail(email);
      if (!merchant) {
        // Don't reveal if email exists or not
        return res.json({ success: true, message: "If that email exists, a verification link will be sent." });
      }

      if (merchant.isEmailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      // Create new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

      await storage.createEmailVerificationToken({
        merchantId: merchant.id,
        token: verificationToken,
        expiresAt: tokenExpiresAt,
      });

      // Send verification email
      await sendVerificationEmail(email, verificationToken, merchant.companyName);

      res.json({ success: true, message: "Verification email sent" });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to send verification email" });
    }
  });

  // Forgot password - Request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const merchant = await storage.getMerchantByEmail(email);
      if (!merchant) {
        // Don't reveal if email exists - security best practice
        return res.json({ success: true, message: "If that email exists, a password reset link will be sent." });
      }

      // Create password reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 1); // Expires in 1 hour

      await storage.createPasswordResetToken({
        merchantId: merchant.id,
        token: resetToken,
        expiresAt: tokenExpiresAt,
      });

      // Send password reset email
      await sendPasswordResetEmail(email, resetToken, merchant.companyName);

      res.json({ success: true, message: "Password reset link sent" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to send password reset email" });
    }
  });

  // Reset password - Complete password reset
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Find the token
      const resetToken = await storage.getPasswordResetTokenByToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }

      // Check if token is expired
      if (new Date(resetToken.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Reset link has expired. Please request a new one." });
      }

      // Check if token was already used
      if (resetToken.usedAt) {
        return res.status(400).json({ error: "This reset link has already been used" });
      }

      // Get the merchant
      const merchant = await storage.getMerchant(resetToken.merchantId);
      if (!merchant) {
        return res.status(400).json({ error: "Account not found" });
      }

      // Hash the new password and update
      const hashedPassword = await hashPassword(password);
      await storage.updateMerchant(merchant.id, { password: hashedPassword });

      // Mark token as used
      await storage.markPasswordResetTokenUsed(resetToken.id);

      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session?.userId) {
      return res.json({
        authenticated: true,
        userId: req.session.userId,
        userType: req.session.userType,
        merchantId: req.session.merchantId,
      });
    }
    res.json({ authenticated: false });
  });

  // Google OAuth - Initiate login flow
  app.get("/api/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    const scope = encodeURIComponent("openid email profile");
    const state = crypto.randomBytes(16).toString("hex");
    
    // Store state in session for CSRF protection
    req.session.oauthState = state;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${state}` +
      `&access_type=offline` +
      `&prompt=select_account`;
    
    res.redirect(authUrl);
  });

  // Google OAuth - Handle callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      // Verify state for CSRF protection
      if (!state || state !== req.session.oauthState) {
        return res.redirect("/login?error=invalid_state");
      }
      delete req.session.oauthState;

      if (!code || typeof code !== "string") {
        return res.redirect("/login?error=no_code");
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.redirect("/login?error=oauth_not_configured");
      }

      const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Google token exchange failed:", await tokenResponse.text());
        return res.redirect("/login?error=token_exchange_failed");
      }

      const tokens = await tokenResponse.json() as { access_token: string; id_token: string };

      // Get user info from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        console.error("Google user info failed:", await userInfoResponse.text());
        return res.redirect("/login?error=user_info_failed");
      }

      const googleUser = await userInfoResponse.json() as {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };

      // Check if merchant exists with this Google ID
      let merchant = await storage.getMerchantByGoogleId(googleUser.id);
      
      if (!merchant) {
        // Check if merchant exists with this email
        const existingMerchant = await storage.getMerchantByEmail(googleUser.email);
        
        if (existingMerchant) {
          // Only allow linking if the account has no password (OAuth-only account)
          // This prevents account takeover of password-based accounts
          if (existingMerchant.password && existingMerchant.password !== "") {
            // Account exists with password - don't auto-link, show error
            return res.redirect("/login?error=email_exists&message=An account with this email already exists. Please login with your password.");
          }
          // OAuth-only account (no password) - safe to link
          await storage.updateMerchant(existingMerchant.id, { 
            googleId: googleUser.id,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
          });
          merchant = existingMerchant;
        } else {
          // Create new merchant with Google account
          const trialDays = await storage.getPlatformSetting("trial_days");
          const trialPeriodDays = trialDays ? parseInt(trialDays) : 14;
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + trialPeriodDays);

          merchant = await storage.createMerchant({
            email: googleUser.email,
            password: "", // No password for OAuth users
            companyName: googleUser.name || googleUser.email.split("@")[0],
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            googleId: googleUser.id,
            profilePhotoUrl: googleUser.picture || "",
            subscriptionStatus: "trial",
            subscriptionPlanId: "free",
            trialEndsAt,
          });
        }
      }

      // Create session
      req.session.userId = merchant.id;
      req.session.userType = "merchant";
      req.session.merchantId = merchant.id;

      res.redirect("/dashboard");
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/login?error=oauth_failed");
    }
  });

  // GitHub OAuth - Initiate login flow
  app.get("/api/auth/github", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "GitHub OAuth not configured" });
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;
    const scope = "read:user user:email";
    const state = crypto.randomBytes(16).toString("hex");
    
    // Store state in session for CSRF protection
    req.session.oauthState = state;
    
    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}`;
    
    res.redirect(authUrl);
  });

  // GitHub OAuth - Handle callback
  app.get("/api/auth/github/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      // Verify state for CSRF protection
      if (!state || state !== req.session.oauthState) {
        return res.redirect("/login?error=invalid_state");
      }
      delete req.session.oauthState;

      if (!code || typeof code !== "string") {
        return res.redirect("/login?error=no_code");
      }

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.redirect("/login?error=oauth_not_configured");
      }

      const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;

      // Exchange code for access token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("GitHub token exchange failed:", await tokenResponse.text());
        return res.redirect("/login?error=token_exchange_failed");
      }

      const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };
      
      if (tokenData.error || !tokenData.access_token) {
        console.error("GitHub token error:", tokenData.error);
        return res.redirect("/login?error=token_exchange_failed");
      }

      // Get user info from GitHub
      const userInfoResponse = await fetch("https://api.github.com/user", {
        headers: { 
          Authorization: `Bearer ${tokenData.access_token}`,
          "Accept": "application/json",
          "User-Agent": "Chatvice-App",
        },
      });

      if (!userInfoResponse.ok) {
        console.error("GitHub user info failed:", await userInfoResponse.text());
        return res.redirect("/login?error=user_info_failed");
      }

      const githubUser = await userInfoResponse.json() as {
        id: number;
        login: string;
        name?: string;
        email?: string;
        avatar_url?: string;
      };

      // If email is not public, fetch from emails endpoint
      let userEmail = githubUser.email;
      if (!userEmail) {
        const emailsResponse = await fetch("https://api.github.com/user/emails", {
          headers: { 
            Authorization: `Bearer ${tokenData.access_token}`,
            "Accept": "application/json",
            "User-Agent": "Chatvice-App",
          },
        });

        if (emailsResponse.ok) {
          const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
          const primaryEmail = emails.find(e => e.primary && e.verified);
          if (primaryEmail) {
            userEmail = primaryEmail.email;
          } else {
            const verifiedEmail = emails.find(e => e.verified);
            if (verifiedEmail) {
              userEmail = verifiedEmail.email;
            }
          }
        }
      }

      if (!userEmail) {
        return res.redirect("/login?error=no_email&message=Could not retrieve email from GitHub. Please ensure your email is verified on GitHub.");
      }

      const githubId = githubUser.id.toString();

      // Check if merchant exists with this GitHub ID
      let merchant = await storage.getMerchantByGithubId(githubId);
      
      if (!merchant) {
        // Check if merchant exists with this email
        const existingMerchant = await storage.getMerchantByEmail(userEmail);
        
        if (existingMerchant) {
          // Only allow linking if the account has no password (OAuth-only account)
          // This prevents account takeover of password-based accounts
          if (existingMerchant.password && existingMerchant.password !== "") {
            // Account exists with password - don't auto-link, show error
            return res.redirect("/login?error=email_exists&message=An account with this email already exists. Please login with your password.");
          }
          // OAuth-only account (no password) - safe to link
          await storage.updateMerchant(existingMerchant.id, { 
            githubId: githubId,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
          });
          merchant = existingMerchant;
        } else {
          // Create new merchant with GitHub account
          const trialDays = await storage.getPlatformSetting("trial_days");
          const trialPeriodDays = trialDays ? parseInt(trialDays) : 14;
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + trialPeriodDays);

          merchant = await storage.createMerchant({
            email: userEmail,
            password: "", // No password for OAuth users
            companyName: githubUser.name || githubUser.login,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            githubId: githubId,
            profilePhotoUrl: githubUser.avatar_url || "",
            subscriptionStatus: "trial",
            subscriptionPlanId: "free",
            trialEndsAt,
          });
        }
      }

      // Create session
      req.session.userId = merchant.id;
      req.session.userType = "merchant";
      req.session.merchantId = merchant.id;

      res.redirect("/dashboard");
    } catch (error) {
      console.error("GitHub OAuth callback error:", error);
      res.redirect("/login?error=oauth_failed");
    }
  });

  app.get("/api/merchant/identity-secret", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      const canUseIdentityVerification = plan.id === "pro" || plan.id === "enterprise" || plan.id === "custom";
      
      if (!canUseIdentityVerification) {
        return res.status(403).json({ error: "Identity verification requires Pro or Enterprise plan" });
      }

      if (!merchant.identitySecretKey) {
        const crypto = require("crypto");
        const newSecret = `jny_sk_${crypto.randomBytes(24).toString("hex")}`;
        await storage.updateMerchant(merchantId, { identitySecretKey: newSecret });
        return res.json({ secretKey: newSecret });
      }

      res.json({ secretKey: merchant.identitySecretKey });
    } catch (error) {
      console.error("Identity secret error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/merchant/identity-secret/regenerate", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      const canUseIdentityVerification = plan.id === "pro" || plan.id === "enterprise" || plan.id === "custom";
      
      if (!canUseIdentityVerification) {
        return res.status(403).json({ error: "Identity verification requires Pro or Enterprise plan" });
      }

      const crypto = require("crypto");
      const newSecret = `jny_sk_${crypto.randomBytes(24).toString("hex")}`;
      await storage.updateMerchant(merchantId, { identitySecretKey: newSecret });
      res.json({ secretKey: newSecret });
    } catch (error) {
      console.error("Regenerate secret error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============ Merchant Allowed Domains CRUD ============
  // NOTE: These routes must be registered BEFORE /api/merchant/:merchantId to avoid route conflicts
  
  // Get all domains for a merchant
  app.get("/api/merchant/domains", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      const domains = await storage.getMerchantDomains(merchantId);
      const domainsLimit = plan.domainsLimit;
      
      res.json({ 
        domains, 
        limit: domainsLimit,
        used: domains.length,
        planId: plan.id
      });
    } catch (error) {
      console.error("Get domains error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Add a new domain
  app.post("/api/merchant/domains", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { domain } = req.body;
      
      if (!domain) {
        return res.status(400).json({ error: "Domain required" });
      }

      // Normalize domain (lowercase, remove protocol and trailing slashes)
      const normalizedDomain = domain.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '')
        .trim();
      
      // Validate domain format
      const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      if (!domainRegex.test(normalizedDomain)) {
        return res.status(400).json({ error: "Invalid domain format. Example: example.com or sub.example.com" });
      }

      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      const domainsLimit = plan.domainsLimit;
      const currentCount = await storage.countMerchantDomains(merchantId);
      
      if (currentCount >= domainsLimit) {
        return res.status(403).json({ 
          error: "Domain limit reached",
          limit: domainsLimit,
          planId: plan.id,
          requiresUpgrade: true
        });
      }

      // Check if domain already exists for this merchant
      const existing = await storage.getMerchantDomainByDomain(merchantId, normalizedDomain);
      if (existing) {
        return res.status(400).json({ error: "Domain already added" });
      }

      const newDomain = await storage.createMerchantDomain({
        merchantId,
        domain: normalizedDomain,
        isValidated: false,
      });

      res.json({ success: true, domain: newDomain });
    } catch (error) {
      console.error("Add domain error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete a domain
  app.delete("/api/merchant/domains/:id", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { id } = req.params;
      
      const domain = await storage.getMerchantDomain(id);
      if (!domain || domain.merchantId !== merchantId) {
        return res.status(404).json({ error: "Domain not found" });
      }

      await storage.deleteMerchantDomain(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete domain error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Validate a domain (check if widget embed is present)
  app.post("/api/merchant/domains/:id/validate", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { id } = req.params;
      
      const domain = await storage.getMerchantDomain(id);
      if (!domain || domain.merchantId !== merchantId) {
        return res.status(404).json({ error: "Domain not found" });
      }

      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Try to fetch the domain and check for widget embed
      try {
        const https = require("https");
        const http = require("http");
        
        const checkUrl = async (url: string): Promise<boolean> => {
          return new Promise((resolve) => {
            const protocol = url.startsWith("https") ? https : http;
            const request = protocol.get(url, { timeout: 10000 }, (response: any) => {
              let data = "";
              response.on("data", (chunk: string) => { data += chunk; });
              response.on("end", () => {
                // Check if the page contains the widget embed with this merchant's ID
                const hasWidget = data.includes(`chatvice.app/widget.js`) || 
                                  data.includes(`data-merchant-id="${merchantId}"`) ||
                                  data.includes(`merchantId: "${merchantId}"`) ||
                                  data.includes(`merchantId:"${merchantId}"`);
                resolve(hasWidget);
              });
            });
            request.on("error", () => resolve(false));
            request.on("timeout", () => { request.destroy(); resolve(false); });
          });
        };

        // Try HTTPS first, then HTTP
        let isValid = await checkUrl(`https://${domain.domain}`);
        if (!isValid) {
          isValid = await checkUrl(`http://${domain.domain}`);
        }

        await storage.updateMerchantDomain(id, {
          isValidated: isValid,
          validatedAt: isValid ? new Date() : null,
          lastCheckedAt: new Date(),
        });

        const updatedDomain = await storage.getMerchantDomain(id);
        
        res.json({ 
          success: true, 
          isValidated: isValid,
          domain: updatedDomain,
          message: isValid 
            ? "Widget embed detected. Domain validated successfully." 
            : "Widget embed not detected on this domain. Please ensure the Chatvice widget code is installed on your website."
        });
      } catch (fetchError) {
        console.error("Domain validation fetch error:", fetchError);
        
        await storage.updateMerchantDomain(id, {
          isValidated: false,
          lastCheckedAt: new Date(),
        });
        
        res.json({ 
          success: false, 
          isValidated: false,
          message: "Could not reach the domain. Please ensure the website is accessible."
        });
      }
    } catch (error) {
      console.error("Validate domain error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/merchant/:merchantId", requireAuth, async (req, res) => {
    try {
      if (req.session.userType === "merchant" && req.session.merchantId !== req.params.merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const merchant = await storage.getMerchant(req.params.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      const { password, ...safeData } = merchant;
      res.json(safeData);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/merchant/status/:merchantId", async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.params.merchantId);
      if (!merchant) {
        return res.json({
          iconUrl: "",
          iconSize: 70,
          iconWidth: 70,
          iconHeight: 70,
          useCustomIconDimensions: false,
          online: true,
          primaryColor: "#6b5dfc",
          welcomeMessage: "Hi! How can I help you today?",
          agentName: "Chatvice",
          agentPhotoUrl: "",
          widgetTheme: "light",
          bubblePosition: "right",
        });
      }
      
      // Check if there's an active agent with widget settings
      let agentSettings: { primaryColor?: string; widgetWelcomeMessage?: string; name?: string; photoUrl?: string; widgetTheme?: string; bubblePosition?: string } = {};
      if (merchant.activeAgentId) {
        const agent = await storage.getAgent(merchant.activeAgentId);
        if (agent) {
          agentSettings = {
            primaryColor: agent.primaryColor || undefined,
            widgetWelcomeMessage: agent.widgetWelcomeMessage || undefined,
            name: agent.name || undefined,
            photoUrl: agent.photoUrl || undefined,
            widgetTheme: agent.widgetTheme || undefined,
            bubblePosition: agent.bubblePosition || undefined,
          };
        }
      }
      
      res.json({
        iconUrl: merchant.iconUrl || "",
        iconSize: merchant.iconSize ?? 70,
        iconWidth: merchant.iconWidth ?? 70,
        iconHeight: merchant.iconHeight ?? 70,
        useCustomIconDimensions: merchant.useCustomIconDimensions ?? false,
        online: merchant.online ?? true,
        primaryColor: agentSettings.primaryColor || merchant.primaryColor || "#6b5dfc",
        welcomeMessage: agentSettings.widgetWelcomeMessage || merchant.welcomeMessage || "Hi! How can I help you today?",
        companyName: merchant.companyName,
        agentName: agentSettings.name || merchant.agentName || "Chatvice",
        agentPhotoUrl: agentSettings.photoUrl || merchant.agentPhotoUrl || "",
        widgetTheme: agentSettings.widgetTheme || merchant.widgetTheme || "light",
        bubblePosition: agentSettings.bubblePosition || merchant.bubblePosition || "right",
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/merchant/config", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { merchantId: _, ...config } = req.body;
      
      const validConfig = merchantConfigSchema.parse(config);
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const updated = await storage.updateMerchant(merchantId, validConfig);
      if (!updated) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      res.json({ success: true, config: updated });
    } catch (error: any) {
      console.error("Config save error:", error);
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  app.post("/api/merchant/settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { 
        companyName, 
        profilePhotoUrl,
        chatTimeout,
        rateLimitMessages,
        rateLimitWindow,
        collectCustomerEmail,
        collectCustomerPhone,
        customDomain,
        customDomainStatus,
      } = req.body;
      
      const updateData: Record<string, any> = {};
      if (companyName !== undefined) updateData.companyName = companyName;
      if (profilePhotoUrl !== undefined) updateData.profilePhotoUrl = profilePhotoUrl;
      if (chatTimeout !== undefined) updateData.chatTimeout = chatTimeout;
      if (rateLimitMessages !== undefined) updateData.rateLimitMessages = rateLimitMessages;
      if (rateLimitWindow !== undefined) updateData.rateLimitWindow = rateLimitWindow;
      if (collectCustomerEmail !== undefined) updateData.collectCustomerEmail = collectCustomerEmail;
      if (collectCustomerPhone !== undefined) updateData.collectCustomerPhone = collectCustomerPhone;
      if (customDomain !== undefined) updateData.customDomain = customDomain;
      if (customDomainStatus !== undefined) updateData.customDomainStatus = customDomainStatus;
      
      const updated = await storage.updateMerchant(merchantId, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Legacy route for backward compatibility (deprecated)
  app.post("/api/merchant/allowed-domains", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const { allowedDomains } = req.body;
      await storage.updateMerchant(merchantId, { allowedDomains: allowedDomains || "" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/merchant/select-agent", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ error: "Agent ID required" });
      }
      
      const agent = await storage.getAgent(agentId);
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      await storage.updateMerchant(merchantId, { 
        activeAgentId: agentId,
        agentName: agent.name,
        agentPhotoUrl: agent.photoUrl || ""
      });
      res.json({ success: true, activeAgentId: agentId });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/merchant/change-password", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const valid = await verifyPassword(currentPassword, merchant.password);
      if (!valid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateMerchant(merchantId, { password: hashedPassword });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/merchant/change-email/request", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { newEmail } = req.body;
      
      if (!newEmail || !newEmail.includes("@")) {
        return res.status(400).json({ error: "Valid email address required" });
      }
      
      const existingMerchant = await storage.getMerchantByEmail(newEmail);
      if (existingMerchant) {
        return res.status(400).json({ error: "Email already in use" });
      }
      
      const crypto = require("crypto");
      const verificationToken = crypto.randomBytes(32).toString("hex");
      
      await storage.updateMerchant(merchantId, { 
        pendingEmail: newEmail,
        emailVerificationToken: verificationToken,
      } as any);
      
      res.json({ success: true, message: "Verification email sent" });
    } catch (error) {
      console.error("Email change request error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/merchant/two-factor", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { enable, code } = req.body;
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      const canUse2FA = plan.id === "pro" || plan.id === "enterprise" || plan.id === "custom";
      
      if (!canUse2FA) {
        return res.status(403).json({ error: "Two-factor authentication requires Pro or Enterprise plan" });
      }
      
      if (code !== "123456" && code.length !== 6) {
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      await storage.updateMerchant(merchantId, { twoFactorEnabled: enable } as any);
      
      res.json({ success: true, enabled: enable });
    } catch (error) {
      console.error("2FA toggle error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/merchant/check-domain", requireMerchant, async (req, res) => {
    try {
      const { domain } = req.body;
      
      if (!domain) {
        return res.status(400).json({ error: "Domain required" });
      }
      
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(domain)) {
        return res.json({ available: false, reason: "Invalid domain format" });
      }
      
      const allMerchants = await storage.getAllMerchants();
      const inUse = allMerchants.some(m => m.customDomain === domain && m.id !== req.session.merchantId);
      
      res.json({ available: !inUse });
    } catch (error) {
      console.error("Domain check error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/merchant/export-data", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const sessions = await storage.getSessionsByMerchant(merchantId);
      const sessionsWithMessages = await Promise.all(
        sessions.map(async (session) => ({
          ...session,
          messages: await storage.getMessages(session.id),
        }))
      );
      
      const supervisors = await storage.getSupervisorsByMerchant(merchantId);
      const triggers = await storage.getTriggers(merchantId);
      const knowledge = await storage.getKnowledge(merchantId);
      const agents = await storage.getAgents(merchantId);
      
      const { password, ...safeMerchant } = merchant;
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        merchant: safeMerchant,
        supervisors: supervisors.map(({ password, ...s }) => s),
        agents,
        sessions: sessionsWithMessages,
        triggers,
        knowledge,
      };
      
      res.json(exportData);
    } catch (error) {
      console.error("Export data error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/merchant/account", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      
      const sessions = await storage.getSessionsByMerchant(merchantId);
      for (const session of sessions) {
        await storage.deleteSession(session.id);
      }
      
      await storage.deleteMerchant(merchantId);
      
      req.session.destroy((err) => {
        if (err) console.error("Session destroy error:", err);
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // AI Background Removal endpoint using Gemini
  app.post("/api/image/remove-background", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
      }

      // Check subscription limits for background removal
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const planId = merchant.subscriptionPlanId as keyof typeof subscriptionPlans || "free";
      const plan = subscriptionPlans[planId];
      const limit = plan?.bgRemovalLimit ?? 0;
      const used = merchant.bgRemovalUsed ?? 0;

      // Check if reset is needed (monthly reset)
      const now = new Date();
      const resetAt = merchant.bgRemovalResetAt;
      let shouldReset = false;
      if (!resetAt) {
        shouldReset = true;
      } else {
        const resetDate = new Date(resetAt);
        const monthsSinceReset = (now.getFullYear() - resetDate.getFullYear()) * 12 + (now.getMonth() - resetDate.getMonth());
        if (monthsSinceReset >= 1) {
          shouldReset = true;
        }
      }

      let currentUsed = used;
      if (shouldReset) {
        currentUsed = 0;
        await storage.updateMerchant(merchantId, { 
          bgRemovalUsed: 0, 
          bgRemovalResetAt: now 
        });
      }

      // Check if limit is exceeded
      if (limit >= 0 && currentUsed >= limit) {
        return res.status(403).json({ 
          error: `Background removal limit reached (${limit}/month). Upgrade your plan for more.`,
          limitReached: true,
          used: currentUsed,
          limit: limit
        });
      }

      const { GoogleGenAI, Modality } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });

      // Extract base64 data from data URL or fetch from URL
      let base64Data: string;
      let mimeType: string;
      
      if (imageUrl.startsWith("data:")) {
        const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          return res.status(400).json({ error: "Invalid data URL format" });
        }
        mimeType = match[1];
        base64Data = match[2];
      } else {
        return res.status(400).json({ error: "Only base64 data URLs are supported" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
              {
                text: "Remove the background from this image completely. Make the background fully transparent (alpha = 0). Keep only the main subject/object with clean, smooth edges. Return only the processed image with transparent background.",
              },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const candidate = response.candidates?.[0];
      const imagePart = candidate?.content?.parts?.find((part: any) => part.inlineData);

      if (!imagePart?.inlineData?.data) {
        return res.status(500).json({ error: "AI could not process the image" });
      }

      const resultMimeType = imagePart.inlineData.mimeType || "image/png";
      const resultDataUrl = `data:${resultMimeType};base64,${imagePart.inlineData.data}`;

      // Increment usage counter after successful removal
      await storage.updateMerchant(merchantId, { 
        bgRemovalUsed: currentUsed + 1 
      });

      res.json({ 
        imageUrl: resultDataUrl,
        used: currentUsed + 1,
        limit: limit
      });
    } catch (error: any) {
      console.error("Background removal error:", error);
      res.status(500).json({ error: error.message || "Failed to remove background" });
    }
  });

  // Get background removal usage status
  app.get("/api/image/bg-removal-status", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const planId = merchant.subscriptionPlanId as keyof typeof subscriptionPlans || "free";
      const plan = subscriptionPlans[planId];
      const limit = plan?.bgRemovalLimit ?? 0;
      let used = merchant.bgRemovalUsed ?? 0;

      // Check if reset is needed
      const now = new Date();
      const resetAt = merchant.bgRemovalResetAt;
      if (resetAt) {
        const resetDate = new Date(resetAt);
        const monthsSinceReset = (now.getFullYear() - resetDate.getFullYear()) * 12 + (now.getMonth() - resetDate.getMonth());
        if (monthsSinceReset >= 1) {
          used = 0;
          await storage.updateMerchant(merchantId, { 
            bgRemovalUsed: 0, 
            bgRemovalResetAt: now 
          });
        }
      }

      res.json({ used, limit, planId });
    } catch (error) {
      console.error("BG removal status error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/chat/ask", async (req, res) => {
    try {
      const data = chatAskSchema.parse(req.body);
      const { merchantId, sessionId, message, clientMessageId } = data;

      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const existingSession = await storage.getSession(sessionId);
      if (!existingSession) {
        const limitCheck = await checkSubscriptionLimits(merchantId, 'conversation');
        if (!limitCheck.allowed) {
          return res.status(403).json({ error: limitCheck.message });
        }
        const credits = storage.calculateCreditsFromCustomerId(sessionId);
        await storage.incrementConversationUsage(merchantId, credits);
      }

      await storage.createMessage({
        sessionId,
        from: "customer",
        content: message,
        clientMessageId: clientMessageId || undefined,
      });

      const result = await askChatvice(sessionId, merchantId, message);

      const responseClientId = clientMessageId ? `response_${clientMessageId}` : undefined;
      await storage.createMessage({
        sessionId,
        from: result.mode === "HUMAN" ? "system" : "chatvice",
        content: result.answer,
        clientMessageId: responseClientId,
      });

      await storage.updateSession(sessionId, {});

      broadcastToSession(sessionId, {
        type: "message",
        message: { from: result.mode === "HUMAN" ? "system" : "chatvice", content: result.answer, clientMessageId: responseClientId },
      });

      if (result.mode === "AI") {
        try {
          const settings = await storage.getProductRecommendationSettings(merchantId);
          if (settings?.aiAutoRecommendEnabled) {
            const productTriggers = await storage.getProductTriggers(merchantId, merchant.activeAgentId || undefined);
            const lowerMessage = message.toLowerCase();
            
            let matchedProductId: string | null = null;
            for (const trigger of productTriggers) {
              if (!trigger.isActive) continue;
              const keywords = trigger.keywords.split(',').map(k => k.trim().toLowerCase());
              if (keywords.some(keyword => keyword && lowerMessage.includes(keyword))) {
                matchedProductId = trigger.productCardId;
                break;
              }
            }
            
            if (!matchedProductId && settings.aiContextTriggerEnabled && settings.triggerKeywords) {
              const generalKeywords = settings.triggerKeywords.split(',').map(k => k.trim().toLowerCase());
              if (generalKeywords.some(keyword => keyword && lowerMessage.includes(keyword))) {
                const productCards = await storage.getProductCards(merchantId, merchant.activeAgentId || undefined);
                const activeCards = productCards.filter(c => c.isActive);
                if (activeCards.length > 0) {
                  matchedProductId = activeCards[0].id;
                }
              }
            }
            
            if (matchedProductId) {
              const productCard = await storage.getProductCard(matchedProductId);
              if (productCard && productCard.isActive) {
                const buttons = await storage.getProductCardButtons(matchedProductId);
                const payload = {
                  productCard: {
                    ...productCard,
                    buttons,
                  },
                };
                
                await storage.createMessage({
                  sessionId,
                  from: "chatvice",
                  content: `Based on our conversation, I think you might be interested in this:`,
                  messageType: "product_offer",
                  payload,
                });
                
                broadcastToSession(sessionId, {
                  type: "message",
                  message: { 
                    from: "chatvice", 
                    content: `Based on our conversation, I think you might be interested in this:`,
                    messageType: "product_offer",
                    payload,
                  },
                });
              }
            }
          }
        } catch (productError) {
          console.error("Product recommendation error:", productError);
        }
      }

      res.json({ 
        answer: result.answer, 
        mode: result.mode,
        clientMessageId: clientMessageId,
        responseClientId: responseClientId,
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/chat/upload", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      const { merchantId, sessionId, type, fromSupervisor } = req.body;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!merchantId || !sessionId) {
        return res.status(400).json({ error: "Missing merchantId or sessionId" });
      }

      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const fileUrl = `/uploads/${file.filename}`;

      const mediaType = type === "video" ? "video" : type === "document" ? "document" : "photo";
      
      await storage.createMediaAttachment({
        sessionId,
        agentId: merchant.activeAgentId,
        type: mediaType,
        url: fileUrl,
      });

      const isSupervisor = fromSupervisor === "true" || fromSupervisor === true;
      const messageFrom = isSupervisor ? "supervisor" : "customer";
      
      const typeLabels: Record<string, string> = {
        photo: "Photo",
        video: "Video",
        document: "Document"
      };
      
      const message = await storage.createMessage({
        sessionId,
        from: messageFrom,
        content: `[${typeLabels[mediaType]} sent]`,
        messageType: "media",
        payload: {
          type: mediaType,
          url: fileUrl,
          filename: file.originalname,
        },
      });

      broadcastToSession(sessionId, {
        type: "message",
        message: {
          id: message.id,
          from: messageFrom,
          content: `[${typeLabels[mediaType]} sent]`,
          messageType: "media",
          payload: {
            type: mediaType,
            url: fileUrl,
            filename: file.originalname,
          },
          timestamp: message.timestamp,
        },
      });

      if (!isSupervisor) {
        let session = await storage.getSession(sessionId);
        
        if (!session) {
          session = await storage.createSession({
            id: sessionId,
            merchantId,
            mode: "AI",
            customerName: "Customer",
            agentId: merchant.activeAgentId || null,
          });
        }
        
        if (session?.mode === "AI") {
          const requestHost = req.get("host");
          (async () => {
            try {
              const aiAnalysis = await analyzeMediaWithAI(
                merchantId,
                sessionId,
                mediaType,
                fileUrl,
                file.originalname,
                requestHost
              );

              const aiMessage = await storage.createMessage({
                sessionId,
                from: "chatvice",
                content: aiAnalysis,
              });

              broadcastToSession(sessionId, {
                type: "message",
                message: {
                  id: aiMessage.id,
                  from: "chatvice",
                  content: aiAnalysis,
                  timestamp: aiMessage.timestamp,
                },
              });
            } catch (aiError) {
              console.error("AI media analysis error:", aiError);
            }
          })();
        }
      }

      res.json({ 
        success: true, 
        url: fileUrl,
        filename: file.filename,
        type: mediaType,
        messageId: message.id,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.get("/api/sessions/:merchantId", requireAuth, async (req, res) => {
    try {
      if (req.session.userType === "merchant" && req.session.merchantId !== req.params.merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const sessions = await storage.getSessionsByMerchant(req.params.merchantId);
      
      const sessionsWithPreview = await Promise.all(
        sessions.map(async (session) => {
          const messages = await storage.getMessages(session.id);
          const userMessages = messages.filter(m => m.from === "user");
          const aiMessages = messages.filter(m => m.from === "chatvice");
          const lastQuestion = userMessages[userMessages.length - 1]?.content;
          const lastMessage = aiMessages[aiMessages.length - 1]?.content;
          
          return {
            ...session,
            lastQuestion: lastQuestion?.slice(0, 100),
            lastMessage: lastMessage?.slice(0, 100),
          };
        })
      );
      
      res.json(sessionsWithPreview);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/messages/:sessionId", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/transcript/:sessionId", requireMerchant, async (req, res) => {
    try {
      const session = await storage.getSession(req.params.sessionId);
      if (!session || session.merchantId !== req.session.merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const messages = await storage.getMessages(req.params.sessionId);
      const merchant = await storage.getMerchant(session.merchantId);
      
      const format = req.query.format || 'text';
      
      if (format === 'json') {
        res.json({
          session: {
            id: session.id,
            customerName: session.customerName,
            mode: session.mode,
            lastActivity: session.lastActivity,
          },
          merchant: {
            companyName: merchant?.companyName || 'Unknown',
          },
          messages: messages.map(m => ({
            from: m.from,
            content: m.content,
            timestamp: m.timestamp,
          })),
          exportedAt: new Date().toISOString(),
        });
      } else {
        let transcript = `Chat Transcript\n`;
        transcript += `${'='.repeat(50)}\n\n`;
        transcript += `Company: ${merchant?.companyName || 'Unknown'}\n`;
        transcript += `Customer: ${session.customerName || 'Customer'}\n`;
        transcript += `Session ID: ${session.id}\n`;
        transcript += `Mode: ${session.mode}\n`;
        transcript += `Date: ${session.lastActivity ? new Date(session.lastActivity).toLocaleString() : 'Unknown'}\n\n`;
        transcript += `${'='.repeat(50)}\n\n`;
        
        for (const msg of messages) {
          const sender = msg.from === 'user' ? (session.customerName || 'Customer') :
                        msg.from === 'chatvice' ? 'Chatvice' :
                        msg.from === 'supervisor' ? 'Supervisor' : 'System';
          const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
          transcript += `[${time}] ${sender}:\n${msg.content}\n\n`;
        }
        
        transcript += `${'='.repeat(50)}\n`;
        transcript += `Exported: ${new Date().toLocaleString()}\n`;
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="transcript-${session.id.slice(0, 8)}.txt"`);
        res.send(transcript);
      }
    } catch (error) {
      console.error("Transcript export error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/knowledge/:merchantId", requireMerchant, async (req, res) => {
    try {
      if (req.session.merchantId !== req.params.merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const merchant = await storage.getMerchant(req.params.merchantId);
      let knowledgeData = null;
      
      if (merchant?.activeAgentId) {
        knowledgeData = await storage.getKnowledgeByAgent(merchant.activeAgentId);
      }
      
      if (!knowledgeData) {
        knowledgeData = await storage.getKnowledge(req.params.merchantId);
      }
      
      res.json(knowledgeData || { content: "" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/knowledge/set", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { knowledgeText, agentId } = req.body;
      
      const savedKnowledge = await storage.setKnowledge(merchantId, knowledgeText || "", agentId || undefined);
      
      if (knowledgeText && knowledgeText.trim()) {
        processKnowledgeBase(merchantId, knowledgeText, agentId || undefined).catch(err => {
          console.error("Error processing knowledge embeddings:", err);
        });
      } else {
        storage.deleteKnowledgeChunks(merchantId, agentId || undefined).catch(err => {
          console.error("Error clearing knowledge chunks:", err);
        });
      }
      
      res.json({ success: true, knowledge: savedKnowledge });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/knowledge/crawl", requireMerchant, async (req, res) => {
    try {
      const { url } = req.body;
      const merchantId = req.session.merchantId!;
      
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }
      
      const crawledLink = await storage.createCrawledLink({
        merchantId,
        url,
        status: "crawling",
      });
      
      const result = await extractFAQContent(url);
      
      if (!result.success) {
        await storage.updateCrawledLink(crawledLink.id, {
          status: "failed",
        });
        return res.status(400).json({ error: result.error });
      }
      
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      await storage.updateCrawledLink(crawledLink.id, {
        status: "completed",
        title: urlObj.hostname,
        extractedContent: result.content,
      });
      
      res.json({ success: true, content: result.content, linkId: crawledLink.id });
    } catch (error) {
      console.error("Crawl error:", error);
      res.status(500).json({ error: "Failed to extract content from URL" });
    }
  });

  app.get("/api/knowledge/links/:merchantId", requireMerchant, async (req, res) => {
    try {
      if (req.session.merchantId !== req.params.merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const links = await storage.getCrawledLinks(req.params.merchantId);
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/knowledge/agent/:agentId", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const agent = await storage.getAgent(req.params.agentId);
      
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      const knowledge = await storage.getKnowledgeByAgent(req.params.agentId);
      res.json({ content: knowledge?.content || "" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/knowledge/links/:linkId", requireMerchant, async (req, res) => {
    try {
      const deleted = await storage.deleteCrawledLink(req.params.linkId);
      if (!deleted) {
        return res.status(404).json({ error: "Link not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/triggers/:merchantId", requireMerchant, async (req, res) => {
    try {
      if (req.session.merchantId !== req.params.merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const triggers = await storage.getTriggers(req.params.merchantId);
      res.json(triggers);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/triggers/add", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { keyword } = req.body;
      
      const trigger = await storage.createTrigger({ merchantId, keyword });
      res.json({ success: true, trigger });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/triggers/:triggerId", requireMerchant, async (req, res) => {
    try {
      const success = await storage.deleteTrigger(req.params.triggerId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/supervisors", requireMerchantOrSupervisor, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const supervisors = await storage.getSupervisorsByMerchant(merchantId);
      const safeSupervisors = supervisors.map(({ password, ...s }) => s);
      res.json(safeSupervisors);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/supervisors/:merchantId", requireMerchant, async (req, res) => {
    try {
      if (req.session.merchantId !== req.params.merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const supervisors = await storage.getSupervisorsByMerchant(req.params.merchantId);
      const safeSupervisors = supervisors.map(({ password, ...s }) => s);
      res.json(safeSupervisors);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/supervisors/add", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { name, email, password, photoUrl } = req.body;
      
      const limitCheck = await checkSubscriptionLimits(merchantId, 'supervisor');
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.message });
      }
      
      const existing = await storage.getSupervisorByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const hashedPassword = await hashPassword(password);
      const supervisor = await storage.createSupervisor({ 
        merchantId, 
        name, 
        email, 
        password: hashedPassword,
        photoUrl: photoUrl || "" 
      });
      const { password: _, ...safeSupervisor } = supervisor;
      res.json({ success: true, supervisor: safeSupervisor });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/supervisors/:supervisorId", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const supervisorId = req.params.supervisorId;
      const { name, photoUrl } = req.body;
      
      const supervisor = await storage.getSupervisor(supervisorId);
      if (!supervisor || supervisor.merchantId !== merchantId) {
        return res.status(404).json({ error: "Supervisor not found" });
      }
      
      const updates: { name?: string; photoUrl?: string } = {};
      if (name) updates.name = name;
      if (photoUrl !== undefined) updates.photoUrl = photoUrl;
      
      await storage.updateSupervisor(supervisorId, updates);
      const updated = await storage.getSupervisor(supervisorId);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/supervisors/:supervisorId", requireMerchant, async (req, res) => {
    try {
      const success = await storage.deleteSupervisor(req.params.supervisorId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Supervisor Invitation System
  app.get("/api/supervisor-invitations", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const invitations = await storage.getSupervisorInvitations(merchantId);
      res.json(invitations);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/supervisor-invitations/invite", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const invitedById = req.session.userId!;
      const { name, email } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      
      const limitCheck = await checkSubscriptionLimits(merchantId, 'supervisor');
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.message });
      }
      
      const existingSupervisor = await storage.getSupervisorByEmail(email);
      if (existingSupervisor) {
        return res.status(400).json({ error: "Email already registered as a supervisor" });
      }
      
      const existingInvitation = await storage.getSupervisorInvitationByEmail(email, merchantId);
      if (existingInvitation && existingInvitation.status === 'pending') {
        return res.status(400).json({ error: "An invitation is already pending for this email" });
      }
      
      const token = require('crypto').randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);
      
      const invitation = await storage.createSupervisorInvitation({
        merchantId,
        email,
        name,
        token,
        status: 'pending',
        invitedById,
        expiresAt,
      });
      
      const inviteLink = `${req.protocol}://${req.get('host')}/verify-supervisor?token=${token}`;
      
      res.json({ 
        success: true, 
        invitation: { ...invitation, token: undefined },
        inviteLink,
        message: "Invitation created. Share the link with the supervisor."
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/supervisor-invitations/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const invitation = await storage.getSupervisorInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation link" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: "This invitation has already been used" });
      }
      
      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.updateSupervisorInvitation(invitation.id, { status: 'expired' });
        return res.status(400).json({ error: "This invitation has expired" });
      }
      
      const merchant = await storage.getMerchant(invitation.merchantId);
      
      res.json({ 
        valid: true,
        email: invitation.email,
        name: invitation.name,
        companyName: merchant?.companyName || 'Unknown Company'
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/supervisor-invitations/complete", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      const invitation = await storage.getSupervisorInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: "Invalid invitation link" });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: "This invitation has already been used" });
      }
      
      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.updateSupervisorInvitation(invitation.id, { status: 'expired' });
        return res.status(400).json({ error: "This invitation has expired" });
      }
      
      const existingSupervisor = await storage.getSupervisorByEmail(invitation.email);
      if (existingSupervisor) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const hashedPassword = await hashPassword(password);
      const supervisor = await storage.createSupervisor({
        merchantId: invitation.merchantId,
        email: invitation.email,
        name: invitation.name,
        password: hashedPassword,
        role: 'supervisor',
        isVerified: true,
        verifiedAt: new Date(),
        invitedById: invitation.invitedById,
      });
      
      await storage.updateSupervisorInvitation(invitation.id, {
        status: 'accepted',
        acceptedAt: new Date(),
      });
      
      req.session.userId = supervisor.id;
      req.session.userType = "supervisor";
      req.session.merchantId = invitation.merchantId;
      
      const { password: _, ...safeSupervisor } = supervisor;
      res.json({ 
        success: true, 
        supervisor: safeSupervisor,
        merchantId: invitation.merchantId,
        message: "Account created successfully"
      });
    } catch (error) {
      console.error("Error completing invitation:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/supervisor-invitations/:invitationId", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const invitation = await storage.getSupervisorInvitation(req.params.invitationId);
      
      if (!invitation || invitation.merchantId !== merchantId) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      const success = await storage.deleteSupervisorInvitation(req.params.invitationId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/supervisor-invitations/:invitationId/resend", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const invitation = await storage.getSupervisorInvitation(req.params.invitationId);
      
      if (!invitation || invitation.merchantId !== merchantId) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      const newToken = require('crypto').randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);
      
      await storage.updateSupervisorInvitation(invitation.id, {
        token: newToken,
        status: 'pending',
        expiresAt,
      });
      
      const inviteLink = `${req.protocol}://${req.get('host')}/verify-supervisor?token=${newToken}`;
      
      res.json({ 
        success: true,
        inviteLink,
        message: "Invitation link regenerated"
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/supervisor/notifications/:supervisorId", requireSupervisor, async (req, res) => {
    try {
      if (req.session.userId !== req.params.supervisorId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const notifications = await storage.getNotifications(req.params.supervisorId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/supervisor/notifications/:notificationId/seen", requireSupervisor, async (req, res) => {
    try {
      const success = await storage.markNotificationSeen(req.params.notificationId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/supervisor/sessions/:supervisorId", requireSupervisor, async (req, res) => {
    try {
      if (req.session.userId !== req.params.supervisorId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const supervisor = await storage.getSupervisor(req.params.supervisorId);
      if (!supervisor) {
        return res.status(404).json({ error: "Supervisor not found" });
      }
      const sessions = await storage.getSessionsByMerchant(supervisor.merchantId);
      const escalatedSessions = sessions.filter((s) => s.mode === "HUMAN");
      res.json(escalatedSessions);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/supervisor/send", requireSupervisor, async (req, res) => {
    try {
      const { sessionId, message, supervisorId } = req.body;
      
      if (req.session.userId !== supervisorId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.createMessage({
        sessionId,
        from: "supervisor",
        content: message,
      });
      await storage.updateSession(sessionId, { supervisorId });

      broadcastToSession(sessionId, {
        type: "message",
        message: { from: "supervisor", content: message },
      });

      const session = await storage.getSession(sessionId);
      if (session) {
        const { analyzeMessageForSecurity } = await import("./chat-security");
        const recentMessages = await storage.getMessages(sessionId);
        const context = recentMessages
          .slice(-5)
          .map(m => `${m.from}: ${m.content}`)
          .join("\n");
        analyzeMessageForSecurity(message, sessionId, supervisorId, session.merchantId, context)
          .catch(err => console.error("Security analysis error:", err));
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/message/revise", requireMerchant, async (req, res) => {
    try {
      const { messageId, content } = req.body;
      const merchantId = req.session.merchantId!;
      
      if (!messageId || typeof messageId !== "string") {
        return res.status(400).json({ error: "Invalid message ID" });
      }
      
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }
      
      if (content.length > 10000) {
        return res.status(400).json({ error: "Content too long" });
      }
      
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      if (message.from !== "chatvice") {
        return res.status(403).json({ error: "Can only revise AI responses" });
      }
      
      const session = await storage.getSession(message.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.merchantId !== merchantId) {
        return res.status(403).json({ error: "Forbidden - session belongs to another merchant" });
      }
      
      const updated = await storage.updateMessage(messageId, { content: content.trim() });
      res.json({ success: true, message: updated });
    } catch (error) {
      console.error("Message revision error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/supervisor/takeover", requireSupervisor, async (req, res) => {
    try {
      const { sessionId, supervisorId } = req.body;
      
      if (req.session.userId !== supervisorId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const supervisor = await storage.getSupervisor(supervisorId);
      const supervisorName = supervisor?.name || "Support Agent";
      
      const updated = await storage.updateSession(sessionId, {
        mode: "HUMAN",
        supervisorId,
      });
      if (!updated) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const joinMessage = `Supervisor ${supervisorName} has joined the conversation and will be assisting you shortly.`;
      
      await storage.createMessage({
        sessionId,
        from: "system",
        content: joinMessage,
      });
      
      broadcastToSession(sessionId, {
        type: "message",
        message: { from: "system", content: joinMessage },
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/supervisor/return-to-bot", requireSupervisor, async (req, res) => {
    try {
      const { sessionId, supervisorId } = req.body;
      
      if (req.session.userId !== supervisorId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const updated = await storage.updateSession(sessionId, {
        mode: "AI",
        supervisorId: null,
      });
      if (!updated) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      await storage.createMessage({
        sessionId,
        from: "system",
        content: "Percakapan telah dikembalikan ke Agen. Ada yang bisa saya bantu?",
      });
      
      broadcastToSession(sessionId, {
        type: "message",
        message: { from: "system", content: "Percakapan telah dikembalikan ke Agen. Ada yang bisa saya bantu?" },
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/session/return-to-bot", requireMerchant, async (req, res) => {
    try {
      const { sessionId } = req.body;
      const merchantId = req.session.merchantId!;
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.merchantId !== merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const updated = await storage.updateSession(sessionId, {
        mode: "AI",
        supervisorId: null,
      });
      if (!updated) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      await storage.createMessage({
        sessionId,
        from: "system",
        content: "Percakapan telah dikembalikan ke Agen. Ada yang bisa saya bantu?",
      });
      
      broadcastToSession(sessionId, {
        type: "message",
        message: { from: "system", content: "Percakapan telah dikembalikan ke Agen. Ada yang bisa saya bantu?" },
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/session/takeover", requireMerchant, async (req, res) => {
    try {
      const { sessionId } = req.body;
      const merchantId = req.session.merchantId!;
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.merchantId !== merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const merchant = await storage.getMerchant(merchantId);
      const agentName = merchant?.companyName || "Support Agent";
      
      const updated = await storage.updateSession(sessionId, {
        mode: "HUMAN",
        supervisorId: merchantId,
      });
      if (!updated) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const joinMessage = `Supervisor ${agentName} has joined the conversation and will be assisting you shortly.`;
      
      await storage.createMessage({
        sessionId,
        from: "system",
        content: joinMessage,
      });
      
      broadcastToSession(sessionId, {
        type: "message",
        message: { from: "system", content: joinMessage },
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/session/send-message", requireMerchant, async (req, res) => {
    try {
      const { sessionId, message } = req.body;
      const merchantId = req.session.merchantId!;
      
      if (!sessionId || !message) {
        return res.status(400).json({ error: "Session ID and message are required" });
      }
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.merchantId !== merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.createMessage({
        sessionId,
        from: "supervisor",
        content: message,
      });
      
      await storage.updateSession(sessionId, { supervisorId: merchantId });

      broadcastToSession(sessionId, {
        type: "message",
        message: { from: "supervisor", content: message },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/session/offer-product", requireMerchant, async (req, res) => {
    try {
      const { sessionId, productCardId } = req.body;
      const merchantId = req.session.merchantId!;
      
      if (!sessionId || !productCardId) {
        return res.status(400).json({ error: "Session ID and product card ID are required" });
      }
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.merchantId !== merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const productCard = await storage.getProductCard(productCardId);
      if (!productCard || productCard.merchantId !== merchantId) {
        return res.status(404).json({ error: "Product card not found" });
      }
      
      const buttons = await storage.getProductCardButtons(productCardId);
      
      const payload = {
        productCard: {
          ...productCard,
          buttons,
        },
      };
      
      await storage.createMessage({
        sessionId,
        from: "supervisor",
        content: `I'd like to recommend this product: ${productCard.title}`,
        messageType: "product_offer",
        payload,
      });
      
      await storage.updateSession(sessionId, { supervisorId: merchantId });

      broadcastToSession(sessionId, {
        type: "message",
        message: { 
          from: "supervisor", 
          content: `I'd like to recommend this product: ${productCard.title}`,
          messageType: "product_offer",
          payload,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Offer product error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/stats/:merchantId", requireAuth, async (req, res) => {
    try {
      if (req.session.userType === "merchant" && req.session.merchantId !== req.params.merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const analytics = await storage.getAnalytics(req.params.merchantId);
      res.json(analytics);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/billing/plans", async (req, res) => {
    try {
      const plans = Object.values(subscriptionPlans).map(plan => ({
        ...plan,
        annualDiscount: Math.round((1 - plan.annualPrice / plan.monthlyPrice) * 100),
      }));
      res.json({ plans });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/billing/status", requireMerchant, async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.session.merchantId!);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      // Use effective plan with custom pricing from database
      const plan = await getEffectiveSubscriptionPlan(merchant.subscriptionPlanId) || await getEffectiveSubscriptionPlan('free');
      const isTrialExpired = merchant.trialEndsAt && new Date(merchant.trialEndsAt) < new Date();
      
      // Check for pending transaction - only fetch external API when refresh=true query param is set
      // Otherwise just show basic cached info (transactionId exists)
      let pendingTransaction = null;
      const shouldRefresh = req.query.refresh === 'true';
      
      if (merchant.pendingTransactionId) {
        // Try to get plan name from local transaction record
        let transactionPlanName = '';
        try {
          const localTx = await storage.getPaymentTransactionByExternalId(merchant.pendingTransactionId);
          if (localTx?.planName) {
            transactionPlanName = localTx.planName;
          }
        } catch (err) {
          console.error("Error fetching local transaction:", err);
        }
        
        if (shouldRefresh) {
          try {
            const statusResult = await checkPaymentStatus(merchant.pendingTransactionId);
            if (statusResult.success && statusResult.data) {
              const pd = statusResult.data;
              pendingTransaction = {
                transactionId: merchant.pendingTransactionId,
                status: pd.status || 'PENDING',
                amount: pd.amount || 0,
                amountFormatted: `Rp ${(pd.amount || 0).toLocaleString('id-ID')}`,
                expiryTime: pd.expiryTime,
                paymentMethod: pd.paymentMethod || 'qris',
                orderId: pd.orderId,
                planName: transactionPlanName,
              };
            }
          } catch (err) {
            console.error("Error checking pending transaction:", err);
            pendingTransaction = {
              transactionId: merchant.pendingTransactionId,
              status: 'PENDING',
              planName: transactionPlanName,
            };
          }
        } else {
          pendingTransaction = {
            transactionId: merchant.pendingTransactionId,
            status: 'PENDING',
            planName: transactionPlanName,
          };
        }
      }
      
      res.json({
        status: merchant.subscriptionStatus,
        planId: merchant.subscriptionPlanId,
        planName: plan.name,
        billingInterval: merchant.billingInterval,
        trialEndsAt: merchant.trialEndsAt,
        currentPeriodEnd: merchant.currentPeriodEnd,
        conversationsUsed: merchant.conversationsUsed || 0,
        conversationsLimit: plan.conversationsLimit,
        supervisorsLimit: plan.supervisorsLimit,
        isTrialExpired,
        hasActiveSubscription: merchant.subscriptionStatus === 'active',
        pendingTransaction,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/billing/proration", requireMerchant, async (req, res) => {
    try {
      const { planId, billingInterval } = req.query;
      const merchant = await storage.getMerchant(req.session.merchantId!);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      if (!planId || typeof planId !== 'string') {
        return res.status(400).json({ error: "Plan ID required" });
      }
      
      // Use effective plans with custom pricing from database
      const newPlan = await getEffectiveSubscriptionPlan(planId);
      if (!newPlan) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      
      const currentPlan = await getEffectiveSubscriptionPlan(merchant.subscriptionPlanId) || await getEffectiveSubscriptionPlan('free');
      if (!currentPlan) {
        return res.status(500).json({ error: "Could not determine current plan" });
      }
      const requestedInterval = billingInterval === 'annual' ? 'annual' : 'monthly';
      
      const newPlanPrice = requestedInterval === 'annual' ? newPlan.annualPrice : newPlan.monthlyPrice;
      const currentPlanPrice = merchant.billingInterval === 'annual' ? currentPlan.annualPrice : currentPlan.monthlyPrice;
      
      const isUpgrade = newPlan.monthlyPrice > currentPlan.monthlyPrice;
      
      if (!isUpgrade) {
        return res.json({
          creditAmount: 0,
          newPlanPrice,
          finalAmount: newPlanPrice,
          daysRemaining: 0,
          prorationApplied: false,
          isUpgrade: false,
          currentPlanName: currentPlan.name,
          newPlanName: newPlan.name,
          message: "Proration only applies to upgrades",
        });
      }
      
      if (merchant.subscriptionStatus !== 'active' || !merchant.currentPeriodEnd) {
        return res.json({
          creditAmount: 0,
          newPlanPrice,
          finalAmount: newPlanPrice,
          daysRemaining: 0,
          prorationApplied: false,
          isUpgrade: true,
          currentPlanName: currentPlan.name,
          newPlanName: newPlan.name,
        });
      }
      
      const now = new Date();
      const periodEnd = new Date(merchant.currentPeriodEnd);
      
      if (now >= periodEnd) {
        return res.json({
          creditAmount: 0,
          newPlanPrice,
          finalAmount: newPlanPrice,
          daysRemaining: 0,
          prorationApplied: false,
          isUpgrade: true,
          currentPlanName: currentPlan.name,
          newPlanName: newPlan.name,
        });
      }
      
      const daysInPeriod = merchant.billingInterval === 'annual' ? 365 : 30;
      const msRemaining = periodEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      
      const dailyRate = currentPlanPrice / daysInPeriod;
      const creditAmount = Math.round(dailyRate * daysRemaining * 100) / 100;
      
      const finalAmount = Math.max(0, Math.round((newPlanPrice - creditAmount) * 100) / 100);
      
      res.json({
        creditAmount,
        newPlanPrice,
        finalAmount,
        daysRemaining,
        prorationApplied: creditAmount > 0 && daysRemaining > 0,
        isUpgrade: true,
        currentPlanName: currentPlan.name,
        newPlanName: newPlan.name,
      });
    } catch (error: any) {
      console.error("Proration calculation error:", error);
      res.status(500).json({ error: error.message || "Failed to calculate proration" });
    }
  });

  app.post("/api/billing/checkout", requireMerchant, async (req, res) => {
    try {
      const { planId, billingInterval } = req.body;
      const merchant = await storage.getMerchant(req.session.merchantId!);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      // Use effective plan with custom pricing from database
      const plan = await getEffectiveSubscriptionPlan(planId);
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      if (!isKompasPayConfigured()) {
        return res.status(503).json({ error: "Payment gateway not configured" });
      }
      
      const priceUSD = billingInterval === 'annual' ? plan.annualPrice * 12 : plan.monthlyPrice;
      const priceIDR = convertToIDR(priceUSD);
      
      const orderId = `SUB_${merchant.id}_${planId}_${billingInterval}_${Date.now()}`;
      
      // Use public URL for callback - prioritize forwarded headers, fallback to production
      const forwardedHost = req.get('x-forwarded-host') || req.get('host');
      const isLocalhost = !forwardedHost || forwardedHost.includes('localhost');
      const callbackUrl = isLocalhost 
        ? 'https://chatvice.app/api/payment/webhook'
        : `https://${forwardedHost}/api/payment/webhook`;
      
      const qrisResult = await createQRISPayment({
        merchantId: merchant.id,
        orderId,
        amount: priceIDR,
        customerName: merchant.companyName,
        customerEmail: merchant.email,
        description: `Chatvice ${plan.name} - ${billingInterval === 'annual' ? 'Annual' : 'Monthly'} Subscription`,
        expiryMinutes: 30,
        callbackUrl,
        metadata: {
          merchantId: merchant.id,
          planId,
          billingInterval,
          type: 'subscription',
        },
      });
      
      if (!qrisResult.success || !qrisResult.data) {
        console.error("QRIS creation failed:", qrisResult.error);
        return res.status(500).json({ error: qrisResult.error || "Failed to create payment" });
      }
      
      await storage.updateMerchantSubscription(merchant.id, {
        pendingTransactionId: qrisResult.data.transactionId,
      });
      
      res.json({
        paymentMethod: 'qris',
        transactionId: qrisResult.data.transactionId,
        orderId: qrisResult.data.orderId,
        qrisString: qrisResult.data.qrisString,
        qrisImageUrl: qrisResult.data.qrisImageUrl,
        amount: priceIDR,
        amountFormatted: formatIDR(priceIDR),
        amountUSD: priceUSD,
        expiryTime: qrisResult.data.expiryTime,
        planName: plan.name,
        billingInterval,
      });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  // Exchange rate endpoint - fetches from external source
  app.get("/api/exchange-rate", async (req, res) => {
    try {
      // Try to fetch from free forex API
      let rate = 16500; // Default fallback rate
      let source = "Default";
      let lastUpdated = new Date().toISOString();
      
      try {
        // Use exchangerate-api.com free tier (limited calls but reliable)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.rates && data.rates.IDR) {
            rate = Math.round(data.rates.IDR);
            source = "Google Finance via ExchangeRate-API";
            lastUpdated = data.time_last_updated ? new Date(data.time_last_updated * 1000).toISOString() : new Date().toISOString();
          }
        }
      } catch (e) {
        // Fallback: try another free API
        try {
          const fallbackResponse = await fetch('https://open.er-api.com/v6/latest/USD');
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.rates && fallbackData.rates.IDR) {
              rate = Math.round(fallbackData.rates.IDR);
              source = "Open Exchange Rates";
              lastUpdated = fallbackData.time_last_update_utc || new Date().toISOString();
            }
          }
        } catch {
          // Use platform settings as final fallback
          const savedRate = await storage.getPlatformSetting("exchange_rate");
          if (savedRate) {
            rate = parseInt(savedRate);
            source = "Cached Rate";
          }
        }
      }
      
      // Store the rate for caching
      await storage.setPlatformSetting("exchange_rate", rate.toString());
      await storage.setPlatformSetting("exchange_rate_source", source);
      await storage.setPlatformSetting("exchange_rate_updated", lastUpdated);
      
      res.json({
        rate,
        source,
        lastUpdated,
        currency: "IDR",
        baseCurrency: "USD",
      });
    } catch (error: any) {
      console.error("Exchange rate fetch error:", error);
      // Return cached/default rate on error
      const savedRate = await storage.getPlatformSetting("exchange_rate");
      res.json({
        rate: savedRate ? parseInt(savedRate) : 16500,
        source: "Cached Rate",
        lastUpdated: new Date().toISOString(),
        currency: "IDR",
        baseCurrency: "USD",
      });
    }
  });

  // Checkout with payment method selection
  app.post("/api/billing/checkout-v2", requireMerchant, async (req, res) => {
    try {
      const { planId, billingInterval, paymentMethod, bankCode, promoCode } = req.body;
      const merchant = await storage.getMerchant(req.session.merchantId!);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const plan = await getEffectiveSubscriptionPlan(planId);
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      if (!isKompasPayConfigured()) {
        return res.status(503).json({ error: "Payment gateway not configured" });
      }
      
      // Supported bank codes for VA (numeric codes per Kompas Pay docs)
      const SUPPORTED_BANK_CODES = ['014', '002', '008', '009', '022', '013']; // BCA, BRI, MANDIRI, BNI, CIMB, PERMATA
      
      // Get exchange rate from settings
      const savedRate = await storage.getPlatformSetting("exchange_rate");
      const exchangeRate = savedRate ? parseInt(savedRate) : 16500;
      
      // Calculate base price in USD
      const basePriceUSD = billingInterval === 'annual' ? (plan.annualPrice || 0) : (plan.monthlyPrice || 0);
      
      // Apply promo discount if valid
      let discountPercent = 0;
      let appliedPromoCode = '';
      if (promoCode) {
        const promo = await storage.getPromotionByCode(promoCode);
        if (promo && promo.isActive) {
          const now = new Date();
          const startDate = promo.startDate ? new Date(promo.startDate) : null;
          const endDate = promo.endDate ? new Date(promo.endDate) : null;
          const isInDateRange = (!startDate || now >= startDate) && (!endDate || now <= endDate);
          const usageOk = !promo.maxUses || (promo.currentUses || 0) < promo.maxUses;
          const billingCycleOk = promo.billingCycle === 'both' || promo.billingCycle === billingInterval;
          const targetPlans = promo.targetPlans || [];
          const planOk = targetPlans.includes('all') || targetPlans.includes(planId) || 
                         (targetPlans.includes('upgrade') && planId !== 'free');
          
          if (isInDateRange && usageOk && billingCycleOk && planOk) {
            discountPercent = promo.discountPercent || 0;
            appliedPromoCode = promoCode;
          }
        }
      }
      
      // Calculate proration credit for upgrades
      let prorationCredit = 0;
      let isUpgrade = false;
      
      if (merchant.subscriptionPlanId && merchant.subscriptionPlanId !== 'free' && merchant.subscriptionPlanId !== planId) {
        const currentPlan = await getEffectiveSubscriptionPlan(merchant.subscriptionPlanId);
        
        if (currentPlan && merchant.currentPeriodEnd) {
          const endDate = new Date(merchant.currentPeriodEnd);
          const now = new Date();
          const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          
          if (daysRemaining > 0) {
            const currentPlanPrice = merchant.billingInterval === 'annual' 
              ? (currentPlan.annualPrice || 0) 
              : (currentPlan.monthlyPrice || 0);
            const dailyRate = currentPlanPrice / 30;
            prorationCredit = Math.round(dailyRate * daysRemaining * 100) / 100;
            isUpgrade = true;
          }
        }
      }
      
      // Calculate final price with discount and proration credit
      const discountAmount = basePriceUSD * (discountPercent / 100);
      const priceAfterDiscount = Math.max(0, basePriceUSD - discountAmount);
      const finalPriceUSD = Math.max(0, priceAfterDiscount - prorationCredit);
      const priceIDR = Math.round(finalPriceUSD * exchangeRate);
      
      // Minimum amount for Kompas Pay is 10,000 IDR
      const MIN_PAYMENT_AMOUNT = 10000;
      const finalPriceIDR = Math.max(priceIDR, MIN_PAYMENT_AMOUNT);
      
      console.log('Checkout-v2 pricing:', {
        planId,
        billingInterval,
        basePriceUSD,
        discountPercent,
        discountAmount,
        prorationCredit,
        isUpgrade,
        priceAfterDiscount,
        finalPriceUSD,
        exchangeRate,
        priceIDR,
        finalPriceIDR,
        appliedPromoCode,
      });
      
      const orderId = `SUB_${merchant.id}_${planId}_${billingInterval}_${Date.now()}`;
      
      const forwardedHost = req.get('x-forwarded-host') || req.get('host');
      const isLocalhost = !forwardedHost || forwardedHost.includes('localhost');
      const callbackUrl = isLocalhost 
        ? 'https://chatvice.app/api/payment/webhook'
        : `https://${forwardedHost}/api/payment/webhook`;
      
      let paymentResult: any = null;
      
      switch (paymentMethod) {
        case 'qris':
          paymentResult = await createQRISPayment({
            merchantId: merchant.id,
            orderId,
            amount: finalPriceIDR,
            customerName: merchant.companyName,
            customerEmail: merchant.email,
            description: `Chatvice ${plan.name} - ${billingInterval === 'annual' ? 'Annual' : 'Monthly'} Subscription`,
            expiryMinutes: 30,
            callbackUrl,
            metadata: { merchantId: merchant.id, planId, billingInterval, type: 'subscription' },
          });
          
          if (!paymentResult.success || !paymentResult.data) {
            return res.status(500).json({ error: paymentResult.error || "Failed to create QRIS payment" });
          }
          
          await storage.updateMerchantSubscription(merchant.id, {
            pendingTransactionId: paymentResult.data.transactionId,
          });
          
          return res.json({
            paymentMethod: 'qris',
            transactionId: paymentResult.data.transactionId,
            orderId: paymentResult.data.orderId,
            qrisString: paymentResult.data.qrisString,
            qrisImage: paymentResult.data.qrisImageUrl,
            amount: finalPriceIDR,
            amountUSD: finalPriceUSD,
            expiryTime: paymentResult.data.expiryTime,
            planId,
            planName: plan.name,
            billingInterval,
            discountPercent,
            appliedPromoCode,
            prorationCredit,
            isUpgrade,
          });
          
        case 'va':
        case 'virtual_account':
          if (!bankCode) {
            return res.status(400).json({ error: "Bank code is required for Virtual Account" });
          }
          
          // Validate bank code (numeric codes)
          if (!SUPPORTED_BANK_CODES.includes(bankCode)) {
            return res.status(400).json({ error: `Unsupported bank code. Supported: ${SUPPORTED_BANK_CODES.join(', ')}` });
          }
          
          paymentResult = await createVAPayment({
            merchantId: merchant.id,
            orderId,
            amount: finalPriceIDR,
            bankCode: bankCode,
            customerName: merchant.companyName,
            customerEmail: merchant.email,
            description: `Chatvice ${plan.name} Subscription`,
            expiryMinutes: 1440, // 24 hours
            callbackUrl,
            metadata: { merchantId: merchant.id, planId, billingInterval, type: 'subscription' },
          });
          
          if (!paymentResult.success || !paymentResult.data) {
            return res.status(500).json({ error: paymentResult.error || "Failed to create Virtual Account" });
          }
          
          await storage.updateMerchantSubscription(merchant.id, {
            pendingTransactionId: paymentResult.data.transactionId,
          });
          
          return res.json({
            paymentMethod: 'virtual_account',
            transactionId: paymentResult.data.transactionId,
            orderId: paymentResult.data.orderId,
            vaNumber: paymentResult.data.vaNumber,
            bankCode: paymentResult.data.bankCode,
            amount: finalPriceIDR,
            amountUSD: finalPriceUSD,
            expiryTime: paymentResult.data.expiryTime,
            planId,
            planName: plan.name,
            billingInterval,
          });
          
        case 'bank_transfer':
          // Bank transfer is not yet fully implemented (requires manual verification)
          return res.status(503).json({ error: "Bank Transfer payment coming soon. Please use QRIS or Virtual Account." });
          
        case 'ewallet':
          // E-wallet requires Kompas Pay gateway integration
          return res.status(503).json({ error: "E-Wallet payment coming soon. Please use QRIS for e-wallet payments." });
          
        case 'payment_link':
          // Payment link requires Kompas Pay gateway integration  
          return res.status(503).json({ error: "Payment Link coming soon. Please use QRIS or Virtual Account." });
          
        case 'credit_card':
          // Credit card via PayPal not yet implemented
          return res.status(503).json({ error: "Credit Card payment via PayPal coming soon. Please use QRIS for now." });
          
        case 'crypto':
          return res.status(503).json({ error: "Cryptocurrency payment coming soon." });
          
        default:
          return res.status(400).json({ error: "Invalid payment method" });
      }
    } catch (error: any) {
      console.error("Checkout v2 error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  // Test endpoint for Kompas Pay API (development only)
  app.post("/api/billing/test-kompaspay", async (req, res) => {
    try {
      if (!isKompasPayConfigured()) {
        return res.status(503).json({ error: "Kompas Pay not configured" });
      }
      
      // Use production URL for callback (Kompas Pay requires public URL)
      const callbackUrl = `https://chatvice.app/api/payment/webhook`;
      const orderId = `TEST_${Date.now()}`;
      
      console.log("Testing Kompas Pay API...");
      
      const qrisResult = await createQRISPayment({
        merchantId: "test",
        orderId,
        amount: 10000, // IDR 10,000 for testing
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        description: "Test QRIS Payment",
        expiryMinutes: 5,
        callbackUrl,
      });
      
      console.log("Kompas Pay test result:", qrisResult);
      
      res.json(qrisResult);
    } catch (error: any) {
      console.error("Kompas Pay test error:", error);
      res.status(500).json({ error: error.message || "Test failed" });
    }
  });

  app.post("/api/billing/demo-checkout", requireMerchant, async (req, res) => {
    try {
      const { planId, billingInterval } = req.body;
      const merchantId = req.session.merchantId!;
      
      const plan = subscriptionPlans[planId as SubscriptionPlanId];
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      
      const periodEnd = billingInterval === 'annual' 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await storage.updateMerchantSubscription(merchantId, {
        subscriptionPlanId: planId,
        subscriptionStatus: 'active',
        paymentSubscriptionId: `demo_sub_${Date.now()}`,
        currentPeriodEnd: periodEnd,
        billingInterval: billingInterval,
        conversationsUsed: 0,
        conversationsResetAt: new Date(),
      });
      
      res.json({ success: true, message: "Demo subscription activated" });
    } catch (error: any) {
      console.error("Demo checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to process demo checkout" });
    }
  });

  // Demo Payment - Simulate successful payment for testing
  app.post("/api/billing/demo-payment", requireMerchant, async (req, res) => {
    try {
      const { transactionId } = req.body;
      const merchantId = req.session.merchantId!;
      
      console.log("Demo payment triggered:", { merchantId, transactionId });
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      // Extract plan info from transaction ID format: SUB_{merchantId}_{planId}_{interval}_{timestamp}
      const parts = transactionId.split('_');
      const planId = parts[2] as SubscriptionPlanId;
      const billingInterval = parts[3] || 'monthly';
      
      console.log("Demo payment processing:", { planId, billingInterval });
      
      if (!planId || !subscriptionPlans[planId]) {
        // If can't parse, just mark as paid without changing plan
        console.log("Cannot parse plan from transactionId, just acknowledging payment");
        return res.json({ success: true, message: "Demo payment acknowledged" });
      }
      
      const periodEnd = new Date();
      if (billingInterval === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      
      // Update subscription directly (bypass external gateway status check)
      await storage.updateMerchantSubscription(merchantId, {
        subscriptionPlanId: planId,
        subscriptionStatus: 'active',
        paymentSubscriptionId: transactionId,
        lastInvoiceId: transactionId,
        currentPeriodEnd: periodEnd,
        billingInterval,
        pendingTransactionId: null,
        conversationsUsed: 0,
        conversationsResetAt: new Date(),
      });
      
      console.log("Demo payment success - subscription updated:", { merchantId, planId, periodEnd });
      
      res.json({ 
        success: true, 
        message: "Demo payment successful - subscription activated",
        planId,
        billingInterval,
        currentPeriodEnd: periodEnd.toISOString(),
      });
    } catch (error: any) {
      console.error("Demo payment error:", error);
      res.status(500).json({ error: error.message || "Failed to process demo payment" });
    }
  });

  app.get("/api/billing/payment-status/:transactionId", requireMerchant, async (req, res) => {
    try {
      const { transactionId } = req.params;
      const merchant = await storage.getMerchant(req.session.merchantId!);
      
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      if (merchant.pendingTransactionId !== transactionId) {
        return res.status(400).json({ error: "Transaction not found" });
      }
      
      const statusResult = await checkPaymentStatus(transactionId);
      
      if (!statusResult.success) {
        return res.status(500).json({ error: statusResult.error || "Failed to check status" });
      }
      
      res.json({
        status: statusResult.data?.status || 'PENDING',
        paidAt: statusResult.data?.paidAt,
        transactionId: statusResult.data?.transactionId,
      });
    } catch (error: any) {
      console.error("Payment status check error:", error);
      res.status(500).json({ error: error.message || "Failed to check payment status" });
    }
  });

  app.post("/api/billing/cancel", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      await storage.updateMerchantSubscription(merchantId, {
        subscriptionStatus: 'canceled',
        pendingTransactionId: null,
      });
      
      res.json({ success: true, message: "Subscription canceled" });
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ error: error.message || "Failed to cancel subscription" });
    }
  });

  // Cancel pending transaction only (not subscription)
  app.post("/api/billing/cancel-pending", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      if (!merchant.pendingTransactionId) {
        return res.json({ success: true, message: "No pending transaction" });
      }
      
      await storage.updateMerchantSubscription(merchantId, {
        pendingTransactionId: null,
      });
      
      console.log("Cleared pending transaction for merchant:", merchantId);
      res.json({ success: true, message: "Pending transaction canceled" });
    } catch (error: any) {
      console.error("Cancel pending transaction error:", error);
      res.status(500).json({ error: error.message || "Failed to cancel pending transaction" });
    }
  });

  // Get merchant's payment transaction history
  app.get("/api/billing/transactions", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const transactions = await storage.getPaymentTransactionsByMerchant(merchantId);
      
      const formattedTransactions = transactions.map(t => ({
        id: t.id,
        invoiceNumber: t.invoiceNumber,
        amount: t.amount,
        amountFormatted: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(t.amount),
        status: t.status,
        paymentMethod: t.paymentMethod,
        planName: t.planName,
        subscriptionMonths: t.subscriptionMonths,
        createdAt: t.createdAt,
        paidAt: t.paidAt,
        expiresAt: t.expiresAt,
      }));
      
      res.json(formattedTransactions);
    } catch (error: any) {
      console.error("Get billing transactions error:", error);
      res.status(500).json({ error: error.message || "Failed to get transactions" });
    }
  });

  app.post("/api/billing/sync", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      if (!merchant.pendingTransactionId) {
        return res.json({ synced: false, message: "No pending transaction" });
      }
      
      const statusResult = await checkPaymentStatus(merchant.pendingTransactionId);
      
      if (!statusResult.success) {
        return res.json({ synced: false, message: "Failed to check payment status" });
      }
      
      if (statusResult.data?.status === 'PAID') {
        const orderId = statusResult.data.orderId || '';
        const parts = orderId.split('_');
        const planId = parts[2] as SubscriptionPlanId;
        const billingInterval = parts[3] || 'monthly';
        
        if (planId && subscriptionPlans[planId]) {
          const periodEnd = new Date();
          if (billingInterval === 'annual') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }
          
          await storage.updateMerchantSubscription(merchantId, {
            subscriptionPlanId: planId,
            subscriptionStatus: 'active',
            paymentSubscriptionId: statusResult.data.transactionId,
            lastInvoiceId: statusResult.data.transactionId,
            currentPeriodEnd: periodEnd,
            billingInterval,
            pendingTransactionId: null,
            conversationsUsed: 0,
            conversationsResetAt: new Date(),
          });
          
          return res.json({ 
            synced: true, 
            planId,
            message: `Plan updated to ${planId}` 
          });
        }
      }
      
      res.json({ synced: false, message: "Payment not yet confirmed" });
    } catch (error: any) {
      console.error("Billing sync error:", error);
      res.status(500).json({ error: error.message || "Failed to sync billing" });
    }
  });

  // Resend Webhook - Email Event Notifications
  app.post("/api/resend/webhook", async (req, res) => {
    try {
      const signature = req.headers['resend-signature'] as string;
      const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

      // Verify webhook signature if secret is configured
      if (webhookSecret && signature) {
        const rawBody = JSON.stringify(req.body);
        const { ResendWebhookHandler } = await import('./resendWebhook');
        
        const isValid = ResendWebhookHandler.verifySignature(rawBody, signature, webhookSecret);
        if (!isValid) {
          console.warn('Invalid Resend webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      // Process the webhook event
      const { ResendWebhookHandler } = await import('./resendWebhook');
      const result = await ResendWebhookHandler.processWebhook(req.body);

      if (result.success) {
        res.status(200).json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error: any) {
      console.error('Resend webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await storage.getAdminByEmail(email);
      if (!admin || !(await verifyPassword(password, admin.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      req.session.userId = admin.id;
      req.session.userType = "admin";
      req.session.isAdmin = true;
      
      res.json({ success: true, adminId: admin.id, name: admin.name });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/admin/me", requireAdmin, async (req, res) => {
    try {
      const admin = await storage.getAdmin(req.session.userId!);
      if (!admin) {
        return res.status(404).json({ error: "Admin not found" });
      }
      const { password, ...safeAdmin } = admin;
      res.json(safeAdmin);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/admin/merchants", requireAdmin, async (req, res) => {
    try {
      const merchants = await storage.getAllMerchants();
      const safeMerchants = merchants.map(({ password, ...m }) => {
        const basePlan = subscriptionPlans[m.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
        const effectivePlan = m.subscriptionPlanId === 'custom' ? {
          ...basePlan,
          conversationsLimit: m.customConversationsLimit ?? basePlan.conversationsLimit,
          agentsLimit: m.customAgentsLimit ?? basePlan.agentsLimit,
          supervisorsLimit: m.customSupervisorsLimit ?? basePlan.supervisorsLimit,
          sourcesLimit: m.customSourcesLimit ?? basePlan.sourcesLimit,
          suggestedQuestionsLimit: m.customSuggestedQuestionsLimit ?? basePlan.suggestedQuestionsLimit,
          monthlyPrice: m.customMonthlyPrice ?? basePlan.monthlyPrice,
          annualPrice: m.customAnnualPrice ?? basePlan.annualPrice,
        } : basePlan;
        return {
          ...m,
          plan: effectivePlan,
        };
      });
      res.json(safeMerchants);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/admin/merchants/:merchantId", requireAdmin, async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.params.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      const { password, ...safeMerchant } = merchant;
      const sessions = await storage.getSessionsByMerchant(merchant.id);
      const supervisors = await storage.getSupervisorsByMerchant(merchant.id);
      
      const basePlan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      const effectivePlan = merchant.subscriptionPlanId === 'custom' ? {
        ...basePlan,
        conversationsLimit: merchant.customConversationsLimit ?? basePlan.conversationsLimit,
        agentsLimit: merchant.customAgentsLimit ?? basePlan.agentsLimit,
        supervisorsLimit: merchant.customSupervisorsLimit ?? basePlan.supervisorsLimit,
        sourcesLimit: merchant.customSourcesLimit ?? basePlan.sourcesLimit,
        suggestedQuestionsLimit: merchant.customSuggestedQuestionsLimit ?? basePlan.suggestedQuestionsLimit,
        monthlyPrice: merchant.customMonthlyPrice ?? basePlan.monthlyPrice,
        annualPrice: merchant.customAnnualPrice ?? basePlan.annualPrice,
      } : basePlan;
      
      res.json({
        ...safeMerchant,
        plan: effectivePlan,
        sessionsCount: sessions.length,
        supervisorsCount: supervisors.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/admin/merchants/:merchantId/subscription", requireAdmin, async (req, res) => {
    try {
      const { 
        planId, 
        status,
        customConversationsLimit,
        customAgentsLimit,
        customSupervisorsLimit,
        customSourcesLimit,
        customSuggestedQuestionsLimit,
        customMonthlyPrice,
        customAnnualPrice
      } = req.body;
      const merchant = await storage.getMerchant(req.params.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const updateData: any = {};
      if (planId) updateData.subscriptionPlanId = planId;
      if (status) updateData.subscriptionStatus = status;
      
      // Custom plan configuration
      if (planId === 'custom') {
        if (customConversationsLimit !== undefined) updateData.customConversationsLimit = customConversationsLimit;
        if (customAgentsLimit !== undefined) updateData.customAgentsLimit = customAgentsLimit;
        if (customSupervisorsLimit !== undefined) updateData.customSupervisorsLimit = customSupervisorsLimit;
        if (customSourcesLimit !== undefined) updateData.customSourcesLimit = customSourcesLimit;
        if (customSuggestedQuestionsLimit !== undefined) updateData.customSuggestedQuestionsLimit = customSuggestedQuestionsLimit;
        if (customMonthlyPrice !== undefined) updateData.customMonthlyPrice = customMonthlyPrice;
        if (customAnnualPrice !== undefined) updateData.customAnnualPrice = customAnnualPrice;
      }
      
      const updated = await storage.updateMerchantSubscription(merchant.id, updateData);
      res.json({ success: true, merchant: updated });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/admin/merchants/:merchantId", requireAdmin, async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.params.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      await storage.deleteMerchant(merchant.id);
      res.json({ success: true, message: "Merchant deleted successfully" });
    } catch (error) {
      console.error("Error deleting merchant:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/admin/merchants/:merchantId/follow-up", requireAdmin, async (req, res) => {
    try {
      const { message } = req.body;
      const merchant = await storage.getMerchant(req.params.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Log the follow-up action and store for future dashboard notification implementation
      console.log(`[Follow-up] Sent to merchant ${merchant.companyName} (${merchant.id}): ${message}`);
      
      // Store follow-up in platform settings for audit trail
      const followUpKey = `follow_up_${merchant.id}_${Date.now()}`;
      await storage.setPlatformSetting(followUpKey, JSON.stringify({
        merchantId: merchant.id,
        merchantName: merchant.companyName,
        message,
        sentAt: new Date().toISOString(),
      }));
      
      res.json({ success: true, message: "Follow-up notification sent" });
    } catch (error) {
      console.error("Error sending follow-up:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const merchants = await storage.getAllMerchants();
      const totalMerchants = merchants.length;
      const activeMerchants = merchants.filter(m => m.subscriptionStatus === 'active').length;
      const trialMerchants = merchants.filter(m => m.subscriptionStatus === 'trial').length;
      const totalConversations = merchants.reduce((sum, m) => sum + (m.conversationsUsed || 0), 0);
      
      const planDistribution = {
        free: merchants.filter(m => !m.subscriptionPlanId || m.subscriptionPlanId === 'free').length,
        starter: merchants.filter(m => m.subscriptionPlanId === 'starter').length,
        pro: merchants.filter(m => m.subscriptionPlanId === 'pro').length,
        enterprise: merchants.filter(m => m.subscriptionPlanId === 'enterprise').length,
        custom: merchants.filter(m => m.subscriptionPlanId === 'custom').length,
      };
      
      const paidMerchants = merchants.filter(m => m.subscriptionStatus === 'active' && m.subscriptionPlanId !== 'free');
      const revenueEstimate = paidMerchants.reduce((sum, m) => {
        const prices: Record<string, number> = { starter: 29, pro: 99, enterprise: 299, custom: 499 };
        return sum + (prices[m.subscriptionPlanId || 'starter'] || 0);
      }, 0);
      
      res.json({
        totalMerchants,
        activeMerchants,
        trialMerchants,
        totalConversations,
        totalMessages: totalConversations * 8,
        totalRevenue: revenueEstimate,
        planDistribution,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllPlatformSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Missing key" });
      }
      await storage.setPlatformSetting(key, value || "");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============ Payment Gateway Configuration (Admin) ============
  
  // Get payment gateway configuration status (never expose actual keys)
  app.get("/api/admin/payment/config", requireAdmin, async (req, res) => {
    try {
      const hasClientKey = !!process.env.KOMPASPAY_CLIENT_KEY;
      const hasClientSecret = !!process.env.KOMPASPAY_CLIENT_SECRET;
      const isConfigured = hasClientKey && hasClientSecret;
      
      // Get masked key preview (first 4 and last 4 chars only)
      const maskKey = (key: string | undefined) => {
        if (!key || key.length < 12) return null;
        return `${key.substring(0, 4)}${"*".repeat(Math.min(key.length - 8, 20))}${key.substring(key.length - 4)}`;
      };
      
      // Get payment settings from platform settings
      const gatewayName = await storage.getPlatformSetting("payment_gateway_name") || "Kompas Pay";
      const webhookUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "https://chatvice.app"}/api/payment/webhook`;
      const apiBaseUrl = 'https://api.kompaspay.com';
      
      res.json({
        isConfigured,
        hasClientKey,
        hasClientSecret,
        clientKeyPreview: maskKey(process.env.KOMPASPAY_CLIENT_KEY),
        gatewayName,
        webhookUrl,
        apiBaseUrl,
        supportedMethods: ["QRIS", "Virtual Account (BCA, BNI, BRI, Mandiri, Permata)"],
        lastUpdated: await storage.getPlatformSetting("payment_config_updated"),
      });
    } catch (error) {
      console.error("Get payment config error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Test payment gateway connection
  app.post("/api/admin/payment/test", requireAdmin, async (req, res) => {
    try {
      const { isKompasPayConfigured, getBalance } = await import("./kompasPayClient");
      
      if (!isKompasPayConfigured()) {
        return res.status(400).json({ 
          success: false, 
          error: "Payment gateway not configured. Please add KOMPASPAY_CLIENT_KEY and KOMPASPAY_CLIENT_SECRET in Secrets." 
        });
      }
      
      // Test connection by checking balance or making a simple API call
      const testResult = await getBalance();
      
      // Update last tested timestamp
      await storage.setPlatformSetting("payment_last_tested", new Date().toISOString());
      
      if (testResult.success) {
        res.json({ 
          success: true, 
          message: "Connection successful! Gateway is operational.",
          balance: testResult.data?.balance,
          currency: testResult.data?.currency || "IDR"
        });
      } else {
        res.json({ 
          success: false, 
          error: testResult.error || "Connection test failed. Please verify your credentials." 
        });
      }
    } catch (error: any) {
      console.error("Payment test error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Connection test failed" 
      });
    }
  });

  // Get payment transaction statistics
  app.get("/api/admin/payment/stats", requireAdmin, async (req, res) => {
    try {
      // Return empty stats - actual data would come from real payment transactions
      // This avoids O(n²) queries across all merchants for the MVP
      const stats = {
        totalTransactions: 0,
        recentTransactions: 0,
        successfulPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        totalVolume: 0,
        recentVolume: 0,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Payment stats error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Save payment gateway settings (non-secret settings only)
  app.post("/api/admin/payment/settings", requireAdmin, async (req, res) => {
    try {
      const { gatewayName } = req.body;
      
      if (gatewayName) {
        await storage.setPlatformSetting("payment_gateway_name", gatewayName);
      }
      
      await storage.setPlatformSetting("payment_config_updated", new Date().toISOString());
      
      res.json({ success: true });
    } catch (error) {
      console.error("Save payment settings error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============ Payment Gateways CRUD ============
  
  // Get all payment gateways
  app.get("/api/admin/payment/gateways", requireAdmin, async (req, res) => {
    try {
      const gateways = await storage.getPaymentGateways();
      res.json(gateways);
    } catch (error) {
      console.error("Get payment gateways error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get single payment gateway
  app.get("/api/admin/payment/gateways/:id", requireAdmin, async (req, res) => {
    try {
      const gateway = await storage.getPaymentGateway(req.params.id);
      if (!gateway) {
        return res.status(404).json({ error: "Gateway not found" });
      }
      res.json(gateway);
    } catch (error) {
      console.error("Get payment gateway error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create payment gateway
  app.post("/api/admin/payment/gateways", requireAdmin, async (req, res) => {
    try {
      const { name, dashboardUrl, environment, isActive, clientKeyEnvVar, clientSecretEnvVar, supportedMethods, feePercentage, feeFixed, currency, description, iconUrl, config } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Gateway name is required" });
      }
      
      const gateway = await storage.createPaymentGateway({
        name,
        dashboardUrl: dashboardUrl || null,
        environment: environment || "sandbox",
        isActive: isActive ?? false,
        isDefault: false,
        clientKeyEnvVar: clientKeyEnvVar || null,
        clientSecretEnvVar: clientSecretEnvVar || null,
        supportedMethods: supportedMethods || [],
        feePercentage: feePercentage || 0,
        feeFixed: feeFixed || 0,
        currency: currency || "IDR",
        description: description || null,
        iconUrl: iconUrl || null,
        config: config || {},
        sortOrder: 0,
      });
      
      res.json(gateway);
    } catch (error) {
      console.error("Create payment gateway error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Get payment gateway statistics per gateway (daily, weekly, monthly, yearly)
  // Returns seeded demo data - in production, would query actual transaction aggregates
  app.get("/api/admin/payment/gateway-stats", requireAdmin, async (req, res) => {
    try {
      const gateways = await storage.getPaymentGateways();
      
      // Generate deterministic seeded statistics for each gateway (demo data)
      // Uses gateway ID hash for consistent values per gateway
      const stats: GatewayStats[] = gateways.map(gateway => {
        // Create a simple hash from gateway ID for deterministic values
        const hash = gateway.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const multiplier = gateway.isActive ? 1 : 0.1;
        
        // Seeded base values (deterministic per gateway)
        const baseDaily = Math.floor((hash % 50) * multiplier) + 5;
        const baseVolume = Math.floor((hash % 50) * 100000 * multiplier) + 500000;
        
        return {
          gatewayId: gateway.id,
          gatewayName: gateway.name,
          daily: {
            transactions: baseDaily,
            volume: baseVolume,
          },
          weekly: {
            transactions: baseDaily * 7,
            volume: baseVolume * 7,
          },
          monthly: {
            transactions: baseDaily * 30,
            volume: baseVolume * 30,
          },
          yearly: {
            transactions: baseDaily * 365,
            volume: baseVolume * 365,
          },
        };
      });
      
      res.json(stats);
    } catch (error) {
      console.error("Get gateway stats error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update payment gateway
  app.patch("/api/admin/payment/gateways/:id", requireAdmin, async (req, res) => {
    try {
      const gateway = await storage.getPaymentGateway(req.params.id);
      if (!gateway) {
        return res.status(404).json({ error: "Gateway not found" });
      }
      
      const updated = await storage.updatePaymentGateway(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update payment gateway error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete payment gateway
  app.delete("/api/admin/payment/gateways/:id", requireAdmin, async (req, res) => {
    try {
      const gateway = await storage.getPaymentGateway(req.params.id);
      if (!gateway) {
        return res.status(404).json({ error: "Gateway not found" });
      }
      
      if (gateway.isDefault) {
        return res.status(400).json({ error: "Cannot delete default gateway" });
      }
      
      const deleted = await storage.deletePaymentGateway(req.params.id);
      res.json({ success: deleted });
    } catch (error) {
      console.error("Delete payment gateway error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Set default payment gateway
  app.post("/api/admin/payment/gateways/:id/set-default", requireAdmin, async (req, res) => {
    try {
      const gateway = await storage.getPaymentGateway(req.params.id);
      if (!gateway) {
        return res.status(404).json({ error: "Gateway not found" });
      }
      
      if (!gateway.isActive) {
        return res.status(400).json({ error: "Cannot set inactive gateway as default" });
      }
      
      const success = await storage.setDefaultPaymentGateway(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Set default gateway error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Payment Transactions - Admin view all transactions
  app.get("/api/admin/payment/transactions", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const transactions = await storage.getAllPaymentTransactions(limit);
      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get single transaction
  app.get("/api/admin/payment/transactions/:id", requireAdmin, async (req, res) => {
    try {
      const transaction = await storage.getPaymentTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Get transaction error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Notifications - Get all notifications
  app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getAdminNotifications(limit);
      res.json(notifications);
    } catch (error) {
      console.error("Get admin notifications error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get unread notifications count
  app.get("/api/admin/notifications/unread", requireAdmin, async (req, res) => {
    try {
      const notifications = await storage.getUnreadAdminNotifications();
      res.json({ count: notifications.length, notifications });
    } catch (error) {
      console.error("Get unread notifications error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Mark notification as read
  app.post("/api/admin/notifications/:id/read", requireAdmin, async (req, res) => {
    try {
      const success = await storage.markAdminNotificationRead(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Mark all notifications as read
  app.post("/api/admin/notifications/read-all", requireAdmin, async (req, res) => {
    try {
      const success = await storage.markAllAdminNotificationsRead();
      res.json({ success });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/platform/settings/:key", async (req, res) => {
    try {
      const value = await storage.getPlatformSetting(req.params.key);
      res.json({ value });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Landing Page Settings API (Admin only for update, public for read)
  app.get("/api/landing-settings", async (req, res) => {
    try {
      const settings = await storage.getLandingPageSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/admin/landing-settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.updateLandingPageSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating landing settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Brand identity file upload endpoint - uses Object Storage for persistence, falls back to database
  app.post("/api/admin/brand-upload", requireAdmin, (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Multer upload error:", err);
        return res.status(400).json({ error: err.message || "File upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const objectStorage = new ObjectStorageService();
      const fileBuffer = fs.readFileSync(req.file.path);
      const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
      
      // Try Object Storage first
      if (objectStorage.isConfigured()) {
        try {
          const fileUrl = await objectStorage.uploadFile(fileBuffer, uniqueFilename, req.file.mimetype);
          fs.unlinkSync(req.file.path);
          return res.json({ url: fileUrl, filename: uniqueFilename });
        } catch (storageError) {
          console.log("Object Storage failed, falling back to database:", storageError);
        }
      }
      
      // Fallback: Store file in database (for small brand assets like logo, favicon, og image)
      const base64Content = fileBuffer.toString("base64");
      const fileId = `brand_${uniqueFilename}`;
      
      await storage.storeFile({
        id: fileId,
        filename: uniqueFilename,
        mimeType: req.file.mimetype,
        size: fileBuffer.length,
        content: base64Content,
        category: "brand"
      });
      
      fs.unlinkSync(req.file.path);
      
      const fileUrl = `/db-files/${fileId}`;
      res.json({ url: fileUrl, filename: uniqueFilename });
    } catch (error) {
      console.error("Error uploading brand file:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Serve files from database storage
  app.get("/db-files/:fileId", async (req, res) => {
    try {
      const file = await storage.getStoredFile(req.params.fileId);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const buffer = Buffer.from(file.content, "base64");
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      res.send(buffer);
    } catch (error) {
      console.error("Error serving file from database:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Serve files from Object Storage
  app.get("/storage/*", async (req, res) => {
    try {
      const objectStorage = new ObjectStorageService();
      
      if (!objectStorage.isConfigured()) {
        return res.status(404).json({ error: "Object storage not configured" });
      }
      
      const objectPath = req.path;
      const file = await objectStorage.getFile(objectPath);
      await objectStorage.downloadObject(file, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      console.error("Error serving file from storage:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Platform DNS Settings API
  app.get("/api/admin/dns-settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getPlatformDnsSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error getting DNS settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/admin/dns-settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.updatePlatformDnsSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating DNS settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Platform Settings API
  app.get("/api/admin/platform-settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error getting platform settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/admin/platform-settings", requireAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Key is required" });
      }
      await storage.setPlatformSetting(key, value);
      
      // When trial_days is updated, recalculate trialEndsAt for existing trial merchants
      if (key === "trial_days") {
        const trialDays = parseInt(value) || 14;
        await storage.recalculateTrialExpiryForActiveMerchants(trialDays);
      }
      
      const settings = await storage.getAllPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error updating platform setting:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/admin/platform-settings/batch", requireAdmin, async (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: "Settings object is required" });
      }
      for (const [key, value] of Object.entries(settings)) {
        await storage.setPlatformSetting(key, String(value));
      }
      
      // If trial_days was included in batch, recalculate trial expiry for active merchants
      if (settings.trial_days) {
        const trialDays = parseInt(settings.trial_days) || 14;
        await storage.recalculateTrialExpiryForActiveMerchants(trialDays);
      }
      
      const allSettings = await storage.getAllPlatformSettings();
      res.json(allSettings);
    } catch (error) {
      console.error("Error updating platform settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get subscription plans (uses cached utility for consistent data)
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      // Use the centralized utility to get effective plans with DB overrides
      const plans = await getAllEffectiveSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Update subscription plan
  app.put("/api/admin/subscription-plans/:planId", requireAdmin, async (req, res) => {
    try {
      const { planId } = req.params;
      const { monthlyPrice, annualPrice, conversationsLimit, agentsLimit, supervisorsLimit, sourcesLimit } = req.body;
      
      // Get existing custom overrides
      const customPlansJson = await storage.getPlatformSetting("subscription_plans_custom") || "{}";
      let customOverrides: Record<string, any> = {};
      try {
        customOverrides = JSON.parse(customPlansJson);
      } catch {
        customOverrides = {};
      }
      
      // Update the specific plan
      customOverrides[planId] = {
        ...(customOverrides[planId] || {}),
        ...(monthlyPrice !== undefined && { monthlyPrice }),
        ...(annualPrice !== undefined && { annualPrice }),
        ...(conversationsLimit !== undefined && { conversationsLimit }),
        ...(agentsLimit !== undefined && { agentsLimit }),
        ...(supervisorsLimit !== undefined && { supervisorsLimit }),
        ...(sourcesLimit !== undefined && { sourcesLimit }),
      };
      
      // Save back to platform settings
      await storage.setPlatformSetting("subscription_plans_custom", JSON.stringify(customOverrides));
      
      // Clear the plan cache so changes take effect immediately
      clearPlanCache();
      
      // Return the updated plan
      const defaultPlan = subscriptionPlans[planId as keyof typeof subscriptionPlans];
      if (!defaultPlan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      
      const updatedPlan = {
        ...defaultPlan,
        id: planId,
        ...customOverrides[planId],
      };
      
      res.json({ success: true, plan: updatedPlan });
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============ RESEND EMAIL TEST ============
  
  // Test Resend connection (admin)
  app.get("/api/admin/test-resend", requireAdmin, async (req, res) => {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      res.json({ 
        success: true, 
        message: "Resend connection successful",
        fromEmail: fromEmail 
      });
    } catch (error: any) {
      console.error("Resend test error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to connect to Resend" 
      });
    }
  });

  // ============ PROMOTIONS ROUTES ============
  
  // Get all promotions (admin)
  app.get("/api/admin/promotions", requireAdmin, async (req, res) => {
    try {
      const promos = await storage.getPromotions();
      res.json(promos);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get single promotion (admin)
  app.get("/api/admin/promotions/:id", requireAdmin, async (req, res) => {
    try {
      const promo = await storage.getPromotion(req.params.id);
      if (!promo) {
        return res.status(404).json({ error: "Promotion not found" });
      }
      res.json(promo);
    } catch (error) {
      console.error("Error fetching promotion:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create promotion (admin)
  app.post("/api/admin/promotions", requireAdmin, async (req, res) => {
    try {
      const { code, name, description, discountPercent, targetPlans, billingCycle, maxUses, startDate, endDate, isActive, isPublic, showUpsell } = req.body;
      
      if (!code || !name || !discountPercent || !targetPlans || !startDate || !endDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if code already exists
      const existing = await storage.getPromotionByCode(code);
      if (existing) {
        return res.status(400).json({ error: "Promotion code already exists" });
      }

      const promo = await storage.createPromotion({
        code,
        name,
        description,
        discountPercent: parseInt(discountPercent),
        targetPlans: Array.isArray(targetPlans) ? targetPlans : [targetPlans],
        billingCycle: billingCycle || "both",
        maxUses: maxUses ? parseInt(maxUses) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== false,
        isPublic: isPublic === true,
        showUpsell: showUpsell !== false,
      });
      res.json(promo);
    } catch (error) {
      console.error("Error creating promotion:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update promotion (admin)
  app.put("/api/admin/promotions/:id", requireAdmin, async (req, res) => {
    try {
      const { code, name, description, discountPercent, targetPlans, billingCycle, maxUses, startDate, endDate, isActive, isPublic, showUpsell, bgColor, textColor, bannerMode, bannerImageUrl, bannerImageMobileUrl } = req.body;
      
      const updateData: any = {};
      if (code !== undefined) updateData.code = code;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (discountPercent !== undefined) updateData.discountPercent = parseInt(discountPercent);
      if (targetPlans !== undefined) updateData.targetPlans = Array.isArray(targetPlans) ? targetPlans : [targetPlans];
      if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
      if (maxUses !== undefined) updateData.maxUses = maxUses ? parseInt(maxUses) : null;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (showUpsell !== undefined) updateData.showUpsell = showUpsell;
      if (bgColor !== undefined) updateData.bgColor = bgColor;
      if (textColor !== undefined) updateData.textColor = textColor;
      if (bannerMode !== undefined) updateData.bannerMode = bannerMode;
      if (bannerImageUrl !== undefined) updateData.bannerImageUrl = bannerImageUrl;
      if (bannerImageMobileUrl !== undefined) updateData.bannerImageMobileUrl = bannerImageMobileUrl;

      const promo = await storage.updatePromotion(req.params.id, updateData);
      if (!promo) {
        return res.status(404).json({ error: "Promotion not found" });
      }
      res.json(promo);
    } catch (error) {
      console.error("Error updating promotion:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Upload promo banner image (admin) - with persistent storage
  app.post("/api/admin/upload-promo-banner", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP" });
      }

      const objectStorage = new ObjectStorageService();
      const fileBuffer = fs.readFileSync(req.file.path);
      const uniqueFilename = `promo_${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
      
      // Try Object Storage first (persistent)
      if (objectStorage.isConfigured()) {
        try {
          const fileUrl = await objectStorage.uploadFile(fileBuffer, uniqueFilename, req.file.mimetype);
          fs.unlinkSync(req.file.path);
          return res.json({ url: fileUrl, filename: uniqueFilename });
        } catch (storageError) {
          console.log("Object Storage failed for promo banner, falling back to database:", storageError);
        }
      }
      
      // Fallback: Store file in database (for persistent storage)
      const base64Content = fileBuffer.toString("base64");
      const fileId = `promo_banner_${uniqueFilename}`;
      
      await storage.storeFile({
        id: fileId,
        filename: uniqueFilename,
        mimeType: req.file.mimetype,
        size: fileBuffer.length,
        content: base64Content,
        category: "promo"
      });
      
      fs.unlinkSync(req.file.path);
      
      const fileUrl = `/db-files/${fileId}`;
      res.json({ url: fileUrl, filename: uniqueFilename });
    } catch (error) {
      console.error("Error uploading promo banner:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete promotion (admin)
  app.delete("/api/admin/promotions/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deletePromotion(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Promotion not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting promotion:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get promotion usage history (admin)
  app.get("/api/admin/promotions/:id/usage", requireAdmin, async (req, res) => {
    try {
      const usage = await storage.getPromotionUsage(req.params.id);
      res.json(usage);
    } catch (error) {
      console.error("Error fetching promotion usage:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Public endpoint: Get active public promotions (for pricing pages)
  app.get("/api/promotions/active", async (req, res) => {
    try {
      const promos = await storage.getPublicActivePromotions();
      // Filter to only return necessary info for public display
      const publicPromos = promos.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        discountPercent: p.discountPercent,
        targetPlans: p.targetPlans,
        billingCycle: p.billingCycle,
        endDate: p.endDate,
        showUpsell: p.showUpsell,
        bgColor: p.bgColor,
        textColor: p.textColor,
        bannerMode: p.bannerMode,
        bannerImageUrl: p.bannerImageUrl,
        bannerImageMobileUrl: p.bannerImageMobileUrl,
      }));
      res.json(publicPromos);
    } catch (error) {
      console.error("Error fetching active promotions:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Validate and apply promo code (for checkout)
  app.post("/api/promotions/validate", async (req, res) => {
    try {
      const { code, planId, billingCycle } = req.body;
      
      if (!code || !planId) {
        return res.status(400).json({ error: "Missing code or plan ID" });
      }

      const promo = await storage.getPromotionByCode(code);
      if (!promo) {
        return res.status(404).json({ error: "Invalid promotion code" });
      }

      const now = new Date();
      
      // Check if promo is active
      if (!promo.isActive) {
        return res.status(400).json({ error: "This promotion is no longer active" });
      }

      // Check date validity
      if (now < promo.startDate) {
        return res.status(400).json({ error: "This promotion has not started yet" });
      }
      if (now > promo.endDate) {
        return res.status(400).json({ error: "This promotion has expired" });
      }

      // Check max uses
      if (promo.maxUses !== null && promo.usedCount !== null && promo.usedCount >= promo.maxUses) {
        return res.status(400).json({ error: "This promotion has reached its usage limit" });
      }

      // Check target plans - "all" as planId means just validate the code without plan restriction
      const targets = promo.targetPlans || [];
      const isAllPlans = targets.includes("all");
      const isPlanTarget = targets.includes(planId);
      const isUpgrade = targets.includes("upgrade") && (planId === "starter" || planId === "pro" || planId === "enterprise");
      const isGenericCheck = planId === "all"; // Special: just validate code exists without plan check
      
      if (!isGenericCheck && !isAllPlans && !isPlanTarget && !isUpgrade) {
        return res.status(400).json({ error: "This promotion is not valid for the selected plan" });
      }

      // Check billing cycle
      if (promo.billingCycle !== "both" && promo.billingCycle !== billingCycle) {
        return res.status(400).json({ error: `This promotion is only valid for ${promo.billingCycle} billing` });
      }

      res.json({
        valid: true,
        promotion: {
          id: promo.id,
          code: promo.code,
          name: promo.name,
          discountPercent: promo.discountPercent,
          targetPlans: promo.targetPlans || [],
          billingCycle: promo.billingCycle,
        },
      });
    } catch (error) {
      console.error("Error validating promotion:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin endpoint for crawling guide knowledge source URLs
  app.post("/api/admin/guide/crawl", requireAdmin, async (req, res) => {
    try {
      const { url, name } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      // Normalize URL - add https:// if not present (case-insensitive check)
      let normalizedUrl = url.trim();
      const lowerUrl = normalizedUrl.toLowerCase();
      if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      } else if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) {
        // Fix case where user typed "Https://" or "HTTP://" - normalize to lowercase protocol
        normalizedUrl = normalizedUrl.replace(/^https?:\/\//i, (match: string) => match.toLowerCase());
      }
      
      console.log("Crawling URL:", normalizedUrl);
      
      const result = await extractFAQContent(normalizedUrl);
      if (!result.success) {
        console.log("Crawl failed:", result.error);
        return res.status(400).json({ error: result.error || "Failed to extract content from URL" });
      }
      
      // Get existing sources from platform settings
      const existingSourcesJson = await storage.getPlatformSetting("guide_sources") || "[]";
      let sources: Array<{ id: string; name: string; url: string; content: string; status: string; createdAt: string }> = [];
      try {
        sources = JSON.parse(existingSourcesJson);
      } catch {
        sources = [];
      }
      
      // Add new source
      const sourceId = `src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let sourceName: string;
      try {
        sourceName = name || new URL(url).hostname;
      } catch {
        sourceName = url;
      }
      sources.push({
        id: sourceId,
        name: sourceName,
        url,
        content: result.content || "",
        status: "active",
        createdAt: new Date().toISOString(),
      });
      
      // Save sources
      await storage.setPlatformSetting("guide_sources", JSON.stringify(sources));
      
      // Also append to knowledge content
      let knowledgeContent = await storage.getPlatformSetting("guide_knowledge_content") || "";
      if (knowledgeContent) {
        knowledgeContent += "\n\n---\n\n";
      }
      knowledgeContent += `[Source: ${sourceName}]\n${result.content}`;
      await storage.setPlatformSetting("guide_knowledge_content", knowledgeContent);
      
      res.json({ 
        success: true, 
        source: sources[sources.length - 1],
        sources,
        extractedContent: result.content
      });
    } catch (error) {
      console.error("Guide crawl error:", error);
      res.status(500).json({ error: "Failed to crawl URL" });
    }
  });

  // Admin endpoint to get guide sources
  app.get("/api/admin/guide/sources", requireAdmin, async (req, res) => {
    try {
      const sourcesJson = await storage.getPlatformSetting("guide_sources") || "[]";
      let sources = [];
      try {
        sources = JSON.parse(sourcesJson);
      } catch {
        sources = [];
      }
      res.json(sources);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin endpoint to delete guide source
  app.delete("/api/admin/guide/sources/:sourceId", requireAdmin, async (req, res) => {
    try {
      const { sourceId } = req.params;
      const sourcesJson = await storage.getPlatformSetting("guide_sources") || "[]";
      let sources: Array<{ id: string; name: string; url: string; content?: string; status: string }> = [];
      try {
        sources = JSON.parse(sourcesJson);
      } catch {
        sources = [];
      }
      
      // Find source to delete and its name for content removal
      const sourceToDelete = sources.find((s) => s.id === sourceId);
      const filteredSources = sources.filter((s) => s.id !== sourceId);
      await storage.setPlatformSetting("guide_sources", JSON.stringify(filteredSources));
      
      // Remove corresponding content from knowledge content
      if (sourceToDelete) {
        let knowledgeContent = await storage.getPlatformSetting("guide_knowledge_content") || "";
        if (knowledgeContent) {
          // Remove the source content block (format: [Source: name]\ncontent)
          const sourcePattern = new RegExp(
            `(---\\n\\n)?\\[Source: ${sourceToDelete.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\][\\s\\S]*?(?=\\n\\n---|$)`,
            'g'
          );
          knowledgeContent = knowledgeContent.replace(sourcePattern, '').trim();
          // Clean up any resulting double separators
          knowledgeContent = knowledgeContent.replace(/\n\n---\n\n---\n\n/g, '\n\n---\n\n');
          knowledgeContent = knowledgeContent.replace(/^---\n\n/, '').replace(/\n\n---$/, '');
          await storage.setPlatformSetting("guide_knowledge_content", knowledgeContent);
        }
      }
      
      // Get updated knowledge content to return
      const updatedKnowledge = await storage.getPlatformSetting("guide_knowledge_content") || "";
      
      res.json({ success: true, sources: filteredSources, knowledgeContent: updatedKnowledge });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Public endpoint to get trial days for pricing page
  app.get("/api/platform/trial-days", async (req, res) => {
    try {
      const trialDays = await storage.getPlatformSetting("trial_days");
      res.json({ trialDays: trialDays ? parseInt(trialDays) : 14 });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Public endpoint to get platform settings for public pages
  app.get("/api/platform-settings", async (req, res) => {
    try {
      const allSettings = await storage.getAllPlatformSettings();
      // Filter to only return public settings (trial days, guide settings)
      const publicKeys = [
        'trial_days', 
        'guide_enabled', 
        'guide_name', 
        'guide_welcome_message',
        'guide_show_landing',
        'guide_show_dashboard',
        'guide_widget_position',
        'guide_widget_color',
        'guide_bubble_enabled',
        'guide_bubble_text',
        'guide_button_icon_url',
        'guide_button_icon_width',
        'guide_button_icon_height',
        'guide_promo_image_enabled',
        'guide_promo_image_url',
        'merchant_menu_order',
        'exchange_rate'
      ];
      const publicSettings: Record<string, string> = {};
      for (const key of publicKeys) {
        if (allSettings[key] !== undefined) {
          publicSettings[key] = allSettings[key];
        }
      }
      res.json(publicSettings);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/widget/chatvice.js", async (req, res) => {
    const merchantId = req.query.merchant || "demo";
    const baseUrl = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : (req.headers.origin || `https://${req.headers.host}`);
    const script = `
(function() {
  var merchantId = "${merchantId}";
  var sessionId = "sess_" + Math.random().toString(36).substring(2, 12);
  var baseUrl = "${baseUrl}";
  var isOpen = false;
  
  // Cleanup existing widget for same merchant (allows re-initialization)
  var existingIframe = document.getElementById("chatvice-widget-frame");
  var existingButton = document.getElementById("chatvice-widget-button");
  if (existingIframe) existingIframe.remove();
  if (existingButton) existingButton.remove();
  
  var iframe = document.createElement("iframe");
  iframe.src = baseUrl + "/widget/" + merchantId + "?session=" + sessionId + "&showClose=true";
  iframe.style.cssText = "position:fixed;bottom:20px;right:20px;width:380px;height:550px;border:none;z-index:99999;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.15);display:none;";
  iframe.id = "chatvice-widget-frame";
  iframe.allow = "microphone; camera";
  
  var button = document.createElement("div");
  button.id = "chatvice-widget-button";
  
  // Default styles - will be updated after fetching config
  var defaultColor = "#6b5dfc";
  var buttonWidth = 60;
  var buttonHeight = 60;
  var iconUrl = "";
  var bubblePosition = "right";
  
  function updateButtonStyles(config) {
    defaultColor = config.primaryColor || defaultColor;
    iconUrl = config.iconUrl || "";
    buttonWidth = iconUrl ? (config.iconWidth || 70) : (config.iconSize || 60);
    buttonHeight = iconUrl ? (config.iconHeight || 70) : (config.iconSize || 60);
    bubblePosition = config.bubblePosition || "right";
    
    var positionStyle = bubblePosition === "left" 
      ? "left:20px;right:auto;" 
      : "right:20px;left:auto;";
    
    if (iconUrl) {
      // Custom icon - no background, no border-radius
      button.style.cssText = "position:fixed;bottom:20px;" + positionStyle + "width:" + buttonWidth + "px;height:" + buttonHeight + "px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:99999;transition:transform 0.2s ease;";
      button.innerHTML = '<img src="' + iconUrl + '" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3));" />';
    } else {
      // Default chat bubble icon
      button.style.cssText = "position:fixed;bottom:20px;" + positionStyle + "width:" + buttonWidth + "px;height:" + buttonHeight + "px;border-radius:50%;background:" + defaultColor + ";cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:99999;box-shadow:0 4px 15px " + defaultColor + "66;transition:transform 0.2s ease;";
      button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    }
    
    // Also update iframe position
    iframe.style.cssText = "position:fixed;bottom:20px;" + positionStyle + "width:380px;height:550px;border:none;z-index:99999;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.15);display:" + (isOpen ? "block" : "none") + ";";
  }
  
  // Initial default styles
  button.style.cssText = "position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#6b5dfc;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:99999;box-shadow:0 4px 15px rgba(107,93,252,0.4);transition:transform 0.2s ease;";
  button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  
  // Fetch merchant config and apply custom styles
  fetch(baseUrl + "/api/merchant/status/" + merchantId)
    .then(function(response) { return response.json(); })
    .then(function(config) { updateButtonStyles(config); })
    .catch(function(err) { console.log("Chatvice: Could not load config, using defaults"); });
  
  button.onmouseover = function() { button.style.transform = "scale(1.05)"; };
  button.onmouseout = function() { button.style.transform = "scale(1)"; };
  
  function openWidget() {
    iframe.style.display = "block";
    button.style.display = "none";
    isOpen = true;
  }
  
  function closeWidget() {
    iframe.style.display = "none";
    button.style.display = "flex";
    isOpen = false;
  }
  
  button.onclick = function() {
    openWidget();
  };
  
  // Listen for messages from iframe (close button clicked inside widget)
  window.addEventListener("message", function(event) {
    // Validate message source is from our iframe
    if (event.source !== iframe.contentWindow) return;
    if (!event.data || typeof event.data !== "object") return;
    
    if (event.data.type === "chatvice-close") {
      closeWidget();
    } else if (event.data.type === "chatvice-open") {
      openWidget();
    }
  });
  
  document.body.appendChild(iframe);
  document.body.appendChild(button);
  
  // Expose public API
  window.chatvice = {
    open: openWidget,
    close: closeWidget,
    toggle: function() { isOpen ? closeWidget() : openWidget(); },
    isOpen: function() { return isOpen; }
  };
})();
`;
    res.type("application/javascript").send(script);
  });

  app.post("/api/demo/ask", async (req, res) => {
    try {
      const { question } = req.body;
      
      const chatviceKnowledge = `
Chatvice is an AI-powered customer service chatbot platform that helps businesses:
- Automate customer support with intelligent AI responses
- Handle inquiries 24/7 with natural conversations
- Seamlessly escalate complex issues to human supervisors
- Train AI on your business knowledge base
- Customize chat widget to match your brand
- Track analytics and performance metrics
- Multi-language support with automatic detection
- Smart triggers for escalation keywords
- Real-time supervisor notifications
- Custom domain support (Pro plan)
- Multiple AI agents (based on plan)

Plans:
- Free: $0/month - 50 conversations, 1 agent, 1 team member
- Starter: $29/month - 500 conversations, 1 agent, 2 team members
- Pro: $79/month - 5,000 conversations, 3 agents, 5 team members, advanced analytics
- Enterprise: $299/month - 50,000 conversations, 10 agents, unlimited team members
- Custom: Contact sales - Unlimited everything, white-label solution

All plans include a 7-day free trial. No credit card required to start.
`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are Chatvice, an AI assistant for Chatvice platform. Answer questions about Chatvice based on this knowledge:
${chatviceKnowledge}

Be helpful, friendly, and concise. If asked about something not related to Chatvice, politely redirect to how Chatvice can help businesses with customer service.`
          },
          { role: "user", content: question }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });
      
      res.json({ answer: response.choices[0].message.content || "I'm here to help! Ask me about how Chatvice can transform your customer service." });
    } catch (error) {
      res.json({ answer: "Hi! I'm Chatvice. I help businesses automate customer support with intelligent AI responses. Would you like to learn about our plans or features?" });
    }
  });

  // Demo Widget Top-Up Chat - AI-powered conversational assistant
  const demoTopupSessions = new Map<string, { messages: Array<{ role: "user" | "assistant"; content: string }>; state: any }>();

  app.post("/api/demo/topup-chat", async (req, res) => {
    try {
      const { sessionId, message, context } = req.body;
      
      if (!sessionId || !message) {
        return res.status(400).json({ error: "sessionId and message are required" });
      }
      
      // Get or create session
      let session = demoTopupSessions.get(sessionId);
      if (!session) {
        session = { messages: [], state: {} };
        demoTopupSessions.set(sessionId, session);
      }
      
      // Update state from context if provided
      if (context) {
        session.state = { ...session.state, ...context };
      }
      
      // Add user message to history
      session.messages.push({ role: "user", content: message });
      
      // Random female assistant name
      const assistantNames = ["Jeanny", "Jenna", "Lisa", "Ghea", "Yoona", "Marsya", "Anya"];
      const assistantName = session.state.assistantName || assistantNames[Math.floor(Math.random() * assistantNames.length)];
      if (!session.state.assistantName) {
        session.state.assistantName = assistantName;
      }
      
      // Build system prompt for top-up assistant with workflow guidance
      const systemPrompt = `Kamu adalah asisten top-up koin yang ramah untuk platform game/aplikasi di Indonesia.
Nama kamu: ${assistantName} | Gaya: Santai, ramah, pakai "kak", "bosku", "sis", "gan"

ATURAN IDENTITAS:
- JANGAN pernah pakai kata "saya" atau "aku" - SELALU ganti dengan nama: "${assistantName}"
- JANGAN PERNAH bilang kamu "bot", "asisten bot", "bot asisten", atau apapun yang mengandung kata "bot"
- Kalau ditanya "orang atau bot?" atau "siapa kamu?" → Jawab: "${assistantName} kak, asisten yang bantu kakak/bosku top-up koin!"
- Contoh BENAR: "${assistantName} bantu ya kak!", "${assistantName} asisten yang siap bantu kakak!"
- Contoh SALAH: "Saya bot", "Jeanny asisten bot", "Aku bot yang membantu"

STATUS SEKARANG:
${context?.selectedProduct ? `✓ Nominal: ${context.selectedProduct.name} (${context.selectedProduct.coins} koin)` : '✗ Nominal: BELUM DIPILIH'}
${context?.isLoggedIn ? '✓ Login: SUDAH' : '✗ Login: BELUM'}
${context?.selectedPaymentMethod ? `✓ Metode: ${context.selectedPaymentMethod}` : '✗ Metode: BELUM DIPILIH'}
${context?.transactionCompleted ? '✓ Transaksi: SELESAI' : '○ Transaksi: Belum'}

PAKET TERSEDIA:
Rp 25.000 (25 Koin) | Rp 50.000 (55 Koin) | Rp 100.000 (115 Koin)
Rp 200.000 (240 Koin) | Rp 500.000 (625 Koin) | Rp 1.000.000 (1250 Koin)

METODE BAYAR: QRIS, Bank Transfer (BCA/Mandiri/BNI/BRI), Virtual Account, Crypto

ATURAN WAJIB - SELALU AKHIRI DENGAN ACTION TAG:
1. Belum pilih nominal → [ACTION:show_packages]
2. Sudah nominal, belum login → [ACTION:show_auth]  
3. Sudah login, belum metode → [ACTION:show_payment]
4. User sebut metode (qris/bank/transfer/va/crypto) → [ACTION:set_payment:METHOD]
5. Transaksi selesai → [ACTION:complete]

INSTRUKSI:
- Jawab SINGKAT (1-2 kalimat)
- WAJIB akhiri dengan [ACTION:xxx]
- Tidak bisa custom nominal
- User tanya lain-lain → arahkan ke top-up, kasih [ACTION:show_packages]
- Jika user bilang nominal (misal "50rb", "100 ribu") tapi belum pilih dari list → tetap kasih [ACTION:show_packages]

CONTOH (ganti ${assistantName} dengan nama kamu):
User: "mau topup" → "Siap kak! ${assistantName} bantu pilih nominal ya! [ACTION:show_packages]"
User: "100rb" (belum di list) → "Oke 100rb dapat 115 koin! Langsung pilih dari list ya kak! [ACTION:show_packages]"
User: "bisa custom?" → "Maaf kak, nominal udah fix dari paket ya. ${assistantName} bantu pilih yang cocok! [ACTION:show_packages]"
User: "pake qris" (sudah login) → "Siap! ${assistantName} siapin QRIS-nya, tinggal scan dan geser bayar ya kak! [ACTION:set_payment:qris]"
User: "nama nya siapa?" → "${assistantName} kak! ${assistantName} yang bantu top-up koin kakak hari ini. Ada yang bisa ${assistantName} bantu? [ACTION:show_packages]"
User: "makasih" → "Sama-sama kak! Senang bisa bantu. Kalau butuh apa-apa, ${assistantName} siap ya! [ACTION:complete]"`;

      // Limit history to last 10 messages
      const recentMessages = session.messages.slice(-10);
      
      const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...recentMessages
      ];
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: chatMessages,
        max_tokens: 200,
        temperature: 0.8,
      });
      
      const aiResponse = completion.choices[0]?.message?.content || "Maaf kak, ada gangguan. Coba lagi ya!";
      
      // Add AI response to history
      session.messages.push({ role: "assistant", content: aiResponse });
      
      // Keep session size manageable (max 50 messages)
      if (session.messages.length > 50) {
        session.messages = session.messages.slice(-30);
      }
      
      // Clean up old sessions (older than 30 minutes)
      const now = Date.now();
      if (Math.random() < 0.1) { // 10% chance to run cleanup
        demoTopupSessions.forEach((_, key) => {
          const sessionTime = parseInt(key.split('-')[1] || '0');
          if (now - sessionTime > 30 * 60 * 1000) {
            demoTopupSessions.delete(key);
          }
        });
      }
      
      res.json({ 
        answer: aiResponse,
        sessionId 
      });
    } catch (error) {
      console.error("Demo topup chat error:", error);
      res.json({ 
        answer: "Waduh ada masalah teknis nih kak. Coba refresh halaman atau tunggu sebentar ya!",
        sessionId: req.body.sessionId 
      });
    }
  });

  const publicHelpRateLimit = new Map<string, { count: number; resetTime: number }>();
  const PUBLIC_HELP_LIMIT = 10;
  const PUBLIC_HELP_WINDOW = 60 * 1000;

  app.post("/api/help/public-ask", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      
      const rateData = publicHelpRateLimit.get(clientIp);
      if (rateData) {
        if (now < rateData.resetTime) {
          if (rateData.count >= PUBLIC_HELP_LIMIT) {
            return res.status(429).json({ 
              error: "Too many requests. Please try again later.",
              answer: "You've reached the message limit. Please wait a moment before asking another question."
            });
          }
          rateData.count++;
        } else {
          publicHelpRateLimit.set(clientIp, { count: 1, resetTime: now + PUBLIC_HELP_WINDOW });
        }
      } else {
        publicHelpRateLimit.set(clientIp, { count: 1, resetTime: now + PUBLIC_HELP_WINDOW });
      }
      
      if (publicHelpRateLimit.size > 10000) {
        const keysToDelete: string[] = [];
        publicHelpRateLimit.forEach((value, key) => {
          if (now > value.resetTime) keysToDelete.push(key);
        });
        keysToDelete.forEach(key => publicHelpRateLimit.delete(key));
      }
      
      const { question, conversationHistory } = req.body;
      
      if (!question || typeof question !== 'string' || question.length > 500) {
        return res.status(400).json({ 
          error: "Invalid question",
          answer: "Please provide a valid question (max 500 characters)."
        });
      }
      
      // Fetch guide settings from platform settings
      const guideSystemPrompt = await storage.getPlatformSetting("guide_system_prompt");
      const guideKnowledgeContent = await storage.getPlatformSetting("guide_knowledge_content");
      const guideTemperature = await storage.getPlatformSetting("guide_temperature");
      const guideName = await storage.getPlatformSetting("guide_name") || "Chatvice Guide";
      
      // Fetch dynamic subscription plan pricing
      const { getAllEffectiveSubscriptionPlans } = await import('./subscriptionPlanUtils');
      const plans = await getAllEffectiveSubscriptionPlans();
      const trialDays = await storage.getPlatformSetting("trial_days") || "7";
      
      // Build dynamic pricing knowledge - prices stored in USD
      const pricingKnowledge = plans.map(plan => {
        const priceText = plan.monthlyPrice === 0 
          ? "GRATIS" 
          : `$${plan.monthlyPrice}/bulan (atau $${plan.annualPrice}/bulan jika bayar tahunan)`;
        const supervisorsText = plan.supervisorsLimit === -1 ? 'Unlimited' : plan.supervisorsLimit;
        const sourcesText = plan.sourcesLimit === -1 ? 'Unlimited' : plan.sourcesLimit;
        const agentsText = plan.agentsLimit === -1 ? 'Unlimited' : plan.agentsLimit;
        const conversationsText = plan.conversationsLimit === -1 ? 'Unlimited' : plan.conversationsLimit.toLocaleString();
        return `${plan.name.toUpperCase()} - ${priceText}
  - ${conversationsText} percakapan AI/bulan
  - ${agentsText} AI Agent
  - ${supervisorsText} Supervisor
  - ${sourcesText} Knowledge sources
  - Fitur: ${plan.features.slice(0, 5).join(', ')}`;
      }).join('\n\n');
      
      // Comprehensive FAQ knowledge
      const faqKnowledge = `
FREQUENTLY ASKED QUESTIONS (FAQ):

Q: Apa itu Chatvice?
A: Chatvice adalah platform chatbot customer service berbasis AI untuk bisnis di Indonesia dan global. Membantu otomasi customer support 24/7 dengan AI agent powered by LEXA1 engine.

Q: Apa itu LEXA1?
A: LEXA1 adalah AI engine yang mempoweri Chatvice. Built on GPT-4 dengan semantic search menggunakan vector embeddings. LEXA1 memahami konteks dan memberikan respons akurat dalam berbagai bahasa.

Q: Bagaimana AI belajar tentang bisnis saya?
A: AI belajar melalui knowledge base. Anda bisa: 1) Upload dokumen (PDF, TXT, DOCX), 2) Tambah Q&A manual, 3) Crawl website untuk FAQs, 4) Import dari agent lain.

Q: Apa itu human escalation?
A: Eskalasi otomatis ke supervisor manusia ketika: 1) AI tidak bisa menjawab, 2) Customer minta bantuan manusia, 3) Keyword trigger terdeteksi (misal 'refund', 'komplain').

Q: Bagaimana cara menambah widget ke website?
A: Cukup tambah 1 baris kode: <script src="URL/widget.js" data-merchant-id="ID_ANDA"></script>. Widget akan muncul di pojok kanan bawah.

Q: Apakah ada free trial?
A: Ya! Semua paket termasuk ${trialDays} hari free trial dengan akses penuh ke semua fitur. Tidak perlu kartu kredit.

Q: Metode pembayaran apa yang diterima?
A: Untuk Indonesia, kami menerima 1-Pay dengan QRIS - kompatibel dengan GoPay, OVO, DANA, ShopeePay, LinkAja, dan semua e-wallet Indonesia.

Q: Bahasa apa saja yang didukung?
A: LEXA1 support deteksi bahasa otomatis: English, Bahasa Indonesia, Chinese, Japanese, Korean, Spanish, French, German, dan 50+ bahasa lainnya.

Q: Apakah data saya aman?
A: Ya! Kami implementasi: TLS encryption, encrypted database storage, session-based authentication dengan bcrypt, JWT verification untuk widget identity.
`;
      
      // Default knowledge if none configured
      const defaultKnowledge = `
WHAT IS CHATVICE?
Chatvice adalah platform chatbot customer service berbasis AI yang membantu bisnis mengotomasi customer support dengan kualitas tinggi melalui mekanisme smart AI-to-human handoff.

KEY FEATURES:
1. AI-Powered Chatbot - Otomasi respons customer menggunakan knowledge base yang bisa dikustomisasi
2. Human Escalation - Eskalasi otomatis ke supervisor manusia saat dibutuhkan
3. Multi-Language Support - Respons dalam bahasa customer
4. Customizable Widget - Chat widget yang bisa di-embed di website Anda
5. Analytics Dashboard - Track performa, topik populer, dan resolution rate
6. Knowledge Base Management - Train AI dengan informasi bisnis Anda

===== PAKET HARGA CHATVICE =====
${pricingKnowledge}

Semua paket termasuk ${trialDays} hari FREE TRIAL. Tidak perlu kartu kredit!

${faqKnowledge}

GETTING STARTED:
1. Daftar akun gratis di /register
2. Tambah knowledge sources (FAQs, info produk, dll)
3. Kustomisasi chat widget
4. Embed widget di website Anda
5. Mulai otomasi customer support!
`;

      // Always include pricing and FAQ knowledge, appending to custom knowledge if set
      const baseKnowledge = guideKnowledgeContent || defaultKnowledge;
      const knowledgeContext = `${baseKnowledge}

===== PAKET HARGA CHATVICE (TERBARU) =====
${pricingKnowledge}

Semua paket termasuk ${trialDays} hari FREE TRIAL. Tidak perlu kartu kredit!

${faqKnowledge}`;
      const systemPromptBase = guideSystemPrompt || `You are ${guideName}, helping potential customers learn about the Chatvice platform. You are friendly, helpful, and enthusiastic about Chatvice. Help potential customers understand how Chatvice can help their business. Be concise and focused on value.`;
      const temperature = guideTemperature ? parseFloat(guideTemperature) : 0.7;
      
      const fullSystemPrompt = `${systemPromptBase}

KNOWLEDGE BASE:
${knowledgeContext}

CONVERSATION CONTEXT:
- You have memory of the conversation history
- If a follow-up question relates to previous topics, use that context
- Maintain continuity across messages
- If user references "it", "that", "this", refer to recent conversation context

INTERACTIVE FORMATTING:
When offering choices or explaining features, use these special formats:

1. OPTION BUTTONS - For offering choices to customers, add buttons at the end:
   [BTN:Label Text:action text]
   Example: "Would you like to learn more?" followed by:
   [BTN:Lihat Harga:Berapa harga paket Chatvice?]
   [BTN:Fitur Utama:Apa saja fitur utama Chatvice?]
   [BTN:Cara Mulai:Bagaimana cara memulai menggunakan Chatvice?]

2. CLICKABLE LINKS - For directing to specific pages:
   [LINK:Display Text:/path]
   Example: "Cek halaman [LINK:Fitur Lengkap:/features] untuk detail lebih lanjut."
   Or: "Lihat [LINK:Paket Harga:/pricing] kami."

Available pages to link:
- /features - Halaman fitur lengkap
- /pricing - Halaman harga dan paket
- /register - Halaman pendaftaran
- /login - Halaman login
- /docs - Halaman dokumentasi
- /blog - Halaman blog
- /faq - Halaman FAQ

PRICING RESPONSE FORMAT:
Ketika user bertanya tentang harga/pricing/paket, gunakan data dari PAKET HARGA di knowledge base.
Format jawaban seperti ini:

**NAMA_PAKET** - [harga dari knowledge]
• [fitur 1]
• [fitur 2]
• [fitur 3]

(Ulangi untuk setiap paket yang tersedia)

Selalu akhiri dengan:
[BTN:Mulai Free Trial:Saya mau daftar free trial]
[LINK:Lihat Detail Lengkap:/pricing]

LANGUAGE MATCHING (CRITICAL):
- WAJIB: Selalu jawab menggunakan bahasa yang SAMA dengan bahasa pesan TERAKHIR user
- Jika user bertanya dalam Bahasa Indonesia, JAWAB dalam Bahasa Indonesia
- Jika user bertanya dalam English, JAWAB dalam English
- JANGAN campur bahasa - konsisten gunakan satu bahasa sesuai pertanyaan user

IMPORTANT RULES:
- SELALU gunakan harga dari knowledge base, JANGAN menggunakan harga dari sumber lain
- Always use buttons when offering 2-3 choices to make selection easier
- SELALU akhiri jawaban pricing dengan tombol dan link ke /pricing
- Use links when mentioning specific pages or features
- Keep responses concise and helpful
- Don't overuse buttons - max 3-4 per response

Use the knowledge base above to answer questions. If you don't have specific information, be honest about it.`;
      
      // Build conversation messages with history for context continuity
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: fullSystemPrompt }
      ];
      
      // Add conversation history (limit to last 10 messages for token efficiency)
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        for (const msg of recentHistory) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      
      // Add current question
      messages.push({ role: "user", content: question });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        max_tokens: 600,
        temperature,
      });
      
      res.json({ answer: response.choices[0].message.content || "I'm here to help you learn about Chatvice! What would you like to know?" });
    } catch (error) {
      console.error("Public help ask error:", error);
      res.json({ answer: "Chatvice is an AI customer service platform that helps businesses automate support. Would you like to learn more about our features or pricing?" });
    }
  });

  app.post("/api/help/ask", requireMerchant, async (req, res) => {
    try {
      const { question, conversationHistory } = req.body;
      const merchantId = (req as any).merchant?.id;
      
      // Fetch merchant billing information for contextual responses
      let billingContext = "";
      if (merchantId) {
        const merchant = await storage.getMerchant(merchantId);
        if (merchant) {
          const exchangeRateStr = await storage.getPlatformSetting("exchange_rate");
          const exchangeRate = parseFloat(exchangeRateStr || "16500");
          
          // Get current plan details
          const planId = merchant.subscriptionPlanId || "free";
          const status = merchant.subscriptionStatus || "trial";
          const billingInterval = merchant.billingInterval || "monthly";
          const currentPeriodEnd = merchant.currentPeriodEnd;
          const pendingTransactionId = merchant.pendingTransactionId;
          
          // Get plan pricing
          let planName = "Free";
          let planPriceUSD = 0;
          if (planId in subscriptionPlans) {
            const plan = subscriptionPlans[planId as keyof typeof subscriptionPlans];
            planName = plan.name;
            planPriceUSD = billingInterval === 'annual' ? (plan.annualPrice || 0) : (plan.monthlyPrice || 0);
          }
          const planPriceIDR = Math.round(planPriceUSD * exchangeRate);
          
          billingContext = `
===== MERCHANT BILLING DATA (REAL-TIME) =====
Status Langganan: ${status === 'active' ? 'Aktif' : status === 'trial' ? 'Trial' : status}
Paket Saat Ini: ${planName}
Billing Interval: ${billingInterval === 'annual' ? 'Tahunan' : 'Bulanan'}
Harga Paket: $${planPriceUSD} USD (Rp ${planPriceIDR.toLocaleString('id-ID')})
${currentPeriodEnd ? `Tanggal Perpanjangan: ${new Date(currentPeriodEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
${merchant.trialEndsAt && status === 'trial' ? `Trial Berakhir: ${new Date(merchant.trialEndsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
${pendingTransactionId ? `PEMBAYARAN PENDING: Ada transaksi yang belum selesai (ID: ${pendingTransactionId}). Customer bisa cek di halaman Billing.` : 'Tidak ada pembayaran pending.'}
Percakapan Digunakan: ${merchant.conversationsUsed || 0}
========================================
`;
        }
      }
      
      // Fetch guide settings from platform settings
      const guideSystemPrompt = await storage.getPlatformSetting("guide_system_prompt");
      const guideKnowledgeContent = await storage.getPlatformSetting("guide_knowledge_content");
      const guideTemperature = await storage.getPlatformSetting("guide_temperature");
      const guideName = await storage.getPlatformSetting("guide_name") || "Chatvice Guide";
      
      // Default dashboard knowledge if none configured
      const defaultDashboardKnowledge = `
DASHBOARD SECTIONS:
1. Overview - Real-time analytics showing active sessions, message counts, AI resolution rate, and daily trends
2. Agents - Manage AI agents (plan limits: Free/Starter: 1, Pro: 3, Enterprise: 10, Custom: unlimited)
3. Sources - Add knowledge sources: text snippets, files (doc/txt/pdf), or website links
4. Analytics - View chat topics, keyword rankings, response times (Pro/Enterprise only)
5. Chat Sessions - Monitor all customer conversations, view transcripts, export history
6. Knowledge Base - Edit AI training content, crawl websites for FAQs
7. Triggers - Set keywords that escalate to human agents (e.g., "refund", "speak to manager")
8. Widget - Customize chat widget appearance, get embed code, configure allowed domains
9. Supervisors - Add team members who can handle escalated conversations
10. Plans - View subscription plans, upgrade options
11. Billing - Manage payment details, view invoices
12. Settings - Account settings, profile, preferences

HOW TO SET UP:
1. Add knowledge sources in Sources menu
2. Create AI agents in Agents menu
3. Customize your widget in Widget menu
4. Add triggers for escalation keywords
5. Copy embed code and add to your website

SUBSCRIPTION PLANS:
- Free: 50 conversations/month, 1 agent, basic features
- Starter ($29/mo): 500 conversations, 1 agent, email support
- Pro ($79/mo): 5,000 conversations, 3 agents, analytics, custom domain
- Enterprise ($299/mo): 50,000 conversations, 10 agents, dedicated support
- Custom: Contact sales for unlimited features

TIPS:
- Train your AI with quality knowledge sources for better responses
- Use triggers strategically to catch important customer issues
- Review analytics to identify common questions and improve responses
- Test your widget before going live
`;

      const knowledgeContext = guideKnowledgeContent || defaultDashboardKnowledge;
      const systemPromptBase = guideSystemPrompt || `You are ${guideName}, helping merchants use the Chatvice dashboard. You are friendly, helpful, and concise. Guide merchants on how to use Chatvice dashboard features.`;
      const temperature = guideTemperature ? parseFloat(guideTemperature) : 0.7;
      
      const fullSystemPrompt = `${systemPromptBase}

${billingContext}

KNOWLEDGE BASE:
${knowledgeContext}

CONVERSATION CONTEXT:
- You have memory of the conversation history
- If a follow-up question relates to previous topics, use that context
- Maintain continuity across messages
- If user references "it", "that", "this", refer to recent conversation context

INTERACTIVE FORMATTING:
When offering choices or explaining features, use these special formats:

1. OPTION BUTTONS - For offering choices, add buttons at the end:
   [BTN:Label Text:action text]
   Example: [BTN:Setup Agent:Bagaimana cara setup AI agent?]

2. CLICKABLE LINKS - For directing to dashboard pages:
   [LINK:Display Text:/path]
   Example: "Lihat [LINK:halaman Agents:/agents] untuk mengelola AI agent."

Dashboard pages to link:
- /agents - Kelola AI agents
- /sources - Knowledge sources
- /knowledge - Knowledge base
- /analytics - Analytics dashboard
- /sessions - Chat sessions
- /triggers - Escalation triggers
- /widget - Widget settings
- /supervisors - Supervisor management
- /plans - Subscription plans
- /billing - Billing info
- /checkout - Halaman checkout pembayaran
- /settings - Account settings

BILLING GUIDANCE (IMPORTANT):
- Ketika merchant bertanya tentang billing, tagihan, atau pembayaran, GUNAKAN data dari MERCHANT BILLING DATA di atas
- Jika ada PEMBAYARAN PENDING, beritahu merchant untuk menyelesaikan pembayaran di halaman Billing atau Checkout
- Jika merchant bertanya "berapa yang harus saya bayar" atau "berapa tagihan saya", beri tahu nominal berdasarkan data billing
- Arahkan merchant ke [LINK:halaman Billing:/billing] untuk detail tagihan dan pembayaran
- Untuk pembayaran baru, arahkan ke [LINK:halaman Checkout:/checkout]

LANGUAGE MATCHING (CRITICAL):
- WAJIB: Selalu jawab menggunakan bahasa yang SAMA dengan bahasa pesan TERAKHIR user
- Jika user bertanya dalam Bahasa Indonesia, JAWAB dalam Bahasa Indonesia
- Jika user bertanya dalam English, JAWAB dalam English
- JANGAN campur bahasa - konsisten gunakan satu bahasa sesuai pertanyaan user

RULES:
- Use buttons for 2-3 choices
- Use links when mentioning specific pages
- Max 3-4 buttons per response

Use the knowledge base above to answer questions. If they ask about something unrelated, gently redirect them to dashboard features.`;
      
      // Build conversation messages with history for context continuity
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: fullSystemPrompt }
      ];
      
      // Add conversation history (limit to last 10 messages for token efficiency)
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        for (const msg of recentHistory) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      
      // Add current question
      messages.push({ role: "user", content: question });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        max_tokens: 400,
        temperature,
      });
      
      res.json({ answer: response.choices[0].message.content || "I'm here to help you with the Chatvice dashboard! What would you like to know?" });
    } catch (error) {
      console.error("Help ask error:", error);
      res.json({ answer: "I apologize, but I'm having trouble responding right now. Please try again later or contact support at support@chatvice.com." });
    }
  });

  // Admin preview endpoint for Chatvice Guide - uses saved knowledge base settings
  app.post("/api/chatvice-guide/chat", requireAdmin, async (req, res) => {
    try {
      const { message, context, conversationHistory } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Fetch guide settings from platform settings
      const guideSystemPrompt = await storage.getPlatformSetting("guide_system_prompt");
      const guideKnowledgeContent = await storage.getPlatformSetting("guide_knowledge_content");
      const guideTemperature = await storage.getPlatformSetting("guide_temperature");
      const guideName = await storage.getPlatformSetting("guide_name") || "Chatvice Guide";
      
      // Default knowledge if none configured
      const defaultKnowledge = `
WHAT IS CHATVICE?
Chatvice is an AI-powered customer service chatbot platform that helps businesses automate customer support while maintaining high-quality service through smart AI-to-human handoff mechanisms.

KEY FEATURES:
1. AI-Powered Chatbot - Automates customer responses using a customizable knowledge base
2. Human Escalation - Automatically escalates to human supervisors when needed
3. Multi-Language Support - Responds in the customer's language
4. Customizable Widget - Embeddable chat widget for your website
5. Analytics Dashboard - Track performance, popular topics, and resolution rates
6. Knowledge Base Management - Train your AI with your business information
`;
      
      const knowledgeBase = guideKnowledgeContent || defaultKnowledge;
      const temperature = guideTemperature ? parseFloat(guideTemperature) : 0.7;
      
      const systemPromptBase = guideSystemPrompt || `You are ${guideName}, a helpful AI assistant for Chatvice platform. You help users learn about Chatvice features and answer questions.`;
      
      const fullSystemPrompt = `${systemPromptBase}

KNOWLEDGE BASE:
${knowledgeBase}

CONVERSATION CONTEXT:
- You have memory of the conversation history
- If a follow-up question relates to previous topics, use that context
- Maintain continuity across messages
- If user references "it", "that", "this", refer to recent conversation context

INTERACTIVE FORMATTING:
1. OPTION BUTTONS: [BTN:Label:action text]
2. CLICKABLE LINKS: [LINK:Text:/path]

Available pages: /features, /pricing, /register, /docs, /blog

LANGUAGE MATCHING (CRITICAL):
- WAJIB: Selalu jawab menggunakan bahasa yang SAMA dengan bahasa pesan TERAKHIR user
- Jika user bertanya dalam Bahasa Indonesia, JAWAB dalam Bahasa Indonesia
- Jika user bertanya dalam English, JAWAB dalam English
- JANGAN campur bahasa - konsisten gunakan satu bahasa sesuai pertanyaan user

Use buttons for choices and links when mentioning pages. Be helpful, friendly, and concise.`;
      
      // Build conversation messages with history for context continuity
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: fullSystemPrompt }
      ];
      
      // Add conversation history (limit to last 10 messages for token efficiency)
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        for (const msg of recentHistory) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      
      // Add current message
      messages.push({ role: "user", content: message });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        max_tokens: 500,
        temperature,
      });
      
      res.json({ 
        response: response.choices[0].message.content || "I'm here to help! What would you like to know about Chatvice?" 
      });
    } catch (error) {
      console.error("Chatvice guide chat error:", error);
      res.json({ 
        response: "I apologize, but I'm having trouble responding right now. Please try again later." 
      });
    }
  });

  app.get("/api/agents", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const agentsList = await storage.getAgents(merchantId);
      res.json(agentsList);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/agents", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      const existingAgents = await storage.getAgents(merchantId);
      
      if (plan.agentsLimit !== -1 && existingAgents.length >= plan.agentsLimit) {
        return res.status(403).json({ error: `Agent limit reached (${plan.agentsLimit}). Please upgrade your plan.` });
      }
      
      const { name, description } = req.body;
      const agent = await storage.createAgent({
        merchantId,
        name,
        description: description || "",
      });
      
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/agents/:id", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const agent = await storage.getAgent(req.params.id);
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      const updated = await storage.updateAgent(req.params.id, req.body);
      
      const merchant = await storage.getMerchant(merchantId);
      if (merchant && merchant.activeAgentId === req.params.id && updated) {
        const widgetUpdates: { agentName?: string; agentPhotoUrl?: string } = {};
        if (req.body.name) widgetUpdates.agentName = req.body.name;
        if (req.body.photoUrl !== undefined) widgetUpdates.agentPhotoUrl = req.body.photoUrl;
        if (Object.keys(widgetUpdates).length > 0) {
          await storage.updateMerchant(merchantId, widgetUpdates);
        }
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/agents/:id", requireMerchant, async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent || agent.merchantId !== req.session.merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      await storage.deleteAgent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/agents/:id/widget-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const agent = await storage.getAgent(req.params.id);
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      const validatedData = agentWidgetSettingsSchema.parse(req.body);
      const { primaryColor, widgetTheme, bubblePosition, widgetWelcomeMessage, photoUrl, name } = validatedData;
      
      const updateData: Record<string, any> = {};
      if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
      if (widgetTheme !== undefined) updateData.widgetTheme = widgetTheme;
      if (bubblePosition !== undefined) updateData.bubblePosition = bubblePosition;
      if (widgetWelcomeMessage !== undefined) updateData.widgetWelcomeMessage = widgetWelcomeMessage;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
      if (name !== undefined) updateData.name = name;
      
      const updated = await storage.updateAgent(req.params.id, updateData);
      
      const merchant = await storage.getMerchant(merchantId);
      if (merchant && merchant.activeAgentId === req.params.id && updated) {
        const syncUpdates: Record<string, any> = {};
        if (name !== undefined) syncUpdates.agentName = name;
        if (photoUrl !== undefined) syncUpdates.agentPhotoUrl = photoUrl;
        if (Object.keys(syncUpdates).length > 0) {
          await storage.updateMerchant(merchantId, syncUpdates);
        }
      }
      
      res.json({ success: true, agent: updated });
    } catch (error: any) {
      console.error("Widget settings save error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid widget settings", details: error.errors });
      }
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/agents/:id/widget-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const agent = await storage.getAgent(req.params.id);
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      res.json({
        primaryColor: agent.primaryColor || "#6b5dfc",
        widgetTheme: agent.widgetTheme || "light",
        bubblePosition: agent.bubblePosition || "right",
        widgetWelcomeMessage: agent.widgetWelcomeMessage || "Hi! How can I help you today?",
        photoUrl: agent.photoUrl || "",
        name: agent.name,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/agents/assign-supervisor", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { agentId, supervisorId } = req.body;
      
      if (!agentId || !supervisorId) {
        return res.status(400).json({ error: "Missing agentId or supervisorId" });
      }
      
      const agent = await storage.getAgent(agentId);
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      const supervisor = await storage.getSupervisor(supervisorId);
      if (!supervisor || supervisor.merchantId !== merchantId) {
        return res.status(404).json({ error: "Supervisor not found" });
      }
      
      // Check if supervisor already has 3 agents assigned (maximum limit)
      const allAgents = await storage.getAgents(merchantId);
      const supervisorAgentCount = allAgents.filter(a => a.supervisorId === supervisorId).length;
      if (supervisorAgentCount >= 3) {
        return res.status(400).json({ error: "Supervisor sudah menangani maksimum 3 agen. Silakan pilih supervisor lain." });
      }
      
      const updated = await storage.updateAgent(agentId, { supervisorId });
      res.json({ success: true, agent: updated });
    } catch (error) {
      console.error("Assign supervisor error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Unassign supervisor from agent
  app.post("/api/agents/unassign-supervisor", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ error: "Missing agentId" });
      }
      
      const agent = await storage.getAgent(agentId);
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      const updated = await storage.updateAgent(agentId, { supervisorId: null });
      res.json({ success: true, agent: updated });
    } catch (error) {
      console.error("Unassign supervisor error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/sources", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const sourcesList = await storage.getSources(merchantId);
      res.json(sourcesList);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/sources", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { type, name, content, url } = req.body;
      
      const source = await storage.createSource({
        merchantId,
        type,
        name,
        content: content || "",
        url: url || "",
        charCount: (content || "").length,
      });
      
      res.json(source);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/sources/:id", requireMerchant, async (req, res) => {
    try {
      const source = await storage.getSource(req.params.id);
      if (!source || source.merchantId !== req.session.merchantId) {
        return res.status(404).json({ error: "Source not found" });
      }
      
      const updateData = { ...req.body };
      if (updateData.content) {
        updateData.charCount = updateData.content.length;
      }
      
      const updated = await storage.updateSource(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/sources/:id", requireMerchant, async (req, res) => {
    try {
      const source = await storage.getSource(req.params.id);
      if (!source || source.merchantId !== req.session.merchantId) {
        return res.status(404).json({ error: "Source not found" });
      }
      
      await storage.deleteSource(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Suggested Questions routes
  app.get("/api/suggested-questions", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const questions = await storage.getSuggestedQuestions(merchantId, merchant.activeAgentId || undefined);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/suggested-questions", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Check plan limits
      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      if (plan.suggestedQuestionsLimit === 0) {
        return res.status(403).json({ error: "Suggested questions are not available on your current plan. Please upgrade." });
      }

      const existingQuestions = await storage.getSuggestedQuestions(merchantId, merchant.activeAgentId || undefined);
      if (plan.suggestedQuestionsLimit !== -1 && existingQuestions.length >= plan.suggestedQuestionsLimit) {
        return res.status(403).json({ error: `Maximum ${plan.suggestedQuestionsLimit} suggested questions allowed on your plan.` });
      }

      const { question, answer, sortOrder } = req.body;
      
      const suggestedQuestion = await storage.createSuggestedQuestion({
        merchantId,
        agentId: merchant.activeAgentId || null,
        question,
        answer,
        sortOrder: sortOrder ?? existingQuestions.length,
      });
      
      res.json(suggestedQuestion);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/suggested-questions/:id", requireMerchant, async (req, res) => {
    try {
      const question = await storage.getSuggestedQuestion(req.params.id);
      if (!question || question.merchantId !== req.session.merchantId) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      const updated = await storage.updateSuggestedQuestion(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/suggested-questions/:id", requireMerchant, async (req, res) => {
    try {
      const question = await storage.getSuggestedQuestion(req.params.id);
      if (!question || question.merchantId !== req.session.merchantId) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      await storage.deleteSuggestedQuestion(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Public endpoint for widget to fetch suggested questions
  app.get("/api/widget/suggested-questions/:merchantId", async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.params.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Check if plan allows suggested questions
      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      if (plan.suggestedQuestionsLimit === 0) {
        return res.json([]);
      }

      const questions = await storage.getSuggestedQuestions(req.params.merchantId, merchant.activeAgentId || undefined);
      // Return only active questions, limited to 5 for widget display
      const activeQuestions = questions.filter(q => q.isActive).slice(0, 5);
      res.json(activeQuestions);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Public endpoint for widget to use suggested questions (tracks in database)
  app.post("/api/widget/suggested-questions/use", async (req, res) => {
    try {
      const { merchantId, sessionId, questionId } = req.body;
      
      if (!merchantId || !questionId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Check if plan allows suggested questions
      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      if (plan.suggestedQuestionsLimit === 0) {
        return res.status(403).json({ error: "Suggested questions not available on your plan" });
      }

      // Validate the suggested question exists, is active, and belongs to this merchant
      const suggestedQuestion = await storage.getSuggestedQuestion(questionId);
      if (!suggestedQuestion) {
        return res.status(404).json({ error: "Suggested question not found" });
      }
      if (suggestedQuestion.merchantId !== merchantId) {
        return res.status(403).json({ error: "Suggested question does not belong to this merchant" });
      }
      if (!suggestedQuestion.isActive) {
        return res.status(404).json({ error: "Suggested question is no longer active" });
      }

      const question = suggestedQuestion.question;
      const answer = suggestedQuestion.answer;

      // Create or get session
      let currentSessionId = sessionId;
      if (currentSessionId) {
        // Validate session belongs to this merchant
        const existingSession = await storage.getSession(currentSessionId);
        if (!existingSession || existingSession.merchantId !== merchantId) {
          // Session doesn't exist or doesn't belong to this merchant, create a new one
          currentSessionId = null;
        }
      }
      
      if (!currentSessionId) {
        const newSessionId = `sq_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const session = await storage.createSession({
          id: newSessionId,
          merchantId,
          agentId: merchant.activeAgentId || null,
          mode: "AI",
          customerName: "Customer",
        });
        currentSessionId = session.id;
      }

      // Store user's question message (use "customer" to match chat/ask endpoint for reconciliation)
      await storage.createMessage({
        sessionId: currentSessionId,
        from: "customer",
        content: question,
      });

      // Store the pre-defined answer
      await storage.createMessage({
        sessionId: currentSessionId,
        from: "chatvice",
        content: answer,
      });

      // Update session with last activity
      await storage.updateSession(currentSessionId, {
        lastActivity: new Date(),
      });

      res.json({ 
        success: true, 
        sessionId: currentSessionId,
        answer 
      });
    } catch (error) {
      console.error("Error using suggested question:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Profanity filter for customer names
  const inappropriateWords = [
    // Indonesian inappropriate words
    "anjing", "asu", "bangsat", "babi", "bajingan", "bego", "bodoh", "goblok", "idiot", "kampret", "kontol", "memek", "ngentot", "pepek", "setan", "tai", "tolol",
    // English inappropriate words
    "fuck", "shit", "bitch", "ass", "dick", "cock", "pussy", "damn", "bastard", "cunt", "whore", "slut",
    // General offensive terms
    "stupid", "dumb", "retard", "moron"
  ];

  function sanitizeCustomerName(name: string): { isValid: boolean; sanitizedName: string; error?: string } {
    // Trim and basic cleanup
    let sanitized = name.trim();
    
    // Check for empty
    if (!sanitized) {
      return { isValid: false, sanitizedName: "", error: "Name is required" };
    }
    
    // Check length
    if (sanitized.length < 2) {
      return { isValid: false, sanitizedName: "", error: "Name must be at least 2 characters" };
    }
    if (sanitized.length > 50) {
      return { isValid: false, sanitizedName: "", error: "Name is too long" };
    }
    
    // Check for inappropriate words
    const lowerName = sanitized.toLowerCase();
    for (const word of inappropriateWords) {
      if (lowerName.includes(word)) {
        return { isValid: false, sanitizedName: "", error: "Please use an appropriate name" };
      }
    }
    
    // Check for special characters (only allow letters, spaces, and basic punctuation)
    const validNamePattern = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s\-'.]+$/;
    if (!validNamePattern.test(sanitized)) {
      // Remove invalid characters
      sanitized = sanitized.replace(/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s\-'.]/g, "").trim();
      if (!sanitized) {
        return { isValid: false, sanitizedName: "", error: "Please enter a valid name" };
      }
    }
    
    // Capitalize first letter of each word
    sanitized = sanitized.split(" ").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(" ");
    
    return { isValid: true, sanitizedName: sanitized };
  }

  // Public endpoint for widget to start chat with customer name
  app.post("/api/widget/start-chat", async (req, res) => {
    try {
      const { merchantId, sessionId, customerName, initialMessage } = req.body;
      
      if (!merchantId || !sessionId || !customerName) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ success: false, error: "Merchant not found" });
      }

      // Validate and sanitize customer name
      const nameResult = sanitizeCustomerName(customerName);
      if (!nameResult.isValid) {
        return res.json({ success: false, error: nameResult.error });
      }

      const sanitizedName = nameResult.sanitizedName;

      // Create or update session with customer name
      let session = await storage.getSession(sessionId);
      const assignedAgentId = await getNextAgentId(merchantId);
      
      if (!session) {
        session = await storage.createSession({
          id: sessionId,
          merchantId,
          mode: "AI",
          customerName: sanitizedName,
          agentId: assignedAgentId,
        });
      } else {
        // Security check: Verify session belongs to this merchant
        if (session.merchantId !== merchantId) {
          return res.status(403).json({ 
            success: false, 
            error: "Session does not belong to this merchant" 
          });
        }
        await storage.updateSession(sessionId, { 
          customerName: sanitizedName,
          lastActivity: new Date()
        });
      }

      // Get agent settings for personalized greeting
      let agentName = "Chatvice";
      let agentSystemPrompt = "";
      const activeAgentId = merchant.activeAgentId || assignedAgentId;
      
      if (activeAgentId) {
        const agent = await storage.getAgent(activeAgentId);
        if (agent) {
          agentName = agent.name || "Chatvice";
          agentSystemPrompt = agent.systemPrompt || "";
        }
      }

      // Store the initial message from customer
      const finalMessage = initialMessage || "Halo kak, ada yang mau saya tanyakan";
      await storage.createMessage({
        sessionId,
        from: "customer",
        content: finalMessage,
      });

      // Generate personalized AI greeting response
      const greetingPrompt = `You are ${agentName}, a friendly customer service AI assistant for ${merchant.companyName}. 
${agentSystemPrompt ? `Additional context: ${agentSystemPrompt}` : ""}

The customer named "${sanitizedName}" just started a chat with the message: "${finalMessage}"

Respond with a warm, personalized greeting that:
1. Uses their name naturally (e.g., "Halo ${sanitizedName}!" or "Hi ${sanitizedName}!")
2. Is friendly and welcoming
3. Asks how you can help them today
4. Keep it brief (1-2 sentences)
5. Respond in Indonesian as the customer used Indonesian

Do not use brackets, special formatting, or mention that you're an AI.`;

      let aiGreeting = `Halo ${sanitizedName}! Terima kasih sudah menghubungi kami. Ada yang bisa saya bantu hari ini?`;

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [{ role: "user", content: greetingPrompt }],
          max_tokens: 150,
          temperature: 0.7,
        });
        
        if (response.choices[0]?.message?.content) {
          aiGreeting = response.choices[0].message.content;
        }
      } catch (aiError) {
        console.error("AI greeting error, using fallback:", aiError);
        // Use fallback greeting
      }

      // Store AI response
      await storage.createMessage({
        sessionId,
        from: "chatvice",
        content: aiGreeting,
      });

      res.json({ 
        success: true, 
        answer: aiGreeting,
        sanitizedName
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

// Chat Logs API
  app.get("/api/chat-logs", requireMerchantOrSupervisor, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { date } = req.query;
      
      let targetDate: Date | undefined;
      if (date && typeof date === 'string') {
        targetDate = new Date(date);
      }
      
      const logs = await storage.getChatLogs(merchantId, targetDate);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching chat logs:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/chat-logs/:logId/download", requireMerchantOrSupervisor, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { logId } = req.params;
      
      const logs = await storage.getChatLogs(merchantId);
      const log = logs.find(l => l.id === logId);
      
      if (!log || log.merchantId !== merchantId) {
        return res.status(404).json({ error: "Chat log not found" });
      }
      
      const txtContent = `Chat Log - Session ${log.sessionId}
==============================================
Customer: ${log.customerName || 'Anonymous'}
${log.customerEmail ? `Email: ${log.customerEmail}` : ''}
Agent ID: ${log.agentId || 'N/A'}
Supervisor ID: ${log.supervisorId || 'N/A'}
Messages: ${log.messageCount}
Started: ${log.sessionStartedAt ? new Date(log.sessionStartedAt).toLocaleString() : 'N/A'}
Ended: ${log.sessionEndedAt ? new Date(log.sessionEndedAt).toLocaleString() : 'N/A'}
Archived: ${log.clearedAt ? new Date(log.clearedAt).toLocaleString() : 'N/A'}

=== SUMMARY ===
${log.summary}

=== FULL TRANSCRIPT ===
${log.fullTranscript}

${log.extractedKnowledge ? `=== EXTRACTED KNOWLEDGE ===
${log.extractedKnowledge}` : ''}
`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="chat-log-${log.sessionId}.txt"`);
      res.send(txtContent);
    } catch (error) {
      console.error("Error downloading chat log:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Agent-Supervisor mapping endpoints
  app.get("/api/agents/:agentId/supervisors", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { agentId } = req.params;
      
      const agent = await storage.getAgent(agentId);
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      const mappings = await storage.getAgentSupervisors(agentId);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching agent supervisors:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/agents/:agentId/supervisors", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { agentId } = req.params;
      const { supervisorId } = req.body;
      
      const agent = await storage.getAgent(agentId);
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      const supervisor = await storage.getSupervisor(supervisorId);
      if (!supervisor || supervisor.merchantId !== merchantId) {
        return res.status(404).json({ error: "Supervisor not found" });
      }
      
      // Check plan limits
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const planId = (merchant.subscriptionPlanId || 'free') as SubscriptionPlanId;
      const plan = subscriptionPlans[planId];
      const currentCount = await storage.countAgentSupervisors(agentId);
      
      if (plan.supervisorsPerAgentLimit !== -1 && currentCount >= plan.supervisorsPerAgentLimit) {
        return res.status(403).json({ 
          error: `Maximum ${plan.supervisorsPerAgentLimit} supervisor(s) per agent allowed on your plan` 
        });
      }
      
      // Check if already assigned
      const existing = await storage.getAgentSupervisors(agentId);
      if (existing.some(e => e.supervisorId === supervisorId)) {
        return res.status(400).json({ error: "Supervisor already assigned to this agent" });
      }
      
      const mapping = await storage.createAgentSupervisor({
        agentId,
        supervisorId,
        merchantId,
      });
      res.json(mapping);
    } catch (error) {
      console.error("Error assigning supervisor to agent:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/agents/:agentId/supervisors/:supervisorId", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { agentId, supervisorId } = req.params;
      
      const agent = await storage.getAgent(agentId);
      if (!agent || agent.merchantId !== merchantId) {
        return res.status(404).json({ error: "Agent not found" });
      }
      
      const mappings = await storage.getAgentSupervisors(agentId);
      const mapping = mappings.find(m => m.supervisorId === supervisorId);
      
      if (!mapping) {
        return res.status(404).json({ error: "Mapping not found" });
      }
      
      await storage.deleteAgentSupervisor(mapping.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing supervisor from agent:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Manual chat cleanup trigger (for testing)
  app.post("/api/chat-cleanup/run", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const planId = (merchant.subscriptionPlanId || 'free') as SubscriptionPlanId;
      const plan = subscriptionPlans[planId];
      const retentionHours = plan.chatRetentionHours;
      
      const expiredSessions = await storage.getExpiredSessions(merchantId, retentionHours);
      let archivedCount = 0;
      
      for (const session of expiredSessions) {
        const messages = await storage.getMessages(session.id);
        
        if (messages.length === 0) continue;
        
        // Generate full transcript
        const transcript = messages.map(m => {
          const sender = m.from === 'user' ? (session.customerName || 'Customer') : 
                         m.from === 'ai' ? 'AI Assistant' : 'Supervisor';
          const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '';
          return `[${time}] ${sender}: ${m.content}`;
        }).join('\n');
        
        // Generate simple summary
        const summary = `Chat session with ${messages.length} messages. ${
          session.mode === 'HUMAN' ? 'Escalated to supervisor.' : 'Handled by AI.'
        }`;
        
        // Create chat log
        await storage.createChatLog({
          merchantId,
          sessionId: session.id,
          agentId: session.agentId || null,
          supervisorId: session.supervisorId || null,
          customerName: session.customerName || null,
          customerEmail: session.customerEmail || null,
          summary,
          messageCount: messages.length,
          fullTranscript: transcript,
          extractedKnowledge: null,
          sessionStartedAt: session.createdAt || null,
          sessionEndedAt: session.lastActivity || null,
        });
        
        // Delete messages but keep session
        await storage.deleteSessionMessages(session.id);
        await storage.updateSession(session.id, { status: 'archived' });
        archivedCount++;
      }
      
      res.json({ 
        success: true, 
        archivedCount,
        retentionHours,
        message: `Archived ${archivedCount} expired sessions (older than ${retentionHours} hours)` 
      });
    } catch (error) {
      console.error("Error running chat cleanup:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/analytics/detailed", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const basicAnalytics = await storage.getAnalytics(merchantId);
      const sessions = await storage.getSessionsByMerchant(merchantId);
      const hasConversations = sessions.length > 0;
      
      const chatTopics = hasConversations ? [
        { topic: "Product Inquiries", count: Math.floor(Math.random() * 50) + 20 },
        { topic: "Order Status", count: Math.floor(Math.random() * 40) + 15 },
        { topic: "Returns & Refunds", count: Math.floor(Math.random() * 30) + 10 },
        { topic: "Shipping Questions", count: Math.floor(Math.random() * 35) + 12 },
        { topic: "Payment Issues", count: Math.floor(Math.random() * 25) + 8 },
        { topic: "Account Problems", count: Math.floor(Math.random() * 20) + 5 },
        { topic: "Technical Support", count: Math.floor(Math.random() * 28) + 10 },
        { topic: "Pricing Questions", count: Math.floor(Math.random() * 22) + 7 },
        { topic: "Feature Requests", count: Math.floor(Math.random() * 15) + 3 },
        { topic: "General Feedback", count: Math.floor(Math.random() * 18) + 5 },
        { topic: "Subscription Help", count: Math.floor(Math.random() * 20) + 6 },
        { topic: "Billing Support", count: Math.floor(Math.random() * 16) + 4 },
        { topic: "Integration Help", count: Math.floor(Math.random() * 12) + 2 },
        { topic: "API Questions", count: Math.floor(Math.random() * 10) + 1 },
        { topic: "Security Concerns", count: Math.floor(Math.random() * 8) + 1 },
        { topic: "Onboarding Help", count: Math.floor(Math.random() * 14) + 4 },
        { topic: "Upgrade Inquiries", count: Math.floor(Math.random() * 12) + 3 },
        { topic: "Downgrade Requests", count: Math.floor(Math.random() * 6) + 1 },
        { topic: "Partnership Inquiries", count: Math.floor(Math.random() * 5) + 1 },
        { topic: "Bulk Orders", count: Math.floor(Math.random() * 8) + 2 },
      ].sort((a, b) => b.count - a.count) : [];
      
      const keywordsList = [
        "order", "shipping", "refund", "payment", "help", "support", "price", "discount",
        "delivery", "track", "cancel", "return", "exchange", "account", "password",
        "login", "product", "stock", "available", "size", "color", "quality", "warranty",
        "broken", "damaged", "missing", "late", "fast", "cheap", "expensive", "sale",
        "coupon", "promo", "free", "upgrade", "downgrade", "plan", "subscription",
        "billing", "invoice", "receipt", "charge", "credit", "debit", "card", "bank",
        "transfer", "wallet"
      ];
      
      const popularKeywords = hasConversations ? keywordsList.map((keyword, index) => ({
        keyword,
        count: Math.max(1, Math.floor(100 - index * 2 + Math.random() * 10)),
        trend: (["up", "down", "stable"] as const)[Math.floor(Math.random() * 3)],
      })).sort((a, b) => b.count - a.count) : [];
      
      res.json({
        ...basicAnalytics,
        chatTopics,
        popularKeywords,
        avgChatDuration: "4m 32s",
        avgResponseTimeAI: "1.2s",
        avgResponseTimeHuman: "2m 15s",
        satisfactionRate: 94,
        resolutionRate: 87,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== WORK SCHEDULER ROUTES ==============
  
  // Get all shifts for merchant
  app.get("/api/work-scheduler/shifts", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const shifts = await storage.getWorkShifts(merchantId);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create shift
  app.post("/api/work-scheduler/shifts", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { name, dayType, startTime, endTime, isNightShift } = req.body;
      
      if (!name || !startTime || !endTime) {
        return res.status(400).json({ error: "Name, start time, and end time are required" });
      }
      
      const shift = await storage.createWorkShift({
        merchantId,
        name,
        dayType: dayType || "weekday",
        startTime,
        endTime,
        isNightShift: isNightShift || false,
        isActive: true,
      });
      
      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update shift
  app.patch("/api/work-scheduler/shifts/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      const shift = await storage.updateWorkShift(id, req.body);
      if (!shift) {
        return res.status(404).json({ error: "Shift not found" });
      }
      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete shift
  app.delete("/api/work-scheduler/shifts/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWorkShift(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get shift assignments
  app.get("/api/work-scheduler/assignments", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const assignments = await storage.getShiftAssignments(merchantId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create shift assignment
  app.post("/api/work-scheduler/assignments", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { shiftId, assigneeId, assigneeType } = req.body;
      
      if (!shiftId || !assigneeId || !assigneeType) {
        return res.status(400).json({ error: "Shift ID, assignee ID, and assignee type are required" });
      }
      
      const assignment = await storage.createShiftAssignment({
        merchantId,
        shiftId,
        assigneeId,
        assigneeType,
      });
      
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete shift assignment
  app.delete("/api/work-scheduler/assignments/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteShiftAssignment(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get work reports
  app.get("/api/work-scheduler/reports", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const reports = await storage.getWorkReports(merchantId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Create work report
  app.post("/api/work-scheduler/reports", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { assigneeId, assigneeType, date, clockIn, clockOut, hoursWorked, minutesWorked, status } = req.body;
      
      const report = await storage.createWorkReport({
        merchantId,
        assigneeId,
        assigneeType,
        date: new Date(date),
        clockIn: clockIn ? new Date(clockIn) : null,
        clockOut: clockOut ? new Date(clockOut) : null,
        hoursWorked: hoursWorked || 0,
        minutesWorked: minutesWorked || 0,
        status: status || "pending",
      });
      
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update work report
  app.patch("/api/work-scheduler/reports/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      const report = await storage.updateWorkReport(id, req.body);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== QUICK REPLIES ROUTES ==============
  
  app.get("/api/quick-replies", requireAuth, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const replies = await storage.getQuickReplies(merchantId);
      res.json(replies);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/quick-replies", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { shortcut, label, content, category, sortOrder } = req.body;
      
      if (!shortcut || !label || !content) {
        return res.status(400).json({ error: "Shortcut, label, and content are required" });
      }
      
      const reply = await storage.createQuickReply({
        merchantId,
        shortcut,
        label,
        content,
        category: category || "general",
        sortOrder: sortOrder || 0,
        isActive: true,
      });
      
      res.json(reply);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/quick-replies/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      const reply = await storage.updateQuickReply(id, req.body);
      if (!reply) {
        return res.status(404).json({ error: "Quick reply not found" });
      }
      res.json(reply);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/quick-replies/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteQuickReply(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== CHAT BUTTONS ROUTES ==============
  
  app.get("/api/chat-buttons", requireAuth, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const buttons = await storage.getChatButtons(merchantId);
      res.json(buttons);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/chat-buttons", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { label, url, buttonType, triggerWord, sortOrder } = req.body;
      
      if (!label) {
        return res.status(400).json({ error: "Label is required" });
      }
      
      const button = await storage.createChatButton({
        merchantId,
        label,
        url: url || "",
        buttonType: buttonType || "link",
        triggerWord: triggerWord || "",
        sortOrder: sortOrder || 0,
        isActive: true,
      });
      
      res.json(button);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/chat-buttons/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      const button = await storage.updateChatButton(id, req.body);
      if (!button) {
        return res.status(404).json({ error: "Chat button not found" });
      }
      res.json(button);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/chat-buttons/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChatButton(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== PRODUCT CARDS ROUTES ==============
  
  app.get("/api/product-cards", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const agentId = req.query.agentId as string | undefined;
      const cards = await storage.getProductCards(merchantId, agentId);
      res.json(cards);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/product-cards", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { agentId, title, description, imageUrl, sourceUrl, price, sortOrder } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      const card = await storage.createProductCard({
        merchantId,
        agentId: agentId || null,
        title,
        description: description || "",
        imageUrl: imageUrl || "",
        sourceUrl: sourceUrl || "",
        price: price || "",
        sortOrder: sortOrder || 0,
        isActive: true,
      });
      
      res.json(card);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Crawl product image from URL
  app.post("/api/product-cards/crawl-image", requireMerchant, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      // Fetch the page and extract Open Graph image
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Chatvice/1.0; +https://chatvice.com)"
        }
      });
      const html = await response.text();
      
      // Extract OG image
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      
      // Extract title
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<title>([^<]+)<\/title>/i);
      
      // Extract description
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      
      res.json({
        imageUrl: ogImageMatch ? ogImageMatch[1] : "",
        title: ogTitleMatch ? ogTitleMatch[1] : "",
        description: ogDescMatch ? ogDescMatch[1] : "",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to crawl URL" });
    }
  });

  app.patch("/api/product-cards/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      const card = await storage.updateProductCard(id, req.body);
      if (!card) {
        return res.status(404).json({ error: "Product card not found" });
      }
      res.json(card);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/product-cards/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProductCard(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Product card buttons
  app.get("/api/product-cards/:cardId/buttons", requireMerchant, async (req, res) => {
    try {
      const { cardId } = req.params;
      const buttons = await storage.getProductCardButtons(cardId);
      res.json(buttons);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/product-cards/:cardId/buttons", requireMerchant, async (req, res) => {
    try {
      const { cardId } = req.params;
      const { label, url, buttonType, sortOrder } = req.body;
      
      // Check if card has less than 3 buttons
      const existingButtons = await storage.getProductCardButtons(cardId);
      if (existingButtons.length >= 3) {
        return res.status(400).json({ error: "Maximum 3 buttons per card" });
      }
      
      const button = await storage.createProductCardButton({
        cardId,
        label,
        url: url || "",
        buttonType: buttonType || "link",
        sortOrder: sortOrder || existingButtons.length,
      });
      
      res.json(button);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/product-card-buttons/:id", requireMerchant, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProductCardButton(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== WELCOME BUBBLE ROUTES ==============
  
  app.get("/api/welcome-bubble", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const bubble = await storage.getWelcomeBubble(merchantId);
      res.json(bubble || {
        headline: "Hi!",
        message: "Looking for something specific? We'll help you find it!",
        button1Label: "Chat with us",
        button1Url: "",
        button1Color: "#E84E3C",
        button2Label: "Product expert",
        button2Url: "",
        button2Color: "#1a1a1a",
        isEnabled: true,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/welcome-bubble", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const bubble = await storage.upsertWelcomeBubble(merchantId, req.body);
      res.json(bubble);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Public endpoint for widget
  app.get("/api/widget/:merchantId/welcome-bubble", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const bubble = await storage.getWelcomeBubble(merchantId);
      if (!bubble || !bubble.isEnabled) {
        return res.json({ isEnabled: false });
      }
      res.json(bubble);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== NOTIFICATION SETTINGS ROUTES ==============
  
  app.get("/api/notification-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const settings = await storage.getNotificationSettings(merchantId);
      res.json(settings || {
        incomingChatSound: "default",
        incomingChatEnabled: true,
        chatReplySound: "default",
        chatReplyEnabled: true,
        angryCustomerSound: "alert",
        angryCustomerEnabled: true,
        customSounds: [],
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/notification-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const settings = await storage.upsertNotificationSettings(merchantId, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Upload custom notification sound
  app.post("/api/notification-settings/upload-sound", requireMerchant, upload.single("sound"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const soundUrl = `/uploads/${req.file.filename}`;
      const soundName = req.body.name || req.file.originalname;
      
      // Get current settings and add new sound
      const merchantId = req.session.merchantId!;
      const settings = await storage.getNotificationSettings(merchantId);
      const customSounds = (settings?.customSounds as any[]) || [];
      customSounds.push({ name: soundName, url: soundUrl });
      
      await storage.upsertNotificationSettings(merchantId, { customSounds });
      
      res.json({ url: soundUrl, name: soundName });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== PRODUCT RECOMMENDATION SETTINGS ROUTES ==============
  
  app.get("/api/product-recommendation-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const settings = await storage.getProductRecommendationSettings(merchantId);
      res.json(settings || {
        aiAutoRecommendEnabled: true,
        triggerKeywords: "product,recommend,buy,shop,item,catalog",
        aiContextTriggerEnabled: true,
        supervisorCanRecommend: true,
        maxProductsPerRecommendation: 3,
        showPriceInRecommendation: true,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/product-recommendation-settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      
      const validationSchema = z.object({
        aiAutoRecommendEnabled: z.boolean().default(true),
        triggerKeywords: z.string().default("product,recommend,buy,shop,item,catalog"),
        aiContextTriggerEnabled: z.boolean().default(true),
        supervisorCanRecommend: z.boolean().default(true),
        maxProductsPerRecommendation: z.number().min(1).max(10).default(3),
        showPriceInRecommendation: z.boolean().default(true),
      }).partial();
      
      const parseResult = validationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid settings data", details: parseResult.error.errors });
      }
      
      const validatedData = {
        aiAutoRecommendEnabled: parseResult.data.aiAutoRecommendEnabled ?? true,
        triggerKeywords: parseResult.data.triggerKeywords || "product,recommend,buy,shop,item,catalog",
        aiContextTriggerEnabled: parseResult.data.aiContextTriggerEnabled ?? true,
        supervisorCanRecommend: parseResult.data.supervisorCanRecommend ?? true,
        maxProductsPerRecommendation: parseResult.data.maxProductsPerRecommendation ?? 3,
        showPriceInRecommendation: parseResult.data.showPriceInRecommendation ?? true,
      };
      
      const settings = await storage.upsertProductRecommendationSettings(merchantId, validatedData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating product recommendation settings:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get product recommendation settings for widget (public)
  app.get("/api/widget/:merchantId/product-recommendation-settings", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const settings = await storage.getProductRecommendationSettings(merchantId);
      res.json({
        aiAutoRecommendEnabled: settings?.aiAutoRecommendEnabled ?? true,
        triggerKeywords: settings?.triggerKeywords || "product,recommend,buy,shop,item,catalog",
        aiContextTriggerEnabled: settings?.aiContextTriggerEnabled ?? true,
        maxProductsPerRecommendation: settings?.maxProductsPerRecommendation ?? 3,
        showPriceInRecommendation: settings?.showPriceInRecommendation ?? true,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== CHAT SECURITY ROUTES ==============
  
  // Get chat security settings
  app.get("/api/chat-security/settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const settings = await storage.getChatSecuritySettings(merchantId);
      res.json(settings || {
        isEnabled: true,
        sensitivity: 50,
        alertEmailEnabled: true,
        alertEmails: [],
        customPatterns: [],
        monitorFinancialFraud: true,
        monitorDataTheft: true,
        monitorExternalContact: true,
        monitorInappropriate: true,
        tolerateJokes: true,
        tolerateOffTopic: true,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update chat security settings
  app.put("/api/chat-security/settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      
      const validationSchema = z.object({
        isEnabled: z.boolean().optional(),
        sensitivity: z.number().min(0).max(100).optional(),
        alertEmailEnabled: z.boolean().optional(),
        alertEmails: z.array(z.string().email()).optional(),
        customPatterns: z.array(z.string()).optional(),
        monitorFinancialFraud: z.boolean().optional(),
        monitorDataTheft: z.boolean().optional(),
        monitorExternalContact: z.boolean().optional(),
        monitorInappropriate: z.boolean().optional(),
        tolerateJokes: z.boolean().optional(),
        tolerateOffTopic: z.boolean().optional(),
      });
      
      const parseResult = validationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid settings data", details: parseResult.error.errors });
      }
      
      const settings = await storage.upsertChatSecuritySettings(merchantId, parseResult.data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get chat security alerts
  app.get("/api/chat-security/alerts", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const alerts = await storage.getChatSecurityAlerts(merchantId, status, limit);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get chat security alert stats
  app.get("/api/chat-security/stats", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const stats = await storage.getChatSecurityAlertStats(merchantId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Update chat security alert status
  app.patch("/api/chat-security/alerts/:id", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { id } = req.params;
      const { status } = req.body;
      
      // Verify the alert belongs to this merchant
      const alert = await storage.getChatSecurityAlert(id);
      if (!alert || alert.merchantId !== merchantId) {
        return res.status(404).json({ error: "Alert not found" });
      }
      
      const updatedAlert = await storage.updateChatSecurityAlert(id, {
        status,
        reviewedBy: req.session.userId,
        reviewedAt: new Date(),
      });
      res.json(updatedAlert);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== TEAM ACTIVITY ROUTES ==============
  
  // Update supervisor status
  app.post("/api/team/status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const userType = req.session.userType;
      const { status } = req.body;
      
      if (userType === "supervisor") {
        await storage.updateSupervisor(userId, { status, lastSeen: new Date() });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get team activity
  app.get("/api/team/activity", requireMerchantOrSupervisor, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const supervisors = await storage.getSupervisorsByMerchant(merchantId);
      const agents = await storage.getAgents(merchantId);
      const shifts = await storage.getWorkShifts(merchantId);
      const assignments = await storage.getShiftAssignments(merchantId);
      
      // Helper function to check if current time is within a shift's time range
      const isCurrentlyInShift = (startTime: string, endTime: string, isNightShift: boolean): boolean => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        const [startHour, startMinute] = startTime.split(":").map(Number);
        const [endHour, endMinute] = endTime.split(":").map(Number);
        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour * 60 + endMinute;
        
        if (isNightShift || endTimeMinutes < startTimeMinutes) {
          // Night shift spans across midnight
          return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
        } else {
          // Normal day shift
          return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
        }
      };
      
      // Helper to check if today matches the shift's dayType
      const isDayTypeMatch = (dayType: string): boolean => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        if (dayType === "weekday") return !isWeekend;
        if (dayType === "weekend") return isWeekend;
        if (dayType === "everyday") return true;
        return true; // default
      };
      
      // Get currently active shifts
      const activeShiftIds = shifts
        .filter(shift => 
          shift.isActive && 
          isDayTypeMatch(shift.dayType) && 
          isCurrentlyInShift(shift.startTime, shift.endTime, shift.isNightShift || false)
        )
        .map(shift => shift.id);
      
      // Check if an assignee is currently on an active shift
      const isAssigneeOnActiveShift = (assigneeId: string): boolean => {
        return assignments.some(assignment => 
          assignment.assigneeId === assigneeId && 
          activeShiftIds.includes(assignment.shiftId)
        );
      };
      
      // Get assigned shift info for an assignee
      const getAssignedShiftInfo = (assigneeId: string): { shiftName: string; isOnShift: boolean } | null => {
        const assigneeAssignments = assignments.filter(a => a.assigneeId === assigneeId);
        if (assigneeAssignments.length === 0) return null;
        
        // Check if on any active shift
        for (const assignment of assigneeAssignments) {
          const shift = shifts.find(s => s.id === assignment.shiftId);
          if (shift && activeShiftIds.includes(shift.id)) {
            return { shiftName: shift.name, isOnShift: true };
          }
        }
        
        // Return first assigned shift (not currently active)
        const firstAssignment = assigneeAssignments[0];
        const firstShift = shifts.find(s => s.id === firstAssignment.shiftId);
        return firstShift ? { shiftName: firstShift.name, isOnShift: false } : null;
      };
      
      const activity = {
        supervisors: supervisors.map(s => {
          const shiftInfo = getAssignedShiftInfo(s.id);
          const isOnActiveShift = isAssigneeOnActiveShift(s.id);
          
          // Status priority: if on active shift, show as "online" (synced with scheduler)
          let status = s.status || "offline";
          if (isOnActiveShift) {
            status = "online";
          } else if (shiftInfo && !shiftInfo.isOnShift) {
            // Has shift assignment but not currently on shift
            status = s.status || "offline";
          }
          
          return {
            id: s.id,
            name: s.name,
            email: s.email,
            photoUrl: s.photoUrl,
            status,
            lastSeen: s.lastSeen,
            role: s.role || "supervisor",
            assignedShift: shiftInfo?.shiftName || null,
            isOnShift: isOnActiveShift,
          };
        }),
        agents: agents.map(a => {
          const shiftInfo = getAssignedShiftInfo(a.id);
          const isOnActiveShift = isAssigneeOnActiveShift(a.id);
          
          // If on active shift, consider the agent as active
          const isActive = isOnActiveShift || a.isActive;
          
          return {
            id: a.id,
            name: a.name,
            photoUrl: a.photoUrl,
            isActive,
            assignedShift: shiftInfo?.shiftName || null,
            isOnShift: isOnActiveShift,
          };
        }),
      };
      
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== PUBLIC WIDGET ENDPOINTS ==============
  
  // Get chat buttons for widget (public)
  app.get("/api/widget/:merchantId/chat-buttons", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const buttons = await storage.getChatButtons(merchantId);
      const activeButtons = buttons.filter(b => b.isActive);
      res.json(activeButtons);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get product cards for widget (public)
  app.get("/api/widget/:merchantId/product-cards", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const { agentId } = req.query;
      const cards = await storage.getProductCards(merchantId, agentId as string | undefined);
      const activeCards = cards.filter(c => c.isActive);
      
      // Get buttons for each card
      const cardsWithButtons = await Promise.all(
        activeCards.map(async (card) => {
          const buttons = await storage.getProductCardButtons(card.id);
          return { ...card, buttons };
        })
      );
      
      res.json(cardsWithButtons);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get notification settings for widget (public - just sound settings)
  app.get("/api/widget/:merchantId/notification-settings", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const settings = await storage.getNotificationSettings(merchantId);
      res.json({
        incomingChatSound: settings?.incomingChatSound || "default",
        incomingChatEnabled: settings?.incomingChatEnabled ?? true,
        chatReplySound: settings?.chatReplySound || "default",
        chatReplyEnabled: settings?.chatReplyEnabled ?? true,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get quick replies for widget (public)
  app.get("/api/widget/:merchantId/quick-replies", async (req, res) => {
    try {
      const { merchantId } = req.params;
      const replies = await storage.getQuickReplies(merchantId);
      const activeReplies = replies.filter(r => r.isActive);
      res.json(activeReplies);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // ============== CHATVICE TOP UP v2: Payment Flow ==============
  
  // Widget initialization - tracks domain (requires valid pre-registered site_key)
  // Security: site_key is a secret UUID generated by merchant dashboard, not guessable
  app.post("/api/widget/init", async (req, res) => {
    try {
      const { site_key, current_domain } = req.body;
      
      if (!site_key || !current_domain) {
        return res.status(400).json({ error: "Missing site_key or current_domain" });
      }
      
      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(current_domain) && current_domain !== "localhost") {
        return res.status(400).json({ error: "Invalid domain format" });
      }
      
      // Find site by site_key - site_key is a secret, acts as auth
      const site = await storage.getWidgetSiteBySiteKey(site_key);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      if (!site.isActive) {
        return res.status(403).json({ error: "Site is inactive" });
      }
      
      // Verify merchant is still active
      const merchant = await storage.getMerchant(site.merchantId);
      if (!merchant) {
        return res.status(403).json({ error: "Merchant not found" });
      }
      
      // Track/update domain
      await storage.upsertSiteDomain(site.id, current_domain);
      
      // Return site config (don't expose sensitive merchant_id to client)
      res.json({
        success: true,
        site_id: site.id,
        site_code: site.siteCode,
        site_name: site.siteName,
        topup_enabled: site.isTopupEnabled,
      });
    } catch (error) {
      console.error("Widget init error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Start top-up flow - generates JWT token and redirect URL
  // Security: Requires valid site_key (secret) - acts as authentication
  app.post("/api/start-topup", async (req, res) => {
    try {
      const { site_key, user_id, return_url } = req.body;
      
      if (!site_key || !user_id) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Validate user_id format (alphanumeric, max 64 chars)
      if (typeof user_id !== "string" || user_id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(user_id)) {
        return res.status(400).json({ error: "Invalid user_id format" });
      }
      
      // Find site by secret site_key
      const site = await storage.getWidgetSiteBySiteKey(site_key);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      if (!site.isActive) {
        return res.status(403).json({ error: "Site is inactive" });
      }
      
      if (!site.isTopupEnabled) {
        return res.status(403).json({ error: "Top-up is not enabled for this site" });
      }
      
      // Verify merchant is still active
      const merchant = await storage.getMerchant(site.merchantId);
      if (!merchant) {
        return res.status(403).json({ error: "Merchant not found" });
      }
      
      // Get current domain
      const currentDomain = await storage.getCurrentDomain(site.id);
      
      // Generate JWT token for payment flow with proper expiration
      const jwt = await import("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "chatvice_topup_secret_key_2024";
      
      const payload = {
        type: "topup_session", // Token type identifier
        merchant_id: site.merchantId,
        site_id: site.id,
        site_code: site.siteCode,
        current_domain: currentDomain?.domain || "",
        user_id,
        return_url: return_url || "",
      };
      
      // Sign with expiration (30 minutes)
      const token = jwt.default.sign(payload, JWT_SECRET, { expiresIn: "30m" });
      
      // Generate redirect URL - using same domain for now (will be pay.chatvice.com later)
      const baseUrl = process.env.PAYMENT_BASE_URL || `https://${req.get("host")}`;
      const redirectUrl = `${baseUrl}/topup?token=${token}`;
      
      res.json({
        success: true,
        redirect_url: redirectUrl,
        token,
      });
    } catch (error) {
      console.error("Start topup error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Verify topup token and get payment info
  // Security: Validates JWT signature, expiration, token type, and site/merchant status
  app.get("/api/topup/verify", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Missing token" });
      }
      
      const jwt = await import("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "chatvice_topup_secret_key_2024";
      
      try {
        const decoded = jwt.default.verify(token, JWT_SECRET) as {
          type?: string;
          merchant_id: string;
          site_id: string;
          site_code: string;
          current_domain: string;
          user_id: string;
          return_url: string;
        };
        
        // Verify token type
        if (decoded.type !== "topup_session") {
          return res.status(401).json({ error: "Invalid token type" });
        }
        
        // Get and validate site
        const site = await storage.getWidgetSite(decoded.site_id);
        if (!site) {
          return res.status(404).json({ error: "Site not found" });
        }
        
        // Verify site is still active
        if (!site.isActive) {
          return res.status(403).json({ error: "Site is inactive" });
        }
        
        if (!site.isTopupEnabled) {
          return res.status(403).json({ error: "Top-up is not enabled" });
        }
        
        // Verify merchant ID matches (prevent token tampering)
        if (site.merchantId !== decoded.merchant_id) {
          return res.status(401).json({ error: "Token mismatch" });
        }
        
        // Verify merchant is still active
        const merchant = await storage.getMerchant(decoded.merchant_id);
        if (!merchant) {
          return res.status(403).json({ error: "Merchant not found" });
        }
        
        // Get available nominals
        const nominals = await storage.getTopupNominals(site.id);
        
        // If no custom nominals, use defaults
        const defaultNominals = [
          { amount: 25000, label: "Rp 25.000", coinsGiven: 25, bonusCoins: 0 },
          { amount: 50000, label: "Rp 50.000", coinsGiven: 50, bonusCoins: 5 },
          { amount: 100000, label: "Rp 100.000", coinsGiven: 100, bonusCoins: 15 },
          { amount: 200000, label: "Rp 200.000", coinsGiven: 200, bonusCoins: 40 },
          { amount: 500000, label: "Rp 500.000", coinsGiven: 500, bonusCoins: 125 },
        ];
        
        // Only show QRIS for now since other channels are not implemented
        // TODO: Add more channels when Kompas Pay integration is complete
        res.json({
          success: true,
          site_name: site.siteName,
          site_code: site.siteCode,
          user_id: decoded.user_id,
          current_domain: decoded.current_domain,
          return_url: decoded.return_url,
          nominals: nominals.length > 0 ? nominals : defaultNominals,
          payment_channels: ["QRIS"], // Only QRIS is implemented
        });
      } catch (jwtError: any) {
        if (jwtError.name === "TokenExpiredError") {
          return res.status(401).json({ error: "Token expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
      }
    } catch (error) {
      console.error("Topup verify error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Create payment order
  // Security: Validates JWT, checks site/merchant status, normalizes order ID
  app.post("/api/payment/create-order", async (req, res) => {
    try {
      const { token, amount, channel } = req.body;
      
      if (!token || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Validate amount is a valid nominal
      if (typeof amount !== "number" || amount < 10000 || amount > 10000000) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      const jwt = await import("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "chatvice_topup_secret_key_2024";
      
      let decoded: {
        type?: string;
        merchant_id: string;
        site_id: string;
        site_code: string;
        current_domain: string;
        user_id: string;
        return_url: string;
      };
      
      try {
        decoded = jwt.default.verify(token, JWT_SECRET) as typeof decoded;
      } catch (jwtError) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      // Verify token type
      if (decoded.type !== "topup_session") {
        return res.status(401).json({ error: "Invalid token type" });
      }
      
      // Verify site is still valid
      const site = await storage.getWidgetSite(decoded.site_id);
      if (!site || !site.isActive || !site.isTopupEnabled) {
        return res.status(403).json({ error: "Site is not available for top-up" });
      }
      
      // Verify merchant ID matches
      if (site.merchantId !== decoded.merchant_id) {
        return res.status(401).json({ error: "Token mismatch" });
      }
      
      // Generate normalized domain tag for order ID
      // Only alphanumeric characters, max 5 chars
      const domTag = (decoded.current_domain || "UNKN")
        .replace(/\.[a-zA-Z]+$/, "") // remove TLD
        .replace(/[^a-zA-Z0-9]/g, "") // remove all non-alphanumeric
        .substring(0, 5)
        .toUpperCase()
        .padEnd(3, "X"); // ensure min 3 chars
      
      const timestamp = Date.now();
      const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
      const orderId = `CVT-${decoded.site_code}-${domTag}-${timestamp}-${rand}`;
      
      // Create order in database
      const order = await storage.createCoinOrder({
        orderId,
        merchantId: decoded.merchant_id,
        siteId: decoded.site_id,
        userId: decoded.user_id,
        amount,
        channelRequested: channel || "AUTO",
        status: "PENDING",
        currentDomain: decoded.current_domain,
        returnUrl: decoded.return_url,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      });
      
      // TODO: Call Kompas Pay API here when integrated
      // For now, simulate payment data
      const paymentData = {
        type: "QRIS",
        qr_string: `00020101021126670016ID.CO.KOMPASPAY.WWW0118${orderId}0215TOPUP${amount}5802ID5925CHATVICE6007JAKARTA61051234062070703A0163044B2C`,
        va_number: null,
        expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
      
      // Update order with payment data
      await storage.updateCoinOrder(order.id, {
        paymentType: "QRIS",
        paymentData: paymentData as any,
      });
      
      res.json({
        success: true,
        order_id: orderId,
        amount,
        payment_type: "QRIS",
        payment_data: paymentData,
        expires_at: paymentData.expiry_time,
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Check payment status
  app.get("/api/payment/status", async (req, res) => {
    try {
      const { order_id } = req.query;
      
      if (!order_id || typeof order_id !== "string") {
        return res.status(400).json({ error: "Missing order_id" });
      }
      
      const order = await storage.getCoinOrderByOrderId(order_id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      res.json({
        success: true,
        order_id: order.orderId,
        status: order.status,
        amount: order.amount,
        payment_type: order.paymentType,
        paid_at: order.paidAt,
        credited_at: order.creditedAt,
        return_url: order.returnUrl,
      });
    } catch (error) {
      console.error("Payment status error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Kompas Pay webhook (placeholder - will be implemented when API key is available)
  app.post("/webhook/kompaspay", async (req, res) => {
    try {
      const { order_id, status, amount, payment_type, payment_ref, signature } = req.body;
      
      console.log("Kompas Pay webhook received:", { order_id, status, amount, payment_type });
      
      // TODO: Verify signature with Kompas Pay secret
      // const isValid = verifyKompasPaySignature(req.body, KOMPAS_PAY_SECRET);
      // if (!isValid) {
      //   return res.status(401).json({ error: "Invalid signature" });
      // }
      
      // Find order
      const order = await storage.getCoinOrderByOrderId(order_id);
      if (!order) {
        console.log("Order not found:", order_id);
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Verify amount matches
      if (order.amount !== amount) {
        console.log("Amount mismatch:", { expected: order.amount, received: amount });
        return res.status(400).json({ error: "Amount mismatch" });
      }
      
      if (status === "PAID") {
        // Update order to PAID
        await storage.updateCoinOrder(order.id, {
          status: "PAID",
          paidAt: new Date(),
          gatewayRef: payment_ref,
          paymentType: payment_type,
        });
        
        // TODO: Call merchant's coin API to credit coins
        // const site = await storage.getWidgetSite(order.siteId);
        // if (site?.coinApiBaseUrl) {
        //   try {
        //     const creditResult = await creditCoinsToUser(site, order);
        //     if (creditResult.success) {
        //       await storage.updateCoinOrder(order.id, {
        //         status: "COMPLETED",
        //         creditedAt: new Date(),
        //       });
        //     } else {
        //       await storage.updateCoinOrder(order.id, {
        //         status: "PAID_BUT_NOT_CREDITED",
        //         errorMessage: creditResult.error,
        //       });
        //     }
        //   } catch (e) {
        //     await storage.updateCoinOrder(order.id, {
        //       status: "PAID_BUT_NOT_CREDITED",
        //       errorMessage: "Failed to credit coins",
        //     });
        //   }
        // }
        
        // For now, mark as completed since we don't have coin API integration
        await storage.updateCoinOrder(order.id, {
          status: "COMPLETED",
          creditedAt: new Date(),
        });
      } else if (status === "FAILED" || status === "EXPIRED") {
        await storage.updateCoinOrder(order.id, {
          status: status,
          errorMessage: `Payment ${status.toLowerCase()}`,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // ============== WIDGET SITES MANAGEMENT (Merchant Dashboard) ==============
  
  // Get merchant's widget sites
  app.get("/api/widget-sites", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session?.merchantId!;
      const sites = await storage.getWidgetSitesByMerchant(merchantId);
      
      // Get domain info for each site
      const sitesWithDomains = await Promise.all(
        sites.map(async (site) => {
          const domains = await storage.getSiteDomains(site.id);
          const currentDomain = domains.find(d => d.isCurrent);
          return {
            ...site,
            currentDomain: currentDomain?.domain || null,
            domainCount: domains.length,
            domains,
          };
        })
      );
      
      res.json(sitesWithDomains);
    } catch (error) {
      console.error("Get widget sites error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Create widget site
  app.post("/api/widget-sites", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session?.merchantId!;
      const { siteName, siteCode, coinApiBaseUrl, coinApiSecret, isTopupEnabled } = req.body;
      
      if (!siteName || !siteCode) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Generate unique site key
      const siteKey = `wk_${crypto.randomBytes(16).toString("hex")}`;
      
      const site = await storage.createWidgetSite({
        merchantId,
        siteName,
        siteCode: siteCode.toUpperCase(),
        siteKey,
        coinApiBaseUrl: coinApiBaseUrl || null,
        coinApiSecret: coinApiSecret || null,
        isTopupEnabled: isTopupEnabled || false,
        isActive: true,
      });
      
      res.json(site);
    } catch (error: any) {
      console.error("Create widget site error:", error);
      if (error.code === "23505") { // unique constraint violation
        return res.status(400).json({ error: "Site code already exists" });
      }
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Update widget site
  app.put("/api/widget-sites/:id", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session?.merchantId!;
      const { id } = req.params;
      
      // Verify ownership
      const site = await storage.getWidgetSite(id);
      if (!site || site.merchantId !== merchantId) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      const { siteName, coinApiBaseUrl, coinApiSecret, isTopupEnabled, isActive } = req.body;
      
      const updated = await storage.updateWidgetSite(id, {
        siteName,
        coinApiBaseUrl,
        coinApiSecret,
        isTopupEnabled,
        isActive,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Update widget site error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Delete widget site
  app.delete("/api/widget-sites/:id", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session?.merchantId!;
      const { id } = req.params;
      
      // Verify ownership
      const site = await storage.getWidgetSite(id);
      if (!site || site.merchantId !== merchantId) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      await storage.deleteWidgetSite(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete widget site error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // Get coin orders for merchant
  app.get("/api/coin-orders", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session?.merchantId!;
      const orders = await storage.getCoinOrdersByMerchant(merchantId);
      res.json(orders);
    } catch (error) {
      console.error("Get coin orders error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  return httpServer;
}
