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
