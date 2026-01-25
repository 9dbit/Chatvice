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
    console.error('[Twilio] X_REPLIT_TOKEN not found. REPL_IDENTITY:', !!process.env.REPL_IDENTITY, 'WEB_REPL_RENEWAL:', !!process.env.WEB_REPL_RENEWAL);
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  if (!hostname) {
    console.error('[Twilio] REPLIT_CONNECTORS_HOSTNAME not set');
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not set');
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    const data = await response.json();
    connectionSettings = data.items?.[0];
    
    if (!connectionSettings) {
      console.error('[Twilio] No connection found. Response:', JSON.stringify(data));
      throw new Error('Twilio connector not found - please configure Twilio in Replit integrations');
    }
    
    if (!connectionSettings.settings?.account_sid || !connectionSettings.settings?.api_key || !connectionSettings.settings?.api_key_secret) {
      console.error('[Twilio] Missing credentials. Settings keys:', Object.keys(connectionSettings.settings || {}));
      throw new Error('Twilio credentials incomplete - please check connector settings');
    }
    
    if (!connectionSettings.settings?.phone_number) {
      console.error('[Twilio] No phone number configured');
      throw new Error('Twilio phone number not configured - please add a phone number in connector settings');
    }
    
    return {
      accountSid: connectionSettings.settings.account_sid,
      apiKey: connectionSettings.settings.api_key,
      apiKeySecret: connectionSettings.settings.api_key_secret,
      phoneNumber: connectionSettings.settings.phone_number
    };
  } catch (error) {
    console.error('[Twilio] Error fetching credentials:', error);
    throw error;
  }
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
