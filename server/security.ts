
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// CSRF Protection
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = (req.session as any).csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  
  next();
}

// Generate CSRF token
export function generateCsrfToken(req: Request): string {
  const token = crypto.randomBytes(32).toString('hex');
  (req.session as any).csrfToken = token;
  return token;
}

// IP Whitelist/Blacklist
const blacklistedIPs = new Set<string>();

export function ipFilter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  if (blacklistedIPs.has(ip)) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  next();
}

// Block suspicious patterns - focused on high-confidence SQL injection attempts
// Note: Patterns are intentionally narrow to avoid false positives
export function detectSQLInjection(req: Request, res: Response, next: NextFunction) {
  // Only check POST/PUT/PATCH body for SQL injection, not GET queries
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  
  const suspiciousPatterns = [
    /\bunion\s+select\b/i,  // UNION SELECT attacks
    /\bexec\s*\(/i,         // EXEC function calls
    /\bxp_\w+/i,            // SQL Server extended stored procedures
    /;\s*drop\s+table/i,    // Drop table attacks
    /;\s*delete\s+from/i,   // Delete attacks
    /;\s*insert\s+into/i,   // Insert attacks
    /;\s*update\s+\w+\s+set/i, // Update attacks
  ];
  
  const checkString = JSON.stringify(req.body || {});
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.error(`SQL Injection attempt detected from ${req.ip}: ${checkString.slice(0, 100)}`);
      return res.status(400).json({ error: "Invalid request" });
    }
  }
  
  next();
}

// XSS Protection
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  
  return input;
}
