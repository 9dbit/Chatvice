import { db } from "../db";
import { 
  waChannels, waContactLists, waContacts, waTemplates, 
  waCampaigns, waCampaignRecipients, waMessageLogs,
  waChatSessions, waChatMessages, waBlastPricing, merchantWaSubscription
} from "@shared/schema";
import { eq, and, desc, sql, inArray, like, or } from "drizzle-orm";
import { nanoid } from "nanoid";

export class WaBlastService {
  // ============================================
  // Channel Management
  // ============================================
  
  async getChannels(merchantId: string) {
    return db.select().from(waChannels)
      .where(eq(waChannels.merchantId, merchantId))
      .orderBy(desc(waChannels.createdAt));
  }
  
  async getChannel(id: string, merchantId: string) {
    const [channel] = await db.select().from(waChannels)
      .where(and(eq(waChannels.id, id), eq(waChannels.merchantId, merchantId)));
    return channel;
  }
  
  async createChannel(data: {
    merchantId: string;
    type: string;
    name: string;
    phoneNumber?: string;
    metaPhoneNumberId?: string;
    metaAccessToken?: string;
    metaWabaId?: string;
  }) {
    const id = nanoid(16);
    await db.insert(waChannels).values({
      id,
      ...data,
      status: data.type === "meta_api" ? "pending" : "disconnected",
    });
    return this.getChannel(id, data.merchantId);
  }
  
  async updateChannel(id: string, merchantId: string, data: Partial<typeof waChannels.$inferInsert>) {
    await db.update(waChannels)
      .set(data)
      .where(and(eq(waChannels.id, id), eq(waChannels.merchantId, merchantId)));
    return this.getChannel(id, merchantId);
  }
  
  async deleteChannel(id: string, merchantId: string) {
    await db.delete(waChannels)
      .where(and(eq(waChannels.id, id), eq(waChannels.merchantId, merchantId)));
  }
  
  async testMetaApiConnection(phoneNumberId: string, accessToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (response.ok) {
        return { success: true };
      }
      const error = await response.json();
      return { success: false, error: error.error?.message || "Failed to connect" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  
  // ============================================
  // Contact List Management
  // ============================================
  
  async getContactLists(merchantId: string) {
    return db.select().from(waContactLists)
      .where(eq(waContactLists.merchantId, merchantId))
      .orderBy(desc(waContactLists.createdAt));
  }
  
  async createContactList(merchantId: string, name: string, description?: string) {
    const id = nanoid(16);
    await db.insert(waContactLists).values({
      id,
      merchantId,
      name,
      description,
    });
    return { id, name, description, contactCount: 0 };
  }
  
  async updateContactList(id: string, merchantId: string, data: { name?: string; description?: string }) {
    await db.update(waContactLists)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(waContactLists.id, id), eq(waContactLists.merchantId, merchantId)));
  }
  
  async deleteContactList(id: string, merchantId: string) {
    await db.update(waContacts)
      .set({ listId: null })
      .where(and(eq(waContacts.listId, id), eq(waContacts.merchantId, merchantId)));
    await db.delete(waContactLists)
      .where(and(eq(waContactLists.id, id), eq(waContactLists.merchantId, merchantId)));
  }
  
  // ============================================
  // Contact Management
  // ============================================
  
  async getContacts(merchantId: string, listId?: string, search?: string, limit = 100, offset = 0) {
    const conditions: any[] = [eq(waContacts.merchantId, merchantId)];
    
    if (listId) {
      conditions.push(eq(waContacts.listId, listId));
    }
    
    if (search) {
      conditions.push(
        or(
          like(waContacts.phoneNumber, `%${search}%`),
          like(waContacts.name, `%${search}%`)
        )
      );
    }
    
    return db.select().from(waContacts)
      .where(and(...conditions))
      .orderBy(desc(waContacts.createdAt))
      .limit(limit)
      .offset(offset);
  }
  
  async getContactCount(merchantId: string, listId?: string) {
    const conditions = [eq(waContacts.merchantId, merchantId)];
    if (listId) conditions.push(eq(waContacts.listId, listId));
    
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(waContacts)
      .where(and(...conditions));
    return result?.count || 0;
  }
  
  async createContact(data: {
    merchantId: string;
    listId?: string;
    phoneNumber: string;
    name?: string;
    email?: string;
    customFields?: Record<string, any>;
  }) {
    const id = nanoid(16);
    await db.insert(waContacts).values({
      id,
      ...data,
      optInAt: new Date(),
    });
    
    if (data.listId) {
      await this.updateListContactCount(data.listId);
    }
    
    return { id, ...data };
  }
  
  async importContacts(merchantId: string, listId: string | null, contacts: Array<{
    phoneNumber: string;
    name?: string;
    email?: string;
    customFields?: Record<string, any>;
  }>) {
    const values = contacts.map(c => ({
      id: nanoid(16),
      merchantId,
      listId,
      phoneNumber: c.phoneNumber,
      name: c.name,
      email: c.email,
      customFields: c.customFields || {},
      optInAt: new Date(),
    }));
    
    if (values.length > 0) {
      await db.insert(waContacts).values(values);
      if (listId) {
        await this.updateListContactCount(listId);
      }
    }
    
    return values.length;
  }
  
  async updateContact(id: string, merchantId: string, data: Partial<typeof waContacts.$inferInsert>) {
    await db.update(waContacts)
      .set(data)
      .where(and(eq(waContacts.id, id), eq(waContacts.merchantId, merchantId)));
  }
  
  async deleteContact(id: string, merchantId: string) {
    const [contact] = await db.select().from(waContacts)
      .where(and(eq(waContacts.id, id), eq(waContacts.merchantId, merchantId)));
    
    await db.delete(waContacts)
      .where(and(eq(waContacts.id, id), eq(waContacts.merchantId, merchantId)));
    
    if (contact?.listId) {
      await this.updateListContactCount(contact.listId);
    }
  }
  
  async deleteContacts(ids: string[], merchantId: string) {
    await db.delete(waContacts)
      .where(and(inArray(waContacts.id, ids), eq(waContacts.merchantId, merchantId)));
  }
  
  private async updateListContactCount(listId: string) {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(waContacts)
      .where(eq(waContacts.listId, listId));
    
    await db.update(waContactLists)
      .set({ contactCount: result?.count || 0, updatedAt: new Date() })
      .where(eq(waContactLists.id, listId));
  }
  
  // ============================================
  // Template Management
  // ============================================
  
  async getTemplates(merchantId: string) {
    return db.select().from(waTemplates)
      .where(eq(waTemplates.merchantId, merchantId))
      .orderBy(desc(waTemplates.createdAt));
  }
  
  async getTemplate(id: string, merchantId: string) {
    const [template] = await db.select().from(waTemplates)
      .where(and(eq(waTemplates.id, id), eq(waTemplates.merchantId, merchantId)));
    return template;
  }
  
  async createTemplate(data: {
    merchantId: string;
    name: string;
    category: string;
    content: string;
    variables?: string[];
    mediaType?: string;
    mediaUrl?: string;
  }) {
    const id = nanoid(16);
    const variables = this.extractVariables(data.content);
    
    await db.insert(waTemplates).values({
      id,
      ...data,
      variables,
    });
    
    return this.getTemplate(id, data.merchantId);
  }
  
  async updateTemplate(id: string, merchantId: string, data: Partial<typeof waTemplates.$inferInsert>) {
    if (data.content) {
      data.variables = this.extractVariables(data.content);
    }
    await db.update(waTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(waTemplates.id, id), eq(waTemplates.merchantId, merchantId)));
    return this.getTemplate(id, merchantId);
  }
  
  async deleteTemplate(id: string, merchantId: string) {
    await db.delete(waTemplates)
      .where(and(eq(waTemplates.id, id), eq(waTemplates.merchantId, merchantId)));
  }
  
  private extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    const variables = matches.map(m => m.replace(/\{\{|\}\}/g, ""));
    return Array.from(new Set(variables));
  }
  
  // ============================================
  // Campaign Management
  // ============================================
  
  async getCampaigns(merchantId: string, status?: string) {
    let conditions = [eq(waCampaigns.merchantId, merchantId)];
    if (status) conditions.push(eq(waCampaigns.status, status));
    
    return db.select().from(waCampaigns)
      .where(and(...conditions))
      .orderBy(desc(waCampaigns.createdAt));
  }
  
  async getCampaign(id: string, merchantId: string) {
    const [campaign] = await db.select().from(waCampaigns)
      .where(and(eq(waCampaigns.id, id), eq(waCampaigns.merchantId, merchantId)));
    return campaign;
  }
  
  async createCampaign(data: {
    merchantId: string;
    channelId: string;
    templateId?: string;
    name: string;
    messageContent: string;
    mediaType?: string;
    mediaUrl?: string;
    listIds?: string[];
    scheduledAt?: Date;
    sendDelay?: number;
  }) {
    const id = nanoid(16);
    
    await db.insert(waCampaigns).values({
      id,
      ...data,
      status: data.scheduledAt ? "scheduled" : "draft",
    });
    
    return this.getCampaign(id, data.merchantId);
  }
  
  async updateCampaign(id: string, merchantId: string, data: Partial<typeof waCampaigns.$inferInsert>) {
    await db.update(waCampaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(waCampaigns.id, id), eq(waCampaigns.merchantId, merchantId)));
    return this.getCampaign(id, merchantId);
  }
  
  async deleteCampaign(id: string, merchantId: string) {
    await db.delete(waCampaignRecipients).where(eq(waCampaignRecipients.campaignId, id));
    await db.delete(waCampaigns)
      .where(and(eq(waCampaigns.id, id), eq(waCampaigns.merchantId, merchantId)));
  }
  
  async prepareCampaignRecipients(campaignId: string, merchantId: string, listIds: string[]) {
    const campaign = await this.getCampaign(campaignId, merchantId);
    if (!campaign) throw new Error("Campaign not found");
    
    const contacts = await db.select().from(waContacts)
      .where(and(
        eq(waContacts.merchantId, merchantId),
        eq(waContacts.optInStatus, "active"),
        listIds.length > 0 ? inArray(waContacts.listId, listIds) : sql`true`
      ));
    
    const recipients = contacts.map(contact => ({
      id: nanoid(16),
      campaignId,
      contactId: contact.id,
      phoneNumber: contact.phoneNumber,
      name: contact.name,
      personalizedMessage: this.personalizeMessage(campaign.messageContent, contact),
    }));
    
    if (recipients.length > 0) {
      await db.insert(waCampaignRecipients).values(recipients);
    }
    
    await db.update(waCampaigns)
      .set({ totalRecipients: recipients.length, updatedAt: new Date() })
      .where(eq(waCampaigns.id, campaignId));
    
    return recipients.length;
  }
  
  private personalizeMessage(template: string, contact: { name?: string | null; customFields?: any }): string {
    let message = template;
    message = message.replace(/\{\{name\}\}/gi, contact.name || "Customer");
    message = message.replace(/\{\{nama\}\}/gi, contact.name || "Customer");
    
    if (contact.customFields && typeof contact.customFields === "object") {
      for (const [key, value] of Object.entries(contact.customFields)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
        message = message.replace(regex, String(value));
      }
    }
    
    return message;
  }
  
  async getCampaignRecipients(campaignId: string, status?: string, limit = 100, offset = 0) {
    let conditions = [eq(waCampaignRecipients.campaignId, campaignId)];
    if (status) conditions.push(eq(waCampaignRecipients.status, status));
    
    return db.select().from(waCampaignRecipients)
      .where(and(...conditions))
      .orderBy(waCampaignRecipients.createdAt)
      .limit(limit)
      .offset(offset);
  }
  
  // ============================================
  // Message Sending (Meta API)
  // ============================================
  
  async sendMessage(channel: typeof waChannels.$inferSelect, phoneNumber: string, message: string, mediaUrl?: string) {
    if (channel.type !== "meta_api" || !channel.metaPhoneNumberId || !channel.metaAccessToken) {
      throw new Error("Invalid channel configuration");
    }
    
    const payload: any = {
      messaging_product: "whatsapp",
      to: phoneNumber.replace(/\D/g, ""),
      type: mediaUrl ? "image" : "text",
    };
    
    if (mediaUrl) {
      payload.image = { link: mediaUrl, caption: message };
    } else {
      payload.text = { body: message };
    }
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${channel.metaPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.metaAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.message || "Failed to send message");
    }
    
    return result;
  }
  
  // ============================================
  // Pricing Management (Admin)
  // ============================================
  
  async getPricing() {
    const [pricing] = await db.select().from(waBlastPricing).where(eq(waBlastPricing.isActive, true));
    return pricing || this.getDefaultPricing();
  }
  
  async updatePricing(data: Partial<typeof waBlastPricing.$inferInsert>, adminId: string) {
    const existing = await this.getPricing();
    
    if (existing?.id) {
      await db.update(waBlastPricing)
        .set({ ...data, updatedAt: new Date(), updatedBy: adminId })
        .where(eq(waBlastPricing.id, existing.id));
    } else {
      await db.insert(waBlastPricing).values({
        id: nanoid(16),
        ...data,
        updatedBy: adminId,
      });
    }
    
    return this.getPricing();
  }
  
  private getDefaultPricing() {
    return {
      platformBasicPrice: 0,
      platformProPrice: 299000,
      platformEnterprisePrice: 999000,
      priceMarketingTemplate: 500,
      priceUtilityTemplate: 300,
      priceOtpTemplate: 200,
      priceTextMessage: 100,
      quotaBasic: 500,
      quotaPro: 5000,
      quotaEnterprise: 50000,
      channelsBasic: 1,
      channelsPro: 3,
      channelsEnterprise: 10,
      contactsBasic: 500,
      contactsPro: 10000,
      contactsEnterprise: 100000,
    };
  }
  
  // ============================================
  // Merchant Subscription
  // ============================================
  
  async getMerchantSubscription(merchantId: string) {
    const [sub] = await db.select().from(merchantWaSubscription)
      .where(eq(merchantWaSubscription.merchantId, merchantId));
    
    if (!sub) {
      return this.createMerchantSubscription(merchantId);
    }
    return sub;
  }
  
  async createMerchantSubscription(merchantId: string) {
    const pricing = await this.getPricing();
    const id = nanoid(16);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    await db.insert(merchantWaSubscription).values({
      id,
      merchantId,
      planType: "basic",
      messagesLimit: pricing.quotaBasic || 500,
      channelsLimit: pricing.channelsBasic || 1,
      contactsLimit: pricing.contactsBasic || 500,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
    
    const [sub] = await db.select().from(merchantWaSubscription)
      .where(eq(merchantWaSubscription.merchantId, merchantId));
    return sub;
  }
  
  async updateMerchantSubscription(merchantId: string, data: Partial<typeof merchantWaSubscription.$inferInsert>) {
    await db.update(merchantWaSubscription)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(merchantWaSubscription.merchantId, merchantId));
    return this.getMerchantSubscription(merchantId);
  }
  
  // ============================================
  // Analytics
  // ============================================
  
  async getCampaignStats(campaignId: string) {
    const [stats] = await db.select({
      total: sql<number>`count(*)`,
      sent: sql<number>`count(*) filter (where status = 'sent')`,
      delivered: sql<number>`count(*) filter (where status = 'delivered')`,
      read: sql<number>`count(*) filter (where status = 'read')`,
      failed: sql<number>`count(*) filter (where status = 'failed')`,
      pending: sql<number>`count(*) filter (where status = 'pending')`,
    }).from(waCampaignRecipients)
      .where(eq(waCampaignRecipients.campaignId, campaignId));
    
    return stats;
  }
  
  async getMerchantStats(merchantId: string) {
    const [channelStats] = await db.select({ count: sql<number>`count(*)` })
      .from(waChannels)
      .where(eq(waChannels.merchantId, merchantId));
    
    const [contactStats] = await db.select({ count: sql<number>`count(*)` })
      .from(waContacts)
      .where(eq(waContacts.merchantId, merchantId));
    
    const [campaignStats] = await db.select({ count: sql<number>`count(*)` })
      .from(waCampaigns)
      .where(eq(waCampaigns.merchantId, merchantId));
    
    const [messageStats] = await db.select({ count: sql<number>`count(*)` })
      .from(waMessageLogs)
      .where(eq(waMessageLogs.merchantId, merchantId));
    
    return {
      channels: channelStats?.count || 0,
      contacts: contactStats?.count || 0,
      campaigns: campaignStats?.count || 0,
      messages: messageStats?.count || 0,
    };
  }
  
  // ============================================
  // Admin: Get All Contacts (Master Control)
  // ============================================
  
  async getAllContacts(options: {
    merchantId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { merchantId, search, limit = 100, offset = 0 } = options;
    
    let conditions: any[] = [];
    if (merchantId) conditions.push(eq(waContacts.merchantId, merchantId));
    if (search) {
      conditions.push(
        or(
          like(waContacts.phoneNumber, `%${search}%`),
          like(waContacts.name, `%${search}%`)
        )
      );
    }
    
    const query = conditions.length > 0
      ? db.select().from(waContacts).where(and(...conditions))
      : db.select().from(waContacts);
    
    return query.orderBy(desc(waContacts.createdAt)).limit(limit).offset(offset);
  }
  
  async getAllContactsCount(merchantId?: string) {
    const conditions = merchantId ? [eq(waContacts.merchantId, merchantId)] : [];
    
    const query = conditions.length > 0
      ? db.select({ count: sql<number>`count(*)` }).from(waContacts).where(and(...conditions))
      : db.select({ count: sql<number>`count(*)` }).from(waContacts);
    
    const [result] = await query;
    return result?.count || 0;
  }
}

export const waBlastService = new WaBlastService();
