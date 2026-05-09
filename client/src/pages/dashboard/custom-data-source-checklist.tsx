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
  const successLabel = labels?.success ?? "Selesai";
  const errorLabel = labels?.error ?? "Gagal";
  const warnLabel = labels?.warn ?? "Perlu perhatian";
  const todoLabel = labels?.todo ?? "Belum";
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
    <Badge variant="outline" className="gap-1">
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

function buildMarkdown(data: IntegrationStatus): string {
  const lines: string[] = [];
  const c = data.checks;
  const mk = (b: boolean) => (b ? "x" : " ");
  lines.push("# Checklist Integrasi Panel API — Chatvice Custom Data Source", "");
  lines.push("## A. Persyaratan Dasar Panel", "");
  lines.push(`- [${mk(!!c?.baseUrlPresent && !!c?.baseUrlValid && !!c?.baseUrlIsHttps)}] Base URL panel valid & HTTPS`);
  lines.push(`- [${mk(!!c?.hostIsPublic)}] Host panel dapat diakses publik (bukan IP private/loopback)`);
  lines.push(`- [${mk(!!c?.healthOk && !!c?.healthIsJson)}] Endpoint \`${data.source?.healthPath || "/health"}\` merespons HTTP 200 dengan JSON`);
  lines.push(`- [${mk(!!c && c.healthChecked && !c.healthRedirect)}] Endpoint health-check tidak mengembalikan HTTP 3xx redirect`);
  lines.push(`- [${mk(!!c?.healthChecked && !!c?.healthUnderTimeout && !c?.healthError)}] Health-check selesai di bawah 10 detik tanpa error jaringan`);
  lines.push(`- [${mk(!!data.source?.apiKeyHint)}] API key Chatvice telah di-generate dan dipasang di panel`);
  lines.push(`- [${mk(!!data.source?.isEnabled)}] Koneksi diaktifkan dari dashboard Chatvice`);
  lines.push("");
  lines.push("## B. TODO per Intent Aktif", "");
  for (const intent of data.intents) {
    const st = data.intentStatus[intent.intentKey];
    const mark = st?.lastStatus === "success" ? "x" : " ";
    lines.push(`### ${intent.name} (\`${intent.intentKey}\`)`);
    lines.push(`- Status terakhir: **${st?.lastStatus || "untested"}**${st?.lastHttpStatus ? ` (HTTP ${st.lastHttpStatus})` : ""}`);
    lines.push(`- Endpoint: \`${intent.httpMethod} ${intent.endpointPath}\``);
    lines.push(`- [${mark}] Implementasikan endpoint di panel`);
    lines.push(`- [ ] Endpoint mengembalikan JSON dengan field: ${(intent.requiredFields || []).map(f => `\`${f.key}\``).join(", ") || "(belum ada field)"}`);
    lines.push(`- [ ] Endpoint memvalidasi API key di header \`${data.source?.headerAuthName || "X-API-Key"}\``);
    lines.push(`- [ ] Endpoint merespons di bawah 5 detik`);
    lines.push("");
  }
  lines.push("## C. Aturan Keamanan & Operasional", "");
  lines.push("- [ ] Panel API hanya menerima koneksi dari IP/server Chatvice (whitelist opsional)");
  lines.push(`- [ ] API key disimpan terenkripsi di panel (jangan commit ke repo)`);
  lines.push(`- [${mk(!!c && c.healthChecked && !c.healthRedirect)}] Endpoint TIDAK pernah merespons dengan HTTP 3xx redirect`);
  lines.push(`- [ ] Rate-limit di sisi panel ≥ ${data.source?.rateLimitPerMin || 60} request/menit per merchant`);
  lines.push(`- [ ] Field sensitif (PIN, password, OTP) tidak pernah dikembalikan`);
  lines.push(`- [ ] Audit log internal menyimpan setiap pemanggilan dari Chatvice`);
  lines.push(`- [${mk((data.apiKeyAgeDays ?? 9999) < 90)}] API key dirotasi minimal setiap 90 hari (umur saat ini: ${data.apiKeyAgeDays ?? "?"} hari)`);
  return lines.join("\n");
}

export default function CustomDataSourceChecklistPage() {
  const { toast } = useToast();
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
        toast({ title: "Tes sukses", description: `${intentKey}: HTTP ${result.status} • ${result.latencyMs}ms` });
      } else {
        toast({ title: "Tes gagal", description: result.error || `HTTP ${result.status}`, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source/integration-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source/audit"] });
    },
    onError: (err: Error) => {
      toast({ title: "Tes gagal", description: err?.message || "Network error", variant: "destructive" });
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
      title: "Base URL panel valid & HTTPS",
      description: "URL dasar API panel — wajib HTTPS dan dapat diparsing dengan benar.",
      status: !c.baseUrlPresent ? "todo" : (c.baseUrlValid && c.baseUrlIsHttps ? "success" : "error"),
      detail: !c.baseUrlPresent
        ? "Belum diisi"
        : c.baseUrlError
          ? `${s.baseUrl} — ${c.baseUrlError}`
          : !c.baseUrlIsHttps
            ? `${s.baseUrl} — HTTPS wajib di production`
            : s.baseUrl,
    });
    items.push({
      key: "host-public",
      title: "Host panel dapat diakses publik",
      description: "Bukan IP private, loopback, atau metadata — Chatvice menolak resolve seperti ini untuk SSRF.",
      status: !c.baseUrlPresent ? "todo" : (c.hostIsPublic ? "success" : "error"),
      detail: c.hostError ?? (c.hostIsPublic ? "Host publik terverifikasi" : "Belum diverifikasi"),
    });
    items.push({
      key: "health-200",
      title: `Endpoint ${s.healthPath || "/health"} merespons HTTP 200 dengan JSON`,
      description: "Chatvice memanggil endpoint ini untuk verifikasi koneksi.",
      status: !c.healthChecked
        ? "todo"
        : (c.healthOk && c.healthIsJson)
          ? "success"
          : c.healthOk
            ? "warn"
            : "error",
      detail: !c.healthChecked
        ? "Belum diuji (lengkapi base URL & host publik dulu)"
        : c.healthError
          ? c.healthError
          : `HTTP ${c.healthStatus ?? "?"} • ${c.healthLatencyMs ?? 0}ms${c.healthContentType ? ` • ${c.healthContentType}` : ""}`,
    });
    items.push({
      key: "no-redirect",
      title: "Health-check tidak mengembalikan HTTP 3xx redirect",
      description: "Chatvice tidak akan mengikuti redirect — panel API harus merespons langsung.",
      status: !c.healthChecked ? "todo" : (c.healthRedirect ? "error" : "success"),
      detail: !c.healthChecked
        ? "Menunggu hasil tes"
        : c.healthRedirect
          ? `Endpoint mengembalikan HTTP ${c.healthStatus}`
          : "Tidak ada redirect",
    });
    items.push({
      key: "latency",
      title: "Respons di bawah 10 detik",
      description: "Chatvice timeout di 10 detik. Disarankan respons normal di bawah 5 detik.",
      status: !c.healthChecked
        ? "todo"
        : (c.healthError ? "error" : (c.healthUnderTimeout ? "success" : "warn")),
      detail: c.healthLatencyMs != null ? `${c.healthLatencyMs}ms` : "Belum tersedia",
    });
    items.push({
      key: "api-key",
      title: "API key Chatvice telah di-generate",
      description: "Pasang key ini di server panel Anda dan validasi di tiap request.",
      status: s.apiKeyHint ? "success" : "todo",
      detail: s.apiKeyHint ? `Tersimpan (hint: ${s.apiKeyHint})` : "Belum di-generate — gunakan tombol Generate di tab Pengaturan",
    });
    items.push({
      key: "enabled",
      title: "Koneksi diaktifkan",
      description: "AI agent baru memanggil panel API saat opsi ini aktif.",
      status: s.isEnabled ? "success" : "warn",
      detail: s.isEnabled ? "Aktif" : "Tidak aktif — AI tidak akan memanggil panel",
    });
    return items;
  }, [data]);

  const sectionC: ChecklistItem[] = useMemo(() => {
    const s = data?.source;
    const c = data?.checks;
    const apiKeyOld = (data?.apiKeyAgeDays ?? 0) >= 90;
    const items: ChecklistItem[] = [];
    items.push({
      key: "ip-whitelist",
      title: "Panel API membatasi sumber IP (opsional tapi disarankan)",
      description: "Whitelist IP server Chatvice di firewall panel.",
      status: "todo",
    });
    items.push({
      key: "key-storage",
      title: "API key disimpan terenkripsi di panel",
      description: "Jangan commit ke repository. Gunakan secret manager atau env var.",
      status: "todo",
    });
    items.push({
      key: "no-redirect",
      title: "Endpoint tidak pernah merespons HTTP 3xx",
      description: "Chatvice menolak redirect untuk mencegah SSRF — respons harus langsung.",
      status: !c?.healthChecked ? "todo" : (c.healthRedirect ? "error" : "success"),
      detail: c?.healthChecked ? (c.healthRedirect ? `Health-check mengembalikan HTTP ${c.healthStatus}` : "Verifikasi health-check menunjukkan tidak ada redirect") : undefined,
    });
    items.push({
      key: "rate-limit",
      title: `Panel mendukung rate limit ≥ ${s?.rateLimitPerMin || 60} request/menit`,
      description: "Sesuaikan dengan setting rate limit Chatvice di tab Pengaturan.",
      status: "todo",
    });
    items.push({
      key: "no-sensitive",
      title: "Field sensitif tidak dikembalikan ke AI",
      description: "PIN, password, OTP, token — wajib di-mask di sisi panel.",
      status: "todo",
    });
    items.push({
      key: "audit-log",
      title: "Panel mencatat setiap panggilan dari Chatvice",
      description: "Untuk audit trail dan investigasi anomali.",
      status: "todo",
    });
    items.push({
      key: "rotate-key",
      title: "API key dirotasi setidaknya tiap 90 hari",
      description: data?.apiKeyAgeDays != null ? `Umur saat ini: ${data.apiKeyAgeDays} hari` : "Belum tersedia data umur key.",
      status: data?.apiKeyAgeDays == null ? "todo" : (apiKeyOld ? "warn" : "success"),
    });
    return items;
  }, [data]);

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
              Checklist Integrasi Panel API
            </CardTitle>
            <CardDescription>
              Anda belum mengatur Custom Data Source. Selesaikan setup lebih dulu untuk melihat checklist integrasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild data-testid="link-back-to-setup">
              <Link href="/dashboard/custom-data-source">
                <ArrowLeft className="w-4 h-4 mr-1" /> Buka halaman setup
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
      () => toast({ title: "cURL tersalin", description: `Contoh request untuk ${intent.intentKey}` }),
      () => toast({ title: "Gagal menyalin", variant: "destructive" }),
    );
  };

  const onCopyAllMarkdown = () => {
    const md = buildMarkdown(data);
    navigator.clipboard.writeText(md).then(
      () => toast({ title: "Checklist tersalin", description: "Tempel ke ticket / dokumentasi developer panel Anda." }),
      () => toast({ title: "Gagal menyalin", variant: "destructive" }),
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" data-testid="page-cds-checklist">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/dashboard/custom-data-source" data-testid="link-back">
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Custom Data Source
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Checklist Integrasi Panel API
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Berikan halaman ini kepada developer panel Anda. Semua TODO yang harus diimplementasikan agar AI agent Chatvice bisa membaca data realtime dari panel ada di sini. Status diperbarui otomatis dari hasil tes koneksi & audit log.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onCopyAllMarkdown} data-testid="button-copy-markdown">
            <Copy className="w-4 h-4 mr-1" /> Salin semua TODO (Markdown)
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/merchant/custom-data-source/postman.json" download data-testid="link-download-postman">
              <Download className="w-4 h-4 mr-1" /> Postman
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/merchant/custom-data-source/docs.html" target="_blank" rel="noreferrer" data-testid="link-view-docs">
              <FileText className="w-4 h-4 mr-1" /> Lihat Spec
            </a>
          </Button>
        </div>
      </div>

      <Card data-testid="card-progress-summary">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-medium">Progress integrasi</p>
              <p className="text-xs text-muted-foreground">
                {doneItems} dari {totalItems} item selesai
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> {totals?.successCount ?? 0} sukses
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                <XCircle className="w-3 h-3" /> {totals?.errorCount ?? 0} gagal
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Circle className="w-3 h-3" /> {totals?.untestedCount ?? 0} belum diuji
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
            A. Persyaratan Dasar Panel
          </CardTitle>
          <CardDescription>
            Verifikasi otomatis: Chatvice memanggil endpoint health-check Anda saat halaman ini dibuka untuk memvalidasi koneksi.
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
                labels={{ success: "OK", error: "Gagal", warn: "Perhatian", todo: "Belum" }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="card-section-b">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="w-5 h-5 text-primary" />
            B. TODO per Intent Aktif
          </CardTitle>
          <CardDescription>
            Hanya intent yang diaktifkan ditampilkan di sini. Klik "Tes Sekarang" untuk memvalidasi atau "Salin cURL" untuk dipakai developer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.intents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada intent aktif. Aktifkan dari halaman <Link href="/dashboard/custom-data-source" className="underline">Custom Data Source</Link> tab Intent Lookup.
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
                            success: `Sukses${st?.lastHttpStatus ? ` ${st.lastHttpStatus}` : ""}`,
                            error: `Gagal${st?.lastHttpStatus ? ` ${st.lastHttpStatus}` : ""}`,
                            todo: "Belum diuji",
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
                          <p className="text-xs font-medium text-muted-foreground">Endpoint yang harus dibuat</p>
                          <p className="font-mono text-sm break-all">{intent.httpMethod} {intent.endpointPath || "(belum diisi)"}</p>
                        </div>
                        <div className="p-3 rounded-md border space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Tes terakhir</p>
                          {st?.lastRunAt ? (
                            <>
                              <p className="text-sm">
                                {st.lastStatus === "success" ? "Sukses" : "Gagal"} • HTTP {st.lastHttpStatus ?? "-"} • {st.lastLatencyMs ?? 0}ms
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(st.lastRunAt).toLocaleString("id-ID")}
                              </p>
                              {st.lastErrorMessage && (
                                <p className="text-xs text-red-700 dark:text-red-400 mt-1">{st.lastErrorMessage}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">Belum pernah diuji</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium">TODO untuk developer panel:</p>
                        <ul className="space-y-1 text-sm pl-1">
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>Implementasikan handler <span className="font-mono">{intent.httpMethod} {intent.endpointPath}</span> di panel.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>
                              Validasi API key dari header <span className="font-mono">{data.source?.headerAuthName || "X-API-Key"}</span> sebelum proses request.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>
                              Terima parameter:{" "}
                              {intent.requiredFields?.length ? (
                                intent.requiredFields.map((f, i) => (
                                  <span key={f.key}>
                                    <span className="font-mono">{f.key}</span>
                                    {f.type ? <span className="text-muted-foreground"> ({f.type})</span> : null}
                                    {i < intent.requiredFields.length - 1 ? ", " : ""}
                                  </span>
                                ))
                              ) : <span className="text-muted-foreground">(belum ada field — tambahkan di Intent Lookup)</span>}
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>
                              Kembalikan JSON yang berisi key yang dipakai di template:{" "}
                              <span className="font-mono break-all">{intent.responseTemplate || "(template belum diisi)"}</span>
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 shrink-0 text-muted-foreground" />
                            <span>Pastikan respons di bawah 5 detik (Chatvice timeout di 10 detik) dan bukan HTTP 3xx redirect.</span>
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
                          Tes Sekarang
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCopyCurl(intent)}
                          data-testid={`button-copy-curl-${intent.intentKey}`}
                        >
                          <Copy className="w-4 h-4 mr-1" /> Salin cURL
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
            C. Aturan Keamanan & Operasional
          </CardTitle>
          <CardDescription>
            Praktik wajib agar koneksi panel API tetap aman dan stabil di production.
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
                labels={{ success: "OK", error: "Gagal", warn: "Perhatian", todo: "Manual" }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <p className="text-xs text-muted-foreground text-center">
        Butuh contoh implementasi? Unduh Postman collection di atas — sudah berisi contoh request siap pakai untuk semua intent Anda.
      </p>
    </div>
  );
}
