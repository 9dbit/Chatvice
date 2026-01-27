import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { waBlastService } from "../services/wa-blast";

const router = Router();

// Extend Request to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// Verify Meta webhook signature (X-Hub-Signature-256)
function verifyWebhookSignature(req: Request): boolean {
  const signature = req.headers["x-hub-signature-256"] as string;
  const appSecret: string | undefined = process.env.META_APP_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!appSecret) {
    if (isProduction) {
      console.error("[WA Webhook] CRITICAL: META_APP_SECRET not configured in production, rejecting request");
      return false;
    }
    console.log("[WA Webhook] Warning: META_APP_SECRET not configured, skipping signature verification in development");
    return true;
  }
  
  if (!signature) {
    console.log("[WA Webhook] Warning: No signature provided");
    return false;
  }
  
  // Use rawBody if available (set by middleware), otherwise fall back to JSON stringify
  const bodyString: string = JSON.stringify(req.body);
  const rawBody: Buffer = req.rawBody || Buffer.from(bodyString, "utf8");
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(rawBody);
  const expectedSignature: string = "sha256=" + hmac.digest("hex");
  
  // Ensure same length for timingSafeEqual
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Helper to get merchantId with proper type
function getMerchantId(req: Request): string {
  const merchantId = req.session?.merchantId;
  if (!merchantId) {
    throw new Error("Merchant ID not found in session");
  }
  return merchantId;
}

// Middleware to check merchant authentication
const requireMerchant = (req: Request, res: Response, next: Function) => {
  if (!req.session?.userId || (req.session?.userType !== "merchant" && req.session?.userType !== "supervisor")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.session?.merchantId) {
    return res.status(401).json({ message: "Merchant context required" });
  }
  next();
};

// Middleware to check admin authentication
const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ message: "Admin access required" });
  }
  next();
};

// ============================================
// Merchant Subscription & Stats
// ============================================

router.get("/subscription", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const subscription = await waBlastService.getMerchantSubscription(merchantId);
    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/stats", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const stats = await waBlastService.getMerchantStats(merchantId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// Channel Management
// ============================================

router.get("/channels", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const channels = await waBlastService.getChannels(merchantId);
    res.json(channels);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/channels", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const schema = z.object({
      type: z.enum(["meta_api", "wa_web"]),
      name: z.string().min(1),
      phoneNumber: z.string().optional(),
      metaPhoneNumberId: z.string().optional(),
      metaAccessToken: z.string().optional(),
      metaWabaId: z.string().optional(),
    });
    
    const data = schema.parse(req.body);
    const channel = await waBlastService.createChannel({ merchantId, ...data });
    res.json(channel);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/channels/:id/test", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const channel = await waBlastService.getChannel(req.params.id, merchantId);
    
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }
    
    if (channel.type === "meta_api" && channel.metaPhoneNumberId && channel.metaAccessToken) {
      const result = await waBlastService.testMetaApiConnection(
        channel.metaPhoneNumberId,
        channel.metaAccessToken
      );
      
      if (result.success) {
        await waBlastService.updateChannel(req.params.id, merchantId, { status: "connected" });
      }
      
      res.json(result);
    } else {
      res.json({ success: false, error: "Invalid channel configuration" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/channels/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const channel = await waBlastService.updateChannel(req.params.id, merchantId, req.body);
    res.json(channel);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/channels/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    await waBlastService.deleteChannel(req.params.id, merchantId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// Contact List Management
// ============================================

router.get("/contact-lists", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const lists = await waBlastService.getContactLists(merchantId);
    res.json(lists);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/contact-lists", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { name, description } = req.body;
    const list = await waBlastService.createContactList(merchantId, name, description);
    res.json(list);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/contact-lists/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    await waBlastService.updateContactList(req.params.id, merchantId, req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/contact-lists/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    await waBlastService.deleteContactList(req.params.id, merchantId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// Contact Management
// ============================================

router.get("/contacts", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { listId, search, limit, offset } = req.query;
    const contacts = await waBlastService.getContacts(
      merchantId,
      listId as string,
      search as string,
      Number(limit) || 100,
      Number(offset) || 0
    );
    const total = await waBlastService.getContactCount(merchantId, listId as string);
    res.json({ contacts, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/contacts", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const schema = z.object({
      listId: z.string().optional(),
      phoneNumber: z.string().min(1),
      name: z.string().optional(),
      email: z.string().email().optional(),
      customFields: z.record(z.any()).optional(),
    });
    
    const data = schema.parse(req.body);
    const contact = await waBlastService.createContact({ merchantId, ...data });
    res.json(contact);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/contacts/import", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { listId, contacts } = req.body;
    const count = await waBlastService.importContacts(merchantId, listId, contacts);
    res.json({ imported: count });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/contacts/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    await waBlastService.updateContact(req.params.id, merchantId, req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/contacts/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    await waBlastService.deleteContact(req.params.id, merchantId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/contacts/bulk-delete", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { ids } = req.body;
    await waBlastService.deleteContacts(ids, merchantId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// Template Management
// ============================================

router.get("/templates", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const templates = await waBlastService.getTemplates(merchantId);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/templates", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const schema = z.object({
      name: z.string().min(1),
      category: z.enum(["marketing", "utility", "otp"]),
      content: z.string().min(1),
      mediaType: z.string().optional(),
      mediaUrl: z.string().optional(),
    });
    
    const data = schema.parse(req.body);
    const template = await waBlastService.createTemplate({ merchantId, ...data });
    res.json(template);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/templates/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const template = await waBlastService.updateTemplate(req.params.id, merchantId, req.body);
    res.json(template);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/templates/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    await waBlastService.deleteTemplate(req.params.id, merchantId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// Campaign Management
// ============================================

router.get("/campaigns", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { status } = req.query;
    const campaigns = await waBlastService.getCampaigns(merchantId, status as string);
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/campaigns/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const campaign = await waBlastService.getCampaign(req.params.id, merchantId);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    const stats = await waBlastService.getCampaignStats(req.params.id);
    res.json({ ...campaign, stats });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/campaigns", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const schema = z.object({
      channelId: z.string().min(1),
      templateId: z.string().optional(),
      name: z.string().min(1),
      messageContent: z.string().min(1),
      mediaType: z.string().optional(),
      mediaUrl: z.string().optional(),
      listIds: z.array(z.string()).optional(),
      scheduledAt: z.string().optional(),
      sendDelay: z.number().optional(),
    });
    
    const data = schema.parse(req.body);
    const campaign = await waBlastService.createCampaign({
      merchantId,
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    });
    res.json(campaign);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/campaigns/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const campaign = await waBlastService.updateCampaign(req.params.id, merchantId, req.body);
    res.json(campaign);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/campaigns/:id", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    await waBlastService.deleteCampaign(req.params.id, merchantId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/campaigns/:id/prepare", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { listIds } = req.body;
    const count = await waBlastService.prepareCampaignRecipients(req.params.id, merchantId, listIds || []);
    res.json({ recipientsCount: count });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/campaigns/:id/recipients", requireMerchant, async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = req.query;
    const recipients = await waBlastService.getCampaignRecipients(
      req.params.id,
      status as string,
      Number(limit) || 100,
      Number(offset) || 0
    );
    res.json(recipients);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Campaign Control (Start/Pause/Resume/Stop)
router.post("/campaigns/:id/start", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const result = await waBlastService.startCampaign(req.params.id, merchantId);
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/campaigns/:id/pause", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const result = await waBlastService.pauseCampaign(req.params.id, merchantId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/campaigns/:id/resume", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const result = await waBlastService.resumeCampaign(req.params.id, merchantId);
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/campaigns/:id/stop", requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const result = await waBlastService.stopCampaign(req.params.id, merchantId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// Admin: Pricing Management
// ============================================

router.get("/admin/pricing", requireAdmin, async (req: Request, res: Response) => {
  try {
    const pricing = await waBlastService.getPricing();
    res.json(pricing);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/admin/pricing", requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = req.session!.userId as string;
    const pricing = await waBlastService.updatePricing(req.body, adminId);
    res.json(pricing);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ============================================
// Admin: All Contacts (Master Control)
// ============================================

router.get("/admin/contacts", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { merchantId, search, limit, offset } = req.query;
    const contacts = await waBlastService.getAllContacts({
      merchantId: merchantId as string,
      search: search as string,
      limit: Number(limit) || 100,
      offset: Number(offset) || 0,
    });
    const total = await waBlastService.getAllContactsCount(merchantId as string);
    res.json({ contacts, total });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// Meta Webhook Handler (Incoming Messages)
// ============================================

// Webhook verification (GET request from Meta)
router.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  
  // Verify token should be configured per-merchant or as a global secret
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "chatvice_wa_webhook";
  
  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WA Webhook] Verified successfully");
    return res.status(200).send(challenge);
  }
  
  res.sendStatus(403);
});

// Incoming message webhook (POST request from Meta)
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      console.log("[WA Webhook] Invalid signature, rejecting request");
      return res.sendStatus(403);
    }
    
    const body = req.body;
    
    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }
    
    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;
        
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        
        // Process incoming messages
        for (const message of value.messages || []) {
          await waBlastService.handleIncomingMessage({
            phoneNumberId,
            fromNumber: message.from,
            messageId: message.id,
            timestamp: message.timestamp,
            type: message.type,
            text: message.text?.body,
            mediaId: message.image?.id || message.video?.id || message.document?.id,
          });
        }
        
        // Process status updates (sent, delivered, read)
        for (const status of value.statuses || []) {
          await waBlastService.handleStatusUpdate({
            messageId: status.id,
            status: status.status,
            timestamp: status.timestamp,
            recipientId: status.recipient_id,
            errors: status.errors,
          });
        }
      }
    }
    
    res.sendStatus(200);
  } catch (error: any) {
    console.error("[WA Webhook] Error processing:", error);
    res.sendStatus(500);
  }
});

export default router;
