import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { PaymentWebhookHandler, type PaymentWebhookPayload } from './kompasPayWebhook';
import { isPaymentGatewayConfigured, getActiveGatewayName } from './kompasPayClient';
import { storage } from './storage';
import { extractFAQContent } from './crawler';
import { processKnowledgeBase } from './embeddings';

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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
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
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      // Start background sync job for crawled links (every 60 minutes)
      startBackgroundSync();
    },
  );
})();

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
    
    // Update the knowledge base if we have an agent
    const agentId = link.agentId;
    if (agentId && summarizedContent) {
      const existingKnowledge = await storage.getKnowledgeByAgent(agentId);
      const existingContent = existingKnowledge?.content || "";
      
      const urlMarker = `\n\n---\n[Source: ${urlObj.hostname}]\n`;
      const newContent = existingContent.includes(`[Source: ${urlObj.hostname}]`) 
        ? existingContent.replace(
            new RegExp(`\\n\\n---\\n\\[Source: ${urlObj.hostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\][\\s\\S]*?(?=\\n\\n---\\n\\[Source:|$)`, 'g'),
            `${urlMarker}${summarizedContent}`
          )
        : existingContent + urlMarker + summarizedContent;
      
      await storage.setKnowledge(link.merchantId, newContent, agentId);
      
      processKnowledgeBase(link.merchantId, newContent, agentId).catch(err => {
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

function startBackgroundSync(): void {
  // Run initial sync after 5 minutes of startup
  setTimeout(() => {
    runBackgroundSync();
  }, 5 * 60 * 1000);
  
  // Then run every 60 minutes
  setInterval(() => {
    runBackgroundSync();
  }, 60 * 60 * 1000);
  
  console.log("[sync] Background sync scheduler started (60 min interval)");
}
