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
  widgetTheme: text("widget_theme").default("light"),
  bubblePosition: text("bubble_position").default("right"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  subscriptionStatus: text("subscription_status").default("trial"),
  subscriptionPlanId: text("subscription_plan_id").default("free"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodEnd: timestamp("current_period_end"),
  billingInterval: text("billing_interval").default("monthly"),
  conversationsUsed: integer("conversations_used").default(0),
  conversationsResetAt: timestamp("conversations_reset_at"),
  identitySecretKey: text("identity_secret_key"),
  allowedDomains: text("allowed_domains").default(""),
  chatTimeout: integer("chat_timeout").default(300),
  rateLimitMessages: integer("rate_limit_messages").default(30),
  rateLimitWindow: integer("rate_limit_window").default(60),
  customDomain: text("custom_domain").default(""),
  customDomainStatus: text("custom_domain_status").default("pending"),
  collectCustomerEmail: boolean("collect_customer_email").default(false),
  collectCustomerPhone: boolean("collect_customer_phone").default(false),
  activeAgentId: varchar("active_agent_id", { length: 32 }),
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
  photoUrl: text("photo_url").default(""),
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
  allowedDomains: z.string().optional(),
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

export const agents = pgTable("agents", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  knowledgeContent: text("knowledge_content").default(""),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export const sources = pgTable("sources", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  content: text("content").default(""),
  url: text("url").default(""),
  isActive: boolean("is_active").default(true),
  charCount: integer("char_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSourceSchema = createInsertSchema(sources).omit({ id: true, createdAt: true });
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Source = typeof sources.$inferSelect;

export const subscriptionPlans = {
  free: {
    id: "free" as const,
    name: "Free",
    description: "Get started with AI customer support",
    monthlyPrice: 0,
    annualPrice: 0,
    conversationsLimit: 20,
    supervisorsLimit: 0,
    agentsLimit: 1,
    sourcesLimit: 1,
    features: [
      "20 AI conversations/month",
      "1 AI Agent",
      "400,000 characters/agent",
      "Basic widget customization",
      "Community support",
    ] as const,
    restrictions: ["No team members", "No custom domain", "Jeany AI branding"] as const,
  },
  starter: {
    id: "starter" as const,
    name: "Starter",
    description: "Perfect for small businesses getting started",
    monthlyPrice: 29,
    annualPrice: 24,
    conversationsLimit: 2000,
    supervisorsLimit: 1,
    agentsLimit: 1,
    sourcesLimit: 5,
    features: [
      "2,000 AI conversations/month",
      "1 AI Agent",
      "1 Team member",
      "5 Knowledge sources",
      "11M characters/agent",
      "Widget customization",
      "Email support",
      "Basic analytics",
      "Remove Jeany branding",
    ] as const,
    restrictions: ["No chat topics analytics", "No custom domain"] as const,
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    description: "For growing businesses with higher volume",
    monthlyPrice: 99,
    annualPrice: 83,
    conversationsLimit: 10000,
    supervisorsLimit: 5,
    agentsLimit: 3,
    sourcesLimit: 20,
    features: [
      "10,000 AI conversations/month",
      "3 AI Agents",
      "5 Team members",
      "20 Knowledge sources",
      "11M characters/agent",
      "Advanced analytics & Chat topics",
      "Priority email support",
      "Custom triggers",
      "API access",
      "Custom domain",
      "Identity verification",
      "Allowed domains control",
    ] as const,
    restrictions: [] as const,
  },
  enterprise: {
    id: "enterprise" as const,
    name: "Enterprise",
    description: "For large organizations with custom needs",
    monthlyPrice: 499,
    annualPrice: 416,
    conversationsLimit: 50000,
    supervisorsLimit: -1,
    agentsLimit: 10,
    sourcesLimit: -1,
    features: [
      "50,000 AI conversations/month",
      "10 AI Agents",
      "Unlimited team members",
      "Unlimited knowledge sources",
      "11M characters/agent",
      "Advanced analytics & Chat topics",
      "Dedicated support manager",
      "Custom integrations",
      "SLA guarantee",
      "White-label solution",
      "Custom domain",
      "Identity verification",
      "Allowed domains control",
      "Priority queue",
    ] as const,
    restrictions: [] as const,
  },
  custom: {
    id: "custom" as const,
    name: "Custom",
    description: "Tailored solution for your unique requirements",
    monthlyPrice: -1,
    annualPrice: -1,
    conversationsLimit: -1,
    supervisorsLimit: -1,
    agentsLimit: -1,
    sourcesLimit: -1,
    features: [
      "Unlimited conversations",
      "Unlimited AI Agents",
      "Unlimited team members",
      "Unlimited knowledge sources",
      "Custom character limits",
      "Dedicated infrastructure",
      "24/7 premium support",
      "Custom SLA",
      "On-premise deployment option",
      "Custom integrations",
      "Personalized onboarding",
      "Strategic account management",
    ] as const,
    restrictions: [] as const,
  },
} as const;

export type SubscriptionPlanId = keyof typeof subscriptionPlans;
export type SubscriptionStatus = "trial" | "active" | "canceled" | "expired" | "past_due";
