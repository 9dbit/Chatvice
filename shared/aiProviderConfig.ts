import { z } from 'zod';
export const AI_CONFIG_KEY = 'ai_provider_config_v1';
export const QWEN_REGIONS = ['ap-southeast-1', 'cn-beijing', 'eu-central-1', 'cn-hongkong', 'ap-northeast-1', 'us-east-1'] as const;
const model = z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9._:-]+$/);
const routerModel = z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, 'Use an OpenRouter model ID such as qwen/qwen3.8-flash');
export const aiConfigSchema = z.object({
  provider: z.enum(['openai', 'qwencloud', 'openrouter', 'deepseek']).default('qwencloud'),
  openaiTextModel: model.default('gpt-4.1-mini'),
  openaiVisionModel: model.default('gpt-4.1'),
  qwenTextModel: model.default('qwen-plus'),
  qwenVisionModel: model.default('qwen3-vl-plus'),
  qwenRegion: z.enum(QWEN_REGIONS).default('ap-southeast-1'),
  openrouterTextModel: routerModel.default('qwen/qwen3.8-flash'),
  openrouterVisionModel: routerModel.default('qwen/qwen3.8-flash'),
  deepseekTextModel: model.default('deepseek-flash'),
  deepseekVisionModel: model.default('deepseek-flash'),
  knowledgeSearch: z.enum(['openai', 'keyword']).default('keyword'),
}).strict();
export type AIProviderConfig = z.infer<typeof aiConfigSchema>;
export const DEFAULT_AI_CONFIG = aiConfigSchema.parse({});
export const aiConfigUpdateSchema = aiConfigSchema.extend({
  openaiApiKey: z.string().trim().max(512).optional(),
  qwenApiKey: z.string().trim().max(512).optional(),
  openrouterApiKey: z.string().trim().max(512).optional(),
  deepseekApiKey: z.string().trim().max(512).optional(),
}).strict();
export function qwenBaseURL(region: AIProviderConfig['qwenRegion']) {
  return `https://${region}.maas.qwencloudapi.com/compatible-mode/v1`;
}

export const AI_PROVIDERS = {
  openai: { label: 'OpenAI', text: 'openaiTextModel', vision: 'openaiVisionModel', key: 'openaiApiKey', billing: 'https://platform.openai.com/settings/organization/billing/overview' },
  qwencloud: { label: 'QwenCloud', text: 'qwenTextModel', vision: 'qwenVisionModel', key: 'qwenApiKey', billing: 'https://home.qwencloud.com/' },
  openrouter: { label: 'OpenRouter', text: 'openrouterTextModel', vision: 'openrouterVisionModel', key: 'openrouterApiKey', billing: 'https://openrouter.ai/settings/credits' },
  deepseek: { label: 'DeepSeek', text: 'deepseekTextModel', vision: 'deepseekVisionModel', key: 'deepseekApiKey', billing: 'https://platform.deepseek.com/' },
} as const;
export const aiModelSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(80),
  provider: aiConfigSchema.shape.provider.removeDefault(),
  textModel: z.string().trim().min(1).max(160),
  visionModel: z.string().trim().min(1).max(160),
  region: z.enum(QWEN_REGIONS).default('ap-southeast-1'),
}).strict().superRefine((value, ctx) => {
  const schema = value.provider === 'openrouter' ? routerModel : model;
  for (const field of ['textModel', 'visionModel'] as const) {
    if (!schema.safeParse(value[field]).success) ctx.addIssue({ code: 'custom', path: [field], message: 'Enter a valid model ID for this provider' });
  }
});
export type AIModelProfile = z.infer<typeof aiModelSchema>;
export type AIConnectionState = 'connected' | 'text_connected' | 'image_connected' | 'missing_key' | 'untested' | 'billing_error' | 'auth_error' | 'model_error' | 'rate_limited' | 'unavailable' | 'failed';
export type AIModelCheck = {
  state: AIConnectionState;
  message: string;
  checkedAt?: string;
  latencyMs?: number;
  httpStatus?: number;
  text: 'passed' | 'failed' | 'not_tested';
  vision: 'passed' | 'failed' | 'not_tested';
};
export type PublicAIModel = AIModelProfile & { active: boolean; keyConfigured: boolean; check: AIModelCheck; liveCheck?: AIModelCheck };
export function isAIConnected(check: AIModelCheck): boolean {
  return ['connected', 'text_connected', 'image_connected'].includes(check.state);
}
// Activation requires a recent full test; displaying an established connection
// does not. A newer request or a configuration/key change can replace it.
export function canActivateAIModel(check: AIModelCheck, now = Date.now()): boolean {
  const age = now - Date.parse(check.checkedAt || '');
  return check.state === 'connected' && Number.isFinite(age) && age <= 86400000;
}
// Historical failures are not current balance measurements. Keep their details
// in test history, without claiming an unverified connection has recovered.
export function currentAIStatus(model: Pick<PublicAIModel, 'check' | 'liveCheck'>, now = Date.now()): AIModelCheck {
  const manual = model.check;
  const live = model.liveCheck;
  const useLive = live && Date.parse(live.checkedAt || '') >= (Date.parse(manual.checkedAt || '') || 0);
  const latest = useLive ? live : manual;
  const age = now - Date.parse(latest.checkedAt || '');
  if (!isAIConnected(latest) && latest.checkedAt && (!Number.isFinite(age) || age > 900000)) {
    return { state: 'untested', message: 'Run a connection test to verify this model.', text: 'not_tested', vision: 'not_tested' };
  }
  return latest;
}
export type AIModelCatalog = {
  models: PublicAIModel[];
  knowledgeSearch: AIProviderConfig['knowledgeSearch'];
  encryptionReady: boolean;
};
