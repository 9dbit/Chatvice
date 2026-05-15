import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { verifyHmacSignature, encryptCredential, decryptCredential, generateWebhookSecret, maskEmail, maskPhone, maskBankAccount } from "./services/gaming/cryptoHelpers";
import type { GamingMerchant, GamingPlayerMapping, GamingWithdraw, GamingWebhookLog, GamingFailedEvent } from "../shared/schema";

// ── Middleware ────────────────────────────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session.userType !== "admin" || !req.session.isAdmin) {
    return res.status(401).json({ error: "Unauthorized - Admin access required" });
  }
  next();
}

// ── Sensitive field masking for API responses ────────────────────────────────

function maskPlayerMapping(row: GamingPlayerMapping) {
  return {
    ...row,
    email: row.email ? maskEmail(row.email) : null,
    phoneNumber: row.phoneNumber ? maskPhone(row.phoneNumber) : null,
  };
}

function maskWithdrawal(row: GamingWithdraw) {
  return {
    ...row,
    accountNumberMasked: row.accountNumberMasked ?? null,
  };
}

// Recursively sanitize a webhook/failed-event payload object, masking PII fields.
const PII_KEYS = new Set(["email", "phone", "phone_number", "account_number", "bank_account", "card_number", "nric", "ktp"]);

function sanitizePayload(obj: unknown, depth = 0): unknown {
  if (depth > 8 || obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map((item) => sanitizePayload(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (PII_KEYS.has(lower)) {
      if (typeof v === "string" && v.length > 0) {
        if (lower === "email" || (lower.includes("email") && v.includes("@"))) {
          out[k] = maskEmail(v);
        } else if (lower.includes("phone") || lower.includes("number")) {
          out[k] = maskPhone(v);
        } else {
          out[k] = maskBankAccount(v);
        }
      } else {
        out[k] = v;
      }
    } else {
      out[k] = sanitizePayload(v, depth + 1);
    }
  }
  return out;
}

function sanitizeWebhookLog(row: GamingWebhookLog) {
  return { ...row, payload: row.payload ? sanitizePayload(row.payload) : null };
}

function sanitizeFailedEvent(row: GamingFailedEvent) {
  return { ...row, payload: row.payload ? sanitizePayload(row.payload) : null };
}

// ── Webhook Event Processor ───────────────────────────────────────────────────
// Handles all 12 canonical event types.
// Returns true on success, false on failure (never throws — callers check return value).

async function processGamingWebhookEvent(
  merchantId: string,
  eventType: string,
  eventId: string,
  payload: Record<string, unknown>,
  logId: number,
): Promise<boolean> {
  try {
    switch (eventType) {
      // ── Deposit events (5 types) ──────────────────────────────────────────
      case "deposit.created":
      case "deposit.updated":
      case "deposit.paid":
      case "deposit.expired":
      case "deposit.cancelled": {
        await storage.upsertGamingDeposit({
          merchantId,
          transactionId: payload.transaction_id ?? payload.transactionId ?? eventId,
          playerId: payload.player_id ?? payload.playerId,
          username: payload.username,
          amount: payload.amount ? Number(payload.amount) : undefined,
          currency: payload.currency ?? "IDR",
          paymentMethod: payload.payment_method ?? payload.paymentMethod,
          paymentChannel: payload.payment_channel ?? payload.paymentChannel,
          status: payload.status ?? eventType.split(".")[1],
          proofUrl: payload.proof_url ?? payload.proofUrl,
          paidAt: payload.paid_at ? new Date(payload.paid_at) : undefined,
          expiredAt: payload.expired_at ? new Date(payload.expired_at) : undefined,
          rawPayload: payload,
        });
        break;
      }

      // ── Withdraw events (5 types) ─────────────────────────────────────────
      case "withdraw.requested":
      case "withdraw.approved":
      case "withdraw.rejected":
      case "withdraw.processing":
      case "withdraw.completed": {
        await storage.upsertGamingWithdrawal({
          merchantId,
          withdrawId: payload.withdraw_id ?? payload.withdrawId ?? eventId,
          playerId: payload.player_id ?? payload.playerId,
          username: payload.username,
          amount: payload.amount ? Number(payload.amount) : undefined,
          currency: payload.currency ?? "IDR",
          bankName: payload.bank_name ?? payload.bankName,
          accountName: payload.account_name ?? payload.accountName,
          accountNumberMasked: payload.account_number
            ? maskBankAccount(payload.account_number)
            : (payload.account_number_masked ?? payload.accountNumberMasked),
          status: payload.status ?? eventType.split(".")[1],
          rejectedReason: payload.rejected_reason ?? payload.rejectedReason,
          approvedAt: payload.approved_at ? new Date(payload.approved_at) : undefined,
          rejectedAt: payload.rejected_at ? new Date(payload.rejected_at) : undefined,
          rawPayload: payload,
        });
        break;
      }

      // ── Turnover event (1 type) ───────────────────────────────────────────
      case "turnover.updated": {
        const required = Number(payload.required_turnover ?? payload.requiredTurnover ?? 0);
        const current = Number(payload.current_turnover ?? payload.currentTurnover ?? 0);
        const remaining = Math.max(0, required - current);
        const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 100;
        await storage.upsertGamingTurnover({
          merchantId,
          playerId: payload.player_id ?? payload.playerId,
          username: payload.username,
          bonusId: payload.bonus_id ?? payload.bonusId,
          bonusName: payload.bonus_name ?? payload.bonusName,
          requiredTurnover: required,
          currentTurnover: current,
          remainingTurnover: remaining,
          progressPercentage: pct,
          eligibleWithdraw: pct >= 100,
          expiryDate: payload.expiry_date ? new Date(payload.expiry_date) : undefined,
          status: payload.status ?? "active",
          rawPayload: payload,
        });
        break;
      }

      // ── Balance event (1 type) ────────────────────────────────────────────
      case "balance.updated": {
        await storage.createGamingBalanceSnapshot({
          merchantId,
          playerId: payload.player_id ?? payload.playerId,
          username: payload.username,
          currentBalance: payload.current_balance != null ? Number(payload.current_balance) : undefined,
          lockedBalance: payload.locked_balance != null ? Number(payload.locked_balance) : undefined,
          bonusBalance: payload.bonus_balance != null ? Number(payload.bonus_balance) : undefined,
          currency: payload.currency ?? "IDR",
          source: "webhook",
          rawPayload: payload,
        });
        break;
      }

      default:
        console.log(`[gaming-webhook] Unhandled event type: ${eventType}`);
    }

    await storage.updateGamingWebhookLog(logId, { status: "processed", processedAt: new Date() });
    return true;
  } catch (err: any) {
    console.error(`[gaming-webhook] Error processing event ${eventType}:`, err.message);
    await storage.updateGamingWebhookLog(logId, { status: "failed", errorMessage: err.message });
    await storage.createGamingFailedEvent({
      merchantId,
      eventType,
      payload: { eventId, ...payload },
      failureReason: err.message,
      retryCount: 0,
      status: "pending",
      nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    return false;
  }
}

// ── Route Registration ────────────────────────────────────────────────────────

export function registerGamingRoutes(app: Express) {
  // ── Public Webhook Receiver ─────────────────────────────────────────────────
  app.post("/api/webhooks/gaming/events", async (req: Request, res: Response) => {
    const merchantId = req.headers["x-chatvice-merchant-id"] as string;
    const signature = req.headers["x-chatvice-signature"] as string;
    const timestamp = req.headers["x-chatvice-timestamp"] as string;
    const eventId = req.headers["x-chatvice-event-id"] as string;

    if (!merchantId || !signature || !timestamp) {
      return res.status(400).json({ error: "Missing required headers" });
    }

    // Strict timestamp validation — reject missing, non-numeric, or out-of-tolerance values
    const tsNum = Number(timestamp);
    if (!timestamp || isNaN(tsNum) || tsNum <= 0) {
      return res.status(400).json({ error: "Invalid or missing timestamp header" });
    }
    const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000; // normalise seconds → ms
    if (Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
      return res.status(400).json({ error: "Timestamp out of tolerance (±5 minutes)" });
    }

    // Verify merchant config exists
    const config = await storage.getGamingMerchantByMerchantId(merchantId);
    if (!config || !config.webhookSecret) {
      return res.status(403).json({ error: "Unknown merchant or missing webhook secret" });
    }

    // Decrypt stored webhook secret — reject if decryption yields empty (corrupt/missing)
    const webhookSecret = decryptCredential(config.webhookSecret);
    if (!webhookSecret) {
      console.error(`[gaming-webhook] Decrypt failed for merchant ${merchantId} — webhook_secret may be corrupted`);
      return res.status(500).json({ error: "Webhook secret configuration error" });
    }

    // HMAC verification against raw request bytes — MUST happen before any business logic
    const rawBodyBuf = (req as unknown as { rawBody?: Buffer }).rawBody;
    const rawBodyForVerify: Buffer | string = Buffer.isBuffer(rawBodyBuf) ? rawBodyBuf : JSON.stringify(req.body);
    const sigValid = verifyHmacSignature(rawBodyForVerify, signature, webhookSecret);
    if (!sigValid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // IP whitelist enforcement — skip when list is empty (open access)
    const whitelist: string[] = Array.isArray(config.ipWhitelist) ? (config.ipWhitelist as string[]) : [];
    if (whitelist.length > 0) {
      const callerIp = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "";
      if (!whitelist.includes(callerIp)) {
        console.warn(`[gaming-webhook] Rejected IP ${callerIp} for merchant ${merchantId} — not in whitelist`);
        return res.status(403).json({ error: "Caller IP not whitelisted" });
      }
    }

    const payload = req.body as Record<string, unknown>;
    const eventType = payload?.event_type ?? payload?.eventType ?? "unknown";

    // Resolve event ID from header first, then fall back to payload field
    const resolvedEventId = (eventId || payload?.event_id || payload?.eventId || "") as string;

    // Log incoming webhook — use DB-level unique constraint on (merchant_id, event_id)
    // for race-safe deduplication: a duplicate event_id will throw a unique violation
    // which we catch below instead of doing a separate read-then-insert.
    let log: Awaited<ReturnType<typeof storage.createGamingWebhookLog>>;
    try {
      log = await storage.createGamingWebhookLog({
        merchantId,
        eventType,
        eventId: resolvedEventId || null,
        playerId: payload?.player_id ?? payload?.playerId ?? null,
        transactionId: payload?.transaction_id ?? payload?.transactionId ?? null,
        payload,
        signatureValid: true,
        status: "pending",
        errorMessage: null,
      });
    } catch (insertErr: any) {
      // Postgres unique violation = 23505; treat as a duplicate event
      if (insertErr?.code === "23505" && resolvedEventId) {
        return res.status(200).json({ status: "duplicate", message: "Event already processed" });
      }
      throw insertErr;
    }

    // Respond fast, process async
    res.status(200).json({ status: "received", logId: log.id });

    // Process in background
    setImmediate(() => processGamingWebhookEvent(merchantId, eventType, resolvedEventId, payload, log.id));
  });

  // ── Admin Endpoints ─────────────────────────────────────────────────────────

  app.get("/api/admin/gaming/merchants", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId } = req.query;
      let rows;
      if (merchantId) {
        rows = await storage.getGamingMerchants(merchantId as string);
      } else {
        const { db } = await import("./db");
        const { gamingMerchants } = await import("@shared/schema");
        const { desc } = await import("drizzle-orm");
        rows = await db.select().from(gamingMerchants).orderBy(desc(gamingMerchants.createdAt));
      }
      const sanitized = rows.map((r) => ({
        ...r,
        apiKeyEncrypted: r.apiKeyEncrypted ? "***" : null,
        apiSecretEncrypted: r.apiSecretEncrypted ? "***" : null,
        webhookSecret: r.webhookSecret ? "***" : null,
      }));
      res.json(sanitized);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/gaming/merchants/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const row = await storage.getGamingMerchant(id);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json({
        ...row,
        apiKeyEncrypted: row.apiKeyEncrypted ? "***" : null,
        apiSecretEncrypted: row.apiSecretEncrypted ? "***" : null,
        webhookSecret: row.webhookSecret ? "***" : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const upsertGamingMerchantSchema = z.object({
    merchantId: z.string().min(1),
    merchantName: z.string().min(1),
    brandName: z.string().optional(),
    apiBaseUrl: z.string().url(),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    ipWhitelist: z.array(z.string()).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  });

  app.post("/api/admin/gaming/merchants", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = upsertGamingMerchantSchema.parse(req.body);
      const plaintextSecret = generateWebhookSecret();
      const row = await storage.createGamingMerchant({
        merchantId: body.merchantId,
        merchantName: body.merchantName,
        brandName: body.brandName,
        apiBaseUrl: body.apiBaseUrl,
        apiKeyEncrypted: body.apiKey ? encryptCredential(body.apiKey) : undefined,
        apiSecretEncrypted: body.apiSecret ? encryptCredential(body.apiSecret) : undefined,
        webhookSecret: encryptCredential(plaintextSecret),
        ipWhitelist: body.ipWhitelist ?? [],
        status: body.status ?? "active",
      });
      res.status(201).json({
        ...row,
        apiKeyEncrypted: "***",
        apiSecretEncrypted: "***",
        webhookSecret: "***",
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/gaming/merchants/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const body = upsertGamingMerchantSchema.partial().parse(req.body);
      const updates: any = {};
      if (body.merchantName) updates.merchantName = body.merchantName;
      if (body.brandName !== undefined) updates.brandName = body.brandName;
      if (body.apiBaseUrl) updates.apiBaseUrl = body.apiBaseUrl;
      if (body.apiKey) updates.apiKeyEncrypted = encryptCredential(body.apiKey);
      if (body.apiSecret) updates.apiSecretEncrypted = encryptCredential(body.apiSecret);
      if (body.ipWhitelist) updates.ipWhitelist = body.ipWhitelist;
      if (body.status) updates.status = body.status;
      const row = await storage.updateGamingMerchant(id, updates);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json({ ...row, apiKeyEncrypted: "***", apiSecretEncrypted: "***", webhookSecret: "***" });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: err.message });
    }
  });

  // Rotate webhook secret — stores new secret encrypted; credential never returned in response
  app.post("/api/admin/gaming/merchants/:id/rotate-secret", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const row = await storage.updateGamingMerchant(id, { webhookSecret: encryptCredential(generateWebhookSecret()) });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json({ success: true, webhookSecret: "***", message: "Webhook secret rotated. Configure the new secret via your panel integration settings." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/gaming/merchants/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteGamingMerchant(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Player mappings — email and phone masked in responses
  app.get("/api/admin/gaming/players", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const rows = await storage.getGamingPlayerMappings(merchantId as string);
      res.json(rows.map(maskPlayerMapping));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/gaming/players", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = z.object({
        merchantId: z.string(),
        gamingUsername: z.string().min(1),
        gamingPlayerId: z.string().optional(),
        chatviceUserId: z.string().optional(),
        phoneNumber: z.string().optional(),
        email: z.string().email().optional(),
        verifiedStatus: z.enum(["unverified", "verified", "suspended"]).optional(),
      }).parse(req.body);
      const row = await storage.createGamingPlayerMapping(body);
      res.status(201).json(maskPlayerMapping(row));
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/gaming/players/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const row = await storage.updateGamingPlayerMapping(id, req.body);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(maskPlayerMapping(row));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/gaming/players/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteGamingPlayerMapping(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Deposits
  app.get("/api/admin/gaming/deposits", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId, status } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const rows = await storage.getGamingDeposits(merchantId as string, status as string | undefined);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Withdrawals — account numbers already masked in DB
  app.get("/api/admin/gaming/withdrawals", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId, status } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const rows = await storage.getGamingWithdrawals(merchantId as string, status as string | undefined);
      res.json(rows.map(maskWithdrawal));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Turnovers
  app.get("/api/admin/gaming/turnovers", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId, playerId } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const rows = await storage.getGamingTurnovers(merchantId as string, playerId as string | undefined);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Balance Snapshots
  app.get("/api/admin/gaming/balances", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId, playerId } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const rows = await storage.getGamingBalanceSnapshots(merchantId as string, playerId as string | undefined);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Webhook Logs — raw payloads sanitized before returning
  app.get("/api/admin/gaming/webhook-logs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId, limit } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const rows = await storage.getGamingWebhookLogs(merchantId as string, limit ? Number(limit) : 100);
      res.json(rows.map(sanitizeWebhookLog));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Failed Events — raw payloads sanitized before returning
  app.get("/api/admin/gaming/failed-events", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId, status } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const rows = await storage.getGamingFailedEvents(merchantId as string, status as string | undefined);
      res.json(rows.map(sanitizeFailedEvent));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/gaming/failed-events/:id/retry", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getGamingFailedEvent(id);
      if (!existing) return res.status(404).json({ error: "Not found" });

      // Mark as retrying
      const row = await storage.updateGamingFailedEvent(id, {
        status: "retrying",
        retryCount: (existing.retryCount ?? 0) + 1,
        nextRetryAt: null,
      });

      // Re-dispatch the event processor immediately (non-blocking)
      const eventPayload = existing.payload as any;
      const eventId = eventPayload?.eventId ?? `retry-${id}`;
      const logRow = await storage.createGamingWebhookLog({
        merchantId: existing.merchantId,
        eventType: existing.eventType,
        eventId: `retry-${id}-${Date.now()}`,
        playerId: eventPayload?.player_id ?? eventPayload?.playerId ?? null,
        transactionId: eventPayload?.transaction_id ?? eventPayload?.transactionId ?? null,
        payload: eventPayload,
        signatureValid: true,
        status: "pending",
        errorMessage: null,
      });
      setImmediate(async () => {
        const success = await processGamingWebhookEvent(existing.merchantId, existing.eventType, eventId, eventPayload, logRow.id);
        // Only mark resolved when processor actually succeeds
        if (success) {
          await storage.updateGamingFailedEvent(id, { status: "resolved" });
        } else {
          await storage.updateGamingFailedEvent(id, {
            status: "failed",
            nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
          });
        }
      });

      res.json({ ...row, dispatched: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Health
  app.get("/api/admin/gaming/health", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const [logs, summary] = await Promise.all([
        storage.getGamingApiHealthLogs(merchantId as string, 50),
        storage.getGamingApiHealthSummary(merchantId as string),
      ]);
      res.json({ summary, logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Response Rules
  app.get("/api/admin/gaming/ai-rules", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId, eventType } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const rows = await storage.getGamingAiResponseRules(merchantId as string, eventType as string | undefined);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/gaming/ai-rules", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = z.object({
        merchantId: z.string(),
        eventType: z.string().min(1),
        conditionKey: z.string().optional(),
        conditionOperator: z.string().optional(),
        conditionValue: z.string().optional(),
        responseTemplate: z.string().min(1),
        escalationRequired: z.boolean().optional(),
        active: z.boolean().optional(),
      }).parse(req.body);
      const row = await storage.createGamingAiResponseRule(body);
      res.status(201).json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/gaming/ai-rules/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const row = await storage.updateGamingAiResponseRule(id, req.body);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/gaming/ai-rules/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteGamingAiResponseRule(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Integration Tasks
  app.get("/api/admin/gaming/tasks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const rows = await storage.getGamingIntegrationTasks(status as string | undefined);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/gaming/tasks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = z.object({
        category: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        status: z.enum(["backlog", "todo", "in_progress", "done", "cancelled"]).optional(),
        ownerRole: z.string().optional(),
        dependencies: z.array(z.string()).optional(),
        acceptanceCriteria: z.string().optional(),
      }).parse(req.body);
      const row = await storage.createGamingIntegrationTask(body);
      res.status(201).json(row);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/gaming/tasks/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const updates: any = { ...req.body };
      if (updates.status === "done" && !updates.completedAt) updates.completedAt = new Date();
      const row = await storage.updateGamingIntegrationTask(id, updates);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/gaming/tasks/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteGamingIntegrationTask(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Stats overview
  app.get("/api/admin/gaming/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { merchantId } = req.query;
      if (!merchantId) return res.status(400).json({ error: "merchantId required" });
      const [deposits, withdrawals, webhookLogs, failedEvents, healthSummary, players] = await Promise.all([
        storage.getGamingDeposits(merchantId as string),
        storage.getGamingWithdrawals(merchantId as string),
        storage.getGamingWebhookLogs(merchantId as string, 500),
        storage.getGamingFailedEvents(merchantId as string, "pending"),
        storage.getGamingApiHealthSummary(merchantId as string),
        storage.getGamingPlayerMappings(merchantId as string),
      ]);
      res.json({
        totalDeposits: deposits.length,
        pendingDeposits: deposits.filter((d) => d.status === "pending").length,
        totalWithdrawals: withdrawals.length,
        pendingWithdrawals: withdrawals.filter((w) => w.status === "pending").length,
        totalPlayers: players.length,
        totalWebhookEvents: webhookLogs.length,
        failedEventsCount: failedEvents.length,
        apiHealth: healthSummary,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
