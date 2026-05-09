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
  ArrowLeft, CheckCircle2, Circle, AlertTriangle, Loader2, Play, Copy,
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

interface IntegrationStatus {
  source: SourceRow | null;
  intents: IntentRow[];
  intentStatus: Record<string, IntentStatus>;
  totals: {
    intents: number;
    enabledIntents: number;
    successCount: number;
    errorCount: number;
    untestedCount: number;
  };
  apiKeyAgeDays: number | null;
}

type Status = "done" | "todo" | "warn";

function StatusBadge({ status, doneLabel = "Selesai", todoLabel = "Belum", warnLabel = "Perlu perhatian" }: {
  status: Status;
  doneLabel?: string;
  todoLabel?: string;
  warnLabel?: string;
}) {
  if (status === "done") {
    return (
      <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="w-3 h-3" /> {doneLabel}
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
  path = path.replace(/\{([\w]+)\}/g, (_m, key) => {
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
  lines.push("# Checklist Integrasi Panel API — Chatvice Custom Data Source", "");
  lines.push("## A. Persyaratan Dasar Panel", "");
  lines.push(`- [${data.source?.baseUrl ? "x" : " "}] Base URL panel telah dikonfigurasi (HTTPS, dapat diakses publik)`);
  lines.push(`- [${data.source?.apiKeyHint ? "x" : " "}] API key Chatvice telah di-generate dan dipasang di panel`);
  lines.push(`- [${data.source?.healthPath ? "x" : " "}] Endpoint health-check (\`${data.source?.healthPath || "/health"}\`) merespons HTTP 200`);
  lines.push(`- [${data.source?.isEnabled ? "x" : " "}] Koneksi diaktifkan dari dashboard Chatvice`);
  lines.push(`- [ ] Header autentikasi yang dipakai panel = \`${data.source?.headerAuthName || "X-API-Key"}\``);
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
  lines.push(`- [ ] Endpoint TIDAK pernah merespons dengan HTTP 3xx redirect`);
  lines.push(`- [ ] Rate-limit di sisi panel ≥ ${data.source?.rateLimitPerMin || 60} request/menit per merchant`);
  lines.push(`- [ ] Field sensitif (PIN, password, OTP) tidak pernah dikembalikan`);
  lines.push(`- [ ] Audit log internal menyimpan setiap pemanggilan dari Chatvice`);
  lines.push(`- [ ] API key dirotasi minimal setiap 90 hari (umur saat ini: ${data.apiKeyAgeDays ?? "?"} hari)`);
  return lines.join("\n");
}

export default function CustomDataSourceChecklistPage() {
  const { toast } = useToast();
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const { data, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/merchant/custom-data-source/integration-status"],
  });

  const testIntent = useMutation({
    mutationFn: async (intentKey: string) => {
      const res = await apiRequest("POST", "/api/merchant/custom-data-source/test", { intentKey });
      return res.json() as Promise<{ ok: boolean; status: number; latencyMs: number; sample?: string; error?: string }>;
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
    onError: (err: any) => {
      toast({ title: "Tes gagal", description: err?.message || "Network error", variant: "destructive" });
    },
    onSettled: () => setTestingKey(null),
  });

  const sectionA = useMemo(() => {
    const s = data?.source;
    return [
      {
        key: "base-url",
        title: "Base URL panel telah dikonfigurasi",
        description: "URL dasar API panel Anda — wajib HTTPS untuk production.",
        status: (s?.baseUrl ? "done" : "todo") as Status,
        detail: s?.baseUrl || "Belum diisi",
      },
      {
        key: "api-key",
        title: "API key Chatvice telah di-generate",
        description: "Pasang key ini di server panel Anda dan validasi di tiap request.",
        status: (s?.apiKeyHint ? "done" : "todo") as Status,
        detail: s?.apiKeyHint ? `Tersimpan (hint: ${s.apiKeyHint})` : "Belum di-generate",
      },
      {
        key: "health-path",
        title: "Health-check endpoint dikonfigurasi",
        description: "Path yang merespons HTTP 200 untuk verifikasi koneksi.",
        status: (s?.healthPath ? "done" : "todo") as Status,
        detail: s?.healthPath || "Belum diisi",
      },
      {
        key: "header-auth",
        title: "Header autentikasi telah disepakati",
        description: "Nama header yang dipakai Chatvice saat mengirim API key.",
        status: (s?.headerAuthName ? "done" : "todo") as Status,
        detail: s?.headerAuthName || "(default: X-API-Key)",
      },
      {
        key: "enabled",
        title: "Koneksi diaktifkan",
        description: "AI agent baru memanggil panel API saat opsi ini aktif.",
        status: (s?.isEnabled ? "done" : "warn") as Status,
        detail: s?.isEnabled ? "Aktif" : "Tidak aktif — AI tidak akan memanggil panel",
      },
    ];
  }, [data]);

  const sectionC = useMemo(() => {
    const s = data?.source;
    const apiKeyOld = (data?.apiKeyAgeDays ?? 0) >= 90;
    return [
      {
        key: "ip-whitelist",
        title: "Panel API membatasi sumber IP (opsional tapi disarankan)",
        description: "Whitelist IP server Chatvice di firewall panel.",
        status: "todo" as Status,
      },
      {
        key: "key-storage",
        title: "API key disimpan terenkripsi di panel",
        description: "Jangan commit ke repository. Gunakan secret manager atau env var.",
        status: "todo" as Status,
      },
      {
        key: "no-redirect",
        title: "Endpoint tidak pernah merespons HTTP 3xx",
        description: "Chatvice menolak redirect untuk mencegah SSRF — respons harus langsung.",
        status: "todo" as Status,
      },
      {
        key: "rate-limit",
        title: `Panel mendukung rate limit ≥ ${s?.rateLimitPerMin || 60} request/menit`,
        description: "Sesuaikan dengan setting rate limit Chatvice di tab Pengaturan.",
        status: "todo" as Status,
      },
      {
        key: "no-sensitive",
        title: "Field sensitif tidak dikembalikan ke AI",
        description: "PIN, password, OTP, token — wajib di-mask di sisi panel.",
        status: "todo" as Status,
      },
      {
        key: "audit-log",
        title: "Panel mencatat setiap panggilan dari Chatvice",
        description: "Untuk audit trail dan investigasi anomali.",
        status: "todo" as Status,
      },
      {
        key: "rotate-key",
        title: "API key dirotasi setidaknya tiap 90 hari",
        description: data?.apiKeyAgeDays != null ? `Umur saat ini: ${data.apiKeyAgeDays} hari` : "Belum tersedia data umur key.",
        status: (apiKeyOld ? "warn" : (data?.apiKeyAgeDays != null ? "done" : "todo")) as Status,
      },
    ];
  }, [data]);

  const totals = data?.totals;
  const totalItems = sectionA.length + (data?.intents.length || 0) + sectionC.length;
  const doneItems = sectionA.filter(x => x.status === "done").length
    + (data?.intents.filter(i => data.intentStatus[i.intentKey]?.lastStatus === "success").length || 0)
    + sectionC.filter(x => x.status === "done").length;
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
            Berikan halaman ini kepada developer panel Anda. Semua TODO yang harus diimplementasikan agar AI agent Chatvice bisa membaca data realtime dari panel ada di sini.
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
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle className="w-3 h-3" /> {totals?.errorCount ?? 0} gagal
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
            Konfigurasi dasar yang wajib ada sebelum panel bisa terhubung dengan Chatvice.
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
                <p className="text-xs mt-1 font-mono text-muted-foreground break-all">{item.detail}</p>
              </div>
              <StatusBadge status={item.status} />
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
            Tiap intent di bawah ini butuh endpoint di panel Anda. Klik "Tes Sekarang" untuk memvalidasi atau "Salin cURL" untuk dipakai developer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.intents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada intent. Tambahkan dari halaman <Link href="/dashboard/custom-data-source" className="underline">Custom Data Source</Link> tab Intent Lookup.
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
                const status: Status = st?.lastStatus === "success" ? "done"
                  : st?.lastStatus === "error" ? "warn"
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
                          {!intent.isEnabled && (
                            <Badge variant="outline" className="text-xs shrink-0">Nonaktif</Badge>
                          )}
                        </div>
                        <StatusBadge
                          status={status}
                          doneLabel={`Sukses${st?.lastHttpStatus ? ` ${st.lastHttpStatus}` : ""}`}
                          warnLabel={`Gagal${st?.lastHttpStatus ? ` ${st.lastHttpStatus}` : ""}`}
                          todoLabel="Belum diuji"
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
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{st.lastErrorMessage}</p>
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
              </div>
              <StatusBadge status={item.status} />
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
