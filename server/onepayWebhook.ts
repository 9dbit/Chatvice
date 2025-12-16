import { verifyWebhookSignature } from './onepayClient';
import { storage } from './storage';
import { subscriptionPlans, type SubscriptionPlanId } from '@shared/schema';
import { getEffectiveSubscriptionPlan } from './subscriptionPlanUtils';

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
    const { external_id, metadata, transaction_id } = payload;
    
    if (!metadata?.merchantId) {
      const parts = external_id.split('_');
      const merchantId = parts[1];
      if (!merchantId) {
        console.error('Cannot determine merchantId from webhook:', external_id);
        return { success: false, message: 'Missing merchantId' };
      }
      
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant) {
        return { success: false, message: 'Merchant not found' };
      }
      
      if (merchant.pendingTransactionId === transaction_id) {
        const planId = parts[2] as SubscriptionPlanId;
        const billingInterval = parts[3] || 'monthly';
        
        await this.activateSubscription(merchantId, planId, billingInterval, transaction_id);
        return { success: true, message: 'Subscription activated from order ID' };
      }
    }
    
    const merchantId = metadata?.merchantId;
    const planId = metadata?.planId as SubscriptionPlanId;
    const billingInterval = metadata?.billingInterval || 'monthly';
    
    if (!merchantId || !planId) {
      console.error('Missing required metadata:', metadata);
      return { success: false, message: 'Missing required metadata' };
    }
    
    await this.activateSubscription(merchantId, planId, billingInterval, transaction_id);
    return { success: true, message: 'Subscription activated' };
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
