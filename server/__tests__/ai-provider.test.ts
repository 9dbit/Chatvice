// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const mock = vi.hoisted(() => ({ value: null as string | null, create: vi.fn(), options: [] as any[] }));
vi.mock('../storage', () => ({ storage: {
  getPlatformSetting: vi.fn(async () => mock.value),
  setPlatformSetting: vi.fn(async (_key: string, value: string) => { mock.value = value; }),
} }));
vi.mock('openai', () => ({ default: class {
  chat = { completions: { create: mock.create } };
  constructor(options: any) { mock.options.push(options); }
} }));
import { DEFAULT_AI_CONFIG, aiConfigSchema } from '../../shared/aiProviderConfig';
import { completeWithProvider, saveAIConfig, publicAIConfig, aiCacheNamespace, routeCompletion, testAIConfig } from '../aiProvider';
import { registerAIProviderRoutes } from '../aiProviderRoutes';
const params = { model: 'gpt-4.1-mini', messages: [{ role: 'user', content: 'hello' }], max_completion_tokens: 80 };
beforeEach(() => {
  mock.value = null; mock.options = []; mock.create.mockReset();
  mock.create.mockResolvedValue({ model: 'qwen-plus', choices: [{ message: { content: 'OK' } }] });
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters';
  process.env.OPENAI_API_KEY = 'openai-test-key';
  delete process.env.QWENCLOUD_API_KEY;
  process.env.APP_URL = 'https://chatvice.app';
});
describe('manual provider routing', () => {
  it('uses QwenCloud by default and supports manual OpenAI selection', async () => {
    process.env.QWENCLOUD_API_KEY = 'qwen-env-key';
    await completeWithProvider(params);
    expect(mock.options[0].baseURL).toBe('https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1');
    expect(mock.create.mock.calls[0][0].model).toBe('qwen-plus');
    expect((await publicAIConfig()).knowledgeSearch).toBe('keyword');
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'openai' });
    mock.options = []; mock.create.mockClear();
    await completeWithProvider(params);
    expect(mock.options[0].baseURL).toBeUndefined();
    expect(mock.options[0].apiKey).toBe('openai-test-key');
    expect(mock.create.mock.calls[0][0].model).toBe('gpt-4.1-mini');
  });
  it('encrypts keys, masks reads, changes namespace and routes Qwen with correct limits', async () => {
    const old = await aiCacheNamespace();
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'qwencloud', qwenApiKey: 'private-qwen-test-key', knowledgeSearch: 'keyword' });
    expect(mock.value).not.toContain('private-qwen-test-key');
    expect(JSON.stringify(await publicAIConfig())).not.toContain('private-qwen-test-key');
    expect((await publicAIConfig()).qwenKeyConfigured).toBe(true);
    expect(await aiCacheNamespace()).not.toBe(old);
    await completeWithProvider(params);
    expect(mock.options[0]).toMatchObject({ apiKey: 'private-qwen-test-key', baseURL: 'https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1' });
    expect(mock.create.mock.calls[0][0]).toMatchObject({ model: 'qwen-plus', max_tokens: 80, enable_thinking: false });
    expect(mock.create.mock.calls[0][0]).not.toHaveProperty('max_completion_tokens');
  });
  it('preserves key on blank, switches back without fallback, preserves tool messages', async () => {
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'qwencloud', qwenApiKey: 'private-key' });
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'qwencloud', qwenApiKey: '' });
    const toolParams = { ...params, tools: [{ type: 'function', function: { name: 'lookup' } }], messages: [{ role: 'tool', tool_call_id: 'call1', content: 'found' }] };
    await completeWithProvider(toolParams);
    expect(mock.options[0].apiKey).toBe('private-key');
    expect(mock.create.mock.calls[0][0].messages).toEqual(toolParams.messages);
    expect(mock.create.mock.calls[0][0].tools).toEqual(toolParams.tools);
    mock.create.mockRejectedValueOnce({ status: 429, headers: { Authorization: 'private-key' } });
    await expect(completeWithProvider(params)).rejects.toThrow('qwencloud request failed (429)');
    expect(mock.create).toHaveBeenCalledTimes(2);
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'openai' });
    await completeWithProvider(params);
    expect(mock.options.at(-1).apiKey).toBe('openai-test-key');
  });
  it('selects vision model from image content, not old model ID', () => {
    expect(routeCompletion({ ...DEFAULT_AI_CONFIG, provider: 'qwencloud' }, { ...params, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } }] }] }).model).toBe('qwen3-vl-plus');
  });
  it('rejects missing keys and arbitrary endpoints without storing anything', async () => {
    await expect(saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'qwencloud' })).rejects.toThrow('no API key');
    expect(mock.value).toBeNull();
    expect(aiConfigSchema.safeParse({ ...DEFAULT_AI_CONFIG, qwenRegion: 'localhost' }).success).toBe(false);
    expect(aiConfigSchema.safeParse({ ...DEFAULT_AI_CONFIG, baseURL: 'https://evil.test' }).success).toBe(false);
  });
  it('tests text and vision without saving/activating', async () => {
    await testAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'qwencloud', qwenApiKey: 'private-key' });
    expect(mock.create).toHaveBeenCalledTimes(2);
    expect(mock.create.mock.calls[1][0].model).toBe('qwen3-vl-plus');
    expect(mock.value).toBeNull();
  });
});
describe('admin settings access', () => {
  function app() {
    const app = express(); app.use(express.json());
    registerAIProviderRoutes(app, (req, res, next) => req.get('x-test-role') === 'admin' ? next() : void res.sendStatus(401));
    return app;
  }
  it('rejects anonymous/merchant callers and cross-origin changes', async () => {
    await request(app()).get('/api/admin/ai-provider').expect(401);
    await request(app()).post('/api/admin/ai-provider').set('x-test-role', 'merchant').send(DEFAULT_AI_CONFIG).expect(401);
    await request(app()).post('/api/admin/ai-provider').set('x-test-role', 'admin').set('Origin', 'https://evil.test').send(DEFAULT_AI_CONFIG).expect(403);
    expect(mock.value).toBeNull();
  });
  it('saves valid admin config and returns no secret', async () => {
    const result = await request(app()).post('/api/admin/ai-provider').set('x-test-role', 'admin').set('Origin', 'https://chatvice.app').send({ ...DEFAULT_AI_CONFIG, provider: 'qwencloud', qwenApiKey: 'private-key' }).expect(200);
    expect(result.body.provider).toBe('qwencloud');
    expect(result.text).not.toContain('private-key');
    await request(app()).post('/api/admin/ai-provider').set('x-test-role', 'admin').set('Origin', 'https://chatvice.app').send({ provider: 'evil' }).expect(400);
  });
});
