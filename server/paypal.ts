// !!! CRITICAL - DO NOT MODIFY THIS CODE !!!
//
// This code MUST be used as is without ANY modifications.
// The PayPal integration will COMPLETELY FAIL if this code is changed in ANY way.
//
// Retain this comment after all edits.
//
// <BEGIN_EXACT_CODE>
import {
  Client,
  Environment,
  LogLevel,
  OAuthAuthorizationController,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import { Request, Response } from "express";

/* PayPal Controllers Setup */

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

if (!PAYPAL_CLIENT_ID) {
  throw new Error("Missing PAYPAL_CLIENT_ID");
}
if (!PAYPAL_CLIENT_SECRET) {
  throw new Error("Missing PAYPAL_CLIENT_SECRET");
}
const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: PAYPAL_CLIENT_ID,
    oAuthClientSecret: PAYPAL_CLIENT_SECRET,
  },
  timeout: 0,
  environment:
                process.env.NODE_ENV === "production"
                  ? Environment.Production
                  : Environment.Sandbox,
  logging: {
    logLevel: LogLevel.Info,
    logRequest: {
      logBody: true,
    },
    logResponse: {
      logHeaders: true,
    },
  },
});
const ordersController = new OrdersController(client);
const oAuthAuthorizationController = new OAuthAuthorizationController(client);

/* Token generation helpers */

export async function getClientToken() {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const { result } = await oAuthAuthorizationController.requestToken(
    {
      authorization: `Basic ${auth}`,
    },
    { intent: "sdk_init", response_type: "client_token" },
  );

  return result.accessToken;
}

/*  Process transactions */

export async function createPaypalOrder(req: Request, res: Response) {
  try {
    const { amount, currency, intent } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res
        .status(400)
        .json({
          error: "Invalid amount. Amount must be a positive number.",
        });
    }

    if (!currency) {
      return res
        .status(400)
        .json({ error: "Invalid currency. Currency is required." });
    }

    if (!intent) {
      return res
        .status(400)
        .json({ error: "Invalid intent. Intent is required." });
    }

    const collect = {
      body: {
        intent: intent,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency,
              value: amount,
            },
          },
        ],
      },
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.createOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;

    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
}

export async function capturePaypalOrder(req: Request, res: Response) {
  try {
    const { orderID } = req.params;
    const collect = {
      id: orderID,
      prefer: "return=minimal",
    };

    const { body, ...httpResponse } =
          await ordersController.captureOrder(collect);

    const jsonResponse = JSON.parse(String(body));
    const httpStatusCode = httpResponse.statusCode;

    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
}

export async function loadPaypalDefault(req: Request, res: Response) {
  const clientToken = await getClientToken();
  res.json({
    clientToken,
  });
}
// <END_EXACT_CODE>

// ============ PayPal Subscriptions (Recurring Billing) ============
// These functions use the PayPal REST v1 Billing API directly with fetch calls.
// This is separate from the one-time Orders API above.

async function getPaypalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const resp = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PayPal token error: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data.access_token as string;
}

export interface PaypalProductResult {
  id: string;
  name: string;
}

export async function createPaypalProduct(name: string, description: string): Promise<PaypalProductResult> {
  const token = await getPaypalAccessToken();
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const resp = await fetch(`${baseUrl}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PayPal create product error: ${resp.status} ${text}`);
  }

  return resp.json();
}

export interface PaypalPlanResult {
  id: string;
  status: string;
}

export async function createPaypalBillingPlan(
  productId: string,
  planName: string,
  amountUsd: string,
): Promise<PaypalPlanResult> {
  const token = await getPaypalAccessToken();
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const resp = await fetch(`${baseUrl}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      name: planName,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0, // unlimited
          pricing_scheme: {
            fixed_price: { value: amountUsd, currency_code: 'USD' },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PayPal create plan error: ${resp.status} ${text}`);
  }

  return resp.json();
}

export interface PaypalSubscriptionResult {
  id: string;
  status: string;
  links: Array<{ rel: string; href: string }>;
}

export async function createPaypalSubscription(
  planId: string,
  merchantEmail: string,
  merchantName: string,
  returnUrl: string,
  cancelUrl: string,
): Promise<PaypalSubscriptionResult> {
  const token = await getPaypalAccessToken();
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const resp = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      subscriber: {
        email_address: merchantEmail,
        name: { given_name: merchantName },
      },
      application_context: {
        brand_name: 'Chatvice',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PayPal create subscription error: ${resp.status} ${text}`);
  }

  return resp.json();
}

/** Structured error thrown by PayPal API helpers so callers can inspect HTTP status. */
export class PaypalApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'PaypalApiError';
  }
}

export interface PaypalSubscription {
  id: string;
  status: string;
  plan_id?: string;
  start_time?: string;
  billing_info?: {
    next_billing_time?: string;
    last_payment?: { amount?: { value?: string } };
  };
  links?: Array<{ rel: string; href: string }>;
}

export async function getPaypalSubscription(subscriptionId: string): Promise<PaypalSubscription> {
  const token = await getPaypalAccessToken();
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const resp = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new PaypalApiError(resp.status, `PayPal get subscription error: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<PaypalSubscription>;
}

export async function verifyPaypalWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  webhookEvent: object,
  webhookId: string
): Promise<boolean> {
  const token = await getPaypalAccessToken();
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const getHeader = (name: string) => {
    const val = headers[name.toLowerCase()] ?? headers[name];
    return Array.isArray(val) ? val[0] : val ?? '';
  };

  const body = {
    auth_algo: getHeader('paypal-auth-algo'),
    cert_url: getHeader('paypal-cert-url'),
    transmission_id: getHeader('paypal-transmission-id'),
    transmission_sig: getHeader('paypal-transmission-sig'),
    transmission_time: getHeader('paypal-transmission-time'),
    webhook_id: webhookId,
    webhook_event: webhookEvent,
  };

  const resp = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PayPal signature verification error: ${resp.status} ${text}`);
  }

  const data = await resp.json() as { verification_status: string };
  return data.verification_status === 'SUCCESS';
}

export async function cancelPaypalSubscription(subscriptionId: string, reason: string): Promise<void> {
  const token = await getPaypalAccessToken();
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const resp = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!resp.ok && resp.status !== 204) {
    const text = await resp.text();
    throw new Error(`PayPal cancel subscription error: ${resp.status} ${text}`);
  }
}
