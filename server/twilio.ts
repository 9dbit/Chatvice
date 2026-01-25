// Twilio Integration for SMS OTP
import twilio from 'twilio';

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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

// Generate 6-digit OTP code
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send SMS OTP
export async function sendSMSOTP(toPhoneNumber: string, otpCode: string): Promise<boolean> {
  try {
    const client = await getTwilioClient();
    const fromPhoneNumber = await getTwilioFromPhoneNumber();
    
    if (!fromPhoneNumber) {
      console.error('[Twilio] No phone number configured');
      return false;
    }
    
    const message = await client.messages.create({
      body: `Your Chatvice verification code is: ${otpCode}. This code expires in 5 minutes.`,
      from: fromPhoneNumber,
      to: toPhoneNumber
    });
    
    console.log('[Twilio] OTP sent successfully, SID:', message.sid);
    return true;
  } catch (error) {
    console.error('[Twilio] Error sending OTP:', error);
    return false;
  }
}

// Normalize phone number to E.164 format
export function normalizePhoneNumber(phone: string, countryCode?: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If doesn't start with +, add country code
  if (!cleaned.startsWith('+')) {
    // Default to +1 (US) if no country code provided
    const defaultCode = countryCode || '+1';
    cleaned = defaultCode + cleaned;
  }
  
  return cleaned;
}
