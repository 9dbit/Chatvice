import OpenAI from 'openai';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { storage } from './storage';
import { openAIOptions } from './aiConfig';
import { AI_CONFIG_KEY, aiConfigSchema, aiConfigUpdateSchema, qwenBaseURL, type AIProviderConfig } from '../shared/aiProviderConfig';

type StoredConfig = { config: AIProviderConfig; openaiKey?: string; qwenKey?: string };
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
  return { config: aiConfigSchema.parse(parsed.config), openaiKey: parsed.openaiKey, qwenKey: parsed.qwenKey };
}
export async function getAIConfig() { return (await readStored()).config; }
export async function aiCacheNamespace() {
  const value = await storage.getPlatformSetting(AI_CONFIG_KEY);
  return createHash('sha256').update(value || 'default').digest('hex').slice(0, 16);
}
function keyFor(stored: StoredConfig, provider: AIProviderConfig['provider']) {
  return provider === 'qwencloud'
    ? unsealKey(stored.qwenKey) || process.env.QWENCLOUD_API_KEY
    : unsealKey(stored.openaiKey) || process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
}
export async function publicAIConfig() {
  const stored = await readStored();
  return { ...stored.config,
    openaiKeyConfigured: !!keyFor(stored, 'openai'),
    qwenKeyConfigured: !!keyFor(stored, 'qwencloud'),
    encryptionReady: !!((process.env.AI_SETTINGS_ENCRYPTION_KEY || process.env.SESSION_SECRET || '').length >= 32),
  };
}
async function candidate(input: unknown): Promise<StoredConfig> {
  const { openaiApiKey, qwenApiKey, ...config } = aiConfigUpdateSchema.parse(input);
  const old = await readStored();
  const stored = { config, openaiKey: openaiApiKey ? sealKey(openaiApiKey) : old.openaiKey,
    qwenKey: qwenApiKey ? sealKey(qwenApiKey) : old.qwenKey };
  if (!keyFor(stored, config.provider)) throw new Error('Selected provider has no API key. Enter a key or configure its server environment variable.');
  return stored;
}
export async function saveAIConfig(input: unknown) {
  const stored = await candidate(input);
  await storage.setPlatformSetting(AI_CONFIG_KEY, JSON.stringify(stored));
  return publicAIConfig();
}
function clientFor(stored: StoredConfig) {
  const provider = stored.config.provider;
  const apiKey = keyFor(stored, provider);
  if (!apiKey) throw new Error('Selected AI provider is not configured');
  return new OpenAI(provider === 'qwencloud'
    ? { apiKey, baseURL: qwenBaseURL(stored.config.qwenRegion), timeout: 45000, maxRetries: 0 }
    : { ...(stored.openaiKey ? { apiKey } : openAIOptions()), timeout: 45000, maxRetries: 1 });
}
export function routeCompletion(config: AIProviderConfig, params: any) {
  const vision = params.messages.some((m: any) => Array.isArray(m.content) && m.content.some((p: any) => p.type === 'image_url'));
  const model = config.provider === 'qwencloud'
    ? (vision ? config.qwenVisionModel : config.qwenTextModel)
    : (vision ? config.openaiVisionModel : config.openaiTextModel);
  const body = { ...params, model };
  if (config.provider === 'qwencloud') {
    // Qwen Chat Completions accepts max_tokens; disable reasoning for support latency.
    if (body.max_completion_tokens !== undefined) {
      body.max_tokens = body.max_completion_tokens;
      delete body.max_completion_tokens;
    }
    body.enable_thinking = false;
  }
  return body;
}
export async function completeWithProvider(params: any, options?: any) {
  const stored = await readStored();
  try {
    return await clientFor(stored).chat.completions.create(routeCompletion(stored.config, params), options);
  } catch (error: any) {
    // Never bubble provider request headers or key-bearing SDK errors into logs.
    throw new Error(`${stored.config.provider} request failed (${Number(error?.status) || 'connection/configuration error'})`);
  }
}
// Existing integrations consume only this SDK surface, including tool-call continuations.
export const routedAI = { chat: { completions: { create: completeWithProvider } } } as unknown as OpenAI;
export async function testAIConfig(input: unknown) {
  const stored = await candidate(input);
  const start = Date.now();
  const client = clientFor(stored);
  for (const vision of [false, true]) {
    const content: any = vision ? [
      { type: 'text', text: 'Describe the image in one word.' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKElEQVR4nO3NsQ0AAAzCMP5/un0CNkuZ41wybXsHAAAAAAAAAAAAxR4yw/wuPL6QkAAAAABJRU5ErkJggg==' } },
    ] : 'Reply only OK.';
    try {
      const result: any = await client.chat.completions.create(routeCompletion(stored.config, { model: '', messages: [{ role: 'user', content }], max_tokens: 40 }));
      if (!result.choices?.[0]?.message?.content) throw new Error('Empty response');
    } catch (error: any) {
      throw new Error(`${vision ? 'Vision' : 'Text'} connection test failed (${Number(error?.status) || 'connection/model error'}). Check API key, region, model access and quota.`);
    }
  }
  return { success: true, provider: stored.config.provider, latencyMs: Date.now() - start };
}

export async function embeddingClient() {
  const stored = await readStored();
  return clientFor({ ...stored, config: { ...stored.config, provider: 'openai' } });
}
