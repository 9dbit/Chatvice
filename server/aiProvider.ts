import OpenAI from 'openai';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { storage } from './storage';
import { openAIOptions } from './aiConfig';
import { AI_CONFIG_KEY, AI_PROVIDERS, aiConfigSchema, aiConfigUpdateSchema, aiModelSchema, qwenBaseURL, type AIProviderConfig, type AIModelProfile, type AIModelCheck, type AIModelCatalog } from '../shared/aiProviderConfig';

type StoredConfig = { config: AIProviderConfig; openaiKey?: string; qwenKey?: string; openrouterKey?: string; deepseekKey?: string;
  models?: AIModelProfile[]; checks?: Record<string, AIModelCheck & { fingerprint: string }>;
  liveChecks?: Record<string, AIModelCheck & { fingerprint: string }> };
// Serialize settings writes, including tests finishing while an admin edits a model.
let writeQueue: Promise<unknown> = Promise.resolve();
function mutate<T>(action: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(action);
  writeQueue = result.catch(() => undefined);
  return result;
}
function encryptionKey() {
  const secret = process.env.AI_SETTINGS_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('AI settings encryption requires a server secret of at least 32 characters');
  return createHash('sha256').update(`chatvice-ai-settings-v1:${secret}`).digest();
}
export function sealKey(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
function unsealKey(value?: string): string | undefined {
  if (!value) return undefined;
  const bytes = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}
async function readStored(): Promise<StoredConfig> {
  const raw = await storage.getPlatformSetting(AI_CONFIG_KEY);
  if (!raw) return { config: aiConfigSchema.parse({}) };
  const parsed = JSON.parse(raw);
  return { config: aiConfigSchema.parse(parsed.config), openaiKey: parsed.openaiKey, qwenKey: parsed.qwenKey,
    openrouterKey: parsed.openrouterKey, deepseekKey: parsed.deepseekKey,
    models: parsed.models?.map((m: unknown) => aiModelSchema.parse(m)), checks: parsed.checks, liveChecks: parsed.liveChecks };
}
export async function getAIConfig() { return (await readStored()).config; }
export async function aiCacheNamespace() {
  const stored = await readStored();
  // Saving a test result or an inactive model must not flush the response cache.
  return createHash('sha256').update(JSON.stringify([stored.config, keyFor(stored, stored.config.provider)])).digest('hex').slice(0, 16);
}
function keyFor(stored: StoredConfig, provider: AIProviderConfig['provider']) {
  switch (provider) {
    case 'qwencloud': return unsealKey(stored.qwenKey) || process.env.QWENCLOUD_API_KEY;
    case 'openrouter': return unsealKey(stored.openrouterKey) || process.env.OPENROUTER_API_KEY;
    case 'deepseek': return unsealKey(stored.deepseekKey) || process.env.DEEPSEEK_API_KEY;
    case 'openai': return unsealKey(stored.openaiKey) || process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  }
}
export async function publicAIConfig() {
  const stored = await readStored();
  return { ...stored.config,
    openaiKeyConfigured: !!keyFor(stored, 'openai'),
    qwenKeyConfigured: !!keyFor(stored, 'qwencloud'),
    openrouterKeyConfigured: !!keyFor(stored, 'openrouter'),
    deepseekKeyConfigured: !!keyFor(stored, 'deepseek'),
    encryptionReady: !!((process.env.AI_SETTINGS_ENCRYPTION_KEY || process.env.SESSION_SECRET || '').length >= 32),
  };
}
async function candidate(input: unknown): Promise<StoredConfig> {
  const { openaiApiKey, qwenApiKey, openrouterApiKey, deepseekApiKey, ...config } = aiConfigUpdateSchema.parse(input);
  const old = await readStored();
  const stored = { ...old, config, openaiKey: openaiApiKey ? sealKey(openaiApiKey) : old.openaiKey,
    qwenKey: qwenApiKey ? sealKey(qwenApiKey) : old.qwenKey,
    openrouterKey: openrouterApiKey ? sealKey(openrouterApiKey) : old.openrouterKey,
    deepseekKey: deepseekApiKey ? sealKey(deepseekApiKey) : old.deepseekKey };
  if (!keyFor(stored, config.provider)) throw new Error('Selected provider has no API key. Enter a key or configure its server environment variable.');
  return stored;
}
export async function saveAIConfig(input: unknown) {
  return mutate(async () => {
    const stored = await candidate(input);
    await storage.setPlatformSetting(AI_CONFIG_KEY, JSON.stringify(stored));
    return publicAIConfig();
  });
}
function clientFor(stored: StoredConfig) {
  const provider = stored.config.provider;
  const apiKey = keyFor(stored, provider);
  if (!apiKey) throw new Error('Selected AI provider is not configured');
  if (provider === 'openai') {
    return new OpenAI({ ...(stored.openaiKey ? { apiKey } : openAIOptions()), timeout: 45000, maxRetries: 1 });
  }
  const baseURL = provider === 'qwencloud' ? qwenBaseURL(stored.config.qwenRegion)
    : provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.deepseek.com';
  return new OpenAI({ apiKey, baseURL, timeout: 45000, maxRetries: 0 });
}
export function routeCompletion(config: AIProviderConfig, params: any) {
  const vision = params.messages.some((m: any) => Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image_url'));
  const models = {
    openai: [config.openaiTextModel, config.openaiVisionModel],
    qwencloud: [config.qwenTextModel, config.qwenVisionModel],
    openrouter: [config.openrouterTextModel, config.openrouterVisionModel],
    deepseek: [config.deepseekTextModel, config.deepseekVisionModel],
  };
  const model = models[config.provider][vision ? 1 : 0];
  const body = { ...params, model };
  if (config.provider !== 'openai') {
    // Compatible providers accept max_tokens. Keep each provider's reasoning settings separate.
    if (body.max_completion_tokens !== undefined) {
      body.max_tokens = body.max_completion_tokens;
      delete body.max_completion_tokens;
    }
  }
  if (config.provider === 'qwencloud') body.enable_thinking = false;
  if (config.provider === 'deepseek') body.thinking = { type: 'disabled' };
  if (config.provider === 'openrouter') body.reasoning = { enabled: false };
  return body;
}
export async function completeWithProvider(params: any, options?: any) {
  const stored = await readStored();
  const started = Date.now();
  const vision = params.messages.some((m: any) => Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image_url'));
  const observed = async (check: AIModelCheck) => {
    try { await recordLiveCheck(stored, { ...check, checkedAt: new Date(started).toISOString(), latencyMs: Date.now() - started }); }
    catch { console.warn('Unable to save AI request status'); } // Telemetry must not break a valid reply.
  };
  try {
    const result = await clientFor(stored).chat.completions.create(routeCompletion(stored.config, params), options);
    // Opening a stream alone does not prove a completed reply.
    if (!params.stream) {
      const answered = result.choices?.some((c: any) => c.message?.content?.trim() || c.message?.tool_calls?.length);
      await observed({ state: answered ? (vision ? 'image_connected' : 'text_connected') : 'failed',
        message: answered ? `Latest ${vision ? 'image' : 'text'} request succeeded. This does not verify the other capability or measure the account balance.` : 'The provider returned no answer. Run Test connection to check again.',
        text: vision ? 'not_tested' : answered ? 'passed' : 'failed', vision: vision ? answered ? 'passed' : 'failed' : 'not_tested' });
    }
    return result;
  } catch (error: any) {
    const status = Number(error?.status) || undefined;
    await observed({ ...failureReason(status, vision), httpStatus: status,
      text: vision ? 'not_tested' : 'failed', vision: vision ? 'failed' : 'not_tested' });
    // Never bubble provider request headers or key-bearing SDK errors into logs.
    throw new Error(`${stored.config.provider} request failed (${Number(error?.status) || 'connection/configuration error'})`);
  }
}
// Existing integrations consume only this SDK surface, including tool-call continuations.
export const routedAI = { chat: { completions: { create: completeWithProvider } } } as unknown as OpenAI;
function failureReason(status: number | undefined, vision: boolean): Pick<AIModelCheck, 'state' | 'message'> {
  return status === 402 ? { state: 'billing_error', message: 'The provider reported insufficient API balance. If you have topped up, run Test connection again.' }
    : status === 401 || status === 403 ? { state: 'auth_error', message: 'API access rejected. Check the saved key and account access.' }
    : status === 400 || status === 404 || status === 422 ? { state: 'model_error', message: `Check the ${vision ? 'image' : 'text'} model ID, account access and supported capabilities.` }
    : status === 429 ? { state: 'rate_limited', message: 'Rate limit or quota reached. Check usage and billing, then retry.' }
    : status && status >= 500 ? { state: 'unavailable', message: 'The provider is temporarily unavailable. Retry later.' }
    : { state: 'failed', message: 'Connection failed or no answer returned. Check the model settings and retry.' };
}
async function probe(stored: StoredConfig): Promise<AIModelCheck> {
  const start = Date.now();
  const check: AIModelCheck = { state: 'connected', message: 'Text and image tests passed.', checkedAt: new Date().toISOString(), text: 'not_tested', vision: 'not_tested' };
  if (!keyFor(stored, stored.config.provider)) return { ...check, state: 'missing_key', message: 'Add an API key, then test this model.' };
  const client = clientFor(stored);
  for (const vision of [false, true]) {
    const content: any = vision ? [
      { type: 'text', text: 'Describe the image in one word.' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKElEQVR4nO3NsQ0AAAzCMP5/un0CNkuZ41wybXsHAAAAAAAAAAAAxR4yw/wuPL6QkAAAAABJRU5ErkJggg==' } },
    ] : 'Reply only OK.';
    try {
      const result: any = await client.chat.completions.create(routeCompletion(stored.config, { model: '', messages: [{ role: 'user', content }], max_tokens: 40 }));
      if (!result.choices?.[0]?.message?.content) throw new Error('Empty response');
      check[vision ? 'vision' : 'text'] = 'passed';
    } catch (error: any) {
      const status = Number(error?.status) || undefined;
      // Only controlled messages are persisted or returned; SDK errors may contain credentials.
      const reason = failureReason(status, vision);
      return { ...check, ...reason, [vision ? 'vision' : 'text']: 'failed', httpStatus: status, latencyMs: Date.now() - start };
    }
  }
  return { ...check, latencyMs: Date.now() - start };
}
export async function testAIConfig(input: unknown) {
  const stored = await candidate(input);
  const check = await probe(stored);
  if (check.state !== 'connected') throw new Error(`${check.vision === 'failed' ? 'Vision' : 'Text'} connection test failed (${check.httpStatus || 'connection/model error'}). ${check.message}`);
  return { success: true, provider: stored.config.provider, latencyMs: check.latencyMs };
}

function fromConfig(config: AIProviderConfig, provider = config.provider): AIModelProfile {
  const fields = AI_PROVIDERS[provider];
  return { id: `default-${provider}`, name: fields.label, provider, textModel: config[fields.text], visionModel: config[fields.vision], region: config.qwenRegion };
}
function sameModel(a: AIModelProfile, b: AIModelProfile) {
  return a.provider === b.provider && a.textModel === b.textModel && a.visionModel === b.visionModel && (a.provider !== 'qwencloud' || a.region === b.region);
}
function profiles(stored: StoredConfig): AIModelProfile[] {
  const list = stored.models ? [...stored.models] : (Object.keys(AI_PROVIDERS) as AIProviderConfig['provider'][]).map(p => fromConfig(stored.config, p));
  const active = fromConfig(stored.config);
  // Also preserve selections made through the legacy admin endpoint.
  if (!list.some(m => sameModel(m, active))) {
    active.id = `current-${active.provider}`;
    return [...list.filter(m => m.id !== active.id), active];
  }
  return list;
}
function modelConfig(stored: StoredConfig, model: AIModelProfile): StoredConfig {
  const fields = AI_PROVIDERS[model.provider];
  return { ...stored, config: { ...stored.config, provider: model.provider, [fields.text]: model.textModel, [fields.vision]: model.visionModel,
    ...(model.provider === 'qwencloud' ? { qwenRegion: model.region } : {}) } };
}
function fingerprint(stored: StoredConfig, model: AIModelProfile) {
  return createHash('sha256').update(JSON.stringify([model.provider, model.textModel, model.visionModel,
    model.provider === 'qwencloud' ? model.region : '', keyFor(stored, model.provider)])).digest('hex');
}
async function recordLiveCheck(snapshot: StoredConfig, check: AIModelCheck) {
  const model = profiles(snapshot).find(m => sameModel(m, fromConfig(snapshot.config)))!;
  const version = fingerprint(snapshot, model);
  await mutate(async () => {
    const latest = await readStored();
    const current = profiles(latest).find(m => m.id === model.id);
    if (!current || fingerprint(latest, current) !== version) return;
    const previous = latest.liveChecks?.[model.id];
    if (previous?.fingerprint === version) {
      const elapsed = Date.parse(check.checkedAt!) - Date.parse(previous.checkedAt!);
      if (elapsed < 0 || (elapsed < 60000 && previous.state === check.state && previous.text === check.text && previous.vision === check.vision && previous.httpStatus === check.httpStatus)) return;
    }
    latest.liveChecks = { ...latest.liveChecks, [model.id]: { ...check, fingerprint: version } };
    await storage.setPlatformSetting(AI_CONFIG_KEY, JSON.stringify(latest));
  });
}
function viewCatalog(stored: StoredConfig): AIModelCatalog {
  const active = fromConfig(stored.config);
  return { knowledgeSearch: stored.config.knowledgeSearch,
    encryptionReady: (process.env.AI_SETTINGS_ENCRYPTION_KEY || process.env.SESSION_SECRET || '').length >= 32,
    models: profiles(stored).map(model => {
      const keyConfigured = !!keyFor(stored, model.provider);
      const saved = stored.checks?.[model.id];
      let check: AIModelCheck = { state: keyConfigured ? 'untested' : 'missing_key', message: keyConfigured ? 'Run a connection test to verify this model.' : 'Add an API key to connect this provider.', text: 'not_tested', vision: 'not_tested' };
      if (keyConfigured && saved?.fingerprint === fingerprint(stored, model)) {
        const { fingerprint: _private, ...result } = saved;
        check = result;
        if (check.state === 'connected' && Date.now() - Date.parse(check.checkedAt!) > 86400000) check = { ...check, state: 'untested', message: 'The previous test is over 24 hours old. Test again before activating.' };
      }
      const live = stored.liveChecks?.[model.id];
      let liveCheck: AIModelCheck | undefined;
      if (keyConfigured && live?.fingerprint === fingerprint(stored, model)) {
        const { fingerprint: _private, ...result } = live;
        liveCheck = result;
      }
      return { ...model, active: sameModel(model, active), keyConfigured, check, liveCheck };
    }) };
}
export async function publicAIModels() { return viewCatalog(await readStored()); }
const modelInput = z.object({ model: aiModelSchema, apiKey: z.string().trim().max(512).optional() }).strict();
export async function saveAIModel(input: unknown) {
  const { model, apiKey } = modelInput.parse(input);
  return mutate(async () => {
    let stored = await readStored();
    const list = profiles(stored);
    const existing = list.find(m => m.id === model.id);
    if (model.id !== 'new' && !existing) throw new Error('Model not found. Refresh the page.');
    if (list.some(m => m.id !== model.id && sameModel(m, model))) throw new Error('This model configuration already has a card. Edit that card instead.');
    if (!existing && list.length >= 40) throw new Error('A maximum of 40 model cards is supported.');
    if (apiKey) {
      const key = { openai: 'openaiKey', qwencloud: 'qwenKey', openrouter: 'openrouterKey', deepseek: 'deepseekKey' } as const;
      stored[key[model.provider]] = sealKey(apiKey);
    }
    if (existing && sameModel(existing, fromConfig(stored.config))) stored = modelConfig(stored, model);
    const saved = { ...model, id: existing?.id || randomUUID() };
    stored.models = existing ? list.map(m => m.id === saved.id ? saved : m) : [...list, saved];
    await storage.setPlatformSetting(AI_CONFIG_KEY, JSON.stringify(stored));
    return viewCatalog(stored);
  });
}
export async function activateAIModel(input: unknown) {
  const { id } = z.object({ id: z.string().min(1).max(80) }).strict().parse(input);
  return mutate(async () => {
    const stored = await readStored();
    const model = viewCatalog(stored).models.find(m => m.id === id);
    if (!model) throw new Error('Model not found. Refresh the page.');
    if (model.check.state !== 'connected') throw new Error('Run a successful text and image test before activating this model.');
    const updated = modelConfig(stored, model);
    updated.models = profiles(stored);
    await storage.setPlatformSetting(AI_CONFIG_KEY, JSON.stringify(updated));
    return viewCatalog(updated);
  });
}
const runningTests = new Set<string>();
export async function testAIModel(input: unknown) {
  const { id } = z.object({ id: z.string().min(1).max(80) }).strict().parse(input);
  if (runningTests.has(id)) throw new Error('A test for this model is already running.');
  const stored = await readStored();
  const model = profiles(stored).find(m => m.id === id);
  if (!model) throw new Error('Model not found. Refresh the page.');
  const version = fingerprint(stored, model);
  runningTests.add(id);
  try {
    const check = await probe(modelConfig(stored, model));
    return await mutate(async () => {
      const latest = await readStored();
      const current = profiles(latest).find(m => m.id === id);
      if (!current || fingerprint(latest, current) !== version) throw new Error('Model settings changed during the test. Run the test again.');
      latest.models = profiles(latest);
      latest.checks = { ...latest.checks, [id]: { ...check, fingerprint: version } };
      await storage.setPlatformSetting(AI_CONFIG_KEY, JSON.stringify(latest));
      return viewCatalog(latest);
    });
  } finally { runningTests.delete(id); }
}
export async function removeAIModel(input: unknown) {
  const { id } = z.object({ id: z.string().min(1).max(80) }).strict().parse(input);
  return mutate(async () => {
    const stored = await readStored();
    const model = profiles(stored).find(m => m.id === id);
    if (!model) throw new Error('Model not found. Refresh the page.');
    if (sameModel(model, fromConfig(stored.config))) throw new Error('Activate another model before removing the active model.');
    stored.models = profiles(stored).filter(m => m.id !== id);
    delete stored.checks?.[id];
    delete stored.liveChecks?.[id];
    await storage.setPlatformSetting(AI_CONFIG_KEY, JSON.stringify(stored));
    return viewCatalog(stored);
  });
}
export async function saveAIKnowledge(input: unknown) {
  const { knowledgeSearch } = z.object({ knowledgeSearch: aiConfigSchema.shape.knowledgeSearch }).strict().parse(input);
  return mutate(async () => {
    const stored = await readStored();
    stored.config.knowledgeSearch = knowledgeSearch;
    await storage.setPlatformSetting(AI_CONFIG_KEY, JSON.stringify(stored));
    return viewCatalog(stored);
  });
}

export async function embeddingClient() {
  const stored = await readStored();
  return clientFor({ ...stored, config: { ...stored.config, provider: 'openai' } });
}
