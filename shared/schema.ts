import { pgTable, text, varchar, boolean, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const merchants = pgTable("merchants", {
  id: varchar("id", { length: 32 }).primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  username: text("username"),
  companyName: text("company_name"),
  officialWebsiteName: text("official_website_name"),
  officialDomain: text("official_domain"),
  profileCompleted: boolean("profile_completed").default(false),
  profileStep: integer("profile_step").default(0),
  phoneCountryCode: text("phone_country_code"),
  iconUrl: text("icon_url").default(""),
  iconVisible: boolean("icon_visible").default(true),
  iconSize: integer("icon_size").default(70),
  iconWidth: integer("icon_width"),
  iconHeight: integer("icon_height"),
  useCustomIconDimensions: boolean("use_custom_icon_dimensions").default(false),
  mobileIconWidth: integer("mobile_icon_width"),
  mobileIconHeight: integer("mobile_icon_height"),
  widgetOffset: integer("widget_offset").default(20),
  iconAnimationVertical: boolean("icon_animation_vertical").default(false),
  iconAnimationHorizontal: boolean("icon_animation_horizontal").default(false),
  iconAnimationZoom: boolean("icon_animation_zoom").default(false),
  iconAnimationRotation: boolean("icon_animation_rotation").default(false),
  iconAnimationSpeed: integer("icon_animation_speed").default(3),
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
  // Business registration fields
  businessCategory: text("business_category"),
  staffCount: text("staff_count"),
  // Social media links for widget
  socialMediaEnabled: boolean("social_media_enabled").default(false),
  socialIconStyle: text("social_icon_style").default("colored"), // "colored" or "silhouette"
  socialInstagram: text("social_instagram"),
  socialFacebook: text("social_facebook"),
  socialTelegram: text("social_telegram"),
  socialWhatsapp: text("social_whatsapp"),
  socialDiscord: text("social_discord"),
  // Custom social icons
  socialUseCustomIcons: boolean("social_use_custom_icons").default(false),
  socialCustomInstagram: text("social_custom_instagram"),
  socialCustomFacebook: text("social_custom_facebook"),
  socialCustomTelegram: text("social_custom_telegram"),
  socialCustomWhatsapp: text("social_custom_whatsapp"),
  socialCustomDiscord: text("social_custom_discord"),
  // Pre-chat form customization
  welcomeDescription: text("welcome_description").default(""),
  quickMessageOptions: text("quick_message_options").array().default([]),
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

// Domain registrations - track all registered domains to prevent duplicates
export const domainRegistrations = pgTable("domain_registrations", {
  id: varchar("id", { length: 32 }).primaryKey(),
  domain: text("domain").notNull().unique(), // Normalized domain (lowercase, no protocol/www)
  websiteName: text("website_name").notNull(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  registeredAt: timestamp("registered_at").defaultNow(),
  source: text("source").default("manual"), // manual, google_oauth, github_oauth
});

export const insertDomainRegistrationSchema = createInsertSchema(domainRegistrations).omit({ id: true, registeredAt: true });
export type InsertDomainRegistration = z.infer<typeof insertDomainRegistrationSchema>;
export type DomainRegistration = typeof domainRegistrations.$inferSelect;

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
  customerPhone: text("customer_phone"),
  bankRecords: jsonb("bank_records"), // {type: 'bank'|'ewallet'|'creditcard', name: string, number: string}[]
  leadStatus: text("lead_status").default("new"), // new, contacted, qualified, converted, lost
  lastActivity: timestamp("last_activity").defaultNow(),
  needsSupervisorAttention: boolean("needs_supervisor_attention").default(false),
  status: text("status").default("active"),
  plannedClearAt: timestamp("planned_clear_at"),
  createdAt: timestamp("created_at").defaultNow(),
  // Device fingerprint and IP for 24-hour session persistence
  deviceFingerprint: text("device_fingerprint"),
  clientIp: text("client_ip"),
}, (table) => [
  index("sessions_merchant_id_idx").on(table.merchantId),
  index("sessions_created_at_idx").on(table.createdAt),
  index("sessions_status_idx").on(table.status),
  index("sessions_device_fingerprint_idx").on(table.deviceFingerprint),
]);

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
  locationData: jsonb("location_data"),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("messages_session_id_idx").on(table.sessionId),
  index("messages_timestamp_idx").on(table.timestamp),
]);

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
}, (table) => [
  index("knowledge_merchant_id_idx").on(table.merchantId),
  index("knowledge_agent_id_idx").on(table.agentId),
]);

export const insertKnowledgeSchema = createInsertSchema(knowledge).omit({ id: true });
export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;
export type Knowledge = typeof knowledge.$inferSelect;

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  content: text("content").notNull(),
  embedding: text("embedding"),
}, (table) => [
  index("knowledge_chunks_merchant_id_idx").on(table.merchantId),
  index("knowledge_chunks_agent_id_idx").on(table.agentId),
]);

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
  lastSyncedAt: timestamp("last_synced_at"),
  syncInterval: integer("sync_interval").default(60),
  isActive: boolean("is_active").default(true),
  syncStatus: text("sync_status").default("idle"),
  summarizedContent: text("summarized_content"),
});

export const insertCrawledLinkSchema = createInsertSchema(crawledLinks).omit({ id: true, crawledAt: true, lastSyncedAt: true });
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

const safeUrlSchema = z.string().refine((url) => {
  if (!url || url.trim() === "") return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}, { message: "URL must start with http:// or https://" }).optional();

export const merchantConfigSchema = z.object({
  iconUrl: z.string().optional(),
  iconVisible: z.boolean().optional(),
  iconSize: z.number().min(30).max(400).optional(),
  iconWidth: z.number().min(30).max(400).optional(),
  iconHeight: z.number().min(30).max(400).optional(),
  useCustomIconDimensions: z.boolean().optional(),
  mobileIconWidth: z.number().min(30).max(120).optional(),
  mobileIconHeight: z.number().min(30).max(120).optional(),
  widgetOffset: z.number().min(0).max(100).optional(),
  iconAnimationVertical: z.boolean().optional(),
  iconAnimationHorizontal: z.boolean().optional(),
  iconAnimationZoom: z.boolean().optional(),
  iconAnimationRotation: z.boolean().optional(),
  iconAnimationSpeed: z.number().min(1).max(10).optional(),
  online: z.boolean().optional(),
  primaryColor: z.string().optional(),
  welcomeMessage: z.string().optional(),
  agentName: z.string().optional(),
  agentPhotoUrl: z.string().optional(),
  widgetTheme: z.enum(["light", "dark"]).optional(),
  bubblePosition: z.enum(["left", "right"]).optional(),
  allowedDomains: z.string().optional(),
  socialMediaEnabled: z.boolean().optional(),
  socialIconStyle: z.enum(["colored", "silhouette"]).optional(),
  socialInstagram: safeUrlSchema,
  socialFacebook: safeUrlSchema,
  socialTelegram: safeUrlSchema,
  socialWhatsapp: safeUrlSchema,
  socialDiscord: safeUrlSchema,
  welcomeDescription: z.string().optional(),
  quickMessageOptions: z.array(z.string()).optional(),
});
export type MerchantConfig = z.infer<typeof merchantConfigSchema>;

// Simplified registration - only username, email, password
export const registerMerchantSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  businessCategory: z.string().min(1, "Please select a business category"),
  staffCount: z.string().min(1, "Please select staff count"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
export type RegisterMerchantRequest = z.infer<typeof registerMerchantSchema>;

// Profile wizard step schemas
export const profileStep1Schema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters").max(100),
  officialWebsiteName: z.string().min(2, "Website name must be at least 2 characters").max(100),
  websiteUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});
export type ProfileStep1Data = z.infer<typeof profileStep1Schema>;

export const profileStep2Schema = z.object({
  picName: z.string().min(2, "Contact name must be at least 2 characters").max(100),
  phoneCountryCode: z.string().min(1, "Please select a country code"),
  phone: z.string().min(5, "Phone number must be at least 5 digits").max(20),
  country: z.string().min(2, "Please select a country"),
  city: z.string().optional(),
  region: z.string().optional(),
});
export type ProfileStep2Data = z.infer<typeof profileStep2Schema>;

export const profileStep3Schema = z.object({
  officialDomain: z.string().min(3).max(255).transform(val => {
    let normalized = val.toLowerCase().trim();
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/^www\./, '');
    normalized = normalized.split('/')[0];
    normalized = normalized.split(':')[0];
    return normalized;
  }),
});
export type ProfileStep3Data = z.infer<typeof profileStep3Schema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginSchema>;

// Schema for OAuth users to complete their profile
export const completeProfileSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  companyName: z.string().min(2).max(100),
  officialWebsiteName: z.string().min(2).max(100),
  officialDomain: z.string().min(3).max(255).transform(val => {
    // Normalize domain: lowercase, strip protocol/www/port/paths
    let normalized = val.toLowerCase().trim();
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/^www\./, '');
    normalized = normalized.split('/')[0];
    normalized = normalized.split(':')[0];
    return normalized;
  }),
});
export type CompleteProfileRequest = z.infer<typeof completeProfileSchema>;

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
  closingStatementMode: text("closing_statement_mode").default("manual"), // "manual" or "automatic"
  closingStatementAutoIncludeBusinessName: boolean("closing_statement_auto_include_business_name").default(true),
  closingStatementAutoIncludeCustomerName: boolean("closing_statement_auto_include_customer_name").default(true),
  inactivityTimeoutSeconds: integer("inactivity_timeout_seconds").default(120),
  temperature: text("temperature").default("0.7"),
  // Follow up settings
  followUpEnabled: boolean("follow_up_enabled").default(false),
  followUpMessage: text("follow_up_message").default("Apakah ada yang bisa saya bantu lagi?"),
  followUpSuggestions: jsonb("follow_up_suggestions").default([]), // Array of up to 3 suggestion buttons
  followUpIntervalMinutes: integer("follow_up_interval_minutes").default(5), // 5, 15, 30, 60, 120, 360, 720, 1440 minutes
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
  customerPhone: text("customer_phone"),
  deviceFingerprint: text("device_fingerprint"), // For session continuity lookup
  bankRecords: jsonb("bank_records"),
  leadStatus: text("lead_status").default("new"),
  locationData: jsonb("location_data"), // {latitude, longitude, city, country, source}[]
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

// Product Crawl Sources - URLs for automatic product discovery
export const productCrawlSources = pgTable("product_crawl_sources", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  url: text("url").notNull(),
  name: text("name").default(""),
  sourceType: text("source_type").default("product_page"), // product_page, catalog_page, sitemap
  lastCrawledAt: timestamp("last_crawled_at"),
  crawlFrequency: text("crawl_frequency").default("manual"), // manual, daily, weekly
  totalProducts: integer("total_products").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductCrawlSourceSchema = createInsertSchema(productCrawlSources).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductCrawlSource = z.infer<typeof insertProductCrawlSourceSchema>;
export type ProductCrawlSource = typeof productCrawlSources.$inferSelect;

// Crawled Products - products discovered from crawling
export const crawledProducts = pgTable("crawled_products", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  sourceId: varchar("source_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  title: text("title").notNull(),
  description: text("description").default(""),
  price: text("price").default(""),
  currency: text("currency").default("IDR"),
  imageUrl: text("image_url").default(""),
  productUrl: text("product_url").notNull(),
  category: text("category").default(""),
  brand: text("brand").default(""),
  sku: text("sku").default(""),
  availability: text("availability").default("in_stock"), // in_stock, out_of_stock, preorder
  rating: text("rating").default(""),
  reviewCount: integer("review_count").default(0),
  specifications: jsonb("specifications").default({}),
  variants: jsonb("variants").default([]),
  status: text("status").default("pending"), // pending, approved, rejected
  isActive: boolean("is_active").default(true),
  crawledAt: timestamp("crawled_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCrawledProductSchema = createInsertSchema(crawledProducts).omit({ id: true, createdAt: true, updatedAt: true, crawledAt: true });
export type InsertCrawledProduct = z.infer<typeof insertCrawledProductSchema>;
export type CrawledProduct = typeof crawledProducts.$inferSelect;

// Welcome Bubble Settings
export const welcomeBubbles = pgTable("welcome_bubbles", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull().unique(),
  headline: text("headline").default("Need help?"),
  message: text("message").default("I can guide you through our features."),
  buttonLabel: text("button_label").default("Chat with us"),
  buttonColor: text("button_color").default("#7c3aed"),
  promoImageEnabled: boolean("promo_image_enabled").default(false),
  promoImageUrl: text("promo_image_url").default(""),
  reappearInterval: integer("reappear_interval").default(60),
  isEnabled: boolean("is_enabled").default(true),
  actionButtons: jsonb("action_buttons").default([]), // Array of {label: string, url: string}, max 5
  socialIconsEnabled: boolean("social_icons_enabled").default(false), // Show social icons below bubble
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
  ctaButtonEnabled: boolean("cta_button_enabled").default(true),
  ctaButtonText: text("cta_button_text").default("View"),
  ctaButtonColor: text("cta_button_color").default("#6b5dfc"),
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
  // Custom invoice link (for custom plans)
  customInvoiceId: varchar("custom_invoice_id", { length: 32 }),
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

// ============ Bank Transfer Payment Confirmations ============

export const bankTransferConfirmations = pgTable("bank_transfer_confirmations", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  // Order details
  planId: text("plan_id").notNull(),
  planName: text("plan_name").notNull(),
  billingInterval: text("billing_interval").notNull(), // monthly or annual
  isUpgrade: boolean("is_upgrade").default(false),
  isDowngrade: boolean("is_downgrade").default(false),
  // Custom invoice link (for custom plans)
  customInvoiceId: varchar("custom_invoice_id", { length: 32 }),
  // Payment details
  bankName: text("bank_name").notNull(), // BCA, Mandiri, BRI, etc.
  accountNumber: text("account_number").notNull(), // Target bank account
  accountName: text("account_name").notNull(), // Target account holder name
  amountIdr: integer("amount_idr").notNull(), // Amount in IDR (including unique code)
  amountUsd: integer("amount_usd"), // Original USD amount in cents (for reference)
  uniqueCode: text("unique_code"), // Unique code for identification
  senderBankName: text("sender_bank_name"), // Sender's bank name
  senderAccountNumber: text("sender_account_number"), // Sender's account number
  senderAccountName: text("sender_account_name"), // Sender's account name
  transferDate: timestamp("transfer_date"), // When the transfer was made
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

export const insertBankTransferConfirmationSchema = createInsertSchema(bankTransferConfirmations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBankTransferConfirmation = z.infer<typeof insertBankTransferConfirmationSchema>;
export type BankTransferConfirmation = typeof bankTransferConfirmations.$inferSelect;

// ============ KnowledgeBase Articles ============

export const knowledgebaseArticles = pgTable("knowledgebase_articles", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  // Article content
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array(), // Array of tags for categorization
  category: text("category"), // Business type category
  // Status
  status: text("status").default("draft"), // draft, published
  // Metadata
  generatedByAi: boolean("generated_by_ai").default(false),
  businessType: text("business_type"), // retail_physical, retail_digital, company_profile
  businessCategory: text("business_category"), // e.g., fashion, electronics, hotel_resort
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgebaseArticleSchema = createInsertSchema(knowledgebaseArticles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledgebaseArticle = z.infer<typeof insertKnowledgebaseArticleSchema>;
export type KnowledgebaseArticle = typeof knowledgebaseArticles.$inferSelect;

// ============ KnowledgeBase Templates ============

export const knowledgebaseTemplates = pgTable("knowledgebase_templates", {
  id: varchar("id", { length: 32 }).primaryKey(),
  // Template categorization
  businessType: text("business_type").notNull(), // retail_physical, retail_digital, company_profile
  category: text("category").notNull(), // e.g., fashion, electronics, architect, hotel_resort
  templateName: text("template_name").notNull(), // Display name
  // Template content
  description: text("description"), // Brief description of what this template covers
  suggestedTopics: text("suggested_topics").array(), // Array of suggested article topics
  sampleQuestions: text("sample_questions").array(), // Sample FAQ questions
  sampleContent: text("sample_content"), // Sample article content/structure
  // Icon for UI
  icon: text("icon").default("FileText"), // Lucide icon name
  // Sort order
  sortOrder: integer("sort_order").default(0),
  // Active status
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertKnowledgebaseTemplateSchema = createInsertSchema(knowledgebaseTemplates).omit({ id: true, createdAt: true });
export type InsertKnowledgebaseTemplate = z.infer<typeof insertKnowledgebaseTemplateSchema>;
export type KnowledgebaseTemplate = typeof knowledgebaseTemplates.$inferSelect;

// ============ Custom Plan Invoices ============

export const customPlanInvoices = pgTable("custom_plan_invoices", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  // Invoice details
  invoiceNumber: text("invoice_number").notNull().unique(),
  description: text("description"),
  // Custom plan configuration snapshot
  conversationsLimit: integer("conversations_limit").notNull(),
  agentsLimit: integer("agents_limit").notNull(),
  supervisorsLimit: integer("supervisors_limit").notNull(),
  sourcesLimit: integer("sources_limit").notNull(),
  suggestedQuestionsLimit: integer("suggested_questions_limit").notNull(),
  // Pricing
  amount: integer("amount").notNull(), // in smallest currency unit
  currency: text("currency").default("IDR"),
  billingInterval: text("billing_interval").default("monthly"), // monthly or annual
  // Payment info
  paymentMethod: text("payment_method"), // kompaspay, paypal, crypto, bank_transfer
  transactionId: text("transaction_id"),
  proofImageUrl: text("proof_image_url"), // Proof of payment image URL
  proofSubmittedAt: timestamp("proof_submitted_at"), // When proof was submitted
  // Status
  status: text("status").default("pending"), // pending, awaiting_confirmation, paid, cancelled, expired
  // Timestamps
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdBy: varchar("created_by", { length: 32 }), // admin who created it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomPlanInvoiceSchema = createInsertSchema(customPlanInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomPlanInvoice = z.infer<typeof insertCustomPlanInvoiceSchema>;
export type CustomPlanInvoice = typeof customPlanInvoices.$inferSelect;

// ============ Custom Plan Requests ============

export const customPlanRequests = pgTable("custom_plan_requests", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }), // Optional, can be public submission
  // Contact Information
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  // Current Plan Info
  currentPlanId: text("current_plan_id"),
  // Requirements Configuration
  desiredConversations: integer("desired_conversations"), // Monthly conversation volume needed
  desiredAgents: integer("desired_agents"), // Number of AI agents
  desiredSupervisors: integer("desired_supervisors"), // Number of supervisors
  desiredSources: integer("desired_sources"), // Knowledge base sources
  desiredSuggestedQuestions: integer("desired_suggested_questions"),
  // Additional requirements
  integrationNeeds: text("integration_needs"), // CRM, API, webhook requirements
  complianceNeeds: text("compliance_needs"), // GDPR, security requirements
  additionalFeatures: text("additional_features").array(), // Feature checkboxes
  additionalNotes: text("additional_notes"), // Free text
  message: text("message"), // Direct message from merchant (max 500 chars)
  budgetRangeMin: integer("budget_range_min"), // Budget in IDR
  budgetRangeMax: integer("budget_range_max"),
  expectedTimeline: text("expected_timeline"), // When they want to start
  // Admin Review
  status: text("status").default("submitted"), // submitted, under_review, pricing_proposed, invoice_sent, closed, rejected
  adminReviewerId: varchar("admin_reviewer_id", { length: 32 }),
  adminNotes: text("admin_notes"),
  // Pricing (calculated by admin)
  proposedMonthlyPrice: integer("proposed_monthly_price"),
  proposedAnnualPrice: integer("proposed_annual_price"),
  benchmarkMultiplier: text("benchmark_multiplier"), // e.g., "1.5x Enterprise"
  // Linked invoice (after admin sends)
  linkedInvoiceId: varchar("linked_invoice_id", { length: 32 }),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertCustomPlanRequestSchema = createInsertSchema(customPlanRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomPlanRequest = z.infer<typeof insertCustomPlanRequestSchema>;
export type CustomPlanRequest = typeof customPlanRequests.$inferSelect;

// ============ Merchant Notifications ============

export const merchantNotifications = pgTable("merchant_notifications", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  // Notification content
  type: text("type").notNull(), // custom_plan_request, invoice, subscription, system
  title: text("title").notNull(),
  message: text("message").notNull(),
  // Related entity
  relatedEntityType: text("related_entity_type"), // custom_plan_request, invoice, etc.
  relatedEntityId: varchar("related_entity_id", { length: 32 }),
  // Action link
  actionUrl: text("action_url"),
  actionLabel: text("action_label"),
  // Status
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  // Metadata
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMerchantNotificationSchema = createInsertSchema(merchantNotifications).omit({ id: true, createdAt: true });
export type InsertMerchantNotification = z.infer<typeof insertMerchantNotificationSchema>;
export type MerchantNotification = typeof merchantNotifications.$inferSelect;


// ============ Affiliate Program ============

export const affiliates = pgTable("affiliates", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(), // Must have Chatvice account
  // Affiliate details
  affiliateCode: text("affiliate_code").notNull().unique(), // Unique referral code
  displayName: text("display_name"), // Public display name
  payoutEmail: text("payout_email"), // Email for commission payouts
  payoutMethod: text("payout_method").default("paypal"), // paypal, bank_transfer
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountName: text("bank_account_name"),
  // Statistics (cached for performance)
  totalReferrals: integer("total_referrals").default(0),
  successfulReferrals: integer("successful_referrals").default(0),
  totalEarnings: integer("total_earnings").default(0), // in cents
  pendingEarnings: integer("pending_earnings").default(0),
  paidEarnings: integer("paid_earnings").default(0),
  // Settings
  commissionRate: integer("commission_rate").default(20), // Default 20% commission
  minimumPayout: integer("minimum_payout").default(5000), // Minimum payout in cents ($50)
  // Status
  status: text("status").default("pending"), // pending, approved, active, suspended
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by", { length: 32 }),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliates.$inferSelect;

export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: varchar("id", { length: 32 }).primaryKey(),
  affiliateId: varchar("affiliate_id", { length: 32 }).notNull(),
  // Referred merchant
  referredMerchantId: varchar("referred_merchant_id", { length: 32 }),
  referredEmail: text("referred_email"),
  // Tracking
  referralCode: text("referral_code").notNull(), // The code used
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  landingPage: text("landing_page"),
  // Status
  status: text("status").default("clicked"), // clicked, registered, subscribed, expired
  // Attribution
  clickedAt: timestamp("clicked_at").defaultNow(),
  registeredAt: timestamp("registered_at"),
  convertedAt: timestamp("converted_at"), // When they subscribed to a paid plan
  // Cookie expiry for tracking
  expiresAt: timestamp("expires_at"), // 30 days from click
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAffiliateReferralSchema = createInsertSchema(affiliateReferrals).omit({ id: true, createdAt: true });
export type InsertAffiliateReferral = z.infer<typeof insertAffiliateReferralSchema>;
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;

export const affiliateCommissions = pgTable("affiliate_commissions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  affiliateId: varchar("affiliate_id", { length: 32 }).notNull(),
  referralId: varchar("referral_id", { length: 32 }).notNull(),
  // Transaction details
  orderId: varchar("order_id", { length: 32 }), // Linked subscription order
  orderAmount: integer("order_amount").notNull(), // Original order amount in cents
  commissionRate: integer("commission_rate").notNull(), // Rate at time of conversion (%)
  commissionAmount: integer("commission_amount").notNull(), // Calculated commission in cents
  currency: text("currency").default("USD"),
  // Status
  status: text("status").default("pending"), // pending, approved, paid, cancelled
  // Payout info
  payoutId: varchar("payout_id", { length: 32 }),
  paidAt: timestamp("paid_at"),
  payoutMethod: text("payout_method"),
  payoutReference: text("payout_reference"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const insertAffiliateCommissionSchema = createInsertSchema(affiliateCommissions).omit({ id: true, createdAt: true });
export type InsertAffiliateCommission = z.infer<typeof insertAffiliateCommissionSchema>;
export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;

export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: varchar("id", { length: 32 }).primaryKey(),
  affiliateId: varchar("affiliate_id", { length: 32 }).notNull(),
  // Payout details
  amount: integer("amount").notNull(), // Total payout amount in cents
  currency: text("currency").default("USD"),
  payoutMethod: text("payout_method").notNull(), // paypal, bank_transfer
  payoutDetails: jsonb("payout_details"), // Email/bank details at time of payout
  // Status
  status: text("status").default("pending"), // pending, processing, completed, failed
  // Reference
  transactionReference: text("transaction_reference"),
  notes: text("notes"),
  // Processed by
  processedBy: varchar("processed_by", { length: 32 }),
  processedAt: timestamp("processed_at"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAffiliatePayoutSchema = createInsertSchema(affiliatePayouts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliatePayout = z.infer<typeof insertAffiliatePayoutSchema>;
export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;

// Knowledge Base Templates (Admin-managed templates for merchants to use)
export const knowledgeTemplates = pgTable("knowledge_templates", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: text("name").notNull(), // Template name (e.g., "E-commerce FAQ", "Customer Service")
  description: text("description"), // Brief description of template purpose
  category: text("category").notNull(), // casual, formal, corporate
  content: text("content").notNull(), // The template knowledge base content
  businessType: text("business_type"), // Optional: specific business type (e.g., "retail", "saas", "restaurant")
  language: text("language").default("id"), // Language code (id = Indonesian, en = English)
  isActive: boolean("is_active").default(true), // Whether template is available for merchants
  usageCount: integer("usage_count").default(0), // Track how many merchants use this template
  createdBy: varchar("created_by", { length: 32 }), // Admin who created
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeTemplateSchema = createInsertSchema(knowledgeTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledgeTemplate = z.infer<typeof insertKnowledgeTemplateSchema>;
export type KnowledgeTemplate = typeof knowledgeTemplates.$inferSelect;

