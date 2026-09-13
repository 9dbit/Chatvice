// Resend email client integration
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'noreply@chatvice.app'
  };
}

export async function sendVerificationEmail(toEmail: string, verificationToken: string, merchantName: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    // Use production domain for verification URL
    const baseUrl = process.env.REPLIT_DEPLOYMENT_ID 
      ? 'https://chatvice.app'
      : process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    
    console.log('Sending verification email:', { to: toEmail, from: fromEmail, url: verificationUrl });
    
    const { error } = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Verify your Chatvice account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 16px 0; font-size: 24px;">Welcome to Chatvice!</h1>
              <p style="color: #a1a1aa; margin: 0 0 32px 0; font-size: 16px; line-height: 1.5;">
                Hi ${merchantName},<br><br>
                Thank you for signing up. Please verify your email address to activate your account.
              </p>
              <a href="${verificationUrl}" style="display: inline-block; background-color: #6b5dfc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Verify Email Address
              </a>
              <p style="color: #71717a; margin: 32px 0 0 0; font-size: 14px;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="color: #52525b; margin: 24px 0 0 0; font-size: 12px;">
                This link expires in 24 hours.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend verification email error:', error);
      return false;
    }
    console.log('Verification email sent successfully to:', toEmail);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string, merchantName: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    // Use production domain for reset URL
    const baseUrl = process.env.REPLIT_DEPLOYMENT_ID 
      ? 'https://chatvice.app'
      : process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    console.log('Sending password reset email:', { to: toEmail, from: fromEmail, url: resetUrl });
    
    const { error } = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Reset your Chatvice password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 16px 0; font-size: 24px;">Reset Your Password</h1>
              <p style="color: #a1a1aa; margin: 0 0 32px 0; font-size: 16px; line-height: 1.5;">
                Hi ${merchantName},<br><br>
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <a href="${resetUrl}" style="display: inline-block; background-color: #6b5dfc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
              <p style="color: #71717a; margin: 32px 0 0 0; font-size: 14px;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
              <p style="color: #52525b; margin: 24px 0 0 0; font-size: 12px;">
                This link expires in 1 hour.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

export async function sendEmailChangeOtp(toEmail: string, otp: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    console.log('Sending email change OTP:', { to: toEmail, from: fromEmail });
    
    const { error } = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Chatvice - Email Change Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 16px 0; font-size: 24px;">Email Change Verification</h1>
              <p style="color: #a1a1aa; margin: 0 0 32px 0; font-size: 16px; line-height: 1.5;">
                Use the verification code below to confirm your new email address.
              </p>
              <div style="background-color: #27272a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px;">${otp}</p>
              </div>
              <p style="color: #71717a; margin: 0; font-size: 14px;">
                This code expires in 10 minutes. If you didn't request this change, you can safely ignore this email.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend email change OTP error:', error);
      return false;
    }
    console.log('Email change OTP sent successfully to:', toEmail);
    return true;
  } catch (error) {
    console.error('Failed to send email change OTP:', error);
    return false;
  }
}

interface PaymentReceiptData {
  merchantEmail: string;
  merchantName: string;
  invoiceNumber: string;
  planName: string;
  subscriptionMonths: number;
  amount: number;
  paymentMethod: string;
  paidAt: Date;
  expiresAt?: Date;
}

export async function sendPaymentReceiptEmail(data: PaymentReceiptData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };
    
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('id-ID', { 
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(new Date(date));
    };
    
    console.log('Sending payment receipt email:', { to: data.merchantEmail, invoice: data.invoiceNumber });
    
    const { error } = await client.emails.send({
      from: fromEmail,
      to: data.merchantEmail,
      subject: `Payment Receipt - ${data.invoiceNumber} | Chatvice`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 24px;">Payment Successful</h1>
                <p style="color: #22c55e; margin: 0; font-size: 16px; font-weight: 600;">Thank you for your payment!</p>
              </div>
              
              <div style="background-color: #27272a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Invoice Number</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${data.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Customer</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.merchantName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Plan</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.planName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Duration</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.subscriptionMonths} month(s)</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Payment Method</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Payment Date</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${formatDate(data.paidAt)}</td>
                  </tr>
                  ${data.expiresAt ? `
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Subscription Expires</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${formatDate(data.expiresAt)}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <div style="background-color: #6b5dfc; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="color: #ffffff; margin: 0 0 4px 0; font-size: 14px;">Total Amount Paid</p>
                <p style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${formatCurrency(data.amount)}</p>
              </div>
              
              <p style="color: #71717a; margin: 24px 0 0 0; font-size: 14px; text-align: center; line-height: 1.5;">
                This is an official receipt for your subscription payment.<br>
                If you have any questions, please contact our support team.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend receipt email error:', error);
      return false;
    }
    console.log('Payment receipt email sent successfully to:', data.merchantEmail);
    return true;
  } catch (error) {
    console.error('Failed to send payment receipt email:', error);
    return false;
  }
}

interface AdminPaymentNotificationData {
  adminEmail: string;
  merchantName: string;
  merchantEmail: string;
  invoiceNumber: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  paidAt: Date;
}

export async function sendAdminPaymentNotificationEmail(data: AdminPaymentNotificationData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };
    
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('id-ID', { 
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(new Date(date));
    };
    
    console.log('Sending admin payment notification email:', { to: data.adminEmail, invoice: data.invoiceNumber });
    
    const { error } = await client.emails.send({
      from: fromEmail,
      to: data.adminEmail,
      subject: `New Payment Received - ${formatCurrency(data.amount)} | ${data.merchantName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #22c55e; margin: 0 0 8px 0; font-size: 24px;">New Payment Received!</h1>
                <p style="color: #a1a1aa; margin: 0; font-size: 16px;">A new subscription payment has been processed</p>
              </div>
              
              <div style="background-color: #27272a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Invoice Number</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${data.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Customer</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.merchantName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Email</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.merchantEmail}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Plan</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.planName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Payment Method</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Payment Date</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${formatDate(data.paidAt)}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #22c55e; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="color: #ffffff; margin: 0 0 4px 0; font-size: 14px;">Amount Received</p>
                <p style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${formatCurrency(data.amount)}</p>
              </div>
              
              <p style="color: #71717a; margin: 24px 0 0 0; font-size: 14px; text-align: center;">
                Log in to the admin panel for more details.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice Admin Notification
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend admin notification email error:', error);
      return false;
    }
    console.log('Admin payment notification email sent successfully to:', data.adminEmail);
    return true;
  } catch (error) {
    console.error('Failed to send admin payment notification email:', error);
    return false;
  }
}

interface InvoiceSentData {
  merchantEmail: string;
  merchantName: string;
  invoiceNumber: string;
  planName: string;
  amount: number;
  currency: string;
  billingInterval: string;
  dueDate: Date;
  conversationsLimit: number;
  agentsLimit: number;
  supervisorsLimit: number;
}

export async function sendInvoiceEmail(data: InvoiceSentData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const formatCurrency = (amount: number, currency: string) => {
      if (currency === "IDR") {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
      }
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
    };
    
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('id-ID', { 
        year: 'numeric', month: 'long', day: 'numeric'
      }).format(new Date(date));
    };
    
    const baseUrl = process.env.REPLIT_DEPLOYMENT_ID 
      ? 'https://chatvice.app'
      : process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
    const billingUrl = `${baseUrl}/dashboard/billing`;
    
    console.log('Sending invoice email:', { to: data.merchantEmail, invoice: data.invoiceNumber });
    
    const { error } = await client.emails.send({
      from: fromEmail,
      to: data.merchantEmail,
      subject: `Invoice ${data.invoiceNumber} - Custom Plan | Chatvice`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 24px;">Custom Plan Invoice</h1>
                <p style="color: #a1a1aa; margin: 0; font-size: 16px;">Your custom plan invoice is ready</p>
              </div>
              
              <p style="color: #a1a1aa; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                Hi ${data.merchantName},<br><br>
                We've prepared a custom plan invoice based on your requirements. Please review the details below and complete the payment to activate your plan.
              </p>
              
              <div style="background-color: #27272a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Invoice Number</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${data.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Plan</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.planName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Billing</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Conversations</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.conversationsLimit === -1 ? 'Unlimited' : data.conversationsLimit.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">AI Agents</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.agentsLimit === -1 ? 'Unlimited' : data.agentsLimit}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Supervisors</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.supervisorsLimit === -1 ? 'Unlimited' : data.supervisorsLimit}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Due Date</td>
                    <td style="color: #f59e0b; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${formatDate(data.dueDate)}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #6b5dfc; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="color: #ffffff; margin: 0 0 4px 0; font-size: 14px;">Total Amount</p>
                <p style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${formatCurrency(data.amount, data.currency)}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${billingUrl}" style="display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Pay Invoice Now
                </a>
              </div>
              
              <p style="color: #71717a; margin: 24px 0 0 0; font-size: 14px; text-align: center; line-height: 1.5;">
                Log in to your Chatvice dashboard to complete the payment.<br>
                If you have any questions, please contact our support team.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend invoice email error:', error);
      return false;
    }
    console.log('Invoice email sent successfully to:', data.merchantEmail);
    return true;
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    return false;
  }
}

interface SubscriptionActivatedData {
  merchantEmail: string;
  merchantName: string;
  planName: string;
  billingInterval: string;
  expiresAt: Date;
  conversationsLimit: number;
  agentsLimit: number;
  supervisorsLimit: number;
}

export async function sendSubscriptionActivatedEmail(data: SubscriptionActivatedData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('id-ID', { 
        year: 'numeric', month: 'long', day: 'numeric'
      }).format(new Date(date));
    };
    
    const baseUrl = process.env.REPLIT_DEPLOYMENT_ID 
      ? 'https://chatvice.app'
      : process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
    const dashboardUrl = `${baseUrl}/dashboard`;
    
    console.log('Sending subscription activated email:', { to: data.merchantEmail, plan: data.planName });
    
    const { error } = await client.emails.send({
      from: fromEmail,
      to: data.merchantEmail,
      subject: `Subscription Activated - ${data.planName} | Chatvice`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 64px; height: 64px; background-color: #22c55e; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px;">&#10003;</span>
                </div>
                <h1 style="color: #22c55e; margin: 0 0 8px 0; font-size: 24px;">Subscription Activated!</h1>
                <p style="color: #a1a1aa; margin: 0; font-size: 16px;">Your ${data.planName} plan is now active</p>
              </div>
              
              <p style="color: #a1a1aa; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                Hi ${data.merchantName},<br><br>
                Great news! Your subscription has been successfully activated. Here are your plan details:
              </p>
              
              <div style="background-color: #27272a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Plan</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${data.planName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Billing Cycle</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Conversations</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.conversationsLimit === -1 ? 'Unlimited' : data.conversationsLimit.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">AI Agents</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.agentsLimit === -1 ? 'Unlimited' : data.agentsLimit}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Supervisors</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${data.supervisorsLimit === -1 ? 'Unlimited' : data.supervisorsLimit}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Valid Until</td>
                    <td style="color: #22c55e; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${formatDate(data.expiresAt)}</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" style="display: inline-block; background-color: #6b5dfc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Go to Dashboard
                </a>
              </div>
              
              <p style="color: #71717a; margin: 24px 0 0 0; font-size: 14px; text-align: center; line-height: 1.5;">
                Thank you for choosing Chatvice!<br>
                Start automating your customer support today.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend subscription activated email error:', error);
      return false;
    }
    console.log('Subscription activated email sent successfully to:', data.merchantEmail);
    return true;
  } catch (error) {
    console.error('Failed to send subscription activated email:', error);
    return false;
  }
}

interface SubscriptionExpiringData {
  merchantEmail: string;
  merchantName: string;
  planName: string;
  expiresAt: Date;
  daysRemaining: number;
  amount?: number;
  billingInterval?: string;
}

export async function sendSubscriptionExpiringEmail(data: SubscriptionExpiringData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric'
      }).format(new Date(date));
    };
    
    const baseUrl = process.env.REPLIT_DEPLOYMENT_ID 
      ? 'https://chatvice.app'
      : process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
    const billingUrl = `${baseUrl}/dashboard/billing`;

    const isExpired = data.daysRemaining === 0;
    const urgencyColor = isExpired ? '#6d28d9' : data.daysRemaining <= 3 ? '#7c3aed' : '#8b5cf6';
    const subject = isExpired
      ? `Your ${data.planName} Subscription Has Expired | Chatvice`
      : data.daysRemaining <= 3
        ? `URGENT: Your subscription expires in ${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''} | Chatvice`
        : `Renewal Reminder: ${data.planName} subscription expires in ${data.daysRemaining} days | Chatvice`;

    const invoiceDate = new Date();
    const invoiceNumber = `REM-${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 90000) + 10000}`;
    
    console.log('Sending subscription expiring email:', { to: data.merchantEmail, daysRemaining: data.daysRemaining });
    
    const { error } = await client.emails.send({
      from: fromEmail,
      to: data.merchantEmail,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background-color:#f6f3fb; color:#252238; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
            ${isExpired ? 'Your Chatvice subscription has expired.' : `Your Chatvice subscription expires in ${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''}.`}
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f6f3fb;">
            <tr><td align="center" style="padding:28px 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
                <tr><td style="padding:8px 8px 22px;">
                  <!-- Public deployment asset: client/public/chatvice-logo-light.png -->
                  <img src="https://chatvice.app/chatvice-logo-light.png" width="170" alt="Chatvice" style="display:block; width:170px; height:auto; border:0;">
                </td></tr>
                <tr><td style="background-color:#ffffff; border:1px solid #e7e0f4; border-radius:18px; padding:36px 34px 32px; box-shadow:0 8px 24px rgba(71,45,124,.08);">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td style="padding-bottom:24px; border-bottom:1px solid #eeeaf5;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="font-size:12px; line-height:18px; color:#766d89; text-transform:uppercase; letter-spacing:1.2px; font-weight:700;">Renewal notice</td>
                        <td align="right" style="font-size:12px; line-height:18px; color:#948ba5;">${invoiceNumber}</td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding:30px 0 22px;">
                      <div aria-hidden="true" style="width:42px; height:42px; border-radius:12px; background-color:#f0eafd; border-left:4px solid ${urgencyColor}; color:${urgencyColor}; font-size:22px; line-height:42px; text-align:center; font-weight:800;">!</div>
                      <h1 style="margin:18px 0 10px; color:#252238; font-size:28px; line-height:34px; letter-spacing:-.4px;">${isExpired ? 'Your subscription has expired' : 'Keep your customer service running'}</h1>
                      <p style="margin:0; color:#655c78; font-size:16px; line-height:26px;">
                        Hi <strong style="color:#252238;">${data.merchantName}</strong>,<br>
                        ${isExpired
                          ? `Your <strong style="color:#252238;">${data.planName}</strong> subscription expired on <strong style="color:#252238;">${formatDate(data.expiresAt)}</strong>. Your AI chatbot is currently suspended. Renew now to restore service immediately.`
                          : `Your <strong style="color:#252238;">${data.planName}</strong> subscription will expire on <strong style="color:#252238;">${formatDate(data.expiresAt)}</strong>. Renew before the deadline to avoid any service interruption for your customers.`}
                      </p>
                    </td></tr>
                    <tr><td style="padding:16px 18px; background-color:#fbf9ff; border:1px solid #e9e1fa; border-radius:12px;">
                      <p style="margin:0; color:${urgencyColor}; font-size:14px; line-height:20px; font-weight:700;">
                        ${isExpired ? 'Service is suspended' : `Expires in ${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''}`}
                      </p>
                    </td></tr>
                    <tr><td style="padding:28px 0;">
                      <p style="color:#766d89; margin:0 0 14px; font-size:11px; line-height:16px; text-transform:uppercase; letter-spacing:1.2px; font-weight:700;">Subscription details</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; line-height:20px;">
                        <tr><td style="padding:10px 0; color:#766d89; border-bottom:1px solid #eeeaf5;">Plan</td><td align="right" style="padding:10px 0; color:#252238; border-bottom:1px solid #eeeaf5; font-weight:700;">${data.planName}</td></tr>
                        <tr><td style="padding:10px 0; color:#766d89; border-bottom:1px solid #eeeaf5;">Billing cycle</td><td align="right" style="padding:10px 0; color:#252238; border-bottom:1px solid #eeeaf5;">${data.billingInterval === 'annual' ? 'Annual' : 'Monthly'}</td></tr>
                        ${data.amount != null ? `<tr><td style="padding:10px 0; color:#766d89; border-bottom:1px solid #eeeaf5;">Amount due</td><td align="right" style="padding:10px 0; color:#252238; border-bottom:1px solid #eeeaf5; font-weight:700;">$${(data.amount / 100).toFixed(2)}</td></tr>` : ''}
                        <tr><td style="padding:10px 0; color:#766d89;">${isExpired ? 'Expired on' : 'Expires on'}</td><td align="right" style="padding:10px 0; color:${urgencyColor}; font-weight:700;">${formatDate(data.expiresAt)}</td></tr>
                      </table>
                    </td></tr>
                    <tr><td style="padding:18px 20px; background-color:#f7f4fd; border-radius:12px;">
                      <p style="color:#40375a; margin:0 0 9px; font-size:14px; line-height:20px; font-weight:700;">What happens after expiration</p>
                      <p style="color:#766d89; margin:0; font-size:13px; line-height:22px;">Your AI chatbot stops responding to customers.<br>Active conversations are paused.<br>Your data and settings are preserved for 30 days.</p>
                    </td></tr>
                    <tr><td align="center" style="padding:30px 0 20px;">
                      <a href="${billingUrl}" style="display:inline-block; background-color:#6f38c5; color:#ffffff; text-decoration:none; padding:15px 30px; border-radius:9px; font-size:15px; line-height:20px; font-weight:700;">Renew subscription</a>
                    </td></tr>
                    <tr><td align="center" style="color:#948ba5; font-size:12px; line-height:19px;">If you have any questions, reply to this email or contact our support team.</td></tr>
                  </table>
                </td></tr>
                <tr><td align="center" style="padding:22px 8px 0; color:#948ba5; font-size:12px; line-height:18px;">&copy; ${new Date().getFullYear()} Chatvice. All rights reserved.</td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend subscription expiring email error:', error);
      return false;
    }
    console.log('Subscription expiring email sent successfully to:', data.merchantEmail);
    return true;
  } catch (error) {
    console.error('Failed to send subscription expiring email:', error);
    return false;
  }
}

// Send notification to admin when merchant signs up or signs in
export async function sendMerchantAuthNotification(
  activityType: 'sign_up' | 'sign_in',
  merchantEmail: string,
  merchantName: string,
  authMethod: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const isSignUp = activityType === 'sign_up';
    const actionText = isSignUp ? 'New Merchant Sign Up' : 'Merchant Sign In';
    const emoji = isSignUp ? '🎉' : '👋';
    const color = isSignUp ? '#22c55e' : '#6b5dfc';
    
    const authMethodLabel = {
      'email': 'Email/Password',
      'google': 'Google OAuth',
      'github': 'GitHub OAuth'
    }[authMethod] || authMethod;
    
    const { error } = await client.emails.send({
      from: fromEmail,
      to: 'hello@chatvice.app',
      subject: `${emoji} ${actionText}: ${merchantName || merchantEmail}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background-color: ${color}; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; color: #ffffff;">${emoji}</span>
                </div>
                <h1 style="color: ${color}; margin: 0 0 8px 0; font-size: 24px;">${actionText}</h1>
              </div>
              
              <div style="background-color: #27272a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #71717a; padding: 8px 0; font-size: 14px;">Email:</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${merchantEmail}</td>
                  </tr>
                  ${merchantName ? `
                  <tr>
                    <td style="color: #71717a; padding: 8px 0; font-size: 14px;">Name/Company:</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${merchantName}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="color: #71717a; padding: 8px 0; font-size: 14px;">Auth Method:</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${authMethodLabel}</td>
                  </tr>
                  ${ipAddress ? `
                  <tr>
                    <td style="color: #71717a; padding: 8px 0; font-size: 14px;">IP Address:</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${ipAddress}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="color: #71717a; padding: 8px 0; font-size: 14px;">Time:</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} WIB</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #71717a; margin: 0; font-size: 12px; text-align: center;">
                This is an automated notification from Chatvice.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend merchant auth notification error:', error);
      return false;
    }
    console.log(`Merchant ${activityType} notification sent to hello@chatvice.app for:`, merchantEmail);
    return true;
  } catch (error) {
    console.error('Failed to send merchant auth notification:', error);
    return false;
  }
}

export async function sendQuota80Email(
  toEmail: string,
  merchantName: string,
  conversationsUsed: number,
  conversationsLimit: number,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const baseUrl = process.env.REPLIT_DEPLOYMENT_ID
      ? 'https://chatvice.app'
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
    const plansUrl = `${baseUrl}/dashboard/plans`;

    const usagePercent = Math.round((conversationsUsed / conversationsLimit) * 100);

    const { error } = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `You've used ${usagePercent}% of your monthly conversation quota`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 16px 0; font-size: 24px;">Quota Alert: ${usagePercent}% Used</h1>
              <p style="color: #a1a1aa; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                Hi ${merchantName},
              </p>
              <p style="color: #a1a1aa; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                You've used <strong style="color: #f59e0b;">${conversationsUsed} of ${conversationsLimit}</strong> conversations this billing cycle. That's ${usagePercent}% of your monthly limit.
              </p>
              <p style="color: #a1a1aa; margin: 0 0 32px 0; font-size: 16px; line-height: 1.5;">
                Consider upgrading your plan now to avoid any interruption to your customers' experience.
              </p>
              <a href="${plansUrl}" style="display: inline-block; background-color: #6b5dfc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Upgrade Options
              </a>
              <p style="color: #71717a; margin: 32px 0 0 0; font-size: 14px;">
                This is a one-time notification for this billing cycle.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend quota 80% email error:', error);
      return false;
    }
    console.log(`Quota 80% email sent to: ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send quota 80% email:', error);
    return false;
  }
}

export async function sendQuota100Email(
  toEmail: string,
  merchantName: string,
  conversationsLimit: number,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const baseUrl = process.env.REPLIT_DEPLOYMENT_ID
      ? 'https://chatvice.app'
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
    const plansUrl = `${baseUrl}/dashboard/plans`;

    const { error } = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Your monthly conversation quota is exhausted`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 16px 0; font-size: 24px;">Conversation Quota Exhausted</h1>
              <p style="color: #a1a1aa; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                Hi ${merchantName},
              </p>
              <p style="color: #a1a1aa; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                You've reached your monthly limit of <strong style="color: #ef4444;">${conversationsLimit} conversations</strong>. New customer conversations are currently being handled in human-fallback mode or blocked until your quota resets or you upgrade.
              </p>
              <p style="color: #a1a1aa; margin: 0 0 32px 0; font-size: 16px; line-height: 1.5;">
                Upgrade your plan now to restore full service immediately.
              </p>
              <a href="${plansUrl}" style="display: inline-block; background-color: #6b5dfc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Upgrade Now
              </a>
              <p style="color: #71717a; margin: 32px 0 0 0; font-size: 14px;">
                This is a one-time notification for this billing cycle.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend quota 100% email error:', error);
      return false;
    }
    console.log(`Quota 100% email sent to: ${toEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send quota 100% email:', error);
    return false;
  }
}

// ───── Panel API health alert (Custom Data Source connector) ─────
// Sent when the merchant's panel API exceeds the 50%/5min error threshold.
export async function sendPanelHealthAlertEmail(opts: {
  toEmail: string;
  merchantName: string;
  sourceName: string;
  endpoint: string;
  errorRatePct: number;
  totalPings: number;
  lastError: string | null;
}): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const baseUrl = process.env.REPLIT_DEPLOYMENT_ID
      ? 'https://chatvice.app'
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
    const dashUrl = `${baseUrl}/dashboard/custom-data-source`;
    const escape = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const { error } = await client.emails.send({
      from: fromEmail,
      to: opts.toEmail,
      subject: `[Chatvice] Panel API "${opts.sourceName}" gangguan (${opts.errorRatePct}% error)`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f5;margin:0;padding:0;">
        <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
          <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e4e4e7;">
            <h2 style="color:#dc2626;margin:0 0 8px;font-size:20px;">⚠️ Panel API Anda Sedang Bermasalah</h2>
            <p style="color:#3f3f46;margin:0 0 16px;">Halo ${escape(opts.merchantName)},</p>
            <p style="color:#3f3f46;margin:0 0 16px;line-height:1.5;">
              Chatvice mendeteksi bahwa panel API <strong>${escape(opts.sourceName)}</strong> mengalami
              error rate <strong>${opts.errorRatePct}%</strong> dalam 5 menit terakhir
              (${opts.totalPings} pemeriksaan otomatis). Ini berarti customer kemungkinan
              mendapat jawaban "Maaf, sistem sedang sibuk" dari AI agent saat ini.
            </p>
            <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
              <div style="font-size:13px;color:#7f1d1d;"><strong>Endpoint:</strong> ${escape(opts.endpoint)}</div>
              ${opts.lastError ? `<div style="font-size:13px;color:#7f1d1d;margin-top:6px;"><strong>Pesan error terakhir:</strong> ${escape(opts.lastError)}</div>` : ''}
            </div>
            <p style="color:#3f3f46;margin:0 0 20px;line-height:1.5;">
              Silakan cek panel backend Anda dan pastikan endpoint health-check merespons dengan benar.
              Anda akan mendapat email lanjutan otomatis jika kondisi terus memburuk setelah pulih.
            </p>
            <a href="${dashUrl}" style="display:inline-block;background:#6b5dfc;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500;">Buka Dashboard</a>
            <p style="color:#71717a;font-size:12px;margin:24px 0 0;">Email otomatis dari sistem monitoring Chatvice. Untuk berhenti menerima alert ini, matikan toggle "Monitor kesehatan" pada halaman Custom Data Source.</p>
          </div>
        </div>
      </body></html>`,
    });
    if (error) {
      console.error('[panel-health-alert] Resend error:', error);
      return false;
    }
    console.log(`[panel-health-alert] sent to ${opts.toEmail}`);
    return true;
  } catch (err) {
    console.error('[panel-health-alert] failed:', err);
    return false;
  }
}

interface CryptoProofSubmittedData {
  merchantName: string;
  merchantEmail: string;
  itemType: 'booster' | 'addon';
  itemName: string;
  itemKey: string;
  txHash: string;
  submittedAt: Date;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendAdminCryptoProofEmail(data: CryptoProofSubmittedData): Promise<boolean> {
  const ADMIN_EMAIL = process.env.CRYPTO_PROOF_NOTIFY_EMAIL || 'master@chatvice.app';
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'UTC', timeZoneName: 'short',
      }).format(new Date(date));
    };

    const label = data.itemType === 'booster' ? 'Booster' : 'Add-on';
    const eName = escapeHtml(data.merchantName);
    const eEmail = escapeHtml(data.merchantEmail);
    const eItemName = escapeHtml(data.itemName);
    const eItemKey = escapeHtml(data.itemKey);
    const eTxHash = escapeHtml(data.txHash);
    const subject = `[Action Required] Crypto Payment Proof — ${data.merchantName} / ${data.itemName}`;

    const { error } = await client.emails.send({
      from: fromEmail,
      to: ADMIN_EMAIL,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #18181b; border-radius: 12px; padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #f59e0b; margin: 0 0 8px 0; font-size: 24px;">Crypto Payment Proof Submitted</h1>
                <p style="color: #a1a1aa; margin: 0; font-size: 16px;">A merchant has submitted a transaction hash and is awaiting review</p>
              </div>

              <div style="background-color: #27272a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px; width: 40%;">Merchant</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${eName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Merchant Email</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${eEmail}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Type</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${label}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">${label} Name</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${eItemName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">${label} Key</td>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 13px; text-align: right; font-family: monospace;">${eItemKey}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; padding: 8px 0; font-size: 14px;">Submitted At</td>
                    <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${formatDate(data.submittedAt)}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #1c1917; border: 1px solid #44403c; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Transaction Hash / Reference</p>
                <p style="color: #f59e0b; margin: 0; font-size: 14px; font-family: monospace; word-break: break-all;">${eTxHash}</p>
              </div>

              <p style="color: #71717a; margin: 0; font-size: 14px; text-align: center; line-height: 1.6;">
                Please verify this transaction on the blockchain and activate the ${label.toLowerCase()} in the<br>
                <strong style="color: #a1a1aa;">Master Control Panel &rarr; Payments</strong> once confirmed.
              </p>
            </div>
            <p style="text-align: center; color: #71717a; margin: 24px 0 0 0; font-size: 12px;">
              &copy; ${new Date().getFullYear()} Chatvice Admin Notification
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[crypto-proof-email] Resend error:', error);
      return false;
    }
    console.log('[crypto-proof-email] Admin notified at', ADMIN_EMAIL, 'for', data.itemKey);
    return true;
  } catch (err) {
    console.error('[crypto-proof-email] Failed to send:', err);
    return false;
  }
}
