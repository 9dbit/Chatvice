import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  chatAskSchema,
  registerMerchantSchema,
  loginSchema,
  merchantConfigSchema,
} from "@shared/schema";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStore from "memorystore";
import { processKnowledgeBase, searchKnowledge } from "./embeddings";
import { extractFAQContent } from "./crawler";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { subscriptionPlans, type SubscriptionPlanId } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userType: "merchant" | "supervisor" | "admin";
    merchantId: string;
    isAdmin?: boolean;
  }
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

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session.userType !== "admin" || !req.session.isAdmin) {
    return res.status(401).json({ error: "Unauthorized - Admin access required" });
  }
  next();
}

async function checkSubscriptionLimits(merchantId: string, type: 'conversation' | 'supervisor'): Promise<{ allowed: boolean; message?: string }> {
  const merchant = await storage.getMerchant(merchantId);
  if (!merchant) {
    return { allowed: false, message: "Merchant not found" };
  }
  
  const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.starter;
  
  if (merchant.subscriptionStatus === 'trial') {
    const trialExpired = merchant.trialEndsAt && new Date(merchant.trialEndsAt) < new Date();
    if (trialExpired) {
      return { allowed: false, message: "Trial expired. Please upgrade to continue." };
    }
  } else if (merchant.subscriptionStatus !== 'active') {
    return { allowed: false, message: "Subscription inactive. Please renew to continue." };
  }
  
  if (type === 'conversation') {
    if (plan.conversationsLimit === -1) return { allowed: true };
    const used = merchant.conversationsUsed || 0;
    if (used >= plan.conversationsLimit) {
      return { allowed: false, message: `Monthly conversation limit reached (${plan.conversationsLimit}). Please upgrade your plan.` };
    }
  }
  
  if (type === 'supervisor') {
    const supervisors = await storage.getSupervisorsByMerchant(merchantId);
    if (plan.supervisorsLimit === -1) return { allowed: true };
    if (supervisors.length >= plan.supervisorsLimit) {
      return { allowed: false, message: `Supervisor limit reached (${plan.supervisorsLimit}). Please upgrade your plan.` };
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

async function askJeany(
  sessionId: string,
  merchantId: string,
  message: string
): Promise<{ answer: string; mode: "AI" | "HUMAN" }> {
  let session = await storage.getSession(sessionId);
  if (!session) {
    session = await storage.createSession({
      id: sessionId,
      merchantId,
      mode: "AI",
      customerName: "Customer",
    });
  }

  if (session.mode === "HUMAN") {
    return {
      answer: "A supervisor is handling your conversation. Please wait for their response.",
      mode: "HUMAN",
    };
  }

  const triggerResult = await checkTriggers(merchantId, message);
  if (triggerResult.triggered) {
    await storage.updateSession(sessionId, { mode: "HUMAN" });
    await notifySupervisors(merchantId, sessionId);
    return {
      answer: "I'll connect you with a supervisor who can help you with this. Please wait a moment.",
      mode: "HUMAN",
    };
  }

  const merchant = await storage.getMerchant(merchantId);
  const companyName = merchant?.companyName || "our company";
  
  let knowledgeContext = "";
  try {
    const relevantChunks = await searchKnowledge(merchantId, message, 3);
    if (relevantChunks.length > 0) {
      knowledgeContext = relevantChunks.join("\n\n---\n\n");
    } else {
      const knowledge = await storage.getKnowledge(merchantId);
      knowledgeContext = knowledge?.content || "";
    }
  } catch (error) {
    console.error("Knowledge search error:", error);
    const knowledge = await storage.getKnowledge(merchantId);
    knowledgeContext = knowledge?.content || "";
  }

  const prompt = `You are Jeany, a friendly and helpful AI Customer Service Agent for ${companyName}.
You are professional yet approachable, and always aim to help customers effectively.
Always answer in a clear, structured way while maintaining a conversational tone.

IMPORTANT LANGUAGE INSTRUCTION:
- Detect the language of the customer's message
- ALWAYS respond in the SAME language the customer is using
- If the customer writes in Spanish, respond in Spanish
- If the customer writes in French, respond in French
- If the customer writes in German, respond in German
- And so on for any other language
- This includes greeting messages - match their language

Relevant Company Information:
${knowledgeContext || "No specific knowledge base configured yet."}

Customer Message: ${message}

Provide a helpful response based on the relevant information above. If you don't have specific information to answer, be honest about it and offer to connect with a human agent. Remember to respond in the same language as the customer's message.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 500,
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

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const MemoryStoreSession = MemoryStore(session);
  
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "jeany-ai-secret-key-change-in-production",
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

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerMerchantSchema.parse(req.body);
      const existing = await storage.getMerchantByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const hashedPassword = await hashPassword(data.password);
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
      
      const merchant = await storage.createMerchant({
        ...data,
        password: hashedPassword,
        subscriptionStatus: "trial",
        subscriptionPlanId: "starter",
        trialEndsAt,
        conversationsUsed: 0,
      });
      
      req.session.userId = merchant.id;
      req.session.userType = "merchant";
      req.session.merchantId = merchant.id;
      
      res.json({ success: true, merchantId: merchant.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const merchant = await storage.getMerchantByEmail(data.email);
      if (merchant && await verifyPassword(data.password, merchant.password)) {
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
        return res.json({ success: true, merchantId: supervisor.id, type: "supervisor" });
      }

      res.status(401).json({ error: "Invalid credentials" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid request" });
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
          online: true,
          primaryColor: "#6b5dfc",
          welcomeMessage: "Hi! How can I help you today?",
          agentName: "Jeany AI",
          agentPhotoUrl: "",
          widgetTheme: "light",
          bubblePosition: "right",
        });
      }
      
      res.json({
        iconUrl: merchant.iconUrl,
        iconSize: merchant.iconSize,
        online: merchant.online,
        primaryColor: merchant.primaryColor,
        welcomeMessage: merchant.welcomeMessage,
        companyName: merchant.companyName,
        agentName: merchant.agentName || "Jeany AI",
        agentPhotoUrl: merchant.agentPhotoUrl || "",
        widgetTheme: merchant.widgetTheme || "light",
        bubblePosition: merchant.bubblePosition || "right",
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/merchant/config", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const config = req.body;
      
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
      res.status(400).json({ error: error.message || "Invalid request" });
    }
  });

  app.post("/api/merchant/settings", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { companyName, profilePhotoUrl } = req.body;
      
      const updateData: { companyName?: string; profilePhotoUrl?: string } = {};
      if (companyName !== undefined) updateData.companyName = companyName;
      if (profilePhotoUrl !== undefined) updateData.profilePhotoUrl = profilePhotoUrl;
      
      const updated = await storage.updateMerchant(merchantId, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/chat/ask", async (req, res) => {
    try {
      const data = chatAskSchema.parse(req.body);
      const { merchantId, sessionId, message } = data;

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
        await storage.incrementConversationUsage(merchantId);
      }

      await storage.createMessage({
        sessionId,
        from: "user",
        content: message,
      });

      const result = await askJeany(sessionId, merchantId, message);

      await storage.createMessage({
        sessionId,
        from: result.mode === "HUMAN" ? "system" : "jeany",
        content: result.answer,
      });

      await storage.updateSession(sessionId, {});

      broadcastToSession(sessionId, {
        type: "message",
        message: { from: result.mode === "HUMAN" ? "system" : "jeany", content: result.answer },
      });

      res.json({ answer: result.answer, mode: result.mode });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/sessions/:merchantId", requireAuth, async (req, res) => {
    try {
      if (req.session.userType === "merchant" && req.session.merchantId !== req.params.merchantId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const sessions = await storage.getSessionsByMerchant(req.params.merchantId);
      res.json(sessions);
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
                        msg.from === 'jeany' ? 'Jeany AI' :
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
      
      const knowledge = await storage.getKnowledge(req.params.merchantId);
      res.json(knowledge || { content: "" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/knowledge/set", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const { knowledgeText } = req.body;
      
      const knowledge = await storage.setKnowledge(merchantId, knowledgeText || "");
      
      if (knowledgeText && knowledgeText.trim()) {
        processKnowledgeBase(merchantId, knowledgeText).catch(err => {
          console.error("Error processing knowledge embeddings:", err);
        });
      } else {
        storage.deleteKnowledgeChunks(merchantId).catch(err => {
          console.error("Error clearing knowledge chunks:", err);
        });
      }
      
      res.json({ success: true, knowledge });
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
      const { name, email, password } = req.body;
      
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
        password: hashedPassword 
      });
      const { password: _, ...safeSupervisor } = supervisor;
      res.json({ success: true, supervisor: safeSupervisor });
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

      res.json({ success: true });
    } catch (error) {
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
      
      const updated = await storage.updateSession(sessionId, {
        mode: "HUMAN",
        supervisorId,
      });
      if (!updated) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      await storage.createMessage({
        sessionId,
        from: "system",
        content: "A support agent has joined the conversation and will be assisting you shortly.",
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
        content: "The conversation has been returned to the AI assistant. How may I help you?",
      });
      
      broadcastToSession(sessionId, {
        type: "message",
        message: { from: "system", content: "The conversation has been returned to the AI assistant. How may I help you?" },
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
        content: "The conversation has been returned to the AI assistant. How may I help you?",
      });
      
      broadcastToSession(sessionId, {
        type: "message",
        message: { from: "system", content: "The conversation has been returned to the AI assistant. How may I help you?" },
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
      
      const updated = await storage.updateSession(sessionId, {
        mode: "HUMAN",
        supervisorId: merchantId,
      });
      if (!updated) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      await storage.createMessage({
        sessionId,
        from: "system",
        content: "A support agent has joined the conversation and will be assisting you shortly.",
      });
      
      broadcastToSession(sessionId, {
        type: "message",
        message: { from: "system", content: "A support agent has joined the conversation and will be assisting you shortly." },
      });
      
      res.json({ success: true });
    } catch (error) {
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
      
      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.starter;
      const isTrialExpired = merchant.trialEndsAt && new Date(merchant.trialEndsAt) < new Date();
      
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
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/billing/checkout", requireMerchant, async (req, res) => {
    try {
      const { planId, billingInterval } = req.body;
      const merchant = await storage.getMerchant(req.session.merchantId!);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const plan = subscriptionPlans[planId as SubscriptionPlanId];
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
      }
      
      const stripe = await getUncachableStripeClient();
      
      let customerId = merchant.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: merchant.email,
          metadata: { merchantId: merchant.id },
        });
        customerId = customer.id;
        await storage.updateMerchantSubscription(merchant.id, { stripeCustomerId: customerId });
      }
      
      const priceAmount = billingInterval === 'annual' ? plan.annualPrice * 100 : plan.monthlyPrice * 100;
      
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Jeany AI ${plan.name}`,
              description: plan.features.slice(0, 3).join(', '),
            },
            unit_amount: priceAmount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${req.protocol}://${req.get('host')}/dashboard/billing?success=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/dashboard/billing?canceled=true`,
        metadata: {
          merchantId: merchant.id,
          planId,
          billingInterval,
        },
        subscription_data: {
          trial_period_days: merchant.subscriptionStatus === 'trial' ? 7 : undefined,
          metadata: {
            merchantId: merchant.id,
            planId,
            billingInterval,
          },
        },
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
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
        stripeSubscriptionId: `demo_sub_${Date.now()}`,
        currentPeriodEnd: periodEnd,
        billingInterval: billingInterval,
      });
      
      res.json({ success: true, message: "Demo subscription activated" });
    } catch (error: any) {
      console.error("Demo checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to process demo checkout" });
    }
  });

  app.post("/api/billing/portal", requireMerchant, async (req, res) => {
    try {
      const merchant = await storage.getMerchant(req.session.merchantId!);
      if (!merchant || !merchant.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }
      
      const stripe = await getUncachableStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: merchant.stripeCustomerId,
        return_url: `${req.protocol}://${req.get('host')}/dashboard/billing`,
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      res.status(500).json({ error: "Failed to get Stripe key" });
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
      const safeMerchants = merchants.map(({ password, ...m }) => ({
        ...m,
        plan: subscriptionPlans[m.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.starter,
      }));
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
      
      res.json({
        ...safeMerchant,
        plan: subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.starter,
        sessionsCount: sessions.length,
        supervisorsCount: supervisors.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/admin/merchants/:merchantId/subscription", requireAdmin, async (req, res) => {
    try {
      const { planId, status } = req.body;
      const merchant = await storage.getMerchant(req.params.merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const updateData: any = {};
      if (planId) updateData.subscriptionPlanId = planId;
      if (status) updateData.subscriptionStatus = status;
      
      const updated = await storage.updateMerchantSubscription(merchant.id, updateData);
      res.json({ success: true, merchant: updated });
    } catch (error) {
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
        starter: merchants.filter(m => m.subscriptionPlanId === 'starter').length,
        pro: merchants.filter(m => m.subscriptionPlanId === 'pro').length,
        enterprise: merchants.filter(m => m.subscriptionPlanId === 'enterprise').length,
      };
      
      res.json({
        totalMerchants,
        activeMerchants,
        trialMerchants,
        totalConversations,
        planDistribution,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/widget/jeany.js", async (req, res) => {
    const merchantId = req.query.merchant || "demo";
    const script = `
(function() {
  var merchantId = "${merchantId}";
  var sessionId = "sess_" + Math.random().toString(36).substring(2, 12);
  
  var iframe = document.createElement("iframe");
  iframe.src = "${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : ""}/widget/" + merchantId + "?session=" + sessionId;
  iframe.style.cssText = "position:fixed;bottom:20px;right:20px;width:380px;height:550px;border:none;z-index:99999;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.15);";
  iframe.id = "jeany-widget-frame";
  
  var button = document.createElement("div");
  button.id = "jeany-widget-button";
  button.style.cssText = "position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#6b5dfc;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:99999;box-shadow:0 4px 15px rgba(107,93,252,0.4);";
  button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  
  var isOpen = false;
  
  button.onclick = function() {
    if (isOpen) {
      document.body.removeChild(iframe);
      button.style.display = "flex";
    } else {
      document.body.appendChild(iframe);
      button.style.display = "none";
    }
    isOpen = !isOpen;
  };
  
  document.body.appendChild(button);
})();
`;
    res.type("application/javascript").send(script);
  });

  return httpServer;
}
