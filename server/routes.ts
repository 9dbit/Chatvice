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
  
  const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
  
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
  const activeAgentId = merchant?.activeAgentId || undefined;
  
  // Get agent's custom system prompt if available
  let agentSystemPrompt = "";
  let agentName = "Jeany";
  if (activeAgentId) {
    const agent = await storage.getAgent(activeAgentId);
    if (agent?.systemPrompt) {
      agentSystemPrompt = agent.systemPrompt;
    }
    if (agent?.name) {
      agentName = agent.name;
    }
  }
  
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

  // Build system message with base behavior + custom instructions
  const systemMessage = `You are ${agentName}, a friendly and helpful AI Customer Service Agent for ${companyName}.
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
${agentSystemPrompt ? `

CUSTOM INSTRUCTIONS (FOLLOW THESE STRICTLY):
${agentSystemPrompt.trim()}` : ""}

Relevant Company Information:
${knowledgeContext || "No specific knowledge base configured yet."}

If you don't have specific information to answer, be honest about it and offer to connect with a human agent.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: message }
      ],
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
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/merchant/allowed-domains", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
      const canUseAllowedDomains = plan.id === "pro" || plan.id === "enterprise" || plan.id === "custom";
      
      if (!canUseAllowedDomains) {
        return res.status(403).json({ error: "Allowed domains requires Pro or Enterprise plan" });
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
      
      const sessionsWithPreview = await Promise.all(
        sessions.map(async (session) => {
          const messages = await storage.getMessages(session.id);
          const userMessages = messages.filter(m => m.from === "user");
          const aiMessages = messages.filter(m => m.from === "jeany");
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
      
      if (message.from !== "jeany") {
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
      
      const plan = subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free;
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
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const stripe = await getUncachableStripeClient();
      let customerId = merchant.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: merchant.email,
          name: merchant.companyName,
          metadata: {
            merchantId: merchant.id,
          },
        });
        customerId = customer.id;
        await storage.updateMerchant(merchant.id, { stripeCustomerId: customerId });
      }
      
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${req.protocol}://${req.get('host')}/dashboard/billing`,
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ error: error.message || "Failed to create portal session" });
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
        plan: subscriptionPlans[m.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free,
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
        plan: subscriptionPlans[merchant.subscriptionPlanId as SubscriptionPlanId] || subscriptionPlans.free,
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

  app.post("/api/demo/ask", async (req, res) => {
    try {
      const { question } = req.body;
      
      const jeanyKnowledge = `
Jeany AI is an AI-powered customer service chatbot platform that helps businesses:
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
            content: `You are Jeany, an AI assistant for Jeany AI platform. Answer questions about Jeany AI based on this knowledge:
${jeanyKnowledge}

Be helpful, friendly, and concise. If asked about something not related to Jeany AI, politely redirect to how Jeany AI can help businesses with customer service.`
          },
          { role: "user", content: question }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });
      
      res.json({ answer: response.choices[0].message.content || "I'm here to help! Ask me about how Jeany AI can transform your customer service." });
    } catch (error) {
      res.json({ answer: "Hi! I'm Jeany AI. I help businesses automate customer support with intelligent AI responses. Would you like to learn about our plans or features?" });
    }
  });

  app.post("/api/help/ask", requireMerchant, async (req, res) => {
    try {
      const { question } = req.body;
      
      const dashboardGuide = `
You are Jeany AI Guide, helping merchants use the Jeany AI dashboard. Here's what you know about the platform:

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
      
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `${dashboardGuide}

You are friendly, helpful, and concise. Guide merchants on how to use Jeany AI dashboard features. If they ask about something unrelated, gently redirect them to dashboard features.`
          },
          { role: "user", content: question }
        ],
        max_tokens: 400,
        temperature: 0.7,
      });
      
      res.json({ answer: response.choices[0].message.content || "I'm here to help you with the Jeany AI dashboard! What would you like to know?" });
    } catch (error) {
      console.error("Help ask error:", error);
      res.json({ answer: "I apologize, but I'm having trouble responding right now. Please try again later or contact support at support@jeany.ai." });
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

  return httpServer;
}
