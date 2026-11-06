import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DEFAULT_AI_CONFIG, QWEN_REGIONS, type AIProviderConfig } from '@shared/aiProviderConfig';

type PublicConfig = AIProviderConfig & { openaiKeyConfigured: boolean; qwenKeyConfigured: boolean; openrouterKeyConfigured: boolean; deepseekKeyConfigured: boolean; encryptionReady: boolean };
const EMPTY_API_KEYS = { openaiApiKey: '', qwenApiKey: '', openrouterApiKey: '', deepseekApiKey: '' };
const PROVIDERS = {
  openai: { label: 'OpenAI', key: 'openaiApiKey', configured: 'openaiKeyConfigured', env: 'OPENAI_API_KEY', text: 'openaiTextModel', vision: 'openaiVisionModel', hint: 'Use the exact model IDs available in your OpenAI account.' },
  qwencloud: { label: 'QwenCloud', key: 'qwenApiKey', configured: 'qwenKeyConfigured', env: 'QWENCLOUD_API_KEY', text: 'qwenTextModel', vision: 'qwenVisionModel', hint: 'For example, qwen3.8-flash supports both chat and image understanding. Use a pay-as-you-go key from the selected region.' },
  openrouter: { label: 'OpenRouter', key: 'openrouterApiKey', configured: 'openrouterKeyConfigured', env: 'OPENROUTER_API_KEY', text: 'openrouterTextModel', vision: 'openrouterVisionModel', hint: 'Use provider/model IDs, for example qwen/qwen3.8-flash for both chat and images. Use an OpenRouter API key and credits. Choose a model with image support for image understanding.' },
  deepseek: { label: 'DeepSeek', key: 'deepseekApiKey', configured: 'deepseekKeyConfigured', env: 'DEEPSEEK_API_KEY', text: 'deepseekTextModel', vision: 'deepseekVisionModel', hint: 'deepseek-flash supports chat and images. deepseek-v4-pro can be used for text only; keep deepseek-flash for image understanding.' },
} as const;
export function AdminAIProvider() {
  const { data, isLoading, error } = useQuery<PublicConfig>({ queryKey: ['/api/admin/ai-provider'] });
  const [config, setConfig] = useState<AIProviderConfig>(DEFAULT_AI_CONFIG);
  const [apiKeys, setApiKeys] = useState(EMPTY_API_KEYS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (data) {
    const { openaiKeyConfigured, qwenKeyConfigured, openrouterKeyConfigured, deepseekKeyConfigured, encryptionReady, ...settings } = data;
    setConfig(settings);
  } }, [data]);
  const selected = PROVIDERS[config.provider];
  const change = (key: keyof AIProviderConfig, value: string) => { setConfig(c => ({ ...c, [key]: value })); setMessage(''); };
  async function submit(test: boolean) {
    setBusy(true); setMessage('');
    try {
      const response = await apiRequest('POST', `/api/admin/ai-provider${test ? '/test' : ''}`, { ...config, ...apiKeys });
      const result = await response.json();
      if (test) setMessage(`Text and vision connection passed (${result.latencyMs} ms). Settings have not been saved.`);
      else {
        setApiKeys(EMPTY_API_KEYS);
        queryClient.setQueryData(['/api/admin/ai-provider'], result);
        setMessage('Saved. New AI requests now use the selected provider.');
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to save AI settings'); }
    finally { setBusy(false); }
  }
  return <Card>
    <CardHeader><CardTitle>AI Provider &amp; Models</CardTitle>
      <CardDescription>Choose OpenAI, QwenCloud, OpenRouter or DeepSeek for chat, image understanding, translation and AI content across Chatvice.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {error && <p role="alert">Unable to load AI settings. Reload before editing.</p>}
      {data && !data[selected.configured] && <p role="alert" className="text-amber-600">{selected.label} needs an API key before AI replies can work. Enter its key below and test the connection.</p>}
      <fieldset disabled={busy || isLoading || !!error} className="space-y-4 disabled:opacity-60">
        <div><Label htmlFor="ai-provider">Active provider</Label><select id="ai-provider" className="w-full rounded-md border bg-background p-2" value={config.provider} onChange={e => change('provider', e.target.value)}>
          {Object.entries(PROVIDERS).map(([value, provider]) => <option key={value} value={value}>{provider.label}</option>)}
        </select><p className="text-xs text-muted-foreground mt-1">Switching applies platform-wide. Messages and knowledge context will be sent to the selected provider. No automatic fallback.</p></div>
        {config.provider === 'qwencloud' && <div><Label htmlFor="ai-region">QwenCloud region</Label><select id="ai-region" className="w-full rounded-md border bg-background p-2" value={config.qwenRegion} onChange={e => change('qwenRegion', e.target.value)}>{QWEN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select><p className="text-xs text-muted-foreground">Use a pay-as-you-go API key from the same region.</p></div>}
        {([[selected.text, 'Text / chat model'], [selected.vision, 'Image understanding model']] as const).map(([key, label]) => <div key={key}><Label htmlFor={key}>{label}</Label><Input id={key} value={config[key]} onChange={e => change(key, e.target.value)} /></div>)}
        <p className="text-xs text-muted-foreground">{selected.hint}</p>
        {config.provider === 'openrouter' && <a className="text-sm underline" href="https://openrouter.ai/models" target="_blank" rel="noreferrer">Browse OpenRouter models</a>}
        <div><Label htmlFor="ai-key">{selected.label} API key</Label>
          <Input id="ai-key" type="password" autoComplete="new-password" disabled={!data?.encryptionReady} value={apiKeys[selected.key]} onChange={e => { setApiKeys(keys => ({ ...keys, [selected.key]: e.target.value })); setMessage(''); }} placeholder="Leave blank to keep the existing key" />
          <p className="text-xs text-muted-foreground">{data?.[selected.configured] ? 'Key configured.' : 'Key not configured.'} Keys are encrypted when saved and never displayed again. The server variable {selected.env} is also supported.</p>
          {data && !data.encryptionReady && <p role="alert">Set AI_SETTINGS_ENCRYPTION_KEY or SESSION_SECRET (32+ characters) on the server to store keys here.</p>}
        </div>
        <div><Label htmlFor="knowledge-search">Knowledge retrieval</Label><select id="knowledge-search" className="w-full rounded-md border bg-background p-2" value={config.knowledgeSearch} onChange={e => change('knowledgeSearch', e.target.value)}><option value="openai">OpenAI embeddings + keyword fallback</option><option value="keyword">Keyword search — no embedding API required</option></select><p className="text-xs text-muted-foreground">Choose keyword search if OpenAI credit is unavailable. Existing vectors are preserved; Qwen embeddings are not mixed with OpenAI vectors. Image generation continues to use the existing Gemini service.</p></div>
        <p className="text-xs text-muted-foreground">Test text &amp; vision checks these settings without changing the live provider. Save AI settings activates them for new requests. QwenCloud, OpenRouter and DeepSeek use non-thinking mode where supported.</p>
        <p className="text-xs text-muted-foreground">Token counts are recorded. Costs for models outside the OpenAI price list are not included in the dashboard estimate; check your provider's billing for actual charges.</p>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => submit(true)}>Test text &amp; vision</Button><Button onClick={() => submit(false)}>Save AI settings</Button></div>
      </fieldset>
      <p role="status" aria-live="polite">{busy ? 'Processing…' : message}</p>
    </CardContent>
  </Card>;
}
