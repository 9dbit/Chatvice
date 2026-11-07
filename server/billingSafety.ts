import type { Express, RequestHandler } from "express";

// Old clients must never turn a simulated payment into a real subscription.
// Gateway verification and the existing administrator confirmation flow remain
// the only payment paths; these retired endpoints perform no reads or writes.
export function registerRetiredBillingRoutes(app: Express, auth: { requireMerchant: RequestHandler; requireAdmin: RequestHandler }) {
  const retired: RequestHandler = (_req, res) => {
    res.status(410).json({ error: "Simulated billing is unavailable. Complete payment through checkout." });
  };
  app.post("/api/billing/demo-checkout", auth.requireMerchant, retired);
  app.post("/api/billing/demo-payment", auth.requireMerchant, retired);
  app.post("/api/billing/test-twelvepay", auth.requireAdmin, retired);
}
