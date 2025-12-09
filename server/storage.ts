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
  type SuggestedQuestion, type InsertSuggestedQuestion,
  type ChatLog, type InsertChatLog,
  type AgentSupervisor, type InsertAgentSupervisor,
  type MediaAttachment, type InsertMediaAttachment,
  type PlatformSetting,
  type LandingPageSettings, type InsertLandingPageSettings,
  type WorkShift, type InsertWorkShift,
  type ShiftAssignment, type InsertShiftAssignment,
  type WorkReport, type InsertWorkReport,
  type QuickReply, type InsertQuickReply,
  type ChatButton, type InsertChatButton,
  type ProductCard, type InsertProductCard,
  type ProductCardButton, type InsertProductCardButton,
  type WelcomeBubble, type InsertWelcomeBubble,
  type NotificationSetting, type InsertNotificationSetting,
  type ProductRecommendationSetting, type InsertProductRecommendationSetting,
  type ProductTrigger, type InsertProductTrigger,
  type SupervisorInvitation, type InsertSupervisorInvitation,
  merchants, supervisors, sessions, messages, triggers, knowledge, knowledgeChunks, notifications, admins, crawledLinks, agents, sources, suggestedQuestions, chatLogs, agentSupervisors, mediaAttachments, platformSettings, landingPageSettings,
  workShifts, shiftAssignments, workReports, quickReplies, chatButtons, productCards, productCardButtons, welcomeBubbles, notificationSettings, productRecommendationSettings, productTriggers, supervisorInvitations,
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
  updateSupervisor(id: string, data: Partial<Supervisor>): Promise<Supervisor | undefined>;
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
  getKnowledgeByAgent(agentId: string): Promise<Knowledge | undefined>;
  setKnowledge(merchantId: string, content: string, agentId?: string): Promise<Knowledge>;
  setKnowledgeByAgent(merchantId: string, agentId: string, content: string): Promise<Knowledge>;

  getNotifications(supervisorId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationSeen(id: string): Promise<boolean>;
  
  getAnalytics(merchantId: string): Promise<AnalyticsData>;
  
  getKnowledgeChunks(merchantId: string, agentId?: string): Promise<KnowledgeChunk[]>;
  createKnowledgeChunk(chunk: InsertKnowledgeChunk): Promise<KnowledgeChunk>;
  deleteKnowledgeChunks(merchantId: string, agentId?: string): Promise<boolean>;
  updateChunkEmbedding(id: string, embedding: string): Promise<boolean>;
  
  getCrawledLinks(merchantId: string): Promise<CrawledLink[]>;
  createCrawledLink(link: InsertCrawledLink): Promise<CrawledLink>;
  updateCrawledLink(id: string, data: Partial<CrawledLink>): Promise<CrawledLink | undefined>;
  deleteCrawledLink(id: string): Promise<boolean>;
  
  deleteMerchant(id: string): Promise<boolean>;
  deleteSession(id: string): Promise<boolean>;
  getAllMerchants(): Promise<Merchant[]>;
  
  getChatLogs(merchantId: string, date?: Date): Promise<ChatLog[]>;
  createChatLog(chatLog: InsertChatLog): Promise<ChatLog>;
  
  getAgentSupervisors(agentId: string): Promise<AgentSupervisor[]>;
  getSupervisorAgents(supervisorId: string): Promise<AgentSupervisor[]>;
  createAgentSupervisor(data: InsertAgentSupervisor): Promise<AgentSupervisor>;
  deleteAgentSupervisor(id: string): Promise<boolean>;
  deleteAgentSupervisorsByAgent(agentId: string): Promise<boolean>;
  deleteAgentSupervisorsBySupervisor(supervisorId: string): Promise<boolean>;
  countAgentSupervisors(agentId: string): Promise<number>;
  
  getExpiredSessions(merchantId: string, retentionHours: number): Promise<Session[]>;
  deleteSessionMessages(sessionId: string): Promise<boolean>;
  
  createMediaAttachment(data: { sessionId: string; agentId?: string | null; type: string; url: string; fileName?: string; fileSize?: number; mimeType?: string }): Promise<MediaAttachment>;
  getMediaAttachments(sessionId: string): Promise<MediaAttachment[]>;
  
  // Landing Page Settings
  getLandingPageSettings(): Promise<LandingPageSettings | undefined>;
  updateLandingPageSettings(data: Partial<InsertLandingPageSettings>): Promise<LandingPageSettings>;
  
  // Work Scheduler
  getWorkShifts(merchantId: string): Promise<WorkShift[]>;
  getWorkShift(id: string): Promise<WorkShift | undefined>;
  createWorkShift(shift: InsertWorkShift): Promise<WorkShift>;
  updateWorkShift(id: string, data: Partial<WorkShift>): Promise<WorkShift | undefined>;
  deleteWorkShift(id: string): Promise<boolean>;
  
  // Shift Assignments
  getShiftAssignments(merchantId: string): Promise<ShiftAssignment[]>;
  getShiftAssignmentsByShift(shiftId: string): Promise<ShiftAssignment[]>;
  getShiftAssignmentsByAssignee(assigneeId: string): Promise<ShiftAssignment[]>;
  createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment>;
  deleteShiftAssignment(id: string): Promise<boolean>;
  
  // Work Reports
  getWorkReports(merchantId: string, startDate?: Date, endDate?: Date): Promise<WorkReport[]>;
  getWorkReportsByAssignee(assigneeId: string): Promise<WorkReport[]>;
  createWorkReport(report: InsertWorkReport): Promise<WorkReport>;
  updateWorkReport(id: string, data: Partial<WorkReport>): Promise<WorkReport | undefined>;
  
  // Quick Replies
  getQuickReplies(merchantId: string): Promise<QuickReply[]>;
  getQuickReply(id: string): Promise<QuickReply | undefined>;
  createQuickReply(reply: InsertQuickReply): Promise<QuickReply>;
  updateQuickReply(id: string, data: Partial<QuickReply>): Promise<QuickReply | undefined>;
  deleteQuickReply(id: string): Promise<boolean>;
  
  // Chat Buttons
  getChatButtons(merchantId: string): Promise<ChatButton[]>;
  getChatButton(id: string): Promise<ChatButton | undefined>;
  createChatButton(button: InsertChatButton): Promise<ChatButton>;
  updateChatButton(id: string, data: Partial<ChatButton>): Promise<ChatButton | undefined>;
  deleteChatButton(id: string): Promise<boolean>;
  
  // Product Cards
  getProductCards(merchantId: string, agentId?: string): Promise<ProductCard[]>;
  getProductCard(id: string): Promise<ProductCard | undefined>;
  createProductCard(card: InsertProductCard): Promise<ProductCard>;
  updateProductCard(id: string, data: Partial<ProductCard>): Promise<ProductCard | undefined>;
  deleteProductCard(id: string): Promise<boolean>;
  
  // Product Card Buttons
  getProductCardButtons(cardId: string): Promise<ProductCardButton[]>;
  createProductCardButton(button: InsertProductCardButton): Promise<ProductCardButton>;
  updateProductCardButton(id: string, data: Partial<ProductCardButton>): Promise<ProductCardButton | undefined>;
  deleteProductCardButton(id: string): Promise<boolean>;
  deleteProductCardButtonsByCard(cardId: string): Promise<boolean>;
  
  // Welcome Bubble
  getWelcomeBubble(merchantId: string): Promise<WelcomeBubble | undefined>;
  upsertWelcomeBubble(merchantId: string, data: Partial<InsertWelcomeBubble>): Promise<WelcomeBubble>;
  
  // Notification Settings
  getNotificationSettings(merchantId: string): Promise<NotificationSetting | undefined>;
  upsertNotificationSettings(merchantId: string, data: Partial<InsertNotificationSetting>): Promise<NotificationSetting>;
  
  // Product Recommendation Settings
  getProductRecommendationSettings(merchantId: string): Promise<ProductRecommendationSetting | undefined>;
  upsertProductRecommendationSettings(merchantId: string, data: Partial<InsertProductRecommendationSetting>): Promise<ProductRecommendationSetting>;
  
  // Product Triggers
  getProductTriggers(merchantId: string, agentId?: string): Promise<ProductTrigger[]>;
  getProductTrigger(id: string): Promise<ProductTrigger | undefined>;
  createProductTrigger(trigger: InsertProductTrigger): Promise<ProductTrigger>;
  updateProductTrigger(id: string, data: Partial<ProductTrigger>): Promise<ProductTrigger | undefined>;
  deleteProductTrigger(id: string): Promise<boolean>;
  
  // Supervisor Invitations
  getSupervisorInvitations(merchantId: string): Promise<SupervisorInvitation[]>;
  getSupervisorInvitation(id: string): Promise<SupervisorInvitation | undefined>;
  getSupervisorInvitationByToken(token: string): Promise<SupervisorInvitation | undefined>;
  getSupervisorInvitationByEmail(email: string, merchantId: string): Promise<SupervisorInvitation | undefined>;
  createSupervisorInvitation(invitation: InsertSupervisorInvitation): Promise<SupervisorInvitation>;
  updateSupervisorInvitation(id: string, data: Partial<SupervisorInvitation>): Promise<SupervisorInvitation | undefined>;
  deleteSupervisorInvitation(id: string): Promise<boolean>;
  
  // Admin & Platform Settings
  getAdmin(id: string): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(data: InsertAdmin): Promise<Admin>;
  getPlatformSetting(key: string): Promise<string | null>;
  setPlatformSetting(key: string, value: string): Promise<void>;
  getAllPlatformSettings(): Promise<Record<string, string>>;
  recalculateTrialExpiryForActiveMerchants(trialDays: number): Promise<number>;
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

  async updateSupervisor(id: string, data: Partial<Supervisor>): Promise<Supervisor | undefined> {
    const result = await db.update(supervisors)
      .set(data)
      .where(eq(supervisors.id, id))
      .returning();
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
      messageType: data.messageType || "text",
      payload: data.payload || null,
      clientMessageId: data.clientMessageId || null,
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
    const result = await db.select().from(knowledge)
      .where(and(eq(knowledge.merchantId, merchantId), sql`${knowledge.agentId} IS NULL`));
    return result[0];
  }

  async getKnowledgeByAgent(agentId: string): Promise<Knowledge | undefined> {
    const result = await db.select().from(knowledge).where(eq(knowledge.agentId, agentId));
    return result[0];
  }

  async setKnowledge(merchantId: string, content: string, agentId?: string): Promise<Knowledge> {
    if (agentId) {
      return this.setKnowledgeByAgent(merchantId, agentId, content);
    }
    const existingResult = await db.select().from(knowledge)
      .where(and(eq(knowledge.merchantId, merchantId), sql`${knowledge.agentId} IS NULL`));
    const existing = existingResult[0];
    
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

  async setKnowledgeByAgent(merchantId: string, agentId: string, content: string): Promise<Knowledge> {
    const existing = await this.getKnowledgeByAgent(agentId);
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
      agentId,
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
            if (sorted[j].from === "chatvice") {
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

  async getKnowledgeChunks(merchantId: string, agentId?: string): Promise<KnowledgeChunk[]> {
    if (agentId) {
      return db.select().from(knowledgeChunks)
        .where(and(eq(knowledgeChunks.merchantId, merchantId), eq(knowledgeChunks.agentId, agentId)));
    }
    return db.select().from(knowledgeChunks)
      .where(and(eq(knowledgeChunks.merchantId, merchantId), sql`${knowledgeChunks.agentId} IS NULL`));
  }

  async createKnowledgeChunk(data: InsertKnowledgeChunk): Promise<KnowledgeChunk> {
    const id = generateId("kc_");
    const result = await db.insert(knowledgeChunks).values({
      id,
      merchantId: data.merchantId,
      agentId: data.agentId || null,
      content: data.content,
      embedding: data.embedding || null,
    }).returning();
    return result[0];
  }

  async deleteKnowledgeChunks(merchantId: string, agentId?: string): Promise<boolean> {
    if (agentId) {
      await db.delete(knowledgeChunks)
        .where(and(eq(knowledgeChunks.merchantId, merchantId), eq(knowledgeChunks.agentId, agentId)))
        .returning();
    } else {
      await db.delete(knowledgeChunks)
        .where(and(eq(knowledgeChunks.merchantId, merchantId), sql`${knowledgeChunks.agentId} IS NULL`))
        .returning();
    }
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

  async getPlatformSetting(key: string): Promise<string | null> {
    const result = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return result[0]?.value || null;
  }

  async setPlatformSetting(key: string, value: string): Promise<void> {
    const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    if (existing.length > 0) {
      await db.update(platformSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(platformSettings.key, key));
    } else {
      const id = generateId("ps_");
      await db.insert(platformSettings).values({
        id,
        key,
        value,
      });
    }
  }

  async getAllPlatformSettings(): Promise<Record<string, string>> {
    const settings = await db.select().from(platformSettings);
    return settings.reduce((acc, s) => {
      if (s.value) acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);
  }

  async recalculateTrialExpiryForActiveMerchants(trialDays: number): Promise<number> {
    // Find all merchants who are on trial (free plan with trial not yet expired)
    const allMerchants = await db.select().from(merchants);
    const now = new Date();
    let updatedCount = 0;
    
    for (const merchant of allMerchants) {
      // Only update merchants who are on free plan and their trial has not expired yet
      if (merchant.subscriptionPlanId === "free" && merchant.trialEndsAt) {
        const originalTrialEnd = new Date(merchant.trialEndsAt as Date);
        // Only recalculate if trial hasn't expired
        if (originalTrialEnd > now) {
          // Recalculate based on createdAt + new trial days
          const createdAt = merchant.createdAt ? new Date(merchant.createdAt) : new Date();
          const newTrialEnd = new Date(createdAt);
          newTrialEnd.setDate(newTrialEnd.getDate() + trialDays);
          
          await db.update(merchants)
            .set({ trialEndsAt: newTrialEnd })
            .where(eq(merchants.id, merchant.id));
          updatedCount++;
        }
      }
    }
    
    return updatedCount;
  }

  async getAllMerchants(): Promise<Merchant[]> {
    return db.select().from(merchants).orderBy(desc(merchants.createdAt));
  }

  async updateMerchantSubscription(id: string, data: {
    paymentCustomerId?: string | null;
    paymentSubscriptionId?: string | null;
    paymentProvider?: string;
    lastInvoiceId?: string | null;
    pendingTransactionId?: string | null;
    subscriptionStatus?: string;
    subscriptionPlanId?: string;
    currentPeriodEnd?: Date;
    billingInterval?: string;
    conversationsUsed?: number;
    conversationsResetAt?: Date;
    customConversationsLimit?: number | null;
    customAgentsLimit?: number | null;
    customSupervisorsLimit?: number | null;
    customSourcesLimit?: number | null;
    customSuggestedQuestionsLimit?: number | null;
    customMonthlyPrice?: number | null;
    customAnnualPrice?: number | null;
  }): Promise<Merchant | undefined> {
    const result = await db.update(merchants)
      .set(data)
      .where(eq(merchants.id, id))
      .returning();
    return result[0];
  }

  async incrementConversationUsage(merchantId: string, credits: number = 1): Promise<void> {
    const safeCredits = Math.max(1, Math.floor(credits));
    await db.execute(sql`
      UPDATE ${merchants}
      SET conversations_used = COALESCE(conversations_used, 0) + ${safeCredits}
      WHERE id = ${merchantId}
    `);
  }

  calculateCreditsFromCustomerId(customerId: string): number {
    return Math.ceil(customerId.length / 500);
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
      photoUrl: data.photoUrl || "",
      systemPrompt: data.systemPrompt || "",
      toneStyle: data.toneStyle || "formal",
      autoEscalateAngry: data.autoEscalateAngry ?? false,
      welcomeMessageEnabled: data.welcomeMessageEnabled ?? false,
      welcomeMessageText: data.welcomeMessageText || "Halo! Ada yang bisa saya bantu?",
      goodbyeMessageEnabled: data.goodbyeMessageEnabled ?? false,
      goodbyeMessageText: data.goodbyeMessageText || "Terima kasih sudah menghubungi kami!",
      inactivityTimeoutSeconds: data.inactivityTimeoutSeconds ?? 120,
      temperature: data.temperature || "0.7",
      primaryColor: data.primaryColor || "#6b5dfc",
      widgetTheme: data.widgetTheme || "light",
      bubblePosition: data.bubblePosition || "right",
      widgetWelcomeMessage: data.widgetWelcomeMessage || "Hi! How can I help you today?",
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

  async getSuggestedQuestions(merchantId: string, agentId?: string): Promise<SuggestedQuestion[]> {
    if (agentId) {
      return db.select().from(suggestedQuestions)
        .where(and(eq(suggestedQuestions.merchantId, merchantId), eq(suggestedQuestions.agentId, agentId)))
        .orderBy(suggestedQuestions.sortOrder);
    }
    return db.select().from(suggestedQuestions)
      .where(eq(suggestedQuestions.merchantId, merchantId))
      .orderBy(suggestedQuestions.sortOrder);
  }

  async getSuggestedQuestion(id: string): Promise<SuggestedQuestion | undefined> {
    const result = await db.select().from(suggestedQuestions).where(eq(suggestedQuestions.id, id));
    return result[0];
  }

  async createSuggestedQuestion(data: InsertSuggestedQuestion): Promise<SuggestedQuestion> {
    const id = generateId("sq_");
    const result = await db.insert(suggestedQuestions).values({
      id,
      merchantId: data.merchantId,
      agentId: data.agentId || null,
      question: data.question,
      answer: data.answer,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    }).returning();
    return result[0];
  }

  async updateSuggestedQuestion(id: string, data: Partial<SuggestedQuestion>): Promise<SuggestedQuestion | undefined> {
    const result = await db.update(suggestedQuestions)
      .set(data)
      .where(eq(suggestedQuestions.id, id))
      .returning();
    return result[0];
  }

  async deleteSuggestedQuestion(id: string): Promise<boolean> {
    const result = await db.delete(suggestedQuestions)
      .where(eq(suggestedQuestions.id, id))
      .returning();
    return result.length > 0;
  }

  async getChatLogs(merchantId: string, date?: Date): Promise<ChatLog[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return db.select().from(chatLogs)
        .where(and(
          eq(chatLogs.merchantId, merchantId),
          gte(chatLogs.clearedAt, startOfDay),
          sql`${chatLogs.clearedAt} <= ${endOfDay}`
        ))
        .orderBy(desc(chatLogs.clearedAt));
    }
    return db.select().from(chatLogs)
      .where(eq(chatLogs.merchantId, merchantId))
      .orderBy(desc(chatLogs.clearedAt));
  }

  async createChatLog(data: InsertChatLog): Promise<ChatLog> {
    const id = generateId("cl_");
    const result = await db.insert(chatLogs).values({
      id,
      ...data,
    }).returning();
    return result[0];
  }

  async getAgentSupervisors(agentId: string): Promise<AgentSupervisor[]> {
    return db.select().from(agentSupervisors)
      .where(eq(agentSupervisors.agentId, agentId));
  }

  async getSupervisorAgents(supervisorId: string): Promise<AgentSupervisor[]> {
    return db.select().from(agentSupervisors)
      .where(eq(agentSupervisors.supervisorId, supervisorId));
  }

  async createAgentSupervisor(data: InsertAgentSupervisor): Promise<AgentSupervisor> {
    const id = generateId("as_");
    const result = await db.insert(agentSupervisors).values({
      id,
      ...data,
    }).returning();
    return result[0];
  }

  async deleteAgentSupervisor(id: string): Promise<boolean> {
    const result = await db.delete(agentSupervisors)
      .where(eq(agentSupervisors.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteAgentSupervisorsByAgent(agentId: string): Promise<boolean> {
    await db.delete(agentSupervisors)
      .where(eq(agentSupervisors.agentId, agentId));
    return true;
  }

  async deleteAgentSupervisorsBySupervisor(supervisorId: string): Promise<boolean> {
    await db.delete(agentSupervisors)
      .where(eq(agentSupervisors.supervisorId, supervisorId));
    return true;
  }

  async countAgentSupervisors(agentId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(agentSupervisors)
      .where(eq(agentSupervisors.agentId, agentId));
    return result[0]?.count || 0;
  }

  async getExpiredSessions(merchantId: string, retentionHours: number): Promise<Session[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - retentionHours);
    
    return db.select().from(sessions)
      .where(and(
        eq(sessions.merchantId, merchantId),
        sql`${sessions.lastActivity} < ${cutoffTime}`
      ));
  }

  async deleteSessionMessages(sessionId: string): Promise<boolean> {
    await db.delete(messages).where(eq(messages.sessionId, sessionId));
    return true;
  }

  async createMediaAttachment(data: { sessionId: string; agentId?: string | null; type: string; url: string; fileName?: string; fileSize?: number; mimeType?: string }): Promise<MediaAttachment> {
    const id = generateId("ma_");
    const session = await this.getSession(data.sessionId);
    const merchantId = session?.merchantId || "";
    
    const result = await db.insert(mediaAttachments).values({
      id,
      sessionId: data.sessionId,
      merchantId,
      type: data.type,
      url: data.url,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
    }).returning();
    return result[0];
  }

  async getMediaAttachments(sessionId: string): Promise<MediaAttachment[]> {
    return db.select().from(mediaAttachments)
      .where(eq(mediaAttachments.sessionId, sessionId))
      .orderBy(desc(mediaAttachments.createdAt));
  }

  async getLandingPageSettings(): Promise<LandingPageSettings | undefined> {
    const result = await db.select().from(landingPageSettings)
      .where(eq(landingPageSettings.id, "default"));
    return result[0];
  }

  async updateLandingPageSettings(data: Partial<InsertLandingPageSettings>): Promise<LandingPageSettings> {
    const existing = await this.getLandingPageSettings();
    
    if (existing) {
      const result = await db.update(landingPageSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(landingPageSettings.id, "default"))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(landingPageSettings)
        .values({ id: "default", ...data })
        .returning();
      return result[0];
    }
  }

  // Work Scheduler implementations
  async getWorkShifts(merchantId: string): Promise<WorkShift[]> {
    return db.select().from(workShifts)
      .where(eq(workShifts.merchantId, merchantId))
      .orderBy(desc(workShifts.createdAt));
  }

  async getWorkShift(id: string): Promise<WorkShift | undefined> {
    const result = await db.select().from(workShifts).where(eq(workShifts.id, id));
    return result[0];
  }

  async createWorkShift(shift: InsertWorkShift): Promise<WorkShift> {
    const id = generateId("ws_");
    const result = await db.insert(workShifts).values({ ...shift, id }).returning();
    return result[0];
  }

  async updateWorkShift(id: string, data: Partial<WorkShift>): Promise<WorkShift | undefined> {
    const result = await db.update(workShifts)
      .set(data)
      .where(eq(workShifts.id, id))
      .returning();
    return result[0];
  }

  async deleteWorkShift(id: string): Promise<boolean> {
    await db.delete(shiftAssignments).where(eq(shiftAssignments.shiftId, id));
    await db.delete(workShifts).where(eq(workShifts.id, id));
    return true;
  }

  // Shift Assignments
  async getShiftAssignments(merchantId: string): Promise<ShiftAssignment[]> {
    return db.select().from(shiftAssignments)
      .where(eq(shiftAssignments.merchantId, merchantId));
  }

  async getShiftAssignmentsByShift(shiftId: string): Promise<ShiftAssignment[]> {
    return db.select().from(shiftAssignments)
      .where(eq(shiftAssignments.shiftId, shiftId));
  }

  async getShiftAssignmentsByAssignee(assigneeId: string): Promise<ShiftAssignment[]> {
    return db.select().from(shiftAssignments)
      .where(eq(shiftAssignments.assigneeId, assigneeId));
  }

  async createShiftAssignment(assignment: InsertShiftAssignment): Promise<ShiftAssignment> {
    const id = generateId("sa_");
    const result = await db.insert(shiftAssignments).values({ ...assignment, id }).returning();
    return result[0];
  }

  async deleteShiftAssignment(id: string): Promise<boolean> {
    await db.delete(shiftAssignments).where(eq(shiftAssignments.id, id));
    return true;
  }

  // Work Reports
  async getWorkReports(merchantId: string, startDate?: Date, endDate?: Date): Promise<WorkReport[]> {
    let query = db.select().from(workReports).where(eq(workReports.merchantId, merchantId));
    return query.orderBy(desc(workReports.date));
  }

  async getWorkReportsByAssignee(assigneeId: string): Promise<WorkReport[]> {
    return db.select().from(workReports)
      .where(eq(workReports.assigneeId, assigneeId))
      .orderBy(desc(workReports.date));
  }

  async createWorkReport(report: InsertWorkReport): Promise<WorkReport> {
    const id = generateId("wr_");
    const result = await db.insert(workReports).values({ ...report, id }).returning();
    return result[0];
  }

  async updateWorkReport(id: string, data: Partial<WorkReport>): Promise<WorkReport | undefined> {
    const result = await db.update(workReports)
      .set(data)
      .where(eq(workReports.id, id))
      .returning();
    return result[0];
  }

  // Quick Replies
  async getQuickReplies(merchantId: string): Promise<QuickReply[]> {
    return db.select().from(quickReplies)
      .where(eq(quickReplies.merchantId, merchantId))
      .orderBy(quickReplies.sortOrder);
  }

  async getQuickReply(id: string): Promise<QuickReply | undefined> {
    const result = await db.select().from(quickReplies).where(eq(quickReplies.id, id));
    return result[0];
  }

  async createQuickReply(reply: InsertQuickReply): Promise<QuickReply> {
    const id = generateId("qr_");
    const result = await db.insert(quickReplies).values({ ...reply, id }).returning();
    return result[0];
  }

  async updateQuickReply(id: string, data: Partial<QuickReply>): Promise<QuickReply | undefined> {
    const result = await db.update(quickReplies)
      .set(data)
      .where(eq(quickReplies.id, id))
      .returning();
    return result[0];
  }

  async deleteQuickReply(id: string): Promise<boolean> {
    await db.delete(quickReplies).where(eq(quickReplies.id, id));
    return true;
  }

  // Chat Buttons
  async getChatButtons(merchantId: string): Promise<ChatButton[]> {
    return db.select().from(chatButtons)
      .where(eq(chatButtons.merchantId, merchantId))
      .orderBy(chatButtons.sortOrder);
  }

  async getChatButton(id: string): Promise<ChatButton | undefined> {
    const result = await db.select().from(chatButtons).where(eq(chatButtons.id, id));
    return result[0];
  }

  async createChatButton(button: InsertChatButton): Promise<ChatButton> {
    const id = generateId("cb_");
    const result = await db.insert(chatButtons).values({ ...button, id }).returning();
    return result[0];
  }

  async updateChatButton(id: string, data: Partial<ChatButton>): Promise<ChatButton | undefined> {
    const result = await db.update(chatButtons)
      .set(data)
      .where(eq(chatButtons.id, id))
      .returning();
    return result[0];
  }

  async deleteChatButton(id: string): Promise<boolean> {
    await db.delete(chatButtons).where(eq(chatButtons.id, id));
    return true;
  }

  // Product Cards
  async getProductCards(merchantId: string, agentId?: string): Promise<ProductCard[]> {
    if (agentId) {
      return db.select().from(productCards)
        .where(and(eq(productCards.merchantId, merchantId), eq(productCards.agentId, agentId)))
        .orderBy(productCards.sortOrder);
    }
    return db.select().from(productCards)
      .where(eq(productCards.merchantId, merchantId))
      .orderBy(productCards.sortOrder);
  }

  async getProductCard(id: string): Promise<ProductCard | undefined> {
    const result = await db.select().from(productCards).where(eq(productCards.id, id));
    return result[0];
  }

  async createProductCard(card: InsertProductCard): Promise<ProductCard> {
    const id = generateId("pc_");
    const result = await db.insert(productCards).values({ ...card, id }).returning();
    return result[0];
  }

  async updateProductCard(id: string, data: Partial<ProductCard>): Promise<ProductCard | undefined> {
    const result = await db.update(productCards)
      .set(data)
      .where(eq(productCards.id, id))
      .returning();
    return result[0];
  }

  async deleteProductCard(id: string): Promise<boolean> {
    await db.delete(productCardButtons).where(eq(productCardButtons.cardId, id));
    await db.delete(productCards).where(eq(productCards.id, id));
    return true;
  }

  // Product Card Buttons
  async getProductCardButtons(cardId: string): Promise<ProductCardButton[]> {
    return db.select().from(productCardButtons)
      .where(eq(productCardButtons.cardId, cardId))
      .orderBy(productCardButtons.sortOrder);
  }

  async createProductCardButton(button: InsertProductCardButton): Promise<ProductCardButton> {
    const id = generateId("pcb_");
    const result = await db.insert(productCardButtons).values({ ...button, id }).returning();
    return result[0];
  }

  async updateProductCardButton(id: string, data: Partial<ProductCardButton>): Promise<ProductCardButton | undefined> {
    const result = await db.update(productCardButtons)
      .set(data)
      .where(eq(productCardButtons.id, id))
      .returning();
    return result[0];
  }

  async deleteProductCardButton(id: string): Promise<boolean> {
    await db.delete(productCardButtons).where(eq(productCardButtons.id, id));
    return true;
  }

  async deleteProductCardButtonsByCard(cardId: string): Promise<boolean> {
    await db.delete(productCardButtons).where(eq(productCardButtons.cardId, cardId));
    return true;
  }

  // Welcome Bubble
  async getWelcomeBubble(merchantId: string): Promise<WelcomeBubble | undefined> {
    const result = await db.select().from(welcomeBubbles)
      .where(eq(welcomeBubbles.merchantId, merchantId));
    return result[0];
  }

  async upsertWelcomeBubble(merchantId: string, data: Partial<InsertWelcomeBubble>): Promise<WelcomeBubble> {
    const existing = await this.getWelcomeBubble(merchantId);
    
    if (existing) {
      const result = await db.update(welcomeBubbles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(welcomeBubbles.merchantId, merchantId))
        .returning();
      return result[0];
    } else {
      const id = generateId("wb_");
      const result = await db.insert(welcomeBubbles)
        .values({ id, merchantId, ...data })
        .returning();
      return result[0];
    }
  }

  // Notification Settings
  async getNotificationSettings(merchantId: string): Promise<NotificationSetting | undefined> {
    const result = await db.select().from(notificationSettings)
      .where(eq(notificationSettings.merchantId, merchantId));
    return result[0];
  }

  async upsertNotificationSettings(merchantId: string, data: Partial<InsertNotificationSetting>): Promise<NotificationSetting> {
    const existing = await this.getNotificationSettings(merchantId);
    
    if (existing) {
      const result = await db.update(notificationSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(notificationSettings.merchantId, merchantId))
        .returning();
      return result[0];
    } else {
      const id = generateId("ns_");
      const result = await db.insert(notificationSettings)
        .values({ id, merchantId, ...data })
        .returning();
      return result[0];
    }
  }

  // Product Recommendation Settings
  async getProductRecommendationSettings(merchantId: string): Promise<ProductRecommendationSetting | undefined> {
    const result = await db.select().from(productRecommendationSettings)
      .where(eq(productRecommendationSettings.merchantId, merchantId));
    return result[0];
  }

  async upsertProductRecommendationSettings(merchantId: string, data: Partial<InsertProductRecommendationSetting>): Promise<ProductRecommendationSetting> {
    const existing = await this.getProductRecommendationSettings(merchantId);
    
    if (existing) {
      const result = await db.update(productRecommendationSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(productRecommendationSettings.merchantId, merchantId))
        .returning();
      return result[0];
    } else {
      const id = generateId("prs_");
      const result = await db.insert(productRecommendationSettings)
        .values({ id, merchantId, ...data })
        .returning();
      return result[0];
    }
  }

  // Product Triggers
  async getProductTriggers(merchantId: string, agentId?: string): Promise<ProductTrigger[]> {
    if (agentId) {
      return db.select().from(productTriggers)
        .where(and(eq(productTriggers.merchantId, merchantId), eq(productTriggers.agentId, agentId)));
    }
    return db.select().from(productTriggers)
      .where(eq(productTriggers.merchantId, merchantId));
  }

  async getProductTrigger(id: string): Promise<ProductTrigger | undefined> {
    const result = await db.select().from(productTriggers)
      .where(eq(productTriggers.id, id));
    return result[0];
  }

  async createProductTrigger(trigger: InsertProductTrigger): Promise<ProductTrigger> {
    const id = generateId("pt_");
    const result = await db.insert(productTriggers).values({ ...trigger, id }).returning();
    return result[0];
  }

  async updateProductTrigger(id: string, data: Partial<ProductTrigger>): Promise<ProductTrigger | undefined> {
    const result = await db.update(productTriggers)
      .set(data)
      .where(eq(productTriggers.id, id))
      .returning();
    return result[0];
  }

  async deleteProductTrigger(id: string): Promise<boolean> {
    const result = await db.delete(productTriggers).where(eq(productTriggers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Supervisor Invitations
  async getSupervisorInvitations(merchantId: string): Promise<SupervisorInvitation[]> {
    return db.select().from(supervisorInvitations)
      .where(eq(supervisorInvitations.merchantId, merchantId))
      .orderBy(desc(supervisorInvitations.createdAt));
  }

  async getSupervisorInvitation(id: string): Promise<SupervisorInvitation | undefined> {
    const result = await db.select().from(supervisorInvitations)
      .where(eq(supervisorInvitations.id, id));
    return result[0];
  }

  async getSupervisorInvitationByToken(token: string): Promise<SupervisorInvitation | undefined> {
    const result = await db.select().from(supervisorInvitations)
      .where(eq(supervisorInvitations.token, token));
    return result[0];
  }

  async getSupervisorInvitationByEmail(email: string, merchantId: string): Promise<SupervisorInvitation | undefined> {
    const result = await db.select().from(supervisorInvitations)
      .where(and(eq(supervisorInvitations.email, email), eq(supervisorInvitations.merchantId, merchantId)));
    return result[0];
  }

  async createSupervisorInvitation(invitation: InsertSupervisorInvitation): Promise<SupervisorInvitation> {
    const id = generateId("inv_");
    const result = await db.insert(supervisorInvitations).values({ ...invitation, id }).returning();
    return result[0];
  }

  async updateSupervisorInvitation(id: string, data: Partial<SupervisorInvitation>): Promise<SupervisorInvitation | undefined> {
    const result = await db.update(supervisorInvitations)
      .set(data)
      .where(eq(supervisorInvitations.id, id))
      .returning();
    return result[0];
  }

  async deleteSupervisorInvitation(id: string): Promise<boolean> {
    const result = await db.delete(supervisorInvitations).where(eq(supervisorInvitations.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
