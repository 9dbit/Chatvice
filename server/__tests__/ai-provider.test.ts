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
import { DEFAULT_AI_CONFIG, aiConfigSchema, currentAIStatus } from '../../shared/aiProviderConfig';
import { completeWithProvider, saveAIConfig, publicAIConfig, aiCacheNamespace, routeCompletion, testAIConfig, publicAIModels, saveAIModel, testAIModel, activateAIModel, removeAIModel, saveAIKnowledge } from '../aiProvider';
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


describe('model cards and persistent connection status', () => {
  const profile = { id: 'new', name: 'DeepSeek alternate', provider: 'deepseek', textModel: 'deepseek-v4-pro', visionModel: 'deepseek-flash', region: 'ap-southeast-1' };
  it('imports current settings into four cards without changing the active selection', async () => {
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'deepseek', deepseekApiKey: 'secret' });
    const before = mock.value;
    const catalog = await publicAIModels();
    expect(catalog.models).toHaveLength(4);
    expect(catalog.models.find(m => m.active)).toMatchObject({ id: 'default-deepseek', keyConfigured: true, check: { state: 'untested' } });
    expect(catalog.models.find(m => m.provider === 'openrouter')?.check.state).toBe('missing_key');
    expect(mock.value).toBe(before);
  });
  it('stores manual models without activating, tests then switches the live route', async () => {
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'openai' });
    const namespace = await aiCacheNamespace();
    const added = await saveAIModel({ model: profile, apiKey: 'private-deepseek-key' });
    const id = added.models.find(m => m.name === profile.name)!.id;
    expect(added.models.find(m => m.active)?.provider).toBe('openai');
    expect(mock.value).not.toContain('private-deepseek-key');
    expect(await aiCacheNamespace()).toBe(namespace);
    await expect(activateAIModel({ id })).rejects.toThrow('successful text and image test');
    await testAIModel({ id });
    expect((await publicAIModels()).models.find(m => m.id === id)?.check).toMatchObject({ state: 'connected', text: 'passed', vision: 'passed' });
    expect(await aiCacheNamespace()).toBe(namespace);
    await activateAIModel({ id });
    await completeWithProvider(params);
    expect(mock.create.mock.calls.at(-1)?.[0].model).toBe('deepseek-v4-pro');
    expect((await publicAIModels()).models.find(m => m.active)?.id).toBe(id);
    expect(await aiCacheNamespace()).not.toBe(namespace);
  });
  it('persists sanitized 402 billing errors across refresh and does not run vision or activate', async () => {
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'deepseek', deepseekApiKey: 'secret-private-key' });
    mock.create.mockRejectedValueOnce({ status: 402, message: 'secret-private-key', headers: { authorization: 'secret-private-key' } });
    await testAIModel({ id: 'default-deepseek' });
    const result = await publicAIModels();
    expect(result.models.find(m => m.active)?.check).toMatchObject({ state: 'billing_error', httpStatus: 402, text: 'failed', vision: 'not_tested' });
    expect(mock.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain('secret-private-key');
    expect(JSON.stringify(result)).not.toContain('fingerprint');
    expect(mock.value).not.toContain('secret-private-key');
    await expect(activateAIModel({ id: 'default-deepseek' })).rejects.toThrow('successful');
  });
  it('distinguishes failed image support from a successful text test', async () => {
    mock.create.mockResolvedValueOnce({ choices: [{ message: { content: 'OK' } }] }).mockRejectedValueOnce({ status: 400 });
    await testAIModel({ id: 'default-openai' });
    const model = (await publicAIModels()).models.find(m => m.id === 'default-openai')!;
    expect(model.check).toMatchObject({ state: 'model_error', text: 'passed', vision: 'failed', httpStatus: 400 });
  });
  it('invalidates tests after shared API key changes, preserves blank keys and unrelated cards', async () => {
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'openai' });
    const added = await saveAIModel({ model: profile, apiKey: 'initial-key' });
    const saved = added.models.find(m => m.name === profile.name)!;
    const model = { ...profile, id: saved.id };
    await testAIModel({ id: saved.id });
    await testAIModel({ id: 'default-deepseek' });
    await saveAIModel({ model, apiKey: '' });
    expect((await publicAIModels()).models.find(m => m.id === saved.id)?.check.state).toBe('connected');
    await saveAIModel({ model, apiKey: 'replacement-key' });
    expect((await publicAIModels()).models.filter(m => m.provider === 'deepseek').every(m => m.check.state === 'untested')).toBe(true);
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'openai' });
    expect((await publicAIModels()).models.some(m => m.id === saved.id)).toBe(true);
    await saveAIKnowledge({ knowledgeSearch: 'keyword' });
    expect((await publicAIModels()).models.some(m => m.id === saved.id)).toBe(true);
  });
  it('rejects URLs, duplicate cards, active removal and stale connection tests', async () => {
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'openai' });
    await expect(saveAIModel({ model: { ...profile, textModel: 'https://localhost/private' } })).rejects.toThrow();
    await expect(saveAIModel({ model: { ...profile, textModel: 'deepseek-flash' } })).rejects.toThrow('already has a card');
    await expect(removeAIModel({ id: 'default-openai' })).rejects.toThrow('active model');
    await testAIModel({ id: 'default-openai' });
    const old = JSON.parse(mock.value!);
    old.checks['default-openai'].checkedAt = new Date(Date.now() - 90000000).toISOString();
    mock.value = JSON.stringify(old);
    expect((await publicAIModels()).models.find(m => m.id === 'default-openai')?.check.state).toBe('connected');
    await expect(activateAIModel({ id: 'default-openai' })).rejects.toThrow('successful');
    const added = await saveAIModel({ model: profile });
    const id = added.models.find(m => m.name === profile.name)!.id;
    await removeAIModel({ id });
    expect((await publicAIModels()).models.some(m => m.id === id)).toBe(false);
  });
  it('does not overwrite a model or activate it when settings change during a test', async () => {
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'openai' });
    let finish!: (v: any) => void;
    mock.create.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = testAIModel({ id: 'default-openai' });
    await vi.waitFor(() => expect(finish).toBeDefined());
    await saveAIModel({ model: { id: 'default-openai', name: 'OpenAI', provider: 'openai', textModel: 'gpt-4.1', visionModel: 'gpt-4.1', region: 'ap-southeast-1' } });
    finish({ choices: [{ message: { content: 'OK' } }] });
    await expect(pending).rejects.toThrow('changed during the test');
    expect((await publicAIModels()).models.find(m => m.active)?.check.state).toBe('untested');
  });
  it('protects every catalog mutation with admin authentication and same-origin checks', async () => {
    const app = express(); app.use(express.json());
    registerAIProviderRoutes(app, (req, res, next) => req.get('x-test-role') === 'admin' ? next() : void res.sendStatus(401));
    await request(app).get('/api/admin/ai-models').expect(401);
    for (const path of ['', '/test', '/activate', '/remove', '/knowledge']) {
      await request(app).post('/api/admin/ai-models' + path).send({ id: 'default-openai' }).expect(401);
      await request(app).post('/api/admin/ai-models' + path).set('x-test-role', 'admin').set('Origin', 'https://evil.test').send({ id: 'default-openai' }).expect(403);
    }
    expect(mock.value).toBeNull();
  });
});


describe('live request health', () => {
  async function configured() {
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'deepseek', deepseekApiKey: 'private-live-key' });
  }
  const active = async () => (await publicAIModels()).models.find(m => m.active)!;
  it('recovers from a stored 402 using a real success and preserves manual test history', async () => {
    await configured();
    mock.create.mockRejectedValueOnce({ status: 402, message: 'private-live-key' });
    await testAIModel({ id: 'default-deepseek' });
    const old = JSON.parse(mock.value!); old.checks['default-deepseek'].checkedAt = new Date(Date.now() - 1000).toISOString(); mock.value = JSON.stringify(old);
    const namespace = await aiCacheNamespace();
    await completeWithProvider(params);
    const model = await active();
    expect(model.check.state).toBe('billing_error');
    expect(currentAIStatus(model)).toMatchObject({ state: 'text_connected', text: 'passed', vision: 'not_tested' });
    expect(mock.create).toHaveBeenCalledTimes(2); // No extra billable health probe.
    expect(await aiCacheNamespace()).toBe(namespace);
    expect(JSON.stringify(model)).not.toContain('private-live-key');
    expect(JSON.stringify(model)).not.toContain('fingerprint');
    await expect(activateAIModel({ id: model.id })).rejects.toThrow('successful text and image test');
  });
  it('records new failures and recovers immediately without waiting for throttling', async () => {
    await configured(); await completeWithProvider(params);
    mock.create.mockRejectedValueOnce({ status: 402, message: 'private-live-key' });
    await expect(completeWithProvider(params)).rejects.toThrow('deepseek request failed (402)');
    expect(currentAIStatus(await active())).toMatchObject({ state: 'billing_error', httpStatus: 402 });
    await completeWithProvider(params);
    expect(currentAIStatus(await active()).state).toBe('text_connected');
  });
  it('does not certify empty replies or stream handshakes as successful responses', async () => {
    await configured(); mock.create.mockResolvedValueOnce({ choices: [] });
    await completeWithProvider(params);
    expect((await active()).liveCheck?.state).toBe('failed');
    const saved = mock.value;
    await completeWithProvider({ ...params, stream: true });
    expect(mock.value).toBe(saved);
  });
  it('throttles repeated observations and invalidates them when credentials change', async () => {
    await configured(); await completeWithProvider(params);
    const saved = mock.value;
    await completeWithProvider(params); expect(mock.value).toBe(saved);
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'deepseek', deepseekApiKey: 'new-key' });
    expect((await active()).liveCheck).toBeUndefined();
  });
  it('does not attach an in-flight response to a changed model configuration', async () => {
    await configured(); let finish!: (v: any) => void;
    mock.create.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = completeWithProvider(params);
    await vi.waitFor(() => expect(finish).toBeDefined());
    await saveAIConfig({ ...DEFAULT_AI_CONFIG, provider: 'deepseek', deepseekApiKey: 'replacement-key' });
    finish({ choices: [{ message: { content: 'OK' } }] }); await pending;
    expect((await active()).liveCheck).toBeUndefined();
  });
  it('does not let telemetry storage failure discard a successful reply', async () => {
    await configured();
    const { storage } = await import('../storage');
    vi.mocked(storage.setPlatformSetting).mockRejectedValueOnce(new Error('database unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await completeWithProvider(params)).choices[0].message.content).toBe('OK');
    expect(warn).toHaveBeenCalledWith('Unable to save AI request status'); warn.mockRestore();
  });
  it('expires historical failures and keeps a newer manual test authoritative', () => {
    const now = Date.now();
    const check = { state: 'billing_error' as const, message: 'Historical failure', text: 'failed' as const, vision: 'not_tested' as const, checkedAt: new Date(now - 3600000).toISOString() };
    expect(currentAIStatus({ check }, now).state).toBe('untested');
    const liveCheck = { ...check, state: 'text_connected' as const, checkedAt: new Date(now - 120000).toISOString() };
    expect(currentAIStatus({ check, liveCheck }, now).state).toBe('text_connected');
    expect(currentAIStatus({ check: { ...check, checkedAt: new Date(now).toISOString() }, liveCheck }, now).state).toBe('billing_error');
    expect(currentAIStatus({ check, liveCheck }, now + 3 * 86400000).state).toBe('text_connected');
    expect(currentAIStatus({ check: { ...check, state: 'connected', text: 'passed', vision: 'passed' } }, now + 3 * 86400000).state).toBe('connected');
  });
});
