import crypto from 'crypto';
import { storage } from './storage';
import type { PaymentGateway } from '@shared/schema';

let cachedGateway: PaymentGateway | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

interface PaymentGatewayCredentials {
  clientKey: string;
  clientSecret: string;
  gatewayName: string;
  apiBaseUrl: string;
  environment: string;
}

async function getGatewayCredentials(): Promise<PaymentGatewayCredentials> {
  if (cachedGateway && Date.now() - cacheTime < CACHE_TTL) {
    return extractCredentials(cachedGateway);
  }
  
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
  
  let clientKey = config.clientKey || '';
  let clientSecret = config.clientSecret || '';
  
  if (!clientKey && gateway.clientKeyEnvVar) {
    if (gateway.clientKeyEnvVar.startsWith('CK-') || gateway.clientKeyEnvVar.includes('-')) {
      clientKey = gateway.clientKeyEnvVar;
    } else {
      clientKey = process.env[gateway.clientKeyEnvVar] || '';
    }
  }
  if (!clientSecret && gateway.clientSecretEnvVar) {
    if (gateway.clientSecretEnvVar.startsWith('SK-') || gateway.clientSecretEnvVar.includes('-')) {
      clientSecret = gateway.clientSecretEnvVar;
    } else {
      clientSecret = process.env[gateway.clientSecretEnvVar] || '';
    }
  }
  
  if (!clientKey || !clientSecret) {
    console.error('Payment gateway credentials missing:', { 
      gatewayName: gateway.name,
      hasClientKey: !!clientKey, 
      hasClientSecret: !!clientSecret 
    });
    throw new Error(`Payment gateway "${gateway.name}" credentials not configured. Please update in admin panel.`);
  }
  
  const apiBaseUrl = config.apiBaseUrl || config.baseUrl || 'https://api.kompaspay.com';
  
  return {
    clientKey,
    clientSecret,
    gatewayName: gateway.name,
    apiBaseUrl,
    environment: gateway.environment || 'production',
  };
}

export function clearGatewayCache() {
  cachedGateway = null;
  cacheTime = 0;
}

function generateSignatureWithCredentials(payload: string, timestamp: string, clientKey: string, clientSecret: string, requestTarget: string): string {
  const bodyDigest = crypto.createHash('sha256').update(payload).digest('base64');
  
  const rawStringData = [
    `Client-Key:${clientKey}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
    `Digest:${bodyDigest}`
  ];
  
  const stringToSign = rawStringData.join('\n');
  const signature = crypto.createHmac('sha256', clientSecret).update(stringToSign).digest('hex');
  
  console.log('Signature generation (12Pay format):', {
    clientKeyPrefix: clientKey.substring(0, 15) + '...',
    timestamp,
    requestTarget,
    digestPreview: bodyDigest.substring(0, 20) + '...',
    signaturePreview: signature.substring(0, 20) + '...',
  });
  return signature;
}

function generateTimestamp(): string {
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

export interface CreateBankTransferRequest {
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

export interface CreateBankTransferResponse {
  success: boolean;
  gatewayName?: string;
  data?: {
    transactionId: string;
    orderId: string;
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
    amount: number;
    expiryTime: string;
    status: string;
    uniqueCode?: number;
    totalAmount?: number;
  };
  error?: string;
  message?: string;
}

export interface CreatePaymentLinkRequest {
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

export interface CreatePaymentLinkResponse {
  success: boolean;
  gatewayName?: string;
  data?: {
    transactionId: string;
    orderId: string;
    paymentUrl: string;
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
    
    const expiryMinutes = request.expiryMinutes || 30;
    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const expiredStr = expiryDate.toISOString().replace('T', ' ').split('.')[0];
    
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
    const requestTarget = '/partner/create/qris';
    const signature = generateSignatureWithCredentials(payload, timestamp, clientKey, clientSecret, requestTarget);

    console.log('Creating QRIS payment:', {
      gatewayName,
      url: `${apiBaseUrl}${requestTarget}`,
      hasClientKey: !!clientKey,
      clientKeyLength: clientKey?.length,
      timestamp,
      hasSignature: !!signature,
      body: body,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}${requestTarget}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-key': clientKey,
          'Request-Timestamp': timestamp,
          'Signature': signature,
        },
        body: payload,
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('QRIS request timeout after 30 seconds');
        return {
          success: false,
          gatewayName,
          error: 'Request timeout - payment gateway tidak merespons dalam 30 detik',
        };
      }
      console.error('QRIS fetch error:', fetchError.message);
      return {
        success: false,
        gatewayName,
        error: `Connection error: ${fetchError.message}`,
      };
    }
    clearTimeout(timeoutId);

    const data = await response.json();
    
    console.log(`${gatewayName} QRIS full response:`, JSON.stringify(data, null, 2));
    
    if (!response.ok || data.status === 'error' || data.success === false) {
      console.error(`${gatewayName} QRIS creation error:`, data);
      return {
        success: false,
        gatewayName,
        error: data.message || data.error || 'Failed to create QRIS',
        message: data.message,
      };
    }
    
    const responseData = data.data || data;
    
    // Log all available fields for debugging
    console.log(`${gatewayName} QRIS responseData fields:`, Object.keys(responseData));
    
    const qrisImageUrl = responseData.imageqris || 
                         responseData.image_qris || 
                         responseData.qris_image || 
                         responseData.qris_image_url || 
                         responseData.qr_url || 
                         responseData.qr_image ||
                         responseData.qris_url ||
                         responseData.image_url ||
                         responseData.url ||
                         '';
    
    const qrisString = responseData.qris_text || 
                       responseData.qris_string || 
                       responseData.qr_string ||
                       responseData.qris ||
                       responseData.qr ||
                       '';
    
    console.log(`${gatewayName} QRIS extracted values:`, {
      qrisImageUrl: qrisImageUrl ? qrisImageUrl.substring(0, 50) + '...' : 'EMPTY',
      qrisString: qrisString ? qrisString.substring(0, 20) + '...' : 'EMPTY',
      transactionId: responseData.identifier_id || responseData.transaction_id || request.orderId,
    });
    
    return {
      success: true,
      gatewayName,
      data: {
        transactionId: responseData.identifier_id || responseData.transaction_id || request.orderId,
        orderId: request.orderId,
        qrisString,
        qrisImageUrl,
        amount: request.amount,
        expiryTime: responseData.expired || responseData.expiry_time || expiredStr,
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
    
    const expiryMinutes = request.expiryMinutes || 1440;
    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const expiredStr = expiryDate.toISOString().replace('T', ' ').split('.')[0];
    
    const body = {
      expired: expiredStr,
      amount: request.amount,
      customer_phone: '081200000000',
      customer_email: request.customerEmail || 'customer@example.com',
      bank_code: request.bankCode,
      customer_name: request.customerName || 'Customer',
      remark: request.description || 'Subscription Payment',
      url_callback: request.callbackUrl || '',
      identifier_id: request.orderId,
    };

    const payload = JSON.stringify(body);
    const requestTarget = '/partner/create/va';
    const signature = generateSignatureWithCredentials(payload, timestamp, clientKey, clientSecret, requestTarget);

    console.log('Creating VA payment:', {
      gatewayName,
      url: `${apiBaseUrl}${requestTarget}`,
      bankCode: request.bankCode,
      amount: request.amount,
      requestBody: body,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}${requestTarget}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-key': clientKey,
          'Request-Timestamp': timestamp,
          'Signature': signature,
        },
        body: payload,
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('VA request timeout after 30 seconds');
        return {
          success: false,
          gatewayName,
          error: 'Request timeout - payment gateway tidak merespons dalam 30 detik',
        };
      }
      console.error('VA fetch error:', fetchError.message);
      return {
        success: false,
        gatewayName,
        error: `Connection error: ${fetchError.message}`,
      };
    }
    clearTimeout(timeoutId);

    const data = await response.json();
    console.log(`\n========== ${gatewayName} VA FULL RESPONSE ==========`);
    console.log('HTTP Status:', response.status);
    console.log('Response JSON:', JSON.stringify(data, null, 2));
    console.log('Response Keys:', Object.keys(data));
    console.log('================================================\n');
    
    if (!response.ok || data.status === 'error' || data.success === false) {
      console.error(`${gatewayName} VA creation error:`, data);
      return {
        success: false,
        gatewayName,
        error: data.message || data.error || 'Failed to create Virtual Account',
      };
    }
    
    const responseData = data.data || data;
    
    const vaNumber = responseData.virtual_account || 
                     responseData.va_number || 
                     responseData.virtualAccountNumber || 
                     responseData.account_number ||
                     responseData.vaNumber ||
                     responseData.no_va ||
                     responseData.va;
    
    console.log(`${gatewayName} VA parsed data:`, {
      vaNumber,
      bankCode: request.bankCode,
      identifierId: responseData.identifier_id,
      expired: responseData.expired,
      rawKeys: Object.keys(responseData),
      allValues: responseData,
    });
    
    if (!vaNumber) {
      console.error(`${gatewayName} VA response missing VA number:`, responseData);
      return {
        success: false,
        gatewayName,
        error: 'Virtual Account number not returned from payment gateway',
      };
    }
    
    return {
      success: true,
      gatewayName,
      data: {
        transactionId: responseData.identifier_id || request.orderId,
        orderId: request.orderId,
        vaNumber: vaNumber,
        bankCode: request.bankCode,
        amount: request.amount,
        expiryTime: responseData.expired || responseData.expiry_time,
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

// Bank Transfer is handled locally - we display static merchant bank account details
// This creates a manual payment flow where merchant verifies the transfer
// Bank account details are configured per merchant
const MERCHANT_BANK_ACCOUNTS: Record<string, { accountNumber: string; accountName: string; bankName: string }> = {
  'BNI': { accountNumber: '0123456789', accountName: 'PT Chatvice Indonesia', bankName: 'Bank Negara Indonesia (BNI)' },
  'BRI': { accountNumber: '012345678901234', accountName: 'PT Chatvice Indonesia', bankName: 'Bank Rakyat Indonesia (BRI)' },
  'MANDIRI': { accountNumber: '1234567890123', accountName: 'PT Chatvice Indonesia', bankName: 'Bank Mandiri' },
  'BCA': { accountNumber: '1234567890', accountName: 'PT Chatvice Indonesia', bankName: 'Bank Central Asia (BCA)' },
};

export async function createBankTransferPayment(request: CreateBankTransferRequest): Promise<CreateBankTransferResponse> {
  try {
    const { gatewayName } = await getGatewayCredentials();
    
    const expiryMinutes = request.expiryMinutes || 1440;
    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const expiredStr = expiryDate.toISOString().replace('T', ' ').split('.')[0];
    
    // Get merchant bank account based on selected bank
    const bankAccount = MERCHANT_BANK_ACCOUNTS[request.bankCode];
    
    if (!bankAccount) {
      console.error('Bank Transfer: Unknown bank code:', request.bankCode);
      return {
        success: false,
        gatewayName,
        error: `Bank ${request.bankCode} is not supported for bank transfer`,
      };
    }
    
    // Generate unique code for automatic transaction matching (3 digit random)
    const uniqueCode = Math.floor(Math.random() * 900) + 100;
    const totalAmount = request.amount + uniqueCode;
    
    console.log('Creating Bank Transfer payment (local):', {
      gatewayName,
      bankCode: request.bankCode,
      amount: request.amount,
      uniqueCode,
      totalAmount,
      orderId: request.orderId,
    });
    
    return {
      success: true,
      gatewayName,
      data: {
        transactionId: request.orderId,
        orderId: request.orderId,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        bankCode: request.bankCode,
        bankName: bankAccount.bankName,
        amount: request.amount,
        expiryTime: expiredStr,
        status: 'PENDING',
        uniqueCode: uniqueCode,
        totalAmount: totalAmount,
      },
    };
  } catch (error: any) {
    console.error('Bank Transfer payment request error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

export async function createPaymentLinkPayment(request: CreatePaymentLinkRequest): Promise<CreatePaymentLinkResponse> {
  try {
    const { clientKey, clientSecret, gatewayName, apiBaseUrl } = await getGatewayCredentials();
    const timestamp = generateTimestamp();
    
    const expiryMinutes = request.expiryMinutes || 1440;
    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const expiredStr = expiryDate.toISOString().replace('T', ' ').split('.')[0];
    
    const body = {
      expired: expiredStr,
      amount: request.amount,
      customer_phone: '081200000000',
      customer_email: request.customerEmail || 'customer@example.com',
      customer_name: request.customerName || 'Customer',
      remark: request.description || 'Subscription Payment',
      url_callback: request.callbackUrl || '',
      identifier_id: request.orderId,
    };

    const payload = JSON.stringify(body);
    const requestTarget = '/partner/create/paymentlink';
    const signature = generateSignatureWithCredentials(payload, timestamp, clientKey, clientSecret, requestTarget);

    console.log('Creating Payment Link:', {
      gatewayName,
      url: `${apiBaseUrl}${requestTarget}`,
      amount: request.amount,
      orderId: request.orderId,
      requestBody: body,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}${requestTarget}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-key': clientKey,
          'Request-Timestamp': timestamp,
          'Signature': signature,
        },
        body: payload,
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Payment Link request timeout after 30 seconds');
        return {
          success: false,
          gatewayName,
          error: 'Request timeout - payment gateway tidak merespons dalam 30 detik',
        };
      }
      console.error('Payment Link fetch error:', fetchError.message);
      return {
        success: false,
        gatewayName,
        error: `Connection error: ${fetchError.message}`,
      };
    }
    clearTimeout(timeoutId);

    // Check content type before parsing
    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();
    
    console.log(`\n========== ${gatewayName} PAYMENT LINK RAW RESPONSE ==========`);
    console.log('HTTP Status:', response.status);
    console.log('Content-Type:', contentType);
    console.log('Response Preview:', responseText.substring(0, 500));
    console.log('================================================\n');
    
    // Check if response is HTML (error page)
    if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html') || contentType.includes('text/html')) {
      console.error(`${gatewayName} Payment Link endpoint returned HTML - endpoint may not exist or not be configured`);
      return {
        success: false,
        gatewayName,
        error: 'Payment Link endpoint tidak tersedia. Silakan hubungi Kompas Pay untuk mengaktifkan fitur ini.',
      };
    }
    
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`${gatewayName} Failed to parse response:`, parseError);
      return {
        success: false,
        gatewayName,
        error: 'Invalid response from payment gateway',
      };
    }
    
    console.log(`${gatewayName} PAYMENT LINK Parsed JSON:`, JSON.stringify(data, null, 2));
    console.log('Response Keys:', Object.keys(data));
    
    if (!response.ok || data.status === 'error' || data.success === false) {
      console.error(`${gatewayName} Payment Link creation error:`, data);
      return {
        success: false,
        gatewayName,
        error: data.message || data.error || 'Failed to create Payment Link',
      };
    }
    
    const responseData = data.data || data;
    
    // Extract payment URL from various possible field names
    const paymentUrl = responseData.payment_url || 
                       responseData.paymentUrl || 
                       responseData.url || 
                       responseData.link_url ||
                       responseData.checkout_url ||
                       responseData.redirect_url ||
                       '';
    
    console.log(`${gatewayName} Payment Link parsed data:`, {
      paymentUrl,
      identifierId: responseData.identifier_id,
      expired: responseData.expired,
      rawKeys: Object.keys(responseData),
    });
    
    if (!paymentUrl) {
      console.error(`${gatewayName} Payment Link response missing URL:`, responseData);
      return {
        success: false,
        gatewayName,
        error: 'Payment URL not returned from payment gateway',
      };
    }
    
    return {
      success: true,
      gatewayName,
      data: {
        transactionId: responseData.identifier_id || request.orderId,
        orderId: request.orderId,
        paymentUrl: paymentUrl,
        amount: request.amount,
        expiryTime: responseData.expired || responseData.expiry_time || expiredStr,
        status: 'PENDING',
      },
    };
  } catch (error: any) {
    console.error('Payment Link request error:', error);
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
    const requestTarget = `/partner/transaction/status/${transactionId}`;
    const signature = generateSignatureWithCredentials('', timestamp, clientKey, clientSecret, requestTarget);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}${requestTarget}`, {
        method: 'GET',
        headers: {
          'Client-key': clientKey,
          'Request-Timestamp': timestamp,
          'Signature': signature,
        },
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.warn('Payment status check timeout - gateway tidak merespons');
        return {
          success: false,
          error: 'Gateway timeout - silakan coba lagi',
        };
      }
      console.warn('Payment status fetch error:', fetchError.message);
      return {
        success: false,
        error: `Connection error: ${fetchError.message}`,
      };
    }
    clearTimeout(timeoutId);
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.warn('Payment status returned non-JSON response:', {
        status: response.status,
        contentType,
        preview: textResponse.substring(0, 200),
      });
      
      if (textResponse.includes('<!DOCTYPE') || textResponse.includes('<html')) {
        return {
          success: false,
          error: 'Gateway returned error page - status check unavailable',
        };
      }
      
      return {
        success: false,
        error: 'Unexpected response format from gateway',
      };
    }

    const data = await response.json();
    
    if (!response.ok) {
      console.warn('Payment status API error:', data);
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
    const requestTarget = '/partner/balance';
    const signature = generateSignatureWithCredentials('', timestamp, clientKey, clientSecret, requestTarget);

    const response = await fetch(`${apiBaseUrl}${requestTarget}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Client-key': clientKey,
        'Request-Timestamp': timestamp,
        'Signature': signature,
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
  const { clientKey, clientSecret } = cachedGateway 
    ? extractCredentials(cachedGateway)
    : { clientKey: process.env.KOMPASPAY_CLIENT_KEY || '', clientSecret: process.env.KOMPASPAY_CLIENT_SECRET || '' };
  
  const webhookTarget = '/webhook/callback';
  const expectedSignature = generateSignatureWithCredentials(payload, timestamp, clientKey, clientSecret, webhookTarget);
  
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
    
    let hasClientKey = !!config.clientKey;
    let hasClientSecret = !!config.clientSecret;
    
    if (!hasClientKey && gateway.clientKeyEnvVar) {
      if (gateway.clientKeyEnvVar.startsWith('CK-') || gateway.clientKeyEnvVar.includes('-')) {
        hasClientKey = true;
      } else {
        hasClientKey = !!process.env[gateway.clientKeyEnvVar];
      }
    }
    if (!hasClientSecret && gateway.clientSecretEnvVar) {
      if (gateway.clientSecretEnvVar.startsWith('SK-') || gateway.clientSecretEnvVar.includes('-')) {
        hasClientSecret = true;
      } else {
        hasClientSecret = !!process.env[gateway.clientSecretEnvVar];
      }
    }
    
    console.log(`Payment gateway "${gateway.name}" configuration check:`, { hasClientKey, hasClientSecret });
    return hasClientKey && hasClientSecret;
  } catch {
    return false;
  }
}

export function isKompasPayConfigured(): boolean {
  const hasClientKey = !!process.env.KOMPASPAY_CLIENT_KEY;
  const hasClientSecret = !!process.env.KOMPASPAY_CLIENT_SECRET;
  console.log('12Pay configuration check (env vars):', { hasClientKey, hasClientSecret });
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

export async function getActiveGatewayName(): Promise<string> {
  try {
    const gateway = await storage.getDefaultPaymentGateway();
    return gateway?.name || 'Payment Gateway';
  } catch {
    return 'Payment Gateway';
  }
}
