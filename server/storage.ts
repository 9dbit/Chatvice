import {
  type Merchant, type InsertMerchant,
  type Supervisor, type InsertSupervisor,
  type Session, type InsertSession,
  type Message, type InsertMessage,
  type Trigger, type InsertTrigger,
  type Knowledge, type InsertKnowledge,
  type Notification, type InsertNotification,
} from "@shared/schema";
import { randomBytes } from "crypto";

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
  createMessage(message: InsertMessage): Promise<Message>;

  getTriggers(merchantId: string): Promise<Trigger[]>;
  createTrigger(trigger: InsertTrigger): Promise<Trigger>;
  deleteTrigger(id: string): Promise<boolean>;

  getKnowledge(merchantId: string): Promise<Knowledge | undefined>;
  setKnowledge(merchantId: string, content: string): Promise<Knowledge>;

  getNotifications(supervisorId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationSeen(id: string): Promise<boolean>;
}

function generateId(prefix: string = ""): string {
  return prefix + randomBytes(8).toString("hex");
}

export class MemStorage implements IStorage {
  private merchants: Map<string, Merchant> = new Map();
  private supervisors: Map<string, Supervisor> = new Map();
  private sessions: Map<string, Session> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private triggers: Map<string, Trigger> = new Map();
  private knowledge: Map<string, Knowledge> = new Map();
  private notifications: Map<string, Notification> = new Map();

  async getMerchant(id: string): Promise<Merchant | undefined> {
    return this.merchants.get(id);
  }

  async getMerchantByEmail(email: string): Promise<Merchant | undefined> {
    return Array.from(this.merchants.values()).find((m) => m.email === email);
  }

  async createMerchant(data: InsertMerchant): Promise<Merchant> {
    const id = generateId("m_");
    const merchant: Merchant = {
      id,
      email: data.email,
      password: data.password,
      companyName: data.companyName,
      iconUrl: data.iconUrl || "",
      iconSize: data.iconSize || 70,
      online: data.online ?? true,
      primaryColor: data.primaryColor || "#6b5dfc",
      welcomeMessage: data.welcomeMessage || "Hi! How can I help you today?",
    };
    this.merchants.set(id, merchant);
    return merchant;
  }

  async updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined> {
    const merchant = this.merchants.get(id);
    if (!merchant) return undefined;
    const updated = { ...merchant, ...data };
    this.merchants.set(id, updated);
    return updated;
  }

  async getSupervisor(id: string): Promise<Supervisor | undefined> {
    return this.supervisors.get(id);
  }

  async getSupervisorByEmail(email: string): Promise<Supervisor | undefined> {
    return Array.from(this.supervisors.values()).find((s) => s.email === email);
  }

  async getSupervisorsByMerchant(merchantId: string): Promise<Supervisor[]> {
    return Array.from(this.supervisors.values()).filter((s) => s.merchantId === merchantId);
  }

  async createSupervisor(data: InsertSupervisor): Promise<Supervisor> {
    const id = generateId("sup_");
    const supervisor: Supervisor = {
      id,
      merchantId: data.merchantId,
      email: data.email,
      name: data.name,
      password: data.password,
    };
    this.supervisors.set(id, supervisor);
    return supervisor;
  }

  async deleteSupervisor(id: string): Promise<boolean> {
    return this.supervisors.delete(id);
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getSessionsByMerchant(merchantId: string): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter((s) => s.merchantId === merchantId)
      .sort((a, b) => {
        const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return bTime - aTime;
      });
  }

  async createSession(data: InsertSession): Promise<Session> {
    const session: Session = {
      id: data.id,
      merchantId: data.merchantId,
      mode: data.mode || "AI",
      supervisorId: data.supervisorId || null,
      customerName: data.customerName || "Customer",
      lastActivity: new Date(),
    };
    this.sessions.set(data.id, session);
    return session;
  }

  async updateSession(id: string, data: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    const updated = { ...session, ...data, lastActivity: new Date() };
    this.sessions.set(id, updated);
    return updated;
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return this.messages.get(sessionId) || [];
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const id = generateId("msg_");
    const message: Message = {
      id,
      sessionId: data.sessionId,
      from: data.from,
      content: data.content,
      timestamp: new Date(),
    };
    const existing = this.messages.get(data.sessionId) || [];
    existing.push(message);
    this.messages.set(data.sessionId, existing);
    return message;
  }

  async getTriggers(merchantId: string): Promise<Trigger[]> {
    return Array.from(this.triggers.values()).filter((t) => t.merchantId === merchantId);
  }

  async createTrigger(data: InsertTrigger): Promise<Trigger> {
    const id = generateId("trg_");
    const trigger: Trigger = {
      id,
      merchantId: data.merchantId,
      keyword: data.keyword,
    };
    this.triggers.set(id, trigger);
    return trigger;
  }

  async deleteTrigger(id: string): Promise<boolean> {
    return this.triggers.delete(id);
  }

  async getKnowledge(merchantId: string): Promise<Knowledge | undefined> {
    return Array.from(this.knowledge.values()).find((k) => k.merchantId === merchantId);
  }

  async setKnowledge(merchantId: string, content: string): Promise<Knowledge> {
    const existing = await this.getKnowledge(merchantId);
    if (existing) {
      const updated = { ...existing, content };
      this.knowledge.set(existing.id, updated);
      return updated;
    }
    const id = generateId("kb_");
    const knowledge: Knowledge = { id, merchantId, content };
    this.knowledge.set(id, knowledge);
    return knowledge;
  }

  async getNotifications(supervisorId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.supervisorId === supervisorId)
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      });
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const id = generateId("notif_");
    const notification: Notification = {
      id,
      supervisorId: data.supervisorId,
      sessionId: data.sessionId,
      message: data.message,
      seen: data.seen ?? false,
      timestamp: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationSeen(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    notification.seen = true;
    this.notifications.set(id, notification);
    return true;
  }
}

export const storage = new MemStorage();
