import {
  type Merchant, type InsertMerchant,
  type Supervisor, type InsertSupervisor,
  type Session, type InsertSession,
  type Message, type InsertMessage,
  type Trigger, type InsertTrigger,
  type Knowledge, type InsertKnowledge,
  type KnowledgeChunk, type InsertKnowledgeChunk,
  type Notification, type InsertNotification,
  type Admin, type InsertAdmin,
  type CrawledLink, type InsertCrawledLink,
  type Agent, type InsertAgent,
  type Source, type InsertSource,
  merchants, supervisors, sessions, messages, triggers, knowledge, knowledgeChunks, notifications, admins, crawledLinks, agents, sources,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, sql, count, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface AnalyticsData {
  totalSessions: number;
  activeSessions: number;
  messagesToday: number;
  messagesThisWeek: number;
  aiSessions: number;
  humanSessions: number;
  aiResolutionRate: number;
  dailyMessageCounts: { date: string; count: number }[];
  avgResponseTime: number;
}

export interface IStorage {
  getMerchant(id: string): Promise<Merchant | undefined>;
  getMerchantByEmail(email: string): Promise<Merchant | undefined>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined>;

  getSupervisor(id: string): Promise<Supervisor | undefined>;
  getSupervisorByEmail(email: string): Promise<Supervisor | undefined>;
  getSupervisorsByMerchant(merchantId: string): Promise<Supervisor[]>;
  createSupervisor(supervisor: InsertSupervisor): Promise<Supervisor>;
  deleteSupervisor(id: string): Promise<boolean>;

  getSession(id: string): Promise<Session | undefined>;
  getSessionsByMerchant(merchantId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, data: Partial<Session>): Promise<Session | undefined>;

  getMessages(sessionId: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, data: Partial<Message>): Promise<Message | undefined>;

  getTriggers(merchantId: string): Promise<Trigger[]>;
  createTrigger(trigger: InsertTrigger): Promise<Trigger>;
  deleteTrigger(id: string): Promise<boolean>;

  getKnowledge(merchantId: string): Promise<Knowledge | undefined>;
  setKnowledge(merchantId: string, content: string): Promise<Knowledge>;

  getNotifications(supervisorId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationSeen(id: string): Promise<boolean>;
  
  getAnalytics(merchantId: string): Promise<AnalyticsData>;
  
  getKnowledgeChunks(merchantId: string): Promise<KnowledgeChunk[]>;
  createKnowledgeChunk(chunk: InsertKnowledgeChunk): Promise<KnowledgeChunk>;
  deleteKnowledgeChunks(merchantId: string): Promise<boolean>;
  updateChunkEmbedding(id: string, embedding: string): Promise<boolean>;
  
  getCrawledLinks(merchantId: string): Promise<CrawledLink[]>;
  createCrawledLink(link: InsertCrawledLink): Promise<CrawledLink>;
  updateCrawledLink(id: string, data: Partial<CrawledLink>): Promise<CrawledLink | undefined>;
  deleteCrawledLink(id: string): Promise<boolean>;
  
  deleteMerchant(id: string): Promise<boolean>;
  deleteSession(id: string): Promise<boolean>;
  getAllMerchants(): Promise<Merchant[]>;
}

function generateId(prefix: string = ""): string {
  return prefix + randomBytes(8).toString("hex");
}

export class DatabaseStorage implements IStorage {
  async getMerchant(id: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.id, id));
    return result[0];
  }

  async getMerchantByEmail(email: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.email, email));
    return result[0];
  }

  async createMerchant(data: InsertMerchant): Promise<Merchant> {
    const id = generateId("m_");
    const result = await db.insert(merchants).values({
      id,
      email: data.email,
      password: data.password,
      companyName: data.companyName,
      iconUrl: data.iconUrl || "",
      iconSize: data.iconSize || 70,
      online: data.online ?? true,
      primaryColor: data.primaryColor || "#6b5dfc",
      welcomeMessage: data.welcomeMessage || "Hi! How can I help you today?",
    }).returning();
    return result[0];
  }

  async updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined> {
    const result = await db.update(merchants)
      .set(data)
      .where(eq(merchants.id, id))
      .returning();
    return result[0];
  }

  async getSupervisor(id: string): Promise<Supervisor | undefined> {
    const result = await db.select().from(supervisors).where(eq(supervisors.id, id));
    return result[0];
  }

  async getSupervisorByEmail(email: string): Promise<Supervisor | undefined> {
    const result = await db.select().from(supervisors).where(eq(supervisors.email, email));
    return result[0];
  }

  async getSupervisorsByMerchant(merchantId: string): Promise<Supervisor[]> {
    return db.select().from(supervisors).where(eq(supervisors.merchantId, merchantId));
  }

  async createSupervisor(data: InsertSupervisor): Promise<Supervisor> {
    const id = generateId("sup_");
    const result = await db.insert(supervisors).values({
      id,
      merchantId: data.merchantId,
      email: data.email,
      name: data.name,
      password: data.password,
      photoUrl: data.photoUrl || "",
    }).returning();
    return result[0];
  }

  async deleteSupervisor(id: string): Promise<boolean> {
    const result = await db.delete(supervisors).where(eq(supervisors.id, id)).returning();
    return result.length > 0;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0];
  }

  async getSessionsByMerchant(merchantId: string): Promise<Session[]> {
    return db.select().from(sessions)
      .where(eq(sessions.merchantId, merchantId))
      .orderBy(desc(sessions.lastActivity));
  }

  async createSession(data: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values({
      id: data.id,
      merchantId: data.merchantId,
      mode: data.mode || "AI",
      supervisorId: data.supervisorId || null,
      customerName: data.customerName || "Customer",
    }).returning();
    return result[0];
  }

  async updateSession(id: string, data: Partial<Session>): Promise<Session | undefined> {
    const result = await db.update(sessions)
      .set({ ...data, lastActivity: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return result[0];
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.timestamp);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const id = generateId("msg_");
    const result = await db.insert(messages).values({
      id,
      sessionId: data.sessionId,
      from: data.from,
      content: data.content,
    }).returning();
    return result[0];
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id));
    return result[0];
  }

  async updateMessage(id: string, data: Partial<Message>): Promise<Message | undefined> {
    const result = await db.update(messages)
      .set(data)
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }

  async getTriggers(merchantId: string): Promise<Trigger[]> {
    return db.select().from(triggers).where(eq(triggers.merchantId, merchantId));
  }

  async createTrigger(data: InsertTrigger): Promise<Trigger> {
    const id = generateId("trg_");
    const result = await db.insert(triggers).values({
      id,
      merchantId: data.merchantId,
      keyword: data.keyword,
    }).returning();
    return result[0];
  }

  async deleteTrigger(id: string): Promise<boolean> {
    const result = await db.delete(triggers).where(eq(triggers.id, id)).returning();
    return result.length > 0;
  }

  async getKnowledge(merchantId: string): Promise<Knowledge | undefined> {
    const result = await db.select().from(knowledge).where(eq(knowledge.merchantId, merchantId));
    return result[0];
  }

  async setKnowledge(merchantId: string, content: string): Promise<Knowledge> {
    const existing = await this.getKnowledge(merchantId);
    if (existing) {
      const result = await db.update(knowledge)
        .set({ content })
        .where(eq(knowledge.id, existing.id))
        .returning();
      return result[0];
    }
    const id = generateId("kb_");
    const result = await db.insert(knowledge).values({
      id,
      merchantId,
      content,
    }).returning();
    return result[0];
  }

  async getNotifications(supervisorId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.supervisorId, supervisorId))
      .orderBy(desc(notifications.timestamp));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const id = generateId("notif_");
    const result = await db.insert(notifications).values({
      id,
      supervisorId: data.supervisorId,
      sessionId: data.sessionId,
      message: data.message,
      seen: data.seen ?? false,
    }).returning();
    return result[0];
  }

  async markNotificationSeen(id: string): Promise<boolean> {
    const result = await db.update(notifications)
      .set({ seen: true })
      .where(eq(notifications.id, id))
      .returning();
    return result.length > 0;
  }

  async getAnalytics(merchantId: string): Promise<AnalyticsData> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const dayAgo = new Date(now);
    dayAgo.setDate(dayAgo.getDate() - 1);

    const merchantSessions = await db.select().from(sessions)
      .where(eq(sessions.merchantId, merchantId));
    
    if (merchantSessions.length === 0) {
      const dailyMessageCounts: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(todayStart);
        date.setDate(date.getDate() - i);
        dailyMessageCounts.push({
          date: date.toISOString().split('T')[0],
          count: 0,
        });
      }
      return {
        totalSessions: 0,
        activeSessions: 0,
        messagesToday: 0,
        messagesThisWeek: 0,
        aiSessions: 0,
        humanSessions: 0,
        aiResolutionRate: 0,
        dailyMessageCounts,
        avgResponseTime: 0,
      };
    }
    
    const activeSessions = merchantSessions.filter(s => {
      if (!s.lastActivity) return false;
      return new Date(s.lastActivity) > dayAgo;
    });
    
    const aiSessions = merchantSessions.filter(s => s.mode === "AI").length;
    const humanSessions = merchantSessions.filter(s => s.mode === "HUMAN").length;
    
    const sessionIds = merchantSessions.map(s => s.id);
    
    const allMessages = await db.select().from(messages)
      .where(inArray(messages.sessionId, sessionIds));
    
    const messagesToday = allMessages.filter(m => 
      m.timestamp && new Date(m.timestamp) >= todayStart
    ).length;
    
    const messagesThisWeek = allMessages.filter(m =>
      m.timestamp && new Date(m.timestamp) >= weekAgo
    ).length;
    
    const dailyMessageCounts: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayStart);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayCount = allMessages.filter(m =>
        m.timestamp && new Date(m.timestamp) >= date && new Date(m.timestamp) < nextDate
      ).length;
      
      dailyMessageCounts.push({
        date: date.toISOString().split('T')[0],
        count: dayCount,
      });
    }
    
    const totalSessions = merchantSessions.length;
    const aiResolutionRate = Math.round((aiSessions / totalSessions) * 100);
    
    let avgResponseTime = 0;
    const aiResponses: number[] = [];
    
    const messagesBySession = new Map<string, Message[]>();
    for (const msg of allMessages) {
      const existing = messagesBySession.get(msg.sessionId) || [];
      existing.push(msg);
      messagesBySession.set(msg.sessionId, existing);
    }
    
    for (const [sessionId, sessionMsgs] of Array.from(messagesBySession.entries())) {
      const sorted = sessionMsgs.sort((a: Message, b: Message) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return aTime - bTime;
      });
      
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].from === "customer") {
          for (let j = i + 1; j < sorted.length; j++) {
            if (sorted[j].from === "jeany") {
              const customerTime = sorted[i].timestamp ? new Date(sorted[i].timestamp!).getTime() : 0;
              const aiTime = sorted[j].timestamp ? new Date(sorted[j].timestamp!).getTime() : 0;
              if (customerTime && aiTime) {
                const responseTime = (aiTime - customerTime) / 1000;
                if (responseTime > 0 && responseTime < 300) {
                  aiResponses.push(responseTime);
                }
              }
              break;
            }
          }
        }
      }
    }
    
    if (aiResponses.length > 0) {
      avgResponseTime = Math.round((aiResponses.reduce((a, b) => a + b, 0) / aiResponses.length) * 10) / 10;
    }

    return {
      totalSessions: merchantSessions.length,
      activeSessions: activeSessions.length,
      messagesToday,
      messagesThisWeek,
      aiSessions,
      humanSessions,
      aiResolutionRate,
      dailyMessageCounts,
      avgResponseTime,
    };
  }

  async getKnowledgeChunks(merchantId: string): Promise<KnowledgeChunk[]> {
    return db.select().from(knowledgeChunks).where(eq(knowledgeChunks.merchantId, merchantId));
  }

  async createKnowledgeChunk(data: InsertKnowledgeChunk): Promise<KnowledgeChunk> {
    const id = generateId("kc_");
    const result = await db.insert(knowledgeChunks).values({
      id,
      merchantId: data.merchantId,
      content: data.content,
      embedding: data.embedding || null,
    }).returning();
    return result[0];
  }

  async deleteKnowledgeChunks(merchantId: string): Promise<boolean> {
    const result = await db.delete(knowledgeChunks)
      .where(eq(knowledgeChunks.merchantId, merchantId))
      .returning();
    return true;
  }

  async updateChunkEmbedding(id: string, embedding: string): Promise<boolean> {
    const result = await db.update(knowledgeChunks)
      .set({ embedding })
      .where(eq(knowledgeChunks.id, id))
      .returning();
    return result.length > 0;
  }

  async getAdmin(id: string): Promise<Admin | undefined> {
    const result = await db.select().from(admins).where(eq(admins.id, id));
    return result[0];
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const result = await db.select().from(admins).where(eq(admins.email, email));
    return result[0];
  }

  async createAdmin(data: InsertAdmin): Promise<Admin> {
    const id = generateId("admin_");
    const result = await db.insert(admins).values({
      id,
      email: data.email,
      password: data.password,
      name: data.name,
    }).returning();
    return result[0];
  }

  async getAllMerchants(): Promise<Merchant[]> {
    return db.select().from(merchants).orderBy(desc(merchants.createdAt));
  }

  async updateMerchantSubscription(id: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    subscriptionStatus?: string;
    subscriptionPlanId?: string;
    currentPeriodEnd?: Date;
    billingInterval?: string;
  }): Promise<Merchant | undefined> {
    const result = await db.update(merchants)
      .set(data)
      .where(eq(merchants.id, id))
      .returning();
    return result[0];
  }

  async incrementConversationUsage(merchantId: string): Promise<void> {
    await db.update(merchants)
      .set({ 
        conversationsUsed: sql`COALESCE(${merchants.conversationsUsed}, 0) + 1`
      })
      .where(eq(merchants.id, merchantId));
  }

  async resetConversationUsage(merchantId: string): Promise<void> {
    await db.update(merchants)
      .set({ 
        conversationsUsed: 0,
        conversationsResetAt: new Date(),
      })
      .where(eq(merchants.id, merchantId));
  }

  async getCrawledLinks(merchantId: string): Promise<CrawledLink[]> {
    return db.select().from(crawledLinks)
      .where(eq(crawledLinks.merchantId, merchantId))
      .orderBy(desc(crawledLinks.crawledAt));
  }

  async createCrawledLink(data: InsertCrawledLink): Promise<CrawledLink> {
    const id = generateId("cl_");
    const result = await db.insert(crawledLinks).values({
      id,
      merchantId: data.merchantId,
      url: data.url,
      title: data.title || null,
      status: data.status || "pending",
      extractedContent: data.extractedContent || null,
    }).returning();
    return result[0];
  }

  async updateCrawledLink(id: string, data: Partial<CrawledLink>): Promise<CrawledLink | undefined> {
    const result = await db.update(crawledLinks)
      .set(data)
      .where(eq(crawledLinks.id, id))
      .returning();
    return result[0];
  }

  async deleteCrawledLink(id: string): Promise<boolean> {
    const result = await db.delete(crawledLinks)
      .where(eq(crawledLinks.id, id))
      .returning();
    return result.length > 0;
  }

  async getAgents(merchantId: string): Promise<Agent[]> {
    return db.select().from(agents)
      .where(eq(agents.merchantId, merchantId))
      .orderBy(desc(agents.createdAt));
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(eq(agents.id, id));
    return result[0];
  }

  async createAgent(data: InsertAgent): Promise<Agent> {
    const id = generateId("ag_");
    const result = await db.insert(agents).values({
      id,
      merchantId: data.merchantId,
      name: data.name,
      description: data.description || "",
      knowledgeContent: data.knowledgeContent || "",
      isActive: data.isActive ?? true,
    }).returning();
    return result[0];
  }

  async updateAgent(id: string, data: Partial<Agent>): Promise<Agent | undefined> {
    const result = await db.update(agents)
      .set(data)
      .where(eq(agents.id, id))
      .returning();
    return result[0];
  }

  async deleteAgent(id: string): Promise<boolean> {
    const result = await db.delete(agents)
      .where(eq(agents.id, id))
      .returning();
    return result.length > 0;
  }

  async getSources(merchantId: string): Promise<Source[]> {
    return db.select().from(sources)
      .where(eq(sources.merchantId, merchantId))
      .orderBy(desc(sources.createdAt));
  }

  async getSource(id: string): Promise<Source | undefined> {
    const result = await db.select().from(sources).where(eq(sources.id, id));
    return result[0];
  }

  async createSource(data: InsertSource): Promise<Source> {
    const id = generateId("src_");
    const result = await db.insert(sources).values({
      id,
      merchantId: data.merchantId,
      type: data.type,
      name: data.name,
      content: data.content || "",
      url: data.url || "",
      isActive: data.isActive ?? true,
      charCount: data.charCount || 0,
    }).returning();
    return result[0];
  }

  async updateSource(id: string, data: Partial<Source>): Promise<Source | undefined> {
    const result = await db.update(sources)
      .set(data)
      .where(eq(sources.id, id))
      .returning();
    return result[0];
  }

  async deleteSource(id: string): Promise<boolean> {
    const result = await db.delete(sources)
      .where(eq(sources.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteMerchant(id: string): Promise<boolean> {
    await db.delete(triggers).where(eq(triggers.merchantId, id));
    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.merchantId, id));
    await db.delete(knowledge).where(eq(knowledge.merchantId, id));
    await db.delete(sources).where(eq(sources.merchantId, id));
    await db.delete(agents).where(eq(agents.merchantId, id));
    await db.delete(crawledLinks).where(eq(crawledLinks.merchantId, id));
    
    const supervisorList = await this.getSupervisorsByMerchant(id);
    for (const supervisor of supervisorList) {
      await db.delete(notifications).where(eq(notifications.supervisorId, supervisor.id));
    }
    await db.delete(supervisors).where(eq(supervisors.merchantId, id));
    
    const result = await db.delete(merchants)
      .where(eq(merchants.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteSession(id: string): Promise<boolean> {
    await db.delete(messages).where(eq(messages.sessionId, id));
    const result = await db.delete(sessions)
      .where(eq(sessions.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
