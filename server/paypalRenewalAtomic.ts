/**
 * PayPal subscription renewal atomic claim.
 *
 * Financial side-effects are protected by a transaction-scoped advisory lock
 * derived from the verified provider billing-cycle key. The transaction
 * performs the duplicate check, merchant update and journal insert together.
 * This deliberately does not add a unique index before historical duplicate
 * records have been audited and reconciled.
 *
 * Only call after PayPal webhook signature verification. No emails or external
 * network requests are made while the database transaction is open.
 */
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { merchants, paymentTransactions } from "@shared/schema";

export interface PaypalRenewalInput {
  subscriptionId: string;
  cycleKey: string;
  amountUsd: number;
  exchangeRate: number;
}

export interface PaypalRenewalReceipt {
  merchantEmail: string;
  merchantName: string;
  planName: string;
  subscriptionMonths: number;
  amount: number;
  paymentMethod: string;
  paidAt: Date;
  expiresAt: Date;
  invoiceNumber: string;
}

export type PaypalRenewalResult =
  | { status: "duplicate" }
  | { status: "missing_merchant" }
  | { status: "created"; transactionId: string; receipt: PaypalRenewalReceipt };

export function validatePaypalRenewalInput(input: PaypalRenewalInput) {
  if (!input.subscriptionId || input.subscriptionId.length > 255) throw new Error("Invalid PayPal subscription reference");
  if (input.cycleKey !== input.cycleKey.trim() || !/^paypal_cycle_.+_\\d{4}_\\d{2}$/.test(input.cycleKey) || input.cycleKey.length > 512) {
    throw new Error("Invalid PayPal billing cycle key");
  }
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) throw new Error("Invalid PayPal renewal amount");
  if (!Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0) throw new Error("Invalid PayPal exchange rate");
  const amountIdr = Math.round(input.amountUsd * input.exchangeRate);
  if (!Number.isSafeInteger(amountIdr) || amountIdr <= 0 || amountIdr > 2147483647) {
    throw new Error("PayPal amount exceeds payment journal capacity");
  }
  return amountIdr;
}

/**
 * Serializes all copies of the same cycle across replicas on the same
 * PostgreSQL database. Other payment writers must not bypass this function.
 */
export async function commitPaypalRenewal(input: PaypalRenewalInput): Promise<PaypalRenewalResult> {
  const amountIdr = validatePaypalRenewalInput(input);
  return db.transaction(async (tx): Promise<PaypalRenewalResult> => {
    // Hashing is performed inside PostgreSQL; the cycle key is a bound value.
    // pg_advisory_xact_lock releases automatically on commit or rollback.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"chatvice:paypal:" + input.cycleKey}, 0))`);

    const existing = await tx.select({ id: paymentTransactions.id })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.externalId, input.cycleKey))
      .limit(1);
    if (existing.length) return { status: "duplicate" };

    const matches = await tx.select({
      id: merchants.id,
      email: merchants.email,
      companyName: merchants.companyName,
      subscriptionPlanId: merchants.subscriptionPlanId,
      currentPeriodEnd: merchants.currentPeriodEnd,
    }).from(merchants)
      .where(eq(merchants.paypalSubscriptionId, input.subscriptionId))
      .limit(2)
      .for("update");
    if (!matches.length) return { status: "missing_merchant" };
    if (matches.length !== 1) throw new Error("Ambiguous PayPal subscription owner");

    const merchant = matches[0];
    const paidAt = new Date();
    const startAt = merchant.currentPeriodEnd && merchant.currentPeriodEnd > paidAt
      ? merchant.currentPeriodEnd
      : paidAt;
    const expiresAt = new Date(startAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const planName = merchant.subscriptionPlanId === "custom"
      ? "Custom Plan"
      : merchant.subscriptionPlanId?.replace("_", " ").replace(/\\b\\w/g, c => c.toUpperCase()) || "Plan";
    const invoiceNumber = "PP-" + randomBytes(8).toString("hex");
    const transactionId = "txn_" + randomBytes(12).toString("hex");
    const companyName = merchant.companyName || merchant.email.split("@")[0];

    await tx.update(merchants)
      .set({
        subscriptionStatus: "active",
        currentPeriodEnd: expiresAt,
        expiryReminder7dSentAt: null,
        expiryReminder3dSentAt: null,
      })
      .where(eq(merchants.id, merchant.id));

    await tx.insert(paymentTransactions).values({
      id: transactionId,
      merchantId: merchant.id,
      amount: amountIdr,
      status: "completed",
      gatewayName: "PayPal",
      externalId: input.cycleKey,
      paymentMethod: "paypal_subscription",
      planId: merchant.subscriptionPlanId || "unknown",
      planName,
      subscriptionMonths: 1,
      merchantEmail: merchant.email,
      merchantCompanyName: companyName,
      // Legacy PayPal journal convention. Currency normalization is separate.
      currency: "USD",
      paidAt,
      invoiceNumber,
      createdAt: paidAt,
      updatedAt: paidAt,
    });

    return {
      status: "created",
      transactionId,
      receipt: {
        merchantEmail: merchant.email,
        merchantName: companyName,
        planName,
        subscriptionMonths: 1,
        amount: amountIdr,
        paymentMethod: "PayPal Auto-Renewal",
        paidAt,
        expiresAt,
        invoiceNumber,
      },
    };
  });
}
