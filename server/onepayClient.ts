import crypto from 'crypto';
import { storage } from './storage';
import type { PaymentGateway } from '@shared/schema';

// Cache for gateway credentials to avoid DB lookups on every request
let cachedGateway: PaymentGateway | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

interface PaymentGatewayCredentials {
  clientKey: string;
  clientSecret: string;
  gatewayName: string;
  apiBaseUrl: string;
  environment: string;
}

async function getGatewayCredentials(): Promise<PaymentGatewayCredentials> {
  // Check cache first
  if (cachedGateway && Date.now() - cacheTime < CACHE_TTL) {
    return extractCredentials(cachedGateway);
  }
  
  // Fetch from database
  const gateway = await storage.getDefaultPaymentGateway();
  if (!gateway) {
    throw new Error('No default payment gateway configured. Please configure a payment gateway in admin panel.');
  }
  
  cachedGateway = gateway;
  cacheTime = Date.now();
  
  return extractCredentials(gateway);
}

function extractCredentials(gateway: PaymentGateway): PaymentGatewayCredentials {
  const config = gateway.config as Record<string, any> || {};
  
  // Get credentials from config first, then fallback to env vars
  let clientKey = config.clientKey || '';
  let clientSecret = config.clientSecret || '';
  
  // Fallback to environment variables if config doesn't have them
  if (!clientKey && gateway.clientKeyEnvVar) {
    clientKey = process.env[gateway.clientKeyEnvVar] || '';
  }
  if (!clientSecret && gateway.clientSecretEnvVar) {
    clientSecret = process.env[gateway.clientSecretEnvVar] || '';
  }
  
  if (!clientKey || !clientSecret) {
    console.error('Payment gateway credentials missing:', { 
      gatewayName: gateway.name,
      hasClientKey: !!clientKey, 
      hasClientSecret: !!clientSecret 
    });
    throw new Error(`Payment gateway "${gateway.name}" credentials not configured. Please update in admin panel.`);
  }
  
  // Get API base URL from config or use default
  const apiBaseUrl = config.apiBaseUrl || config.baseUrl || 'https://api.1-pay.id';
  
  return {
    clientKey,
    clientSecret,
    gatewayName: gateway.name,
    apiBaseUrl,
    environment: gateway.environment || 'sandbox',
  };
}

// Clear cache when gateway is updated
export function clearGatewayCache() {
  cachedGateway = null;
  cacheTime = 0;
}

function generateSignatureWithCredentials(payload: string, timestamp: string, clientKey: string, clientSecret: string): string {
  // Format per payment gateway documentation: clientKey:timestamp:requestBody
  // Algorithm: HMAC-SHA256, Output: Base64 (common for Indonesian payment gateways)
  const stringToSign = `${clientKey}:${timestamp}:${payload}`;
  const signature = crypto.createHmac('sha256', clientSecret).update(stringToSign).digest('base64');
  
  console.log('Signature generation:', {
    stringToSignFormat: 'clientKey:timestamp:payload',
    stringToSignPreview: stringToSign.substring(0, 150) + '...',
    signaturePreview: signature.substring(0, 20) + '...',
    timestampFormat: timestamp,
  });
  return signature;
}

function generateTimestamp(): string {
  // ISO timestamp format: 2025-12-04T08:29:15.123Z
  return new Date().toISOString();
}

export interface CreateQRISRequest {
  merchantId: string;
  orderId: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  description?: string;
  expiryMinutes?: number;
  callbackUrl?: string;
  metadata?: Record<string, string>;
}

export interface CreateQRISResponse {
  success: boolean;
  gatewayName?: string;
  data?: {
    transactionId: string;
    orderId: string;
    qrisString: string;
    qrisImageUrl: string;
    amount: number;
    expiryTime: string;
    status: string;
  };
  error?: string;
  message?: string;
}

export interface CreateVARequest {
  merchantId: string;
  orderId: string;
  amount: number;
  bankCode: string;
  customerName?: string;
  customerEmail?: string;
  description?: string;
  expiryMinutes?: number;
  callbackUrl?: string;
  metadata?: Record<string, string>;
}

export interface CreateVAResponse {
  success: boolean;
  gatewayName?: string;
  data?: {
    transactionId: string;
    orderId: string;
    vaNumber: string;
    bankCode: string;
    amount: number;
    expiryTime: string;
    status: string;
  };
  error?: string;
  message?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  data?: {
    transactionId: string;
    orderId: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
    paidAt?: string;
    paymentMethod?: string;
  };
  error?: string;
}

export interface BalanceResponse {
  success: boolean;
  data?: {
    balance: number;
    currency: string;
  };
  error?: string;
}

export async function createQRISPayment(request: CreateQRISRequest): Promise<CreateQRISResponse> {
  try {
    const { clientKey, clientSecret, gatewayName, apiBaseUrl } = await getGatewayCredentials();
    const timestamp = generateTimestamp();
    
    // Calculate expiry time in format "YYYY-MM-DD HH:mm:ss"
    const expiryMinutes = request.expiryMinutes || 30;
    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const expiredStr = expiryDate.toISOString().replace('T', ' ').split('.')[0];
    
    // Body format per payment gateway documentation
    const body = {
      expired: expiredStr,
      amount: request.amount,
      customer_phone: '081200000000',
      customer_email: request.customerEmail || 'customer@example.com',
      customer_name: request.customerName || 'Customer',
      url_callback: request.callbackUrl || '',
      identifier_id: request.orderId,
    };

    const payload = JSON.stringify(body);
    const signature = generateSignatureWithCredentials(payload, timestamp, clientKey, clientSecret);

    console.log('Creating QRIS payment:', {
      gatewayName,
      url: `${apiBaseUrl}/partner/create/qris`,
      hasClientKey: !!clientKey,
      clientKeyLength: clientKey?.length,
      timestamp,
      hasSignature: !!signature,
      body: body,
    });

    const response = await fetch(`${apiBaseUrl}/partner/create/qris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-key': clientKey,
        'request-timestamp': timestamp,
        'signature': signature,
      },
      body: payload,
    });

    const data = await response.json();
    
    console.log(`${gatewayName} QRIS response:`, data);
    
    if (!response.ok || data.status === 'error' || data.success === false) {
      console.error(`${gatewayName} QRIS creation error:`, data);
      return {
        success: false,
        gatewayName,
        error: data.message || data.error || 'Failed to create QRIS',
        message: data.message,
      };
    }
    
    // Handle response format
    const responseData = data.data || data;
    
    return {
      success: true,
      gatewayName,
      data: {
        transactionId: responseData.transaction_id || responseData.id || request.orderId,
        orderId: request.orderId,
        qrisString: responseData.qris_string || responseData.qr_string || '',
        qrisImageUrl: responseData.qris_image_url || responseData.qr_url || responseData.qr_image || '',
        amount: request.amount,
        expiryTime: responseData.expiry_time || responseData.expired || expiredStr,
        status: 'PENDING',
      },
    };
  } catch (error: any) {
    console.error('QRIS payment request error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

export async function createVAPayment(request: CreateVARequest): Promise<CreateVAResponse> {
  try {
    const { clientKey, clientSecret, gatewayName, apiBaseUrl } = await getGatewayCredentials();
    const timestamp = generateTimestamp();
    
    const body = {
      partner_id: clientKey,
      merchant_id: request.merchantId,
      external_id: request.orderId,
      amount: request.amount,
      bank_code: request.bankCode,
      customer_name: request.customerName || 'Customer',
      customer_email: request.customerEmail || '',
      description: request.description || 'Subscription Payment',
      expiry_minutes: request.expiryMinutes || 1440,
      callback_url: request.callbackUrl,
      metadata: request.metadata,
    };

    const payload = JSON.stringify(body);
    const signature = generateSignatureWithCredentials(payload, timestamp, clientKey, clientSecret);

    const response = await fetch(`${apiBaseUrl}/partner/create/va`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-key': clientKey,
        'request-timestamp': timestamp,
        'signature': signature,
      },
      body: payload,
    });

    const data = await response.json();
    
    if (!response.ok || data.status === 'error') {
      console.error(`${gatewayName} VA creation error:`, data);
      return {
        success: false,
        gatewayName,
        error: data.message || data.error || 'Failed to create Virtual Account',
      };
    }
    
    return {
      success: true,
      gatewayName,
      data: {
        transactionId: data.transaction_id || data.data?.transaction_id,
        orderId: request.orderId,
        vaNumber: data.va_number || data.data?.va_number,
        bankCode: request.bankCode,
        amount: request.amount,
        expiryTime: data.expiry_time || data.data?.expiry_time,
        status: 'PENDING',
      },
    };
  } catch (error: any) {
    console.error('VA payment request error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

export async function checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
  try {
    const { clientKey, clientSecret, gatewayName, apiBaseUrl } = await getGatewayCredentials();
    const timestamp = generateTimestamp();
    const signature = generateSignatureWithCredentials(transactionId, timestamp, clientKey, clientSecret);

    const response = await fetch(`${apiBaseUrl}/partner/transaction/status/${transactionId}`, {
      method: 'GET',
      headers: {
        'Client-Key': clientKey,
        'Request-Timestamp': timestamp,
        'Signature': signature,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to check status',
      };
    }
    
    return {
      success: true,
      data: {
        transactionId: data.transaction_id || transactionId,
        orderId: data.external_id || data.order_id,
        amount: data.amount,
        status: data.status?.toUpperCase() || 'PENDING',
        paidAt: data.paid_at,
        paymentMethod: data.payment_method,
      },
    };
  } catch (error: any) {
    console.error('Payment status check error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

export async function getBalance(): Promise<BalanceResponse> {
  try {
    const { clientKey, clientSecret, apiBaseUrl } = await getGatewayCredentials();
    const timestamp = generateTimestamp();
    const signature = generateSignatureWithCredentials('', timestamp, clientKey, clientSecret);

    const response = await fetch(`${apiBaseUrl}/partner/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'client-key': clientKey,
        'request-timestamp': timestamp,
        'signature': signature,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Balance API error:', data);
      return {
        success: false,
        error: data.message || data.error || 'Request failed',
      };
    }
    
    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('Balance request error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

export function verifyWebhookSignature(
  payload: string,
  timestamp: string,
  receivedSignature: string
): boolean {
  // Use cached credentials for webhook verification
  const { clientKey, clientSecret } = cachedGateway 
    ? extractCredentials(cachedGateway)
    : { clientKey: process.env.ONEPAY_CLIENT_KEY || '', clientSecret: process.env.ONEPAY_CLIENT_SECRET || '' };
    
  const expectedSignature = generateSignatureWithCredentials(payload, timestamp, clientKey, clientSecret);
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature)
    );
  } catch {
    return false;
  }
}

export async function isPaymentGatewayConfigured(): Promise<boolean> {
  try {
    const gateway = await storage.getDefaultPaymentGateway();
    if (!gateway) return false;
    
    const config = gateway.config as Record<string, any> || {};
    const hasClientKey = !!(config.clientKey || (gateway.clientKeyEnvVar && process.env[gateway.clientKeyEnvVar]));
    const hasClientSecret = !!(config.clientSecret || (gateway.clientSecretEnvVar && process.env[gateway.clientSecretEnvVar]));
    
    console.log(`Payment gateway "${gateway.name}" configuration check:`, { hasClientKey, hasClientSecret });
    return hasClientKey && hasClientSecret;
  } catch {
    return false;
  }
}

// Legacy function for backward compatibility
export function isOnePayConfigured(): boolean {
  const hasClientKey = !!process.env.ONEPAY_CLIENT_KEY;
  const hasClientSecret = !!process.env.ONEPAY_CLIENT_SECRET;
  console.log('Legacy 1-Pay configuration check:', { hasClientKey, hasClientSecret });
  return hasClientKey && hasClientSecret;
}

export function convertToIDR(usdAmount: number): number {
  const exchangeRate = 15500;
  return Math.round(usdAmount * exchangeRate);
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Get current gateway name
export async function getActiveGatewayName(): Promise<string> {
  try {
    const gateway = await storage.getDefaultPaymentGateway();
    return gateway?.name || 'Payment Gateway';
  } catch {
    return 'Payment Gateway';
  }
}
