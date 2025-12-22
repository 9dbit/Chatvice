
import { Request, Response, NextFunction } from "express";

// Separate rate limit stores for different purposes (prevents key eviction conflicts)
const apiRateLimitStore = new Map<string, { count: number; resetTime: number }>();
const widgetRateLimitStore = new Map<string, { count: number; resetTime: number }>();
const MAX_STORE_SIZE = 100000; // Prevent unbounded growth

function createRateLimiterWithStore(
  store: Map<string, { count: number; resetTime: number }>,
  options: {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
  }
) {
  const {
    windowMs = 60000,
    max = 100,
    keyGenerator = (req: Request) => req.ip || 'unknown',
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = store.get(key);

    // Prevent unbounded growth - evict oldest entries if at capacity
    if (store.size >= MAX_STORE_SIZE) {
      const firstKey = store.keys().next().value;
      if (firstKey) store.delete(firstKey);
    }

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      return res.status(429).json({
        error: "Too many requests, please try again later.",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    record.count++;
    next();
  };
}

// Widget-specific rate limiter per session (uses dedicated store)
export const widgetRateLimiter = createRateLimiterWithStore(widgetRateLimitStore, {
  windowMs: 60000, // 1 minute
  max: 30, // 30 messages per minute per session
  keyGenerator: (req) => {
    const merchantId = req.params.merchantId || req.body?.merchantId || 'unknown';
    const sessionId = req.body?.sessionId || req.query?.session || 'unknown';
    return `${merchantId}:${sessionId}`;
  },
});

// API rate limiter per IP (uses dedicated store)
export const apiRateLimiter = createRateLimiterWithStore(apiRateLimitStore, {
  windowMs: 60000,
  max: 100,
  keyGenerator: (req) => req.ip || 'unknown',
});

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  
  for (const [key, record] of apiRateLimitStore.entries()) {
    if (now > record.resetTime) {
      apiRateLimitStore.delete(key);
    }
  }
  
  for (const [key, record] of widgetRateLimitStore.entries()) {
    if (now > record.resetTime) {
      widgetRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
