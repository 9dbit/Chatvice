import { pgTable, text, varchar, boolean, integer, timestamp, jsonb, index, uniqueIndex, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  paymentProvider: text("payment_provider").default("12pay"),
  lastInvoiceId: text("last_invoice_id"),
  pendingTransactionId: text("pending_transaction_id"),
  subscriptionStatus: text("subscription_status").default("trial"),
  subscriptionPlanId: text("subscription_plan_id").default("free"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodEnd: timestamp("current_period_end"),
  billingInterval: text("billing_interval").default("monthly"),
  conversationsUsed: integer("conversations_used").default(0),
  conversationsResetAt: timestamp("conversations_reset_at"),
  extraConversationsBalance: integer("extra_conversations_balance").default(0),
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
  socialIconStyle: text("social_icon_style").default("colored"), // "colored" | "3d-metal" | "3d-golden" | "flat-white" | "flat-black" | "custom"
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
  prechatBannerUrl: text("prechat_banner_url").default(""),
  quickMessageOptions: text("quick_message_options").array().default([]),
  chatWorkflow: text("chat_workflow").default("click_to_open"), // "click_to_open" | "auto_open"
  // Email change verification
  pendingEmail: text("pending_email"),
  emailChangeOtp: text("email_change_otp"),
  emailChangeOtpExpiresAt: timestamp("email_change_otp_expires_at"),
  // Widget slug (unique URL-friendly name for widget link)
  widgetSlug: text("widget_slug").unique(),
  // Work scheduler timezone
  workTimezone: text("work_timezone").default("Asia/Jakarta"),
  // Live visitor tracking / proactive chat
  proactiveChatEnabled: boolean("proactive_chat_enabled").default(false),
  proactiveChatGreetingDelay: integer("proactive_chat_greeting_delay").default(8),
  proactiveChatDingEnabled: boolean("proactive_chat_ding_enabled").default(false),
  proactiveChatTemplates: text("proactive_chat_templates").array().default([]),
  // Storage usage tracking (in bytes)
  storageUsed: integer("storage_used").default(0),
  storageLimit: integer("storage_limit").default(104857600), // 100MB default
  // Quota email notification flags (reset each billing cycle with conversationsUsed)
  quota80EmailSent: boolean("quota80_email_sent").default(false),
  quota100EmailSent: boolean("quota100_email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  firstSubscribedAt: timestamp("first_subscribed_at"), // First time merchant paid for any subscription
  // IP & country tracking
  registrationIp: text("registration_ip"),
  registrationCountry: text("registration_country"),
  lastLoginIp: text("last_login_ip"),
  lastLoginCountry: text("last_login_country"),
  // Subscription expiry reminder tracking (prevents duplicate emails per billing period)
  expiryReminder7dSentAt: timestamp("expiry_reminder_7d_sent_at"),
  expiryReminder3dSentAt: timestamp("expiry_reminder_3d_sent_at"),
  // PayPal recurring subscription ID (for auto-debit / auto-renewal)
  paypalSubscriptionId: text("paypal_subscription_id"),
  // Onboarding checklist
  onboardingDismissed: boolean("onboarding_dismissed").default(false),
  onboardingWidgetInstalled: boolean("onboarding_widget_installed").default(false),
  onboardingPrechatConfigured: boolean("onboarding_prechat_configured").default(false),
  onboardingDomainRegistered: boolean("onboarding_domain_registered").default(false),
  onboardingKnowledgeConfigured: boolean("onboarding_knowledge_configured").default(false),
  onboardingDeployed: boolean("onboarding_deployed").default(false),
  onboardingTutorialsViewed: text("onboarding_tutorials_viewed").array().default([]),
  // ── Marketplace booster slots (Task #328) ──────────────────────────────
  // Incremented when merchant purchases a booster pack. Effective limit is
  // `plan.<x>Limit + extra<X>Slots` (or unlimited if plan is -1).
  extraSupervisorSlots: integer("extra_supervisor_slots").default(0),
  extraAgentSlots: integer("extra_agent_slots").default(0),
  extraDomainSlots: integer("extra_domain_slots").default(0),
  extraSourceSlots: integer("extra_source_slots").default(0),
  extraVisionQuota: integer("extra_vision_quota").default(0),
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
  telegramChatId: text("telegram_chat_id"),
});

export const insertSupervisorSchema = createInsertSchema(supervisors).omit({ id: true });
export type InsertSupervisor = z.infer<typeof insertSupervisorSchema>;
export type Supervisor = typeof supervisors.$inferSelect;
export type SupervisorWithStats = Omit<Supervisor, "password"> & { avgResponseTime: number | null };

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
  customerAvatarUrl: text("customer_avatar_url"),
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
  // Live visitor tracking
  visitorSession: boolean("visitor_session").default(false),
  proactiveGreetingSent: boolean("proactive_greeting_sent").default(false),
  countryCode: text("country_code"),
  countryName: text("country_name"),
  cityName: text("city_name"),
  pageUrl: text("page_url"),
  referrerUrl: text("referrer_url"),
  userAgent: text("user_agent"),
  // Customer rating for session (1-5 stars)
  customerRating: integer("customer_rating"),
  ratingComment: text("rating_comment"),
  ratedAt: timestamp("rated_at"),
  // Limit fallback: session created in HUMAN mode because conversation quota was exhausted
  limitFallback: boolean("limit_fallback").default(false),
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

export const knowledgeEntries = pgTable("knowledge_entries", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  name: text("name").notNull(),
  content: text("content").notNull().default(""),
  isActive: boolean("is_active").default(true),
  isLinked: boolean("is_linked").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("knowledge_entries_merchant_id_idx").on(table.merchantId),
  index("knowledge_entries_agent_id_idx").on(table.agentId),
]);

export const insertKnowledgeEntrySchema = createInsertSchema(knowledgeEntries).omit({ id: true, createdAt: true });
export type InsertKnowledgeEntry = z.infer<typeof insertKnowledgeEntrySchema>;
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;

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
  knowledgeEntryId: varchar("knowledge_entry_id", { length: 32 }),
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
  socialIconStyle: z.enum(["colored", "3d-metal", "3d-golden", "flat-white", "flat-black", "custom"]).optional(),
  socialInstagram: safeUrlSchema,
  socialFacebook: safeUrlSchema,
  socialTelegram: safeUrlSchema,
  socialWhatsapp: safeUrlSchema,
  socialDiscord: safeUrlSchema,
  welcomeDescription: z.string().optional(),
  prechatBannerUrl: z.string().optional(),
  quickMessageOptions: z.array(z.string()).optional(),
  chatWorkflow: z.enum(["click_to_open", "auto_open"]).optional(),
  proactiveChatEnabled: z.boolean().optional(),
  proactiveChatGreetingDelay: z.number().int().min(5).max(120).optional(),
  proactiveChatDingEnabled: z.boolean().optional(),
  proactiveChatTemplates: z.array(z.string()).optional(),
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
  phone: z.string().optional().default(""),
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
  agentType: text("agent_type").default("support"), // "support" or "sales"
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

// Sales Agent - Leads table for lead scoring
export const leads = pgTable("leads", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }),
  agentId: varchar("agent_id", { length: 32 }),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  score: integer("score").default(0), // 0-100 lead score
  stage: text("stage").default("cold"), // cold, warm, hot, qualified, converted, lost
  source: text("source").default("widget"), // widget, campaign, referral, direct
  interestedProducts: jsonb("interested_products").default([]), // Array of product IDs
  notes: text("notes").default(""),
  lastContactAt: timestamp("last_contact_at"),
  convertedAt: timestamp("converted_at"),
  convertedValue: integer("converted_value"), // Value in cents if converted
  assignedSupervisorId: varchar("assigned_supervisor_id", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("leads_merchant_id_idx").on(table.merchantId),
  index("leads_stage_idx").on(table.stage),
  index("leads_score_idx").on(table.score),
]);

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

const widgetDeviceSettingsSchema = z.object({
  panel: z.object({
    widthPx: z.number().min(280).max(800).default(380),
    heightPx: z.number().min(300).max(1200).default(660),
    maxHeightAuto: z.boolean().default(false),
    cornerRadiusPx: z.number().min(0).max(50).default(28),
    backgroundColor: z.string().default("#ffffff"),
    backgroundColorLight: z.string().default("#ffffff"),
    backgroundColorDark: z.string().default("#18181b"),
    backgroundOpacityPct: z.number().min(0).max(100).default(88),
    blurPx: z.number().min(0).max(50).default(24),
    borderEnabled: z.boolean().default(true),
    borderThicknessPx: z.number().min(0).max(10).default(1),
  }).default({}),
  header: z.object({
    heightPx: z.number().min(30).max(120).default(56),
    widthMode: z.enum(["auto", "custom"]).default("auto"),
    widthPx: z.number().min(100).max(800).optional(),
    backgroundOpacityPct: z.number().min(0).max(100).default(100),
    fontSizePx: z.number().min(10).max(32).default(14),
  }).default({}),
  footer: z.object({
    heightPx: z.number().min(30).max(120).default(56),
    widthMode: z.enum(["auto", "custom"]).default("auto"),
    widthPx: z.number().min(100).max(800).optional(),
    backgroundOpacityPct: z.number().min(0).max(100).default(80),
    fontSizePx: z.number().min(10).max(32).default(14),
  }).default({}),
});

export const widgetStyleSettingsSchema = z.object({
  desktop: widgetDeviceSettingsSchema.default({}),
  mobile: widgetDeviceSettingsSchema.default({}),
});

export type WidgetStyleSettings = z.infer<typeof widgetStyleSettingsSchema>;
export type WidgetDeviceSettings = z.infer<typeof widgetDeviceSettingsSchema>;

export const WIDGET_STYLE_DEFAULTS: WidgetStyleSettings = {
  desktop: {
    panel: {
      widthPx: 380,
      heightPx: 660,
      maxHeightAuto: false,
      cornerRadiusPx: 28,
      backgroundColor: "#ffffff",
      backgroundColorLight: "#ffffff",
      backgroundColorDark: "#18181b",
      backgroundOpacityPct: 88,
      blurPx: 24,
      borderEnabled: true,
      borderThicknessPx: 1,
    },
    header: {
      heightPx: 56,
      widthMode: "auto",
      backgroundOpacityPct: 100,
      fontSizePx: 14,
    },
    footer: {
      heightPx: 56,
      widthMode: "auto",
      backgroundOpacityPct: 80,
      fontSizePx: 14,
    },
  },
  mobile: {
    panel: {
      widthPx: 360,
      heightPx: 600,
      maxHeightAuto: true,
      cornerRadiusPx: 16,
      backgroundColor: "#ffffff",
      backgroundColorLight: "#ffffff",
      backgroundColorDark: "#18181b",
      backgroundOpacityPct: 88,
      blurPx: 24,
      borderEnabled: true,
      borderThicknessPx: 1,
    },
    header: {
      heightPx: 52,
      widthMode: "auto",
      backgroundOpacityPct: 100,
      fontSizePx: 13,
    },
    footer: {
      heightPx: 52,
      widthMode: "auto",
      backgroundOpacityPct: 80,
      fontSizePx: 13,
    },
  },
};

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
  agentId: varchar("agent_id", { length: 32 }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  content: text("content").default(""),
  url: text("url").default(""),
  isActive: boolean("is_active").default(true),
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  syncStatus: text("sync_status").default("idle"),
  sourceSubtype: text("source_subtype"),
  syncInterval: integer("sync_interval").default(60),
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

// IDR-first pricing structure (kurs USD = Rp 17.500). USD values are reference only.
// Plan IDs preserved for backward compatibility; display names and limits updated per
// 2026 pricing strategy. Existing merchants on `pro` get renamed to "Growth" with new
// Growth-tier limits; admins can override per-plan via subscription_plans_custom for grandfathering.
export const subscriptionPlans = {
  free: {
    id: "free" as const,
    name: "Free",
    description: "Trial gratis untuk mencoba AI customer service Chatvice",
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyPriceIdr: 0,
    annualPriceIdr: 0,
    overageRateIdr: 0, // No overage on Free; quota hard-blocks
    conversationsLimit: 50,
    supervisorsLimit: 1,
    agentsLimit: 1,
    sourcesLimit: 3,
    suggestedQuestionsLimit: 0,
    supervisorsPerAgentLimit: 1,
    domainsLimit: 1,
    chatRetentionHours: 168, // 7 hari
    bgRemovalLimit: 0,
    features: [
      "50 AI conversations/bulan",
      "1 AI Agent",
      "1 Supervisor",
      "Chat history 7 hari",
      "3 sumber knowledge base",
      "1 domain",
      "Widget dasar",
      "Community support",
    ] as const,
    restrictions: ["Tidak bisa hapus branding Chatvice", "Tidak ada custom domain", "Tidak ada API access"] as const,
  },
  starter: {
    id: "starter" as const,
    name: "Starter",
    description: "Untuk UMKM & toko online yang baru memulai",
    monthlyPrice: 19,
    annualPrice: 14,
    monthlyPriceIdr: 299_000,
    annualPriceIdr: 224_250, // 25% off bulanan
    overageRateIdr: 250, // Per conversation di atas kuota
    conversationsLimit: 2_000,
    supervisorsLimit: 2,
    agentsLimit: 1,
    sourcesLimit: 10,
    suggestedQuestionsLimit: 5,
    supervisorsPerAgentLimit: 2,
    domainsLimit: 1,
    chatRetentionHours: 720, // 30 hari
    bgRemovalLimit: 5,
    features: [
      "2.000 AI conversations/bulan",
      "1 AI Agent",
      "2 Supervisor",
      "Chat history 30 hari",
      "10 sumber knowledge base",
      "AI Vision 50/bulan",
      "Telegram bridge",
      "Email support",
      "Hapus branding Chatvice",
      "Overage Rp 250/conversation tambahan",
    ] as const,
    restrictions: ["Tidak ada Custom Data Source", "Tidak ada API access"] as const,
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    description: "Sweet spot untuk bisnis menengah — paling laris",
    monthlyPrice: 57,
    annualPrice: 43,
    monthlyPriceIdr: 899_000,
    annualPriceIdr: 674_250,
    overageRateIdr: 200,
    conversationsLimit: 8_000,
    supervisorsLimit: 5,
    agentsLimit: 5,
    sourcesLimit: 50,
    suggestedQuestionsLimit: 10,
    supervisorsPerAgentLimit: 5,
    domainsLimit: 3,
    chatRetentionHours: 2160, // 90 hari
    bgRemovalLimit: 20,
    features: [
      "8.000 AI conversations/bulan",
      "5 AI Agents",
      "5 Supervisors",
      "Chat history 90 hari",
      "50 sumber knowledge base",
      "AI Vision 500/bulan",
      "Telegram bridge",
      "Custom Data Source (add-on)",
      "Hospitality (add-on)",
      "API access",
      "Advanced analytics",
      "SLA 99% uptime",
      "Priority email support",
      "Overage Rp 200/conversation tambahan",
    ] as const,
    restrictions: [] as const,
  },
  enterprise: {
    id: "enterprise" as const,
    name: "Business",
    description: "Untuk e-commerce besar & perusahaan dengan volume tinggi",
    monthlyPrice: 145,
    annualPrice: 109,
    monthlyPriceIdr: 2_299_000,
    annualPriceIdr: 1_724_250,
    overageRateIdr: 150,
    conversationsLimit: 25_000,
    supervisorsLimit: 15,
    agentsLimit: 20,
    sourcesLimit: -1, // Unlimited
    suggestedQuestionsLimit: -1,
    supervisorsPerAgentLimit: 15,
    domainsLimit: 10,
    chatRetentionHours: 8760, // 1 tahun
    bgRemovalLimit: 100,
    features: [
      "25.000 AI conversations/bulan",
      "20 AI Agents",
      "15 Supervisors",
      "Chat history 1 tahun",
      "Unlimited knowledge base",
      "AI Vision unlimited",
      "Telegram bridge",
      "Custom Data Source (included)",
      "Hospitality (included)",
      "Custom domain widget",
      "White-label widget",
      "API access",
      "Advanced analytics & insights",
      "SLA 99.5% uptime",
      "Priority queue",
      "Overage Rp 150/conversation tambahan",
    ] as const,
    restrictions: [] as const,
  },
  custom: {
    id: "custom" as const,
    name: "Enterprise",
    description: "Korporat, marketplace, banking — solusi custom volume besar",
    monthlyPrice: 475,
    annualPrice: 356,
    monthlyPriceIdr: 7_499_000,
    annualPriceIdr: 5_624_250,
    overageRateIdr: 100,
    conversationsLimit: 100_000,
    supervisorsLimit: -1,
    agentsLimit: -1,
    sourcesLimit: -1,
    suggestedQuestionsLimit: -1,
    supervisorsPerAgentLimit: -1,
    domainsLimit: -1,
    chatRetentionHours: -1,
    bgRemovalLimit: -1,
    features: [
      "100.000+ AI conversations/bulan",
      "Unlimited AI Agents",
      "Unlimited Supervisors",
      "Chat history custom (tanpa batas)",
      "Unlimited knowledge base",
      "AI Vision unlimited",
      "White-label penuh",
      "Custom domain & DNS",
      "Dedicated account manager",
      "SLA 99.9% uptime + custom",
      "On-premise deployment option",
      "Custom integrations & fine-tuning",
      "Personalized onboarding",
      "24/7 premium support",
      "Overage Rp 100/conversation tambahan",
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
  buttonTextColor: text("button_text_color").default("#ffffff"),
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
  browserPushEnabled: boolean("browser_push_enabled").default(false),
  telegramEnabled: boolean("telegram_enabled").default(false),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
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
    appointments: true,
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
    appointments: false,
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

// Tracks widget embed attempts from domains not registered by the merchant
export const unknownDomainAttempts = pgTable("unknown_domain_attempts", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  domain: text("domain").notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  attemptCount: integer("attempt_count").default(1),
  isIgnored: boolean("is_ignored").default(false), // merchant dismissed this domain
}, (table) => ({
  merchantDomainUnique: uniqueIndex("unknown_domain_attempts_merchant_domain_unique").on(table.merchantId, table.domain),
}));

export const insertUnknownDomainAttemptSchema = createInsertSchema(unknownDomainAttempts).omit({ id: true, firstSeenAt: true, lastSeenAt: true });
export type InsertUnknownDomainAttempt = z.infer<typeof insertUnknownDomainAttemptSchema>;
export type UnknownDomainAttempt = typeof unknownDomainAttempts.$inferSelect;

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

// ============ Merchant Saved Payment Methods ============
// Stores payment methods for future/recurring subscriptions
export const merchantPaymentMethods = pgTable("merchant_payment_methods", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  // Payment method type
  type: text("type").notNull(), // credit_card, bank_transfer, ewallet, qris, paypal, crypto, virtual_account
  isDefault: boolean("is_default").default(false),
  nickname: text("nickname"), // User-friendly name like "My Visa Card"
  // Credit Card fields (encrypted/masked)
  cardNumber: text("card_number"), // Last 4 digits only for display, full number encrypted
  cardNumberEncrypted: text("card_number_encrypted"), // Full encrypted card number for auto-billing
  cardHolderName: text("card_holder_name"),
  cardExpiryMonth: text("card_expiry_month"), // MM
  cardExpiryYear: text("card_expiry_year"), // YYYY
  cardCvvEncrypted: text("card_cvv_encrypted"), // Encrypted CVV for auto-billing
  cardBrand: text("card_brand"), // visa, mastercard, amex, jcb
  // Bank Transfer fields
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountName: text("bank_account_name"),
  bankSwiftCode: text("bank_swift_code"), // For international transfers
  bankCountry: text("bank_country"),
  // E-Wallet fields
  ewalletProvider: text("ewallet_provider"), // gopay, ovo, dana, shopeepay, linkaja
  ewalletPhoneNumber: text("ewallet_phone_number"),
  // Crypto fields
  cryptoNetwork: text("crypto_network"), // btc, eth, sol, bnb, usdt, xrp
  cryptoWalletAddress: text("crypto_wallet_address"),
  // PayPal fields
  paypalEmail: text("paypal_email"),
  // Virtual Account fields
  vaProvider: text("va_provider"), // bca, bni, bri, mandiri, permata
  vaNumber: text("va_number"),
  // Metadata
  lastUsedAt: timestamp("last_used_at"),
  timesUsed: integer("times_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMerchantPaymentMethodSchema = createInsertSchema(merchantPaymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMerchantPaymentMethod = z.infer<typeof insertMerchantPaymentMethodSchema>;
export type MerchantPaymentMethod = typeof merchantPaymentMethods.$inferSelect;

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
  paymentMethod: text("payment_method"), // 12pay, paypal, crypto, bank_transfer
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

// Affiliate Payment Methods - Saved payout methods for affiliates
export const affiliatePaymentMethods = pgTable("affiliate_payment_methods", {
  id: varchar("id", { length: 32 }).primaryKey(),
  affiliateId: varchar("affiliate_id", { length: 32 }).notNull(),
  // Method type
  methodType: text("method_type").notNull(), // bank_transfer, cryptocurrency, paypal
  methodName: text("method_name"), // Display name for this payment method
  isDefault: boolean("is_default").default(false),
  // Bank Transfer fields
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountName: text("bank_account_name"),
  bankCountry: text("bank_country"), // ISO country code
  swiftCode: text("swift_code"), // Required for non-Indonesian banks
  // Cryptocurrency fields
  cryptoWalletAddress: text("crypto_wallet_address"),
  cryptoNetwork: text("crypto_network"), // BTC, ETH, USDT-TRC20, etc.
  // PayPal fields
  paypalEmail: text("paypal_email"),
  paypalAccountName: text("paypal_account_name"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAffiliatePaymentMethodSchema = createInsertSchema(affiliatePaymentMethods).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliatePaymentMethod = z.infer<typeof insertAffiliatePaymentMethodSchema>;
export type AffiliatePaymentMethod = typeof affiliatePaymentMethods.$inferSelect;

// Affiliate Withdrawal Requests - Withdrawal requests with approval workflow
export const affiliateWithdrawalRequests = pgTable("affiliate_withdrawal_requests", {
  id: varchar("id", { length: 32 }).primaryKey(),
  affiliateId: varchar("affiliate_id", { length: 32 }).notNull(),
  paymentMethodId: varchar("payment_method_id", { length: 32 }), // Reference to saved payment method
  // Request details
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").default("USD"),
  // Payment method snapshot (in case payment method is edited/deleted later)
  methodType: text("method_type").notNull(), // bank_transfer, cryptocurrency, paypal
  paymentDetails: jsonb("payment_details").notNull(), // Full payment method details at time of request
  // Status
  status: text("status").default("pending"), // pending, approved, rejected, processing, completed, failed
  // Rejection/approval notes
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  // Processing
  processedBy: varchar("processed_by", { length: 32 }),
  processedAt: timestamp("processed_at"),
  transactionReference: text("transaction_reference"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAffiliateWithdrawalRequestSchema = createInsertSchema(affiliateWithdrawalRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliateWithdrawalRequest = z.infer<typeof insertAffiliateWithdrawalRequestSchema>;
export type AffiliateWithdrawalRequest = typeof affiliateWithdrawalRequests.$inferSelect;

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

// Merchant Activity Logs - tracks all merchant actions for admin monitoring
export const merchantActivityLogs = pgTable("merchant_activity_logs", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  // Activity details
  activityType: text("activity_type").notNull(), // sign_up, sign_in, page_view, button_click, form_submit, workflow_action
  activityCategory: text("activity_category"), // auth, dashboard, widget, knowledge, agents, etc.
  description: text("description").notNull(), // Human-readable description
  // Additional metadata
  pageUrl: text("page_url"), // URL/path where action occurred
  elementId: text("element_id"), // Button/form ID clicked
  elementLabel: text("element_label"), // Button/form label clicked
  formData: jsonb("form_data"), // Form fields filled (excluding sensitive data)
  // Auth method for sign_up/sign_in
  authMethod: text("auth_method"), // email, google, github
  // Device/browser info
  ipAddress: text("ip_address"),
  country: text("country"), // Full country name, e.g. "United States"
  countryCode: text("country_code"), // ISO 2-letter code, e.g. "US"
  city: text("city"), // City from geo lookup
  userAgent: text("user_agent"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  merchantIdIdx: index("activity_merchant_id_idx").on(table.merchantId),
  activityTypeIdx: index("activity_type_idx").on(table.activityType),
  createdAtIdx: index("activity_created_at_idx").on(table.createdAt),
}));

export const insertMerchantActivityLogSchema = createInsertSchema(merchantActivityLogs).omit({ id: true, createdAt: true });
export type InsertMerchantActivityLog = z.infer<typeof insertMerchantActivityLogSchema>;
export type MerchantActivityLog = typeof merchantActivityLogs.$inferSelect;

// ============================================================================
// CUSTOMER APP TABLES (chat.chatvice.app)
// ============================================================================

// Customers - registered users on customer chat platform
export const customers = pgTable("customers", {
  id: varchar("id", { length: 32 }).primaryKey(),
  personalId: text("personal_id").unique(), // Format: P-A01-00001 (P = Personal, auto-generated)
  phoneNumber: text("phone_number").notNull().unique(), // E.164 format
  phoneCountryCode: text("phone_country_code"), // Country code (e.g., +1, +62)
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  pinCode: text("pin_code"), // 6-digit PIN for login (hashed)
  isPhoneVerified: boolean("is_phone_verified").default(false),
  isProfileCompleted: boolean("is_profile_completed").default(false), // True when name, email, PIN are set
  lastActiveAt: timestamp("last_active_at"),
  pushSubscription: jsonb("push_subscription"), // Web push subscription object
  notificationsEnabled: boolean("notifications_enabled").default(true),
  // Storage usage tracking (in bytes)
  storageUsed: integer("storage_used").default(0),
  storageLimit: integer("storage_limit").default(52428800), // 50MB default for personal chats
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  phoneNumberIdx: index("customer_phone_idx").on(table.phoneNumber),
  personalIdIdx: index("customer_personal_id_idx").on(table.personalId),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// OTP Codes for phone verification
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id", { length: 32 }).primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  phoneNumberIdx: index("otp_phone_idx").on(table.phoneNumber),
  expiresAtIdx: index("otp_expires_idx").on(table.expiresAt),
}));

export const insertOTPCodeSchema = createInsertSchema(otpCodes).omit({ id: true, createdAt: true });
export type InsertOTPCode = z.infer<typeof insertOTPCodeSchema>;
export type OTPCode = typeof otpCodes.$inferSelect;

// Customer Contacts - contacts saved by customers
export const customerContacts = pgTable("customer_contacts", {
  id: varchar("id", { length: 32 }).primaryKey(),
  customerId: varchar("customer_id", { length: 32 }).notNull(),
  contactCustomerId: varchar("contact_customer_id", { length: 32 }), // If contact is also a Chatvice user
  displayName: text("display_name").notNull(),
  phoneNumber: text("phone_number"),
  avatarUrl: text("avatar_url"),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  customerIdIdx: index("contact_customer_idx").on(table.customerId),
}));

export const insertCustomerContactSchema = createInsertSchema(customerContacts).omit({ id: true, createdAt: true });
export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type CustomerContact = typeof customerContacts.$inferSelect;

// Customer Store Chats - tracks which official stores customer has chatted with
export const customerStoreChats = pgTable("customer_store_chats", {
  id: varchar("id", { length: 32 }).primaryKey(),
  customerId: varchar("customer_id", { length: 32 }).notNull(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }), // Which agent the customer chatted with
  sessionId: varchar("session_id", { length: 32 }), // Link to chat session
  lastMessageAt: timestamp("last_message_at"),
  unreadCount: integer("unread_count").default(0),
  isPinned: boolean("is_pinned").default(false),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  customerIdIdx: index("store_chat_customer_idx").on(table.customerId),
  merchantIdIdx: index("store_chat_merchant_idx").on(table.merchantId),
}));

export const insertCustomerStoreChatSchema = createInsertSchema(customerStoreChats).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerStoreChat = z.infer<typeof insertCustomerStoreChatSchema>;
export type CustomerStoreChat = typeof customerStoreChats.$inferSelect;

// Personal Chats - direct messaging between customers
export const personalChats = pgTable("personal_chats", {
  id: varchar("id", { length: 32 }).primaryKey(),
  participant1Id: varchar("participant1_id", { length: 32 }).notNull(),
  participant2Id: varchar("participant2_id", { length: 32 }).notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  participant1Idx: index("personal_chat_p1_idx").on(table.participant1Id),
  participant2Idx: index("personal_chat_p2_idx").on(table.participant2Id),
}));

export const insertPersonalChatSchema = createInsertSchema(personalChats).omit({ id: true, createdAt: true });
export type InsertPersonalChat = z.infer<typeof insertPersonalChatSchema>;
export type PersonalChat = typeof personalChats.$inferSelect;

// Personal Chat Messages
export const personalMessages = pgTable("personal_messages", {
  id: varchar("id", { length: 32 }).primaryKey(),
  chatId: varchar("chat_id", { length: 32 }).notNull(),
  senderId: varchar("sender_id", { length: 32 }).notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // text, image, file, audio
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  chatIdIdx: index("personal_msg_chat_idx").on(table.chatId),
  senderIdIdx: index("personal_msg_sender_idx").on(table.senderId),
}));

export const insertPersonalMessageSchema = createInsertSchema(personalMessages).omit({ id: true, createdAt: true });
export type InsertPersonalMessage = z.infer<typeof insertPersonalMessageSchema>;
export type PersonalMessage = typeof personalMessages.$inferSelect;

// Chat Media - stores uploaded media files for chat messages
export const chatMedia = pgTable("chat_media", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }), // For tracking merchant storage usage
  customerId: varchar("customer_id", { length: 32 }), // For tracking customer storage usage (personal chats)
  uploaderId: varchar("uploader_id", { length: 32 }).notNull(), // customer or session id
  uploaderType: text("uploader_type").notNull().default("customer"), // "customer" or "supervisor"
  sessionId: varchar("session_id", { length: 64 }), // Optional link to chat session
  personalChatId: varchar("personal_chat_id", { length: 32 }), // Optional link to personal chat
  messageId: varchar("message_id", { length: 32 }), // Optional link to message
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // Size in bytes
  fileData: text("file_data").notNull(), // Base64 encoded file data
  thumbnailData: text("thumbnail_data"), // Optional thumbnail for images/videos
  storageUrl: text("storage_url"), // URL if stored in object storage
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uploaderIdx: index("chat_media_uploader_idx").on(table.uploaderId),
  sessionIdx: index("chat_media_session_idx").on(table.sessionId),
  personalChatIdx: index("chat_media_personal_chat_idx").on(table.personalChatId),
  merchantIdx: index("chat_media_merchant_idx").on(table.merchantId),
  customerIdx: index("chat_media_customer_idx").on(table.customerId),
}));

export const insertChatMediaSchema = createInsertSchema(chatMedia).omit({ id: true, createdAt: true });
export type InsertChatMedia = z.infer<typeof insertChatMediaSchema>;
export type ChatMedia = typeof chatMedia.$inferSelect;

// Message Reactions - emoji reactions on chat messages
export const messageReactions = pgTable("message_reactions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  messageId: varchar("message_id", { length: 64 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  reactionType: text("reaction_type").notNull(),
  reactedBy: text("reacted_by").notNull(),
  reactedByRole: text("reacted_by_role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("reactions_message_id_idx").on(table.messageId),
  index("reactions_session_id_idx").on(table.sessionId),
]);

export const insertMessageReactionSchema = createInsertSchema(messageReactions).omit({ id: true, createdAt: true });
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type MessageReaction = typeof messageReactions.$inferSelect;

// Customer Stories - for profile updates and advertisements shown as circular thumbnails
export const customerStories = pgTable("customer_stories", {
  id: varchar("id", { length: 32 }).primaryKey(),
  customerId: varchar("customer_id", { length: 32 }), // Optional - null for merchant/ad stories
  merchantId: varchar("merchant_id", { length: 32 }), // Optional - for store advertisements
  type: text("type").notNull().default("profile_update"), // "profile_update", "story", "advertisement"
  mediaUrl: text("media_url"),
  thumbnailUrl: text("thumbnail_url"),
  content: text("content"), // Text content or caption
  expiresAt: timestamp("expires_at"), // When the story expires (24 hours typically)
  isActive: boolean("is_active").default(true),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  customerIdx: index("story_customer_idx").on(table.customerId),
  merchantIdx: index("story_merchant_idx").on(table.merchantId),
  expiresIdx: index("story_expires_idx").on(table.expiresAt),
}));

export const insertCustomerStorySchema = createInsertSchema(customerStories).omit({ id: true, createdAt: true });
export type InsertCustomerStory = z.infer<typeof insertCustomerStorySchema>;
export type CustomerStory = typeof customerStories.$inferSelect;

export const messagingBridgeSessions = pgTable("messaging_bridge_sessions", {
  id: serial("id").primaryKey(),
  supervisorId: varchar("supervisor_id", { length: 32 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  channel: text("channel").notNull(),
  anchorMessageId: text("anchor_message_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sessionIdx: index("mbs_session_idx").on(table.sessionId),
  anchorIdx: index("mbs_anchor_idx").on(table.anchorMessageId, table.channel),
}));

export const insertMessagingBridgeSessionSchema = createInsertSchema(messagingBridgeSessions).omit({ id: true, createdAt: true });
export type InsertMessagingBridgeSession = z.infer<typeof insertMessagingBridgeSessionSchema>;
export type MessagingBridgeSession = typeof messagingBridgeSessions.$inferSelect;

export const blogPosts = pgTable("blog_posts", {
  id: varchar("id", { length: 40 }).primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  metaDescription: text("meta_description").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  author: text("author").notNull().default("Chatvice Team"),
  tags: text("tags").array().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(true),
  heroImageKey: text("hero_image_key"),
  generatedAt: timestamp("generated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
}, (table) => ({
  slugIdx: index("blog_slug_idx").on(table.slug),
  categoryIdx: index("blog_category_idx").on(table.category),
  publishedIdx: index("blog_published_idx").on(table.published),
}));

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ generatedAt: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export const blogGenerationLogs = pgTable("blog_generation_logs", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  postId: varchar("post_id", { length: 40 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  dateIdx: index("blog_gen_date_idx").on(table.date),
}));

export const insertBlogGenerationLogSchema = createInsertSchema(blogGenerationLogs).omit({ id: true, createdAt: true });
export type InsertBlogGenerationLog = z.infer<typeof insertBlogGenerationLogSchema>;
export type BlogGenerationLog = typeof blogGenerationLogs.$inferSelect;

// ─── Addon Configs (admin-managed addon catalog) ─────────────────────────────
export const addonConfigs = pgTable("addon_configs", {
  id: serial("id").primaryKey(),
  addonType: text("addon_type").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPriceUsd: integer("monthly_price_usd").notNull().default(7),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAddonConfigSchema = createInsertSchema(addonConfigs).omit({ id: true, createdAt: true });
export type InsertAddonConfig = z.infer<typeof insertAddonConfigSchema>;
export type AddonConfig = typeof addonConfigs.$inferSelect;

// ─── Merchant Addons (subscriptions per merchant) ─────────────────────────────
export const merchantAddons = pgTable("merchant_addons", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  addonType: text("addon_type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  calendarToken: text("calendar_token"),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  paymentReference: text("payment_reference"),
}, (table) => ({
  merchantIdx: index("merchant_addons_merchant_idx").on(table.merchantId),
  addonTypeIdx: index("merchant_addons_type_idx").on(table.addonType),
  calendarTokenIdx: index("merchant_addons_cal_token_idx").on(table.calendarToken),
}));
export const insertMerchantAddonSchema = createInsertSchema(merchantAddons).omit({ subscribedAt: true });
export type InsertMerchantAddon = z.infer<typeof insertMerchantAddonSchema>;
export type MerchantAddon = typeof merchantAddons.$inferSelect;

// ─── Booster Configs (Task #328) ──────────────────────────────────────────────
// Booster packs: one-time or monthly add-ons that add extra quota slots
// (supervisors, agents, conversations, domains, sources, vision) on top of
// the merchant's plan without requiring a tier upgrade.
export const boosterConfigs = pgTable("booster_configs", {
  id: serial("id").primaryKey(),
  boosterType: text("booster_type").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  // Pricing
  priceUsd: integer("price_usd").notNull(),
  billingMode: text("billing_mode").notNull().default("one_time"), // 'one_time' | 'monthly'
  // What gets added to the merchant
  quotaField: text("quota_field").notNull(), // 'extraSupervisorSlots' | 'extraAgentSlots' | 'extraConversationsBalance' | 'extraDomainSlots' | 'extraSourceSlots' | 'extraVisionQuota'
  quotaAmount: integer("quota_amount").notNull(),
  // Visual styling
  iconName: text("icon_name").notNull().default("Sparkles"), // Lucide icon name
  gradientFrom: text("gradient_from").notNull().default("from-blue-500"),
  gradientTo: text("gradient_to").notNull().default("to-indigo-600"),
  sortOrder: integer("sort_order").notNull().default(100),
  isFeatured: boolean("is_featured").notNull().default(false),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertBoosterConfigSchema = createInsertSchema(boosterConfigs).omit({ id: true, createdAt: true });
export type InsertBoosterConfig = z.infer<typeof insertBoosterConfigSchema>;
export type BoosterConfig = typeof boosterConfigs.$inferSelect;
export type BoosterQuotaField =
  | "extraSupervisorSlots"
  | "extraAgentSlots"
  | "extraDomainSlots"
  | "extraSourceSlots"
  | "extraVisionQuota"
  | "extraConversationsBalance";
export type BoosterEntitlementSnapshot = {
  name: string;
  quotaField: BoosterQuotaField;
  quotaAmount: number;
  priceUsd?: number;
  billingMode?: "one_time" | "monthly";
};

// ─── Appointment Divisions ─────────────────────────────────────────────────────
export const appointmentDivisions = pgTable("appointment_divisions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  merchantIdx: index("appt_div_merchant_idx").on(table.merchantId),
}));
export const insertAppointmentDivisionSchema = createInsertSchema(appointmentDivisions).omit({ createdAt: true });
export type InsertAppointmentDivision = z.infer<typeof insertAppointmentDivisionSchema>;
export type AppointmentDivision = typeof appointmentDivisions.$inferSelect;

// ─── Appointment Providers (individuals who provide services) ──────────────────
export const appointmentProviders = pgTable("appointment_providers", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  divisionId: varchar("division_id", { length: 32 }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  merchantIdx: index("appt_prov_merchant_idx").on(table.merchantId),
  divisionIdx: index("appt_prov_division_idx").on(table.divisionId),
}));
export const insertAppointmentProviderSchema = createInsertSchema(appointmentProviders).omit({ createdAt: true });
export type InsertAppointmentProvider = z.infer<typeof insertAppointmentProviderSchema>;
export type AppointmentProvider = typeof appointmentProviders.$inferSelect;

// ─── Appointment Services ─────────────────────────────────────────────────────
export const appointmentServices = pgTable("appointment_services", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  divisionId: varchar("division_id", { length: 32 }),
  name: text("name").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  priceIdr: integer("price_idr"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  merchantIdx: index("appt_svc_merchant_idx").on(table.merchantId),
}));
export const insertAppointmentServiceSchema = createInsertSchema(appointmentServices).omit({ createdAt: true });
export type InsertAppointmentService = z.infer<typeof insertAppointmentServiceSchema>;
export type AppointmentService = typeof appointmentServices.$inferSelect;

// ─── Provider Schedules (weekly recurring availability) ───────────────────────
export const providerSchedules = pgTable("provider_schedules", {
  id: serial("id").primaryKey(),
  providerId: varchar("provider_id", { length: 32 }).notNull(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breakStart: text("break_start"),
  breakEnd: text("break_end"),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => ({
  providerIdx: index("prov_sched_provider_idx").on(table.providerId),
}));
export const insertProviderScheduleSchema = createInsertSchema(providerSchedules).omit({ id: true });
export type InsertProviderSchedule = z.infer<typeof insertProviderScheduleSchema>;
export type ProviderSchedule = typeof providerSchedules.$inferSelect;

// ─── Provider Blocked Dates ───────────────────────────────────────────────────
export const providerBlockedDates = pgTable("provider_blocked_dates", {
  id: serial("id").primaryKey(),
  providerId: varchar("provider_id", { length: 32 }).notNull(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  blockedDate: text("blocked_date").notNull(),
  reason: text("reason"),
}, (table) => ({
  providerIdx: index("prov_blocked_provider_idx").on(table.providerId),
}));
export const insertProviderBlockedDateSchema = createInsertSchema(providerBlockedDates).omit({ id: true });
export type InsertProviderBlockedDate = z.infer<typeof insertProviderBlockedDateSchema>;
export type ProviderBlockedDate = typeof providerBlockedDates.$inferSelect;

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointments = pgTable("appointments", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  serviceId: varchar("service_id", { length: 32 }),
  providerId: varchar("provider_id", { length: 32 }),
  divisionId: varchar("division_id", { length: 32 }),
  sessionId: varchar("session_id", { length: 64 }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  appointmentDate: text("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  endTime: text("end_time"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  bookingCode: text("booking_code"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  merchantIdx: index("appt_merchant_idx").on(table.merchantId),
  dateIdx: index("appt_date_idx").on(table.appointmentDate),
  providerIdx: index("appt_provider_idx").on(table.providerId),
  sessionIdx: index("appt_session_idx").on(table.sessionId),
  bookingCodeIdx: index("appt_booking_code_idx").on(table.bookingCode),
  providerSlotUniq: uniqueIndex("appt_provider_slot_uniq_idx").on(table.providerId, table.appointmentDate, table.appointmentTime),
}));
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// ── Password Recovery Config ───────────────────────────────────────────────
export const passwordRecoveryConfigs = pgTable("password_recovery_configs", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  agentId: varchar("agent_id", { length: 32 }),
  sheetCsvUrl: text("sheet_csv_url").notNull().default(""),
  writeBackUrl: text("write_back_url").default(""),
  isActive: boolean("is_active").notNull().default(false),
  aiInstructions: text("ai_instructions").default(""),
  formIntroText: text("form_intro_text").default(""),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  merchantIdx: index("pass_recov_merchant_idx").on(table.merchantId),
  agentIdx: index("pass_recov_agent_idx").on(table.agentId),
}));
export const insertPasswordRecoveryConfigSchema = createInsertSchema(passwordRecoveryConfigs).omit({ createdAt: true, updatedAt: true });
export type InsertPasswordRecoveryConfig = z.infer<typeof insertPasswordRecoveryConfigSchema>;
export type PasswordRecoveryConfig = typeof passwordRecoveryConfigs.$inferSelect;

// ── Password Recovery Requests ─────────────────────────────────────────────
// Status canonical values: "checking" | "rejected" | "solved"
// Legacy values still tolerated by the API: "pending" (==checking), "delivered" (==solved).
export const passwordRecoveryRequests = pgTable("password_recovery_requests", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  username: text("username").notNull(),
  phoneNumber: text("phone_number").notNull().default(""),
  bankAccount: text("bank_account").notNull().default(""),
  requestType: text("request_type").notNull().default("reset"),
  status: text("status").notNull().default("checking"),
  newPassword: text("new_password"),
  ticketId: text("ticket_id"),
  sheetRowIndex: integer("sheet_row_index"),
  extraData: jsonb("extra_data").notNull().default({}),
  manualOverride: boolean("manual_override").notNull().default(false),
  solvedAt: timestamp("solved_at"),
  rejectedAt: timestamp("rejected_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
}, (table) => ({
  merchantIdx: index("pass_recov_req_merchant_idx").on(table.merchantId),
  sessionIdx: index("pass_recov_req_session_idx").on(table.sessionId),
  statusIdx: index("pass_recov_req_status_idx").on(table.status),
}));
export const insertPasswordRecoveryRequestSchema = createInsertSchema(passwordRecoveryRequests).omit({ createdAt: true, deliveredAt: true });
export type InsertPasswordRecoveryRequest = z.infer<typeof insertPasswordRecoveryRequestSchema>;
export type PasswordRecoveryRequest = typeof passwordRecoveryRequests.$inferSelect;

// ── Hospitality Config ─────────────────────────────────────────────────────
export const hospitalityConfigs = pgTable("hospitality_configs", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull().unique(),
  hotelName: text("hotel_name").notNull().default(""),
  bookingUrl: text("booking_url").notNull().default(""),
  googleSheetUrl: text("google_sheet_url").notNull().default(""),
  sheetLastFetched: timestamp("sheet_last_fetched"),
  cachedSheetData: text("cached_sheet_data"),
  aiInstructions: text("ai_instructions").default(""),
  isEnabled: boolean("is_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  merchantIdx: index("hosp_merchant_idx").on(table.merchantId),
}));

export const insertHospitalityConfigSchema = createInsertSchema(hospitalityConfigs).omit({ createdAt: true, updatedAt: true, sheetLastFetched: true, cachedSheetData: true });
export type InsertHospitalityConfig = z.infer<typeof insertHospitalityConfigSchema>;
export type HospitalityConfig = typeof hospitalityConfigs.$inferSelect;

// ── Custom Data Source Connector (Realtime Panel Lookup) ──────────────────
// Allows merchants to expose realtime data from their own backend panel REST API
// to the Chatvice AI agent so visitors can check deposit/withdraw/turnover/etc.
// status without logging in to the panel — they identify themselves via fields
// the AI collects in chat.
export const customDataSources = pgTable("custom_data_sources", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull().unique(),
  name: text("name").notNull().default("Panel API"),
  baseUrl: text("base_url").notNull().default(""),
  // API key encrypted at rest. Format: "iv:authTag:cipherHex" (AES-256-GCM)
  apiKeyEncrypted: text("api_key_encrypted").default(""),
  // Last 4 chars of plaintext key for UI hint ("…XYZ9")
  apiKeyHint: text("api_key_hint").default(""),
  // HTTP header name to send the API key in (default: X-API-Key)
  headerAuthName: text("header_auth_name").notNull().default("X-API-Key"),
  // Optional: ping endpoint path for "Test connection" button
  healthPath: text("health_path").default("/health"),
  // Cache TTL per (intent + identifier) key, in seconds. Default 30s.
  cacheTtlSec: integer("cache_ttl_sec").notNull().default(30),
  // Per-merchant rate limit: max API calls per minute
  rateLimitPerMin: integer("rate_limit_per_min").notNull().default(60),
  isEnabled: boolean("is_enabled").notNull().default(false),
  // ── Health monitoring (background ping every 60s) ──
  // Merchants can disable monitoring without disabling the connector entirely.
  healthMonitorEnabled: boolean("health_monitor_enabled").notNull().default(true),
  // Latest summary cached on the source row so the dashboard badge loads instantly
  // without scanning the rolling pings table.
  lastHealthCheckAt: timestamp("last_health_check_at"),
  lastHealthStatus: text("last_health_status").default("unknown"), // up | degraded | down | unknown
  lastHealthLatencyMs: integer("last_health_latency_ms"),
  lastHealthError: text("last_health_error"),
  // De-dup window for outbound alerts — we only re-alert after recovery + new degradation.
  healthAlertSentAt: timestamp("health_alert_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  merchantIdx: index("cds_merchant_idx").on(table.merchantId),
}));

export const insertCustomDataSourceSchema = createInsertSchema(customDataSources).omit({
  id: true, createdAt: true, updatedAt: true, apiKeyEncrypted: true, apiKeyHint: true,
});
export type InsertCustomDataSource = z.infer<typeof insertCustomDataSourceSchema>;
export type CustomDataSource = typeof customDataSources.$inferSelect;

// Per-source intent definitions — each describes one lookup the AI can perform.
// requiredFields example: [{"key":"username","label":"Username","type":"text","required":true}, ...]
export const customDataIntents = pgTable("custom_data_intents", {
  id: varchar("id", { length: 32 }).primaryKey(),
  sourceId: varchar("source_id", { length: 32 }).notNull(),
  // Stable machine key the AI emits, e.g. "deposit_status", "withdraw_status",
  // "turnover_progress", "last_login_ip", or merchant-defined slug.
  intentKey: text("intent_key").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  // Comma-separated trigger keywords AI uses to recognise this intent.
  triggerKeywords: text("trigger_keywords").notNull().default(""),
  // HTTP method for the merchant's panel endpoint (GET or POST).
  httpMethod: text("http_method").notNull().default("GET"),
  // Endpoint path appended to source.baseUrl. Supports {field} placeholders.
  endpointPath: text("endpoint_path").notNull().default(""),
  // JSON array of required field definitions — see comment above.
  requiredFields: jsonb("required_fields").notNull().default([]),
  // Natural-language template used to format API response into the chat reply.
  // Supports {jsonpath} placeholders, e.g. "Status depo Anda: {status}, jumlah: {amount}".
  responseTemplate: text("response_template").notNull().default(""),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sourceIdx: index("cdi_source_idx").on(table.sourceId),
  intentKeyIdx: index("cdi_intent_key_idx").on(table.sourceId, table.intentKey),
}));

export const insertCustomDataIntentSchema = createInsertSchema(customDataIntents).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertCustomDataIntent = z.infer<typeof insertCustomDataIntentSchema>;
export type CustomDataIntent = typeof customDataIntents.$inferSelect;

// Audit log of all panel API calls. We store enough for merchants to debug
// their endpoints without leaking secrets — never log the API key or the raw
// response body. Identifying fields are stored masked (e.g. "use***ame").
export const customDataAuditLog = pgTable("custom_data_audit_log", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  intentId: varchar("intent_id", { length: 32 }),
  intentKey: text("intent_key").notNull(),
  sessionId: varchar("session_id", { length: 64 }),
  httpStatus: integer("http_status").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  success: boolean("success").notNull().default(false),
  errorMessage: text("error_message"),
  maskedFields: jsonb("masked_fields").default({}),
  endpointUrl: text("endpoint_url"),
  httpMethod: varchar("http_method", { length: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  merchantIdx: index("cda_merchant_idx").on(table.merchantId, table.createdAt),
}));

export const insertCustomDataAuditLogSchema = createInsertSchema(customDataAuditLog).omit({
  id: true, createdAt: true,
});
export type InsertCustomDataAuditLog = z.infer<typeof insertCustomDataAuditLogSchema>;
export type CustomDataAuditLog = typeof customDataAuditLog.$inferSelect;

// Rolling health-ping history (last hour). Background job inserts one row per
// 60s tick per enabled source; we compute the 5-minute success rate from this
// to drive the dashboard badge and alert thresholds. Older rows are pruned.
export const customDataHealthPings = pgTable("custom_data_health_pings", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  sourceId: varchar("source_id", { length: 32 }).notNull(),
  success: boolean("success").notNull().default(false),
  httpStatus: integer("http_status").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  merchantTimeIdx: index("cdh_merchant_time_idx").on(table.merchantId, table.createdAt),
}));

export const insertCustomDataHealthPingSchema = createInsertSchema(customDataHealthPings).omit({
  id: true, createdAt: true,
});
export type InsertCustomDataHealthPing = z.infer<typeof insertCustomDataHealthPingSchema>;
export type CustomDataHealthPing = typeof customDataHealthPings.$inferSelect;

// ── Blast Campaigns ────────────────────────────────────────────────────────
export const blastCampaigns = pgTable("blast_campaigns", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  sentBy: varchar("sent_by", { length: 32 }),
  filters: jsonb("filters").notNull().default({}),
  message: text("message").notNull(),
  blastMessageType: text("blast_message_type").notNull().default("text"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  matchedCount: integer("matched_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  // status contract: "scheduled" | "sending" (in-flight, atomic lock) | "sent" | "cancelled"
  status: text("status").notNull().default("scheduled"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  merchantIdx: index("blast_merchant_idx").on(table.merchantId),
  statusIdx: index("blast_status_idx").on(table.status),
  scheduledForIdx: index("blast_scheduled_for_idx").on(table.scheduledFor),
}));

export const insertBlastCampaignSchema = createInsertSchema(blastCampaigns).omit({ createdAt: true });
export type InsertBlastCampaign = z.infer<typeof insertBlastCampaignSchema>;
export type BlastCampaign = typeof blastCampaigns.$inferSelect;

// Daily aggregated OpenAI/LLM token usage per merchant per model
// Used for the merchant savings widget and the admin cost-monitor table.
// Cost is stored as `cost_micro_usd` (integer micro-USD = USD * 1_000_000)
// to avoid floating-point drift across many incremental updates.
export const merchantTokenUsageDaily = pgTable("merchant_token_usage_daily", {
  id: varchar("id", { length: 32 }).primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD (UTC)
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").default(0).notNull(),
  completionTokens: integer("completion_tokens").default(0).notNull(),
  requests: integer("requests").default(0).notNull(),
  costMicroUsd: integer("cost_micro_usd").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniq: uniqueIndex("merchant_token_usage_daily_uniq").on(table.merchantId, table.date, table.model),
  merchantIdx: index("merchant_token_usage_daily_merchant_idx").on(table.merchantId),
  dateIdx: index("merchant_token_usage_daily_date_idx").on(table.date),
}));

export type MerchantTokenUsageDaily = typeof merchantTokenUsageDaily.$inferSelect;
export type InsertMerchantTokenUsageDaily = typeof merchantTokenUsageDaily.$inferInsert;

// ── Gaming Panel Integration ────────────────────────────────────────────────

export const gamingMerchants = pgTable("gaming_merchants", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull().unique(),
  merchantName: text("merchant_name").notNull(),
  brandName: text("brand_name"),
  apiBaseUrl: text("api_base_url").notNull(),
  apiKeyEncrypted: text("api_key_encrypted"),
  apiSecretEncrypted: text("api_secret_encrypted"),
  webhookSecret: text("webhook_secret"),
  ipWhitelist: text("ip_whitelist").array().default([]),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  uniqueIndex("gaming_merchants_merchant_id_uidx").on(t.merchantId),
]);

export const insertGamingMerchantSchema = createInsertSchema(gamingMerchants).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGamingMerchant = z.infer<typeof insertGamingMerchantSchema>;
export type GamingMerchant = typeof gamingMerchants.$inferSelect;

export const gamingPlayerMappings = pgTable("gaming_player_mappings", {
  id: serial("id").primaryKey(),
  chatviceUserId: varchar("chatvice_user_id", { length: 64 }),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  gamingUsername: text("gaming_username").notNull(),
  gamingPlayerId: text("gaming_player_id"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  verifiedStatus: text("verified_status").notNull().default("unverified"),
  linkedAt: timestamp("linked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("gaming_player_mappings_merchant_idx").on(t.merchantId),
  index("gaming_player_mappings_phone_idx").on(t.phoneNumber),
]);

export const insertGamingPlayerMappingSchema = createInsertSchema(gamingPlayerMappings).omit({ id: true, linkedAt: true, createdAt: true, updatedAt: true });
export type InsertGamingPlayerMapping = z.infer<typeof insertGamingPlayerMappingSchema>;
export type GamingPlayerMapping = typeof gamingPlayerMappings.$inferSelect;

export const gamingDepositTransactions = pgTable("gaming_deposit_transactions", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  playerId: text("player_id"),
  username: text("username"),
  transactionId: text("transaction_id").notNull(),
  amount: integer("amount"),
  currency: text("currency").default("IDR"),
  paymentMethod: text("payment_method"),
  paymentChannel: text("payment_channel"),
  status: text("status").notNull().default("pending"),
  proofUrl: text("proof_url"),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  expiredAt: timestamp("expired_at"),
  rawPayload: jsonb("raw_payload"),
  syncedAt: timestamp("synced_at").defaultNow(),
}, (t) => [
  index("gaming_deposits_merchant_idx").on(t.merchantId),
  index("gaming_deposits_tx_id_idx").on(t.transactionId),
  index("gaming_deposits_status_idx").on(t.status),
]);

export const insertGamingDepositSchema = createInsertSchema(gamingDepositTransactions).omit({ id: true, createdAt: true, syncedAt: true });
export type InsertGamingDeposit = z.infer<typeof insertGamingDepositSchema>;
export type GamingDeposit = typeof gamingDepositTransactions.$inferSelect;

export const gamingWithdrawTransactions = pgTable("gaming_withdraw_transactions", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  playerId: text("player_id"),
  username: text("username"),
  withdrawId: text("withdraw_id").notNull(),
  amount: integer("amount"),
  currency: text("currency").default("IDR"),
  bankName: text("bank_name"),
  accountName: text("account_name"),
  accountNumberMasked: text("account_number_masked"),
  status: text("status").notNull().default("pending"),
  rejectedReason: text("rejected_reason"),
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rawPayload: jsonb("raw_payload"),
  syncedAt: timestamp("synced_at").defaultNow(),
}, (t) => [
  index("gaming_withdrawals_merchant_idx").on(t.merchantId),
  index("gaming_withdrawals_withdraw_id_idx").on(t.withdrawId),
  index("gaming_withdrawals_status_idx").on(t.status),
]);

export const insertGamingWithdrawSchema = createInsertSchema(gamingWithdrawTransactions).omit({ id: true, requestedAt: true, syncedAt: true });
export type InsertGamingWithdraw = z.infer<typeof insertGamingWithdrawSchema>;
export type GamingWithdraw = typeof gamingWithdrawTransactions.$inferSelect;

export const gamingTurnoverStatus = pgTable("gaming_turnover_status", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  playerId: text("player_id"),
  username: text("username"),
  bonusId: text("bonus_id"),
  bonusName: text("bonus_name"),
  requiredTurnover: integer("required_turnover"),
  currentTurnover: integer("current_turnover"),
  remainingTurnover: integer("remaining_turnover"),
  progressPercentage: integer("progress_percentage"),
  eligibleWithdraw: boolean("eligible_withdraw").default(false),
  expiryDate: timestamp("expiry_date"),
  status: text("status").notNull().default("active"),
  rawPayload: jsonb("raw_payload"),
  syncedAt: timestamp("synced_at").defaultNow(),
}, (t) => [
  index("gaming_turnover_merchant_idx").on(t.merchantId),
  index("gaming_turnover_player_idx").on(t.playerId),
]);

export const insertGamingTurnoverSchema = createInsertSchema(gamingTurnoverStatus).omit({ id: true, syncedAt: true });
export type InsertGamingTurnover = z.infer<typeof insertGamingTurnoverSchema>;
export type GamingTurnover = typeof gamingTurnoverStatus.$inferSelect;

export const gamingBalanceSnapshots = pgTable("gaming_balance_snapshots", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  playerId: text("player_id"),
  username: text("username"),
  currentBalance: integer("current_balance"),
  lockedBalance: integer("locked_balance"),
  bonusBalance: integer("bonus_balance"),
  currency: text("currency").default("IDR"),
  source: text("source"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("gaming_balance_merchant_idx").on(t.merchantId),
  index("gaming_balance_player_idx").on(t.playerId),
]);

export const insertGamingBalanceSchema = createInsertSchema(gamingBalanceSnapshots).omit({ id: true, createdAt: true });
export type InsertGamingBalance = z.infer<typeof insertGamingBalanceSchema>;
export type GamingBalance = typeof gamingBalanceSnapshots.$inferSelect;

export const gamingWebhookLogs = pgTable("gaming_webhook_logs", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  eventType: text("event_type").notNull(),
  eventId: text("event_id"),
  playerId: text("player_id"),
  transactionId: text("transaction_id"),
  payload: jsonb("payload"),
  signatureValid: boolean("signature_valid").default(false),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
}, (t) => [
  index("gaming_webhook_logs_merchant_idx").on(t.merchantId),
  index("gaming_webhook_logs_status_idx").on(t.status),
  uniqueIndex("gaming_webhook_logs_merchant_event_uidx").on(t.merchantId, t.eventId).where(sql`event_id IS NOT NULL`),
]);

export const insertGamingWebhookLogSchema = createInsertSchema(gamingWebhookLogs).omit({ id: true, receivedAt: true });
export type InsertGamingWebhookLog = z.infer<typeof insertGamingWebhookLogSchema>;
export type GamingWebhookLog = typeof gamingWebhookLogs.$inferSelect;

export const gamingFailedEvents = pgTable("gaming_failed_events", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0),
  nextRetryAt: timestamp("next_retry_at"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("gaming_failed_events_merchant_idx").on(t.merchantId),
  index("gaming_failed_events_status_idx").on(t.status),
]);

export const insertGamingFailedEventSchema = createInsertSchema(gamingFailedEvents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGamingFailedEvent = z.infer<typeof insertGamingFailedEventSchema>;
export type GamingFailedEvent = typeof gamingFailedEvents.$inferSelect;

export const gamingApiHealthLogs = pgTable("gaming_api_health_logs", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").default("GET"),
  statusCode: integer("status_code"),
  responseTimeMs: integer("response_time_ms"),
  success: boolean("success").default(false),
  errorMessage: text("error_message"),
  checkedAt: timestamp("checked_at").defaultNow(),
}, (t) => [
  index("gaming_api_health_merchant_idx").on(t.merchantId),
  index("gaming_api_health_checked_at_idx").on(t.checkedAt),
]);

export const insertGamingApiHealthLogSchema = createInsertSchema(gamingApiHealthLogs).omit({ id: true, checkedAt: true });
export type InsertGamingApiHealthLog = z.infer<typeof insertGamingApiHealthLogSchema>;
export type GamingApiHealthLog = typeof gamingApiHealthLogs.$inferSelect;

export const gamingAiResponseRules = pgTable("gaming_ai_response_rules", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id", { length: 32 }).notNull(),
  eventType: text("event_type").notNull(),
  conditionKey: text("condition_key"),
  conditionOperator: text("condition_operator"),
  conditionValue: text("condition_value"),
  responseTemplate: text("response_template").notNull(),
  escalationRequired: boolean("escalation_required").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("gaming_ai_rules_merchant_idx").on(t.merchantId),
  index("gaming_ai_rules_event_type_idx").on(t.eventType),
]);

export const insertGamingAiResponseRuleSchema = createInsertSchema(gamingAiResponseRules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGamingAiResponseRule = z.infer<typeof insertGamingAiResponseRuleSchema>;
export type GamingAiResponseRule = typeof gamingAiResponseRules.$inferSelect;

export const gamingIntegrationTasks = pgTable("gaming_integration_tasks", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("backlog"),
  ownerRole: text("owner_role"),
  dependencies: text("dependencies").array().default([]),
  acceptanceCriteria: text("acceptance_criteria"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertGamingIntegrationTaskSchema = createInsertSchema(gamingIntegrationTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGamingIntegrationTask = z.infer<typeof insertGamingIntegrationTaskSchema>;
export type GamingIntegrationTask = typeof gamingIntegrationTasks.$inferSelect;

