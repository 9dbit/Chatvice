import type { Express, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { publicAIConfig, saveAIConfig, testAIConfig, publicAIModels, saveAIModel, testAIModel, activateAIModel, removeAIModel, saveAIKnowledge } from './aiProvider';
export function registerAIProviderRoutes(app: Express, requireAdmin: RequestHandler) {
  const sameOrigin: RequestHandler = (req, res, next) => {
    const origin = req.get('origin');
    const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : `${req.protocol}://${req.get('host')}`;
    if (!origin || origin !== expected) return res.status(403).json({ error: 'Same-origin admin request required' });
    next();
  };
  app.get('/api/admin/ai-provider', requireAdmin, async (_req, res) => {
    try { res.json(await publicAIConfig()); }
    catch { res.status(500).json({ error: 'Unable to read AI settings' }); }
  });
  app.get('/api/admin/ai-models', requireAdmin, async (_req, res) => {
    try { res.json(await publicAIModels()); }
    catch { res.status(500).json({ error: 'Unable to read AI models' }); }
  });
  for (const [path, action] of [['/api/admin/ai-provider', saveAIConfig], ['/api/admin/ai-provider/test', testAIConfig],
    ['/api/admin/ai-models', saveAIModel], ['/api/admin/ai-models/test', testAIModel], ['/api/admin/ai-models/activate', activateAIModel],
    ['/api/admin/ai-models/remove', removeAIModel], ['/api/admin/ai-models/knowledge', saveAIKnowledge]] as const) {
    app.post(path, requireAdmin, sameOrigin, async (req, res) => {
      try { res.json(await action(req.body)); }
      catch (error) {
        res.status(400).json({ error: error instanceof ZodError ? 'Invalid AI settings' : error instanceof Error ? error.message : 'AI settings request failed' });
      }
    });
  }
}
