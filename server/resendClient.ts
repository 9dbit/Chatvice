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
