import { db } from "../db";
import { 
  waChannels, waContactLists, waContacts, waTemplates, 
  waCampaigns, waCampaignRecipients, waMessageLogs,
  waChatSessions, waChatMessages, waBlastPricing, merchantWaSubscription
} from "@shared/schema";
import { eq, and, desc, sql, inArray, like, or } from "drizzle-orm";
import { nanoid } from "nanoid";

// Type for WebSocket broadcast callback
type BroadcastCallback = (merchantId: string, data: any) => void;

export class WaBlastService {
  // WebSocket broadcast callback for real-time updates
  private broadcastCallback?: BroadcastCallback;
  
  setBroadcastCallback(callback: BroadcastCallback) {
    this.broadcastCallback = callback;
  }
  
  private broadcast(merchantId: string, eventType: string, data: any) {
    if (this.broadcastCallback) {
      this.broadcastCallback(merchantId, { type: eventType, ...data });
    }
  }
  
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
  
  async sendTemplateMessage(
    channel: typeof waChannels.$inferSelect,
    phoneNumber: string,
    templateName: string,
    languageCode: string,
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text?: string; image?: { link: string } }>;
    }>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (channel.type !== "meta_api" || !channel.metaPhoneNumberId || !channel.metaAccessToken) {
      return { success: false, error: "Invalid channel configuration" };
    }
    
    const payload: any = {
      messaging_product: "whatsapp",
      to: phoneNumber.replace(/\D/g, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };
    
    if (components && components.length > 0) {
      payload.template.components = components;
    }
    
    try {
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
        return { success: false, error: result.error?.message || "Failed to send template message" };
      }
      
      return { success: true, messageId: result.messages?.[0]?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  
  async sendMessage(
    channel: typeof waChannels.$inferSelect, 
    phoneNumber: string, 
    message: string, 
    mediaUrl?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (channel.type !== "meta_api" || !channel.metaPhoneNumberId || !channel.metaAccessToken) {
      return { success: false, error: "Invalid channel configuration" };
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
    
    try {
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
        return { success: false, error: result.error?.message || "Failed to send message" };
      }
      
      return { success: true, messageId: result.messages?.[0]?.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  
  // ============================================
  // Blast Engine: Campaign Execution
  // ============================================
  
  private campaignQueues: Map<string, { paused: boolean; aborted: boolean }> = new Map();
  
  async startCampaign(campaignId: string, merchantId: string): Promise<{ success: boolean; error?: string }> {
    const campaign = await this.getCampaign(campaignId, merchantId);
    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }
    
    if (campaign.status === "running") {
      return { success: false, error: "Campaign is already running" };
    }
    
    const channel = await this.getChannel(campaign.channelId, merchantId);
    if (!channel) {
      return { success: false, error: "Channel not found" };
    }
    
    const recipients = await db.select().from(waCampaignRecipients)
      .where(and(
        eq(waCampaignRecipients.campaignId, campaignId),
        eq(waCampaignRecipients.status, "pending")
      ));
    
    if (recipients.length === 0) {
      return { success: false, error: "No pending recipients found" };
    }
    
    await this.updateCampaign(campaignId, merchantId, { status: "running", startedAt: new Date() });
    
    this.campaignQueues.set(campaignId, { paused: false, aborted: false });
    
    this.executeCampaignQueue(campaignId, merchantId, channel, campaign, recipients);
    
    return { success: true };
  }
  
  async pauseCampaign(campaignId: string, merchantId: string): Promise<{ success: boolean }> {
    const queue = this.campaignQueues.get(campaignId);
    if (queue) {
      queue.paused = true;
    }
    await this.updateCampaign(campaignId, merchantId, { status: "paused" });
    
    // Broadcast pause event
    this.broadcast(merchantId, "wa_blast_campaign_status", {
      campaignId,
      status: "paused",
    });
    
    return { success: true };
  }
  
  async resumeCampaign(campaignId: string, merchantId: string): Promise<{ success: boolean; error?: string }> {
    const campaign = await this.getCampaign(campaignId, merchantId);
    if (!campaign || campaign.status !== "paused") {
      return { success: false, error: "Campaign is not paused" };
    }
    
    const queue = this.campaignQueues.get(campaignId);
    if (queue) {
      queue.paused = false;
    }
    
    await this.updateCampaign(campaignId, merchantId, { status: "running" });
    
    // Broadcast resume event
    this.broadcast(merchantId, "wa_blast_campaign_status", {
      campaignId,
      status: "running",
    });
    
    if (!queue) {
      return this.startCampaign(campaignId, merchantId);
    }
    
    return { success: true };
  }
  
  async stopCampaign(campaignId: string, merchantId: string): Promise<{ success: boolean }> {
    const queue = this.campaignQueues.get(campaignId);
    if (queue) {
      queue.aborted = true;
    }
    await this.updateCampaign(campaignId, merchantId, { status: "cancelled" });
    this.campaignQueues.delete(campaignId);
    
    // Broadcast stop event
    this.broadcast(merchantId, "wa_blast_campaign_status", {
      campaignId,
      status: "cancelled",
    });
    
    return { success: true };
  }
  
  private async executeCampaignQueue(
    campaignId: string,
    merchantId: string,
    channel: typeof waChannels.$inferSelect,
    campaign: typeof waCampaigns.$inferSelect,
    recipients: Array<typeof waCampaignRecipients.$inferSelect>
  ) {
    const queue = this.campaignQueues.get(campaignId);
    const rateLimit = 80;
    const minDelay = 750;
    const maxDelay = 1500;
    
    let sentCount = 0;
    let failedCount = 0;
    
    for (const recipient of recipients) {
      if (!queue || queue.aborted) {
        break;
      }
      
      while (queue?.paused) {
        await this.delay(1000);
        if (queue.aborted) break;
      }
      
      if (queue?.aborted) break;
      
      try {
        let result: { success: boolean; messageId?: string; error?: string };
        
        if (campaign.templateId) {
          const template = await this.getTemplate(campaign.templateId, merchantId);
          if (template) {
            const processedContent = this.processTemplateVariables(template.content, {
              name: recipient.name || "",
            });
            result = await this.sendTemplateMessage(
              channel,
              recipient.phoneNumber,
              template.metaTemplateName || template.name,
              "id",
              [{
                type: "body",
                parameters: [{ type: "text", text: processedContent }]
              }]
            );
          } else {
            result = { success: false, error: "Template not found" };
          }
        } else if (campaign.messageContent) {
          result = await this.sendMessage(channel, recipient.phoneNumber, campaign.messageContent, campaign.mediaUrl || undefined);
        } else {
          result = { success: false, error: "No message content" };
        }
        
        if (result.success) {
          await this.updateRecipientStatus(recipient.id, "sent", result.messageId);
          await this.logMessage({
            merchantId,
            channelId: channel.id,
            campaignId,
            contactId: recipient.contactId || undefined,
            phoneNumber: recipient.phoneNumber,
            direction: "outgoing",
            messageType: campaign.templateId ? "template" : "text",
            content: campaign.messageContent || "",
            metaMessageId: result.messageId,
            status: "sent",
          });
          sentCount++;
          
          // Broadcast progress update
          this.broadcast(merchantId, "wa_blast_progress", {
            campaignId,
            recipientId: recipient.id,
            status: "sent",
            sentCount,
            failedCount,
            total: recipients.length,
          });
        } else {
          await this.updateRecipientStatus(recipient.id, "failed", undefined, result.error);
          failedCount++;
          
          // Broadcast failure update
          this.broadcast(merchantId, "wa_blast_progress", {
            campaignId,
            recipientId: recipient.id,
            status: "failed",
            error: result.error,
            sentCount,
            failedCount,
            total: recipients.length,
          });
        }
        
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay) + minDelay);
        await this.delay(randomDelay);
        
      } catch (err: any) {
        await this.updateRecipientStatus(recipient.id, "failed", undefined, err.message);
        failedCount++;
      }
    }
    
    const stats = await this.getCampaignStats(campaignId);
    const allProcessed = (stats.sent || 0) + (stats.failed || 0) >= (stats.total || 0);
    
    if (allProcessed || queue?.aborted) {
      const finalStatus = queue?.aborted ? "cancelled" : "completed";
      await this.updateCampaign(campaignId, merchantId, { 
        status: finalStatus,
        completedAt: new Date(),
        sentCount: stats.sent || 0,
        failedCount: stats.failed || 0,
      });
      this.campaignQueues.delete(campaignId);
      
      // Broadcast campaign completion
      this.broadcast(merchantId, "wa_blast_campaign_status", {
        campaignId,
        status: finalStatus,
        sentCount: stats.sent || 0,
        failedCount: stats.failed || 0,
        total: stats.total || 0,
      });
    }
  }
  
  private async updateRecipientStatus(recipientId: string, status: string, messageId?: string, errorMessage?: string) {
    await db.update(waCampaignRecipients)
      .set({ 
        status, 
        metaMessageId: messageId,
        errorMessage,
        sentAt: status === "sent" ? new Date() : undefined,
      })
      .where(eq(waCampaignRecipients.id, recipientId));
  }
  
  private processTemplateVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return result;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private async logMessage(data: {
    merchantId: string;
    channelId: string;
    campaignId?: string;
    contactId?: string;
    phoneNumber: string;
    direction: string;
    messageType: string;
    content: string;
    metaMessageId?: string;
    status: string;
  }) {
    await db.insert(waMessageLogs).values({
      id: nanoid(16),
      ...data,
    });
  }
  
  // ============================================
  // Webhook Handlers (Incoming Messages & Status Updates)
  // ============================================
  
  async handleIncomingMessage(data: {
    phoneNumberId: string;
    fromNumber: string;
    messageId: string;
    timestamp: string;
    type: string;
    text?: string;
    mediaId?: string;
  }) {
    // Find the channel by phoneNumberId
    const [channel] = await db.select().from(waChannels)
      .where(eq(waChannels.metaPhoneNumberId, data.phoneNumberId));
    
    if (!channel) {
      console.log("[WA Webhook] Channel not found for phoneNumberId:", data.phoneNumberId);
      return;
    }
    
    // Find or create a chat session for this contact
    const normalizedPhone = data.fromNumber.replace(/\D/g, "");
    
    let [existingSession] = await db.select().from(waChatSessions)
      .where(and(
        eq(waChatSessions.channelId, channel.id),
        eq(waChatSessions.phoneNumber, normalizedPhone),
        eq(waChatSessions.status, "active")
      ));
    
    if (!existingSession) {
      // Check if this is a reply to a blast campaign
      const [recentMessage] = await db.select().from(waMessageLogs)
        .where(and(
          eq(waMessageLogs.channelId, channel.id),
          eq(waMessageLogs.phoneNumber, normalizedPhone),
          eq(waMessageLogs.direction, "outgoing")
        ))
        .orderBy(desc(waMessageLogs.createdAt))
        .limit(1);
      
      // Create new chat session
      const sessionId = nanoid(16);
      await db.insert(waChatSessions).values({
        id: sessionId,
        merchantId: channel.merchantId,
        channelId: channel.id,
        phoneNumber: normalizedPhone,
        contactName: null,
        status: "active",
        originCampaignId: recentMessage?.campaignId || null,
        lastMessageAt: new Date(),
      });
      
      [existingSession] = await db.select().from(waChatSessions)
        .where(eq(waChatSessions.id, sessionId));
    } else {
      // Update last message timestamp
      await db.update(waChatSessions)
        .set({ lastMessageAt: new Date() })
        .where(eq(waChatSessions.id, existingSession.id));
    }
    
    // Store the incoming message
    await db.insert(waChatMessages).values({
      id: nanoid(16),
      sessionId: existingSession.id,
      direction: "inbound",
      senderType: "customer",
      content: data.text || "",
      messageType: data.type,
      metaMessageId: data.messageId,
      status: "received",
    });
    
    // Log the message
    await this.logMessage({
      merchantId: channel.merchantId,
      channelId: channel.id,
      phoneNumber: normalizedPhone,
      direction: "incoming",
      messageType: data.type,
      content: data.text || "",
      metaMessageId: data.messageId,
      status: "received",
    });
    
    console.log("[WA Webhook] Incoming message processed:", { 
      sessionId: existingSession.id, 
      from: normalizedPhone 
    });
    
    // Broadcast incoming message notification to merchant dashboard
    this.broadcast(channel.merchantId, "wa_blast_incoming_message", {
      sessionId: existingSession.id,
      phoneNumber: normalizedPhone,
      content: data.text || "",
      messageType: data.type,
      timestamp: data.timestamp,
    });
  }
  
  async handleStatusUpdate(data: {
    messageId: string;
    status: string;
    timestamp: string;
    recipientId?: string;
    errors?: Array<{ code: number; title: string }>;
  }) {
    // Update recipient status if this is a campaign message
    const [recipient] = await db.select().from(waCampaignRecipients)
      .where(eq(waCampaignRecipients.metaMessageId, data.messageId));
    
    if (recipient) {
      const newStatus = data.status === "sent" ? "sent" 
        : data.status === "delivered" ? "delivered"
        : data.status === "read" ? "read"
        : data.status === "failed" ? "failed"
        : recipient.status;
      
      await db.update(waCampaignRecipients)
        .set({ 
          status: newStatus,
          deliveredAt: data.status === "delivered" ? new Date() : undefined,
          readAt: data.status === "read" ? new Date() : undefined,
          errorMessage: data.errors?.[0]?.title,
        })
        .where(eq(waCampaignRecipients.id, recipient.id));
    }
    
    // Update message log status
    await db.update(waMessageLogs)
      .set({ status: data.status })
      .where(eq(waMessageLogs.metaMessageId, data.messageId));
    
    // Update chat message status
    await db.update(waChatMessages)
      .set({ status: data.status })
      .where(eq(waChatMessages.metaMessageId, data.messageId));
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
