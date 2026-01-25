// Twilio Verify Integration for OTP
import twilio from 'twilio';

// Twilio credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function getVerifyServiceSid() {
  if (!TWILIO_VERIFY_SERVICE_SID) {
    throw new Error('Twilio Verify Service SID not configured. Please set TWILIO_VERIFY_SERVICE_SID.');
  }
  return TWILIO_VERIFY_SERVICE_SID;
}

// Send OTP via Twilio Verify API
export async function sendVerifyOTP(toPhoneNumber: string, channel: 'sms' | 'whatsapp' = 'sms'): Promise<{ success: boolean; status: string }> {
  const client = getTwilioClient();
  const serviceSid = getVerifyServiceSid();
  
  console.log(`[Twilio Verify] Sending OTP to ${toPhoneNumber} via ${channel}`);
  
  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: toPhoneNumber,
        channel: channel
      });
    
    console.log(`[Twilio Verify] OTP sent successfully, status: ${verification.status}`);
    return { success: true, status: verification.status };
  } catch (error: any) {
    console.error('[Twilio Verify] Error sending OTP:', error);
    
    // Handle specific Twilio Verify errors
    if (error.code === 60200) {
      throw new Error('Invalid phone number format. Please check your number.');
    } else if (error.code === 60203) {
      throw new Error('Too many verification attempts. Please try again later.');
    } else if (error.code === 60212) {
      throw new Error('This phone number cannot receive SMS. Please try a different number.');
    } else if (error.code === 60223) {
      throw new Error('Phone number is blocked. Please contact support.');
    } else if (error.code === 60205) {
      throw new Error('SMS delivery failed. Please try again.');
    } else if (error.code === 60410) {
      throw new Error('WhatsApp not available for this number. Please use SMS instead.');
    } else {
      throw new Error(`Verification failed: ${error.message || 'Unknown error'}`);
    }
  }
}

// Verify OTP code via Twilio Verify API
export async function checkVerifyOTP(toPhoneNumber: string, code: string): Promise<{ success: boolean; status: string }> {
  const client = getTwilioClient();
  const serviceSid = getVerifyServiceSid();
  
  console.log(`[Twilio Verify] Checking OTP for ${toPhoneNumber}`);
  
  try {
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: toPhoneNumber,
        code: code
      });
    
    console.log(`[Twilio Verify] Verification check status: ${verificationCheck.status}`);
    
    if (verificationCheck.status === 'approved') {
      return { success: true, status: 'approved' };
    } else {
      return { success: false, status: verificationCheck.status };
    }
  } catch (error: any) {
    console.error('[Twilio Verify] Error checking OTP:', error);
    
    // Handle specific errors
    if (error.code === 60200) {
      throw new Error('Invalid phone number format.');
    } else if (error.code === 60202) {
      throw new Error('Too many verification attempts. Please request a new code.');
    } else if (error.code === 20404) {
      throw new Error('Verification code expired or not found. Please request a new code.');
    } else {
      throw new Error(`Verification check failed: ${error.message || 'Unknown error'}`);
    }
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

// Legacy functions for backward compatibility (not used with Verify API)
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
