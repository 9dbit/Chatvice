import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import {
  ArrowLeft, CheckCircle2, Circle, AlertTriangle, XCircle, Loader2, Play, Copy,
  Download, FileText, ClipboardList, ShieldCheck, Plug, KeyRound,
} from "lucide-react";

interface RequiredField {
  key: string;
  label?: string;
  type?: string;
  required?: boolean;
}

interface IntentRow {
  id: string;
  intentKey: string;
  name: string;
  description: string;
  triggerKeywords: string;
  httpMethod: string;
  endpointPath: string;
  requiredFields: RequiredField[];
  responseTemplate: string;
  isEnabled: boolean;
}

interface SourceRow {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyHint: string | null;
  headerAuthName: string;
  healthPath: string;
  cacheTtlSec: number;
  rateLimitPerMin: number;
  isEnabled: boolean;
  updatedAt: string | null;
}

interface IntentStatus {
  lastStatus: "success" | "error" | "untested";
  lastHttpStatus: number | null;
  lastLatencyMs: number | null;
  lastErrorMessage: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  callCount: number;
}

interface IntegrationChecks {
  baseUrlPresent: boolean;
  baseUrlIsHttps: boolean;
  baseUrlValid: boolean;
  baseUrlError: string | null;
  hostIsPublic: boolean;
  hostError: string | null;
  healthChecked: boolean;
  healthOk: boolean;
  healthStatus: number | null;
  healthLatencyMs: number | null;
  healthRedirect: boolean;
  healthContentType: string | null;
  healthIsJson: boolean;
  healthUnderTimeout: boolean;
  healthError: string | null;
}

interface IntegrationStatus {
  source: SourceRow | null;
  intents: IntentRow[];
  intentStatus: Record<string, IntentStatus>;
  checks: IntegrationChecks | null;
  totals: {
    intents: number;
    enabledIntents: number;
    successCount: number;
    errorCount: number;
    untestedCount: number;
  };
  apiKeyAgeDays: number | null;
}

interface TestResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  sample?: string;
  error?: string;
}

type Status = "success" | "error" | "warn" | "todo";

interface ChecklistItem {
  key: string;
  title: string;
  description: string;
  status: Status;
  detail?: string;
}

function StatusBadge({ status, labels }: {
  status: Status;
  labels?: { success?: string; error?: string; warn?: string; todo?: string };
}) {
  const { t } = useLanguage();
  const successLabel = labels?.success ?? t("dashboard.customDataSource.checklistPage.stDone");
  const errorLabel = labels?.error ?? t("dashboard.customDataSource.checklistPage.stFailed");
  const warnLabel = labels?.warn ?? t("dashboard.customDataSource.checklistPage.stAttention");
  const todoLabel = labels?.todo ?? t("dashboard.customDataSource.checklistPage.stTodo");
  if (status === "success") {
    return (
      <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="w-3 h-3" /> {successLabel}
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="secondary" className="gap-1 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
        <XCircle className="w-3 h-3" /> {errorLabel}
      </Badge>
    );
  }
  if (status === "warn") {
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <AlertTriangle className="w-3 h-3" /> {warnLabel}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
      <Circle className="w-3 h-3" /> {todoLabel}
    </Badge>
  );
}

function buildSampleFields(intent: IntentRow): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of intent.requiredFields || []) {
    if (!f?.key) continue;
    if (f.type === "number") out[f.key] = "1";
    else out[f.key] = `test_${f.key}`;
  }
  return out;
}

function buildCurl(source: SourceRow, intent: IntentRow): string {
  const baseUrl = (source.baseUrl || "https://panel.example.com/api/v1").replace(/\/+$/, "");
  let path = intent.endpointPath || "";
  if (!path.startsWith("/")) path = "/" + path;
  const method = (intent.httpMethod || "GET").toUpperCase();
  const usedKeys = new Set<string>();
  const sample = buildSampleFields(intent);
  path = path.replace(/\{([\w]+)\}/g, (_m, key: string) => {
    usedKeys.add(key);
    return encodeURIComponent(sample[key] ?? `<${key}>`);
  });
  let url = baseUrl + path;
  let body: string | undefined;
  if (method === "GET") {
    const qsKeys = Object.keys(sample).filter(k => !usedKeys.has(k));
    const qs = qsKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(sample[k])}`).join("&");
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  } else {
    body = JSON.stringify(sample);
  }
  const headerName = source.headerAuthName || "X-API-Key";
  const lines = [
    `curl -X ${method} '${url}' \\`,
    `  -H '${headerName}: <YOUR_API_KEY>' \\`,
    `  -H 'Accept: application/json'`,
  ];
  if (body) {
    lines[lines.length - 1] += " \\";
    lines.push(`  -H 'Content-Type: application/json' \\`);
    lines.push(`  -d '${body.replace(/'/g, `'\\''`)}'`);
  }
  return lines.join("\n");
}

function buildMarkdown(data: IntegrationStatus, m: (k: string) => string): string {
  const lines: string[] = [];
  const c = data.checks;
  const mk = (b: boolean) => (b ? "x" : " ");
  lines.push(m("title"), "");
  lines.push(m("sectionA"), "");
  lines.push(`- [${mk(!!c?.baseUrlPresent && !!c?.baseUrlValid && !!c?.baseUrlIsHttps)}] ${m("itemBaseUrl")}`);
  lines.push(`- [${mk(!!c?.hostIsPublic)}] ${m("itemHostPublic")}`);
  lines.push(`- [${mk(!!c?.healthOk && !!c?.healthIsJson)}] ${m("itemHealthOk").replace("{path}", data.source?.healthPath || "/health")}`);
  lines.push(`- [${mk(!!c && c.healthChecked && !c.healthRedirect)}] ${m("itemHealthNoRedirect")}`);
  lines.push(`- [${mk(!!c?.healthChecked && !!c?.healthUnderTimeout && !c?.healthError)}] ${m("itemHealthTimeout")}`);
  lines.push(`- [${mk(!!data.source?.apiKeyHint)}] ${m("itemApiKeyGenerated")}`);
  lines.push(`- [${mk(!!data.source?.isEnabled)}] ${m("itemEnabled")}`);
  lines.push("");
  lines.push(m("sectionB"), "");
  for (const intent of data.intents) {
    const st = data.intentStatus[intent.intentKey];
    const mark = st?.lastStatus === "success" ? "x" : " ";
    lines.push(`### ${intent.name} (\`${intent.intentKey}\`)`);
    lines.push(`- ${m("intentLastStatus")}: **${st?.lastStatus || m("untested")}**${st?.lastHttpStatus ? ` (HTTP ${st.lastHttpStatus})` : ""}`);
    lines.push(`- ${m("intentEndpoint")}: \`${intent.httpMethod} ${intent.endpointPath}\``);
    lines.push(`- [${mark}] ${m("intentImplement")}`);
    const fieldsStr = (intent.requiredFields || []).map(f => `\`${f.key}\``).join(", ") || m("intentNoFields");
    lines.push(`- [ ] ${m("intentJsonFields").replace("{fields}", fieldsStr)}`);
    lines.push(`- [ ] ${m("intentValidatesKey").replace("{header}", data.source?.headerAuthName || "X-API-Key")}`);
    lines.push(`- [ ] ${m("intentResponds")}`);
    lines.push("");
  }
  lines.push(m("sectionC"), "");
  lines.push(`- [ ] ${m("itemWhitelist")}`);
  lines.push(`- [ ] ${m("itemKeyEncrypted")}`);
  lines.push(`- [${mk(!!c && c.healthChecked && !c.healthRedirect)}] ${m("itemNoRedirect")}`);
  lines.push(`- [ ] ${m("itemRateLimit").replace("{n}", String(data.source?.rateLimitPerMin || 60))}`);
  lines.push(`- [ ] ${m("itemSensitive")}`);
  lines.push(`- [ ] ${m("itemAuditLog")}`);
  lines.push(`- [${mk((data.apiKeyAgeDays ?? 9999) < 90)}] ${m("itemKeyRotation").replace("{days}", String(data.apiKeyAgeDays ?? m("unknown")))}`);
  return lines.join("\n");
}

export default function CustomDataSourceChecklistPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const cp = (k: string) => t(`dashboard.customDataSource.checklistPage.${k}`);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const { data, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/merchant/custom-data-source/integration-status"],
  });

  const testIntent = useMutation<TestResult, Error, string>({
    mutationFn: async (intentKey: string) => {
      const res = await apiRequest("POST", "/api/merchant/custom-data-source/test", { intentKey });
      return (await res.json()) as TestResult;
    },
    onSuccess: (result, intentKey) => {
      if (result.ok) {
        toast({ title: cp("toastTestSuccess"), description: `${intentKey}: HTTP ${result.status} • ${result.latencyMs}ms` });
      } else {
        toast({ title: cp("toastTestFailed"), description: result.error || `HTTP ${result.status}`, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source/integration-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source/audit"] });
    },
    onError: (err: Error) => {
      toast({ title: cp("toastTestFailed"), description: err?.message || cp("networkError"), variant: "destructive" });
    },
    onSettled: () => setTestingKey(null),
  });

  const sectionA: ChecklistItem[] = useMemo(() => {
    const s = data?.source;
    const c = data?.checks;
    if (!s || !c) return [];
    const items: ChecklistItem[] = [];
    items.push({
      key: "base-url",
      title: cp("itemBaseUrlTitle"),
      description: cp("itemBaseUrlDesc"),
      status: !c.baseUrlPresent ? "todo" : (c.baseUrlValid && c.baseUrlIsHttps ? "success" : "error"),
      detail: !c.baseUrlPresent
        ? cp("itemBaseUrlNotFilled")
        : c.baseUrlError
          ? `${s.baseUrl} — ${c.baseUrlError}`
          : !c.baseUrlIsHttps
            ? cp("itemBaseUrlHttpsRequired").replace("{url}", s.baseUrl)
            : s.baseUrl,
    });
    items.push({
      key: "host-public",
      title: cp("itemHostTitle"),
      description: cp("itemHostDesc"),
      status: !c.baseUrlPresent ? "todo" : (c.hostIsPublic ? "success" : "error"),
      detail: c.hostError ?? (c.hostIsPublic ? cp("itemHostVerified") : cp("itemHostNotVerified")),
    });
    items.push({
      key: "health-200",
      title: cp("itemHealthTitle").replace("{path}", s.healthPath || "/health"),
      description: cp("itemHealthDesc"),
      status: !c.healthChecked
        ? "todo"
        : (c.healthOk && c.healthIsJson)
          ? "success"
          : c.healthOk
            ? "warn"
            : "error",
      detail: !c.healthChecked
        ? cp("itemHealthNotTested")
        : c.healthError
          ? c.healthError
          : `HTTP ${c.healthStatus ?? "?"} • ${c.healthLatencyMs ?? 0}ms${c.healthContentType ? ` • ${c.healthContentType}` : ""}`,
    });
    items.push({
      key: "no-redirect",
      title: cp("itemNoRedirectTitle"),
      description: cp("itemNoRedirectDesc"),
      status: !c.healthChecked ? "todo" : (c.healthRedirect ? "error" : "success"),
      detail: !c.healthChecked
        ? cp("itemNoRedirectWaiting")
        : c.healthRedirect
          ? cp("itemNoRedirectReturned").replace("{status}", String(c.healthStatus))
          : cp("itemNoRedirectNone"),
    });
    items.push({
      key: "latency",
      title: cp("itemLatencyTitle"),
      description: cp("itemLatencyDesc"),
      status: !c.healthChecked
        ? "todo"
        : (c.healthError ? "error" : (c.healthUnderTimeout ? "success" : "warn")),
      detail: c.healthLatencyMs != null ? `${c.healthLatencyMs}ms` : cp("itemLatencyNotAvail"),
    });
    items.push({
      key: "api-key",
      title: cp("itemApiKeyTitle"),
      description: cp("itemApiKeyDesc"),
      status: s.apiKeyHint ? "success" : "todo",
      detail: s.apiKeyHint ? cp("itemApiKeySaved").replace("{hint}", s.apiKeyHint) : cp("itemApiKeyNotGen"),
    });
    items.push({
      key: "enabled",
      title: cp("itemEnabledTitle"),
      description: cp("itemEnabledDesc"),
      status: s.isEnabled ? "success" : "warn",
      detail: s.isEnabled ? cp("itemEnabledActive") : cp("itemEnabledInactive"),
    });
    return items;
  }, [data, t]);

  const sectionC: ChecklistItem[] = useMemo(() => {
    const s = data?.source;
    const c = data?.checks;
    const apiKeyOld = (data?.apiKeyAgeDays ?? 0) >= 90;
    const items: ChecklistItem[] = [];
    items.push({
      key: "ip-whitelist",
      title: cp("itemIpWhitelistTitle"),
      description: cp("itemIpWhitelistDesc"),
      status: "todo",
    });
    items.push({
      key: "key-storage",
      title: cp("itemKeyStorageTitle"),
      description: cp("itemKeyStorageDesc"),
      status: "todo",
    });
    items.push({
      key: "no-redirect",
      title: cp("itemCNoRedirectTitle"),
      description: cp("itemCNoRedirectDesc"),
      status: !c?.healthChecked ? "todo" : (c.healthRedirect ? "error" : "success"),
      detail: c?.healthChecked ? (c.healthRedirect ? cp("itemCNoRedirectReturned").replace("{status}", String(c.healthStatus)) : cp("itemCNoRedirectNone")) : undefined,
    });
    items.push({
      key: "rate-limit",
      title: cp("itemRateLimitTitle").replace("{n}", String(s?.rateLimitPerMin || 60)),
      description: cp("itemRateLimitDesc"),
      status: "todo",
    });
    items.push({
      key: "no-sensitive",
      title: cp("itemNoSensitiveTitle"),
      description: cp("itemNoSensitiveDesc"),
      status: "todo",
    });
    items.push({
      key: "audit-log",
      title: cp("itemAuditLogTitle"),
      description: cp("itemAuditLogDesc"),
      status: "todo",
    });
    items.push({
      key: "rotate-key",
      title: cp("itemRotateKeyTitle"),
      description: data?.apiKeyAgeDays != null ? cp("itemRotateKeyDescAge").replace("{n}", String(data.apiKeyAgeDays)) : cp("itemRotateKeyDescNoData"),
      status: data?.apiKeyAgeDays == null ? "todo" : (apiKeyOld ? "warn" : "success"),
    });
    return items;
  }, [data, t]);

  const totals = data?.totals;
  const totalItems = sectionA.length + (data?.intents.length || 0) + sectionC.length;
  const doneItems = sectionA.filter(x => x.status === "success").length
    + (data?.intents.filter(i => data.intentStatus[i.intentKey]?.lastStatus === "success").length || 0)
    + sectionC.filter(x => x.status === "success").length;
  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.source) {
    return (
      <div className="p-6 max-w-3xl mx-auto" data-testid="page-cds-checklist-empty">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              {cp("title")}
            </CardTitle>
            <CardDescription>
              {cp("emptyDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild data-testid="link-back-to-setup">
              <Link href="/dashboard/custom-data-source">
                <ArrowLeft className="w-4 h-4 mr-1" /> {cp("openSetup")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onCopyCurl = (intent: IntentRow) => {
    const text = buildCurl(data.source!, intent);
    navigator.clipboard.writeText(text).then(
      () => toast({ title: cp("toastCurlCopied"), description: cp("toastCurlCopiedDesc").replace("{key}", intent.intentKey) }),
      () => toast({ title: cp("toastCopyFailed"), variant: "destructive" }),
    );
  };

  const onCopyAllMarkdown = () => {
    const md = buildMarkdown(data, (k: string) => cp(`markdown.${k}`));
    navigator.clipboard.writeText(md).then(
      () => toast({ title: cp("toastChecklistCopied"), description: cp("toastChecklistCopiedDesc") }),
      () => toast({ title: cp("toastCopyFailed"), variant: "destructive" }),
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" data-testid="page-cds-checklist">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/dashboard/custom-data-source" data-testid="link-back">
              <ArrowLeft className="w-4 h-4 mr-1" /> {cp("back")}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            {cp("title")}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {cp("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onCopyAllMarkdown} data-testid="button-copy-markdown">
            <Copy className="w-4 h-4 mr-1" /> {cp("copyMarkdown")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/merchant/custom-data-source/postman.json" download data-testid="link-download-postman">
              <Download className="w-4 h-4 mr-1" /> {cp("postman")}
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/merchant/custom-data-source/docs.html" target="_blank" rel="noreferrer" data-testid="link-view-docs">
              <FileText className="w-4 h-4 mr-1" /> {cp("viewSpec")}
            </a>
          </Button>
        </div>
      </div>

      <Card data-testid="card-progress-summary">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-medium">{cp("progressTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {cp("progressCount").replace("{done}", String(doneItems)).replace("{total}", String(totalItems))}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> {cp("successCount").replace("{n}", String(totals?.successCount ?? 0))}
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                <XCircle className="w-3 h-3" /> {cp("errorCount").replace("{n}", String(totals?.errorCount ?? 0))}
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <Circle className="w-3 h-3" /> {cp("untestedCount").replace("{n}", String(totals?.untestedCount ?? 0))}
              </Badge>
            </div>
          </div>
          <Progress value={progressPct} data-testid="progress-overall" />
        </CardContent>
      </Card>

      <Card data-testid="card-section-a">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plug className="w-5 h-5 text-primary" />
            {cp("sectionATitle")}
          </CardTitle>
          <CardDescription>
            {cp("sectionADesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sectionA.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-3 p-3 rounded-md border"
              data-testid={`row-section-a-${item.key}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                {item.detail && (
                  <p className="text-xs mt-1 font-mono text-muted-foreground break-all">{item.detail}</p>
                )}
              </div>
              <StatusBadge
                status={item.status}
                labels={{ success: cp("stOk"), error: cp("stFailed"), warn: cp("stWarn"), todo: cp("stTodo") }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="card-section-b">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="w-5 h-5 text-primary" />
            {cp("sectionBTitle")}
          </CardTitle>
          <CardDescription>
            {cp("sectionBDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.intents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {cp("sectionBNoActivePre")}<Link href="/dashboard/custom-data-source" className="underline">{cp("sectionBNoActiveLink")}</Link>{cp("sectionBNoActivePost")}
            </p>
          ) : (
            <Accordion
              type="multiple"
              value={openItems}
              onValueChange={setOpenItems}
              className="w-full"
            >
              {data.intents.map((intent) => {
                const st = data.intentStatus[intent.intentKey];
                const status: Status = st?.lastStatus === "success"
                  ? "success"
                  : st?.lastStatus === "error"
                    ? "error"
                    : "todo";
                const isTesting = testingKey === intent.intentKey;
                return (
                  <AccordionItem
                    key={intent.intentKey}
                    value={intent.intentKey}
                    data-testid={`accordion-intent-${intent.intentKey}`}
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between gap-3 flex-1 pr-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className="font-mono shrink-0">{intent.intentKey}</Badge>
                          <span className="text-sm font-medium truncate text-left">{intent.name}</span>
                        </div>
                        <StatusBadge
                          status={status}
                          labels={{
                            success: `${cp("stSuccess")}${st?.lastHttpStatus ? ` ${st.lastHttpStatus}` : ""}`,
                            error: `${cp("stFailed")}${st?.lastHttpStatus ? ` ${st.lastHttpStatus}` : ""}`,
                            todo: cp("stUntested"),
                          }}
                        />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {intent.description && (
                        <p className="text-sm text-muted-foreground">{intent.description}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-md border space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">{cp("endpointToBuild")}</p>
                          <p className="font-mono text-sm break-all">{intent.httpMethod} {intent.endpointPath || cp("notFilled")}</p>
                        </div>
                        <div className="p-3 rounded-md border space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">{cp("lastTest")}</p>
                          {st?.lastRunAt ? (
                            <>
                              <p className="text-sm">
                                {st.lastStatus === "success" ? cp("stSuccess") : cp("stFailed")} • HTTP {st.lastHttpStatus ?? "-"} • {st.lastLatencyMs ?? 0}ms
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(st.lastRunAt).toLocaleString("id-ID")}
                              </p>
                              {st.lastErrorMessage && (
                                <p className="text-xs text-red-700 dark:text-red-400 mt-1">{st.lastErrorMessage}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">{cp("neverTested")}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium">{cp("todoForDev")}</p>
                        <ul className="space-y-1 text-sm pl-1">
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>{cp("todo1").split("{method}")[0]}<span className="font-mono">{intent.httpMethod} {intent.endpointPath}</span>{cp("todo1").split("{path}")[1] ?? ""}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>
                              {cp("todo2Pre")}<span className="font-mono">{data.source?.headerAuthName || "X-API-Key"}</span>{cp("todo2Post")}
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>
                              {cp("todo3Pre")}
                              {intent.requiredFields?.length ? (
                                intent.requiredFields.map((f, i) => (
                                  <span key={f.key}>
                                    <span className="font-mono">{f.key}</span>
                                    {f.type ? <span className="text-muted-foreground"> ({f.type})</span> : null}
                                    {i < intent.requiredFields.length - 1 ? ", " : ""}
                                  </span>
                                ))
                              ) : <span className="text-muted-foreground">{cp("todo3Empty")}</span>}
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>
                              {cp("todo4Pre")}
                              <span className="font-mono break-all">{intent.responseTemplate || cp("todo4Empty")}</span>
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>{cp("todo5")}</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <Button
                          size="sm"
                          onClick={() => { setTestingKey(intent.intentKey); testIntent.mutate(intent.intentKey); }}
                          disabled={isTesting || testIntent.isPending}
                          data-testid={`button-test-intent-${intent.intentKey}`}
                        >
                          {isTesting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                          {cp("testNow")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCopyCurl(intent)}
                          data-testid={`button-copy-curl-${intent.intentKey}`}
                        >
                          <Copy className="w-4 h-4 mr-1" /> {cp("copyCurl")}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-section-c">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {cp("sectionCTitle")}
          </CardTitle>
          <CardDescription>
            {cp("sectionCDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sectionC.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-3 p-3 rounded-md border"
              data-testid={`row-section-c-${item.key}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                {item.detail && (
                  <p className="text-xs mt-1 text-muted-foreground">{item.detail}</p>
                )}
              </div>
              <StatusBadge
                status={item.status}
                labels={{ success: cp("stOk"), error: cp("stFailed"), warn: cp("stWarn"), todo: cp("stManual") }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <p className="text-xs text-muted-foreground text-center">
        {cp("bottomNote")}
      </p>
    </div>
  );
}
