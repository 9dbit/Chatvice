import { pgTable, text, varchar, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const merchants = pgTable("merchants", {
  id: varchar("id", { length: 32 }).primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  companyName: text("company_name").notNull(),
  iconUrl: text("icon_url").default(""),
  iconSize: integer("icon_size").default(70),
  online: boolean("online").default(true),
  primaryColor: text("primary_color").default("#6b5dfc"),
  welcomeMessage: text("welcome_message").default("Hi! How can I help you today?"),
  profilePhotoUrl: text("profile_photo_url").default(""),
  agentName: text("agent_name").default("Jeany AI"),
  agentPhotoUrl: text("agent_photo_url").default(""),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  subscriptionStatus: text("subscription_status").default("trial"),
  subscriptionPlanId: text("subscription_plan_id").default("starter"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodEnd: timestamp("current_period_end"),
  billingInterval: text("billing_interval").default("monthly"),
  conversationsUsed: integer("conversations_used").default(0),
  conversationsResetAt: timestamp("conversations_reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMerchantSchema = createInsertSchema(merchants).omit({ id: true });
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;

export const supervisors = pgTable("supervisors", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  password: text("password").notNull(),
});

export const insertSupervisorSchema = createInsertSchema(supervisors).omit({ id: true });
export type InsertSupervisor = z.infer<typeof insertSupervisorSchema>;
export type Supervisor = typeof supervisors.$inferSelect;

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  mode: text("mode").notNull().default("AI"),
  supervisorId: varchar("supervisor_id", { length: 32 }),
  customerName: text("customer_name").default("Customer"),
  lastActivity: timestamp("last_activity").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({ lastActivity: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export const messages = pgTable("messages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  from: text("from").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, timestamp: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const triggers = pgTable("triggers", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  keyword: text("keyword").notNull(),
});

export const insertTriggerSchema = createInsertSchema(triggers).omit({ id: true });
export type InsertTrigger = z.infer<typeof insertTriggerSchema>;
export type Trigger = typeof triggers.$inferSelect;

export const knowledge = pgTable("knowledge", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull().unique(),
  content: text("content").notNull(),
});

export const insertKnowledgeSchema = createInsertSchema(knowledge).omit({ id: true });
export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;
export type Knowledge = typeof knowledge.$inferSelect;

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  content: text("content").notNull(),
  embedding: text("embedding"),
});

export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunks).omit({ id: true });
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;

export const crawledLinks = pgTable("crawled_links", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  url: text("url").notNull(),
  title: text("title"),
  status: text("status").default("pending"),
  extractedContent: text("extracted_content"),
  crawledAt: timestamp("crawled_at").defaultNow(),
});

export const insertCrawledLinkSchema = createInsertSchema(crawledLinks).omit({ id: true, crawledAt: true });
export type InsertCrawledLink = z.infer<typeof insertCrawledLinkSchema>;
export type CrawledLink = typeof crawledLinks.$inferSelect;

export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 32 }).primaryKey(),
  supervisorId: varchar("supervisor_id", { length: 32 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  message: text("message").notNull(),
  seen: boolean("seen").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, timestamp: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const chatAskSchema = z.object({
  merchantId: z.string().min(1),
  sessionId: z.string().min(1),
  message: z.string().min(1),
});
export type ChatAskRequest = z.infer<typeof chatAskSchema>;

export const chatResponseSchema = z.object({
  answer: z.string(),
  mode: z.enum(["AI", "HUMAN"]),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const merchantConfigSchema = z.object({
  iconUrl: z.string().optional(),
  iconSize: z.number().min(40).max(120).optional(),
  online: z.boolean().optional(),
  primaryColor: z.string().optional(),
  welcomeMessage: z.string().optional(),
  agentName: z.string().optional(),
  agentPhotoUrl: z.string().optional(),
  widgetTheme: z.enum(["light", "dark"]).optional(),
  bubblePosition: z.enum(["left", "right"]).optional(),
});
export type MerchantConfig = z.infer<typeof merchantConfigSchema>;

export const registerMerchantSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().min(2),
});
export type RegisterMerchantRequest = z.infer<typeof registerMerchantSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const admins = pgTable("admins", {
  id: varchar("id", { length: 32 }).primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

export const subscriptionPlans = {
  starter: {
    id: "starter" as const,
    name: "Starter",
    description: "Perfect for small businesses getting started",
    monthlyPrice: 29,
    annualPrice: 24,
    conversationsLimit: 500,
    supervisorsLimit: 1,
    features: ["500 AI conversations/month", "1 Team member", "Basic analytics", "Email support", "Widget customization"] as const,
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    description: "For growing businesses with higher volume",
    monthlyPrice: 79,
    annualPrice: 66,
    conversationsLimit: 5000,
    supervisorsLimit: 5,
    features: ["5,000 AI conversations/month", "5 Team members", "Advanced analytics", "Priority support", "Custom triggers", "Knowledge base", "API access"] as const,
  },
  enterprise: {
    id: "enterprise" as const,
    name: "Enterprise",
    description: "Custom solution for large organizations",
    monthlyPrice: 199,
    annualPrice: 167,
    conversationsLimit: -1,
    supervisorsLimit: -1,
    features: ["Unlimited conversations", "Unlimited team members", "Custom integrations", "Dedicated support", "SLA guarantee", "White-label solution"],
  },
} as const;

export type SubscriptionPlanId = keyof typeof subscriptionPlans;
export type SubscriptionStatus = "trial" | "active" | "canceled" | "expired" | "past_due";
