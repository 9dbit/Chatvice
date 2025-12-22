
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Simple in-memory rate limiter (upgrade to Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
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

// Widget-specific rate limiter per merchant
export function widgetRateLimiter(req: Request, res: Response, next: NextFunction) {
  const merchantId = req.params.merchantId || req.body.merchantId;
  const sessionId = req.body.sessionId || req.query.session;
  
  // Key: merchantId + sessionId (per user per widget)
  const key = `widget:${merchantId}:${sessionId}`;
  
  return createRateLimiter({
    windowMs: 60000, // 1 minute
    max: 30, // 30 messages per minute per session
    keyGenerator: () => key,
  })(req, res, next);
}

// API rate limiter per IP
export const apiRateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 100,
  keyGenerator: (req) => req.ip || 'unknown',
});

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
