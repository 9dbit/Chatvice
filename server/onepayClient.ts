import crypto from 'crypto';

const ONEPAY_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.1-pay.id' 
  : 'https://api.1-pay.id'; // Use same URL for sandbox with sandbox credentials

interface OnePayCredentials {
  clientKey: string;
  clientSecret: string;
}

function getCredentials(): OnePayCredentials {
  const clientKey = process.env.ONEPAY_CLIENT_KEY;
  const clientSecret = process.env.ONEPAY_CLIENT_SECRET;
  
  if (!clientKey || !clientSecret) {
    console.error('1-Pay credentials missing:', { 
      hasClientKey: !!clientKey, 
      hasClientSecret: !!clientSecret 
    });
    throw new Error('1-Pay credentials not configured. Please set ONEPAY_CLIENT_KEY and ONEPAY_CLIENT_SECRET');
  }
  return {
    clientKey,
    clientSecret,
  };
}

function generateSignature(payload: string, timestamp: string): string {
  const { clientKey, clientSecret } = getCredentials();
  
  // Try format: timestamp + clientKey + SHA256(payload)
  // Common format for Indonesian payment gateways following SNAP standard
  const payloadHash = crypto.createHash('sha256').update(payload).digest('hex').toLowerCase();
  const stringToSign = `${timestamp}${clientKey}${payloadHash}`;
  const signature = crypto.createHmac('sha256', clientSecret).update(stringToSign).digest('hex');
  
  console.log('Signature generation:', {
    stringToSignFormat: 'timestamp + clientKey + SHA256(payload)',
    stringToSignPreview: stringToSign.substring(0, 100) + '...',
    signaturePreview: signature.substring(0, 20) + '...',
    timestampFormat: timestamp,
    payloadHashPreview: payloadHash.substring(0, 20) + '...',
  });
  return signature;
}

function generateTimestamp(): string {
  // Use Unix timestamp in seconds (common for Indonesian payment gateways)
  return Math.floor(Date.now() / 1000).toString();
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
  bankCode: string; // BCA, BNI, BRI, MANDIRI, PERMATA, etc.
  customerName?: string;
  customerEmail?: string;
  description?: string;
  expiryMinutes?: number;
  callbackUrl?: string;
  metadata?: Record<string, string>;
}

export interface CreateVAResponse {
  success: boolean;
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

async function makeRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST',
  body?: Record<string, any>
): Promise<T> {
  const { clientKey } = getCredentials();
  const timestamp = generateTimestamp();
  const payload = body ? JSON.stringify(body) : '';
  const signature = generateSignature(payload, timestamp);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Client-Key': clientKey,
    'Request-Timestamp': timestamp,
    'Signature': signature,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    options.body = payload;
  }

  try {
    const response = await fetch(`${ONEPAY_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('1-Pay API error:', data);
      return {
        success: false,
        error: data.message || data.error || 'Request failed',
      } as T;
    }
    
    return {
      success: true,
      data,
    } as T;
  } catch (error: any) {
    console.error('1-Pay request error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    } as T;
  }
}

export async function createQRISPayment(request: CreateQRISRequest): Promise<CreateQRISResponse> {
  const { clientKey } = getCredentials();
  const timestamp = generateTimestamp();
  
  const body = {
    partner_id: clientKey,
    merchant_id: request.merchantId,
    external_id: request.orderId,
    amount: request.amount,
    customer_name: request.customerName || 'Customer',
    customer_email: request.customerEmail || '',
    description: request.description || 'Subscription Payment',
    expiry_minutes: request.expiryMinutes || 30,
    callback_url: request.callbackUrl,
    metadata: request.metadata,
  };

  const payload = JSON.stringify(body);
  const signature = generateSignature(payload, timestamp);

  console.log('Creating QRIS payment:', {
    url: `${ONEPAY_BASE_URL}/partner/create/qris`,
    hasClientKey: !!clientKey,
    clientKeyLength: clientKey?.length,
    timestamp,
    hasSignature: !!signature,
  });

  try {
    const response = await fetch(`${ONEPAY_BASE_URL}/partner/create/qris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Key': clientKey,
        'Request-Timestamp': timestamp,
        'Signature': signature,
      },
      body: payload,
    });

    const data = await response.json();
    
    if (!response.ok || data.status === 'error') {
      console.error('1-Pay QRIS creation error:', data);
      return {
        success: false,
        error: data.message || data.error || 'Failed to create QRIS',
        message: data.message,
      };
    }
    
    return {
      success: true,
      data: {
        transactionId: data.transaction_id || data.data?.transaction_id,
        orderId: request.orderId,
        qrisString: data.qris_string || data.data?.qris_string,
        qrisImageUrl: data.qris_image_url || data.data?.qris_image_url || data.qr_url || data.data?.qr_url,
        amount: request.amount,
        expiryTime: data.expiry_time || data.data?.expiry_time,
        status: 'PENDING',
      },
    };
  } catch (error: any) {
    console.error('1-Pay QRIS request error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

export async function createVAPayment(request: CreateVARequest): Promise<CreateVAResponse> {
  const { clientKey } = getCredentials();
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
    expiry_minutes: request.expiryMinutes || 1440, // 24 hours default
    callback_url: request.callbackUrl,
    metadata: request.metadata,
  };

  const payload = JSON.stringify(body);
  const signature = generateSignature(payload, timestamp);

  try {
    const response = await fetch(`${ONEPAY_BASE_URL}/partner/create/va`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Key': clientKey,
        'Request-Timestamp': timestamp,
        'Signature': signature,
      },
      body: payload,
    });

    const data = await response.json();
    
    if (!response.ok || data.status === 'error') {
      console.error('1-Pay VA creation error:', data);
      return {
        success: false,
        error: data.message || data.error || 'Failed to create Virtual Account',
      };
    }
    
    return {
      success: true,
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
    console.error('1-Pay VA request error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

export async function checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
  const { clientKey } = getCredentials();
  const timestamp = generateTimestamp();
  const signature = generateSignature(transactionId, timestamp);

  try {
    const response = await fetch(`${ONEPAY_BASE_URL}/partner/transaction/status/${transactionId}`, {
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
    console.error('1-Pay status check error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

export async function getBalance(): Promise<BalanceResponse> {
  return makeRequest<BalanceResponse>('/partner/balance', 'GET');
}

export function verifyWebhookSignature(
  payload: string,
  timestamp: string,
  receivedSignature: string
): boolean {
  const expectedSignature = generateSignature(payload, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  );
}

export function isOnePayConfigured(): boolean {
  const hasClientKey = !!process.env.ONEPAY_CLIENT_KEY;
  const hasClientSecret = !!process.env.ONEPAY_CLIENT_SECRET;
  console.log('1-Pay configuration check:', { hasClientKey, hasClientSecret });
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
