import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DEFAULT_AI_CONFIG, QWEN_REGIONS, type AIProviderConfig } from '@shared/aiProviderConfig';

type PublicConfig = AIProviderConfig & { openaiKeyConfigured: boolean; qwenKeyConfigured: boolean; encryptionReady: boolean };
export function AdminAIProvider() {
  const { data, isLoading, error } = useQuery<PublicConfig>({ queryKey: ['/api/admin/ai-provider'] });
  const [config, setConfig] = useState<AIProviderConfig>(DEFAULT_AI_CONFIG);
  const [openaiApiKey, setOpenaiKey] = useState('');
  const [qwenApiKey, setQwenKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (data) {
    const { openaiKeyConfigured, qwenKeyConfigured, encryptionReady, ...settings } = data;
    setConfig(settings);
  } }, [data]);
  const change = (key: keyof AIProviderConfig, value: string) => { setConfig(c => ({ ...c, [key]: value })); setMessage(''); };
  async function submit(test: boolean) {
    setBusy(true); setMessage('');
    try {
      const response = await apiRequest('POST', `/api/admin/ai-provider${test ? '/test' : ''}`, { ...config, openaiApiKey, qwenApiKey });
      const result = await response.json();
      if (test) setMessage(`Text and vision connection passed (${result.latencyMs} ms). Settings have not been saved.`);
      else {
        setOpenaiKey(''); setQwenKey('');
        queryClient.setQueryData(['/api/admin/ai-provider'], result);
        setMessage('Saved. New AI requests now use the selected provider.');
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to save AI settings'); }
    finally { setBusy(false); }
  }
  return <Card>
    <CardHeader><CardTitle>AI Provider &amp; Models</CardTitle>
      <CardDescription>Choose OpenAI or QwenCloud manually for chat, image understanding, translation and AI content across Chatvice.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {error && <p role="alert">Unable to load AI settings. Reload before editing.</p>}
      {data && !(data.provider === 'qwencloud' ? data.qwenKeyConfigured : data.openaiKeyConfigured) && <p role="alert" className="text-amber-600">The selected provider needs an API key before AI replies can work. Enter its key below and test the connection.</p>}
      <fieldset disabled={busy || isLoading || !!error} className="space-y-4 disabled:opacity-60">
        <div><Label htmlFor="ai-provider">Active provider</Label><select id="ai-provider" className="w-full rounded-md border bg-background p-2" value={config.provider} onChange={e => change('provider', e.target.value)}>
          <option value="openai">OpenAI</option><option value="qwencloud">QwenCloud</option>
        </select><p className="text-xs text-muted-foreground mt-1">Switching applies platform-wide. Messages and knowledge context will be sent to the selected provider. No automatic fallback.</p></div>
        {config.provider === 'qwencloud' && <div><Label htmlFor="ai-region">QwenCloud region</Label><select id="ai-region" className="w-full rounded-md border bg-background p-2" value={config.qwenRegion} onChange={e => change('qwenRegion', e.target.value)}>{QWEN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select><p className="text-xs text-muted-foreground">Use a pay-as-you-go API key from the same region.</p></div>}
        {(config.provider === 'openai' ? [['openaiTextModel', 'Text / chat model'], ['openaiVisionModel', 'Image understanding model']] : [['qwenTextModel', 'Text / chat model'], ['qwenVisionModel', 'Image understanding model']]).map(([key, label]) => <div key={key}><Label htmlFor={key}>{label}</Label><Input id={key} value={config[key as keyof AIProviderConfig]} onChange={e => change(key as keyof AIProviderConfig, e.target.value)} /></div>)}
        <p className="text-xs text-muted-foreground">Enter an exact model ID enabled in your provider account. Qwen examples: qwen-plus for chat, qwen3-vl-plus for images. Test both models before switching.</p>
        <div><Label htmlFor="ai-key">{config.provider === 'openai' ? 'OpenAI' : 'QwenCloud'} API key</Label>
          <Input id="ai-key" type="password" autoComplete="new-password" disabled={!data?.encryptionReady} value={config.provider === 'openai' ? openaiApiKey : qwenApiKey} onChange={e => config.provider === 'openai' ? setOpenaiKey(e.target.value) : setQwenKey(e.target.value)} placeholder="Leave blank to keep the existing key" />
          <p className="text-xs text-muted-foreground">{(config.provider === 'openai' ? data?.openaiKeyConfigured : data?.qwenKeyConfigured) ? 'Key configured.' : 'Key not configured.'} Keys are encrypted when saved and never displayed again. Server variables OPENAI_API_KEY / QWENCLOUD_API_KEY are also supported.</p>
          {data && !data.encryptionReady && <p role="alert">Set AI_SETTINGS_ENCRYPTION_KEY or SESSION_SECRET (32+ characters) on the server to store keys here.</p>}
        </div>
        <div><Label htmlFor="knowledge-search">Knowledge retrieval</Label><select id="knowledge-search" className="w-full rounded-md border bg-background p-2" value={config.knowledgeSearch} onChange={e => change('knowledgeSearch', e.target.value)}><option value="openai">OpenAI embeddings + keyword fallback</option><option value="keyword">Keyword search — no embedding API required</option></select><p className="text-xs text-muted-foreground">Choose keyword search if OpenAI credit is unavailable. Existing vectors are preserved; Qwen embeddings are not mixed with OpenAI vectors. Image generation continues to use the existing Gemini service.</p></div>
        <p className="text-xs text-muted-foreground">Qwen token counts are recorded; Qwen costs are currently excluded from the OpenAI cost estimate.</p>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => submit(true)}>Test text &amp; vision</Button><Button onClick={() => submit(false)}>Save AI settings</Button></div>
      </fieldset>
      <p role="status" aria-live="polite">{busy ? 'Processing…' : message}</p>
    </CardContent>
  </Card>;
}
