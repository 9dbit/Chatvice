import type { Express, RequestHandler } from "express";
import { insertWelcomeBubbleSchema } from "@shared/schema";
import { promoClickSettings } from "@shared/welcomeBubble";
import type { storage as productionStorage } from "./storage";

const updateSchema = insertWelcomeBubbleSchema.omit({ merchantId: true }).partial().strict();
type BubbleStorage = Pick<typeof productionStorage, "getWelcomeBubble" | "upsertWelcomeBubble">;
export function registerWelcomeBubbleRoutes(app: Express, { storage, requireMerchant, resolveMerchant }: {
  storage: BubbleStorage;
  requireMerchant: RequestHandler;
  resolveMerchant: (id: string) => Promise<{ id: string } | null | undefined>;
}) {
  app.get("/api/welcome-bubble", requireMerchant, async (req, res) => {
    try {
      const bubble = await storage.getWelcomeBubble(req.session.merchantId!);
      res.json(bubble || {
        headline: "Need help?", message: "I can guide you through our features.",
        buttonLabel: "Chat with us", buttonColor: "#7c3aed", buttonTextColor: "#ffffff",
        promoImageEnabled: false, promoImageUrl: "", promoClickAction: "none", promoClickUrl: "",
        isEnabled: true, reappearInterval: 60, actionButtons: [], socialIconsEnabled: false,
      });
    } catch { res.status(500).json({ error: "Server error" }); }
  });
  app.put("/api/welcome-bubble", requireMerchant, async (req, res) => {
    try {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid welcome bubble settings" });
      const merchantId = req.session.merchantId!;
      const existing = await storage.getWelcomeBubble(merchantId);
      const click = promoClickSettings.safeParse({
        promoClickAction: parsed.data.promoClickAction ?? existing?.promoClickAction ?? "none",
        promoClickUrl: parsed.data.promoClickUrl ?? existing?.promoClickUrl ?? "",
      });
      if (!click.success) return res.status(400).json({ error: click.error.issues[0].message });
      res.json(await storage.upsertWelcomeBubble(merchantId, { ...parsed.data, ...click.data }));
    } catch { res.status(500).json({ error: "Server error" }); }
  });
  app.get("/api/widget/:merchantId/welcome-bubble", async (req, res) => {
    try {
      const merchant = await resolveMerchant(req.params.merchantId);
      const bubble = merchant && await storage.getWelcomeBubble(merchant.id);
      res.setHeader("Cache-Control", "no-store");
      res.json(bubble?.isEnabled ? bubble : { isEnabled: false });
    } catch { res.status(500).json({ error: "Server error" }); }
  });
}
