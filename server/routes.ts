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

declare module "express-session" {
  interface SessionData {
    userId: string;
    userType: "merchant" | "supervisor";
    merchantId: string;
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

  const knowledge = await storage.getKnowledge(merchantId);
  const merchant = await storage.getMerchant(merchantId);
  const knowledgeContent = knowledge?.content || "";
  const companyName = merchant?.companyName || "our company";

  const prompt = `You are Jeany, a friendly and helpful AI Customer Service Agent for ${companyName}.
You are professional yet approachable, and always aim to help customers effectively.
Always answer in a clear, structured way while maintaining a conversational tone.

Company Knowledge Base:
${knowledgeContent || "No specific knowledge base configured yet."}

Customer Message: ${message}

Provide a helpful response. If you don't have specific information to answer, be honest about it and offer to connect with a human agent.`;

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
      const merchant = await storage.createMerchant({
        ...data,
        password: hashedPassword,
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
        });
      }
      res.json({
        iconUrl: merchant.iconUrl,
        iconSize: merchant.iconSize,
        online: merchant.online,
        primaryColor: merchant.primaryColor,
        welcomeMessage: merchant.welcomeMessage,
        companyName: merchant.companyName,
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
      const { companyName } = req.body;
      
      const updated = await storage.updateMerchant(merchantId, { companyName });
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
      res.json({ success: true, knowledge });
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
      
      const updated = await storage.updateSession(sessionId, {
        mode: "HUMAN",
        supervisorId,
      });
      if (!updated) {
        return res.status(404).json({ error: "Session not found" });
      }
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
      
      const sessions = await storage.getSessionsByMerchant(req.params.merchantId);
      const aiSessions = sessions.filter((s) => s.mode === "AI").length;
      const total = sessions.length || 1;
      
      res.json({
        activeSessions: sessions.length,
        messagesToday: sessions.length * 3,
        aiResolutionRate: Math.round((aiSessions / total) * 100),
        avgResponseTime: 1.2,
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
