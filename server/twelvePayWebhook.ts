import { randomBytes } from 'crypto';
import { verifyWebhookSignature, getActiveGatewayName } from './twelvePayClient';
import { storage } from './storage';
import { subscriptionPlans, type SubscriptionPlanId } from '@shared/schema';
import { getEffectiveSubscriptionPlan } from './subscriptionPlanUtils';
import { sendPaymentReceiptEmail, sendAdminPaymentNotificationEmail } from './resendClient';

export interface CustomSubscriptionMetadata {
  merchantId: string;
  planId: 'custom';
  billingInterval: 'monthly' | 'annual';
  type: 'custom_subscription';
  customConversationsLimit: number;
  customAgentsLimit: number;
  customSupervisorsLimit: number;
  customMonthlyPrice: number;
  customAnnualPrice: number;
}

export interface PaymentWebhookPayload {
  transaction_id: string;
  external_id: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
  amount: number;
  paid_at?: string;
  payment_method?: string;
  metadata?: {
    merchantId?: string;
    planId?: string;
    billingInterval?: string;
    type?: string;
    addonType?: string;
    boosterType?: string;
    isDowngrade?: string;
    scheduledActivationDate?: string;
    customConversationsLimit?: number | string;
    customAgentsLimit?: number | string;
    customSupervisorsLimit?: number | string;
    customMonthlyPrice?: number | string;
    customAnnualPrice?: number | string;
  };
}

export class PaymentWebhookHandler {
  static async processWebhook(
    payload: PaymentWebhookPayload,
    signature: string,
    timestamp: string
  ): Promise<{ success: boolean; message: string }> {
    const gatewayName = await getActiveGatewayName();
    const payloadString = JSON.stringify(payload);
    const isValid = verifyWebhookSignature(payloadString, timestamp, signature);
    
    if (!isValid) {
      console.warn(`Invalid ${gatewayName} webhook signature - rejecting request`);
      return { success: false, message: 'Invalid signature' };
    }

    console.log(`Processing ${gatewayName} webhook:`, {
      transactionId: payload.transaction_id,
      status: payload.status,
      amount: payload.amount,
    });

    try {
      switch (payload.status) {
        case 'PAID':
          return await this.handlePaymentSuccess(payload);
        case 'EXPIRED':
          return await this.handlePaymentExpired(payload);
        case 'CANCELLED':
        case 'FAILED':
          return await this.handlePaymentFailed(payload);
        default:
          return { success: true, message: 'Webhook received' };
      }
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      return { success: false, message: error.message };
    }
  }

  private static async handlePaymentSuccess(payload: PaymentWebhookPayload): Promise<{ success: boolean; message: string }> {
    const { external_id, metadata, transaction_id, amount, payment_method, paid_at } = payload;

    // Handle booster payments (Task #328) — top-up quotas / extra slots.
    // Resolve booster info metadata-independently: gateway may strip metadata,
    // so we also recover from the pending payment_transactions row created by
    // /api/merchant/boosters/initiate-payment, which stores
    // gatewayResponse = { type: "booster", boosterType, ... }.
    let boosterMerchantId: string | undefined =
      metadata?.type === 'booster' ? metadata?.merchantId : undefined;
    let boosterTypeResolved: string | undefined =
      metadata?.type === 'booster' ? metadata?.boosterType : undefined;

    if (!boosterMerchantId || !boosterTypeResolved) {
      const candidateTx = await storage.getPaymentTransactionByExternalId(external_id);
      const gw = (candidateTx?.gatewayResponse as any) || {};
      if (gw?.type === 'booster' && typeof gw?.boosterType === 'string' && candidateTx?.merchantId) {
        boosterMerchantId = candidateTx.merchantId;
        boosterTypeResolved = gw.boosterType;
      }
    }

    if (boosterMerchantId && boosterTypeResolved) {
      const merchantId = boosterMerchantId;
      const boosterType = boosterTypeResolved;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) return { success: false, message: 'Merchant not found' };
      const booster = await storage.getBoosterConfig(boosterType);
      if (!booster) return { success: false, message: 'Booster config not found' };

      // True idempotency + atomicity: require a pending payment_transactions
      // row, then atomically (single DB transaction) flip pending → paid AND
      // increment merchant quota. The conditional flip is the lock — only
      // the first concurrent webhook delivery wins; replays are no-ops. If
      // the quota update fails, the entire transaction rolls back so the row
      // stays 'pending' for a safe retry (no lost entitlement, no double credit).
      const existingTx = await storage.getPaymentTransactionByExternalId(external_id);
      if (!existingTx) {
        console.warn(`Booster webhook for ${external_id} has no pending transaction, refusing to apply`);
        return { success: false, message: 'Unknown transaction' };
      }

      let outcome: "applied" | "already_processed" | "tx_not_found";
      try {
        outcome = await storage.fulfillBoosterPaymentAtomic({
          paymentTransactionId: existingTx.id,
          merchantId,
          booster,
          paidAt: paid_at ? new Date(paid_at) : new Date(),
        });
      } catch (e: any) {
        console.error('Atomic booster fulfillment failed (tx rolled back, will retry)', e);
        return { success: false, message: e?.message || 'Failed to apply booster' };
      }

      if (outcome === 'tx_not_found') {
        return { success: false, message: 'Unknown transaction' };
      }
      if (outcome === 'already_processed') {
        console.log(`Booster webhook for ${external_id} already processed, skipping`);
        return { success: true, message: 'Already processed' };
      }

      await storage.createMerchantNotification({
        merchantId,
        type: 'invoice',
        title: 'Booster Activated',
        message: `Your ${booster.name} has been added to your account.`,
        metadata: { boosterType, transactionId: transaction_id, amount },
        isRead: false,
      });
      console.log(`Booster ${boosterType} applied for merchant ${merchantId} via webhook`);
      return { success: true, message: 'Booster applied' };
    }

    // Handle addon payments (type === "addon")
    if (metadata?.type === 'addon' && metadata?.merchantId && metadata?.addonType) {
      const { merchantId, addonType } = metadata;
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return { success: false, message: 'Merchant not found' };
      }
      const existing = await storage.getMerchantAddon(merchantId, addonType);
      const calendarToken = addonType === 'appointment_scheduling'
        ? (existing?.calendarToken || randomBytes(16).toString('hex'))
        : null;

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      if (existing) {
        await storage.updateMerchantAddon(existing.id, {
          isActive: true,
          subscribedAt: new Date(),
          expiresAt,
          paymentReference: transaction_id,
          ...(calendarToken && !existing.calendarToken ? { calendarToken } : {}),
        });
      } else {
        const addonId = 'maw_' + randomBytes(8).toString('hex');
        await storage.createMerchantAddon({
          id: addonId,
          merchantId,
          addonType,
          isActive: true,
          calendarToken,
          expiresAt,
          paymentReference: transaction_id,
        });
      }

      await storage.createMerchantNotification({
        merchantId,
        type: 'invoice',
        title: 'Addon Activated',
        message: `Your ${addonType.replace(/_/g, ' ')} addon has been activated successfully.`,
        metadata: { addonType, transactionId: transaction_id, amount },
        isRead: false,
      });

      console.log(`Addon ${addonType} activated for merchant ${merchantId} via webhook`);
      return { success: true, message: 'Addon activated' };
    }

    // Handle custom plan subscriptions (type === "custom_subscription")
    // The calculator-driven custom plan flow stores the chosen limits in
    // metadata AND in the persisted paymentTransactions.gatewayResponse so the
    // webhook can apply them when the QRIS payment clears. We also accept the
    // case where 12Pay does not echo metadata back: in that case we recover the
    // custom config from the saved gatewayResponse on the pending transaction.
    type CustomSubscriptionSource = Partial<CustomSubscriptionMetadata> & { merchantId: string };
    let customRecoveredFromTx: CustomSubscriptionSource | null = null;
    if (!(metadata?.type === 'custom_subscription')) {
      const maybePending = await storage.getPaymentTransactionByExternalId(external_id);
      const gr = (maybePending?.gatewayResponse ?? {}) as Partial<CustomSubscriptionMetadata> & { type?: string };
      if (gr.type === 'custom_subscription' && maybePending?.merchantId) {
        customRecoveredFromTx = { ...gr, merchantId: maybePending.merchantId };
      }
    }
    if (
      (metadata?.type === 'custom_subscription' && metadata?.merchantId && metadata?.planId === 'custom')
      || customRecoveredFromTx
    ) {
      const src: CustomSubscriptionSource = customRecoveredFromTx ?? {
        merchantId: metadata!.merchantId as string,
        billingInterval: metadata!.billingInterval === 'annual' ? 'annual' : 'monthly',
        customConversationsLimit: metadata!.customConversationsLimit as number | undefined,
        customAgentsLimit: metadata!.customAgentsLimit as number | undefined,
        customSupervisorsLimit: metadata!.customSupervisorsLimit as number | undefined,
        customMonthlyPrice: metadata!.customMonthlyPrice as number | undefined,
        customAnnualPrice: metadata!.customAnnualPrice as number | undefined,
      };
      const customMerchantId: string = src.merchantId;
      const customBillingInterval = src.billingInterval === 'annual' ? 'annual' : 'monthly';
      const merchant = await storage.getMerchant(customMerchantId);
      if (!merchant) {
        return { success: false, message: 'Merchant not found' };
      }

      // Idempotency / correlation guard: if a transaction row exists for this
      // external_id and is already paid, do nothing. Otherwise mark it paid.
      const existing = await storage.getPaymentTransactionByExternalId(external_id);
      if (existing && (existing.status === 'paid' || existing.status === 'completed')) {
        console.log(`Custom plan webhook: transaction ${external_id} already processed, skipping.`);
        return { success: true, message: 'Custom plan already activated' };
      }
      // Reject stale duplicate: another newer pending transaction is the active one.
      if (
        merchant.pendingTransactionId &&
        merchant.pendingTransactionId !== transaction_id &&
        merchant.subscriptionPlanId === 'custom'
      ) {
        console.warn(`Custom plan webhook: stale tx ${transaction_id} ignored — current pending is ${merchant.pendingTransactionId}`);
        if (existing) {
          await storage.updatePaymentTransaction(existing.id, { status: 'expired' });
        }
        return { success: true, message: 'Stale custom plan transaction ignored' };
      }

      const periodEnd = new Date();
      if (customBillingInterval === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const customConversationsLimit = Number(src.customConversationsLimit) || null;
      const customAgentsLimit = Number(src.customAgentsLimit) || null;
      const customSupervisorsLimit = Number(src.customSupervisorsLimit) || null;
      const customMonthlyPrice = Number(src.customMonthlyPrice) || null;
      const customAnnualPrice = Number(src.customAnnualPrice) || null;

      if (existing) {
        await storage.updatePaymentTransaction(existing.id, {
          status: 'paid',
          paidAt: paid_at ? new Date(paid_at) : new Date(),
          paymentMethod: payment_method || existing.paymentMethod || 'QRIS',
        });
      }

      await storage.updateMerchantSubscription(customMerchantId, {
        subscriptionStatus: 'active',
        subscriptionPlanId: 'custom',
        billingInterval: customBillingInterval,
        currentPeriodEnd: periodEnd,
        paymentSubscriptionId: transaction_id,
        lastInvoiceId: transaction_id,
        pendingTransactionId: null,
        conversationsUsed: 0,
        conversationsResetAt: new Date(),
        expiryReminder7dSentAt: null,
        expiryReminder3dSentAt: null,
        scheduledPlanId: null,
        scheduledBillingInterval: null,
        scheduledPlanActivatesAt: null,
        scheduledPlanTransactionId: null,
        customConversationsLimit,
        customAgentsLimit,
        customSupervisorsLimit,
        customMonthlyPrice,
        customAnnualPrice,
      });

      await storage.clearSessionLimitFallback(customMerchantId);

      await storage.createMerchantNotification({
        merchantId: customMerchantId,
        type: 'subscription',
        title: 'Custom Plan Activated',
        message: `Paket Custom Anda aktif: ${customConversationsLimit?.toLocaleString('id-ID')} percakapan / ${customAgentsLimit} agents / ${customSupervisorsLimit} supervisors. Berlaku hingga ${periodEnd.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
        metadata: {
          planId: 'custom',
          billingInterval: customBillingInterval,
          customConversationsLimit,
          customAgentsLimit,
          customSupervisorsLimit,
          customMonthlyPrice,
          expiresAt: periodEnd.toISOString(),
          status: 'active',
        },
        isRead: false,
      });

      console.log(
        `Custom plan activated for merchant ${customMerchantId}: ${customConversationsLimit} conv / ${customAgentsLimit} agents / ${customSupervisorsLimit} sup @ Rp ${customMonthlyPrice}/mo`,
      );
      return { success: true, message: 'Custom plan activated' };
    }

    let merchantId: string | undefined;
    let planId: SubscriptionPlanId | undefined;
    let billingInterval = 'monthly';
    let isDowngrade = false;
    let scheduledActivationDate: Date | null = null;
    
    if (!metadata?.merchantId) {
      const parts = external_id.split('_');
      merchantId = parts[1];
      if (!merchantId) {
        console.error('Cannot determine merchantId from webhook:', external_id);
        return { success: false, message: 'Missing merchantId' };
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return { success: false, message: 'Merchant not found' };
      }
      
      if (merchant.pendingTransactionId === transaction_id) {
        planId = parts[2] as SubscriptionPlanId;
        billingInterval = parts[3] || 'monthly';
      }
    } else {
      merchantId = metadata.merchantId;
      planId = metadata.planId as SubscriptionPlanId;
      billingInterval = metadata.billingInterval || 'monthly';
      isDowngrade = metadata.isDowngrade === 'true';
      if (metadata.scheduledActivationDate && metadata.scheduledActivationDate !== '') {
        scheduledActivationDate = new Date(metadata.scheduledActivationDate);
      }
    }
    
    if (!merchantId || !planId) {
      console.error('Missing required metadata:', metadata);
      return { success: false, message: 'Missing required metadata' };
    }
    
    const existingTransaction = await storage.getPaymentTransactionByExternalId(external_id);
    if (existingTransaction) {
      // If already paid/completed — just ensure receipt was sent and return early
      if (existingTransaction.status === 'paid' || existingTransaction.status === 'completed') {
        console.log(`Transaction already processed: ${existingTransaction.invoiceNumber}`);
        
        if (!existingTransaction.receiptSentAt) {
          const merchant = await storage.getMerchant(merchantId!);
          if (merchant) {
            try {
              await sendPaymentReceiptEmail({
                merchantEmail: merchant.email,
                merchantName: merchant.companyName || merchant.email.split('@')[0],
                invoiceNumber: existingTransaction.invoiceNumber || existingTransaction.id,
                planName: existingTransaction.planName || '',
                subscriptionMonths: existingTransaction.subscriptionMonths || 1,
                amount: existingTransaction.amount,
                paymentMethod: existingTransaction.paymentMethod || 'QRIS',
                paidAt: existingTransaction.paidAt || new Date(),
                expiresAt: existingTransaction.expiresAt || undefined,
              });
              await storage.updatePaymentTransaction(existingTransaction.id, { receiptSentAt: new Date() });
            } catch (e) {
              console.error('Retry receipt email failed:', e);
            }
          }
        }
        
        return { success: true, message: 'Transaction already processed' };
      }

      // Transaction exists but is still PENDING — this is the normal case for pre-saved
      // QRIS/VA transactions. Pull the subscription metadata from the saved gateway response
      // (since 12Pay does not echo our custom metadata back in the webhook).
      console.log(`Transaction found in pending state, activating subscription: ${existingTransaction.invoiceNumber}`);
      const gr = existingTransaction.gatewayResponse as Record<string, any> || {};

      if (!merchantId && gr.merchantId) merchantId = gr.merchantId;
      if (!planId && gr.planId) planId = gr.planId as SubscriptionPlanId;
      if (billingInterval === 'monthly' && gr.billingInterval) billingInterval = gr.billingInterval;
      if (!isDowngrade && gr.isDowngrade === 'true') isDowngrade = true;
      if (!scheduledActivationDate && gr.scheduledActivationDate) {
        scheduledActivationDate = new Date(gr.scheduledActivationDate);
      }

      if (!merchantId || !planId) {
        console.error('Cannot determine merchantId/planId from pending transaction:', existingTransaction.id);
        return { success: false, message: 'Missing subscription metadata' };
      }

      // Mark the transaction as paid
      const paidAtDate = paid_at ? new Date(paid_at) : new Date();
      await storage.updatePaymentTransaction(existingTransaction.id, {
        status: 'paid',
        paidAt: paidAtDate,
        paymentMethod: payment_method || existingTransaction.paymentMethod || 'QRIS',
      });

      // Activate or schedule the subscription
      if (isDowngrade && scheduledActivationDate) {
        await this.scheduleSubscriptionDowngrade(merchantId, planId, billingInterval, transaction_id, scheduledActivationDate);
        console.log(`Subscription downgrade scheduled for merchant ${merchantId}: ${planId}`);
      } else {
        await this.activateSubscription(merchantId, planId, billingInterval, transaction_id);
      }

      // Send receipt email
      const merchantForReceipt = await storage.getMerchant(merchantId);
      if (merchantForReceipt && !existingTransaction.receiptSentAt) {
        try {
          const planForReceipt = await getEffectiveSubscriptionPlan(planId);
          const planNameForReceipt = planForReceipt?.name || subscriptionPlans[planId]?.name || planId;
          const periodEndForReceipt = new Date(paidAtDate);
          if (billingInterval === 'annual') periodEndForReceipt.setFullYear(periodEndForReceipt.getFullYear() + 1);
          else periodEndForReceipt.setMonth(periodEndForReceipt.getMonth() + 1);

          await sendPaymentReceiptEmail({
            merchantEmail: merchantForReceipt.email,
            merchantName: merchantForReceipt.companyName || merchantForReceipt.email.split('@')[0],
            invoiceNumber: existingTransaction.invoiceNumber || existingTransaction.id,
            planName: planNameForReceipt,
            subscriptionMonths: billingInterval === 'annual' ? 12 : 1,
            amount: existingTransaction.amount,
            paymentMethod: payment_method || existingTransaction.paymentMethod || 'QRIS',
            paidAt: paidAtDate,
            expiresAt: periodEndForReceipt,
          });
          await storage.updatePaymentTransaction(existingTransaction.id, { receiptSentAt: new Date() });
        } catch (e) {
          console.error('Receipt email failed for pending transaction:', e);
        }
      }

      return { success: true, message: 'Subscription activated from pending transaction' };
    }
    
    const merchant = await storage.getMerchant(merchantId);
    if (!merchant) {
      return { success: false, message: 'Merchant not found' };
    }
    
    const plan = await getEffectiveSubscriptionPlan(planId);
    const planName = plan?.name || subscriptionPlans[planId]?.name || planId;
    const subscriptionMonths = billingInterval === 'annual' ? 12 : 1;
    const paidAtDate = paid_at ? new Date(paid_at) : new Date();
    const merchantName = merchant.companyName || merchant.email.split('@')[0];
    
    const periodEnd = new Date(paidAtDate);
    if (billingInterval === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    
    const transaction = await storage.createPaymentTransaction({
      merchantId,
      gatewayName: await getActiveGatewayName(),
      externalId: external_id,
      amount,
      currency: 'IDR',
      status: 'paid',
      paymentMethod: payment_method || 'QRIS',
      planId,
      planName,
      subscriptionMonths,
      merchantEmail: merchant.email,
      merchantCompanyName: merchantName,
      gatewayResponse: payload,
      paidAt: paidAtDate,
      expiresAt: periodEnd,
    });
    
    console.log(`Payment transaction recorded: ${transaction.invoiceNumber}`);
    
    // Create notification for payment receipt
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    await storage.createMerchantNotification({
      merchantId,
      type: "invoice",
      title: "Payment Received",
      message: `Payment of ${formattedAmount} for ${planName} plan has been received. Invoice: ${transaction.invoiceNumber}`,
      metadata: { 
        invoiceNumber: transaction.invoiceNumber, 
        amount, 
        planName, 
        paymentMethod: payment_method || 'QRIS',
        status: "paid" 
      },
      isRead: false,
    });
    
    // Handle scheduled downgrades vs immediate upgrades/new subscriptions
    if (isDowngrade && scheduledActivationDate) {
      await this.scheduleSubscriptionDowngrade(merchantId, planId, billingInterval, transaction_id, scheduledActivationDate);
      console.log(`Subscription downgrade scheduled for merchant ${merchantId}: ${planId} activates on ${scheduledActivationDate.toISOString()}`);
    } else {
      await this.activateSubscription(merchantId, planId, billingInterval, transaction_id);
    }
    
    try {
      await sendPaymentReceiptEmail({
        merchantEmail: merchant.email,
        merchantName,
        invoiceNumber: transaction.invoiceNumber || transaction.id,
        planName,
        subscriptionMonths,
        amount,
        paymentMethod: payment_method || 'QRIS',
        paidAt: paidAtDate,
        expiresAt: periodEnd,
      });
      
      await storage.updatePaymentTransaction(transaction.id, {
        receiptSentAt: new Date(),
      });
    } catch (emailError) {
      console.error('Failed to send receipt email:', emailError);
    }
    
    const adminNotification = await storage.createAdminNotification({
      type: 'payment_received',
      title: 'New Payment Received',
      message: `${merchantName} paid ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)} for ${planName} plan`,
      data: {
        transactionId: transaction.id,
        invoiceNumber: transaction.invoiceNumber,
        merchantId,
        merchantName,
        merchantEmail: merchant.email,
        planName,
        amount,
        paymentMethod: payment_method || 'QRIS',
      },
    });
    
    console.log(`Admin notification created: ${adminNotification.id}`);
    
    try {
      const adminEmails = ['admin@chatvice.app', 'master@chatvice.app'];
      for (const adminEmail of adminEmails) {
        await sendAdminPaymentNotificationEmail({
          adminEmail,
          merchantName,
          merchantEmail: merchant.email,
          invoiceNumber: transaction.invoiceNumber || transaction.id,
          planName,
          amount,
          paymentMethod: payment_method || 'QRIS',
          paidAt: paidAtDate,
        });
      }
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
    }
    
    return { success: true, message: 'Subscription activated with receipt' };
  }

  static async activateSubscription(
    merchantId: string,
    planId: SubscriptionPlanId,
    billingInterval: string,
    transactionId: string
  ): Promise<void> {
    const plan = await getEffectiveSubscriptionPlan(planId);
    if (!plan) {
      const basePlan = subscriptionPlans[planId];
      if (!basePlan) {
        throw new Error(`Invalid plan: ${planId}`);
      }
    }

    const periodEnd = new Date();
    if (billingInterval === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await storage.updateMerchantSubscription(merchantId, {
      subscriptionStatus: 'active',
      subscriptionPlanId: planId,
      billingInterval,
      currentPeriodEnd: periodEnd,
      paymentSubscriptionId: transactionId,
      lastInvoiceId: transactionId,
      pendingTransactionId: null,
      conversationsUsed: 0,
      conversationsResetAt: new Date(),
      expiryReminder7dSentAt: null,
      expiryReminder3dSentAt: null,
      // Clear any scheduled downgrade when activating a new subscription
      scheduledPlanId: null,
      scheduledBillingInterval: null,
      scheduledPlanActivatesAt: null,
      scheduledPlanTransactionId: null,
    });

    await storage.clearSessionLimitFallback(merchantId);

    // Create notification for plan activation
    const planName = plan?.name || subscriptionPlans[planId]?.name || planId;
    const billingText = billingInterval === 'annual' ? 'Annual' : 'Monthly';
    await storage.createMerchantNotification({
      merchantId,
      type: "subscription",
      title: "Plan Activated",
      message: `Your ${planName} plan (${billingText}) is now active until ${periodEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
      metadata: { planId, planName, billingInterval, expiresAt: periodEnd.toISOString(), status: "active" },
      isRead: false,
    });

    console.log(`Subscription activated for merchant ${merchantId}: ${planId} (${billingInterval})`);
  }

  static async scheduleSubscriptionDowngrade(
    merchantId: string,
    planId: SubscriptionPlanId,
    billingInterval: string,
    transactionId: string,
    activationDate: Date
  ): Promise<void> {
    const plan = await getEffectiveSubscriptionPlan(planId);
    if (!plan) {
      const basePlan = subscriptionPlans[planId];
      if (!basePlan) {
        throw new Error(`Invalid plan: ${planId}`);
      }
    }

    // Schedule the plan change - current subscription continues until activation date
    await storage.updateMerchantSubscription(merchantId, {
      pendingTransactionId: null,
      scheduledPlanId: planId,
      scheduledBillingInterval: billingInterval,
      scheduledPlanActivatesAt: activationDate,
      scheduledPlanTransactionId: transactionId,
    });

    // Create notification for scheduled plan change
    const planName = plan?.name || subscriptionPlans[planId]?.name || planId;
    const billingText = billingInterval === 'annual' ? 'Annual' : 'Monthly';
    await storage.createMerchantNotification({
      merchantId,
      type: "subscription",
      title: "Plan Change Scheduled",
      message: `Your plan will change to ${planName} (${billingText}) on ${activationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
      metadata: { planId, planName, billingInterval, activatesAt: activationDate.toISOString(), status: "scheduled" },
      isRead: false,
    });

    console.log(`Subscription downgrade scheduled for merchant ${merchantId}: ${planId} (${billingInterval}) activates on ${activationDate.toISOString()}`);
  }

  private static async handlePaymentExpired(payload: PaymentWebhookPayload): Promise<{ success: boolean; message: string }> {
    const { metadata, transaction_id, external_id, amount, payment_method } = payload;
    
    let merchantId = metadata?.merchantId;
    let planId = metadata?.planId as SubscriptionPlanId | undefined;
    let billingInterval = metadata?.billingInterval || 'monthly';
    
    if (!merchantId) {
      const parts = external_id.split('_');
      merchantId = parts[1];
      planId = parts[2] as SubscriptionPlanId;
      billingInterval = parts[3] || 'monthly';
    }
    
    if (merchantId) {
      const merchant = await storage.getMerchant(merchantId);
      if (merchant) {
        if (merchant.pendingTransactionId === transaction_id) {
          await storage.updateMerchantSubscription(merchantId, {
            pendingTransactionId: null,
          });
        }
        
        const existingTransaction = await storage.getPaymentTransactionByExternalId(external_id);
        if (!existingTransaction) {
          const plan = planId ? await getEffectiveSubscriptionPlan(planId) : null;
          const planName = plan?.name || subscriptionPlans[planId as SubscriptionPlanId]?.name || planId || 'Unknown';
          const subscriptionMonths = billingInterval === 'annual' ? 12 : 1;
          
          await storage.createPaymentTransaction({
            merchantId,
            gatewayName: await getActiveGatewayName(),
            externalId: external_id,
            amount: amount || 0,
            currency: 'IDR',
            status: 'expired',
            paymentMethod: payment_method || 'QRIS',
            planId: planId || 'unknown',
            planName,
            subscriptionMonths,
            merchantEmail: merchant.email,
            merchantCompanyName: merchant.companyName || merchant.email.split('@')[0],
            gatewayResponse: payload,
          });
          
          console.log(`Expired transaction recorded for merchant ${merchantId}`);
        }
      }
    }
    
    console.log(`Payment expired for transaction ${transaction_id}`);
    return { success: true, message: 'Payment expiry recorded' };
  }

  private static async handlePaymentFailed(payload: PaymentWebhookPayload): Promise<{ success: boolean; message: string }> {
    const { metadata, transaction_id, external_id, status, amount, payment_method } = payload;
    
    let merchantId = metadata?.merchantId;
    let planId = metadata?.planId as SubscriptionPlanId | undefined;
    let billingInterval = metadata?.billingInterval || 'monthly';
    
    if (!merchantId) {
      const parts = external_id.split('_');
      merchantId = parts[1];
      planId = parts[2] as SubscriptionPlanId;
      billingInterval = parts[3] || 'monthly';
    }
    
    if (merchantId) {
      const merchant = await storage.getMerchant(merchantId);
      if (merchant) {
        if (merchant.pendingTransactionId === transaction_id) {
          await storage.updateMerchantSubscription(merchantId, {
            pendingTransactionId: null,
          });
        }
        
        const existingTransaction = await storage.getPaymentTransactionByExternalId(external_id);
        if (!existingTransaction) {
          const plan = planId ? await getEffectiveSubscriptionPlan(planId) : null;
          const planName = plan?.name || subscriptionPlans[planId as SubscriptionPlanId]?.name || planId || 'Unknown';
          const subscriptionMonths = billingInterval === 'annual' ? 12 : 1;
          const transactionStatus = status.toLowerCase() as 'failed' | 'cancelled';
          
          await storage.createPaymentTransaction({
            merchantId,
            gatewayName: await getActiveGatewayName(),
            externalId: external_id,
            amount: amount || 0,
            currency: 'IDR',
            status: transactionStatus,
            paymentMethod: payment_method || 'QRIS',
            planId: planId || 'unknown',
            planName,
            subscriptionMonths,
            merchantEmail: merchant.email,
            merchantCompanyName: merchant.companyName || merchant.email.split('@')[0],
            gatewayResponse: payload,
          });
          
          console.log(`${status} transaction recorded for merchant ${merchantId}`);
        }
      }
    }
    
    console.log(`Payment ${status.toLowerCase()} for transaction ${transaction_id}`);
    return { success: true, message: `Payment ${status.toLowerCase()} recorded` };
  }
}

export async function checkAndRenewExpiredSubscriptions(): Promise<void> {
  try {
    console.log('[subscription-expiry] Checking for expired subscriptions...');
    const allMerchants = await storage.getAllMerchants();
    const now = new Date();
    let expiredCount = 0;

    for (const merchant of allMerchants) {
      if (merchant.subscriptionStatus !== 'active') continue;
      if (!merchant.currentPeriodEnd) continue;

      const expiresAt = new Date(merchant.currentPeriodEnd);
      if (expiresAt > now) continue;

      // Skip if they have an active PayPal subscription (PayPal handles renewal)
      if (merchant.paypalSubscriptionId) {
        // Verify the PayPal subscription is actually in ACTIVE state before skipping
        try {
          const { getPaypalSubscription } = await import('./paypal');
          const sub = await getPaypalSubscription(merchant.paypalSubscriptionId);
          if (sub?.status === 'ACTIVE') {
            console.log(`[subscription-expiry] Merchant ${merchant.id} has active PayPal subscription, skipping`);
            continue;
          }
          // PayPal subscription is not active — clear the stale ID and fall through to expire
          console.log(`[subscription-expiry] Merchant ${merchant.id} PayPal subscription status=${sub?.status}, clearing ID and expiring`);
          await storage.updateMerchantSubscription(merchant.id, { paypalSubscriptionId: null });
        } catch (err: unknown) {
          // Use structured PaypalApiError.status to distinguish definitive failures
          // (404 stale ID, 400/422 invalid) from transient errors (5xx, network).
          // Fail closed on definitive failures so a broken PayPal linkage cannot
          // keep an expired subscription active forever.
          const { PaypalApiError } = await import('./paypal');
          if (err instanceof PaypalApiError) {
            const isDefinitiveFailure = err.status === 404 || err.status === 400 || err.status === 422;
            if (isDefinitiveFailure) {
              console.warn(`[subscription-expiry] PayPal subscription for merchant ${merchant.id} returned HTTP ${err.status} — treating as inactive, clearing ID and expiring`);
              await storage.updateMerchantSubscription(merchant.id, { paypalSubscriptionId: null });
              // Fall through to expire this merchant
            } else {
              // Transient API error (5xx, rate-limit, etc.) — skip conservatively this run
              console.error(`[subscription-expiry] Transient PayPal error for merchant ${merchant.id} (HTTP ${err.status}):`, err.message);
              continue;
            }
          } else {
            // Non-PayPal error (network failure, DNS, etc.) — skip conservatively
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[subscription-expiry] Network error verifying PayPal subscription for merchant ${merchant.id}:`, msg);
            continue;
          }
        }
      }

      // Mark as expired and reset usage counter
      await storage.updateMerchantSubscription(merchant.id, {
        subscriptionStatus: 'expired',
        conversationsUsed: 0,
      });
      expiredCount++;

      console.log(`[subscription-expiry] Marked merchant ${merchant.id} (${merchant.email}) as expired`);

      // Send expired notification
      const planName = merchant.subscriptionPlanId === 'custom' ? 'Custom Plan'
        : merchant.subscriptionPlanId?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Plan';

      await storage.createMerchantNotification({
        merchantId: merchant.id,
        type: 'subscription_expired',
        title: 'Subscription Expired',
        message: `Your ${planName} subscription has expired. Renew now to restore your chatbot.`,
        metadata: { planName, expiredAt: expiresAt.toISOString() },
        actionUrl: '/dashboard/billing',
        actionLabel: 'Renew Now',
        isRead: false,
      });

      // Send email (non-blocking)
      const { sendSubscriptionExpiringEmail } = await import('./resendClient');
      sendSubscriptionExpiringEmail({
        merchantEmail: merchant.email,
        merchantName: merchant.companyName || merchant.email.split('@')[0],
        planName,
        expiresAt,
        daysRemaining: 0,
      }).catch(err => console.error('[subscription-expiry] Failed to send expired email:', err));
    }

    if (expiredCount > 0) {
      console.log(`[subscription-expiry] Expired ${expiredCount} subscription(s)`);
    }
  } catch (error) {
    console.error('[subscription-expiry] Error checking expired subscriptions:', error);
  }
}
