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
