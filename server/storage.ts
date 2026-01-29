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
  type StoredFile, type InsertStoredFile,
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
  type EmailVerificationToken, type InsertEmailVerificationToken,
  type PasswordResetToken, type InsertPasswordResetToken,
  type Promotion, type InsertPromotion,
  type PromotionUsage, type InsertPromotionUsage,
  type WidgetSite, type InsertWidgetSite,
  type SiteDomain, type InsertSiteDomain,
  type CoinOrder, type InsertCoinOrder,
  type TopupNominal, type InsertTopupNominal,
  type MerchantDomain, type InsertMerchantDomain,
  type PaymentGateway, type InsertPaymentGateway,
  type PaymentTransaction, type InsertPaymentTransaction,
  type AdminNotification, type InsertAdminNotification,
  type ChatSecuritySettings, type InsertChatSecuritySettings,
  type ChatSecurityAlert, type InsertChatSecurityAlert,
  type KnowledgebaseArticle, type InsertKnowledgebaseArticle,
  type KnowledgebaseTemplate, type InsertKnowledgebaseTemplate,
  type ProductCrawlSource, type InsertProductCrawlSource,
  type CrawledProduct, type InsertCrawledProduct,
  type CustomPlanInvoice, type InsertCustomPlanInvoice,
  type CustomPlanRequest, type InsertCustomPlanRequest,
  type MerchantNotification, type InsertMerchantNotification,
  type DomainRegistration, type InsertDomainRegistration,
  type Affiliate, type InsertAffiliate,
  type AffiliateReferral, type InsertAffiliateReferral,
  type AffiliateCommission, type InsertAffiliateCommission,
  type AffiliatePayout, type InsertAffiliatePayout,
  type AffiliatePaymentMethod, type InsertAffiliatePaymentMethod,
  type AffiliateWithdrawalRequest, type InsertAffiliateWithdrawalRequest,
  type Lead, type InsertLead,
  merchants, supervisors, sessions, messages, triggers, knowledge, knowledgeChunks, notifications, admins, crawledLinks, agents, sources, suggestedQuestions, chatLogs, agentSupervisors, mediaAttachments, platformSettings, landingPageSettings, storedFiles, domainRegistrations, leads,
  workShifts, shiftAssignments, workReports, quickReplies, chatButtons, productCards, productCardButtons, welcomeBubbles, notificationSettings, productRecommendationSettings, productTriggers, supervisorInvitations,
  emailVerificationTokens, passwordResetTokens, promotions, promotionUsage,
  widgetSites, siteDomains, coinOrders, topupNominals, merchantDomains, paymentGateways,
  paymentTransactions, adminNotifications, chatSecuritySettings, chatSecurityAlerts,
  knowledgebaseArticles, knowledgebaseTemplates, productCrawlSources, crawledProducts, customPlanInvoices,
  customPlanRequests, merchantNotifications, affiliates, affiliateReferrals, affiliateCommissions, affiliatePayouts, affiliatePaymentMethods, affiliateWithdrawalRequests,
  knowledgeTemplates, type KnowledgeTemplate, type InsertKnowledgeTemplate,
  merchantActivityLogs, type MerchantActivityLog, type InsertMerchantActivityLog,
  customers, type Customer, type InsertCustomer,
  otpCodes, type OTPCode, type InsertOTPCode,
  customerContacts, type CustomerContact, type InsertCustomerContact,
  customerStoreChats, type CustomerStoreChat, type InsertCustomerStoreChat,
  personalChats, type PersonalChat, type InsertPersonalChat,
  personalMessages, type PersonalMessage, type InsertPersonalMessage,
  chatMedia, type ChatMedia, type InsertChatMedia,
  customerStories, type CustomerStory, type InsertCustomerStory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, gte, and, or, lt, isNull, sql, count, inArray, ne } from "drizzle-orm";
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
  getMerchantByUsername(username: string): Promise<Merchant | undefined>;
  getMerchantByGoogleId(googleId: string): Promise<Merchant | undefined>;
  getMerchantByGithubId(githubId: string): Promise<Merchant | undefined>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant | undefined>;

  getSupervisor(id: string): Promise<Supervisor | undefined>;
  getSupervisorByEmail(email: string): Promise<Supervisor | undefined>;
  getSupervisorsByMerchant(merchantId: string): Promise<Supervisor[]>;
  createSupervisor(supervisor: InsertSupervisor): Promise<Supervisor>;
  updateSupervisor(id: string, data: Partial<Supervisor>): Promise<Supervisor | undefined>;
  deleteSupervisor(id: string): Promise<boolean>;

  getSession(id: string): Promise<Session | undefined>;
  getSessionsByMerchant(merchantId: string, activeOnly?: boolean): Promise<Session[]>;
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
  getCrawledLink(id: string): Promise<CrawledLink | undefined>;
  createCrawledLink(link: InsertCrawledLink): Promise<CrawledLink>;
  updateCrawledLink(id: string, data: Partial<CrawledLink>): Promise<CrawledLink | undefined>;
  deleteCrawledLink(id: string): Promise<boolean>;
  getActiveCrawledLinksForSync(): Promise<CrawledLink[]>;
  
  // Sources
  getSources(merchantId: string): Promise<Source[]>;
  getSource(id: string): Promise<Source | undefined>;
  createSource(data: InsertSource): Promise<Source>;
  updateSource(id: string, data: Partial<Source>): Promise<Source | undefined>;
  deleteSource(id: string): Promise<boolean>;
  getActiveSourcesForSync(): Promise<Source[]>;
  
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
  
  // Stored Files (database-backed file storage)
  storeFile(file: InsertStoredFile): Promise<StoredFile>;
  getStoredFile(id: string): Promise<StoredFile | undefined>;
  deleteStoredFile(id: string): Promise<boolean>;
  
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
  
  // Product Crawl Sources
  getProductCrawlSources(merchantId: string): Promise<ProductCrawlSource[]>;
  getProductCrawlSource(id: string): Promise<ProductCrawlSource | undefined>;
  createProductCrawlSource(source: InsertProductCrawlSource): Promise<ProductCrawlSource>;
  updateProductCrawlSource(id: string, data: Partial<ProductCrawlSource>): Promise<ProductCrawlSource | undefined>;
  deleteProductCrawlSource(id: string): Promise<boolean>;
  getActiveProductCrawlSourcesForSync(): Promise<ProductCrawlSource[]>;
  
  // Crawled Products
  getCrawledProducts(merchantId: string, status?: string): Promise<CrawledProduct[]>;
  getCrawledProductsBySource(sourceId: string, status?: string): Promise<CrawledProduct[]>;
  getCrawledProduct(id: string): Promise<CrawledProduct | undefined>;
  createCrawledProduct(product: InsertCrawledProduct): Promise<CrawledProduct>;
  updateCrawledProduct(id: string, data: Partial<CrawledProduct>): Promise<CrawledProduct | undefined>;
  deleteCrawledProduct(id: string): Promise<boolean>;
  deleteCrawledProductsBySource(sourceId: string): Promise<boolean>;
  approveCrawledProduct(id: string, approvedBy: string): Promise<CrawledProduct | undefined>;
  rejectCrawledProduct(id: string): Promise<CrawledProduct | undefined>;
  getApprovedCrawledProducts(merchantId: string, agentId?: string): Promise<CrawledProduct[]>;
  findCrawledProductByUrl(merchantId: string, productUrl: string): Promise<CrawledProduct | undefined>;
  upsertCrawledProduct(product: InsertCrawledProduct): Promise<CrawledProduct>;
  
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
  
  // Domain Registrations (prevent duplicate domain signups)
  getDomainRegistration(domain: string): Promise<DomainRegistration | undefined>;
  getDomainRegistrationsByMerchant(merchantId: string): Promise<DomainRegistration[]>;
  createDomainRegistration(data: InsertDomainRegistration): Promise<DomainRegistration>;
  isDomainAvailable(domain: string): Promise<boolean>;
  
  // Email Verification Tokens
  createEmailVerificationToken(data: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getEmailVerificationTokenByToken(token: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerificationTokenUsed(id: string): Promise<void>;
  
  // Password Reset Tokens
  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  
  // Promotions
  getPromotions(): Promise<Promotion[]>;
  getPromotion(id: string): Promise<Promotion | undefined>;
  getPromotionByCode(code: string): Promise<Promotion | undefined>;
  getActivePromotions(): Promise<Promotion[]>;
  getPublicActivePromotions(): Promise<Promotion[]>;
  createPromotion(data: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: string, data: Partial<Promotion>): Promise<Promotion | undefined>;
  deletePromotion(id: string): Promise<boolean>;
  incrementPromotionUsage(id: string): Promise<boolean>;
  
  // Promotion Usage
  getPromotionUsage(promotionId: string): Promise<PromotionUsage[]>;
  createPromotionUsage(data: InsertPromotionUsage): Promise<PromotionUsage>;
  
  // Widget Sites (Chatvice Top Up v2)
  getWidgetSite(id: string): Promise<WidgetSite | undefined>;
  getWidgetSiteBySiteKey(siteKey: string): Promise<WidgetSite | undefined>;
  getWidgetSitesByMerchant(merchantId: string): Promise<WidgetSite[]>;
  createWidgetSite(data: InsertWidgetSite): Promise<WidgetSite>;
  updateWidgetSite(id: string, data: Partial<WidgetSite>): Promise<WidgetSite | undefined>;
  deleteWidgetSite(id: string): Promise<boolean>;
  
  // Site Domains (domain tracking)
  getSiteDomains(siteId: string): Promise<SiteDomain[]>;
  getCurrentDomain(siteId: string): Promise<SiteDomain | undefined>;
  upsertSiteDomain(siteId: string, domain: string): Promise<SiteDomain>;
  
  // Coin Orders
  getCoinOrder(id: string): Promise<CoinOrder | undefined>;
  getCoinOrderByOrderId(orderId: string): Promise<CoinOrder | undefined>;
  getCoinOrdersBySite(siteId: string): Promise<CoinOrder[]>;
  getCoinOrdersByMerchant(merchantId: string): Promise<CoinOrder[]>;
  createCoinOrder(data: InsertCoinOrder): Promise<CoinOrder>;
  updateCoinOrder(id: string, data: Partial<CoinOrder>): Promise<CoinOrder | undefined>;
  
  // Topup Nominals
  getTopupNominals(siteId: string): Promise<TopupNominal[]>;
  createTopupNominal(data: InsertTopupNominal): Promise<TopupNominal>;
  updateTopupNominal(id: string, data: Partial<TopupNominal>): Promise<TopupNominal | undefined>;
  deleteTopupNominal(id: string): Promise<boolean>;
  
  // Merchant Domains (allowed domains for widget embedding)
  getMerchantDomains(merchantId: string): Promise<MerchantDomain[]>;
  getMerchantDomain(id: string): Promise<MerchantDomain | undefined>;
  getMerchantDomainByDomain(merchantId: string, domain: string): Promise<MerchantDomain | undefined>;
  createMerchantDomain(data: InsertMerchantDomain): Promise<MerchantDomain>;
  updateMerchantDomain(id: string, data: Partial<MerchantDomain>): Promise<MerchantDomain | undefined>;
  deleteMerchantDomain(id: string): Promise<boolean>;
  countMerchantDomains(merchantId: string): Promise<number>;
  
  // Payment Gateways
  getPaymentGateways(): Promise<PaymentGateway[]>;
  getPaymentGateway(id: string): Promise<PaymentGateway | undefined>;
  getDefaultPaymentGateway(): Promise<PaymentGateway | undefined>;
  getActivePaymentGateways(): Promise<PaymentGateway[]>;
  createPaymentGateway(data: InsertPaymentGateway): Promise<PaymentGateway>;
  updatePaymentGateway(id: string, data: Partial<PaymentGateway>): Promise<PaymentGateway | undefined>;
  deletePaymentGateway(id: string): Promise<boolean>;
  setDefaultPaymentGateway(id: string): Promise<boolean>;
  
  // Payment Transactions
  getPaymentTransaction(id: string): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionByExternalId(externalId: string): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionsByMerchant(merchantId: string): Promise<PaymentTransaction[]>;
  getAllPaymentTransactions(limit?: number): Promise<PaymentTransaction[]>;
  createPaymentTransaction(data: InsertPaymentTransaction): Promise<PaymentTransaction>;
  updatePaymentTransaction(id: string, data: Partial<PaymentTransaction>): Promise<PaymentTransaction | undefined>;
  generateInvoiceNumber(): Promise<string>;
  
  // Admin Notifications
  getAdminNotifications(limit?: number): Promise<AdminNotification[]>;
  getUnreadAdminNotifications(): Promise<AdminNotification[]>;
  createAdminNotification(data: InsertAdminNotification): Promise<AdminNotification>;
  markAdminNotificationRead(id: string): Promise<boolean>;
  markAllAdminNotificationsRead(): Promise<boolean>;
  
  // Chat Security Settings
  getChatSecuritySettings(merchantId: string): Promise<ChatSecuritySettings | undefined>;
  upsertChatSecuritySettings(merchantId: string, data: Partial<InsertChatSecuritySettings>): Promise<ChatSecuritySettings>;
  
  // Chat Security Alerts
  getChatSecurityAlerts(merchantId: string, status?: string, limit?: number): Promise<ChatSecurityAlert[]>;
  getChatSecurityAlert(id: string): Promise<ChatSecurityAlert | undefined>;
  createChatSecurityAlert(data: InsertChatSecurityAlert): Promise<ChatSecurityAlert>;
  updateChatSecurityAlert(id: string, data: Partial<ChatSecurityAlert>): Promise<ChatSecurityAlert | undefined>;
  getChatSecurityAlertStats(merchantId: string): Promise<{ total: number; new: number; reviewed: number; dismissed: number; escalated: number }>;
  
  // KnowledgeBase Articles
  getKnowledgebaseArticles(merchantId: string, status?: string): Promise<KnowledgebaseArticle[]>;
  getKnowledgebaseArticle(id: string): Promise<KnowledgebaseArticle | undefined>;
  createKnowledgebaseArticle(data: InsertKnowledgebaseArticle): Promise<KnowledgebaseArticle>;
  updateKnowledgebaseArticle(id: string, data: Partial<KnowledgebaseArticle>): Promise<KnowledgebaseArticle | undefined>;
  deleteKnowledgebaseArticle(id: string): Promise<boolean>;
  
  // KnowledgeBase Templates
  getKnowledgebaseTemplates(businessType?: string): Promise<KnowledgebaseTemplate[]>;
  getKnowledgebaseTemplate(id: string): Promise<KnowledgebaseTemplate | undefined>;
  getKnowledgebaseTemplateByCategory(businessType: string, category: string): Promise<KnowledgebaseTemplate | undefined>;
  createKnowledgebaseTemplate(data: InsertKnowledgebaseTemplate): Promise<KnowledgebaseTemplate>;
  updateKnowledgebaseTemplate(id: string, data: Partial<KnowledgebaseTemplate>): Promise<KnowledgebaseTemplate | undefined>;
  deleteKnowledgebaseTemplate(id: string): Promise<boolean>;
  
  // Custom Plan Invoices
  getCustomPlanInvoices(merchantId?: string): Promise<CustomPlanInvoice[]>;
  getCustomPlanInvoice(id: string): Promise<CustomPlanInvoice | undefined>;
  getCustomPlanInvoiceByNumber(invoiceNumber: string): Promise<CustomPlanInvoice | undefined>;
  getPendingCustomPlanInvoices(merchantId: string): Promise<CustomPlanInvoice[]>;
  createCustomPlanInvoice(data: InsertCustomPlanInvoice): Promise<CustomPlanInvoice>;
  updateCustomPlanInvoice(id: string, data: Partial<CustomPlanInvoice>): Promise<CustomPlanInvoice | undefined>;
  generateCustomInvoiceNumber(): Promise<string>;
  
  // Custom Plan Requests
  getCustomPlanRequests(status?: string): Promise<CustomPlanRequest[]>;
  getCustomPlanRequestsByMerchant(merchantId: string): Promise<CustomPlanRequest[]>;
  getCustomPlanRequest(id: string): Promise<CustomPlanRequest | undefined>;
  createCustomPlanRequest(data: InsertCustomPlanRequest): Promise<CustomPlanRequest>;
  updateCustomPlanRequest(id: string, data: Partial<CustomPlanRequest>): Promise<CustomPlanRequest | undefined>;
  
  // Merchant Notifications
  getMerchantNotifications(merchantId: string, limit?: number): Promise<MerchantNotification[]>;
  getUnreadMerchantNotifications(merchantId: string): Promise<MerchantNotification[]>;
  getMerchantNotification(id: string): Promise<MerchantNotification | undefined>;
  createMerchantNotification(data: InsertMerchantNotification): Promise<MerchantNotification>;
  markNotificationAsRead(id: string): Promise<MerchantNotification | undefined>;
  markAllNotificationsAsRead(merchantId: string): Promise<void>;
  getUnreadNotificationCount(merchantId: string): Promise<number>;
  
  // Knowledge Templates (Admin-managed training data templates)
  getKnowledgeTemplates(category?: string): Promise<KnowledgeTemplate[]>;
  getKnowledgeTemplate(id: string): Promise<KnowledgeTemplate | undefined>;
  getActiveKnowledgeTemplates(category?: string): Promise<KnowledgeTemplate[]>;
  createKnowledgeTemplate(data: InsertKnowledgeTemplate): Promise<KnowledgeTemplate>;
  updateKnowledgeTemplate(id: string, data: Partial<KnowledgeTemplate>): Promise<KnowledgeTemplate | undefined>;
  deleteKnowledgeTemplate(id: string): Promise<boolean>;
  incrementKnowledgeTemplateUsage(id: string): Promise<boolean>;
  
  // Merchant Activity Logs
  getMerchantActivityLogs(merchantId: string, limit?: number): Promise<MerchantActivityLog[]>;
  getAllMerchantActivityLogs(limit?: number, activityType?: string): Promise<MerchantActivityLog[]>;
  createMerchantActivityLog(data: InsertMerchantActivityLog): Promise<MerchantActivityLog>;
  getMerchantActivityLogsByType(activityType: string, limit?: number): Promise<MerchantActivityLog[]>;
  
  // Leads (Sales Agent)
  getLeads(merchantId: string): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadBySession(sessionId: string): Promise<Lead | undefined>;
  createLead(data: InsertLead): Promise<Lead>;
  updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  getLeadsByStage(merchantId: string, stage: string): Promise<Lead[]>;
  
  // Customer App (chat.chatvice.app)
  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(phoneNumber: string): Promise<Customer | undefined>;
  getCustomerByPersonalId(personalId: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined>;
  generatePersonalId(): Promise<string>;
  
  // OTP Codes
  createOTPCode(data: InsertOTPCode): Promise<OTPCode>;
  getOTPCode(phoneNumber: string): Promise<OTPCode | undefined>;
  verifyOTPCode(phoneNumber: string, code: string): Promise<boolean>;
  incrementOTPAttempts(id: string): Promise<void>;
  
  // Customer Contacts
  getCustomerContacts(customerId: string): Promise<CustomerContact[]>;
  createCustomerContact(data: InsertCustomerContact): Promise<CustomerContact>;
  updateCustomerContact(id: string, data: Partial<CustomerContact>): Promise<CustomerContact | undefined>;
  deleteCustomerContact(id: string): Promise<boolean>;
  
  // Customer Store Chats
  getCustomerStoreChats(customerId: string): Promise<CustomerStoreChat[]>;
  getCustomerStoreChat(id: string): Promise<CustomerStoreChat | undefined>;
  getCustomerStoreChatByMerchant(customerId: string, merchantId: string): Promise<CustomerStoreChat | undefined>;
  createCustomerStoreChat(data: InsertCustomerStoreChat): Promise<CustomerStoreChat>;
  updateCustomerStoreChat(id: string, data: Partial<CustomerStoreChat>): Promise<CustomerStoreChat | undefined>;
  
  // Personal Chats
  getPersonalChats(customerId: string): Promise<PersonalChat[]>;
  getPersonalChat(id: string): Promise<PersonalChat | undefined>;
  getPersonalChatBetween(customer1Id: string, customer2Id: string): Promise<PersonalChat | undefined>;
  createPersonalChat(data: InsertPersonalChat): Promise<PersonalChat>;
  
  // Personal Messages
  getPersonalMessages(chatId: string): Promise<PersonalMessage[]>;
  createPersonalMessage(data: InsertPersonalMessage): Promise<PersonalMessage>;
  markPersonalMessagesRead(chatId: string, readerId: string): Promise<void>;
  
  // Chat Media
  createChatMedia(data: InsertChatMedia): Promise<ChatMedia>;
  getChatMedia(id: string): Promise<ChatMedia | undefined>;
  getChatMediaBySession(sessionId: string): Promise<ChatMedia[]>;
  getChatMediaByMerchant(merchantId: string): Promise<ChatMedia[]>;
  getMediaByUploader(uploaderId: string, uploaderType: string): Promise<ChatMedia[]>;
  
  // Customer Stories
  getActiveCustomerStories(customerId: string): Promise<CustomerStory[]>;
  createCustomerStory(data: InsertCustomerStory): Promise<CustomerStory>;
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

  async getMerchantByUsername(username: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.username, username));
    return result[0];
  }

  async getMerchantByGoogleId(googleId: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.googleId, googleId));
    return result[0];
  }

  async getMerchantByGithubId(githubId: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.githubId, githubId));
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
      websiteUrl: data.websiteUrl || "",
      picName: data.picName || "",
      phone: data.phone || "",
      country: data.country || "",
      city: data.city || "",
      region: data.region || "",
      trialEndsAt: data.trialEndsAt,
      subscriptionStatus: data.subscriptionStatus || "trial",
      subscriptionPlanId: data.subscriptionPlanId || "starter",
      conversationsUsed: data.conversationsUsed || 0,
      isEmailVerified: data.isEmailVerified || false,
      emailVerifiedAt: data.emailVerifiedAt,
      googleId: data.googleId,
      githubId: data.githubId,
      profilePhotoUrl: data.profilePhotoUrl || "",
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

  async getSessionsByMerchant(merchantId: string, activeOnly: boolean = false): Promise<Session[]> {
    // If activeOnly is true, only return sessions from the last 60 minutes
    if (activeOnly) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return db.select().from(sessions)
        .where(and(
          eq(sessions.merchantId, merchantId),
          gte(sessions.lastActivity, oneHourAgo)
        ))
        .orderBy(desc(sessions.lastActivity));
    }
    
    // Default: return all sessions for historical viewing
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
      customerPhone: data.customerPhone || null,
      customerEmail: data.customerEmail || null,
      agentId: data.agentId || null,
      deviceFingerprint: data.deviceFingerprint || null,
      clientIp: data.clientIp || null,
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

  // Domain Registration methods
  async getDomainRegistration(domain: string): Promise<DomainRegistration | undefined> {
    const normalizedDomain = this.normalizeDomain(domain);
    const [result] = await db.select().from(domainRegistrations).where(eq(domainRegistrations.domain, normalizedDomain));
    return result;
  }

  async getDomainRegistrationsByMerchant(merchantId: string): Promise<DomainRegistration[]> {
    return db.select().from(domainRegistrations).where(eq(domainRegistrations.merchantId, merchantId));
  }

  async createDomainRegistration(data: InsertDomainRegistration): Promise<DomainRegistration> {
    const id = `dr_${randomBytes(8).toString("hex")}`;
    const normalizedDomain = this.normalizeDomain(data.domain);
    const [result] = await db.insert(domainRegistrations).values({
      ...data,
      id,
      domain: normalizedDomain,
    }).returning();
    return result;
  }

  async isDomainAvailable(domain: string): Promise<boolean> {
    const result = await this.checkDomainAvailability(domain);
    return result.available;
  }
  
  // Returns detailed availability info - domains remain protected even after trial expires
  // Users must subscribe to access their domain again, not free re-registration
  async checkDomainAvailability(domain: string): Promise<{ available: boolean; canReclaim: boolean; existingRegistrationId?: string; requiresSubscription: boolean }> {
    const existing = await this.getDomainRegistration(domain);
    if (!existing) {
      return { available: true, canReclaim: false, requiresSubscription: false };
    }
    
    // Domain is registered - check if user needs to subscribe to access it
    const merchant = await this.getMerchant(existing.merchantId);
    if (!merchant) {
      // Merchant account deleted - domain requires subscription to reclaim
      return { available: false, canReclaim: false, existingRegistrationId: existing.id, requiresSubscription: true };
    }
    
    // Check subscription status - all cases require subscription message
    const activeStatuses = ["active", "past_due"];
    
    if (activeStatuses.includes(merchant.subscriptionStatus || "")) {
      // Active subscription - domain not available
      return { available: false, canReclaim: false, requiresSubscription: false };
    }
    
    // Trial status
    if (merchant.subscriptionStatus === "trial") {
      if (merchant.trialEndsAt && new Date(merchant.trialEndsAt) < new Date()) {
        // Trial expired - must subscribe to use domain again
        return { available: false, canReclaim: false, existingRegistrationId: existing.id, requiresSubscription: true };
      }
      // Trial still active - domain not available
      return { available: false, canReclaim: false, requiresSubscription: false };
    }
    
    // Subscription cancelled or expired - must subscribe to use domain again
    return { available: false, canReclaim: false, existingRegistrationId: existing.id, requiresSubscription: true };
  }
  
  // Atomically reclaim and reassign domain registration using transaction
  async reclaimDomainRegistration(oldRegistrationId: string, newData: InsertDomainRegistration): Promise<DomainRegistration> {
    const id = `dr_${randomBytes(8).toString("hex")}`;
    const normalizedDomain = this.normalizeDomain(newData.domain);
    
    // Use transaction to ensure atomic delete + create
    const result = await db.transaction(async (tx) => {
      // Delete old registration
      await tx.delete(domainRegistrations).where(eq(domainRegistrations.id, oldRegistrationId));
      
      // Create new registration
      const [newReg] = await tx.insert(domainRegistrations).values({
        ...newData,
        id,
        domain: normalizedDomain,
      }).returning();
      
      return newReg;
    });
    
    return result;
  }
  
  async deleteDomainRegistration(id: string): Promise<void> {
    await db.delete(domainRegistrations).where(eq(domainRegistrations.id, id));
  }

  // Helper to normalize domain (remove protocol, www, trailing slashes)
  private normalizeDomain(domain: string): string {
    let normalized = domain.toLowerCase().trim();
    // Remove protocol
    normalized = normalized.replace(/^https?:\/\//, '');
    // Remove www.
    normalized = normalized.replace(/^www\./, '');
    // Remove trailing slashes and paths
    normalized = normalized.split('/')[0];
    // Remove port
    normalized = normalized.split(':')[0];
    return normalized;
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
    scheduledPlanId?: string | null;
    scheduledBillingInterval?: string | null;
    scheduledPlanActivatesAt?: Date | null;
    scheduledPlanTransactionId?: string | null;
    trialEndsAt?: Date;
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
      agentId: data.agentId || null,
      url: data.url,
      title: data.title || null,
      status: data.status || "pending",
      extractedContent: data.extractedContent || null,
      syncStatus: data.syncStatus || "idle",
      isActive: data.isActive ?? true,
      summarizedContent: data.summarizedContent || null,
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

  async getCrawledLink(id: string): Promise<CrawledLink | undefined> {
    const result = await db.select().from(crawledLinks)
      .where(eq(crawledLinks.id, id));
    return result[0];
  }

  async getActiveCrawledLinksForSync(): Promise<CrawledLink[]> {
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
    return db.select().from(crawledLinks)
      .where(
        and(
          eq(crawledLinks.isActive, true),
          eq(crawledLinks.status, "completed"),
          or(
            isNull(crawledLinks.lastSyncedAt),
            lt(crawledLinks.lastSyncedAt, sixtyMinutesAgo)
          )
        )
      );
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
      closingStatementMode: data.closingStatementMode || "manual",
      closingStatementAutoIncludeBusinessName: data.closingStatementAutoIncludeBusinessName ?? true,
      closingStatementAutoIncludeCustomerName: data.closingStatementAutoIncludeCustomerName ?? true,
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
      agentId: data.agentId || null,
      type: data.type,
      name: data.name,
      content: data.content || "",
      url: data.url || "",
      isActive: data.isActive ?? true,
      syncEnabled: data.syncEnabled ?? true,
      syncStatus: "idle",
      charCount: data.charCount || 0,
    }).returning();
    return result[0];
  }

  async getActiveSourcesForSync(): Promise<Source[]> {
    return db.select().from(sources)
      .where(and(
        eq(sources.isActive, true),
        eq(sources.syncEnabled, true),
      ));
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

  // Stored Files implementations (database-backed file storage)
  async storeFile(file: InsertStoredFile): Promise<StoredFile> {
    const result = await db.insert(storedFiles).values(file).returning();
    return result[0];
  }
  
  async getStoredFile(id: string): Promise<StoredFile | undefined> {
    const result = await db.select().from(storedFiles).where(eq(storedFiles.id, id));
    return result[0];
  }
  
  async deleteStoredFile(id: string): Promise<boolean> {
    const result = await db.delete(storedFiles).where(eq(storedFiles.id, id)).returning();
    return result.length > 0;
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

  // Product Crawl Sources
  async getProductCrawlSources(merchantId: string): Promise<ProductCrawlSource[]> {
    return db.select().from(productCrawlSources)
      .where(eq(productCrawlSources.merchantId, merchantId))
      .orderBy(desc(productCrawlSources.createdAt));
  }

  async getActiveProductCrawlSourcesForSync(): Promise<ProductCrawlSource[]> {
    return db.select().from(productCrawlSources)
      .where(and(
        eq(productCrawlSources.isActive, true),
        ne(productCrawlSources.crawlFrequency, "manual"),
      ));
  }

  async findCrawledProductByUrl(merchantId: string, productUrl: string): Promise<CrawledProduct | undefined> {
    const result = await db.select().from(crawledProducts)
      .where(and(
        eq(crawledProducts.merchantId, merchantId),
        eq(crawledProducts.productUrl, productUrl)
      ));
    return result[0];
  }

  async upsertCrawledProduct(product: InsertCrawledProduct): Promise<CrawledProduct> {
    const existing = await this.findCrawledProductByUrl(product.merchantId, product.productUrl);
    if (existing) {
      const result = await db.update(crawledProducts)
        .set({
          title: product.title,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
          brand: product.brand,
          availability: product.availability,
          rating: product.rating,
          reviewCount: product.reviewCount,
          crawledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(crawledProducts.id, existing.id))
        .returning();
      return result[0];
    } else {
      return this.createCrawledProduct(product);
    }
  }

  async getProductCrawlSource(id: string): Promise<ProductCrawlSource | undefined> {
    const result = await db.select().from(productCrawlSources)
      .where(eq(productCrawlSources.id, id));
    return result[0];
  }

  async createProductCrawlSource(source: InsertProductCrawlSource): Promise<ProductCrawlSource> {
    const id = generateId("pcs_");
    const result = await db.insert(productCrawlSources).values({ ...source, id }).returning();
    return result[0];
  }

  async updateProductCrawlSource(id: string, data: Partial<ProductCrawlSource>): Promise<ProductCrawlSource | undefined> {
    const result = await db.update(productCrawlSources)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productCrawlSources.id, id))
      .returning();
    return result[0];
  }

  async deleteProductCrawlSource(id: string): Promise<boolean> {
    await db.delete(productCrawlSources).where(eq(productCrawlSources.id, id));
    return true;
  }

  // Crawled Products
  async getCrawledProducts(merchantId: string, status?: string): Promise<CrawledProduct[]> {
    if (status) {
      return db.select().from(crawledProducts)
        .where(and(eq(crawledProducts.merchantId, merchantId), eq(crawledProducts.status, status)))
        .orderBy(desc(crawledProducts.crawledAt));
    }
    return db.select().from(crawledProducts)
      .where(eq(crawledProducts.merchantId, merchantId))
      .orderBy(desc(crawledProducts.crawledAt));
  }

  async getCrawledProductsBySource(sourceId: string, status?: string): Promise<CrawledProduct[]> {
    if (status) {
      return db.select().from(crawledProducts)
        .where(and(eq(crawledProducts.sourceId, sourceId), eq(crawledProducts.status, status)))
        .orderBy(desc(crawledProducts.crawledAt));
    }
    return db.select().from(crawledProducts)
      .where(eq(crawledProducts.sourceId, sourceId))
      .orderBy(desc(crawledProducts.crawledAt));
  }

  async getCrawledProduct(id: string): Promise<CrawledProduct | undefined> {
    const result = await db.select().from(crawledProducts)
      .where(eq(crawledProducts.id, id));
    return result[0];
  }

  async createCrawledProduct(product: InsertCrawledProduct): Promise<CrawledProduct> {
    const id = generateId("cp_");
    const result = await db.insert(crawledProducts).values({ ...product, id }).returning();
    return result[0];
  }

  async updateCrawledProduct(id: string, data: Partial<CrawledProduct>): Promise<CrawledProduct | undefined> {
    const result = await db.update(crawledProducts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(crawledProducts.id, id))
      .returning();
    return result[0];
  }

  async deleteCrawledProduct(id: string): Promise<boolean> {
    await db.delete(crawledProducts).where(eq(crawledProducts.id, id));
    return true;
  }

  async deleteCrawledProductsBySource(sourceId: string): Promise<boolean> {
    await db.delete(crawledProducts).where(eq(crawledProducts.sourceId, sourceId));
    return true;
  }

  async approveCrawledProduct(id: string, approvedBy: string): Promise<CrawledProduct | undefined> {
    const result = await db.update(crawledProducts)
      .set({ status: "approved", approvedAt: new Date(), approvedBy, updatedAt: new Date() })
      .where(eq(crawledProducts.id, id))
      .returning();
    return result[0];
  }

  async rejectCrawledProduct(id: string): Promise<CrawledProduct | undefined> {
    const result = await db.update(crawledProducts)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(crawledProducts.id, id))
      .returning();
    return result[0];
  }

  async getApprovedCrawledProducts(merchantId: string, agentId?: string): Promise<CrawledProduct[]> {
    if (agentId) {
      return db.select().from(crawledProducts)
        .where(and(
          eq(crawledProducts.merchantId, merchantId),
          eq(crawledProducts.status, "approved"),
          eq(crawledProducts.isActive, true),
          eq(crawledProducts.agentId, agentId)
        ))
        .orderBy(crawledProducts.title);
    }
    return db.select().from(crawledProducts)
      .where(and(
        eq(crawledProducts.merchantId, merchantId),
        eq(crawledProducts.status, "approved"),
        eq(crawledProducts.isActive, true)
      ))
      .orderBy(crawledProducts.title);
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

  // Email Verification Tokens
  async createEmailVerificationToken(data: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const id = generateId("evt_");
    const result = await db.insert(emailVerificationTokens).values({ ...data, id }).returning();
    return result[0];
  }

  async getEmailVerificationTokenByToken(token: string): Promise<EmailVerificationToken | undefined> {
    const result = await db.select().from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return result[0];
  }

  async markEmailVerificationTokenUsed(id: string): Promise<void> {
    await db.update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, id));
  }

  // Password Reset Tokens
  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const id = generateId("prt_");
    const result = await db.insert(passwordResetTokens).values({ ...data, id }).returning();
    return result[0];
  }

  async getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return result[0];
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  // Promotions
  async getPromotions(): Promise<Promotion[]> {
    return db.select().from(promotions).orderBy(desc(promotions.createdAt));
  }

  async getPromotion(id: string): Promise<Promotion | undefined> {
    const result = await db.select().from(promotions).where(eq(promotions.id, id));
    return result[0];
  }

  async getPromotionByCode(code: string): Promise<Promotion | undefined> {
    const result = await db.select().from(promotions)
      .where(eq(promotions.code, code.toUpperCase()));
    return result[0];
  }

  async getActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    return db.select().from(promotions)
      .where(and(
        eq(promotions.isActive, true),
        gte(promotions.endDate, now)
      ))
      .orderBy(desc(promotions.discountPercent));
  }

  async getPublicActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    return db.select().from(promotions)
      .where(and(
        eq(promotions.isActive, true),
        eq(promotions.isPublic, true),
        gte(promotions.endDate, now)
      ))
      .orderBy(desc(promotions.discountPercent));
  }

  async createPromotion(data: InsertPromotion): Promise<Promotion> {
    const id = generateId("promo_");
    const result = await db.insert(promotions).values({
      ...data,
      id,
      code: data.code.toUpperCase(),
    }).returning();
    return result[0];
  }

  async updatePromotion(id: string, data: Partial<Promotion>): Promise<Promotion | undefined> {
    const updateData = { ...data, updatedAt: new Date() };
    if (data.code) {
      updateData.code = data.code.toUpperCase();
    }
    const result = await db.update(promotions)
      .set(updateData)
      .where(eq(promotions.id, id))
      .returning();
    return result[0];
  }

  async deletePromotion(id: string): Promise<boolean> {
    const result = await db.delete(promotions).where(eq(promotions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementPromotionUsage(id: string): Promise<boolean> {
    const result = await db.update(promotions)
      .set({ usedCount: sql`${promotions.usedCount} + 1` })
      .where(eq(promotions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Promotion Usage
  async getPromotionUsage(promotionId: string): Promise<PromotionUsage[]> {
    return db.select().from(promotionUsage)
      .where(eq(promotionUsage.promotionId, promotionId))
      .orderBy(desc(promotionUsage.usedAt));
  }

  async createPromotionUsage(data: InsertPromotionUsage): Promise<PromotionUsage> {
    const id = generateId("pu_");
    const result = await db.insert(promotionUsage).values({ ...data, id }).returning();
    return result[0];
  }

  // ============ Widget Sites (Chatvice Top Up v2) ============
  
  async getWidgetSite(id: string): Promise<WidgetSite | undefined> {
    const result = await db.select().from(widgetSites).where(eq(widgetSites.id, id));
    return result[0];
  }

  async getWidgetSiteBySiteKey(siteKey: string): Promise<WidgetSite | undefined> {
    const result = await db.select().from(widgetSites).where(eq(widgetSites.siteKey, siteKey));
    return result[0];
  }

  async getWidgetSitesByMerchant(merchantId: string): Promise<WidgetSite[]> {
    return db.select().from(widgetSites)
      .where(eq(widgetSites.merchantId, merchantId))
      .orderBy(desc(widgetSites.createdAt));
  }

  async createWidgetSite(data: InsertWidgetSite): Promise<WidgetSite> {
    const id = generateId("site_");
    const result = await db.insert(widgetSites).values({ ...data, id }).returning();
    return result[0];
  }

  async updateWidgetSite(id: string, data: Partial<WidgetSite>): Promise<WidgetSite | undefined> {
    const result = await db.update(widgetSites)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(widgetSites.id, id))
      .returning();
    return result[0];
  }

  async deleteWidgetSite(id: string): Promise<boolean> {
    const result = await db.delete(widgetSites).where(eq(widgetSites.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ============ Site Domains ============
  
  async getSiteDomains(siteId: string): Promise<SiteDomain[]> {
    return db.select().from(siteDomains)
      .where(eq(siteDomains.siteId, siteId))
      .orderBy(desc(siteDomains.lastSeenAt));
  }

  async getCurrentDomain(siteId: string): Promise<SiteDomain | undefined> {
    const result = await db.select().from(siteDomains)
      .where(and(
        eq(siteDomains.siteId, siteId),
        eq(siteDomains.isCurrent, true)
      ));
    return result[0];
  }

  async upsertSiteDomain(siteId: string, domain: string): Promise<SiteDomain> {
    // Check if domain already exists for this site
    const existing = await db.select().from(siteDomains)
      .where(and(
        eq(siteDomains.siteId, siteId),
        eq(siteDomains.domain, domain)
      ));
    
    if (existing[0]) {
      // Update existing domain - mark as current
      await db.update(siteDomains)
        .set({ isCurrent: false })
        .where(eq(siteDomains.siteId, siteId));
      
      const result = await db.update(siteDomains)
        .set({ lastSeenAt: new Date(), isCurrent: true })
        .where(eq(siteDomains.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      // Insert new domain - mark as current, others as not current
      await db.update(siteDomains)
        .set({ isCurrent: false })
        .where(eq(siteDomains.siteId, siteId));
      
      const id = generateId("dom_");
      const result = await db.insert(siteDomains).values({
        id,
        siteId,
        domain,
        isCurrent: true,
      }).returning();
      return result[0];
    }
  }

  // ============ Coin Orders ============
  
  async getCoinOrder(id: string): Promise<CoinOrder | undefined> {
    const result = await db.select().from(coinOrders).where(eq(coinOrders.id, id));
    return result[0];
  }

  async getCoinOrderByOrderId(orderId: string): Promise<CoinOrder | undefined> {
    const result = await db.select().from(coinOrders).where(eq(coinOrders.orderId, orderId));
    return result[0];
  }

  async getCoinOrdersBySite(siteId: string): Promise<CoinOrder[]> {
    return db.select().from(coinOrders)
      .where(eq(coinOrders.siteId, siteId))
      .orderBy(desc(coinOrders.createdAt));
  }

  async getCoinOrdersByMerchant(merchantId: string): Promise<CoinOrder[]> {
    return db.select().from(coinOrders)
      .where(eq(coinOrders.merchantId, merchantId))
      .orderBy(desc(coinOrders.createdAt));
  }

  async createCoinOrder(data: InsertCoinOrder): Promise<CoinOrder> {
    const id = generateId("co_");
    const result = await db.insert(coinOrders).values({ ...data, id }).returning();
    return result[0];
  }

  async updateCoinOrder(id: string, data: Partial<CoinOrder>): Promise<CoinOrder | undefined> {
    const result = await db.update(coinOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(coinOrders.id, id))
      .returning();
    return result[0];
  }

  // ============ Topup Nominals ============
  
  async getTopupNominals(siteId: string): Promise<TopupNominal[]> {
    return db.select().from(topupNominals)
      .where(and(
        eq(topupNominals.siteId, siteId),
        eq(topupNominals.isActive, true)
      ))
      .orderBy(topupNominals.sortOrder);
  }

  async createTopupNominal(data: InsertTopupNominal): Promise<TopupNominal> {
    const id = generateId("nom_");
    const result = await db.insert(topupNominals).values({ ...data, id }).returning();
    return result[0];
  }

  async updateTopupNominal(id: string, data: Partial<TopupNominal>): Promise<TopupNominal | undefined> {
    const result = await db.update(topupNominals)
      .set(data)
      .where(eq(topupNominals.id, id))
      .returning();
    return result[0];
  }

  async deleteTopupNominal(id: string): Promise<boolean> {
    const result = await db.delete(topupNominals).where(eq(topupNominals.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ============ Merchant Domains ============
  
  async getMerchantDomains(merchantId: string): Promise<MerchantDomain[]> {
    return db.select().from(merchantDomains)
      .where(eq(merchantDomains.merchantId, merchantId))
      .orderBy(desc(merchantDomains.createdAt));
  }

  async getMerchantDomain(id: string): Promise<MerchantDomain | undefined> {
    const result = await db.select().from(merchantDomains).where(eq(merchantDomains.id, id));
    return result[0];
  }

  async getMerchantDomainByDomain(merchantId: string, domain: string): Promise<MerchantDomain | undefined> {
    const result = await db.select().from(merchantDomains)
      .where(and(
        eq(merchantDomains.merchantId, merchantId),
        eq(merchantDomains.domain, domain)
      ));
    return result[0];
  }

  async createMerchantDomain(data: InsertMerchantDomain): Promise<MerchantDomain> {
    const id = generateId("dom_");
    const result = await db.insert(merchantDomains).values({ 
      ...data, 
      id,
      isValidated: false,
    }).returning();
    return result[0];
  }

  async updateMerchantDomain(id: string, data: Partial<MerchantDomain>): Promise<MerchantDomain | undefined> {
    const result = await db.update(merchantDomains)
      .set(data)
      .where(eq(merchantDomains.id, id))
      .returning();
    return result[0];
  }

  async deleteMerchantDomain(id: string): Promise<boolean> {
    const result = await db.delete(merchantDomains).where(eq(merchantDomains.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async countMerchantDomains(merchantId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(merchantDomains)
      .where(eq(merchantDomains.merchantId, merchantId));
    return result[0]?.count ?? 0;
  }

  // ============ Payment Gateways ============
  
  async getPaymentGateways(): Promise<PaymentGateway[]> {
    return db.select().from(paymentGateways).orderBy(paymentGateways.sortOrder);
  }

  async getPaymentGateway(id: string): Promise<PaymentGateway | undefined> {
    const result = await db.select().from(paymentGateways).where(eq(paymentGateways.id, id));
    return result[0];
  }

  async getDefaultPaymentGateway(): Promise<PaymentGateway | undefined> {
    const result = await db.select().from(paymentGateways)
      .where(and(eq(paymentGateways.isDefault, true), eq(paymentGateways.isActive, true)));
    return result[0];
  }

  async getActivePaymentGateways(): Promise<PaymentGateway[]> {
    return db.select().from(paymentGateways)
      .where(eq(paymentGateways.isActive, true))
      .orderBy(paymentGateways.sortOrder);
  }

  async createPaymentGateway(data: InsertPaymentGateway): Promise<PaymentGateway> {
    const id = generateId("pg_");
    const result = await db.insert(paymentGateways).values({ 
      ...data, 
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updatePaymentGateway(id: string, data: Partial<PaymentGateway>): Promise<PaymentGateway | undefined> {
    const result = await db.update(paymentGateways)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentGateways.id, id))
      .returning();
    return result[0];
  }

  async deletePaymentGateway(id: string): Promise<boolean> {
    const result = await db.delete(paymentGateways).where(eq(paymentGateways.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async setDefaultPaymentGateway(id: string): Promise<boolean> {
    // First, unset all defaults
    await db.update(paymentGateways).set({ isDefault: false });
    // Then set the new default
    const result = await db.update(paymentGateways)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(paymentGateways.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Payment Transactions
  async getPaymentTransaction(id: string): Promise<PaymentTransaction | undefined> {
    const result = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id));
    return result[0];
  }

  async getPaymentTransactionByExternalId(externalId: string): Promise<PaymentTransaction | undefined> {
    const result = await db.select().from(paymentTransactions).where(eq(paymentTransactions.externalId, externalId));
    return result[0];
  }

  async getPaymentTransactionsByMerchant(merchantId: string): Promise<PaymentTransaction[]> {
    return db.select().from(paymentTransactions)
      .where(eq(paymentTransactions.merchantId, merchantId))
      .orderBy(desc(paymentTransactions.createdAt));
  }

  async getAllPaymentTransactions(limit: number = 100): Promise<PaymentTransaction[]> {
    return db.select().from(paymentTransactions)
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(limit);
  }

  async createPaymentTransaction(data: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const id = generateId("txn_");
    const invoiceNumber = await this.generateInvoiceNumber();
    const result = await db.insert(paymentTransactions).values({
      ...data,
      id,
      invoiceNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updatePaymentTransaction(id: string, data: Partial<PaymentTransaction>): Promise<PaymentTransaction | undefined> {
    const result = await db.update(paymentTransactions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentTransactions.id, id))
      .returning();
    return result[0];
  }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    // Get count of transactions this month
    const startOfMonth = new Date(year, new Date().getMonth(), 1);
    const result = await db.select({ count: count() })
      .from(paymentTransactions)
      .where(gte(paymentTransactions.createdAt, startOfMonth));
    const countNum = result[0]?.count || 0;
    const sequence = String(countNum + 1).padStart(5, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  // Admin Notifications
  async getAdminNotifications(limit: number = 50): Promise<AdminNotification[]> {
    return db.select().from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit);
  }

  async getUnreadAdminNotifications(): Promise<AdminNotification[]> {
    return db.select().from(adminNotifications)
      .where(eq(adminNotifications.isRead, false))
      .orderBy(desc(adminNotifications.createdAt));
  }

  async createAdminNotification(data: InsertAdminNotification): Promise<AdminNotification> {
    const id = generateId("notif_");
    const result = await db.insert(adminNotifications).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async markAdminNotificationRead(id: string): Promise<boolean> {
    const result = await db.update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async markAllAdminNotificationsRead(): Promise<boolean> {
    await db.update(adminNotifications).set({ isRead: true });
    return true;
  }
  
  // Chat Security Settings
  async getChatSecuritySettings(merchantId: string): Promise<ChatSecuritySettings | undefined> {
    const result = await db.select().from(chatSecuritySettings)
      .where(eq(chatSecuritySettings.merchantId, merchantId));
    return result[0];
  }
  
  async upsertChatSecuritySettings(merchantId: string, data: Partial<InsertChatSecuritySettings>): Promise<ChatSecuritySettings> {
    const existing = await this.getChatSecuritySettings(merchantId);
    if (existing) {
      const result = await db.update(chatSecuritySettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(chatSecuritySettings.merchantId, merchantId))
        .returning();
      return result[0];
    } else {
      const id = generateId("css_");
      const result = await db.insert(chatSecuritySettings).values({
        id,
        merchantId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result[0];
    }
  }
  
  // Chat Security Alerts
  async getChatSecurityAlerts(merchantId: string, status?: string, limit: number = 50): Promise<ChatSecurityAlert[]> {
    if (status) {
      return db.select().from(chatSecurityAlerts)
        .where(and(
          eq(chatSecurityAlerts.merchantId, merchantId),
          eq(chatSecurityAlerts.status, status)
        ))
        .orderBy(desc(chatSecurityAlerts.createdAt))
        .limit(limit);
    }
    return db.select().from(chatSecurityAlerts)
      .where(eq(chatSecurityAlerts.merchantId, merchantId))
      .orderBy(desc(chatSecurityAlerts.createdAt))
      .limit(limit);
  }
  
  async getChatSecurityAlert(id: string): Promise<ChatSecurityAlert | undefined> {
    const result = await db.select().from(chatSecurityAlerts)
      .where(eq(chatSecurityAlerts.id, id));
    return result[0];
  }
  
  async createChatSecurityAlert(data: InsertChatSecurityAlert): Promise<ChatSecurityAlert> {
    const id = generateId("csa_");
    const result = await db.insert(chatSecurityAlerts).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateChatSecurityAlert(id: string, data: Partial<ChatSecurityAlert>): Promise<ChatSecurityAlert | undefined> {
    const result = await db.update(chatSecurityAlerts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chatSecurityAlerts.id, id))
      .returning();
    return result[0];
  }
  
  async getChatSecurityAlertStats(merchantId: string): Promise<{ total: number; new: number; reviewed: number; dismissed: number; escalated: number }> {
    const alerts = await db.select().from(chatSecurityAlerts)
      .where(eq(chatSecurityAlerts.merchantId, merchantId));
    
    return {
      total: alerts.length,
      new: alerts.filter(a => a.status === 'new').length,
      reviewed: alerts.filter(a => a.status === 'reviewed').length,
      dismissed: alerts.filter(a => a.status === 'dismissed').length,
      escalated: alerts.filter(a => a.status === 'escalated').length,
    };
  }
  
  // KnowledgeBase Articles
  async getKnowledgebaseArticles(merchantId: string, status?: string): Promise<KnowledgebaseArticle[]> {
    if (status) {
      return db.select().from(knowledgebaseArticles)
        .where(and(
          eq(knowledgebaseArticles.merchantId, merchantId),
          eq(knowledgebaseArticles.status, status)
        ))
        .orderBy(desc(knowledgebaseArticles.createdAt));
    }
    return db.select().from(knowledgebaseArticles)
      .where(eq(knowledgebaseArticles.merchantId, merchantId))
      .orderBy(desc(knowledgebaseArticles.createdAt));
  }
  
  async getKnowledgebaseArticle(id: string): Promise<KnowledgebaseArticle | undefined> {
    const result = await db.select().from(knowledgebaseArticles)
      .where(eq(knowledgebaseArticles.id, id));
    return result[0];
  }
  
  async createKnowledgebaseArticle(data: InsertKnowledgebaseArticle): Promise<KnowledgebaseArticle> {
    const id = generateId("kba_");
    const result = await db.insert(knowledgebaseArticles).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateKnowledgebaseArticle(id: string, data: Partial<KnowledgebaseArticle>): Promise<KnowledgebaseArticle | undefined> {
    const result = await db.update(knowledgebaseArticles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgebaseArticles.id, id))
      .returning();
    return result[0];
  }
  
  async deleteKnowledgebaseArticle(id: string): Promise<boolean> {
    const result = await db.delete(knowledgebaseArticles)
      .where(eq(knowledgebaseArticles.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // KnowledgeBase Templates
  async getKnowledgebaseTemplates(businessType?: string): Promise<KnowledgebaseTemplate[]> {
    if (businessType) {
      return db.select().from(knowledgebaseTemplates)
        .where(and(
          eq(knowledgebaseTemplates.businessType, businessType),
          eq(knowledgebaseTemplates.isActive, true)
        ))
        .orderBy(knowledgebaseTemplates.sortOrder);
    }
    return db.select().from(knowledgebaseTemplates)
      .where(eq(knowledgebaseTemplates.isActive, true))
      .orderBy(knowledgebaseTemplates.sortOrder);
  }
  
  async getKnowledgebaseTemplate(id: string): Promise<KnowledgebaseTemplate | undefined> {
    const result = await db.select().from(knowledgebaseTemplates)
      .where(eq(knowledgebaseTemplates.id, id));
    return result[0];
  }
  
  async getKnowledgebaseTemplateByCategory(businessType: string, category: string): Promise<KnowledgebaseTemplate | undefined> {
    const result = await db.select().from(knowledgebaseTemplates)
      .where(and(
        eq(knowledgebaseTemplates.businessType, businessType),
        eq(knowledgebaseTemplates.category, category)
      ));
    return result[0];
  }
  
  async createKnowledgebaseTemplate(data: InsertKnowledgebaseTemplate): Promise<KnowledgebaseTemplate> {
    const id = generateId("kbt_");
    const result = await db.insert(knowledgebaseTemplates).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateKnowledgebaseTemplate(id: string, data: Partial<KnowledgebaseTemplate>): Promise<KnowledgebaseTemplate | undefined> {
    const result = await db.update(knowledgebaseTemplates)
      .set(data)
      .where(eq(knowledgebaseTemplates.id, id))
      .returning();
    return result[0];
  }
  
  async deleteKnowledgebaseTemplate(id: string): Promise<boolean> {
    const result = await db.delete(knowledgebaseTemplates)
      .where(eq(knowledgebaseTemplates.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Custom Plan Invoices
  async getCustomPlanInvoices(merchantId?: string): Promise<CustomPlanInvoice[]> {
    if (merchantId) {
      return db.select().from(customPlanInvoices)
        .where(eq(customPlanInvoices.merchantId, merchantId))
        .orderBy(desc(customPlanInvoices.createdAt));
    }
    return db.select().from(customPlanInvoices)
      .orderBy(desc(customPlanInvoices.createdAt));
  }
  
  async getCustomPlanInvoice(id: string): Promise<CustomPlanInvoice | undefined> {
    const result = await db.select().from(customPlanInvoices)
      .where(eq(customPlanInvoices.id, id));
    return result[0];
  }
  
  async getCustomPlanInvoiceByNumber(invoiceNumber: string): Promise<CustomPlanInvoice | undefined> {
    const result = await db.select().from(customPlanInvoices)
      .where(eq(customPlanInvoices.invoiceNumber, invoiceNumber));
    return result[0];
  }
  
  async getPendingCustomPlanInvoices(merchantId: string): Promise<CustomPlanInvoice[]> {
    return db.select().from(customPlanInvoices)
      .where(and(
        eq(customPlanInvoices.merchantId, merchantId),
        eq(customPlanInvoices.status, "pending")
      ))
      .orderBy(desc(customPlanInvoices.createdAt));
  }
  
  async createCustomPlanInvoice(data: InsertCustomPlanInvoice): Promise<CustomPlanInvoice> {
    const id = generateId("cpi_");
    const result = await db.insert(customPlanInvoices).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateCustomPlanInvoice(id: string, data: Partial<CustomPlanInvoice>): Promise<CustomPlanInvoice | undefined> {
    const result = await db.update(customPlanInvoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customPlanInvoices.id, id))
      .returning();
    return result[0];
  }
  
  async generateCustomInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const prefix = `CPI-${year}${month}`;
    
    const result = await db.select({ count: count() }).from(customPlanInvoices)
      .where(sql`${customPlanInvoices.invoiceNumber} LIKE ${prefix + "%"}`);
    
    const nextNum = (result[0]?.count || 0) + 1;
    return `${prefix}-${String(nextNum).padStart(4, "0")}`;
  }
  
  // Custom Plan Requests
  async getCustomPlanRequests(status?: string): Promise<CustomPlanRequest[]> {
    if (status) {
      return db.select().from(customPlanRequests)
        .where(eq(customPlanRequests.status, status))
        .orderBy(desc(customPlanRequests.createdAt));
    }
    return db.select().from(customPlanRequests)
      .orderBy(desc(customPlanRequests.createdAt));
  }
  
  async getCustomPlanRequestsByMerchant(merchantId: string): Promise<CustomPlanRequest[]> {
    return db.select().from(customPlanRequests)
      .where(eq(customPlanRequests.merchantId, merchantId))
      .orderBy(desc(customPlanRequests.createdAt));
  }
  
  async getCustomPlanRequest(id: string): Promise<CustomPlanRequest | undefined> {
    const result = await db.select().from(customPlanRequests)
      .where(eq(customPlanRequests.id, id));
    return result[0];
  }
  
  async createCustomPlanRequest(data: InsertCustomPlanRequest): Promise<CustomPlanRequest> {
    const id = generateId("cpr_");
    const result = await db.insert(customPlanRequests).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateCustomPlanRequest(id: string, data: Partial<CustomPlanRequest>): Promise<CustomPlanRequest | undefined> {
    const result = await db.update(customPlanRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customPlanRequests.id, id))
      .returning();
    return result[0];
  }
  
  // Merchant Notifications
  async getMerchantNotifications(merchantId: string, limit?: number): Promise<MerchantNotification[]> {
    const query = db.select().from(merchantNotifications)
      .where(eq(merchantNotifications.merchantId, merchantId))
      .orderBy(desc(merchantNotifications.createdAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }
  
  async getUnreadMerchantNotifications(merchantId: string): Promise<MerchantNotification[]> {
    return db.select().from(merchantNotifications)
      .where(and(
        eq(merchantNotifications.merchantId, merchantId),
        eq(merchantNotifications.isRead, false)
      ))
      .orderBy(desc(merchantNotifications.createdAt));
  }
  
  async getMerchantNotification(id: string): Promise<MerchantNotification | undefined> {
    const result = await db.select().from(merchantNotifications)
      .where(eq(merchantNotifications.id, id));
    return result[0];
  }
  
  async createMerchantNotification(data: InsertMerchantNotification): Promise<MerchantNotification> {
    const id = generateId("mn_");
    const result = await db.insert(merchantNotifications).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async markNotificationAsRead(id: string): Promise<MerchantNotification | undefined> {
    const result = await db.update(merchantNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(merchantNotifications.id, id))
      .returning();
    return result[0];
  }
  
  async markAllNotificationsAsRead(merchantId: string): Promise<void> {
    await db.update(merchantNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(merchantNotifications.merchantId, merchantId),
        eq(merchantNotifications.isRead, false)
      ));
  }
  
  async getUnreadNotificationCount(merchantId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(merchantNotifications)
      .where(and(
        eq(merchantNotifications.merchantId, merchantId),
        eq(merchantNotifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  // ============ Affiliate Program ============
  
  async getAffiliateByMerchantId(merchantId: string): Promise<Affiliate | undefined> {
    const result = await db.select().from(affiliates)
      .where(eq(affiliates.merchantId, merchantId));
    return result[0];
  }
  
  async getAffiliateByCode(code: string): Promise<Affiliate | undefined> {
    const result = await db.select().from(affiliates)
      .where(eq(affiliates.affiliateCode, code));
    return result[0];
  }
  
  async getAffiliate(id: string): Promise<Affiliate | undefined> {
    const result = await db.select().from(affiliates)
      .where(eq(affiliates.id, id));
    return result[0];
  }
  
  async getAllAffiliates(): Promise<Affiliate[]> {
    return db.select().from(affiliates)
      .orderBy(desc(affiliates.createdAt));
  }
  
  async getActiveAffiliates(): Promise<Affiliate[]> {
    return db.select().from(affiliates)
      .where(eq(affiliates.status, "active"))
      .orderBy(desc(affiliates.createdAt));
  }
  
  async createAffiliate(data: InsertAffiliate): Promise<Affiliate> {
    const id = generateId("aff_");
    const result = await db.insert(affiliates).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateAffiliate(id: string, data: Partial<Affiliate>): Promise<Affiliate | undefined> {
    const result = await db.update(affiliates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(affiliates.id, id))
      .returning();
    return result[0];
  }
  
  // Affiliate Referrals
  async createAffiliateReferral(data: InsertAffiliateReferral): Promise<AffiliateReferral> {
    const id = generateId("ref_");
    const result = await db.insert(affiliateReferrals).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async getAffiliateReferrals(affiliateId: string): Promise<AffiliateReferral[]> {
    return db.select().from(affiliateReferrals)
      .where(eq(affiliateReferrals.affiliateId, affiliateId))
      .orderBy(desc(affiliateReferrals.createdAt));
  }
  
  async getReferralByMerchant(merchantId: string): Promise<AffiliateReferral | undefined> {
    const result = await db.select().from(affiliateReferrals)
      .where(eq(affiliateReferrals.referredMerchantId, merchantId));
    return result[0];
  }
  
  async updateAffiliateReferral(id: string, data: Partial<AffiliateReferral>): Promise<AffiliateReferral | undefined> {
    const result = await db.update(affiliateReferrals)
      .set(data)
      .where(eq(affiliateReferrals.id, id))
      .returning();
    return result[0];
  }
  
  // Affiliate Commissions
  async createAffiliateCommission(data: InsertAffiliateCommission): Promise<AffiliateCommission> {
    const id = generateId("com_");
    const result = await db.insert(affiliateCommissions).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async getAffiliateCommissions(affiliateId: string): Promise<AffiliateCommission[]> {
    return db.select().from(affiliateCommissions)
      .where(eq(affiliateCommissions.affiliateId, affiliateId))
      .orderBy(desc(affiliateCommissions.createdAt));
  }
  
  async getAllCommissions(): Promise<AffiliateCommission[]> {
    return db.select().from(affiliateCommissions)
      .orderBy(desc(affiliateCommissions.createdAt));
  }
  
  async updateAffiliateCommission(id: string, data: Partial<AffiliateCommission>): Promise<AffiliateCommission | undefined> {
    const result = await db.update(affiliateCommissions)
      .set(data)
      .where(eq(affiliateCommissions.id, id))
      .returning();
    return result[0];
  }
  
  // Affiliate Payouts
  async createAffiliatePayout(data: InsertAffiliatePayout): Promise<AffiliatePayout> {
    const id = generateId("pay_");
    const result = await db.insert(affiliatePayouts).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async getAffiliatePayouts(affiliateId: string): Promise<AffiliatePayout[]> {
    return db.select().from(affiliatePayouts)
      .where(eq(affiliatePayouts.affiliateId, affiliateId))
      .orderBy(desc(affiliatePayouts.createdAt));
  }
  
  async getAllPayouts(): Promise<AffiliatePayout[]> {
    return db.select().from(affiliatePayouts)
      .orderBy(desc(affiliatePayouts.createdAt));
  }
  
  async updateAffiliatePayout(id: string, data: Partial<AffiliatePayout>): Promise<AffiliatePayout | undefined> {
    const result = await db.update(affiliatePayouts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(affiliatePayouts.id, id))
      .returning();
    return result[0];
  }
  
  // Affiliate Statistics
  async getAffiliateStats(): Promise<{ totalAffiliates: number; activeAffiliates: number; totalReferrals: number; totalCommissions: number; pendingPayouts: number }> {
    const [totalAffiliates] = await db.select({ count: count() }).from(affiliates);
    const [activeAffiliates] = await db.select({ count: count() }).from(affiliates).where(eq(affiliates.status, "active"));
    const [totalReferrals] = await db.select({ count: count() }).from(affiliateReferrals);
    const [totalCommissions] = await db.select({ count: count() }).from(affiliateCommissions);
    const [pendingPayouts] = await db.select({ count: count() }).from(affiliatePayouts).where(eq(affiliatePayouts.status, "pending"));
    
    return {
      totalAffiliates: totalAffiliates?.count || 0,
      activeAffiliates: activeAffiliates?.count || 0,
      totalReferrals: totalReferrals?.count || 0,
      totalCommissions: totalCommissions?.count || 0,
      pendingPayouts: pendingPayouts?.count || 0,
    };
  }
  
  // Affiliate Payment Methods
  async getAffiliatePaymentMethods(affiliateId: string): Promise<AffiliatePaymentMethod[]> {
    return db.select().from(affiliatePaymentMethods)
      .where(eq(affiliatePaymentMethods.affiliateId, affiliateId))
      .orderBy(desc(affiliatePaymentMethods.createdAt));
  }
  
  async getAffiliatePaymentMethod(id: string): Promise<AffiliatePaymentMethod | undefined> {
    const result = await db.select().from(affiliatePaymentMethods)
      .where(eq(affiliatePaymentMethods.id, id));
    return result[0];
  }
  
  async createAffiliatePaymentMethod(data: InsertAffiliatePaymentMethod): Promise<AffiliatePaymentMethod> {
    const id = generateId("apm_");
    // If this is set as default, unset other defaults for this affiliate
    if (data.isDefault) {
      await db.update(affiliatePaymentMethods)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(affiliatePaymentMethods.affiliateId, data.affiliateId));
    }
    const result = await db.insert(affiliatePaymentMethods).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateAffiliatePaymentMethod(id: string, data: Partial<AffiliatePaymentMethod>): Promise<AffiliatePaymentMethod | undefined> {
    // If setting as default, unset other defaults for this affiliate
    if (data.isDefault) {
      const method = await this.getAffiliatePaymentMethod(id);
      if (method) {
        await db.update(affiliatePaymentMethods)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(
            eq(affiliatePaymentMethods.affiliateId, method.affiliateId),
            ne(affiliatePaymentMethods.id, id)
          ));
      }
    }
    const result = await db.update(affiliatePaymentMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(affiliatePaymentMethods.id, id))
      .returning();
    return result[0];
  }
  
  async deleteAffiliatePaymentMethod(id: string): Promise<boolean> {
    const result = await db.delete(affiliatePaymentMethods)
      .where(eq(affiliatePaymentMethods.id, id))
      .returning();
    return result.length > 0;
  }
  
  // Affiliate Withdrawal Requests
  async getAffiliateWithdrawalRequests(affiliateId: string): Promise<AffiliateWithdrawalRequest[]> {
    return db.select().from(affiliateWithdrawalRequests)
      .where(eq(affiliateWithdrawalRequests.affiliateId, affiliateId))
      .orderBy(desc(affiliateWithdrawalRequests.createdAt));
  }
  
  async getAffiliateWithdrawalRequest(id: string): Promise<AffiliateWithdrawalRequest | undefined> {
    const result = await db.select().from(affiliateWithdrawalRequests)
      .where(eq(affiliateWithdrawalRequests.id, id));
    return result[0];
  }
  
  async getAllWithdrawalRequests(status?: string): Promise<AffiliateWithdrawalRequest[]> {
    if (status) {
      return db.select().from(affiliateWithdrawalRequests)
        .where(eq(affiliateWithdrawalRequests.status, status))
        .orderBy(desc(affiliateWithdrawalRequests.createdAt));
    }
    return db.select().from(affiliateWithdrawalRequests)
      .orderBy(desc(affiliateWithdrawalRequests.createdAt));
  }
  
  async getPendingWithdrawalRequests(): Promise<AffiliateWithdrawalRequest[]> {
    return db.select().from(affiliateWithdrawalRequests)
      .where(eq(affiliateWithdrawalRequests.status, "pending"))
      .orderBy(desc(affiliateWithdrawalRequests.createdAt));
  }
  
  async createAffiliateWithdrawalRequest(data: InsertAffiliateWithdrawalRequest): Promise<AffiliateWithdrawalRequest> {
    const id = generateId("wr_");
    const result = await db.insert(affiliateWithdrawalRequests).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateAffiliateWithdrawalRequest(id: string, data: Partial<AffiliateWithdrawalRequest>): Promise<AffiliateWithdrawalRequest | undefined> {
    const result = await db.update(affiliateWithdrawalRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(affiliateWithdrawalRequests.id, id))
      .returning();
    return result[0];
  }
  
  async getWithdrawalRequestStats(): Promise<{ pending: number; approved: number; rejected: number; completed: number; totalAmount: number }> {
    const [pending] = await db.select({ count: count() }).from(affiliateWithdrawalRequests).where(eq(affiliateWithdrawalRequests.status, "pending"));
    const [approved] = await db.select({ count: count() }).from(affiliateWithdrawalRequests).where(eq(affiliateWithdrawalRequests.status, "approved"));
    const [rejected] = await db.select({ count: count() }).from(affiliateWithdrawalRequests).where(eq(affiliateWithdrawalRequests.status, "rejected"));
    const [completed] = await db.select({ count: count() }).from(affiliateWithdrawalRequests).where(eq(affiliateWithdrawalRequests.status, "completed"));
    const pendingRequests = await this.getPendingWithdrawalRequests();
    const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
    
    return {
      pending: pending?.count || 0,
      approved: approved?.count || 0,
      rejected: rejected?.count || 0,
      completed: completed?.count || 0,
      totalAmount: totalPendingAmount,
    };
  }
  
  // Knowledge Templates (Admin-managed training data templates)
  async getKnowledgeTemplates(category?: string): Promise<KnowledgeTemplate[]> {
    if (category) {
      return db.select().from(knowledgeTemplates)
        .where(eq(knowledgeTemplates.category, category))
        .orderBy(desc(knowledgeTemplates.createdAt));
    }
    return db.select().from(knowledgeTemplates)
      .orderBy(desc(knowledgeTemplates.createdAt));
  }
  
  async getKnowledgeTemplate(id: string): Promise<KnowledgeTemplate | undefined> {
    const result = await db.select().from(knowledgeTemplates)
      .where(eq(knowledgeTemplates.id, id));
    return result[0];
  }
  
  async getActiveKnowledgeTemplates(category?: string): Promise<KnowledgeTemplate[]> {
    if (category) {
      return db.select().from(knowledgeTemplates)
        .where(and(
          eq(knowledgeTemplates.isActive, true),
          eq(knowledgeTemplates.category, category)
        ))
        .orderBy(desc(knowledgeTemplates.createdAt));
    }
    return db.select().from(knowledgeTemplates)
      .where(eq(knowledgeTemplates.isActive, true))
      .orderBy(desc(knowledgeTemplates.createdAt));
  }
  
  async createKnowledgeTemplate(data: InsertKnowledgeTemplate): Promise<KnowledgeTemplate> {
    const id = generateId("kt_");
    const result = await db.insert(knowledgeTemplates).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateKnowledgeTemplate(id: string, data: Partial<KnowledgeTemplate>): Promise<KnowledgeTemplate | undefined> {
    const result = await db.update(knowledgeTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeTemplates.id, id))
      .returning();
    return result[0];
  }
  
  async deleteKnowledgeTemplate(id: string): Promise<boolean> {
    const result = await db.delete(knowledgeTemplates)
      .where(eq(knowledgeTemplates.id, id))
      .returning();
    return result.length > 0;
  }
  
  async incrementKnowledgeTemplateUsage(id: string): Promise<boolean> {
    const template = await this.getKnowledgeTemplate(id);
    if (!template) return false;
    const result = await db.update(knowledgeTemplates)
      .set({ usageCount: (template.usageCount || 0) + 1, updatedAt: new Date() })
      .where(eq(knowledgeTemplates.id, id))
      .returning();
    return result.length > 0;
  }
  
  // Merchant Activity Logs
  async getMerchantActivityLogs(merchantId: string, limit: number = 100): Promise<MerchantActivityLog[]> {
    return db.select().from(merchantActivityLogs)
      .where(eq(merchantActivityLogs.merchantId, merchantId))
      .orderBy(desc(merchantActivityLogs.createdAt))
      .limit(limit);
  }
  
  async getAllMerchantActivityLogs(limit: number = 500, activityType?: string): Promise<MerchantActivityLog[]> {
    if (activityType) {
      return db.select().from(merchantActivityLogs)
        .where(eq(merchantActivityLogs.activityType, activityType))
        .orderBy(desc(merchantActivityLogs.createdAt))
        .limit(limit);
    }
    return db.select().from(merchantActivityLogs)
      .orderBy(desc(merchantActivityLogs.createdAt))
      .limit(limit);
  }
  
  async createMerchantActivityLog(data: InsertMerchantActivityLog): Promise<MerchantActivityLog> {
    const id = generateId("mal_");
    const result = await db.insert(merchantActivityLogs).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async getMerchantActivityLogsByType(activityType: string, limit: number = 100): Promise<MerchantActivityLog[]> {
    return db.select().from(merchantActivityLogs)
      .where(eq(merchantActivityLogs.activityType, activityType))
      .orderBy(desc(merchantActivityLogs.createdAt))
      .limit(limit);
  }
  
  // Leads (Sales Agent)
  async getLeads(merchantId: string): Promise<Lead[]> {
    return db.select().from(leads)
      .where(eq(leads.merchantId, merchantId))
      .orderBy(desc(leads.createdAt));
  }
  
  async getLead(id: string): Promise<Lead | undefined> {
    const result = await db.select().from(leads).where(eq(leads.id, id));
    return result[0];
  }
  
  async getLeadBySession(sessionId: string): Promise<Lead | undefined> {
    const result = await db.select().from(leads).where(eq(leads.sessionId, sessionId));
    return result[0];
  }
  
  async createLead(data: InsertLead): Promise<Lead> {
    const id = generateId("lead_");
    const result = await db.insert(leads).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateLead(id: string, data: Partial<Lead>): Promise<Lead | undefined> {
    const result = await db.update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return result[0];
  }
  
  async deleteLead(id: string): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result.length > 0;
  }
  
  async getLeadsByStage(merchantId: string, stage: string): Promise<Lead[]> {
    return db.select().from(leads)
      .where(and(eq(leads.merchantId, merchantId), eq(leads.stage, stage)))
      .orderBy(desc(leads.score));
  }
  
  // ============================================================================
  // CUSTOMER APP METHODS (chat.chatvice.app)
  // ============================================================================
  
  async getAllCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }
  
  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }
  
  async getCustomerByPhone(phoneNumber: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.phoneNumber, phoneNumber));
    return result[0];
  }
  
  async getCustomerByPersonalId(personalId: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.personalId, personalId));
    return result[0];
  }
  
  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const id = generateId("cust_");
    
    // Generate personal ID in format P-A01-XXXXX
    const personalId = await this.generatePersonalId();
    
    const result = await db.insert(customers).values({
      ...data,
      id,
      personalId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async generatePersonalId(): Promise<string> {
    // Get the max personal ID number to generate the next sequential ID
    // This prevents duplicate key issues when using count
    const maxResult = await db.select({ 
      maxId: sql<string>`MAX(SUBSTRING(personal_id FROM 'P-A01-([0-9]+)')::int)` 
    }).from(customers).where(sql`personal_id IS NOT NULL`);
    
    const maxNumber = maxResult[0]?.maxId ? parseInt(maxResult[0].maxId) : 0;
    const nextNumber = maxNumber + 1;
    
    // Format: P-A01-XXXXX (P = Personal, A01 = Area code, XXXXX = 5-digit sequential)
    const sequentialNumber = nextNumber.toString().padStart(5, '0');
    return `P-A01-${sequentialNumber}`;
  }
  
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined> {
    const result = await db.update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return result[0];
  }
  
  // OTP Codes
  async createOTPCode(data: InsertOTPCode): Promise<OTPCode> {
    const id = generateId("otp_");
    // Delete any existing OTP for this phone number first
    await db.delete(otpCodes).where(eq(otpCodes.phoneNumber, data.phoneNumber));
    
    const result = await db.insert(otpCodes).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async getOTPCode(phoneNumber: string): Promise<OTPCode | undefined> {
    const result = await db.select().from(otpCodes)
      .where(and(
        eq(otpCodes.phoneNumber, phoneNumber),
        gte(otpCodes.expiresAt, new Date()),
        eq(otpCodes.verified, false)
      ))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return result[0];
  }
  
  async verifyOTPCode(phoneNumber: string, code: string): Promise<boolean> {
    const otp = await this.getOTPCode(phoneNumber);
    if (!otp || otp.code !== code || (otp.attempts ?? 0) >= 5) {
      return false;
    }
    
    await db.update(otpCodes)
      .set({ verified: true })
      .where(eq(otpCodes.id, otp.id));
    return true;
  }
  
  async incrementOTPAttempts(id: string): Promise<void> {
    await db.update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, id));
  }
  
  // Customer Contacts
  async getCustomerContacts(customerId: string): Promise<CustomerContact[]> {
    return db.select().from(customerContacts)
      .where(eq(customerContacts.customerId, customerId))
      .orderBy(desc(customerContacts.isFavorite), customerContacts.displayName);
  }
  
  async createCustomerContact(data: InsertCustomerContact): Promise<CustomerContact> {
    const id = generateId("contact_");
    const result = await db.insert(customerContacts).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateCustomerContact(id: string, data: Partial<CustomerContact>): Promise<CustomerContact | undefined> {
    const result = await db.update(customerContacts)
      .set(data)
      .where(eq(customerContacts.id, id))
      .returning();
    return result[0];
  }
  
  async deleteCustomerContact(id: string): Promise<boolean> {
    const result = await db.delete(customerContacts).where(eq(customerContacts.id, id)).returning();
    return result.length > 0;
  }
  
  // Customer Store Chats
  async getCustomerStoreChats(customerId: string): Promise<CustomerStoreChat[]> {
    return db.select().from(customerStoreChats)
      .where(and(
        eq(customerStoreChats.customerId, customerId),
        eq(customerStoreChats.isArchived, false)
      ))
      .orderBy(desc(customerStoreChats.isPinned), desc(customerStoreChats.lastMessageAt));
  }
  
  async getCustomerStoreChat(id: string): Promise<CustomerStoreChat | undefined> {
    const result = await db.select().from(customerStoreChats).where(eq(customerStoreChats.id, id));
    return result[0];
  }
  
  async getCustomerStoreChatByMerchant(customerId: string, merchantId: string): Promise<CustomerStoreChat | undefined> {
    const result = await db.select().from(customerStoreChats)
      .where(and(
        eq(customerStoreChats.customerId, customerId),
        eq(customerStoreChats.merchantId, merchantId)
      ));
    return result[0];
  }
  
  async createCustomerStoreChat(data: InsertCustomerStoreChat): Promise<CustomerStoreChat> {
    const id = generateId("storechat_");
    const result = await db.insert(customerStoreChats).values({
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }
  
  async updateCustomerStoreChat(id: string, data: Partial<CustomerStoreChat>): Promise<CustomerStoreChat | undefined> {
    const result = await db.update(customerStoreChats)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerStoreChats.id, id))
      .returning();
    return result[0];
  }
  
  // Personal Chats
  async getPersonalChats(customerId: string): Promise<PersonalChat[]> {
    return db.select().from(personalChats)
      .where(or(
        eq(personalChats.participant1Id, customerId),
        eq(personalChats.participant2Id, customerId)
      ))
      .orderBy(desc(personalChats.lastMessageAt));
  }
  
  async getPersonalChat(id: string): Promise<PersonalChat | undefined> {
    const result = await db.select().from(personalChats).where(eq(personalChats.id, id));
    return result[0];
  }
  
  async getPersonalChatBetween(customer1Id: string, customer2Id: string): Promise<PersonalChat | undefined> {
    const result = await db.select().from(personalChats)
      .where(or(
        and(
          eq(personalChats.participant1Id, customer1Id),
          eq(personalChats.participant2Id, customer2Id)
        ),
        and(
          eq(personalChats.participant1Id, customer2Id),
          eq(personalChats.participant2Id, customer1Id)
        )
      ));
    return result[0];
  }
  
  async createPersonalChat(data: InsertPersonalChat): Promise<PersonalChat> {
    const id = generateId("pchat_");
    const result = await db.insert(personalChats).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }
  
  // Personal Messages
  async getPersonalMessages(chatId: string): Promise<PersonalMessage[]> {
    return db.select().from(personalMessages)
      .where(eq(personalMessages.chatId, chatId))
      .orderBy(personalMessages.createdAt);
  }
  
  async createPersonalMessage(data: InsertPersonalMessage): Promise<PersonalMessage> {
    const id = generateId("pmsg_");
    const result = await db.insert(personalMessages).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    
    // Update last message time on the chat
    await db.update(personalChats)
      .set({ lastMessageAt: new Date() })
      .where(eq(personalChats.id, data.chatId));
    
    return result[0];
  }
  
  async markPersonalMessagesRead(chatId: string, readerId: string): Promise<void> {
    await db.update(personalMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(personalMessages.chatId, chatId),
        ne(personalMessages.senderId, readerId),
        eq(personalMessages.isRead, false)
      ));
  }

  // Chat Media
  async createChatMedia(data: InsertChatMedia): Promise<ChatMedia> {
    const id = generateId("media_");
    const result = await db.insert(chatMedia).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async getChatMedia(id: string): Promise<ChatMedia | undefined> {
    const result = await db.select().from(chatMedia).where(eq(chatMedia.id, id));
    return result[0];
  }

  async getChatMediaBySession(sessionId: string): Promise<ChatMedia[]> {
    return db.select().from(chatMedia)
      .where(eq(chatMedia.sessionId, sessionId))
      .orderBy(desc(chatMedia.createdAt));
  }

  async getChatMediaByMerchant(merchantId: string): Promise<ChatMedia[]> {
    return db.select().from(chatMedia)
      .where(eq(chatMedia.merchantId, merchantId))
      .orderBy(desc(chatMedia.createdAt));
  }

  async getMediaByUploader(uploaderId: string, uploaderType: string): Promise<ChatMedia[]> {
    return db.select().from(chatMedia)
      .where(and(
        eq(chatMedia.uploaderId, uploaderId),
        eq(chatMedia.uploaderType, uploaderType)
      ))
      .orderBy(desc(chatMedia.createdAt));
  }

  // Customer Stories
  async getActiveCustomerStories(customerId: string): Promise<CustomerStory[]> {
    const now = new Date();
    return db.select().from(customerStories)
      .where(and(
        eq(customerStories.isActive, true),
        or(
          isNull(customerStories.expiresAt),
          gte(customerStories.expiresAt, now)
        )
      ))
      .orderBy(desc(customerStories.createdAt))
      .limit(20);
  }

  async createCustomerStory(data: InsertCustomerStory): Promise<CustomerStory> {
    const id = generateId("story_");
    const result = await db.insert(customerStories).values({
      ...data,
      id,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
