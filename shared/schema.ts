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
  iconWidth: integer("icon_width"),
  iconHeight: integer("icon_height"),
  useCustomIconDimensions: boolean("use_custom_icon_dimensions").default(false),
  online: boolean("online").default(true),
  primaryColor: text("primary_color").default("#6b5dfc"),
  welcomeMessage: text("welcome_message").default("Hi! How can I help you today?"),
  profilePhotoUrl: text("profile_photo_url").default(""),
  agentName: text("agent_name").default("Chatvice"),
  agentPhotoUrl: text("agent_photo_url").default(""),
  widgetTheme: text("widget_theme").default("light"),
  bubblePosition: text("bubble_position").default("right"),
  paymentCustomerId: text("payment_customer_id"),
  paymentSubscriptionId: text("payment_subscription_id"),
  paymentProvider: text("payment_provider").default("kompaspay"),
  lastInvoiceId: text("last_invoice_id"),
  pendingTransactionId: text("pending_transaction_id"),
  subscriptionStatus: text("subscription_status").default("trial"),
  subscriptionPlanId: text("subscription_plan_id").default("free"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodEnd: timestamp("current_period_end"),
  billingInterval: text("billing_interval").default("monthly"),
  conversationsUsed: integer("conversations_used").default(0),
  conversationsResetAt: timestamp("conversations_reset_at"),
  bgRemovalUsed: integer("bg_removal_used").default(0),
  bgRemovalResetAt: timestamp("bg_removal_reset_at"),
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
  // Custom plan configuration (used when subscriptionPlanId is "custom")
  customConversationsLimit: integer("custom_conversations_limit"),
  customAgentsLimit: integer("custom_agents_limit"),
  customSupervisorsLimit: integer("custom_supervisors_limit"),
  customSourcesLimit: integer("custom_sources_limit"),
  customSuggestedQuestionsLimit: integer("custom_suggested_questions_limit"),
  customMonthlyPrice: integer("custom_monthly_price"),
  customAnnualPrice: integer("custom_annual_price"),
  // Scheduled plan change (for downgrades - activates after current period ends)
  scheduledPlanId: text("scheduled_plan_id"),
  scheduledBillingInterval: text("scheduled_billing_interval"),
  scheduledPlanActivatesAt: timestamp("scheduled_plan_activates_at"),
  scheduledPlanTransactionId: text("scheduled_plan_transaction_id"),
  // Additional merchant profile fields
  websiteUrl: text("website_url").default(""),
  picName: text("pic_name").default(""), // Person in Charge
  phone: text("phone").default(""),
  country: text("country").default(""),
  city: text("city").default(""),
  region: text("region").default(""),
  // Email verification
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  // OAuth providers
  googleId: text("google_id"),
  githubId: text("github_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email verification tokens for merchant registration
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({ id: true, createdAt: true });
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

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
  role: text("role").default("supervisor"),
  status: text("status").default("offline"),
  lastSeen: timestamp("last_seen"),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  invitedById: varchar("invited_by_id", { length: 32 }),
});

export const insertSupervisorSchema = createInsertSchema(supervisors).omit({ id: true });
export type InsertSupervisor = z.infer<typeof insertSupervisorSchema>;
export type Supervisor = typeof supervisors.$inferSelect;

// Supervisor Invitations - for email-based invitation flow
export const supervisorInvitations = pgTable("supervisor_invitations", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  token: text("token").notNull(),
  status: text("status").default("pending"),
  invitedById: varchar("invited_by_id", { length: 32 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertSupervisorInvitationSchema = createInsertSchema(supervisorInvitations).omit({ id: true, createdAt: true });
export type InsertSupervisorInvitation = z.infer<typeof insertSupervisorInvitationSchema>;
export type SupervisorInvitation = typeof supervisorInvitations.$inferSelect;

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  mode: text("mode").notNull().default("AI"),
  supervisorId: varchar("supervisor_id", { length: 32 }),
  agentId: varchar("agent_id", { length: 32 }),
  customerName: text("customer_name").default("Customer"),
  customerEmail: text("customer_email"),
  lastActivity: timestamp("last_activity").defaultNow(),
  needsSupervisorAttention: boolean("needs_supervisor_attention").default(false),
  status: text("status").default("active"),
  plannedClearAt: timestamp("planned_clear_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({ lastActivity: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export const messages = pgTable("messages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  from: text("from").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"),
  payload: jsonb("payload"),
  clientMessageId: varchar("client_message_id", { length: 64 }),
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
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  content: text("content").notNull(),
});

export const insertKnowledgeSchema = createInsertSchema(knowledge).omit({ id: true });
export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;
export type Knowledge = typeof knowledge.$inferSelect;

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  content: text("content").notNull(),
  embedding: text("embedding"),
});

export const insertKnowledgeChunkSchema = createInsertSchema(knowledgeChunks).omit({ id: true });
export type InsertKnowledgeChunk = z.infer<typeof insertKnowledgeChunkSchema>;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;

export const crawledLinks = pgTable("crawled_links", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
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
  clientMessageId: z.string().optional(),
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
  iconWidth: z.number().min(20).max(500).optional(),
  iconHeight: z.number().min(20).max(500).optional(),
  useCustomIconDimensions: z.boolean().optional(),
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
  websiteUrl: z.string().optional(),
  picName: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
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

export const platformSettings = pgTable("platform_settings", {
  id: varchar("id", { length: 32 }).primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;

export const agents = pgTable("agents", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  photoUrl: text("photo_url").default(""),
  knowledgeContent: text("knowledge_content").default(""),
  systemPrompt: text("system_prompt").default(""),
  toneStyle: text("tone_style").default("formal"),
  autoEscalateAngry: boolean("auto_escalate_angry").default(false),
  welcomeMessageEnabled: boolean("welcome_message_enabled").default(false),
  welcomeMessageText: text("welcome_message_text").default("Halo! Ada yang bisa saya bantu?"),
  goodbyeMessageEnabled: boolean("goodbye_message_enabled").default(false),
  goodbyeMessageText: text("goodbye_message_text").default("Terima kasih sudah menghubungi kami!"),
  inactivityTimeoutSeconds: integer("inactivity_timeout_seconds").default(120),
  temperature: text("temperature").default("0.7"),
  isActive: boolean("is_active").default(true),
  supervisorId: varchar("supervisor_id", { length: 32 }),
  // Per-agent widget settings
  primaryColor: text("primary_color").default("#6b5dfc"),
  widgetTheme: text("widget_theme").default("light"),
  bubblePosition: text("bubble_position").default("right"),
  widgetWelcomeMessage: text("widget_welcome_message").default("Hi! How can I help you today?"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mediaAttachments = pgTable("media_attachments", {
  id: varchar("id", { length: 32 }).primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  messageId: varchar("message_id", { length: 64 }),
  type: text("type").notNull(),
  url: text("url").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMediaAttachmentSchema = createInsertSchema(mediaAttachments).omit({ id: true, createdAt: true });
export type InsertMediaAttachment = z.infer<typeof insertMediaAttachmentSchema>;
export type MediaAttachment = typeof mediaAttachments.$inferSelect;

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export const agentWidgetSettingsSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional(),
  widgetTheme: z.enum(["light", "dark"]).optional(),
  bubblePosition: z.enum(["left", "right"]).optional(),
  widgetWelcomeMessage: z.string().max(500, "Welcome message too long").optional(),
  photoUrl: z.string().max(500000, "Photo data too large").optional(),
  name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
});
export type AgentWidgetSettings = z.infer<typeof agentWidgetSettingsSchema>;

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

export const suggestedQuestions = pgTable("suggested_questions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSuggestedQuestionSchema = createInsertSchema(suggestedQuestions).omit({ id: true, createdAt: true });
export type InsertSuggestedQuestion = z.infer<typeof insertSuggestedQuestionSchema>;
export type SuggestedQuestion = typeof suggestedQuestions.$inferSelect;

export const chatLogs = pgTable("chat_logs", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  supervisorId: varchar("supervisor_id", { length: 32 }),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  summary: text("summary").notNull(),
  messageCount: integer("message_count").default(0),
  fullTranscript: text("full_transcript").notNull(),
  extractedKnowledge: text("extracted_knowledge"),
  sessionStartedAt: timestamp("session_started_at"),
  sessionEndedAt: timestamp("session_ended_at"),
  clearedAt: timestamp("cleared_at").defaultNow(),
});

export const insertChatLogSchema = createInsertSchema(chatLogs).omit({ id: true, clearedAt: true });
export type InsertChatLog = z.infer<typeof insertChatLogSchema>;
export type ChatLog = typeof chatLogs.$inferSelect;

export const agentSupervisors = pgTable("agent_supervisors", {
  id: varchar("id", { length: 32 }).primaryKey(),
  agentId: varchar("agent_id", { length: 32 }).notNull(),
  supervisorId: varchar("supervisor_id", { length: 32 }).notNull(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentSupervisorSchema = createInsertSchema(agentSupervisors).omit({ id: true, createdAt: true });
export type InsertAgentSupervisor = z.infer<typeof insertAgentSupervisorSchema>;
export type AgentSupervisor = typeof agentSupervisors.$inferSelect;

export const subscriptionPlans = {
  free: {
    id: "free" as const,
    name: "Free",
    description: "Get started with AI customer support",
    monthlyPrice: 0,
    annualPrice: 0,
    conversationsLimit: 20,
    supervisorsLimit: 1,
    agentsLimit: 1,
    sourcesLimit: 1,
    suggestedQuestionsLimit: 0,
    supervisorsPerAgentLimit: 1,
    domainsLimit: 1,
    chatRetentionHours: 1,
    bgRemovalLimit: 0,
    features: [
      "20 AI conversations/month",
      "1 AI Agent",
      "1 Supervisor",
      "1 hour chat history",
      "400,000 characters/agent",
      "1 allowed domain",
      "Basic widget customization",
      "Community support",
    ] as const,
    restrictions: ["No custom domain", "Chatvice branding", "No suggested questions"] as const,
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
    suggestedQuestionsLimit: 5,
    supervisorsPerAgentLimit: 1,
    domainsLimit: 1,
    chatRetentionHours: 12,
    bgRemovalLimit: 3,
    features: [
      "2,000 AI conversations/month",
      "1 AI Agent",
      "1 Supervisor",
      "12 hours chat history",
      "5 Knowledge sources",
      "5 Suggested questions",
      "11M characters/agent",
      "1 allowed domain",
      "Widget customization",
      "Email support",
      "Basic analytics",
      "Remove Chatvice branding",
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
    supervisorsLimit: 3,
    agentsLimit: 3,
    sourcesLimit: 20,
    suggestedQuestionsLimit: 5,
    supervisorsPerAgentLimit: 3,
    domainsLimit: 2,
    chatRetentionHours: 24,
    bgRemovalLimit: 5,
    features: [
      "10,000 AI conversations/month",
      "3 AI Agents",
      "3 Supervisors",
      "24 hours chat history",
      "20 Knowledge sources",
      "5 Suggested questions",
      "11M characters/agent",
      "2 allowed domains",
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
    supervisorsLimit: 5,
    agentsLimit: 10,
    sourcesLimit: -1,
    suggestedQuestionsLimit: 5,
    supervisorsPerAgentLimit: 5,
    domainsLimit: 3,
    chatRetentionHours: 24,
    bgRemovalLimit: 10,
    features: [
      "50,000 AI conversations/month",
      "10 AI Agents",
      "5 Supervisors",
      "24 hours chat history",
      "Unlimited knowledge sources",
      "5 Suggested questions",
      "11M characters/agent",
      "3 allowed domains",
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
    suggestedQuestionsLimit: -1,
    supervisorsPerAgentLimit: -1,
    domainsLimit: 5,
    chatRetentionHours: 24,
    bgRemovalLimit: 15,
    features: [
      "Unlimited conversations",
      "Unlimited AI Agents",
      "Unlimited supervisors per agent",
      "24 hours chat history",
      "Unlimited team members",
      "Unlimited knowledge sources",
      "Unlimited suggested questions",
      "Custom character limits",
      "5 allowed domains",
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

// Platform DNS Settings
export const platformDnsSettings = pgTable("platform_dns_settings", {
  id: varchar("id", { length: 32 }).primaryKey(),
  platformDomain: text("platform_domain").default("chatvice.com"),
  widgetSubdomain: text("widget_subdomain").default("widget.chatvice.com"),
  nsPrimary: text("ns_primary").default("ns1.chatvice-dns.com"),
  nsSecondary: text("ns_secondary").default("ns2.chatvice-dns.com"),
  dnsTtl: integer("dns_ttl").default(3600),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PlatformDnsSettings = typeof platformDnsSettings.$inferSelect;
export type InsertPlatformDnsSettings = typeof platformDnsSettings.$inferInsert;

// Landing Page Settings for Admin customization
export const landingPageSettings = pgTable("landing_page_settings", {
  id: varchar("id", { length: 32 }).primaryKey(),
  // Hero Section
  heroBackgroundUrl: text("hero_background_url").default(""),
  heroBackgroundPositionX: integer("hero_background_position_x").default(50), // percentage 0-100
  heroBackgroundPositionY: integer("hero_background_position_y").default(-570), // pixels
  heroBackgroundPositionYMobile: integer("hero_background_position_y_mobile").default(-150), // pixels for mobile
  heroContentOffsetY: integer("hero_content_offset_y").default(70), // pixels from top
  heroContentOffsetYMobile: integer("hero_content_offset_y_mobile").default(160), // pixels from top for mobile
  // Hero Text Content
  heroDateText: text("hero_date_text").default("09 December 2025"),
  heroTitle: text("hero_title").default("Meet"),
  heroTitleHighlight: text("hero_title_highlight").default("LEXA1"),
  heroSubtitle: text("hero_subtitle").default("AI-powered customer service platform that transforms how you connect with customers."),
  heroPrimaryButtonText: text("hero_primary_button_text").default("Start Building Free"),
  heroPrimaryButtonUrl: text("hero_primary_button_url").default("/register"),
  heroSecondaryButtonText: text("hero_secondary_button_text").default("Explore Features"),
  heroSecondaryButtonUrl: text("hero_secondary_button_url").default("/features"),
  // Running Text Banner
  runningTextContent: text("running_text_content").default("MEET LEXA1. THE NEXT POWERFUL AI CHATBOT."),
  runningTextSpeed: integer("running_text_speed").default(60), // animation duration in seconds
  runningTextVisible: boolean("running_text_visible").default(true),
  // Theme Colors
  primaryColor: text("primary_color").default("#7c3aed"),
  runningTextBgColor: text("running_text_bg_color").default("#7c3aed"),
  // Feature Section
  featuresSectionVisible: boolean("features_section_visible").default(true),
  featuresSectionTitle: text("features_section_title").default("Powerful Features"),
  featuresSectionSubtitle: text("features_section_subtitle").default("Everything you need to deliver exceptional customer service"),
  // Additional Settings
  extras: jsonb("extras").default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Brand Identity
  logoUrl: text("logo_url").default(""),
  faviconUrl: text("favicon_url").default(""),
  ogImageUrl: text("og_image_url").default(""),
  // SEO Meta Tags
  metaTitle: text("meta_title").default("Chatvice - AI-Powered Customer Service Platform"),
  metaDescription: text("meta_description").default("Transform your customer support with Chatvice's AI-powered chatbots. Reduce costs, improve satisfaction, and scale your customer service effortlessly."),
  canonicalUrl: text("canonical_url").default(""),
  robotsTxt: text("robots_txt").default("User-agent: *\nAllow: /\n\nSitemap: https://chatvice.com/sitemap.xml"),
  sitemapUrl: text("sitemap_url").default(""),
});

export const insertLandingPageSettingsSchema = createInsertSchema(landingPageSettings).omit({ id: true, updatedAt: true });
export type InsertLandingPageSettings = z.infer<typeof insertLandingPageSettingsSchema>;
export type LandingPageSettings = typeof landingPageSettings.$inferSelect;

// Stored Files - for persistent file storage in database
export const storedFiles = pgTable("stored_files", {
  id: varchar("id", { length: 64 }).primaryKey(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  content: text("content").notNull(), // Base64 encoded content
  category: text("category").default("brand"), // brand, avatar, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStoredFileSchema = createInsertSchema(storedFiles).omit({ createdAt: true });
export type InsertStoredFile = z.infer<typeof insertStoredFileSchema>;
export type StoredFile = typeof storedFiles.$inferSelect;

// Work Scheduler - Shifts for supervisors and AI agents
export const workShifts = pgTable("work_shifts", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  name: text("name").notNull(),
  dayType: text("day_type").notNull().default("weekday"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isNightShift: boolean("is_night_shift").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkShiftSchema = createInsertSchema(workShifts).omit({ id: true, createdAt: true });
export type InsertWorkShift = z.infer<typeof insertWorkShiftSchema>;
export type WorkShift = typeof workShifts.$inferSelect;

// Shift Assignments - assign shifts to supervisors or agents
export const shiftAssignments = pgTable("shift_assignments", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  shiftId: varchar("shift_id", { length: 32 }).notNull(),
  assigneeId: varchar("assignee_id", { length: 32 }).notNull(),
  assigneeType: text("assignee_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertShiftAssignmentSchema = createInsertSchema(shiftAssignments).omit({ id: true, createdAt: true });
export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;

// Work Reports - track work hours
export const workReports = pgTable("work_reports", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  assigneeId: varchar("assignee_id", { length: 32 }).notNull(),
  assigneeType: text("assignee_type").notNull(),
  date: timestamp("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  hoursWorked: integer("hours_worked").default(0),
  minutesWorked: integer("minutes_worked").default(0),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkReportSchema = createInsertSchema(workReports).omit({ id: true, createdAt: true });
export type InsertWorkReport = z.infer<typeof insertWorkReportSchema>;
export type WorkReport = typeof workReports.$inferSelect;

// Quick Replies - pre-defined instant replies for supervisors
export const quickReplies = pgTable("quick_replies", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  shortcut: text("shortcut").notNull(),
  label: text("label").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuickReplySchema = createInsertSchema(quickReplies).omit({ id: true, createdAt: true });
export type InsertQuickReply = z.infer<typeof insertQuickReplySchema>;
export type QuickReply = typeof quickReplies.$inferSelect;

// Chat Buttons - clickable response buttons for supervisors
export const chatButtons = pgTable("chat_buttons", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  label: text("label").notNull(),
  url: text("url").default(""),
  buttonType: text("button_type").default("link"),
  triggerWord: text("trigger_word").default(""),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatButtonSchema = createInsertSchema(chatButtons).omit({ id: true, createdAt: true });
export type InsertChatButton = z.infer<typeof insertChatButtonSchema>;
export type ChatButton = typeof chatButtons.$inferSelect;

// Product Cards - for product recommendation carousels
export const productCards = pgTable("product_cards", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  title: text("title").notNull(),
  description: text("description").default(""),
  imageUrl: text("image_url").default(""),
  sourceUrl: text("source_url").default(""),
  price: text("price").default(""),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductCardSchema = createInsertSchema(productCards).omit({ id: true, createdAt: true });
export type InsertProductCard = z.infer<typeof insertProductCardSchema>;
export type ProductCard = typeof productCards.$inferSelect;

// Product Card Buttons - up to 3 buttons per card
export const productCardButtons = pgTable("product_card_buttons", {
  id: varchar("id", { length: 32 }).primaryKey(),
  cardId: varchar("card_id", { length: 32 }).notNull(),
  label: text("label").notNull(),
  url: text("url").default(""),
  buttonType: text("button_type").default("link"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductCardButtonSchema = createInsertSchema(productCardButtons).omit({ id: true, createdAt: true });
export type InsertProductCardButton = z.infer<typeof insertProductCardButtonSchema>;
export type ProductCardButton = typeof productCardButtons.$inferSelect;

// Welcome Bubble Settings
export const welcomeBubbles = pgTable("welcome_bubbles", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull().unique(),
  headline: text("headline").default("Hi!"),
  message: text("message").default("Looking for something specific? We'll help you find it!"),
  button1Label: text("button1_label").default("Chat with us"),
  button1Url: text("button1_url").default(""),
  button1Color: text("button1_color").default("#E84E3C"),
  button2Label: text("button2_label").default("Product expert"),
  button2Url: text("button2_url").default(""),
  button2Color: text("button2_color").default("#1a1a1a"),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWelcomeBubbleSchema = createInsertSchema(welcomeBubbles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWelcomeBubble = z.infer<typeof insertWelcomeBubbleSchema>;
export type WelcomeBubble = typeof welcomeBubbles.$inferSelect;

// Notification Settings
export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull().unique(),
  incomingChatSound: text("incoming_chat_sound").default("default"),
  incomingChatEnabled: boolean("incoming_chat_enabled").default(true),
  chatReplySound: text("chat_reply_sound").default("default"),
  chatReplyEnabled: boolean("chat_reply_enabled").default(true),
  angryCustomerSound: text("angry_customer_sound").default("alert"),
  angryCustomerEnabled: boolean("angry_customer_enabled").default(true),
  customSounds: jsonb("custom_sounds").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationSettingSchema = createInsertSchema(notificationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNotificationSetting = z.infer<typeof insertNotificationSettingSchema>;
export type NotificationSetting = typeof notificationSettings.$inferSelect;

// Product Recommendation Settings
export const productRecommendationSettings = pgTable("product_recommendation_settings", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull().unique(),
  aiAutoRecommendEnabled: boolean("ai_auto_recommend_enabled").default(true),
  triggerKeywords: text("trigger_keywords").default("product,recommend,buy,shop,item,catalog"),
  aiContextTriggerEnabled: boolean("ai_context_trigger_enabled").default(true),
  supervisorCanRecommend: boolean("supervisor_can_recommend").default(true),
  maxProductsPerRecommendation: integer("max_products_per_recommendation").default(3),
  showPriceInRecommendation: boolean("show_price_in_recommendation").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductRecommendationSettingSchema = createInsertSchema(productRecommendationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductRecommendationSetting = z.infer<typeof insertProductRecommendationSettingSchema>;
export type ProductRecommendationSetting = typeof productRecommendationSettings.$inferSelect;

// Product Triggers - map keywords to specific product cards for AI recommendations
export const productTriggers = pgTable("product_triggers", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  productCardId: varchar("product_card_id", { length: 32 }).notNull(),
  keywords: text("keywords").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductTriggerSchema = createInsertSchema(productTriggers).omit({ id: true, createdAt: true });
export type InsertProductTrigger = z.infer<typeof insertProductTriggerSchema>;
export type ProductTrigger = typeof productTriggers.$inferSelect;

// Role permissions constants - controls dashboard page access
export const rolePermissions = {
  administrator: {
    overview: true,
    agents: true,
    sessions: true,
    chatLogs: true,
    settings: true,
    knowledgeBase: true,
    widgetSettings: true,
    sources: true,
    analytics: true,
    billing: true,
    supervisors: true,
    workScheduler: true,
    notifications: true,
    quickReplies: true,
    teamActivity: true,
    livePreview: true,
    productCards: true,
  },
  supervisor: {
    overview: false,
    agents: false,
    sessions: true,
    chatLogs: true,
    settings: false,
    knowledgeBase: false,
    widgetSettings: false,
    sources: false,
    analytics: false,
    billing: false,
    supervisors: false,
    workScheduler: false,
    notifications: false,
    quickReplies: false,
    teamActivity: false,
    livePreview: false,
    productCards: false,
  },
} as const;

export type UserRole = "merchant" | "supervisor";
export type SupervisorRole = keyof typeof rolePermissions;

// Promotional Discounts - platform-wide discount codes managed by admin
export const promotions = pgTable("promotions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  discountPercent: integer("discount_percent").notNull(),
  targetPlans: text("target_plans").array().notNull(), // ['all', 'starter', 'pro', 'enterprise'] or specific plans
  billingCycle: varchar("billing_cycle", { length: 20 }).default("both"), // 'monthly', 'annual', 'both'
  maxUses: integer("max_uses"), // null means unlimited
  usedCount: integer("used_count").default(0),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false), // true = show on pricing pages automatically
  showUpsell: boolean("show_upsell").default(true), // show "Save X%" badge on pricing
  bgColor: varchar("bg_color", { length: 50 }).default("#16a34a"), // banner background color
  textColor: varchar("text_color", { length: 50 }).default("#ffffff"), // banner text color
  bannerMode: varchar("banner_mode", { length: 20 }).default("color"), // 'color' = solid color + text, 'image' = image only, 'overlay' = image + text overlay
  bannerImageUrl: text("banner_image_url"), // uploaded image URL for image/overlay mode (Desktop: 1200x300px)
  bannerImageMobileUrl: text("banner_image_mobile_url"), // mobile version image URL (600x200px, 3:1 ratio)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({ id: true, usedCount: true, createdAt: true, updatedAt: true });
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotions.$inferSelect;

// Promotion Usage History - tracks each time a promotion is used
export const promotionUsage = pgTable("promotion_usage", {
  id: varchar("id", { length: 32 }).primaryKey(),
  promotionId: varchar("promotion_id", { length: 32 }).notNull(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  planId: varchar("plan_id", { length: 32 }).notNull(),
  originalPrice: integer("original_price").notNull(),
  discountedPrice: integer("discounted_price").notNull(),
  discountAmount: integer("discount_amount").notNull(),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull(),
  usedAt: timestamp("used_at").defaultNow(),
});

export const insertPromotionUsageSchema = createInsertSchema(promotionUsage).omit({ id: true, usedAt: true });
export type InsertPromotionUsage = z.infer<typeof insertPromotionUsageSchema>;
export type PromotionUsage = typeof promotionUsage.$inferSelect;

// ============ Merchant Allowed Domains ============

// Allowed domains for widget embedding with validation
export const merchantDomains = pgTable("merchant_domains", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  domain: text("domain").notNull(), // e.g., "example.com" or "subdomain.example.com"
  isValidated: boolean("is_validated").default(false), // true when embed link detected on domain
  validatedAt: timestamp("validated_at"), // when validation was confirmed
  lastCheckedAt: timestamp("last_checked_at"), // last time we checked for embed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMerchantDomainSchema = createInsertSchema(merchantDomains).omit({ id: true, createdAt: true, validatedAt: true, lastCheckedAt: true });
export type InsertMerchantDomain = z.infer<typeof insertMerchantDomainSchema>;
export type MerchantDomain = typeof merchantDomains.$inferSelect;

// ============ CHATVICE TOP UP v2: Multi-tenant + Domain Tracking ============

// Widget Sites - represents a site/domain where widget is embedded
export const widgetSites = pgTable("widget_sites", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  siteCode: varchar("site_code", { length: 20 }).notNull().unique(), // short code like "GXZ"
  siteKey: varchar("site_key", { length: 64 }).notNull().unique(), // public widget key
  siteName: text("site_name").notNull(), // display name like "Game XYZ"
  coinApiBaseUrl: text("coin_api_base_url"), // merchant's coin API endpoint
  coinApiSecret: text("coin_api_secret"), // secret for signing coin credit requests
  isTopupEnabled: boolean("is_topup_enabled").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWidgetSiteSchema = createInsertSchema(widgetSites).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWidgetSite = z.infer<typeof insertWidgetSiteSchema>;
export type WidgetSite = typeof widgetSites.$inferSelect;

// Site Domain History - tracks all domains used by a site
export const siteDomains = pgTable("site_domains", {
  id: varchar("id", { length: 32 }).primaryKey(),
  siteId: varchar("site_id", { length: 32 }).notNull(),
  domain: text("domain").notNull(), // e.g., "gamexyz.com", "gamexyz123.com"
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  isCurrent: boolean("is_current").default(true), // only one per site_id should be true
});

export const insertSiteDomainSchema = createInsertSchema(siteDomains).omit({ id: true, firstSeenAt: true, lastSeenAt: true });
export type InsertSiteDomain = z.infer<typeof insertSiteDomainSchema>;
export type SiteDomain = typeof siteDomains.$inferSelect;

// Coin Orders - tracks all top-up transactions
export const coinOrders = pgTable("coin_orders", {
  id: varchar("id", { length: 32 }).primaryKey(),
  orderId: varchar("order_id", { length: 100 }).notNull().unique(), // CVT-{siteCode}-{domTag}-{timestamp}-{rand}
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  siteId: varchar("site_id", { length: 32 }).notNull(),
  userId: text("user_id").notNull(), // external user ID from merchant site
  amount: integer("amount").notNull(), // in IDR (e.g., 100000)
  channelRequested: varchar("channel_requested", { length: 20 }).default("AUTO"), // AUTO, QRIS, VA, EWALLET, BANK
  paymentType: varchar("payment_type", { length: 30 }), // actual payment method used
  paymentData: jsonb("payment_data"), // QR code, VA number, etc.
  gatewayRef: varchar("gateway_ref", { length: 100 }), // reference from payment gateway
  status: varchar("status", { length: 30 }).default("PENDING"), // PENDING, PAID, PAID_BUT_NOT_CREDITED, COMPLETED, FAILED, EXPIRED
  currentDomain: text("current_domain"), // domain at time of order
  returnUrl: text("return_url"), // where to redirect after payment
  creditedAt: timestamp("credited_at"), // when coins were credited to user
  paidAt: timestamp("paid_at"), // when payment was confirmed
  expiresAt: timestamp("expires_at"), // payment expiration
  errorMessage: text("error_message"), // if status is FAILED
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCoinOrderSchema = createInsertSchema(coinOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCoinOrder = z.infer<typeof insertCoinOrderSchema>;
export type CoinOrder = typeof coinOrders.$inferSelect;

// Top-up Nominals - configurable top-up amounts per site
export const topupNominals = pgTable("topup_nominals", {
  id: varchar("id", { length: 32 }).primaryKey(),
  siteId: varchar("site_id", { length: 32 }).notNull(),
  amount: integer("amount").notNull(), // in IDR
  coinsGiven: integer("coins_given").notNull(), // how many coins user gets
  bonusCoins: integer("bonus_coins").default(0), // extra bonus coins
  label: text("label"), // display label like "100 Coins"
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTopupNominalSchema = createInsertSchema(topupNominals).omit({ id: true, createdAt: true });
export type InsertTopupNominal = z.infer<typeof insertTopupNominalSchema>;
export type TopupNominal = typeof topupNominals.$inferSelect;

// Payment channels supported
export const paymentChannels = ["AUTO", "QRIS", "VA", "EWALLET", "BANK", "CARD", "CRYPTO"] as const;
export type PaymentChannel = typeof paymentChannels[number];

// Order status types
export const orderStatuses = ["PENDING", "PAID", "PAID_BUT_NOT_CREDITED", "COMPLETED", "FAILED", "EXPIRED"] as const;
export type OrderStatus = typeof orderStatuses[number];

// ============ Payment Gateways Configuration ============

// Payment Gateways - stores multiple payment gateway configurations
export const paymentGateways = pgTable("payment_gateways", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: text("name").notNull(), // Custom name like "PayPal", "Stripe", "Midtrans"
  isActive: boolean("is_active").default(false),
  isDefault: boolean("is_default").default(false), // Only one gateway can be default
  environment: varchar("environment", { length: 20 }).default("sandbox"), // sandbox or production
  dashboardUrl: text("dashboard_url"), // Link to gateway's dashboard
  // Configuration stored as JSON (secrets should still be in env vars, this stores non-sensitive config)
  config: jsonb("config").default({}), // { webhookUrl, merchantId, etc. }
  // Secret key names (references to env vars, not actual values)
  clientKeyEnvVar: text("client_key_env_var"), // e.g., "PAYPAL_CLIENT_ID"
  clientSecretEnvVar: text("client_secret_env_var"), // e.g., "PAYPAL_CLIENT_SECRET"
  // Supported payment methods for this gateway
  supportedMethods: text("supported_methods").array(), // ["QRIS", "VA", "EWALLET", "CARD"]
  // Fee configuration
  feePercentage: integer("fee_percentage").default(0), // in basis points (100 = 1%)
  feeFixed: integer("fee_fixed").default(0), // fixed fee in IDR
  // Currency
  currency: varchar("currency", { length: 10 }).default("IDR"),
  // Metadata
  description: text("description"),
  iconUrl: text("icon_url"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentGatewaySchema = createInsertSchema(paymentGateways).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;
export type PaymentGateway = typeof paymentGateways.$inferSelect;

// Gateway Statistics Types (for demo/reporting purposes)
export interface GatewayPeriodStats {
  transactions: number;
  volume: number;
}

export interface GatewayStats {
  gatewayId: string;
  gatewayName: string;
  daily: GatewayPeriodStats;
  weekly: GatewayPeriodStats;
  monthly: GatewayPeriodStats;
  yearly: GatewayPeriodStats;
}

// Payment Transactions - tracks all payment activities
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  gatewayId: varchar("gateway_id", { length: 32 }), // Reference to payment gateway used
  gatewayName: text("gateway_name"), // Snapshot of gateway name at time of payment
  // Transaction details
  externalId: text("external_id"), // External reference from gateway (e.g., QRIS invoice ID)
  amount: integer("amount").notNull(), // Amount in smallest currency unit (IDR)
  currency: varchar("currency", { length: 10 }).default("IDR"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, completed, failed, expired, refunded
  paymentMethod: text("payment_method"), // QRIS, VA, EWALLET, CARD, etc.
  // Subscription/Plan info
  planId: varchar("plan_id", { length: 32 }),
  planName: text("plan_name"),
  subscriptionMonths: integer("subscription_months").default(1),
  // Merchant info snapshot
  merchantEmail: text("merchant_email"),
  merchantCompanyName: text("merchant_company_name"),
  // Gateway response data
  gatewayResponse: jsonb("gateway_response").default({}),
  qrisUrl: text("qris_url"), // For QRIS payments
  // Timestamps
  paidAt: timestamp("paid_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Receipt info
  receiptSentAt: timestamp("receipt_sent_at"),
  invoiceNumber: text("invoice_number"), // e.g., INV-2024-00001
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

// Admin Notifications - for alerting admin of important events
export const adminNotifications = pgTable("admin_notifications", {
  id: varchar("id", { length: 32 }).primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // payment_received, merchant_signup, error, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").default({}), // Additional context data
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminNotificationSchema = createInsertSchema(adminNotifications).omit({ id: true, createdAt: true });
export type InsertAdminNotification = z.infer<typeof insertAdminNotificationSchema>;
export type AdminNotification = typeof adminNotifications.$inferSelect;

// ============ Chat Security Monitoring ============

// Chat Security Settings - per-merchant security configuration
export const chatSecuritySettings = pgTable("chat_security_settings", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull().unique(),
  isEnabled: boolean("is_enabled").default(true),
  sensitivity: integer("sensitivity").default(50), // 0-100 scale, higher = more sensitive
  // Email notifications
  alertEmailEnabled: boolean("alert_email_enabled").default(true),
  alertEmails: text("alert_emails").array(), // List of PIC emails to notify
  // Custom suspicious patterns (merchant can add their own)
  customPatterns: text("custom_patterns").array(), // Custom keywords/phrases to watch
  // Categories to monitor
  monitorFinancialFraud: boolean("monitor_financial_fraud").default(true),
  monitorDataTheft: boolean("monitor_data_theft").default(true),
  monitorExternalContact: boolean("monitor_external_contact").default(true),
  monitorInappropriate: boolean("monitor_inappropriate").default(true),
  // Tolerance settings
  tolerateJokes: boolean("tolerate_jokes").default(true), // Allow casual banter
  tolerateOffTopic: boolean("tolerate_off_topic").default(true), // Allow minor off-topic
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatSecuritySettingsSchema = createInsertSchema(chatSecuritySettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChatSecuritySettings = z.infer<typeof insertChatSecuritySettingsSchema>;
export type ChatSecuritySettings = typeof chatSecuritySettings.$inferSelect;

// Chat Security Alerts - stores detected suspicious conversations
export const chatSecurityAlerts = pgTable("chat_security_alerts", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  supervisorId: varchar("supervisor_id", { length: 32 }), // The supervisor involved
  // Alert details
  alertType: varchar("alert_type", { length: 50 }).notNull(), // financial_fraud, data_theft, external_contact, inappropriate, custom
  severity: varchar("severity", { length: 20 }).default("medium"), // low, medium, high, critical
  title: text("title").notNull(),
  description: text("description").notNull(),
  // Evidence
  suspiciousMessage: text("suspicious_message").notNull(), // The message that triggered alert
  conversationContext: text("conversation_context"), // Surrounding messages for context
  aiAnalysis: text("ai_analysis"), // AI explanation of why it's suspicious
  confidenceScore: integer("confidence_score").default(50), // 0-100 confidence
  // Status
  status: varchar("status", { length: 20 }).default("new"), // new, reviewed, dismissed, escalated
  reviewedBy: varchar("reviewed_by", { length: 32 }), // Merchant who reviewed
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  // Notification status
  emailSentAt: timestamp("email_sent_at"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatSecurityAlertSchema = createInsertSchema(chatSecurityAlerts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChatSecurityAlert = z.infer<typeof insertChatSecurityAlertSchema>;
export type ChatSecurityAlert = typeof chatSecurityAlerts.$inferSelect;

// ============ Crypto Payment Confirmations ============

export const cryptoPaymentConfirmations = pgTable("crypto_payment_confirmations", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  // Order details
  planId: text("plan_id").notNull(),
  planName: text("plan_name").notNull(),
  billingInterval: text("billing_interval").notNull(), // monthly or annual
  isUpgrade: boolean("is_upgrade").default(false),
  isDowngrade: boolean("is_downgrade").default(false),
  // Payment details
  cryptocurrency: text("cryptocurrency").notNull(), // BTC, ETH, etc.
  network: text("network").notNull(), // Bitcoin, ERC-20, etc.
  amountUsd: integer("amount_usd").notNull(), // in cents
  amountCrypto: text("amount_crypto").notNull(), // string to preserve precision
  walletAddress: text("wallet_address").notNull(),
  transactionHash: text("transaction_hash"),
  // Proof of payment
  proofImageUrl: text("proof_image_url"),
  // Status
  status: text("status").default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by", { length: 32 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  // Contact info
  merchantEmail: text("merchant_email").notNull(),
  merchantCompanyName: text("merchant_company_name"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCryptoPaymentConfirmationSchema = createInsertSchema(cryptoPaymentConfirmations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCryptoPaymentConfirmation = z.infer<typeof insertCryptoPaymentConfirmationSchema>;
export type CryptoPaymentConfirmation = typeof cryptoPaymentConfirmations.$inferSelect;
