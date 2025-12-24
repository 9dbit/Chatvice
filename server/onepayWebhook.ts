import { verifyWebhookSignature } from './onepayClient';
import { storage } from './storage';
import { subscriptionPlans, type SubscriptionPlanId } from '@shared/schema';
import { getEffectiveSubscriptionPlan } from './subscriptionPlanUtils';
import { sendPaymentReceiptEmail, sendAdminPaymentNotificationEmail } from './resendClient';

export interface OnePayWebhookPayload {
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
  };
}

export class OnePayWebhookHandler {
  static async processWebhook(
    payload: OnePayWebhookPayload,
    signature: string,
    timestamp: string
  ): Promise<{ success: boolean; message: string }> {
    const payloadString = JSON.stringify(payload);
    const isValid = verifyWebhookSignature(payloadString, timestamp, signature);
    
    if (!isValid) {
      console.warn('Invalid 1-Pay webhook signature - rejecting request');
      return { success: false, message: 'Invalid signature' };
    }

    console.log('Processing 1-Pay webhook:', {
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

  private static async handlePaymentSuccess(payload: OnePayWebhookPayload): Promise<{ success: boolean; message: string }> {
    const { external_id, metadata, transaction_id, amount, payment_method, paid_at } = payload;
    
    let merchantId: string | undefined;
    let planId: SubscriptionPlanId | undefined;
    let billingInterval = 'monthly';
    
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
    }
    
    if (!merchantId || !planId) {
      console.error('Missing required metadata:', metadata);
      return { success: false, message: 'Missing required metadata' };
    }
    
    // Check for existing transaction to ensure idempotency
    const existingTransaction = await storage.getPaymentTransactionByExternalId(external_id);
    if (existingTransaction) {
      console.log(`Transaction already processed: ${existingTransaction.invoiceNumber}`);
      
      // If receipt wasn't sent, try again
      if (!existingTransaction.receiptSentAt) {
        const merchant = await storage.getMerchant(merchantId);
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
    
    // Get merchant and plan info for transaction record
    const merchant = await storage.getMerchant(merchantId);
    if (!merchant) {
      return { success: false, message: 'Merchant not found' };
    }
    
    const plan = await getEffectiveSubscriptionPlan(planId);
    const planName = plan?.name || subscriptionPlans[planId]?.name || planId;
    const subscriptionMonths = billingInterval === 'annual' ? 12 : 1;
    const paidAtDate = paid_at ? new Date(paid_at) : new Date();
    const merchantName = merchant.companyName || merchant.email.split('@')[0];
    
    // Calculate subscription end date
    const periodEnd = new Date(paidAtDate);
    if (billingInterval === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    
    // Create payment transaction record
    const transaction = await storage.createPaymentTransaction({
      merchantId,
      gatewayName: '1-Pay',
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
    
    // Activate subscription
    await this.activateSubscription(merchantId, planId, billingInterval, transaction_id);
    
    // Send receipt email to merchant
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
      
      // Update receipt sent timestamp
      await storage.updatePaymentTransaction(transaction.id, {
        receiptSentAt: new Date(),
      });
    } catch (emailError) {
      console.error('Failed to send receipt email:', emailError);
    }
    
    // Create admin notification
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
    
    // Send admin notification email
    try {
      // Get all admins to notify
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

  private static async activateSubscription(
    merchantId: string,
    planId: SubscriptionPlanId,
    billingInterval: string,
    transactionId: string
  ): Promise<void> {
    // Use effective plan with custom overrides from database
    const plan = await getEffectiveSubscriptionPlan(planId);
    if (!plan) {
      // Fallback to base plan if effective plan fails
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
    });

    console.log(`Subscription activated for merchant ${merchantId}: ${planId} (${billingInterval})`);
  }

  private static async handlePaymentExpired(payload: OnePayWebhookPayload): Promise<{ success: boolean; message: string }> {
    const { metadata, transaction_id, external_id } = payload;
    
    let merchantId = metadata?.merchantId;
    if (!merchantId) {
      const parts = external_id.split('_');
      merchantId = parts[1];
    }
    
    if (merchantId) {
      const merchant = await storage.getMerchant(merchantId);
      if (merchant && merchant.pendingTransactionId === transaction_id) {
        await storage.updateMerchantSubscription(merchantId, {
          pendingTransactionId: null,
        });
      }
    }
    
    console.log(`Payment expired for transaction ${transaction_id}`);
    return { success: true, message: 'Payment expiry recorded' };
  }

  private static async handlePaymentFailed(payload: OnePayWebhookPayload): Promise<{ success: boolean; message: string }> {
    const { metadata, transaction_id, external_id, status } = payload;
    
    let merchantId = metadata?.merchantId;
    if (!merchantId) {
      const parts = external_id.split('_');
      merchantId = parts[1];
    }
    
    if (merchantId) {
      const merchant = await storage.getMerchant(merchantId);
      if (merchant && merchant.pendingTransactionId === transaction_id) {
        await storage.updateMerchantSubscription(merchantId, {
          pendingTransactionId: null,
        });
      }
    }
    
    console.log(`Payment ${status.toLowerCase()} for transaction ${transaction_id}`);
    return { success: true, message: `Payment ${status.toLowerCase()} recorded` };
  }
}

export async function checkAndRenewExpiredSubscriptions(): Promise<void> {
  console.log('Checking for expired subscriptions...');
  
}
