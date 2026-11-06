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
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
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
  it('loads existing two-provider settings without changing the selected provider or keys', async () => {
    await saveAIConfig({ provider: 'qwencloud', qwenTextModel: 'qwen-plus', qwenApiKey: 'existing-qwen-key' });
    const legacy = JSON.parse(mock.value!);
    for (const key of ['openrouterTextModel', 'openrouterVisionModel', 'deepseekTextModel', 'deepseekVisionModel']) delete legacy.config[key];
    mock.value = JSON.stringify(legacy);
    expect(await publicAIConfig()).toMatchObject({ provider: 'qwencloud', qwenTextModel: 'qwen-plus', qwenKeyConfigured: true,
      openrouterTextModel: 'qwen/qwen3.8-flash', deepseekTextModel: 'deepseek-flash', openrouterKeyConfigured: false, deepseekKeyConfigured: false });
    await completeWithProvider(params);
    expect(mock.options[0].apiKey).toBe('existing-qwen-key');
  });
  it('accepts namespaced OpenRouter IDs but rejects URLs and unknown endpoint fields', () => {
    expect(aiConfigSchema.safeParse({ provider: 'openrouter', openrouterTextModel: 'qwen/qwen3.8-flash' }).success).toBe(true);
    for (const id of ['https://evil.test/model', '../secret', 'qwen/model?key=secret', 'qwen/model/extra', 'qwen3.8-flash']) {
      expect(aiConfigSchema.safeParse({ openrouterTextModel: id }).success).toBe(false);
    }
    expect(aiConfigSchema.safeParse({ provider: 'openrouter', baseURL: 'https://evil.test' }).success).toBe(false);
  });
  const providers = [
    { provider: 'openrouter', key: 'openrouterApiKey', flag: 'openrouterKeyConfigured', env: 'OPENROUTER_API_KEY', baseURL: 'https://openrouter.ai/api/v1', model: 'qwen/qwen3.8-flash', vision: 'qwen/qwen3.8-flash', textField: 'openrouterTextModel', visionField: 'openrouterVisionModel', reasoning: { reasoning: { enabled: false } } },
    { provider: 'deepseek', key: 'deepseekApiKey', flag: 'deepseekKeyConfigured', env: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com', model: 'deepseek-v4-pro', vision: 'deepseek-flash', textField: 'deepseekTextModel', visionField: 'deepseekVisionModel', reasoning: { thinking: { type: 'disabled' } } },
  ] as const;
  for (const p of providers) {
    it(`${p.provider}: isolates encrypted keys, selects text/vision models and preserves tool continuations`, async () => {
      const config = { ...DEFAULT_AI_CONFIG, provider: p.provider, [p.textField]: p.model, [p.visionField]: p.vision };
      await saveAIConfig({ ...config, [p.key]: 'new-provider-private-key' });
      expect(mock.value).not.toContain('new-provider-private-key');
      const publicConfig = await publicAIConfig();
      expect(publicConfig[p.flag]).toBe(true);
      expect(JSON.stringify(publicConfig)).not.toContain('new-provider-private-key');
      await saveAIConfig({ ...config, provider: 'openai' });
      await saveAIConfig({ ...config, [p.key]: '' });
      const toolParams = { ...params, tools: [{ type: 'function', function: { name: 'lookup' } }], messages: [
        { role: 'assistant', content: null, tool_calls: [{ id: 'call1', type: 'function', function: { name: 'lookup', arguments: '{}' } }] },
        { role: 'tool', tool_call_id: 'call1', content: 'found' },
      ] };
      await completeWithProvider(toolParams);
      expect(mock.options[0]).toMatchObject({ apiKey: 'new-provider-private-key', baseURL: p.baseURL, maxRetries: 0 });
      expect(mock.create.mock.calls[0][0]).toMatchObject({ model: p.model, max_tokens: 80, messages: toolParams.messages, tools: toolParams.tools, ...p.reasoning });
      expect(mock.create.mock.calls[0][0]).not.toHaveProperty('enable_thinking');
      expect(mock.create.mock.calls[0][0]).not.toHaveProperty('max_completion_tokens');
      await completeWithProvider({ ...params, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,test' } }] }] });
      expect(mock.create.mock.calls[1][0].model).toBe(p.vision);
      mock.create.mockRejectedValueOnce({ status: 429, message: 'new-provider-private-key', headers: { Authorization: 'new-provider-private-key' } });
      await expect(completeWithProvider(params)).rejects.toThrow(`${p.provider} request failed (429)`);
      expect(mock.create).toHaveBeenCalledTimes(3);
    });
    it(`${p.provider}: tests an environment key without activating settings and rejects missing keys`, async () => {
      await expect(saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: p.provider })).rejects.toThrow('no API key');
      expect(mock.value).toBeNull();
      process.env[p.env] = 'provider-env-test-key';
      await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'openai' });
      const saved = mock.value;
      await testAIConfig({ ...DEFAULT_AI_CONFIG, provider: p.provider });
      expect(mock.options[0]).toMatchObject({ apiKey: 'provider-env-test-key', baseURL: p.baseURL });
      expect(mock.create).toHaveBeenCalledTimes(2);
      expect(mock.value).toBe(saved);
      expect((await publicAIConfig()).provider).toBe('openai');
    });
  }
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
