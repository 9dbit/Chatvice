import type { Express, RequestHandler } from "express";
import { listPresetsForApi, scaffoldPresetIntent, type ScaffoldPresetIntentDeps } from "./customConnector";

export type CustomDataPresetRouteDeps = {
  requireMerchant: RequestHandler;
  getMerchantId: (req: any) => string | undefined;
  storage: ScaffoldPresetIntentDeps;
};

/**
 * Registers the two wizard endpoints used by the Custom Data Source
 * ConnectWizard. Extracted so they can be exercised at the HTTP boundary
 * (status code + response body) by supertest without spinning up the rest
 * of the server (sessions, DB, websockets, etc.).
 */
export function registerCustomDataPresetRoutes(
  app: Express,
  deps: CustomDataPresetRouteDeps,
) {
  app.get(
    "/api/merchant/custom-data-source/presets",
    deps.requireMerchant,
    async (_req, res) => {
      res.json(listPresetsForApi());
    },
  );

  app.post(
    "/api/merchant/custom-data-intents/from-preset",
    deps.requireMerchant,
    async (req, res) => {
      try {
        const merchantId = deps.getMerchantId(req);
        if (!merchantId) return res.status(401).json({ error: "Unauthorized" });
        const { preset, intentKey } = (req.body || {}) as { preset?: unknown; intentKey?: unknown };
        const result = await scaffoldPresetIntent({
          merchantId,
          preset,
          intentKey,
          deps: deps.storage,
        });
        if (result.ok) return res.json(result.intent);
        const body: Record<string, unknown> = { error: result.error };
        if (result.intentKey) body.intentKey = result.intentKey;
        return res.status(result.status).json(body);
      } catch (err) {
        console.error("[CustomDataIntent] from-preset error:", err);
        return res.status(500).json({ error: "Failed to scaffold preset intent" });
      }
    },
  );
}
