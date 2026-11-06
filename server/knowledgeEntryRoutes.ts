import type { Express, RequestHandler } from "express";
import type { storage as productionStorage } from "./storage";
import { randomBytes } from "crypto";
import { z } from "zod";

const entryUpdate = z.object({ name: z.string().trim().min(1).max(200).optional(), content: z.string().optional(), isActive: z.boolean().optional(), sortOrder: z.number().int().nonnegative().optional() }).strict();
const entryCreate = z.object({ name: z.string().trim().min(1).max(200), agentId: z.string().min(1).optional(), isLinked: z.boolean().optional() }).strict();
const saveInput = entryUpdate.pick({ name: true, content: true }).extend({ skipEmbeddings: z.boolean().optional() });
type KnowledgeStorage = Pick<typeof productionStorage, "getKnowledgeEntries" | "getAgent" | "getKnowledgeByAgent" | "createKnowledgeEntry" | "getMaxSortOrder" | "getKnowledgeEntry" | "updateKnowledgeEntry" | "getAgents" | "getAllActiveKnowledgeContent" | "setKnowledge" | "deleteKnowledgeEntry">;
export function registerKnowledgeEntryRoutes(app: Express, { storage, requireMerchant, processKnowledgeBase }: { storage: KnowledgeStorage; requireMerchant: RequestHandler; processKnowledgeBase: (merchantId: string, content: string, agentId?: string) => Promise<void> }) {
  app.get("/api/knowledge-entries", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const agentId = req.query.agentId as string | undefined;
      if (agentId) {
        if (typeof agentId !== "string") return res.status(400).json({ error: "Invalid agent" });
        const agent = await storage.getAgent(agentId);
        if (!agent || agent.merchantId !== merchantId) return res.status(404).json({ error: "Agent not found" });
      }
      let entries = await storage.getKnowledgeEntries(merchantId, agentId || undefined);

      if (entries.length === 0 && agentId) {
        const agent = await storage.getAgent(agentId);
        if (!agent || agent.merchantId !== merchantId) {
          return res.json([]);
        }
        let initialContent = "";
        const oldKnowledge = await storage.getKnowledgeByAgent(agentId);
        if (oldKnowledge && oldKnowledge.content && oldKnowledge.content.trim()) {
          initialContent = oldKnowledge.content;
        }
        const id = "ke_" + randomBytes(8).toString("hex");
        await storage.createKnowledgeEntry({
          id,
          merchantId,
          agentId,
          name: "General Knowledge",
          content: initialContent,
          isActive: true,
          isLinked: false,
          sortOrder: 0,
        });
        entries = await storage.getKnowledgeEntries(merchantId, agentId);
      }

      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/knowledge-entries", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const parsed = entryCreate.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid knowledge entry", details: parsed.error.flatten() });
      const { name, agentId, isLinked } = parsed.data;
      if (agentId) {
        const agent = await storage.getAgent(agentId);
        if (!agent || agent.merchantId !== merchantId) return res.status(404).json({ error: "Agent not found" });
      }
      if (!isLinked && !agentId) return res.status(400).json({ error: "Select an agent or share this entry with all agents" });
      const maxSort = await storage.getMaxSortOrder(merchantId, isLinked ? undefined : (agentId || undefined));
      const id = "ke_" + randomBytes(8).toString("hex");
      const entry = await storage.createKnowledgeEntry({
        id,
        merchantId,
        agentId: isLinked ? null : (agentId || null),
        name: name.trim(),
        content: "",
        isActive: true,
        isLinked: !!isLinked,
        sortOrder: maxSort + 1,
      });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/knowledge-entries/:id", requireMerchant, async (req, res) => {
    try {
      const entry = await storage.getKnowledgeEntry(req.params.id);
      if (!entry || entry.merchantId !== req.session.merchantId) {
        return res.status(404).json({ error: "Entry not found" });
      }
      const parsed = entryUpdate.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid knowledge entry", details: parsed.error.flatten() });
      const updates = parsed.data;
      const updated = await storage.updateKnowledgeEntry(req.params.id, updates);

      if (updates.isActive !== undefined || updates.content !== undefined || updates.name !== undefined) {
        const merchantId = entry.merchantId;
        const allAgents = await storage.getAgents(merchantId);
        for (const agent of allAgents) {
          const combinedContent = await storage.getAllActiveKnowledgeContent(merchantId, agent.id);
          await storage.setKnowledge(merchantId, combinedContent || "", agent.id);
          processKnowledgeBase(merchantId, combinedContent || "", agent.id).catch(() => {});
        }
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/knowledge-entries/:id/toggle-link", requireMerchant, async (req, res) => {
    try {
      const entry = await storage.getKnowledgeEntry(req.params.id);
      if (!entry || entry.merchantId !== req.session.merchantId) {
        return res.status(404).json({ error: "Entry not found" });
      }
      const newLinked = !entry.isLinked;
      const agentId = req.body.agentId || entry.agentId;
      if (!newLinked) {
        if (typeof agentId !== "string" || !agentId) return res.status(400).json({ error: "Select an agent before unlinking this entry" });
        const agent = await storage.getAgent(agentId);
        if (!agent || agent.merchantId !== entry.merchantId) return res.status(404).json({ error: "Agent not found" });
      }
      const updated = await storage.updateKnowledgeEntry(req.params.id, {
        isLinked: newLinked,
        agentId: newLinked ? null : (agentId || entry.agentId),
      });

      const merchantId = entry.merchantId;
      const allAgents = await storage.getAgents(merchantId);
      for (const agent of allAgents) {
        const combinedContent = await storage.getAllActiveKnowledgeContent(merchantId, agent.id);
        await storage.setKnowledge(merchantId, combinedContent || "", agent.id);
        processKnowledgeBase(merchantId, combinedContent || "", agent.id).catch(() => {});
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/knowledge-entries/:id/save", requireMerchant, async (req, res) => {
    try {
      const entry = await storage.getKnowledgeEntry(req.params.id);
      if (!entry || entry.merchantId !== req.session.merchantId) {
        return res.status(404).json({ error: "Entry not found" });
      }
      const merchantId = entry.merchantId;
      const parsed = saveInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid knowledge entry", details: parsed.error.flatten() });
      const { skipEmbeddings, ...updates } = parsed.data;
      await storage.updateKnowledgeEntry(req.params.id, updates);
      const allAgents = await storage.getAgents(merchantId);
      for (const agent of allAgents) {
        const combinedContent = await storage.getAllActiveKnowledgeContent(merchantId, agent.id);
        // Always update the fallback knowledge used by chat, even when vector indexing is skipped.
        await storage.setKnowledge(merchantId, combinedContent || "", agent.id);
        if (!skipEmbeddings) processKnowledgeBase(merchantId, combinedContent || "", agent.id).catch(err => {
          console.error("[knowledge-entries] Error processing embeddings:", err);
        });
      }

      const updated = await storage.getKnowledgeEntry(req.params.id);
      res.json({ success: true, entry: updated });
    } catch (error) {
      console.error("Knowledge entry save error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/knowledge-entries/:id", requireMerchant, async (req, res) => {
    try {
      const entry = await storage.getKnowledgeEntry(req.params.id);
      if (!entry || entry.merchantId !== req.session.merchantId) {
        return res.status(404).json({ error: "Entry not found" });
      }
      await storage.deleteKnowledgeEntry(req.params.id);

      const merchantId = entry.merchantId;
      const allAgents = await storage.getAgents(merchantId);
      for (const agent of allAgents) {
        const combinedContent = await storage.getAllActiveKnowledgeContent(merchantId, agent.id);
        await storage.setKnowledge(merchantId, combinedContent || "", agent.id);
        processKnowledgeBase(merchantId, combinedContent || "", agent.id).catch(() => {});
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/knowledge-entries/reorder", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.session.merchantId!;
      const parsed = z.object({ orders: z.array(z.object({ id: z.string().min(1), sortOrder: z.number().int().nonnegative() })).max(1000) }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid entry order" });
      const { orders } = parsed.data;
      const entries = await Promise.all(orders.map(({ id }) => storage.getKnowledgeEntry(id)));
      if (entries.some(entry => !entry || entry.merchantId !== merchantId)) return res.status(404).json({ error: "Entry not found" });
      for (const { id, sortOrder } of orders) await storage.updateKnowledgeEntry(id, { sortOrder });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

}
