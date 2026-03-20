import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { execSync } from "child_process";
import { PaymentWebhookHandler, type PaymentWebhookPayload } from './kompasPayWebhook';
import { isPaymentGatewayConfigured, getActiveGatewayName } from './kompasPayClient';
import { storage } from './storage';
import { extractFAQContent } from './crawler';
import { processKnowledgeBase } from './embeddings';
import { fetchGoogleSheet } from './fileParser';
import { generateDailyBlogPosts, seedBlogPostsFromStaticData } from './blog-generator';

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

function killPortProcess(port: number): void {
  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    console.log(`Cleared any existing process on port ${port}`);
  } catch {
    // ignore errors
  }
}

const appPort = parseInt(process.env.PORT || "5000", 10);
if (process.env.NODE_ENV !== "production") {
  killPortProcess(appPort);
}

// Global error handlers for deployment stability
process.on('uncaughtException', (error: NodeJS.ErrnoException) => {
  console.error('Uncaught Exception:', error);
  if (error.code === 'EADDRINUSE') {
    console.error('Port already in use.');
    if (process.env.NODE_ENV !== "production") {
      console.error('Killing and retrying...');
      killPortProcess(appPort);
    }
    return;
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();

// Health check endpoint - must be defined early for deployment health checks
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Also respond to root health check
app.get('/__health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const uploadsPath = path.resolve(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
} catch (error) {
  console.warn('Failed to create uploads directory:', error);
}
app.use("/uploads", express.static(uploadsPath));

// Serve avatar images from public/avatars
const avatarsPath = path.resolve(process.cwd(), "public", "avatars");
app.use("/avatars", express.static(avatarsPath, { maxAge: '1y' }));

// Serve notification sounds from public/sounds
const soundsPath = path.resolve(process.cwd(), "public", "sounds");
app.use("/sounds", express.static(soundsPath, { maxAge: '1y' }));
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initPayment() {
  try {
    const isConfigured = await isPaymentGatewayConfigured();
    if (isConfigured) {
      const gatewayName = await getActiveGatewayName();
      console.log(`${gatewayName} payment gateway configured`);
    } else {
      console.log('Payment gateway not configured, payment features will be limited');
    }
  } catch (error) {
    console.error('Payment gateway initialization error:', error);
    console.log('Continuing without payment gateway...');
  }
}

initPayment();

// Universal payment webhook endpoint
app.post(
  '/api/payment/webhook',
  express.json(),
  async (req, res) => {
    const signature = req.headers['x-signature'] as string || '';
    const timestamp = req.headers['x-timestamp'] as string || '';

    try {
      const payload: PaymentWebhookPayload = req.body;
      const gatewayName = await getActiveGatewayName();
      
      console.log(`Received ${gatewayName} webhook:`, {
        transactionId: payload.transaction_id,
        status: payload.status,
      });

      const result = await PaymentWebhookHandler.processWebhook(payload, signature, timestamp);
      
      if (result.success) {
        res.status(200).json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error: any) {
      console.error('Payment webhook error:', error.message);
      res.status(500).json({ success: false, message: 'Webhook processing error' });
    }
  }
);

// Legacy webhook endpoint (redirect to new endpoint for backward compatibility)
app.post('/api/kompaspay/webhook', express.json(), async (req, res) => {
  const signature = req.headers['x-signature'] as string || '';
  const timestamp = req.headers['x-timestamp'] as string || '';
  
  try {
    const payload: PaymentWebhookPayload = req.body;
    const result = await PaymentWebhookHandler.processWebhook(payload, signature, timestamp);
    
    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error('Payment webhook error:', error.message);
    res.status(500).json({ success: false, message: 'Webhook processing error' });
  }
});

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Add error handler for httpServer
  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use.`);
      if (process.env.NODE_ENV !== "production") {
        killPortProcess(port);
        setTimeout(() => {
          httpServer.close();
          httpServer.listen({ port, host: "0.0.0.0" });
        }, 2000);
      }
    } else {
      console.error('Server error:', error);
      process.exit(1);
    }
  });
  
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
      
      // Start background sync job for crawled links (every 60 minutes)
      startBackgroundSync();
    },
  );
})().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Background sync for crawled website sources
async function syncCrawledLink(linkId: string): Promise<void> {
  try {
    const link = await storage.getCrawledLink(linkId);
    if (!link || !link.isActive || link.status !== "completed") return;
    
    await storage.updateCrawledLink(linkId, { syncStatus: "syncing" });
    
    const result = await extractFAQContent(link.url);
    
    if (!result.success) {
      await storage.updateCrawledLink(linkId, { syncStatus: "error" });
      console.log(`[sync] Failed to sync ${link.url}: ${result.error}`);
      return;
    }
    
    const urlObj = new URL(link.url.startsWith('http') ? link.url : `https://${link.url}`);
    const summarizedContent = result.content || "";
    
    await storage.updateCrawledLink(linkId, {
      extractedContent: result.content,
      summarizedContent,
      lastSyncedAt: new Date(),
      syncStatus: "idle",
    });
    
    let entryFound = false;
    if (link.knowledgeEntryId) {
      const existingEntry = await storage.getKnowledgeEntry(link.knowledgeEntryId);
      if (existingEntry) {
        await storage.updateKnowledgeEntry(link.knowledgeEntryId, { content: summarizedContent });
        entryFound = true;
      }
    }
    if (!entryFound && summarizedContent) {
      const pathSegments = urlObj.pathname.split("/").filter((s: string) => s.length > 0);
      const folderPart = pathSegments.length > 0
        ? pathSegments[pathSegments.length - 1].replace(/[-_]/g, " ").replace(/\.\w+$/, "")
        : "";
      const entryName = folderPart
        ? `${urlObj.hostname} - ${folderPart}`
        : urlObj.hostname;
      const entryId = "ke_" + crypto.randomBytes(8).toString("hex");
      await storage.createKnowledgeEntry({
        id: entryId,
        merchantId: link.merchantId,
        agentId: link.agentId || null,
        name: entryName,
        content: summarizedContent,
        isActive: true,
        isLinked: false,
        sortOrder: 0,
      });
      await storage.updateCrawledLink(linkId, { knowledgeEntryId: entryId });
    }

    const allAgents = await storage.getAgents(link.merchantId);
    for (const agent of allAgents) {
      const combinedContent = await storage.getAllActiveKnowledgeContent(link.merchantId, agent.id);
      await storage.setKnowledge(link.merchantId, combinedContent || "", agent.id);
      processKnowledgeBase(link.merchantId, combinedContent || "", agent.id).catch(err => {
        console.error("[sync] Error processing knowledge embeddings:", err);
      });
    }
    
    console.log(`[sync] Successfully synced ${link.url}`);
  } catch (error) {
    console.error(`[sync] Error syncing link ${linkId}:`, error);
    await storage.updateCrawledLink(linkId, { syncStatus: "error" }).catch(() => {});
  }
}

async function runBackgroundSync(): Promise<void> {
  try {
    const linksToSync = await storage.getActiveCrawledLinksForSync();
    
    if (linksToSync.length === 0) return;
    
    console.log(`[sync] Starting background sync for ${linksToSync.length} sources`);
    
    // Process links sequentially to avoid rate limiting
    for (const link of linksToSync) {
      await syncCrawledLink(link.id);
      // Small delay between syncs to be gentle on external servers
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log(`[sync] Background sync completed`);
  } catch (error) {
    console.error("[sync] Background sync error:", error);
  }
}

// Automatic chat cleanup - archive expired sessions and create chat logs
async function runAutomaticChatCleanup(): Promise<void> {
  try {
    console.log("[cleanup] Starting automatic chat cleanup");
    
    const merchants = await storage.getAllMerchants();
    let totalArchived = 0;
    
    for (const merchant of merchants) {
      try {
        // Get retention hours based on plan
        const planId = merchant.subscriptionPlanId || 'free';
        // Free plan: 1 hour, Starter: 24 hours, Pro: 48 hours, Enterprise: 168 hours (7 days), Custom: Enterprise-level
        const retentionMap: Record<string, number> = {
          free: 1,
          starter: 24,
          pro: 48,
          enterprise: 168,
          custom: 168, // Custom plans get same retention as Enterprise
        };
        const retentionHours = retentionMap[planId] || 168; // Default to Enterprise-level retention for unknown plans
        
        const expiredSessions = await storage.getExpiredSessions(merchant.id, retentionHours);
        
        for (const session of expiredSessions) {
          const messages = await storage.getMessages(session.id);
          
          if (messages.length === 0) continue;
          
          // Generate full transcript
          const transcript = messages.map(m => {
            const sender = m.from === 'user' || m.from === 'customer' ? (session.customerName || 'Customer') : 
                           m.from === 'chatvice' || m.from === 'ai' ? 'AI Assistant' : 'Supervisor';
            const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '';
            return `[${time}] ${sender}: ${m.content}`;
          }).join('\n');
          
          // Generate simple summary
          const summary = `Chat session with ${messages.length} messages. ${
            session.mode === 'HUMAN' ? 'Escalated to supervisor.' : 'Handled by AI.'
          }`;
          
          // Create chat log (includes deviceFingerprint for session continuity lookup)
          await storage.createChatLog({
            merchantId: merchant.id,
            sessionId: session.id,
            agentId: session.agentId || null,
            supervisorId: session.supervisorId || null,
            customerName: session.customerName || null,
            customerEmail: session.customerEmail || null,
            deviceFingerprint: session.deviceFingerprint || null,
            summary,
            messageCount: messages.length,
            fullTranscript: transcript,
            extractedKnowledge: null,
            sessionStartedAt: session.createdAt || null,
            sessionEndedAt: session.lastActivity || null,
          });
          
          // Delete messages but keep session
          await storage.deleteSessionMessages(session.id);
          await storage.updateSession(session.id, { status: 'archived' });
          totalArchived++;
        }
      } catch (merchantError) {
        console.error(`[cleanup] Error processing merchant ${merchant.id}:`, merchantError);
      }
    }
    
    if (totalArchived > 0) {
      console.log(`[cleanup] Archived ${totalArchived} expired sessions`);
    }
  } catch (error) {
    console.error("[cleanup] Automatic chat cleanup error:", error);
  }
}

// Sync sources to agent knowledge content
async function syncSourceToKnowledge(sourceId: string): Promise<void> {
  try {
    const source = await storage.getSource(sourceId);
    if (!source || !source.isActive || !source.syncEnabled || !source.agentId) return;
    
    await storage.updateSource(sourceId, { syncStatus: "syncing" });
    
    const agentId = source.agentId;
    const sourceName = source.name;
    const sourceContent = source.content || "";
    
    if (!sourceContent.trim()) {
      await storage.updateSource(sourceId, { syncStatus: "idle", lastSyncedAt: new Date() });
      return;
    }
    
    // Get existing knowledge and update with source content
    const existingKnowledge = await storage.getKnowledgeByAgent(agentId);
    const existingContent = existingKnowledge?.content || "";
    
    const sourceMarker = `\n\n---\n[Source: ${sourceName}]\n`;
    const escapedName = sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const newContent = existingContent.includes(`[Source: ${sourceName}]`)
      ? existingContent.replace(
          new RegExp(`\\n\\n---\\n\\[Source: ${escapedName}\\][\\s\\S]*?(?=\\n\\n---\\n\\[Source:|$)`, 'g'),
          `${sourceMarker}${sourceContent}`
        )
      : existingContent + sourceMarker + sourceContent;
    
    await storage.setKnowledge(source.merchantId, newContent, agentId);
    await storage.updateSource(sourceId, { syncStatus: "idle", lastSyncedAt: new Date() });
    
    // Process embeddings
    processKnowledgeBase(source.merchantId, newContent, agentId).catch(err => {
      console.error("[source-sync] Error processing knowledge embeddings:", err);
    });
    
    console.log(`[source-sync] Synced source "${sourceName}" to agent ${agentId}`);
  } catch (error) {
    console.error(`[source-sync] Error syncing source ${sourceId}:`, error);
    await storage.updateSource(sourceId, { syncStatus: "error" }).catch(() => {});
  }
}

async function runSourceSync(): Promise<void> {
  try {
    const activeSources = await storage.getActiveSourcesForSync();
    const sourcesToSync = activeSources.filter(s => s.agentId);
    
    if (sourcesToSync.length === 0) return;
    
    console.log(`[source-sync] Starting sync for ${sourcesToSync.length} sources`);
    
    for (const source of sourcesToSync) {
      await syncSourceToKnowledge(source.id);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`[source-sync] Source sync completed`);
  } catch (error) {
    console.error("[source-sync] Source sync error:", error);
  }
}

// Check if product source needs re-crawling based on frequency
function shouldRecrawlProductSource(source: any): boolean {
  if (!source.lastCrawledAt) return true;
  
  const now = new Date();
  const lastCrawl = new Date(source.lastCrawledAt);
  const hoursSinceLastCrawl = (now.getTime() - lastCrawl.getTime()) / (1000 * 60 * 60);
  
  switch (source.crawlFrequency) {
    case "daily":
      return hoursSinceLastCrawl >= 24;
    case "weekly":
      return hoursSinceLastCrawl >= 168; // 7 days
    default:
      return false;
  }
}

async function runProductSourceSync(): Promise<void> {
  try {
    const activeSources = await storage.getActiveProductCrawlSourcesForSync();
    const sourcesToCrawl = activeSources.filter(shouldRecrawlProductSource);
    
    if (sourcesToCrawl.length === 0) return;
    
    console.log(`[product-sync] Marking ${sourcesToCrawl.length} product sources as due for re-crawl`);
    
    for (const source of sourcesToCrawl) {
      // Mark source as needing re-crawl by setting syncStatus
      // The actual crawl must be triggered manually by merchant due to:
      // 1. Puppeteer resource usage
      // 2. OpenAI Vision API costs
      // 3. Products require human review before approval
      await storage.updateProductCrawlSource(source.id, { 
        status: "pending",
        lastCrawledAt: new Date() // Reset to prevent re-triggering
      });
      console.log(`[product-sync] Source "${source.url}" marked for re-crawl`);
    }
  } catch (error) {
    console.error("[product-sync] Product source sync error:", error);
  }
}

async function runGoogleSheetFastSync(): Promise<void> {
  try {
    const sheetSources = await storage.getGoogleSheetSourcesForFastSync();
    const sourcesToSync = sheetSources.filter(s => s.agentId && s.url);

    if (sourcesToSync.length === 0) return;

    console.log(`[fast-sync] Starting Google Sheet fast sync for ${sourcesToSync.length} sources`);

    for (const source of sourcesToSync) {
      try {
        await storage.updateSource(source.id, { syncStatus: "syncing" });

        const result = await fetchGoogleSheet(source.url!);

        if (!result.success) {
          await storage.updateSource(source.id, { syncStatus: "error" });
          console.log(`[fast-sync] Failed to sync Google Sheet "${source.name}": ${result.error}`);
          continue;
        }

        const newContent = result.content || "";

        if (newContent === source.content) {
          await storage.updateSource(source.id, { syncStatus: "idle", lastSyncedAt: new Date() });
          continue;
        }

        await storage.updateSource(source.id, {
          content: newContent,
          charCount: newContent.length,
          syncStatus: "idle",
          lastSyncedAt: new Date(),
        });

        const agentId = source.agentId!;
        const sourceName = source.name;

        const existingKnowledge = await storage.getKnowledgeByAgent(agentId);
        const existingContent = existingKnowledge?.content || "";

        const sourceMarker = `\n\n---\n[Source: ${sourceName}]\n`;
        const escapedName = sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const updatedKnowledge = existingContent.includes(`[Source: ${sourceName}]`)
          ? existingContent.replace(
              new RegExp(`\\n\\n---\\n\\[Source: ${escapedName}\\][\\s\\S]*?(?=\\n\\n---\\n\\[Source:|$)`, 'g'),
              `${sourceMarker}${newContent}`
            )
          : existingContent + sourceMarker + newContent;

        await storage.setKnowledge(source.merchantId, updatedKnowledge, agentId);

        processKnowledgeBase(source.merchantId, updatedKnowledge, agentId).catch(err => {
          console.error("[fast-sync] Error processing knowledge embeddings:", err);
        });

        console.log(`[fast-sync] Synced Google Sheet "${sourceName}" to agent ${agentId}`);
      } catch (sourceError) {
        console.error(`[fast-sync] Error syncing source ${source.id}:`, sourceError);
        await storage.updateSource(source.id, { syncStatus: "error" }).catch(() => {});
      }
    }

    console.log(`[fast-sync] Google Sheet fast sync completed`);
  } catch (error) {
    console.error("[fast-sync] Google Sheet fast sync error:", error);
  }
}

export async function syncSingleGoogleSheetSource(sourceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const source = await storage.getSource(sourceId);
    if (!source || source.sourceSubtype !== "google_sheet") {
      return { success: false, error: "Source not found or not a Google Sheet" };
    }
    if (!source.url) {
      return { success: false, error: "Source missing URL" };
    }

    await storage.updateSource(source.id, { syncStatus: "syncing" });

    const result = await fetchGoogleSheet(source.url);
    if (!result.success) {
      await storage.updateSource(source.id, { syncStatus: "error" });
      return { success: false, error: result.error || "Failed to fetch Google Sheet" };
    }

    const newContent = result.content || "";

    await storage.updateSource(source.id, {
      content: newContent,
      charCount: newContent.length,
      syncStatus: "idle",
      lastSyncedAt: new Date(),
    });

    if (source.agentId) {
      const agentId = source.agentId;
      const sourceName = source.name;
      const existingKnowledge = await storage.getKnowledgeByAgent(agentId);
      const existingContent = existingKnowledge?.content || "";
      const sourceMarker = `\n\n---\n[Source: ${sourceName}]\n`;
      const escapedName = sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const updatedKnowledge = existingContent.includes(`[Source: ${sourceName}]`)
        ? existingContent.replace(
            new RegExp(`\\n\\n---\\n\\[Source: ${escapedName}\\][\\s\\S]*?(?=\\n\\n---\\n\\[Source:|$)`, 'g'),
            `${sourceMarker}${newContent}`
          )
        : existingContent + sourceMarker + newContent;

      await storage.setKnowledge(source.merchantId, updatedKnowledge, agentId);
      processKnowledgeBase(source.merchantId, updatedKnowledge, agentId).catch(() => {});
    }

    return { success: true };
  } catch (error: any) {
    await storage.updateSource(sourceId, { syncStatus: "error" }).catch(() => {});
    return { success: false, error: error.message || "Sync failed" };
  }
}

let googleSheetFastSyncRunning = false;

async function runGoogleSheetFastSyncJob(): Promise<void> {
  if (googleSheetFastSyncRunning) return;
  googleSheetFastSyncRunning = true;
  try {
    await runGoogleSheetFastSync();
  } catch (error) {
    console.error("[fast-sync] Fast sync job error:", error);
  } finally {
    googleSheetFastSyncRunning = false;
  }
}

let backgroundJobsRunning = false;

async function runAllBackgroundJobs(): Promise<void> {
  if (backgroundJobsRunning) {
    console.log("[sync] Background jobs already running, skipping");
    return;
  }
  backgroundJobsRunning = true;
  try {
    await runBackgroundSync();
    await runSourceSync();
    await runProductSourceSync();
    await runAutomaticChatCleanup();
  } catch (error) {
    console.error("[sync] Background jobs error:", error);
  } finally {
    backgroundJobsRunning = false;
  }
}

async function migrateLegacyCrawledLinks(): Promise<void> {
  try {
    const legacyLinks = await storage.getLegacyCrawledLinks();
    if (legacyLinks.length === 0) return;

    console.log(`[migration] Found ${legacyLinks.length} legacy crawled links without knowledge entries`);
    const affectedMerchantIds = new Set<string>();

    for (const link of legacyLinks) {
      if (!link.summarizedContent) continue;

      const urlObj = new URL(link.url.startsWith('http') ? link.url : `https://${link.url}`);
      const pathSegments = urlObj.pathname.split("/").filter((s: string) => s.length > 0);
      const folderPart = pathSegments.length > 0
        ? pathSegments[pathSegments.length - 1].replace(/[-_]/g, " ").replace(/\.\w+$/, "")
        : "";
      const entryName = folderPart
        ? `${urlObj.hostname} - ${folderPart}`
        : urlObj.hostname;

      const entryId = "ke_" + crypto.randomBytes(8).toString("hex");
      await storage.createKnowledgeEntry({
        id: entryId,
        merchantId: link.merchantId,
        agentId: link.agentId || null,
        name: entryName,
        content: link.summarizedContent,
        isActive: true,
        isLinked: false,
        sortOrder: 0,
      });
      await storage.updateCrawledLink(link.id, { knowledgeEntryId: entryId });
      affectedMerchantIds.add(link.merchantId);
      console.log(`[migration] Created entry "${entryName}" for ${link.url}`);
    }

    for (const merchantId of affectedMerchantIds) {
      const allAgents = await storage.getAgents(merchantId);
      for (const agent of allAgents) {
        const combinedContent = await storage.getAllActiveKnowledgeContent(merchantId, agent.id);
        await storage.setKnowledge(merchantId, combinedContent || "", agent.id);
        processKnowledgeBase(merchantId, combinedContent || "", agent.id).catch(err => {
          console.error("[migration] Error processing embeddings:", err);
        });
      }
    }

    console.log(`[migration] Completed migration for ${legacyLinks.length} links across ${affectedMerchantIds.size} merchants`);
  } catch (error) {
    console.error("[migration] Legacy crawled links migration error:", error);
  }
}

function scheduleDailyBlogGeneration(): void {
  const now = new Date();
  const next01UTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + (now.getUTCHours() >= 1 ? 1 : 0),
    1, 0, 0, 0,
  ));
  const msUntilNext = next01UTC.getTime() - now.getTime();
  console.log(`[blog-gen] Next daily generation scheduled in ${Math.round(msUntilNext / 60000)} minutes`);
  setTimeout(() => {
    generateDailyBlogPosts().catch(err => console.error("[blog-gen] Scheduled generation error:", err));
    setInterval(() => {
      generateDailyBlogPosts().catch(err => console.error("[blog-gen] Scheduled generation error:", err));
    }, 24 * 60 * 60 * 1000);
  }, msUntilNext);
}

function startBackgroundSync(): void {
  setTimeout(() => migrateLegacyCrawledLinks(), 3000);
  setTimeout(() => runAllBackgroundJobs(), 5 * 60 * 1000);
  setInterval(() => runAllBackgroundJobs(), 60 * 60 * 1000);
  console.log("[sync] Background sync scheduler started (60 min interval)");

  setInterval(() => runGoogleSheetFastSyncJob(), 10 * 1000);
  console.log("[fast-sync] Google Sheet fast sync scheduler started (10s interval)");

  setTimeout(() => seedBlogPostsFromStaticData().catch(err => console.error("[blog-gen] Seed error:", err)), 8000);
  scheduleDailyBlogGeneration();
}
