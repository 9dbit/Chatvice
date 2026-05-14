import crypto from "crypto";
import { db } from "../../db";
import { gamingMerchants } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { decryptCredential, maskBankAccount, maskPhone, maskEmail } from "./cryptoHelpers";
import { storage } from "../../storage";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

export interface PlayerProfile {
  playerId: string;
  username: string;
  email?: string;
  phone?: string;
  status?: string;
  registeredAt?: string;
}

export interface PlayerBalance {
  playerId: string;
  username: string;
  currentBalance: number;
  lockedBalance: number;
  bonusBalance: number;
  currency: string;
  updatedAt?: string;
}

export interface DepositRecord {
  transactionId: string;
  playerId: string;
  username: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  paymentChannel?: string;
  status: string;
  createdAt?: string;
  paidAt?: string;
}

export interface WithdrawRecord {
  withdrawId: string;
  playerId: string;
  username: string;
  amount: number;
  currency: string;
  bankName?: string;
  accountName?: string;
  accountNumberMasked?: string;
  status: string;
  rejectedReason?: string;
  requestedAt?: string;
  approvedAt?: string;
}

export interface TurnoverRecord {
  playerId: string;
  username: string;
  bonusId?: string;
  bonusName?: string;
  requiredTurnover: number;
  currentTurnover: number;
  remainingTurnover: number;
  progressPercentage: number;
  eligibleWithdraw: boolean;
  expiryDate?: string;
  status: string;
}

async function getGamingMerchantConfig(merchantId: string) {
  const [config] = await db
    .select()
    .from(gamingMerchants)
    .where(and(eq(gamingMerchants.merchantId, merchantId), eq(gamingMerchants.status, "active")))
    .limit(1);
  return config ?? null;
}

function buildHmacHeaders(apiKey: string, apiSecret: string, body: string = "") {
  const timestamp = Date.now().toString();
  const requestId = crypto.randomUUID();
  const message = `${timestamp}${requestId}${body}`;
  const signature = crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
  return {
    "X-API-Key": apiKey,
    "X-Timestamp": timestamp,
    "X-Request-ID": requestId,
    "X-Signature": signature,
    "Content-Type": "application/json",
  };
}

async function logApiHealth(
  merchantId: string,
  endpoint: string,
  method: string,
  statusCode: number | null,
  responseTimeMs: number,
  success: boolean,
  errorMessage?: string,
) {
  try {
    await storage.createGamingApiHealthLog({
      merchantId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      success,
      errorMessage: errorMessage ?? null,
    });
  } catch {
    // Health logging is non-critical; swallow errors silently
  }
}

async function request<T>(
  merchantId: string,
  apiBaseUrl: string,
  apiKey: string,
  apiSecret: string,
  method: string,
  path: string,
  body?: object,
): Promise<T> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}${path}`;
  const bodyStr = body ? JSON.stringify(body) : "";
  const headers = buildHmacHeaders(apiKey, apiSecret, bodyStr);
  const start = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      const res = await fetch(url, {
        method,
        headers,
        body: bodyStr || undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const elapsed = Date.now() - start;
      const ok = res.ok;
      await logApiHealth(merchantId, path, method, res.status, elapsed, ok);
      if (!ok) {
        throw new Error(`Gaming API returned ${res.status} for ${path}`);
      }
      return (await res.json()) as T;
    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  const elapsed = Date.now() - start;
  await logApiHealth(merchantId, path, method, null, elapsed, false, lastError?.message);
  throw lastError ?? new Error("Gaming API request failed");
}

export async function getPlayerProfile(merchantId: string, playerId: string): Promise<PlayerProfile | null> {
  const config = await getGamingMerchantConfig(merchantId);
  if (!config) return null;
  const apiKey = decryptCredential(config.apiKeyEncrypted ?? "");
  const apiSecret = decryptCredential(config.apiSecretEncrypted ?? "");
  const raw = await request<any>(merchantId, config.apiBaseUrl, apiKey, apiSecret, "GET", `/players/${playerId}`);
  return {
    playerId: raw.player_id ?? raw.playerId ?? playerId,
    username: raw.username ?? "",
    email: raw.email ? maskEmail(raw.email) : undefined,
    phone: raw.phone ? maskPhone(raw.phone) : undefined,
    status: raw.status,
    registeredAt: raw.registered_at ?? raw.registeredAt,
  };
}

export async function getPlayerBalance(merchantId: string, playerId: string): Promise<PlayerBalance | null> {
  const config = await getGamingMerchantConfig(merchantId);
  if (!config) return null;
  const apiKey = decryptCredential(config.apiKeyEncrypted ?? "");
  const apiSecret = decryptCredential(config.apiSecretEncrypted ?? "");
  const raw = await request<any>(merchantId, config.apiBaseUrl, apiKey, apiSecret, "GET", `/players/${playerId}/balance`);
  return {
    playerId: raw.player_id ?? raw.playerId ?? playerId,
    username: raw.username ?? "",
    currentBalance: Number(raw.current_balance ?? raw.currentBalance ?? 0),
    lockedBalance: Number(raw.locked_balance ?? raw.lockedBalance ?? 0),
    bonusBalance: Number(raw.bonus_balance ?? raw.bonusBalance ?? 0),
    currency: raw.currency ?? "IDR",
    updatedAt: raw.updated_at ?? raw.updatedAt,
  };
}

export async function getDepositStatus(merchantId: string, transactionId: string): Promise<DepositRecord | null> {
  const config = await getGamingMerchantConfig(merchantId);
  if (!config) return null;
  const apiKey = decryptCredential(config.apiKeyEncrypted ?? "");
  const apiSecret = decryptCredential(config.apiSecretEncrypted ?? "");
  const raw = await request<any>(merchantId, config.apiBaseUrl, apiKey, apiSecret, "GET", `/deposits/${transactionId}`);
  return {
    transactionId: raw.transaction_id ?? raw.transactionId ?? transactionId,
    playerId: raw.player_id ?? raw.playerId ?? "",
    username: raw.username ?? "",
    amount: Number(raw.amount ?? 0),
    currency: raw.currency ?? "IDR",
    paymentMethod: raw.payment_method ?? raw.paymentMethod,
    paymentChannel: raw.payment_channel ?? raw.paymentChannel,
    status: raw.status ?? "unknown",
    createdAt: raw.created_at ?? raw.createdAt,
    paidAt: raw.paid_at ?? raw.paidAt,
  };
}

export async function getWithdrawStatus(merchantId: string, withdrawId: string): Promise<WithdrawRecord | null> {
  const config = await getGamingMerchantConfig(merchantId);
  if (!config) return null;
  const apiKey = decryptCredential(config.apiKeyEncrypted ?? "");
  const apiSecret = decryptCredential(config.apiSecretEncrypted ?? "");
  const raw = await request<any>(merchantId, config.apiBaseUrl, apiKey, apiSecret, "GET", `/withdrawals/${withdrawId}`);
  return {
    withdrawId: raw.withdraw_id ?? raw.withdrawId ?? withdrawId,
    playerId: raw.player_id ?? raw.playerId ?? "",
    username: raw.username ?? "",
    amount: Number(raw.amount ?? 0),
    currency: raw.currency ?? "IDR",
    bankName: raw.bank_name ?? raw.bankName,
    accountName: raw.account_name ?? raw.accountName,
    accountNumberMasked: raw.account_number ? maskBankAccount(raw.account_number) : (raw.account_number_masked ?? undefined),
    status: raw.status ?? "unknown",
    rejectedReason: raw.rejected_reason ?? raw.rejectedReason,
    requestedAt: raw.requested_at ?? raw.requestedAt,
    approvedAt: raw.approved_at ?? raw.approvedAt,
  };
}

export async function getTurnoverStatus(merchantId: string, playerId: string): Promise<TurnoverRecord | null> {
  const config = await getGamingMerchantConfig(merchantId);
  if (!config) return null;
  const apiKey = decryptCredential(config.apiKeyEncrypted ?? "");
  const apiSecret = decryptCredential(config.apiSecretEncrypted ?? "");
  const raw = await request<any>(merchantId, config.apiBaseUrl, apiKey, apiSecret, "GET", `/players/${playerId}/turnover`);
  const required = Number(raw.required_turnover ?? raw.requiredTurnover ?? 0);
  const current = Number(raw.current_turnover ?? raw.currentTurnover ?? 0);
  const remaining = Math.max(0, required - current);
  const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 100;
  return {
    playerId: raw.player_id ?? raw.playerId ?? playerId,
    username: raw.username ?? "",
    bonusId: raw.bonus_id ?? raw.bonusId,
    bonusName: raw.bonus_name ?? raw.bonusName,
    requiredTurnover: required,
    currentTurnover: current,
    remainingTurnover: remaining,
    progressPercentage: pct,
    eligibleWithdraw: pct >= 100,
    expiryDate: raw.expiry_date ?? raw.expiryDate,
    status: raw.status ?? "active",
  };
}

export async function getTransactionHistory(
  merchantId: string,
  playerId: string,
): Promise<{ deposits: DepositRecord[]; withdrawals: WithdrawRecord[] }> {
  const config = await getGamingMerchantConfig(merchantId);
  if (!config) return { deposits: [], withdrawals: [] };
  const apiKey = decryptCredential(config.apiKeyEncrypted ?? "");
  const apiSecret = decryptCredential(config.apiSecretEncrypted ?? "");
  const raw = await request<any>(merchantId, config.apiBaseUrl, apiKey, apiSecret, "GET", `/players/${playerId}/transactions`);
  const deposits: DepositRecord[] = (raw.deposits ?? []).map((d: any) => ({
    transactionId: d.transaction_id ?? d.transactionId ?? "",
    playerId: d.player_id ?? d.playerId ?? playerId,
    username: d.username ?? "",
    amount: Number(d.amount ?? 0),
    currency: d.currency ?? "IDR",
    paymentMethod: d.payment_method ?? d.paymentMethod,
    status: d.status ?? "unknown",
    createdAt: d.created_at ?? d.createdAt,
    paidAt: d.paid_at ?? d.paidAt,
  }));
  const withdrawals: WithdrawRecord[] = (raw.withdrawals ?? []).map((w: any) => ({
    withdrawId: w.withdraw_id ?? w.withdrawId ?? "",
    playerId: w.player_id ?? w.playerId ?? playerId,
    username: w.username ?? "",
    amount: Number(w.amount ?? 0),
    currency: w.currency ?? "IDR",
    bankName: w.bank_name ?? w.bankName,
    accountName: w.account_name ?? w.accountName,
    accountNumberMasked: w.account_number ? maskBankAccount(w.account_number) : (w.account_number_masked ?? undefined),
    status: w.status ?? "unknown",
    requestedAt: w.requested_at ?? w.requestedAt,
  }));
  return { deposits, withdrawals };
}

export async function syncPlayerData(merchantId: string, playerId: string) {
  const [profile, balance, turnover] = await Promise.allSettled([
    getPlayerProfile(merchantId, playerId),
    getPlayerBalance(merchantId, playerId),
    getTurnoverStatus(merchantId, playerId),
  ]);
  return {
    profile: profile.status === "fulfilled" ? profile.value : null,
    balance: balance.status === "fulfilled" ? balance.value : null,
    turnover: turnover.status === "fulfilled" ? turnover.value : null,
  };
}
