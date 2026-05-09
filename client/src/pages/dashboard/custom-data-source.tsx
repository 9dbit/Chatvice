import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Database, Key, RefreshCw, Plug, Plus, Trash2, Pencil, Download, FileText, CheckCircle2, AlertCircle, Loader2, Copy, ArrowLeft, ArrowRight, Sparkles, Wand2, ClipboardList, Activity, HeartPulse } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";

interface CustomDataSource {
  id: string;
  merchantId: string;
  name: string;
  baseUrl: string;
  apiKeyHint: string | null;
  headerAuthName: string;
  healthPath: string;
  cacheTtlSec: number;
  rateLimitPerMin: number;
  isEnabled: boolean;
  healthMonitorEnabled?: boolean;
  lastHealthStatus?: "up" | "degraded" | "down" | "unknown" | null;
  lastHealthCheckAt?: string | null;
  lastHealthLatencyMs?: number | null;
  lastHealthError?: string | null;
}

interface HealthSummary {
  status: "up" | "degraded" | "down" | "unknown";
  errorRatePct: number;
  totalPings: number;
  successPings: number;
  lastCheckedAt: string | null;
  lastLatencyMs: number | null;
  lastError: string | null;
  monitorEnabled: boolean;
}

interface RequiredField {
  key: string;
  label: string;
  required: boolean;
}

interface CustomDataIntent {
  id: string;
  sourceId: string;
  intentKey: string;
  name: string;
  description: string;
  triggerKeywords: string;
  httpMethod: string;
  endpointPath: string;
  requiredFields: RequiredField[];
  responseTemplate: string;
  isEnabled: boolean;
  sortOrder: number;
}

interface AuditRow {
  id: string;
  intentKey: string;
  endpointUrl: string;
  httpStatus: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
  maskedFields: Record<string, string> | null;
  createdAt: string;
}

const blankIntent = (): Partial<CustomDataIntent> => ({
  intentKey: "",
  name: "",
  description: "",
  triggerKeywords: "",
  httpMethod: "GET",
  endpointPath: "",
  requiredFields: [],
  responseTemplate: "",
  isEnabled: true,
  sortOrder: 0,
});

export default function CustomDataSourcePage() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const localeMap: Record<string, string> = { id: "id-ID", en: "en-US" };
  const dateLocale = localeMap[language] || "en-US";
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newPlainKey, setNewPlainKey] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState<boolean | null>(null);
  const [wizardDialogOpen, setWizardDialogOpen] = useState(false);
  const [intentDialogOpen, setIntentDialogOpen] = useState(false);
  const [editingIntent, setEditingIntent] = useState<Partial<CustomDataIntent> | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; status: number; latencyMs: number; sample?: string; error?: string } | null>(null);

  const { data: source, isLoading: srcLoading } = useQuery<CustomDataSource | null>({
    queryKey: ["/api/merchant/custom-data-source"],
  });
  const { data: intents = [] } = useQuery<CustomDataIntent[]>({
    queryKey: ["/api/merchant/custom-data-intents"],
  });
  const { data: audit = [] } = useQuery<AuditRow[]>({
    queryKey: ["/api/merchant/custom-data-source/audit"],
  });
  const { data: health } = useQuery<HealthSummary | null>({
    queryKey: ["/api/merchant/custom-data-source/health"],
    enabled: !!source,
    refetchInterval: 30_000,
  });
  const refreshHealth = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/custom-data-source/health/refresh");
      return res.json() as Promise<HealthSummary | null>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source/health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source"] });
    },
  });

  const [form, setForm] = useState<Partial<CustomDataSource>>({});
  const merged: Partial<CustomDataSource> = { ...(source || {}), ...form };

  // Audit filters
  const [auditIntentFilter, setAuditIntentFilter] = useState<string>("all");
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>("all");
  const filteredAudit = audit.filter(a => {
    if (auditIntentFilter !== "all" && a.intentKey !== auditIntentFilter) return false;
    if (auditStatusFilter === "success" && !(a.httpStatus && a.httpStatus >= 200 && a.httpStatus < 300)) return false;
    if (auditStatusFilter === "error" && a.httpStatus && a.httpStatus >= 200 && a.httpStatus < 300) return false;
    return true;
  });

  const saveSource = useMutation({
    mutationFn: async (data: Partial<CustomDataSource>) => {
      const res = await apiRequest("PUT", "/api/merchant/custom-data-source", data);
      return res.json() as Promise<CustomDataSource & { apiKey?: string }>;
    },
    onSuccess: (data) => {
      toast({ title: t("dashboard.customDataSource.settings.saved"), description: t("dashboard.customDataSource.settings.savedDesc") });
      setForm({});
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-intents"] });
      // Backend returns `apiKey` exactly once on first creation — show it now.
      if (data && typeof data.apiKey === "string" && data.apiKey) {
        setNewPlainKey(data.apiKey);
        setShowKeyDialog(true);
      }
    },
    onError: () => toast({ title: t("dashboard.customDataSource.wizard.saveFailed"), variant: "destructive" }),
  });

  const rotateKey = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/custom-data-source/rotate-key", {});
      return res.json();
    },
    onSuccess: (data) => {
      setNewPlainKey(data.apiKey);
      setShowKeyDialog(true);
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source"] });
    },
    onError: () => toast({ title: t("dashboard.customDataSource.apiKey.generateFailed"), variant: "destructive" }),
  });

  const testConn = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/custom-data-source/test", {});
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast({
        title: data.ok ? t("dashboard.customDataSource.wizard.connSuccess") : t("dashboard.customDataSource.wizard.connFailed"),
        description: data.ok ? `Status ${data.status} • ${data.latencyMs}ms` : (data.error || `Status ${data.status}`),
        variant: data.ok ? "default" : "destructive",
      });
    },
  });

  const saveIntent = useMutation({
    mutationFn: async (data: Partial<CustomDataIntent>) => {
      if (data.id) {
        const res = await apiRequest("PATCH", `/api/merchant/custom-data-intents/${data.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/merchant/custom-data-intents", data);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: t("dashboard.customDataSource.intent.saved") });
      setIntentDialogOpen(false);
      setEditingIntent(null);
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-intents"] });
    },
    onError: (err: any) => toast({ title: t("dashboard.customDataSource.wizard.failed"), description: err?.message, variant: "destructive" }),
  });

  const deleteIntent = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/merchant/custom-data-intents/${id}`);
    },
    onSuccess: () => {
      toast({ title: t("dashboard.customDataSource.intent.deleted") });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-intents"] });
    },
  });

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast({ title: t("dashboard.customDataSource.apiKey.copied") });
  };

  const openNewIntent = () => {
    setEditingIntent(blankIntent());
    setIntentDialogOpen(true);
  };
  const openEditIntent = (i: CustomDataIntent) => {
    setEditingIntent({ ...i, requiredFields: Array.isArray(i.requiredFields) ? i.requiredFields : [] });
    setIntentDialogOpen(true);
  };

  // Decide once after the initial load whether to open the wizard. Subsequent
  // source-query refetches (triggered by the wizard's own save) must NOT flip
  // this back, otherwise Steps 3 & 4 would unmount.
  useEffect(() => {
    if (!srcLoading && wizardOpen === null) setWizardOpen(!source);
  }, [srcLoading, source, wizardOpen]);

  if (srcLoading || wizardOpen === null) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (wizardOpen) {
    return (
      <ConnectWizard
        onApiKey={(key) => { setNewPlainKey(key); setShowKeyDialog(true); }}
        onFinish={() => {
          setWizardOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source"] });
          queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-intents"] });
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto" data-testid="page-custom-data-source">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            {t("dashboard.customDataSource.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.customDataSource.headerSubtitle")}
          </p>
          {source && health && (
            <HealthBadge
              health={health}
              onRefresh={() => refreshHealth.mutate()}
              refreshing={refreshHealth.isPending}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/custom-data-source/integration-checklist" data-testid="link-integration-checklist">
              <ClipboardList className="w-4 h-4 mr-1" /> {t("dashboard.customDataSource.integrationChecklist")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/merchant/custom-data-source/postman.json" download data-testid="link-download-postman">
              <Download className="w-4 h-4 mr-1" /> {t("dashboard.customDataSource.postmanLabel")}
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/merchant/custom-data-source/docs.html" target="_blank" rel="noreferrer" data-testid="link-view-docs">
              <FileText className="w-4 h-4 mr-1" /> {t("dashboard.customDataSource.specApi")}
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWizardDialogOpen(true)}
            data-testid="button-open-wizard"
          >
            <Wand2 className="w-4 h-4 mr-1" /> {t("dashboard.customDataSource.setupWizard")}
          </Button>
        </div>
      </div>

      <Dialog open={wizardDialogOpen} onOpenChange={setWizardDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("dashboard.customDataSource.setupWizard")}</DialogTitle>
            <DialogDescription>{t("dashboard.customDataSource.setupWizardDesc")}</DialogDescription>
          </DialogHeader>
          {wizardDialogOpen && (
            <ConnectWizard
              existingSource={source || null}
              existingIntentKeys={intents.map(i => i.intentKey)}
              inDialog
              onApiKey={(key) => { setNewPlainKey(key); setShowKeyDialog(true); }}
              onFinish={() => {
                setWizardDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source"] });
                queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-intents"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings" data-testid="tab-settings">{t("dashboard.customDataSource.tabs.settings")}</TabsTrigger>
          <TabsTrigger value="intents" data-testid="tab-intents">{t("dashboard.customDataSource.tabs.intents")}</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">{t("dashboard.customDataSource.tabs.audit")}</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> {t("dashboard.customDataSource.connectionTitle")}</CardTitle>
              <CardDescription>{t("dashboard.customDataSource.connectionDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-md border">
                <div>
                  <Label>{t("dashboard.customDataSource.settings.enable")}</Label>
                  <p className="text-xs text-muted-foreground">{t("dashboard.customDataSource.settings.enableHint")}</p>
                </div>
                <Switch
                  checked={!!merged.isEnabled}
                  onCheckedChange={(v) => setForm({ ...form, isEnabled: v })}
                  data-testid="switch-enabled"
                />
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-md border">
                <div>
                  <Label className="flex items-center gap-2"><HeartPulse className="w-4 h-4" /> {t("dashboard.customDataSource.settings.monitor")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.customDataSource.settings.monitorHint")}
                  </p>
                </div>
                <Switch
                  checked={merged.healthMonitorEnabled !== false}
                  onCheckedChange={(v) => setForm({ ...form, healthMonitorEnabled: v })}
                  data-testid="switch-health-monitor"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("dashboard.customDataSource.settings.name")}</Label>
                  <Input
                    value={merged.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t("dashboard.customDataSource.settings.placeholder.name")}
                    data-testid="input-source-name"
                  />
                </div>
                <div>
                  <Label>{t("dashboard.customDataSource.settings.baseUrl")}</Label>
                  <Input
                    value={merged.baseUrl || ""}
                    onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                    placeholder={t("dashboard.customDataSource.settings.placeholder.baseUrl")}
                    data-testid="input-base-url"
                  />
                </div>
                <div>
                  <Label>{t("dashboard.customDataSource.settings.authHeader")}</Label>
                  <Input
                    value={merged.headerAuthName || "X-API-Key"}
                    onChange={(e) => setForm({ ...form, headerAuthName: e.target.value })}
                    placeholder={t("dashboard.customDataSource.settings.placeholder.authHeader")}
                    data-testid="input-header-name"
                  />
                </div>
                <div>
                  <Label>{t("dashboard.customDataSource.settings.healthPath")}</Label>
                  <Input
                    value={merged.healthPath || "/health"}
                    onChange={(e) => setForm({ ...form, healthPath: e.target.value })}
                    placeholder={t("dashboard.customDataSource.settings.placeholder.healthPath")}
                    data-testid="input-health-path"
                  />
                </div>
                <div>
                  <Label>{t("dashboard.customDataSource.settings.cacheTtl")}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={3600}
                    value={merged.cacheTtlSec ?? 30}
                    onChange={(e) => setForm({ ...form, cacheTtlSec: parseInt(e.target.value || "0", 10) })}
                    data-testid="input-cache-ttl"
                  />
                </div>
                <div>
                  <Label>{t("dashboard.customDataSource.settings.rateLimit")}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={merged.rateLimitPerMin ?? 60}
                    onChange={(e) => setForm({ ...form, rateLimitPerMin: parseInt(e.target.value || "60", 10) })}
                    data-testid="input-rate-limit"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={() => saveSource.mutate(form)} disabled={saveSource.isPending} data-testid="button-save-source">
                  {saveSource.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  {t("dashboard.customDataSource.settings.save")}
                </Button>
                <Button variant="outline" onClick={() => testConn.mutate()} disabled={testConn.isPending || !source} data-testid="button-test-connection">
                  {testConn.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  {t("dashboard.customDataSource.settings.test")}
                </Button>
              </div>
              {testResult && (
                <div
                  data-testid={testResult.ok ? "wizard-test-result-ok" : "wizard-test-result-fail"}
                  className={`p-3 rounded-md border text-sm ${testResult.ok ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30"}`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                    {testResult.ok ? t("dashboard.customDataSource.wizard.success") : t("dashboard.customDataSource.wizard.failed")} • Status {testResult.status} • {testResult.latencyMs}ms
                  </div>
                  {testResult.sample && <pre className="text-xs mt-2 overflow-auto max-h-32">{testResult.sample}</pre>}
                  {testResult.error && <p className="text-xs mt-2 text-amber-700 dark:text-amber-300">{testResult.error}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> {t("dashboard.customDataSource.apiKey.title")}</CardTitle>
              <CardDescription>{t("dashboard.customDataSource.apiKey.cardDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input value={source?.apiKeyHint ? `cv_live_…${source.apiKeyHint.replace(/^…/, "")}` : t("dashboard.customDataSource.apiKey.notGenerated")} readOnly className="font-mono" data-testid="text-api-key-hint" />
                <Button variant="outline" onClick={() => rotateKey.mutate()} disabled={rotateKey.isPending} data-testid="button-rotate-key">
                  {rotateKey.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  {t("dashboard.customDataSource.apiKey.generateOrRotate")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.customDataSource.apiKey.plainHint")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">{t("dashboard.customDataSource.intentsHeading")}</h2>
              <p className="text-sm text-muted-foreground">{t("dashboard.customDataSource.intentsHeadingDesc")}</p>
            </div>
            <Button onClick={openNewIntent} data-testid="button-add-intent" disabled={!source}>
              <Plus className="w-4 h-4 mr-1" /> {t("dashboard.customDataSource.addIntent")}
            </Button>
          </div>
          {!source && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                {t("dashboard.customDataSource.saveFirst")}
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 gap-3">
            {intents.map((i) => (
              <Card key={i.id} data-testid={`card-intent-${i.id}`}>
                <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">{i.intentKey}</Badge>
                      <span className="font-medium">{i.name}</span>
                      {!i.isEnabled && <Badge variant="secondary">{t("dashboard.customDataSource.intent.inactive")}</Badge>}
                    </div>
                    {i.description && <p className="text-sm text-muted-foreground mt-1">{i.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-mono">{i.httpMethod} {i.endpointPath}</span>
                    </p>
                    {i.triggerKeywords && (
                      <p className="text-xs mt-1"><span className="text-muted-foreground">{t("dashboard.customDataSource.triggers")}:</span> {i.triggerKeywords}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={i.isEnabled}
                      onCheckedChange={(v) => saveIntent.mutate({ id: i.id, isEnabled: v })}
                      data-testid={`switch-intent-${i.id}`}
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEditIntent(i)} data-testid={`button-edit-intent-${i.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(t("dashboard.customDataSource.intent.deleteConfirmShort"))) deleteIntent.mutate(i.id); }} data-testid={`button-delete-intent-${i.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.customDataSource.auditTitle")}</CardTitle>
              <CardDescription>{t("dashboard.customDataSource.auditDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={auditIntentFilter}
                  onChange={(e) => setAuditIntentFilter(e.target.value)}
                  className="text-xs border rounded-md px-2 py-1 bg-background"
                  data-testid="select-audit-intent"
                >
                  <option value="all">{t("dashboard.customDataSource.audit.filterIntent")}</option>
                  {Array.from(new Set(audit.map(a => a.intentKey))).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <select
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value)}
                  className="text-xs border rounded-md px-2 py-1 bg-background"
                  data-testid="select-audit-status"
                >
                  <option value="all">{t("dashboard.customDataSource.audit.filterStatus")}</option>
                  <option value="success">{t("dashboard.customDataSource.audit.statusOk")}</option>
                  <option value="error">{t("dashboard.customDataSource.audit.statusFail")}</option>
                </select>
                <span className="text-xs text-muted-foreground">{filteredAudit.length} {t("dashboard.customDataSource.ofN")} {audit.length}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.customDataSource.audit.time")}</TableHead>
                    <TableHead>{t("dashboard.customDataSource.audit.intent")}</TableHead>
                    <TableHead>{t("dashboard.customDataSource.audit.endpoint")}</TableHead>
                    <TableHead>{t("dashboard.customDataSource.audit.fields")}</TableHead>
                    <TableHead>{t("dashboard.customDataSource.audit.status")}</TableHead>
                    <TableHead>{t("dashboard.customDataSource.audit.latency")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudit.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">{t("dashboard.customDataSource.audit.noLogs")}</TableCell></TableRow>
                  )}
                  {filteredAudit.map((a) => {
                    const masked = a.maskedFields
                      ? Object.entries(a.maskedFields).map(([k, v]) => `${k}=${v}`).join(", ")
                      : "—";
                    return (
                    <TableRow key={a.id} data-testid={`row-audit-${a.id}`}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(a.createdAt).toLocaleString(dateLocale)}</TableCell>
                      <TableCell className="font-mono text-xs">{a.intentKey}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[240px] truncate" title={a.endpointUrl}>{a.endpointUrl}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate" title={masked}>{masked}</TableCell>
                      <TableCell>
                        {a.httpStatus ? (
                          <Badge variant={a.httpStatus >= 200 && a.httpStatus < 300 ? "outline" : "secondary"}>{a.httpStatus}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("dashboard.customDataSource.audit.errBadge")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{a.latencyMs ?? "-"}ms</TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New API Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.customDataSource.apiKey.newDialogTitle")}</DialogTitle>
            <DialogDescription>{t("dashboard.customDataSource.apiKey.newDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input value={newPlainKey || ""} readOnly className="font-mono" data-testid="text-new-api-key" />
            <Button size="icon" variant="outline" onClick={() => newPlainKey && copy(newPlainKey)} data-testid="button-copy-new-key">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowKeyDialog(false); setNewPlainKey(null); }} data-testid="button-close-key-dialog">
              {t("dashboard.customDataSource.apiKey.iSaved")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Intent editor dialog */}
      <Dialog open={intentDialogOpen} onOpenChange={(v) => { setIntentDialogOpen(v); if (!v) setEditingIntent(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingIntent?.id ? t("dashboard.customDataSource.intent.edit") : t("dashboard.customDataSource.intent.create")}</DialogTitle>
            <DialogDescription>{t("dashboard.customDataSource.intent.dialogDesc")}</DialogDescription>
          </DialogHeader>
          {editingIntent && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>{t("dashboard.customDataSource.intent.intentKey")}</Label>
                  <Input
                    value={editingIntent.intentKey || ""}
                    onChange={(e) => setEditingIntent({ ...editingIntent, intentKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                    placeholder={t("dashboard.customDataSource.intent.placeholder.intentKey")}
                    disabled={!!editingIntent.id}
                    data-testid="input-intent-key"
                  />
                </div>
                <div>
                  <Label>{t("dashboard.customDataSource.intent.name")}</Label>
                  <Input
                    value={editingIntent.name || ""}
                    onChange={(e) => setEditingIntent({ ...editingIntent, name: e.target.value })}
                    placeholder={t("dashboard.customDataSource.intent.placeholder.name")}
                    data-testid="input-intent-name"
                  />
                </div>
              </div>
              <div>
                <Label>{t("dashboard.customDataSource.intent.description")}</Label>
                <Input
                  value={editingIntent.description || ""}
                  onChange={(e) => setEditingIntent({ ...editingIntent, description: e.target.value })}
                  placeholder={t("dashboard.customDataSource.intent.placeholder.description")}
                  data-testid="input-intent-description"
                />
              </div>
              <div>
                <Label>{t("dashboard.customDataSource.intent.triggers")}</Label>
                <Input
                  value={editingIntent.triggerKeywords || ""}
                  onChange={(e) => setEditingIntent({ ...editingIntent, triggerKeywords: e.target.value })}
                  placeholder={t("dashboard.customDataSource.intent.placeholder.triggers")}
                  data-testid="input-trigger-keywords"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>{t("dashboard.customDataSource.intent.method")}</Label>
                  <Select value={editingIntent.httpMethod || "GET"} onValueChange={(v) => setEditingIntent({ ...editingIntent, httpMethod: v })}>
                    <SelectTrigger data-testid="select-http-method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>{t("dashboard.customDataSource.intent.endpoint")}</Label>
                  <Input
                    value={editingIntent.endpointPath || ""}
                    onChange={(e) => setEditingIntent({ ...editingIntent, endpointPath: e.target.value })}
                    placeholder={t("dashboard.customDataSource.intent.placeholder.endpointPath")}
                    data-testid="input-endpoint-path"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>{t("dashboard.customDataSource.intent.requiredFields")}</Label>
                  <Button size="sm" variant="ghost" onClick={() => {
                    const cur: RequiredField[] = Array.isArray(editingIntent.requiredFields) ? editingIntent.requiredFields : [];
                    setEditingIntent({ ...editingIntent, requiredFields: [...cur, { key: "", label: "", required: true }] });
                  }} data-testid="button-add-field">
                    <Plus className="w-3 h-3 mr-1" /> {t("dashboard.customDataSource.intent.addField")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editingIntent.requiredFields || []).map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={f.key}
                        onChange={(e) => {
                          const arr = [...(editingIntent.requiredFields || [])];
                          arr[idx] = { ...arr[idx], key: e.target.value };
                          setEditingIntent({ ...editingIntent, requiredFields: arr });
                        }}
                        placeholder={t("dashboard.customDataSource.intent.placeholder.fieldKey")}
                        className="font-mono"
                        data-testid={`input-field-key-${idx}`}
                      />
                      <Input
                        value={f.label}
                        onChange={(e) => {
                          const arr = [...(editingIntent.requiredFields || [])];
                          arr[idx] = { ...arr[idx], label: e.target.value };
                          setEditingIntent({ ...editingIntent, requiredFields: arr });
                        }}
                        placeholder={t("dashboard.customDataSource.intent.placeholder.fieldLabel")}
                        data-testid={`input-field-label-${idx}`}
                      />
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={f.required}
                          onCheckedChange={(v) => {
                            const arr = [...(editingIntent.requiredFields || [])];
                            arr[idx] = { ...arr[idx], required: v };
                            setEditingIntent({ ...editingIntent, requiredFields: arr });
                          }}
                          data-testid={`switch-field-required-${idx}`}
                        />
                        <span className="text-xs text-muted-foreground">{t("dashboard.customDataSource.intent.required")}</span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => {
                        const arr = [...(editingIntent.requiredFields || [])];
                        arr.splice(idx, 1);
                        setEditingIntent({ ...editingIntent, requiredFields: arr });
                      }} data-testid={`button-remove-field-${idx}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>{t("dashboard.customDataSource.intent.responseTemplate")}</Label>
                <Textarea
                  rows={4}
                  value={editingIntent.responseTemplate || ""}
                  onChange={(e) => setEditingIntent({ ...editingIntent, responseTemplate: e.target.value })}
                  placeholder={t("dashboard.customDataSource.intent.placeholder.responseTemplate")}
                  className="font-mono text-sm"
                  data-testid="input-response-template"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.customDataSource.intent.responseTemplateEmptyHint")}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Switch
                  checked={editingIntent.isEnabled !== false}
                  onCheckedChange={(v) => setEditingIntent({ ...editingIntent, isEnabled: v })}
                  data-testid="switch-intent-enabled"
                />
                <Label className="m-0">{t("dashboard.customDataSource.intent.active")}</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIntentDialogOpen(false); setEditingIntent(null); }} data-testid="button-cancel-intent">{t("dashboard.customDataSource.intent.cancel")}</Button>
            <Button onClick={() => editingIntent && saveIntent.mutate(editingIntent)} disabled={saveIntent.isPending} data-testid="button-save-intent">
              {saveIntent.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {t("dashboard.customDataSource.intent.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connect Panel Wizard — first-run setup for non-technical merchants.
// Shown when no custom data source exists yet. After completion the parent
// page re-renders into the full Settings/Intents/Audit dashboard automatically.
// ─────────────────────────────────────────────────────────────────────────────

interface PresetIntentDef {
  intentKey: string;
  name: string;
  description: string;
  httpMethod: string;
  endpointPath: string;
  requiredFields: RequiredField[];
}
interface PresetDef {
  id: string;
  name: string;
  description: string;
  intents: PresetIntentDef[];
}

interface TourStageDef {
  id: string;
  selectors: string[];
  wizardStep: 1 | 2 | 3 | 4;
  titleKey: string;
  bodyKey: string;
}

const TOUR_STAGES: TourStageDef[] = [
  {
    id: "preset",
    selectors: ["wizard-step-1"],
    wizardStep: 1,
    titleKey: "dashboard.customDataSource.tour.preset.title",
    bodyKey: "dashboard.customDataSource.tour.preset.body",
  },
  {
    id: "baseUrl",
    selectors: ["wizard-input-base-url"],
    wizardStep: 2,
    titleKey: "dashboard.customDataSource.tour.baseUrl.title",
    bodyKey: "dashboard.customDataSource.tour.baseUrl.body",
  },
  {
    id: "test",
    selectors: ["wizard-test-result-ok", "wizard-test-result-fail"],
    wizardStep: 2,
    titleKey: "dashboard.customDataSource.tour.test.title",
    bodyKey: "dashboard.customDataSource.tour.test.body",
  },
  {
    id: "apiKey",
    selectors: ["wizard-text-api-key"],
    wizardStep: 3,
    titleKey: "dashboard.customDataSource.tour.apiKey.title",
    bodyKey: "dashboard.customDataSource.tour.apiKey.body",
  },
  {
    id: "intents",
    selectors: ["wizard-step-4"],
    wizardStep: 4,
    titleKey: "dashboard.customDataSource.tour.intents.title",
    bodyKey: "dashboard.customDataSource.tour.intents.body",
  },
];

const tourStorageKey = () => {
  try {
    const mid = localStorage.getItem("merchantId") || "anon";
    return `chatvice.tour.custom-data-wizard.v1.${mid}`;
  } catch {
    return "chatvice.tour.custom-data-wizard.v1.anon";
  }
};

const findTourEl = (selectors: string[]): HTMLElement | null => {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(`[data-testid="${sel}"]`);
    if (el) return el;
  }
  return null;
};

function HealthBadge({ health, onRefresh, refreshing }: { health: HealthSummary; onRefresh: () => void; refreshing: boolean }) {
  const { t } = useLanguage();
  const { status, errorRatePct, totalPings, lastCheckedAt, lastLatencyMs, lastError, monitorEnabled } = health;
  const palette: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    up:       { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900", label: t("dashboard.customDataSource.health.healthy") },
    degraded: { dot: "bg-amber-500",   text: "text-amber-700 dark:text-amber-300",     bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",     label: t("dashboard.customDataSource.health.degraded") },
    down:     { dot: "bg-red-500",     text: "text-red-700 dark:text-red-300",         bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",             label: t("dashboard.customDataSource.health.unhealthy") },
    unknown:  { dot: "bg-zinc-400",    text: "text-zinc-600 dark:text-zinc-300",       bg: "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800",         label: t("dashboard.customDataSource.health.unknown") },
  };
  const p = palette[status] || palette.unknown;
  const lastSeen = lastCheckedAt
    ? (() => {
        const ms = Date.now() - new Date(lastCheckedAt).getTime();
        if (ms < 60_000) return t("dashboard.customDataSource.health.justNow");
        if (ms < 3600_000) return t("dashboard.customDataSource.health.minutesAgo").replace("{n}", String(Math.round(ms / 60_000)));
        if (ms < 86400_000) return t("dashboard.customDataSource.health.hoursAgo").replace("{n}", String(Math.round(ms / 3600_000)));
        return new Date(lastCheckedAt).toLocaleString();
      })()
    : "—";
  return (
    <div className={`mt-3 inline-flex flex-wrap items-center gap-2 px-3 py-2 rounded-md border ${p.bg}`} data-testid="badge-panel-health">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${p.dot} ${status !== "unknown" ? "animate-pulse" : ""}`} />
      <Activity className={`w-4 h-4 ${p.text}`} />
      <span className={`text-sm font-medium ${p.text}`} data-testid="text-health-status">{p.label}</span>
      <span className="text-xs text-muted-foreground">·</span>
      <span className="text-xs text-muted-foreground" data-testid="text-health-last-checked">{t("dashboard.customDataSource.health.lastCheck")}: {lastSeen}</span>
      {lastLatencyMs != null && (
        <>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{lastLatencyMs}ms</span>
        </>
      )}
      {totalPings > 0 && (
        <>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground" data-testid="text-health-error-rate">
            {errorRatePct}{t("dashboard.customDataSource.health.errorRate")} ({totalPings}x)
          </span>
        </>
      )}
      {!monitorEnabled && (
        <span className="text-xs text-muted-foreground italic">({t("dashboard.customDataSource.health.monitorOff")})</span>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={onRefresh}
        disabled={refreshing}
        data-testid="button-refresh-health"
      >
        {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
      </Button>
      {status === "down" && lastError && (
        <div className="basis-full text-xs text-red-700 dark:text-red-300 mt-1" data-testid="text-health-last-error">
          {t("dashboard.customDataSource.health.lastError")}: {lastError}
        </div>
      )}
    </div>
  );
}

function WizardTour({
  step,
  testResultPresent,
  apiKeyPresent,
  presetCount,
  onClose,
}: {
  step: 1 | 2 | 3 | 4;
  testResultPresent: boolean;
  apiKeyPresent: boolean;
  presetCount: number;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [tourIndex, setTourIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const highlightedRef = useRef<{ el: HTMLElement; prev: string } | null>(null);

  // Auto-advance past stages whose wizardStep is now in the past.
  useEffect(() => {
    setTourIndex((i) => {
      let n = i;
      while (n < TOUR_STAGES.length && TOUR_STAGES[n].wizardStep < step) n++;
      return n;
    });
  }, [step]);

  const stage = tourIndex < TOUR_STAGES.length ? TOUR_STAGES[tourIndex] : null;
  const gating =
    !stage ||
    (stage.wizardStep === step &&
      (stage.id !== "test" || testResultPresent) &&
      (stage.id !== "preset" || presetCount > 0) &&
      (stage.id !== "apiKey" || apiKeyPresent));
  const visible = !!stage && gating && stage.wizardStep === step;

  // Locate target + position popover; highlight target with ring.
  useEffect(() => {
    if (!visible || !stage) {
      setRect(null);
      if (highlightedRef.current) {
        highlightedRef.current.el.style.boxShadow = highlightedRef.current.prev;
        highlightedRef.current = null;
      }
      return;
    }
    const el = findTourEl(stage.selectors);
    if (!el) {
      setRect(null);
      return;
    }
    if (highlightedRef.current && highlightedRef.current.el !== el) {
      highlightedRef.current.el.style.boxShadow = highlightedRef.current.prev;
      highlightedRef.current = null;
    }
    if (!highlightedRef.current) {
      highlightedRef.current = { el, prev: el.style.boxShadow };
      el.style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.6)";
      el.style.borderRadius = el.style.borderRadius || "6px";
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [visible, stage, testResultPresent, apiKeyPresent, presetCount]);

  // Cleanup highlight on unmount.
  useEffect(() => {
    return () => {
      if (highlightedRef.current) {
        highlightedRef.current.el.style.boxShadow = highlightedRef.current.prev;
        highlightedRef.current = null;
      }
    };
  }, []);

  if (!stage || !visible) return null;

  const isLast = tourIndex >= TOUR_STAGES.length - 1;
  const nextStage = !isLast ? TOUR_STAGES[tourIndex + 1] : null;
  const nextEligible = !nextStage || nextStage.wizardStep <= step;
  const advance = () => {
    if (isLast) {
      onClose();
      return;
    }
    if (!nextEligible) return;
    setTourIndex((i) => i + 1);
  };

  // Position the popover below the target, falling back to top of viewport.
  const popoverWidth = 320;
  let style: React.CSSProperties = {
    position: "fixed",
    zIndex: 1000,
    width: popoverWidth,
  };
  if (rect) {
    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = rect.bottom + margin;
    if (top + 200 > vh) top = Math.max(margin, rect.top - 200 - margin);
    let left = Math.min(
      Math.max(margin, rect.left),
      vw - popoverWidth - margin,
    );
    style.top = top;
    style.left = left;
  } else {
    style.top = 80;
    style.right = 24;
  }

  return (
    <div
      className="bg-popover text-popover-foreground border rounded-md shadow-lg p-4"
      style={style}
      data-testid={`tour-popover-${stage.id}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-sm">{t(stage.titleKey)}</div>
          <div className="text-xs text-muted-foreground mt-1">{t(stage.bodyKey)}</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mt-3">
        <span className="text-xs text-muted-foreground">
          {tourIndex + 1} / {TOUR_STAGES.length}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            data-testid="button-tour-skip"
          >
            {t("dashboard.customDataSource.tour.skip")}
          </Button>
          <Button
            size="sm"
            onClick={advance}
            disabled={!isLast && !nextEligible}
            data-testid="button-tour-next"
          >
            {isLast ? t("dashboard.customDataSource.tour.done") : t("dashboard.customDataSource.tour.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConnectWizard({
  onApiKey,
  onFinish,
  existingSource = null,
  existingIntentKeys = [],
  inDialog = false,
}: {
  onApiKey: (key: string) => void;
  onFinish: () => void;
  existingSource?: CustomDataSource | null;
  existingIntentKeys?: string[];
  inDialog?: boolean;
}) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const isRerun = !!existingSource;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [presetId, setPresetId] = useState<string>("");
  const [name, setName] = useState(existingSource?.name || t("dashboard.customDataSource.wizard.defaultName"));
  const [baseUrl, setBaseUrl] = useState(existingSource?.baseUrl || "");
  const [created, setCreated] = useState(isRerun);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; status: number; latencyMs: number; sample?: string; error?: string } | null>(null);
  const [scaffolded, setScaffolded] = useState<Set<string>>(new Set());
  const [tourActive, setTourActive] = useState<boolean>(() => {
    if (existingSource) return false;
    try {
      return localStorage.getItem(tourStorageKey()) !== "1";
    } catch {
      return true;
    }
  });
  const closeTour = () => {
    try { localStorage.setItem(tourStorageKey(), "1"); } catch {}
    setTourActive(false);
  };

  const { data: presets = [] } = useQuery<PresetDef[]>({
    queryKey: ["/api/merchant/custom-data-source/presets"],
  });
  const activePreset = presets.find(p => p.id === presetId);

  const saveSource = useMutation({
    mutationFn: async () => {
      // Step 4 will scaffold intents one-by-one, so we save with preset:"none"
      // to skip the legacy auto-seed path.
      const body: Record<string, unknown> = {
        name: name || t("dashboard.customDataSource.wizard.defaultName"),
        baseUrl,
        preset: "none",
      };
      // Only force-enable on first creation; preserve toggle state on re-run.
      if (!isRerun) body.isEnabled = true;
      const res = await apiRequest("PUT", "/api/merchant/custom-data-source", body);
      return res.json();
    },
    onSuccess: (data: any) => {
      setCreated(true);
      if (typeof data?.apiKey === "string") setApiKey(data.apiKey);
      // NOTE: do NOT invalidate /api/merchant/custom-data-source here — that
      // would refetch the source on the parent page and could cause UI
      // transitions away from the wizard mid-flow. The parent invalidates
      // both queries when the wizard finishes.
    },
    onError: (err: any) => toast({ title: t("dashboard.customDataSource.wizard.saveFailed"), description: err?.message, variant: "destructive" }),
  });

  const testConn = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/custom-data-source/test", {});
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast({
        title: data.ok ? t("dashboard.customDataSource.wizard.connSuccess") : t("dashboard.customDataSource.wizard.connFailed"),
        description: data.ok ? `Status ${data.status} • ${data.latencyMs}ms` : (data.error || `Status ${data.status}`),
        variant: data.ok ? "default" : "destructive",
      });
    },
  });

  const scaffoldIntent = useMutation({
    mutationFn: async (intentKey: string) => {
      const res = await apiRequest("POST", "/api/merchant/custom-data-intents/from-preset", {
        preset: presetId,
        intentKey,
      });
      return { intentKey, body: await res.json() };
    },
    onSuccess: ({ intentKey }) => {
      setScaffolded(prev => new Set(prev).add(intentKey));
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-intents"] });
    },
    onError: (err: any) => toast({ title: t("dashboard.customDataSource.wizard.addIntentFailed"), description: err?.message, variant: "destructive" }),
  });

  const finish = () => {
    if (apiKey) onApiKey(apiKey);
    onFinish();
  };

  const goSaveAndTest = async () => {
    if (!baseUrl.trim()) {
      toast({ title: t("dashboard.customDataSource.wizard.baseUrlRequired"), variant: "destructive" });
      return;
    }
    // On re-run, always save so edits to name/baseUrl persist before the test.
    const dirty = isRerun && (
      (existingSource?.baseUrl || "") !== baseUrl ||
      (existingSource?.name || "") !== name
    );
    if (!created || dirty) {
      await saveSource.mutateAsync();
    }
    testConn.mutate();
  };

  return (
    <div className={inDialog ? "space-y-6" : "p-6 max-w-3xl mx-auto space-y-6"} data-testid="wizard-connect-panel">
      {tourActive && (
        <WizardTour
          step={step}
          testResultPresent={!!testResult}
          apiKeyPresent={!!apiKey}
          presetCount={presets.length}
          onClose={closeTour}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          {t("dashboard.customDataSource.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("dashboard.customDataSource.subtitle")}
        </p>
        </div>
        {!tourActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTourActive(true)}
            data-testid="button-tour-restart"
          >
            <Sparkles className="w-4 h-4 mr-1" /> {t("dashboard.customDataSource.tour.show")}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2" data-testid="wizard-stepper">
        {[1, 2, 3, 4].map((n, i) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium border ${
              step === n ? "bg-primary text-primary-foreground border-primary" :
              step > n ? "bg-emerald-500 text-white border-emerald-500" :
              "bg-muted text-muted-foreground"
            }`}>
              {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            {i < 3 && <div className={`flex-1 h-px ${step > n ? "bg-emerald-500" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {step === 1 && t("dashboard.customDataSource.wizard.step1Title")}
            {step === 2 && t("dashboard.customDataSource.wizard.step2Title")}
            {step === 3 && t("dashboard.customDataSource.wizard.step3Title")}
            {step === 4 && t("dashboard.customDataSource.wizard.step4Title")}
          </CardTitle>
          <CardDescription>
            {step === 1 && t("dashboard.customDataSource.wizard.step1Desc")}
            {step === 2 && t("dashboard.customDataSource.wizard.step2Desc")}
            {step === 3 && t("dashboard.customDataSource.wizard.step3Desc")}
            {step === 4 && t("dashboard.customDataSource.wizard.step4Desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="wizard-step-1">
              {presets.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPresetId(p.id)}
                  className={`text-left p-4 rounded-md border hover-elevate active-elevate-2 ${
                    presetId === p.id ? "border-primary ring-1 ring-primary" : ""
                  }`}
                  data-testid={`button-preset-${p.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{p.description}</p>
                  <p className="text-xs mt-3">
                    <Badge variant="secondary">{t("dashboard.customDataSource.wizard.intentExamples").replace("{n}", String(p.intents.length))}</Badge>
                  </p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3" data-testid="wizard-step-2">
              <div>
                <Label>{t("dashboard.customDataSource.wizard.nameLabel")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("dashboard.customDataSource.wizard.namePlaceholder")}
                  data-testid="wizard-input-name"
                />
              </div>
              <div>
                <Label>{t("dashboard.customDataSource.wizard.baseUrlLabel")}</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => { setBaseUrl(e.target.value); setTestResult(null); setCreated(false); setApiKey(null); }}
                  placeholder={t("dashboard.customDataSource.settings.placeholder.baseUrl")}
                  data-testid="wizard-input-base-url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.customDataSource.wizard.baseUrlHint")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={goSaveAndTest}
                  disabled={saveSource.isPending || testConn.isPending || !baseUrl.trim()}
                  data-testid="wizard-button-test"
                >
                  {(saveSource.isPending || testConn.isPending) && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {created ? t("dashboard.customDataSource.wizard.retestButton") : t("dashboard.customDataSource.wizard.testButton")}
                </Button>
                {created && !testResult?.ok && (
                  <span className="text-xs text-muted-foreground">{t("dashboard.customDataSource.wizard.savedHint")}</span>
                )}
              </div>
              {testResult && (
                <div
                  data-testid={testResult.ok ? "wizard-test-result-ok" : "wizard-test-result-fail"}
                  className={`p-3 rounded-md border text-sm ${testResult.ok ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30"}`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                    {testResult.ok ? t("dashboard.customDataSource.wizard.success") : t("dashboard.customDataSource.wizard.failed")} • Status {testResult.status} • {testResult.latencyMs}ms
                  </div>
                  {testResult.sample && <pre className="text-xs mt-2 overflow-auto max-h-32">{testResult.sample}</pre>}
                  {testResult.error && <p className="text-xs mt-2 text-amber-700 dark:text-amber-300">{testResult.error}</p>}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3" data-testid="wizard-step-3">
              <div className="p-3 rounded-md border bg-amber-50 dark:bg-amber-950/30 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  {t("dashboard.customDataSource.wizard.apiKeyWarning")}
                </div>
                <p className="text-xs mt-1 text-muted-foreground">
                  {t("dashboard.customDataSource.wizard.apiKeyHint")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={apiKey || t("dashboard.customDataSource.wizard.apiKeyPlaceholder")}
                  readOnly
                  className="font-mono"
                  data-testid="wizard-text-api-key"
                />
                <Button
                  size="icon"
                  variant="outline"
                  disabled={!apiKey}
                  onClick={() => {
                    if (apiKey) {
                      navigator.clipboard.writeText(apiKey);
                      toast({ title: t("dashboard.customDataSource.wizard.apiKeyCopied") });
                    }
                  }}
                  data-testid="wizard-button-copy-key"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {!apiKey && (
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.customDataSource.wizard.apiKeyMissing")}
                </p>
              )}
            </div>
          )}

          {step === 4 && (() => {
            const existingKeySet = new Set(existingIntentKeys);
            const remaining = activePreset?.intents.filter(it => !existingKeySet.has(it.intentKey)) || [];
            return (
            <div className="space-y-3" data-testid="wizard-step-4">
              <div className="p-3 rounded-md border bg-muted/30 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" /> {t("dashboard.customDataSource.wizard.checklistTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("dashboard.customDataSource.wizard.checklistDesc")}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild data-testid="wizard-link-checklist">
                  <Link href="/dashboard/custom-data-source/integration-checklist">
                    {t("dashboard.customDataSource.wizard.openChecklist")} <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
              {!activePreset || activePreset.intents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.customDataSource.wizard.noPresetIntents")}</p>
              ) : remaining.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.customDataSource.wizard.allAdded")}
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.customDataSource.wizard.addHint")}
                  </p>
                  <div className="space-y-2">
                    {remaining.map((it) => {
                      const done = scaffolded.has(it.intentKey);
                      return (
                        <div
                          key={it.intentKey}
                          className="p-3 rounded-md border flex items-start justify-between gap-3"
                          data-testid={`wizard-preset-intent-${it.intentKey}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono">{it.intentKey}</Badge>
                              <span className="font-medium text-sm">{it.name}</span>
                            </div>
                            {it.description && <p className="text-xs text-muted-foreground mt-1">{it.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1 font-mono">{it.httpMethod} {it.endpointPath}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={done ? "outline" : "default"}
                            disabled={done || scaffoldIntent.isPending}
                            onClick={() => scaffoldIntent.mutate(it.intentKey)}
                            data-testid={`wizard-button-add-${it.intentKey}`}
                          >
                            {done ? <><CheckCircle2 className="w-4 h-4 mr-1" /> {t("dashboard.customDataSource.wizard.added")}</> : <><Plus className="w-4 h-4 mr-1" /> {t("dashboard.customDataSource.wizard.add")}</>}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            );
          })()}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3 | 4))}
          disabled={step === 1}
          data-testid="wizard-button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("dashboard.customDataSource.wizard.back")}
        </Button>
        {step < 4 ? (
          <Button
            onClick={async () => {
              // On re-run, persist edits to name/baseUrl when leaving Step 2
              // even if the user never clicked "Tes ulang koneksi".
              if (step === 2 && isRerun) {
                const dirty =
                  (existingSource?.baseUrl || "") !== baseUrl ||
                  (existingSource?.name || "") !== name;
                if (dirty && baseUrl.trim()) {
                  try { await saveSource.mutateAsync(); } catch { return; }
                }
              }
              setStep((s) => (Math.min(4, s + 1) as 1 | 2 | 3 | 4));
            }}
            disabled={
              (step === 1 && !presetId) ||
              (step === 2 && !created) ||
              saveSource.isPending
            }
            data-testid="wizard-button-next"
          >
            {t("dashboard.customDataSource.wizard.next")} <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={finish} data-testid="wizard-button-finish">
            {t("dashboard.customDataSource.wizard.finish")} <CheckCircle2 className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
