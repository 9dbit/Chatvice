
import crypto from 'crypto';
import { storage } from './storage';

interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    click?: {
      ipAddress: string;
      link: string;
      timestamp: string;
      userAgent: string;
    };
    bounce?: {
      bounceType: string;
    };
  };
}

export class ResendWebhookHandler {
  /**
   * Verify webhook signature from Resend
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Process incoming webhook from Resend
   */
  static async processWebhook(event: ResendWebhookEvent): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Resend webhook received:', {
        type: event.type,
        emailId: event.data.email_id,
        to: event.data.to,
      });

      // Log the event for monitoring
      const eventLog = {
        type: event.type,
        emailId: event.data.email_id,
        from: event.data.from,
        to: event.data.to.join(', '),
        subject: event.data.subject,
        timestamp: event.created_at,
        data: event.data,
      };

      // Store in platform settings for audit trail
      const logKey = `resend_webhook_${event.data.email_id}_${Date.now()}`;
      await storage.setPlatformSetting(logKey, JSON.stringify(eventLog));

      // Handle specific event types
      switch (event.type) {
        case 'email.bounced':
          console.warn('Email bounced:', {
            to: event.data.to,
            bounceType: event.data.bounce?.bounceType,
          });
          
          // Mark email as bounced in merchant records if it's a verification email
          for (const email of event.data.to) {
            const merchant = await storage.getMerchantByEmail(email);
            if (merchant && !merchant.isEmailVerified) {
              // Could add a flag here to track bounced emails
              console.log(`Email bounced for merchant: ${merchant.id}`);
            }
          }
          break;

        case 'email.delivered':
          console.log('Email delivered successfully:', event.data.to);
          break;

        case 'email.opened':
          console.log('Email opened:', event.data.to);
          break;

        case 'email.clicked':
          console.log('Email link clicked:', {
            to: event.data.to,
            link: event.data.click?.link,
          });
          break;

        case 'email.complained':
          console.warn('Email marked as spam:', event.data.to);
          break;
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error: any) {
      console.error('Resend webhook processing error:', error);
      return { success: false, message: error.message || 'Webhook processing failed' };
    }
  }
}
