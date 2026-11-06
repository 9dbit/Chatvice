import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Bot, Check, CircleAlert, Loader2, Pencil, Play, Radio, Trash2, KeyRound, ArrowUpRight, Image, MessageSquare, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AI_PROVIDERS, QWEN_REGIONS, aiModelSchema, currentAIStatus, type AIModelCatalog, type AIModelProfile, type AIModelCheck, type PublicAIModel } from '@shared/aiProviderConfig';

const QUERY = ['/api/admin/ai-models'];
const STATUS: Record<AIModelCheck['state'], { label: string; color: string }> = {
  connected: { label: 'Connected', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  text_connected: { label: 'Text responding', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  image_connected: { label: 'Image responding', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  stale: { label: 'Status outdated', color: 'bg-muted text-muted-foreground' },
  untested: { label: 'Not tested', color: 'bg-muted text-muted-foreground' },
  missing_key: { label: 'API key needed', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  billing_error: { label: 'Insufficient balance', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  auth_error: { label: 'Access / key error', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  model_error: { label: 'Model error', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  rate_limited: { label: 'Rate limit / quota', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  unavailable: { label: 'Provider unavailable', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  failed: { label: 'Connection failed', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
};
const BRAND = { openai: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', qwencloud: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', openrouter: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', deepseek: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' };
const selectClass = 'w-full rounded-xl border bg-background px-3 py-2.5 text-sm';
function Status({ check, testing = false }: { check: AIModelCheck; testing?: boolean }) {
  const status = STATUS[check.state];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${testing ? 'bg-primary/10 text-primary' : status.color}`}>
    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : check.state === 'connected' ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {testing ? 'Testing connection…' : status.label}
  </span>;
}
function Outcome({ label, value }: { label: string; value: AIModelCheck['text'] }) {
  return <span className="inline-flex items-center gap-1.5">{value === 'passed' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : value === 'failed' ? <CircleAlert className="h-3.5 w-3.5 text-red-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />} {label}: {value === 'not_tested' ? 'not tested' : value}</span>;
}
function cleanModel(model: AIModelProfile): AIModelProfile {
  return { id: model.id, name: model.name, provider: model.provider, textModel: model.textModel, visionModel: model.visionModel, region: model.region };
}
export function AdminAIProvider() {
  const client = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery<AIModelCatalog>({ queryKey: QUERY, staleTime: 0, refetchInterval: 30000, refetchOnWindowFocus: true });
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const [draft, setDraft] = useState<AIModelProfile | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [formError, setFormError] = useState('');
  const [removeId, setRemoveId] = useState('');
  const [knowledge, setKnowledge] = useState<AIModelCatalog['knowledgeSearch']>('keyword');
  useEffect(() => { if (data) setKnowledge(data.knowledgeSearch); }, [data?.knowledgeSearch]);
  const models = data?.models.map(model => ({ ...model, status: currentAIStatus(model, now) }));
  const active = models?.find(m => m.active);
  const editingActive = !!draft && data?.models.some(m => m.id === draft.id && m.active);
  const providerHasKey = !!draft && data?.models.some(m => m.provider === draft.provider && m.keyConfigured);
  async function perform(action: string, body: unknown, busyId: string, success: string) {
    setBusy(busyId); setNotice(undefined);
    try {
      const response = await apiRequest('POST', `/api/admin/ai-models${action}`, body);
      const catalog: AIModelCatalog = await response.json();
      client.setQueryData(QUERY, catalog);
      if (action === '/test') {
        const checked = catalog.models.find(m => m.id === (body as { id: string }).id);
        setNotice({ text: checked?.check.message || 'Test completed.', error: checked?.check.state !== 'connected' });
      } else setNotice({ text: success });
      return true;
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Unable to update AI models. Please retry.';
      setNotice({ text, error: true }); setFormError(text); return false;
    } finally { setBusy(''); }
  }
  function edit(model?: PublicAIModel) {
    setDraft(model ? cleanModel(model) : { id: 'new', name: '', provider: 'openrouter', textModel: '', visionModel: '', region: 'ap-southeast-1' });
    setApiKey(''); setFormError('');
  }
  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const parsed = aiModelSchema.safeParse(draft);
    if (!parsed.success) { setFormError(parsed.error.issues.map(i => `${i.path.join(' ')}: ${i.message}`).join('. ')); return; }
    if (await perform('', { model: parsed.data, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }, 'save', editingActive ? 'Active model settings saved. Test the connection to verify any changes.' : 'Model saved. Test its connection before activating.')) {
      setDraft(null); setApiKey('');
    }
  }
  return <section aria-labelledby="ai-models-heading" className="space-y-5" id="ai-models">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">AI control center</div>
        <h2 id="ai-models-heading" className="text-2xl font-semibold tracking-tight">AI models</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Manage your models, check their connections and choose which one powers Chatvice.</p>
      </div>
      <div className="flex gap-2"><Button variant="ghost" size="icon" aria-label="Refresh model status" disabled={!!busy || isLoading} onClick={() => refetch()} className="rounded-full"><RefreshCw className="h-4 w-4" /></Button>
        <Button className="gap-2 rounded-full px-5" disabled={!!busy || !data || !!error} onClick={() => edit()}><Plus className="h-4 w-4" />Add model</Button></div>
    </div>
    {isLoading && <div role="status" className="flex items-center gap-2 rounded-2xl bg-muted/40 p-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading AI models…</div>}
    {error && <p role="alert" className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">Unable to load AI models. Refresh before editing.</p>}
    {active && <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 ${['connected', 'text_connected', 'image_connected', 'untested', 'stale'].includes(active.status.state) ? 'bg-primary/5' : 'bg-red-500/5'}`}>
      <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Radio className="h-5 w-5" /></div>
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">ACTIVE FOR CHATVICE</p><p className="mt-0.5 break-words font-semibold">{active.name} <span className="font-normal text-muted-foreground">· {active.name === AI_PROVIDERS[active.provider].label ? active.textModel : AI_PROVIDERS[active.provider].label}</span></p>
          <p className="mt-1 text-xs text-muted-foreground">{active.status.message} No automatic fallback.</p>
        </div></div><Status check={active.status} testing={busy === `test:${active.id}`} />
    </div>}
    {notice && <p role={notice.error ? 'alert' : 'status'} aria-live="polite" className={`rounded-xl px-4 py-3 text-sm ${notice.error ? 'bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}`}>{notice.text}</p>}
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {models?.slice().sort((a, b) => Number(b.active) - Number(a.active)).map(model => <Card key={model.id} aria-label={`${model.name} model`} className={`min-w-0 rounded-2xl shadow-none ${model.active ? 'border-primary/60 ring-1 ring-primary/15' : 'border-border/60'}`}>
        <CardContent className="flex h-full flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className={`rounded-xl p-3 ${BRAND[model.provider]}`}><Bot className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-xs text-muted-foreground">{AI_PROVIDERS[model.provider].label}</p><h3 className="break-words font-semibold">{model.name}</h3></div></div>
            {model.active && <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">Active</span>}
          </div>
          <div className="space-y-3 rounded-xl bg-muted/40 p-3.5 text-sm">
            <div className="flex items-start gap-2"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Chat model</p><p className="break-all font-mono text-xs">{model.textModel}</p></div></div>
            <div className="flex items-start gap-2"><Image className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Image understanding</p><p className="break-all font-mono text-xs">{model.visionModel}</p></div></div>
            {model.provider === 'qwencloud' && <p className="text-xs text-muted-foreground">Region: {model.region}</p>}
          </div>
          <div className="flex-1 space-y-2"><Status check={model.status} testing={busy === `test:${model.id}`} />
            <p className="text-sm text-muted-foreground">{model.status.message}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><Outcome label="Text" value={model.status.text} /><Outcome label="Image" value={model.status.vision} /></div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><KeyRound className="h-3 w-3" />{model.keyConfigured ? 'API key saved' : 'No API key'}</p>
            <p className="text-xs text-muted-foreground">{model.status.checkedAt ? `Status observed ${new Date(model.status.checkedAt).toLocaleString()}${model.status.latencyMs !== undefined ? ` · ${(model.status.latencyMs / 1000).toFixed(1)}s` : ''}${model.status.httpStatus ? ` · HTTP ${model.status.httpStatus}` : ''}` : 'No connection result yet'}</p>
            {['billing_error', 'rate_limited'].includes(model.status.state) && <a href={AI_PROVIDERS[model.provider].billing} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary">Open provider billing<ArrowUpRight className="h-3.5 w-3.5" /></a>}
            {model.check.checkedAt && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Last manual test · {new Date(model.check.checkedAt).toLocaleString()}</summary><p className="mt-2">Historical result: {model.check.message}{model.check.httpStatus ? ` (HTTP ${model.check.httpStatus})` : ''}</p></details>}
          </div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" className="gap-1.5 rounded-full" disabled={!!busy} onClick={() => edit(model)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
            <Button size="sm" variant="outline" className="gap-1.5 rounded-full" disabled={!!busy || !model.keyConfigured} onClick={() => perform('/test', { id: model.id }, `test:${model.id}`, '')}>{busy === `test:${model.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Test connection</Button>
            {!model.active && <Button size="sm" className="rounded-full" disabled={!!busy || model.check.state !== 'connected'} title={model.check.state !== 'connected' ? 'Pass a connection test before activating' : undefined} onClick={() => perform('/activate', { id: model.id }, `activate:${model.id}`, `${model.name} is now active for new Chatvice requests.`)}>Set active</Button>}
            {!model.active && <Button size="icon" variant="ghost" className="ml-auto h-8 w-8 rounded-full text-muted-foreground" aria-label={`Remove ${model.name}`} disabled={!!busy} onClick={() => setRemoveId(model.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
          </div>
        </CardContent>
      </Card>)}
    </div>
    {data && <details className="rounded-2xl bg-muted/30 p-4"><summary className="cursor-pointer text-sm font-medium">Knowledge & usage settings</summary>
      <div className="mt-4 space-y-3"><div className="max-w-xl"><Label htmlFor="knowledge-search">Knowledge retrieval</Label><select id="knowledge-search" className={`${selectClass} mt-1`} value={knowledge} onChange={e => setKnowledge(e.target.value as typeof knowledge)}><option value="keyword">Keyword search — no embedding API required</option><option value="openai">OpenAI embeddings + keyword fallback</option></select></div>
        <Button size="sm" variant="outline" className="rounded-full" disabled={!!busy || knowledge === data.knowledgeSearch} onClick={() => perform('/knowledge', { knowledgeSearch: knowledge }, 'knowledge', 'Knowledge retrieval updated.')}>Save knowledge settings</Button>
        <p className="max-w-3xl text-xs text-muted-foreground">API keys are shared by models from the same provider and encrypted when saved. Status follows actual provider requests and manual tests, refreshing every 30 seconds. Old results are marked outdated. Cached or fallback replies do not count as provider recovery. Tests use a small amount of API credit. Model activation applies platform-wide.</p>
        <p className="max-w-3xl text-xs text-muted-foreground">Existing knowledge vectors are preserved. Image generation continues to use Gemini. Token counts are recorded; check provider billing for charges outside the dashboard’s OpenAI price list.</p>
      </div></details>}
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !busy) { setDraft(null); setApiKey(''); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl"><DialogHeader><DialogTitle>{draft?.id === 'new' ? 'Add model' : 'Edit model'}</DialogTitle><DialogDescription>Enter the model IDs from your provider. You can keep several models from the same provider.</DialogDescription></DialogHeader>
        {draft && <form onSubmit={saveDraft} className="space-y-4"><fieldset disabled={!!busy} className="space-y-4 disabled:opacity-60">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><Label htmlFor="model-name">Display name</Label><Input className="mt-1 rounded-xl" id="model-name" required maxLength={80} placeholder="e.g. DeepSeek Flash" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
            <div><Label htmlFor="model-provider">Provider</Label><select id="model-provider" className={`${selectClass} mt-1`} value={draft.provider} onChange={e => setDraft({ ...draft, provider: e.target.value as AIModelProfile['provider'], textModel: '', visionModel: '' })}>{Object.entries(AI_PROVIDERS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></div></div>
          <div><Label htmlFor="model-text">Chat model ID</Label><Input className="mt-1 rounded-xl font-mono text-sm" id="model-text" required value={draft.textModel} placeholder={draft.provider === 'openrouter' ? 'provider/model-name' : 'Exact model ID'} onChange={e => setDraft({ ...draft, textModel: e.target.value })} /></div>
          <div><Label htmlFor="model-vision">Image model ID</Label><Input className="mt-1 rounded-xl font-mono text-sm" id="model-vision" required value={draft.visionModel} placeholder="A model that supports image input" onChange={e => setDraft({ ...draft, visionModel: e.target.value })} /><p className="mt-1 text-xs text-muted-foreground">Use the same ID if it supports both text and images, or choose a separate image model from this provider.</p></div>
          {draft.provider === 'openrouter' && <a className="inline-flex items-center gap-1 text-sm text-primary" href="https://openrouter.ai/models" target="_blank" rel="noreferrer">Browse model IDs<ArrowUpRight className="h-3.5 w-3.5" /></a>}
          {draft.provider === 'qwencloud' && <div><Label htmlFor="model-region">QwenCloud region</Label><select id="model-region" className={`${selectClass} mt-1`} value={draft.region} onChange={e => setDraft({ ...draft, region: e.target.value as AIModelProfile['region'] })}>{QWEN_REGIONS.map(r => <option key={r}>{r}</option>)}</select><p className="mt-1 text-xs text-muted-foreground">The shared QwenCloud API key must match this region.</p></div>}
          <div><Label htmlFor="model-key">{AI_PROVIDERS[draft.provider].label} API key</Label><Input className="mt-1 rounded-xl" id="model-key" type="password" autoComplete="new-password" disabled={!data?.encryptionReady} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={providerHasKey ? 'Leave blank to keep the saved key' : 'Enter API key, or add it later'} /><p className="mt-1 text-xs text-muted-foreground">{providerHasKey ? 'A key is already saved for this provider. ' : ''}Replacing this key updates all models from this provider.</p>{!data?.encryptionReady && <p role="alert" className="mt-1 text-xs text-amber-600">API key storage is unavailable. Configure server encryption first.</p>}</div>
          {editingActive && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">This model is active. Saved changes apply to new requests immediately. Test again after changing its connection settings.</p>}
          {formError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" className="rounded-full" onClick={() => { setDraft(null); setApiKey(''); }}>Cancel</Button><Button type="submit" className="gap-2 rounded-full">{busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />}{editingActive ? 'Save changes' : 'Save model'}</Button></div>
        </fieldset></form>}
      </DialogContent>
    </Dialog>
    <Dialog open={!!removeId} onOpenChange={open => { if (!open && !busy) setRemoveId(''); }}><DialogContent className="rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>Remove model?</DialogTitle><DialogDescription>This removes the saved model card. The provider API key is kept for your other models.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" className="rounded-full" disabled={!!busy} onClick={() => setRemoveId('')}>Cancel</Button><Button variant="destructive" className="rounded-full" disabled={!!busy} onClick={async () => { if (await perform('/remove', { id: removeId }, 'remove', 'Model removed.')) setRemoveId(''); }}>Remove model</Button></div></DialogContent></Dialog>
  </section>;
}
