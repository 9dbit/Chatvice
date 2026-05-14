/**
 * Gaming Integration — Demo Seed Data
 * Run via: npx tsx server/seeds/gamingSeedData.ts
 *
 * Populates demo gaming merchants, player mappings, deposits, withdrawals,
 * turnover records, AI response rules, and integration tasks for development
 * and testing purposes.
 */

import { db } from "../db";
import {
  gamingMerchants, gamingPlayerMappings, gamingDepositTransactions,
  gamingWithdrawTransactions, gamingTurnoverStatus, gamingAiResponseRules,
  gamingIntegrationTasks,
} from "../../shared/schema";
import crypto from "crypto";

function getEncKey(): Buffer {
  const key = process.env.GAMING_ENC_KEY || process.env.SESSION_SECRET;
  if (!key) throw new Error("Missing GAMING_ENC_KEY or SESSION_SECRET");
  return crypto.createHash("sha256").update(key).digest();
}

function encryptCredential(plaintext: string): string {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function seed() {
  console.log("[seed] Starting gaming seed data...");

  // ── Gaming Merchants ───────────────────────────────────────────────────────
  const secret1 = generateWebhookSecret();
  const secret2 = generateWebhookSecret();

  const [merchant1, merchant2] = await db
    .insert(gamingMerchants)
    .values([
      {
        merchantId: "demo_merchant_001",
        merchantName: "Bintang Casino Demo",
        brandName: "Bintang Casino",
        apiBaseUrl: "https://api.bintangcasino-demo.com/v1",
        apiKeyEncrypted: encryptCredential("demo_api_key_merchant_001"),
        apiSecretEncrypted: encryptCredential("demo_api_secret_merchant_001"),
        webhookSecret: encryptCredential(secret1),
        ipWhitelist: ["203.0.113.10", "203.0.113.11"],
        status: "active",
      },
      {
        merchantId: "demo_merchant_002",
        merchantName: "Royal Slots Demo",
        brandName: "Royal Slots",
        apiBaseUrl: "https://api.royalslots-demo.com/v1",
        apiKeyEncrypted: encryptCredential("demo_api_key_merchant_002"),
        apiSecretEncrypted: encryptCredential("demo_api_secret_merchant_002"),
        webhookSecret: encryptCredential(secret2),
        ipWhitelist: [],
        status: "active",
      },
    ])
    .onConflictDoUpdate({
      target: gamingMerchants.merchantId,
      set: {
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log(`[seed] Upserted merchants: ${merchant1.merchantId}, ${merchant2.merchantId}`);
  console.log(`[seed] Webhook secret for demo_merchant_001 (shown once): ${secret1}`);
  console.log(`[seed] Webhook secret for demo_merchant_002 (shown once): ${secret2}`);

  // ── Player Mappings ────────────────────────────────────────────────────────
  await db
    .insert(gamingPlayerMappings)
    .values([
      { merchantId: "demo_merchant_001", gamingUsername: "player_budi123", gamingPlayerId: "PL-001", phoneNumber: "6281234567890", email: "budi@example.com", verifiedStatus: "verified" },
      { merchantId: "demo_merchant_001", gamingUsername: "player_siti456", gamingPlayerId: "PL-002", phoneNumber: "6289876543210", email: "siti@example.com", verifiedStatus: "verified" },
      { merchantId: "demo_merchant_002", gamingUsername: "player_agus789", gamingPlayerId: "PL-003", phoneNumber: "6285551234567", email: "agus@example.com", verifiedStatus: "unverified" },
      { merchantId: "demo_merchant_002", gamingUsername: "player_dewi321", gamingPlayerId: "PL-004", phoneNumber: "6287779876543", email: "dewi@example.com", verifiedStatus: "verified" },
    ])
    .onConflictDoNothing();
  console.log("[seed] Player mappings seeded");

  // ── Deposit Transactions ───────────────────────────────────────────────────
  await db
    .insert(gamingDepositTransactions)
    .values([
      { merchantId: "demo_merchant_001", transactionId: "DEP-001", playerId: "PL-001", username: "player_budi123", amount: 500000, currency: "IDR", paymentMethod: "transfer", paymentChannel: "BCA", status: "paid", paidAt: new Date(Date.now() - 2 * 3600000) },
      { merchantId: "demo_merchant_001", transactionId: "DEP-002", playerId: "PL-002", username: "player_siti456", amount: 250000, currency: "IDR", paymentMethod: "qris", paymentChannel: "QRIS", status: "pending" },
      { merchantId: "demo_merchant_001", transactionId: "DEP-003", playerId: "PL-001", username: "player_budi123", amount: 1000000, currency: "IDR", paymentMethod: "transfer", paymentChannel: "Mandiri", status: "paid", paidAt: new Date(Date.now() - 24 * 3600000) },
      { merchantId: "demo_merchant_002", transactionId: "DEP-004", playerId: "PL-003", username: "player_agus789", amount: 100000, currency: "IDR", paymentMethod: "ewallet", paymentChannel: "GoPay", status: "expired", expiredAt: new Date(Date.now() - 3600000) },
      { merchantId: "demo_merchant_002", transactionId: "DEP-005", playerId: "PL-004", username: "player_dewi321", amount: 750000, currency: "IDR", paymentMethod: "transfer", paymentChannel: "BRI", status: "paid", paidAt: new Date(Date.now() - 6 * 3600000) },
    ])
    .onConflictDoNothing();
  console.log("[seed] Deposit transactions seeded");

  // ── Withdrawal Transactions ────────────────────────────────────────────────
  await db
    .insert(gamingWithdrawTransactions)
    .values([
      { merchantId: "demo_merchant_001", withdrawId: "WD-001", playerId: "PL-001", username: "player_budi123", amount: 300000, currency: "IDR", bankName: "BCA", accountName: "Budi Santoso", accountNumberMasked: "****5678", status: "approved", approvedAt: new Date(Date.now() - 3600000) },
      { merchantId: "demo_merchant_001", withdrawId: "WD-002", playerId: "PL-002", username: "player_siti456", amount: 150000, currency: "IDR", bankName: "Mandiri", accountName: "Siti Rahayu", accountNumberMasked: "****1234", status: "pending" },
      { merchantId: "demo_merchant_002", withdrawId: "WD-003", playerId: "PL-003", username: "player_agus789", amount: 500000, currency: "IDR", bankName: "BNI", accountName: "Agus Pratama", accountNumberMasked: "****9012", status: "rejected", rejectedReason: "Nama akun tidak sesuai", rejectedAt: new Date(Date.now() - 7200000) },
      { merchantId: "demo_merchant_002", withdrawId: "WD-004", playerId: "PL-004", username: "player_dewi321", amount: 200000, currency: "IDR", bankName: "BRI", accountName: "Dewi Kusuma", accountNumberMasked: "****3456", status: "completed" },
    ])
    .onConflictDoNothing();
  console.log("[seed] Withdrawal transactions seeded");

  // ── Turnover Status ────────────────────────────────────────────────────────
  await db
    .insert(gamingTurnoverStatus)
    .values([
      { merchantId: "demo_merchant_001", playerId: "PL-001", username: "player_budi123", bonusId: "BONUS-001", bonusName: "Welcome Bonus 100%", requiredTurnover: 5000000, currentTurnover: 3750000, remainingTurnover: 1250000, progressPercentage: 75, eligibleWithdraw: false, status: "active" },
      { merchantId: "demo_merchant_001", playerId: "PL-002", username: "player_siti456", bonusId: "BONUS-002", bonusName: "Deposit Bonus 50%", requiredTurnover: 2000000, currentTurnover: 2100000, remainingTurnover: 0, progressPercentage: 100, eligibleWithdraw: true, status: "completed" },
      { merchantId: "demo_merchant_002", playerId: "PL-004", username: "player_dewi321", bonusId: "BONUS-003", bonusName: "Cashback 10%", requiredTurnover: 1000000, currentTurnover: 450000, remainingTurnover: 550000, progressPercentage: 45, eligibleWithdraw: false, status: "active" },
    ])
    .onConflictDoNothing();
  console.log("[seed] Turnover status seeded");

  // ── AI Response Rules ──────────────────────────────────────────────────────
  await db
    .insert(gamingAiResponseRules)
    .values([
      { merchantId: "demo_merchant_001", eventType: "deposit.paid", responseTemplate: "Deposit {amount} IDR Anda telah berhasil dikonfirmasi via {payment_channel}. Saldo Anda sudah diperbarui. Selamat bermain!", escalationRequired: false, active: true },
      { merchantId: "demo_merchant_001", eventType: "deposit.expired", responseTemplate: "Deposit Anda telah kedaluwarsa. Silakan buat deposit baru jika ingin melanjutkan.", escalationRequired: false, active: true },
      { merchantId: "demo_merchant_001", eventType: "withdraw.approved", responseTemplate: "Penarikan {amount} IDR ke rekening {bank_name} Anda telah disetujui dan sedang diproses.", escalationRequired: false, active: true },
      { merchantId: "demo_merchant_001", eventType: "withdraw.rejected", conditionKey: "rejected_reason", responseTemplate: "Penarikan Anda ditolak: {rejected_reason}. Hubungi CS untuk bantuan lebih lanjut.", escalationRequired: true, active: true },
      { merchantId: "demo_merchant_001", eventType: "withdraw.completed", responseTemplate: "Dana sebesar {amount} IDR telah berhasil dikirim ke rekening Anda. Terima kasih!", escalationRequired: false, active: true },
      { merchantId: "demo_merchant_001", eventType: "turnover.updated", conditionKey: "progress_percentage", conditionOperator: ">=", conditionValue: "100", responseTemplate: "Selamat! Turnover Anda sudah mencukupi, Anda sekarang bisa melakukan penarikan.", escalationRequired: false, active: true },
      { merchantId: "demo_merchant_002", eventType: "deposit.paid", responseTemplate: "Deposit sukses! {amount} IDR sudah masuk ke akun Royal Slots Anda.", escalationRequired: false, active: true },
      { merchantId: "demo_merchant_002", eventType: "balance.updated", responseTemplate: "Saldo terkini Anda: {current_balance} IDR.", escalationRequired: false, active: true },
    ])
    .onConflictDoNothing();
  console.log("[seed] AI response rules seeded");

  // ── Integration Tasks ──────────────────────────────────────────────────────
  await db
    .insert(gamingIntegrationTasks)
    .values([
      { category: "backend", title: "Gaming DB schema + storage layer", description: "Create 11 gaming tables and IStorage methods", priority: "critical", status: "done", ownerRole: "backend" },
      { category: "backend", title: "Webhook receiver endpoint", description: "HMAC-verified, deduplicated, async gaming event processor", priority: "critical", status: "done", ownerRole: "backend" },
      { category: "backend", title: "Admin REST API for gaming", description: "15 admin endpoints under /api/admin/gaming/", priority: "high", status: "done", ownerRole: "backend" },
      { category: "frontend", title: "Admin Gaming Dashboard UI", description: "13 sub-pages: overview, merchants, players, deposits, withdrawals, turnovers, balances, webhooks, failed events, health, AI rules, tasks, settings", priority: "high", status: "todo", ownerRole: "frontend", dependencies: ["backend"] },
      { category: "ai", title: "AI Agent Gaming Query Handler", description: "Detect gaming queries (deposit/withdraw/turnover/balance) and dispatch to gaming API client", priority: "high", status: "todo", ownerRole: "ai", dependencies: ["backend"] },
      { category: "security", title: "IP whitelist enforcement on webhook endpoint", description: "Verify sender IP against gaming_merchants.ip_whitelist when list is non-empty", priority: "medium", status: "todo", ownerRole: "backend" },
    ])
    .onConflictDoNothing();
  console.log("[seed] Integration tasks seeded");

  console.log("[seed] Gaming seed data complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Error:", err.message);
  process.exit(1);
});
