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

// ── Credential hint helper (last-4 chars, never returns plaintext) ───────────

function credentialHint(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    const plain = decryptCredential(encrypted);
    return plain.length >= 4 ? `●●●●●● ...${plain.slice(-4)}` : "●●●● (set)";
  } catch { return "●●●● (set)"; }
}

function sanitizeGamingMerchant(r: GamingMerchant) {
  return {
    id: r.id,
    merchantId: r.merchantId,
    merchantName: r.merchantName,
    brandName: r.brandName,
    apiBaseUrl: r.apiBaseUrl,
    ipWhitelist: r.ipWhitelist,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    webhookSecretRotatedAt: r.webhookSecretRotatedAt,
    apiKeyHint: credentialHint(r.apiKeyEncrypted),
    apiSecretHint: credentialHint(r.apiSecretEncrypted),
    webhookSecretSet: !!r.webhookSecret,
  };
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

// ── Payload field helpers ─────────────────────────────────────────────────────
// Safe coercions from Record<string, unknown> to primitive types for storage calls.
function str(v: unknown): string | undefined { return v != null ? String(v) : undefined; }
function dt(v: unknown): Date | undefined { return v != null ? new Date(String(v)) : undefined; }

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
          transactionId: str(payload.transaction_id ?? payload.transactionId) ?? eventId,
          playerId: str(payload.player_id ?? payload.playerId),
          username: str(payload.username),
          amount: payload.amount ? Number(payload.amount) : undefined,
          currency: str(payload.currency) ?? "IDR",
          paymentMethod: str(payload.payment_method ?? payload.paymentMethod),
          paymentChannel: str(payload.payment_channel ?? payload.paymentChannel),
          status: str(payload.status) ?? eventType.split(".")[1],
          proofUrl: str(payload.proof_url ?? payload.proofUrl),
          paidAt: dt(payload.paid_at),
          expiredAt: dt(payload.expired_at),
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
          withdrawId: str(payload.withdraw_id ?? payload.withdrawId) ?? eventId,
          playerId: str(payload.player_id ?? payload.playerId),
          username: str(payload.username),
          amount: payload.amount ? Number(payload.amount) : undefined,
          currency: str(payload.currency) ?? "IDR",
          bankName: str(payload.bank_name ?? payload.bankName),
          accountName: str(payload.account_name ?? payload.accountName),
          accountNumberMasked: payload.account_number
            ? maskBankAccount(String(payload.account_number))
            : str(payload.account_number_masked ?? payload.accountNumberMasked),
          status: str(payload.status) ?? eventType.split(".")[1],
          rejectedReason: str(payload.rejected_reason ?? payload.rejectedReason),
          approvedAt: dt(payload.approved_at),
          rejectedAt: dt(payload.rejected_at),
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
          playerId: str(payload.player_id ?? payload.playerId),
          username: str(payload.username),
          bonusId: str(payload.bonus_id ?? payload.bonusId),
          bonusName: str(payload.bonus_name ?? payload.bonusName),
          requiredTurnover: required,
          currentTurnover: current,
          remainingTurnover: remaining,
          progressPercentage: pct,
          eligibleWithdraw: pct >= 100,
          expiryDate: dt(payload.expiry_date),
          status: str(payload.status) ?? "active",
          rawPayload: payload,
        });
        break;
      }

      // ── Balance event (1 type) ────────────────────────────────────────────
      case "balance.updated": {
        await storage.createGamingBalanceSnapshot({
          merchantId,
          playerId: str(payload.player_id ?? payload.playerId),
          username: str(payload.username),
          currentBalance: payload.current_balance != null ? Number(payload.current_balance) : undefined,
          lockedBalance: payload.locked_balance != null ? Number(payload.locked_balance) : undefined,
          bonusBalance: payload.bonus_balance != null ? Number(payload.bonus_balance) : undefined,
          currency: str(payload.currency) ?? "IDR",
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
    const eventType = str(payload?.event_type ?? payload?.eventType) ?? "unknown";

    // Resolve event ID from header first, then fall back to payload field
    const resolvedEventId = str(eventId || payload?.event_id || payload?.eventId) ?? "";

    // Log incoming webhook — use DB-level unique constraint on (merchant_id, event_id)
    // for race-safe deduplication: a duplicate event_id will throw a unique violation
    // which we catch below instead of doing a separate read-then-insert.
    let log: Awaited<ReturnType<typeof storage.createGamingWebhookLog>>;
    try {
      log = await storage.createGamingWebhookLog({
        merchantId,
        eventType,
        eventId: resolvedEventId || null,
        playerId: str(payload?.player_id ?? payload?.playerId) ?? null,
        transactionId: str(payload?.transaction_id ?? payload?.transactionId) ?? null,
        payload,
        signatureValid: true,
        status: "pending",
        errorMessage: null,
      });
    } catch (insertErr: unknown) {
      // Postgres unique violation = 23505; treat as a duplicate event
      const pgErr = insertErr as { code?: string };
      if (pgErr?.code === "23505" && resolvedEventId) {
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
      res.json(rows.map(sanitizeGamingMerchant));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/gaming/merchants/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const row = await storage.getGamingMerchant(id);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(sanitizeGamingMerchant(row));
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
      res.status(201).json(sanitizeGamingMerchant(row));
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/admin/gaming/merchants/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const body = upsertGamingMerchantSchema.partial().parse(req.body);
      const updates: Partial<{ merchantName: string; brandName: string; apiBaseUrl: string; apiKeyEncrypted: string; apiSecretEncrypted: string; ipWhitelist: string[]; status: string }> = {};
      if (body.merchantName) updates.merchantName = body.merchantName;
      if (body.brandName !== undefined) updates.brandName = body.brandName;
      if (body.apiBaseUrl) updates.apiBaseUrl = body.apiBaseUrl;
      if (body.apiKey) updates.apiKeyEncrypted = encryptCredential(body.apiKey);
      if (body.apiSecret) updates.apiSecretEncrypted = encryptCredential(body.apiSecret);
      if (body.ipWhitelist) updates.ipWhitelist = body.ipWhitelist;
      if (body.status) updates.status = body.status;
      const row = await storage.updateGamingMerchant(id, updates);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(sanitizeGamingMerchant(row));
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: err.message });
    }
  });

  // Rotate webhook secret — stores new secret encrypted; credential never returned in response
  app.post("/api/admin/gaming/merchants/:id/rotate-secret", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const row = await storage.updateGamingMerchant(id, { webhookSecret: encryptCredential(generateWebhookSecret()), webhookSecretRotatedAt: new Date() });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json({ success: true, webhookSecret: "***", message: "Webhook secret rotated. Configure the new secret via your panel integration settings." });
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Test webhook — pings the merchant's apiBaseUrl/health with the configured API key
  // SSRF guard: only allow public HTTPS URLs; block private/loopback/link-local ranges.
  function isSafeWebhookUrl(raw: string): { ok: boolean; reason?: string } {
    let parsed: URL;
    try { parsed = new URL(raw); } catch { return { ok: false, reason: "Invalid URL" }; }
    if (parsed.protocol !== "https:") return { ok: false, reason: "Only HTTPS URLs are allowed" };
    const hostname = parsed.hostname.toLowerCase();
    // Block loopback, private, link-local, metadata ranges
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
      /^0\.0\.0\.0$/,
      /^metadata\.google\.internal$/i,
      /^169\.254\.169\.254$/,
    ];
    for (const pattern of privatePatterns) {
      if (pattern.test(hostname)) return { ok: false, reason: "Requests to private/internal addresses are not allowed" };
    }
    return { ok: true };
  }

  app.post("/api/admin/gaming/merchants/:id/test-webhook", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const row = await storage.getGamingMerchant(id);
      if (!row) return res.status(404).json({ error: "Not found" });

      const guard = isSafeWebhookUrl(row.apiBaseUrl ?? "");
      if (!guard.ok) return res.status(400).json({ error: guard.reason });

      const apiKey = row.apiKeyEncrypted ? decryptCredential(row.apiKeyEncrypted) : null;
      const testedUrl = `${row.apiBaseUrl.replace(/\/$/, "")}/health`;
      const startTime = Date.now();

      try {
        const resp = await fetch(testedUrl, {
          method: "GET",
          headers: {
            ...(apiKey ? { "Authorization": `Bearer ${apiKey}`, "X-Api-Key": apiKey } : {}),
            "Content-Type": "application/json",
            "X-Chatvice-Probe": "1",
          },
          signal: AbortSignal.timeout(10000),
        });
        const responseTimeMs = Date.now() - startTime;
        const body = await resp.text().catch(() => "");
        res.json({ success: resp.ok, statusCode: resp.status, responseTimeMs, body: body.slice(0, 500), testedUrl });
      } catch (fetchErr: unknown) {
        const responseTimeMs = Date.now() - startTime;
        res.json({ success: false, statusCode: null, responseTimeMs, error: (fetchErr as Error).message, testedUrl });
      }
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message });
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

  // Webhook Log Reprocess — re-dispatches a single webhook event
  app.post("/api/admin/gaming/webhook-logs/:id/reprocess", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const log = await storage.getGamingWebhookLog(id);
      if (!log) return res.status(404).json({ error: "Not found" });

      await storage.updateGamingWebhookLog(id, { status: "pending", errorMessage: null });
      const eventPayload = log.payload as Record<string, unknown>;
      setImmediate(async () => {
        await processGamingWebhookEvent(log.merchantId, log.eventType, log.eventId ?? `reprocess-${id}`, eventPayload, id);
      });
      res.json({ success: true, message: "Event queued for reprocessing." });
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

  // Mark a failed event as resolved without re-processing
  app.patch("/api/admin/gaming/failed-events/:id/resolve", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const row = await storage.updateGamingFailedEvent(id, { status: "resolved", nextRetryAt: null });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(sanitizeFailedEvent(row));
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
      const eventPayload = (existing.payload ?? {}) as Record<string, unknown>;
      const retryEventId = str(eventPayload.eventId) ?? `retry-${id}`;
      const logRow = await storage.createGamingWebhookLog({
        merchantId: existing.merchantId,
        eventType: existing.eventType,
        eventId: `retry-${id}-${Date.now()}`,
        playerId: str(eventPayload.player_id ?? eventPayload.playerId) ?? null,
        transactionId: str(eventPayload.transaction_id ?? eventPayload.transactionId) ?? null,
        payload: eventPayload,
        signatureValid: true,
        status: "pending",
        errorMessage: null,
      });
      setImmediate(async () => {
        const success = await processGamingWebhookEvent(existing.merchantId, existing.eventType, retryEventId, eventPayload, logRow.id);
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

  // Integration Tasks — seed default tasks if DB is empty
  app.post("/api/admin/gaming/tasks/seed", requireAdmin, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getGamingIntegrationTasks();
      if (existing.length > 0) {
        return res.json({ seeded: 0, message: "Tasks already exist — no seeding needed." });
      }
      const SEED_TASKS = [
        { category: "Backend", title: "Webhook receiver with HMAC-SHA256 verification", status: "done", priority: "critical", description: "Secure endpoint receiving all 12 gaming event types. Verifies signature, deduplicates, and dispatches processor.", ownerRole: "Backend Dev", acceptanceCriteria: "All event types processed; invalid signatures rejected; duplicate eventIds ignored." },
        { category: "Backend", title: "Player mapping CRUD", status: "done", priority: "high", description: "Store and manage gaming username ↔ Chatvice customer identity links with verification status.", ownerRole: "Backend Dev", acceptanceCriteria: "Create, read, update, delete player mappings; phone/email masked in API responses." },
        { category: "Backend", title: "Deposit & withdrawal transaction logs", status: "done", priority: "high", description: "Persist deposit and withdrawal events from webhook payloads with full status tracking.", ownerRole: "Backend Dev", acceptanceCriteria: "All deposit/withdraw events stored; account numbers masked at rest; paginated admin API." },
        { category: "Backend", title: "Turnover tracking & eligibility engine", status: "done", priority: "medium", description: "Track bonus turnover progress per player and flag eligibility for withdrawal.", ownerRole: "Backend Dev", acceptanceCriteria: "progressPercentage computed; eligibleWithdraw flag accurate; admin filter by eligibility." },
        { category: "Backend", title: "API health monitoring endpoint", status: "done", priority: "medium", description: "Log per-endpoint health checks with response time, status code, and uptime percentage.", ownerRole: "Backend Dev", acceptanceCriteria: "Health logs stored; summary (uptime%, avg response time) computed correctly." },
        { category: "Backend", title: "AES-256-GCM credential encryption at rest", status: "done", priority: "critical", description: "All gaming API keys, secrets, and webhook secrets encrypted before DB storage.", ownerRole: "Backend Dev", acceptanceCriteria: "No plaintext credentials in DB; decryption works correctly; key hints shown in admin UI." },
        { category: "Admin UI", title: "13-page gaming integration admin dashboard", status: "done", priority: "high", description: "Full admin UI with overview stats, audit checklist, and 11 per-merchant management pages.", ownerRole: "Frontend Dev", acceptanceCriteria: "All 13 pages accessible via URL routing; loading/empty/error states on every page." },
        { category: "AI Integration", title: "AI agent gaming queries (Task #397)", status: "in_progress", priority: "critical", description: "Enable AI chatbot to answer deposit status, withdrawal status, and turnover queries by injecting gaming data into prompts.", ownerRole: "AI Engineer", acceptanceCriteria: "AI correctly answers 'what is my deposit status', 'my withdrawal status', 'my turnover progress' from live gaming data." },
        { category: "QA", title: "End-to-end gaming webhook test suite", status: "testing", priority: "high", description: "Automated tests covering all 12 event types, signature failure cases, and duplicate detection.", ownerRole: "QA Engineer", acceptanceCriteria: "All 12 event types tested; edge cases for bad signatures and duplicates covered; CI passes." },
        { category: "Backend", title: "Rate-limit and IP whitelist enforcement", status: "testing", priority: "medium", description: "Enforce per-merchant IP whitelist on webhook receiver; rate-limit burst events.", ownerRole: "Backend Dev", acceptanceCriteria: "Requests from non-whitelisted IPs rejected with 403; burst rate limit tested and documented." },
        { category: "Admin UI", title: "CSV export for deposits and withdrawals", status: "todo", priority: "low", description: "Allow admin to export filtered transaction logs as CSV files for reconciliation.", ownerRole: "Frontend Dev", acceptanceCriteria: "Export button on deposits/withdrawals page; respects current filters; downloads valid CSV." },
        { category: "Backend", title: "Real-time dashboard alert thresholds", status: "backlog", priority: "medium", description: "Configurable alert thresholds for failed events, pending withdrawal SLA, and API downtime.", ownerRole: "Backend Dev", acceptanceCriteria: "Admin can set threshold values; alerts triggered when thresholds breached; WebSocket push to admin panel." },
      ];
      const created = await Promise.all(SEED_TASKS.map((t) => storage.createGamingIntegrationTask(t)));
      res.json({ seeded: created.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const SEED_TASKS = [
    { category: "Backend", title: "Webhook receiver with HMAC-SHA256 verification", status: "done", priority: "critical", description: "Secure endpoint receiving all 12 gaming event types. Verifies signature, deduplicates, and dispatches processor.", ownerRole: "Backend Dev", acceptanceCriteria: "All event types processed; invalid signatures rejected; duplicate eventIds ignored." },
    { category: "Backend", title: "Player mapping CRUD", status: "done", priority: "high", description: "Store and manage gaming username ↔ Chatvice customer identity links with verification status.", ownerRole: "Backend Dev", acceptanceCriteria: "Create, read, update, delete player mappings; phone/email masked in API responses." },
    { category: "Backend", title: "Deposit & withdrawal transaction logs", status: "done", priority: "high", description: "Persist deposit and withdrawal events from webhook payloads with full status tracking.", ownerRole: "Backend Dev", acceptanceCriteria: "All deposit/withdraw events stored; account numbers masked at rest; paginated admin API." },
    { category: "Backend", title: "Turnover tracking & eligibility engine", status: "done", priority: "medium", description: "Track bonus turnover progress per player and flag eligibility for withdrawal.", ownerRole: "Backend Dev", acceptanceCriteria: "progressPercentage computed; eligibleWithdraw flag accurate; admin filter by eligibility." },
    { category: "Backend", title: "API health monitoring endpoint", status: "done", priority: "medium", description: "Log per-endpoint health checks with response time, status code, and uptime percentage.", ownerRole: "Backend Dev", acceptanceCriteria: "Health logs stored; summary (uptime%, avg response time) computed correctly." },
    { category: "Backend", title: "AES-256-GCM credential encryption at rest", status: "done", priority: "critical", description: "All gaming API keys, secrets, and webhook secrets encrypted before DB storage.", ownerRole: "Backend Dev", acceptanceCriteria: "No plaintext credentials in DB; decryption works correctly; key hints shown in admin UI." },
    { category: "Admin UI", title: "13-page gaming integration admin dashboard", status: "done", priority: "high", description: "Full admin UI with overview stats, audit checklist, and 11 per-merchant management pages.", ownerRole: "Frontend Dev", acceptanceCriteria: "All 13 pages accessible via URL routing; loading/empty/error states on every page." },
    { category: "AI Integration", title: "AI agent gaming queries (Task #397)", status: "in_progress", priority: "critical", description: "Enable AI chatbot to answer deposit status, withdrawal status, and turnover queries by injecting gaming data into prompts.", ownerRole: "AI Engineer", acceptanceCriteria: "AI correctly answers 'what is my deposit status', 'my withdrawal status', 'my turnover progress' from live gaming data." },
    { category: "QA", title: "End-to-end gaming webhook test suite", status: "testing", priority: "high", description: "Automated tests covering all 12 event types, signature failure cases, and duplicate detection.", ownerRole: "QA Engineer", acceptanceCriteria: "All 12 event types tested; edge cases for bad signatures and duplicates covered; CI passes." },
    { category: "Backend", title: "Rate-limit and IP whitelist enforcement", status: "testing", priority: "medium", description: "Enforce per-merchant IP whitelist on webhook receiver; rate-limit burst events.", ownerRole: "Backend Dev", acceptanceCriteria: "Requests from non-whitelisted IPs rejected with 403; burst rate limit tested and documented." },
    { category: "Admin UI", title: "CSV export for deposits and withdrawals", status: "todo", priority: "low", description: "Allow admin to export filtered transaction logs as CSV files for reconciliation.", ownerRole: "Frontend Dev", acceptanceCriteria: "Export button on deposits/withdrawals page; respects current filters; downloads valid CSV." },
    { category: "Backend", title: "Real-time dashboard alert thresholds", status: "backlog", priority: "medium", description: "Configurable alert thresholds for failed events, pending withdrawal SLA, and API downtime.", ownerRole: "Backend Dev", acceptanceCriteria: "Admin can set threshold values; alerts triggered when thresholds breached; WebSocket push to admin panel." },
  ];

  // Integration Tasks — auto-seed on first GET if DB is empty
  app.get("/api/admin/gaming/tasks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      let rows = await storage.getGamingIntegrationTasks(status as string | undefined);
      if (rows.length === 0 && !status) {
        rows = await Promise.all(SEED_TASKS.map((t) => storage.createGamingIntegrationTask(t)));
      }
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
        status: z.enum(["backlog", "todo", "in_progress", "testing", "done", "cancelled"]).optional(),
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
      const body = req.body as Record<string, unknown>;
      const updates: Partial<{ category: string; title: string; description: string; priority: string; status: string; ownerRole: string; acceptanceCriteria: string; completedAt: Date }> = { ...body as object };
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

  // Global overview — aggregate across ALL gaming merchants (no merchantId required)
  app.get("/api/admin/gaming/overview", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const {
        gamingMerchants,
        gamingDepositTransactions,
        gamingWithdrawTransactions,
        gamingFailedEvents,
        gamingPlayerMappings,
        gamingWebhookLogs,
        gamingApiHealthLogs,
        gamingTurnoverStatus,
      } = await import("@shared/schema");
      const { count, eq, and, gte, sql } = await import("drizzle-orm");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        allMerchants,
        activeMerchants,
        totalPlayers,
        depositsToday,
        withdrawalsToday,
        pendingWithdrawals,
        failedEvents,
        totalWebhooks,
        recentHealth,
        turnoverIssues,
      ] = await Promise.all([
        db.select({ count: count() }).from(gamingMerchants),
        db.select({ count: count() }).from(gamingMerchants).where(eq(gamingMerchants.status, "active")),
        db.select({ count: count() }).from(gamingPlayerMappings),
        db.select({ count: count() }).from(gamingDepositTransactions).where(gte(gamingDepositTransactions.createdAt, today)),
        db.select({ count: count() }).from(gamingWithdrawTransactions).where(gte(gamingWithdrawTransactions.requestedAt, today)),
        db.select({ count: count() }).from(gamingWithdrawTransactions).where(eq(gamingWithdrawTransactions.status, "pending")),
        db.select({ count: count() }).from(gamingFailedEvents).where(eq(gamingFailedEvents.status, "pending")),
        db.select({ count: count() }).from(gamingWebhookLogs),
        db.select({ success: gamingApiHealthLogs.success }).from(gamingApiHealthLogs).orderBy(sql`checked_at DESC`).limit(100),
        db.select({ count: count() }).from(gamingTurnoverStatus).where(eq(gamingTurnoverStatus.eligibleWithdraw, false)),
      ]);

      const healthChecks = recentHealth.length;
      const successChecks = recentHealth.filter((r) => r.success).length;
      const uptimePct = healthChecks > 0 ? Math.round((successChecks / healthChecks) * 100) : 100;

      res.json({
        totalMerchants: Number(allMerchants[0].count),
        activeMerchants: Number(activeMerchants[0].count),
        totalPlayers: Number(totalPlayers[0].count),
        depositsToday: Number(depositsToday[0].count),
        withdrawalsToday: Number(withdrawalsToday[0].count),
        pendingWithdrawals: Number(pendingWithdrawals[0].count),
        failedEvents: Number(failedEvents[0].count),
        totalWebhookEvents: Number(totalWebhooks[0].count),
        apiUptimePct: uptimePct,
        turnoverIssues: Number(turnoverIssues[0].count),
      });
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
