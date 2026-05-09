import { useState } from "react";
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
import { Database, Key, RefreshCw, Plug, Plus, Trash2, Pencil, Download, FileText, CheckCircle2, AlertCircle, Loader2, Copy } from "lucide-react";

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
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newPlainKey, setNewPlainKey] = useState<string | null>(null);
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
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tersimpan", description: "Konfigurasi panel API berhasil disimpan." });
      setForm({});
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-source"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-intents"] });
    },
    onError: () => toast({ title: "Gagal menyimpan", variant: "destructive" }),
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
    onError: () => toast({ title: "Gagal generate API key", variant: "destructive" }),
  });

  const testConn = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/custom-data-source/test", {});
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast({
        title: data.ok ? "Koneksi berhasil" : "Koneksi gagal",
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
      toast({ title: "Intent tersimpan" });
      setIntentDialogOpen(false);
      setEditingIntent(null);
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-intents"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err?.message, variant: "destructive" }),
  });

  const deleteIntent = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/merchant/custom-data-intents/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Intent dihapus" });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/custom-data-intents"] });
    },
  });

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast({ title: "Tersalin" });
  };

  const openNewIntent = () => {
    setEditingIntent(blankIntent());
    setIntentDialogOpen(true);
  };
  const openEditIntent = (i: CustomDataIntent) => {
    setEditingIntent({ ...i, requiredFields: Array.isArray(i.requiredFields) ? i.requiredFields : [] });
    setIntentDialogOpen(true);
  };

  if (srcLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto" data-testid="page-custom-data-source">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Custom Data Source
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hubungkan AI agent ke panel backend Anda agar bisa cek data realtime (status deposit, withdraw, turnover, IP login, dll).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/merchant/custom-data-source/postman.json" download data-testid="link-download-postman">
              <Download className="w-4 h-4 mr-1" /> Postman
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/api/merchant/custom-data-source/docs.html" target="_blank" rel="noreferrer" data-testid="link-view-docs">
              <FileText className="w-4 h-4 mr-1" /> Spec API
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings" data-testid="tab-settings">Pengaturan</TabsTrigger>
          <TabsTrigger value="intents" data-testid="tab-intents">Intent Lookup</TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">Riwayat Panggilan</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Koneksi Panel API</CardTitle>
              <CardDescription>Endpoint, autentikasi, dan kontrol cache/rate limit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-md border">
                <div>
                  <Label>Aktifkan koneksi</Label>
                  <p className="text-xs text-muted-foreground">AI baru akan memanggil panel API saat opsi ini aktif.</p>
                </div>
                <Switch
                  checked={!!merged.isEnabled}
                  onCheckedChange={(v) => setForm({ ...form, isEnabled: v })}
                  data-testid="switch-enabled"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nama</Label>
                  <Input
                    value={merged.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Panel Member API"
                    data-testid="input-source-name"
                  />
                </div>
                <div>
                  <Label>Base URL</Label>
                  <Input
                    value={merged.baseUrl || ""}
                    onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                    placeholder="https://panel.example.com/api/v1"
                    data-testid="input-base-url"
                  />
                </div>
                <div>
                  <Label>Header autentikasi</Label>
                  <Input
                    value={merged.headerAuthName || "X-API-Key"}
                    onChange={(e) => setForm({ ...form, headerAuthName: e.target.value })}
                    placeholder="X-API-Key"
                    data-testid="input-header-name"
                  />
                </div>
                <div>
                  <Label>Path health-check</Label>
                  <Input
                    value={merged.healthPath || "/health"}
                    onChange={(e) => setForm({ ...form, healthPath: e.target.value })}
                    placeholder="/health"
                    data-testid="input-health-path"
                  />
                </div>
                <div>
                  <Label>Cache TTL (detik)</Label>
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
                  <Label>Rate limit (per menit)</Label>
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
                  Simpan
                </Button>
                <Button variant="outline" onClick={() => testConn.mutate()} disabled={testConn.isPending || !source} data-testid="button-test-connection">
                  {testConn.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  Tes koneksi
                </Button>
              </div>
              {testResult && (
                <div className={`p-3 rounded-md border text-sm ${testResult.ok ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30"}`}>
                  <div className="flex items-center gap-2 font-medium">
                    {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                    {testResult.ok ? "Sukses" : "Gagal"} • Status {testResult.status} • {testResult.latencyMs}ms
                  </div>
                  {testResult.sample && <pre className="text-xs mt-2 overflow-auto max-h-32">{testResult.sample}</pre>}
                  {testResult.error && <p className="text-xs mt-2 text-amber-700 dark:text-amber-300">{testResult.error}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> API Key</CardTitle>
              <CardDescription>Chatvice mengirim key ini di header autentikasi setiap request. Simpan plaintext di server panel Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input value={source?.apiKeyHint ? `cv_live_…${source.apiKeyHint.replace(/^…/, "")}` : "Belum di-generate"} readOnly className="font-mono" data-testid="text-api-key-hint" />
                <Button variant="outline" onClick={() => rotateKey.mutate()} disabled={rotateKey.isPending} data-testid="button-rotate-key">
                  {rotateKey.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Generate / Rotate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Key plaintext hanya tampil <strong>satu kali</strong> setelah di-generate. Setelah itu Anda hanya bisa rotate ulang.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Intent yang dideteksi AI</h2>
              <p className="text-sm text-muted-foreground">Tiap intent memetakan kata kunci pertanyaan customer ke endpoint panel Anda.</p>
            </div>
            <Button onClick={openNewIntent} data-testid="button-add-intent" disabled={!source}>
              <Plus className="w-4 h-4 mr-1" /> Tambah Intent
            </Button>
          </div>
          {!source && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Simpan koneksi panel API terlebih dahulu pada tab Pengaturan.
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
                      {!i.isEnabled && <Badge variant="secondary">Nonaktif</Badge>}
                    </div>
                    {i.description && <p className="text-sm text-muted-foreground mt-1">{i.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-mono">{i.httpMethod} {i.endpointPath}</span>
                    </p>
                    {i.triggerKeywords && (
                      <p className="text-xs mt-1"><span className="text-muted-foreground">Triggers:</span> {i.triggerKeywords}</p>
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
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Hapus intent ini?")) deleteIntent.mutate(i.id); }} data-testid={`button-delete-intent-${i.id}`}>
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
              <CardTitle>Riwayat Panggilan API</CardTitle>
              <CardDescription>50 panggilan terakhir. Field input customer otomatis di-mask demi keamanan.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-auto space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={auditIntentFilter}
                  onChange={(e) => setAuditIntentFilter(e.target.value)}
                  className="text-xs border rounded-md px-2 py-1 bg-background"
                  data-testid="select-audit-intent"
                >
                  <option value="all">Semua Intent</option>
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
                  <option value="all">Semua Status</option>
                  <option value="success">Sukses (2xx)</option>
                  <option value="error">Gagal</option>
                </select>
                <span className="text-xs text-muted-foreground">{filteredAudit.length} dari {audit.length}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Field (masked)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudit.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">Belum ada panggilan.</TableCell></TableRow>
                  )}
                  {filteredAudit.map((a) => {
                    const masked = a.maskedFields
                      ? Object.entries(a.maskedFields).map(([k, v]) => `${k}=${v}`).join(", ")
                      : "—";
                    return (
                    <TableRow key={a.id} data-testid={`row-audit-${a.id}`}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(a.createdAt).toLocaleString("id-ID")}</TableCell>
                      <TableCell className="font-mono text-xs">{a.intentKey}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[240px] truncate" title={a.endpointUrl}>{a.endpointUrl}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate" title={masked}>{masked}</TableCell>
                      <TableCell>
                        {a.httpStatus ? (
                          <Badge variant={a.httpStatus >= 200 && a.httpStatus < 300 ? "outline" : "secondary"}>{a.httpStatus}</Badge>
                        ) : (
                          <Badge variant="secondary">err</Badge>
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
            <DialogTitle>API Key Baru</DialogTitle>
            <DialogDescription>Salin sekarang — key ini tidak akan ditampilkan lagi setelah dialog ditutup.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input value={newPlainKey || ""} readOnly className="font-mono" data-testid="text-new-api-key" />
            <Button size="icon" variant="outline" onClick={() => newPlainKey && copy(newPlainKey)} data-testid="button-copy-new-key">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowKeyDialog(false); setNewPlainKey(null); }} data-testid="button-close-key-dialog">
              Saya sudah simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Intent editor dialog */}
      <Dialog open={intentDialogOpen} onOpenChange={(v) => { setIntentDialogOpen(v); if (!v) setEditingIntent(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingIntent?.id ? "Edit Intent" : "Intent Baru"}</DialogTitle>
            <DialogDescription>Pemetaan dari pertanyaan customer ke endpoint panel Anda.</DialogDescription>
          </DialogHeader>
          {editingIntent && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Intent Key</Label>
                  <Input
                    value={editingIntent.intentKey || ""}
                    onChange={(e) => setEditingIntent({ ...editingIntent, intentKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                    placeholder="deposit_status"
                    disabled={!!editingIntent.id}
                    data-testid="input-intent-key"
                  />
                </div>
                <div>
                  <Label>Nama</Label>
                  <Input
                    value={editingIntent.name || ""}
                    onChange={(e) => setEditingIntent({ ...editingIntent, name: e.target.value })}
                    placeholder="Cek Status Deposit"
                    data-testid="input-intent-name"
                  />
                </div>
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Input
                  value={editingIntent.description || ""}
                  onChange={(e) => setEditingIntent({ ...editingIntent, description: e.target.value })}
                  placeholder="Cek apakah deposit sudah masuk"
                  data-testid="input-intent-description"
                />
              </div>
              <div>
                <Label>Trigger Keywords (pisahkan koma)</Label>
                <Input
                  value={editingIntent.triggerKeywords || ""}
                  onChange={(e) => setEditingIntent({ ...editingIntent, triggerKeywords: e.target.value })}
                  placeholder="depo, deposit, dp, isi saldo, top up"
                  data-testid="input-trigger-keywords"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>HTTP Method</Label>
                  <Select value={editingIntent.httpMethod || "GET"} onValueChange={(v) => setEditingIntent({ ...editingIntent, httpMethod: v })}>
                    <SelectTrigger data-testid="select-http-method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Endpoint Path (gunakan {`{field}`} placeholder)</Label>
                  <Input
                    value={editingIntent.endpointPath || ""}
                    onChange={(e) => setEditingIntent({ ...editingIntent, endpointPath: e.target.value })}
                    placeholder="/deposits/check?username={username}&amount={amount}"
                    data-testid="input-endpoint-path"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Required Fields</Label>
                  <Button size="sm" variant="ghost" onClick={() => {
                    const cur: RequiredField[] = Array.isArray(editingIntent.requiredFields) ? editingIntent.requiredFields : [];
                    setEditingIntent({ ...editingIntent, requiredFields: [...cur, { key: "", label: "", required: true }] });
                  }} data-testid="button-add-field">
                    <Plus className="w-3 h-3 mr-1" /> Tambah field
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
                        placeholder="username"
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
                        placeholder="Username"
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
                        <span className="text-xs text-muted-foreground">wajib</span>
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
                <Label>Template Jawaban (gunakan {`{key}`} atau {`{key.path}`} dari response JSON)</Label>
                <Textarea
                  rows={4}
                  value={editingIntent.responseTemplate || ""}
                  onChange={(e) => setEditingIntent({ ...editingIntent, responseTemplate: e.target.value })}
                  placeholder="Status deposit Kakak {username} sebesar {amount}: {status}. Diproses pada {processed_at}."
                  className="font-mono text-sm"
                  data-testid="input-response-template"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Kosongkan untuk biarkan AI memformat jawaban dari raw JSON response.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Switch
                  checked={editingIntent.isEnabled !== false}
                  onCheckedChange={(v) => setEditingIntent({ ...editingIntent, isEnabled: v })}
                  data-testid="switch-intent-enabled"
                />
                <Label className="m-0">Aktif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIntentDialogOpen(false); setEditingIntent(null); }} data-testid="button-cancel-intent">Batal</Button>
            <Button onClick={() => editingIntent && saveIntent.mutate(editingIntent)} disabled={saveIntent.isPending} data-testid="button-save-intent">
              {saveIntent.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
