import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users, Building2, TrendingUp, AlertTriangle, Activity, Bot,
  Layers, BookOpen, RefreshCw, Eye, Plus, Trash2, Pencil,
  CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight,
  Shield, Key, RotateCcw, Wifi, Zap, ArrowDownLeft, ArrowUpLeft,
  BarChart3, Gamepad2, Server, Clock, Database,
} from "lucide-react";
import { format } from "date-fns";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeFormat(d: string | Date | null | undefined, fmt: string): string {
  if (!d) return "—";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return "—";
    return format(date, fmt);
  } catch { return "—"; }
}

function formatIDR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-green-500/20 text-green-700 dark:text-green-400",
    inactive: "bg-muted text-muted-foreground",
    pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    success: "bg-green-500/20 text-green-700 dark:text-green-400",
    completed: "bg-green-500/20 text-green-700 dark:text-green-400",
    paid: "bg-green-500/20 text-green-700 dark:text-green-400",
    failed: "bg-red-500/20 text-red-700 dark:text-red-400",
    expired: "bg-red-500/20 text-red-700 dark:text-red-400",
    rejected: "bg-red-500/20 text-red-700 dark:text-red-400",
    cancelled: "bg-red-500/20 text-red-700 dark:text-red-400",
    approved: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    retrying: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    resolved: "bg-green-500/20 text-green-700 dark:text-green-400",
    processing: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    processed: "bg-green-500/20 text-green-700 dark:text-green-400",
    verified: "bg-green-500/20 text-green-700 dark:text-green-400",
    unverified: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    suspended: "bg-red-500/20 text-red-700 dark:text-red-400",
  };
  return <Badge className={map[status] ?? ""}>{status}</Badge>;
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-700 dark:text-red-400",
    high: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
    medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    low: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  };
  return <Badge className={map[priority] ?? ""}>{priority}</Badge>;
}

// Shared per-page pagination
function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paged = items.slice((page - 1) * pageSize, page * pageSize);
  const Pagination = () => (
    <div className="flex items-center justify-between pt-4">
      <span className="text-sm text-muted-foreground">
        {items.length} total — page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
  return { paged, page, totalPages, setPage, Pagination };
}

// Reusable error state
function ErrorState({ error }: { error: Error | null | undefined }) {
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>{(error as any)?.message ?? "An error occurred. Please try again."}</AlertDescription>
    </Alert>
  );
}

// Shared merchant selector — populates from /api/admin/gaming/merchants
function MerchantSelector({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const { data = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/merchants"],
  });
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-64" data-testid="select-gaming-merchant">
        <SelectValue placeholder="Select gaming merchant…" />
      </SelectTrigger>
      <SelectContent>
        {data.map((m: any) => (
          <SelectItem key={m.id} value={m.merchantId}>
            {m.merchantName} {m.brandName ? `(${m.brandName})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── 1. Overview ─────────────────────────────────────────────────────────────

export function GamingOverviewTab({ toast }: { toast: any }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/gaming/overview"],
  });

  const statCards = [
    { label: "Connected Merchants", value: data?.totalMerchants, sub: `${data?.activeMerchants ?? 0} active`, icon: Building2, color: "text-blue-500" },
    { label: "Mapped Players", value: data?.totalPlayers, sub: "linked accounts", icon: Users, color: "text-green-500" },
    { label: "Deposits Today", value: data?.depositsToday, sub: "transactions", icon: ArrowDownLeft, color: "text-emerald-500" },
    { label: "Withdrawals Today", value: data?.withdrawalsToday, sub: "transactions", icon: ArrowUpLeft, color: "text-cyan-500" },
    { label: "Pending Withdrawals", value: data?.pendingWithdrawals, sub: "awaiting approval", icon: Clock, color: "text-yellow-500" },
    { label: "Failed Webhook Events", value: data?.failedEvents, sub: "need attention", icon: AlertTriangle, color: data?.failedEvents > 0 ? "text-red-500" : "text-muted-foreground" },
    { label: "API Uptime", value: data?.apiUptimePct != null ? `${data.apiUptimePct}%` : null, sub: "last 100 checks", icon: Server, color: (data?.apiUptimePct ?? 100) >= 95 ? "text-green-500" : "text-red-500" },
    { label: "Turnover Issues", value: data?.turnoverIssues, sub: "not eligible yet", icon: TrendingUp, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Gamepad2 className="w-6 h-6" />Gaming Integration</h2>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide overview of all connected gaming merchants and transactions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  {isLoading
                    ? <Skeleton className="h-8 w-16" />
                    : <p className="text-3xl font-bold">{s.value ?? "—"}</p>}
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
                <s.icon className={`w-8 h-8 flex-shrink-0 mt-1 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Total Webhook Events</CardTitle>
          <CardDescription>Cumulative events received across all merchants</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-10 w-32" /> : (
            <p className="text-4xl font-bold">{data?.totalWebhookEvents ?? 0}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 2. Audit Checklist ───────────────────────────────────────────────────────

const AUDIT_DATA = [
  { module: "Webhook Receiver", status: "Available", risk: "Low", notes: "HMAC-SHA256 verification, IP whitelist enforcement, race-safe DB dedup", action: "Monitor webhook-logs page regularly" },
  { module: "Player Mapping", status: "Available", risk: "Low", notes: "username+playerId+phone+email linkage; phone/email masked in responses", action: "Verify players before enabling sensitive queries" },
  { module: "Deposit Monitoring", status: "Available", risk: "Low", notes: "Full deposit transaction log with status tracking and raw payload storage", action: "Review pending deposits daily" },
  { module: "Withdrawal Monitoring", status: "Available", risk: "Medium", notes: "Account numbers masked at rest; pending approvals tracked", action: "Ensure pending withdrawals are reviewed within SLA" },
  { module: "Turnover Tracking", status: "Available", risk: "Low", notes: "Bonus turnover progress per player with eligibility flag", action: "Check turnover issues count on overview" },
  { module: "Balance Snapshots", status: "Available", risk: "Low", notes: "Point-in-time balance capture from webhook events", action: "Use for audit trails and dispute resolution" },
  { module: "Webhook Logs", status: "Available", risk: "Low", notes: "Full log with payload sanitization, signature validity, and processing status", action: "Investigate failed/pending logs daily" },
  { module: "Failed Event Recovery", status: "Available", risk: "Medium", notes: "Auto-retry with backoff; manual reprocess available from admin panel", action: "Resolve failed events promptly to avoid data gaps" },
  { module: "API Health Monitoring", status: "Available", risk: "Low", notes: "Per-endpoint uptime tracking with response time logging", action: "Alert if uptime drops below 95%" },
  { module: "AI Response Rules", status: "Available", risk: "Low", notes: "Event-type-based template rules with optional condition matching and escalation", action: "Review templates per merchant before go-live" },
  { module: "Credential Security", status: "Available", risk: "High", notes: "API key/secret AES-256-GCM encrypted at rest; webhook secret rotatable", action: "Rotate credentials every 90 days; enforce IP whitelist" },
  { module: "AI Agent Gaming Queries", status: "Missing", risk: "High", notes: "Task #397 — AI agent cannot yet answer deposit/withdraw/turnover questions", action: "Complete Task #397 before merchant go-live" },
  { module: "CSV Export", status: "Missing", risk: "Low", notes: "Roadmap item — not yet implemented", action: "Schedule after core features are stable" },
  { module: "Real-time Dashboard Alerts", status: "Partial", risk: "Medium", notes: "Admin can see counts; no push notification or alert threshold configured yet", action: "Implement threshold-based alerts in future sprint" },
];

const auditStatusColor: Record<string, string> = {
  Available: "bg-green-500/20 text-green-700 dark:text-green-400",
  Partial: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  Missing: "bg-red-500/20 text-red-700 dark:text-red-400",
  Broken: "bg-red-500/20 text-red-700 dark:text-red-400",
  "Needs Review": "bg-orange-500/20 text-orange-700 dark:text-orange-400",
};
const auditRiskColor: Record<string, string> = {
  Low: "bg-green-500/20 text-green-700 dark:text-green-400",
  Medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  High: "bg-red-500/20 text-red-700 dark:text-red-400",
  Critical: "bg-red-500/20 text-red-700 dark:text-red-400",
};

export function GamingAuditTab({ toast }: { toast: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><CheckCircle className="w-6 h-6" />Audit Checklist</h2>
        <p className="text-muted-foreground text-sm mt-1">Point-in-time assessment of all gaming integration modules.</p>
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {AUDIT_DATA.map((row) => (
                <TableRow key={row.module}>
                  <TableCell className="font-medium whitespace-nowrap">{row.module}</TableCell>
                  <TableCell><Badge className={auditStatusColor[row.status] ?? ""}>{row.status}</Badge></TableCell>
                  <TableCell><Badge className={auditRiskColor[row.risk] ?? ""}>{row.risk}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">{row.notes}</TableCell>
                  <TableCell className="text-sm max-w-xs">{row.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 3. Player Mappings ───────────────────────────────────────────────────────

export function GamingPlayersTab({ toast }: { toast: any }) {
  const [merchantId, setMerchantId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showLink, setShowLink] = useState(false);
  const [form, setForm] = useState({ gamingUsername: "", gamingPlayerId: "", chatviceUserId: "", phoneNumber: "", email: "" });

  const { data = [], isLoading, isError, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/players", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/admin/gaming/players?merchantId=${encodeURIComponent(merchantId)}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filtered = useMemo(() =>
    statusFilter === "all" ? data : data.filter((r: any) => r.verifiedStatus === statusFilter),
    [data, statusFilter]);

  const { paged, Pagination } = usePagination(filtered);

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/admin/gaming/players", { ...body, merchantId }),
    onSuccess: () => { toast({ title: "Player linked" }); setShowLink(false); setForm({ gamingUsername: "", gamingPlayerId: "", chatviceUserId: "", phoneNumber: "", email: "" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const syncMutation = useMutation({
    mutationFn: () => refetch().then(() => null),
    onSuccess: () => toast({ title: "Players refreshed" }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => apiRequest("PATCH", `/api/admin/gaming/players/${id}`, body),
    onSuccess: () => { toast({ title: "Updated" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/gaming/players/${id}`),
    onSuccess: () => { toast({ title: "Unlinked" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" />Player Mappings</h2>
        <p className="text-muted-foreground text-sm mt-1">Link gaming platform accounts to Chatvice customer identities.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <MerchantSelector value={merchantId} onChange={(v) => setMerchantId(v)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" disabled={!merchantId || syncMutation.isPending} onClick={() => syncMutation.mutate()} data-testid="button-sync-players">
          {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}Manual Sync
        </Button>
        <Dialog open={showLink} onOpenChange={setShowLink}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!merchantId} data-testid="button-link-player"><Plus className="w-4 h-4 mr-1" />Link Player</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Link Player</DialogTitle><DialogDescription>Associate a gaming username with a Chatvice account.</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div><Label>Gaming Username *</Label><Input value={form.gamingUsername} onChange={e => setForm(f => ({ ...f, gamingUsername: e.target.value }))} placeholder="e.g. player123" /></div>
              <div><Label>Gaming Player ID</Label><Input value={form.gamingPlayerId} onChange={e => setForm(f => ({ ...f, gamingPlayerId: e.target.value }))} placeholder="optional" /></div>
              <div><Label>Chatvice User ID</Label><Input value={form.chatviceUserId} onChange={e => setForm(f => ({ ...f, chatviceUserId: e.target.value }))} placeholder="optional" /></div>
              <div><Label>Phone Number</Label><Input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="optional" /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="optional" /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button disabled={!form.gamingUsername || createMutation.isPending} onClick={() => createMutation.mutate(form)} data-testid="button-save-player">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isError ? <ErrorState error={error as Error} />
          : !merchantId ? (
            <p className="text-center text-muted-foreground py-12">Select a merchant to view player mappings.</p>
          ) : isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : paged.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No player mappings found.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gaming Username</TableHead>
                    <TableHead>Player ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linked At</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.gamingUsername}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{row.gamingPlayerId ?? "—"}</TableCell>
                      <TableCell className="text-sm">{row.phoneNumber ?? "—"}</TableCell>
                      <TableCell className="text-sm">{row.email ?? "—"}</TableCell>
                      <TableCell>{statusBadge(row.verifiedStatus)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{safeFormat(row.linkedAt, "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: row.id, body: { verifiedStatus: row.verifiedStatus === "verified" ? "unverified" : "verified" } })} data-testid={`button-verify-player-${row.id}`}>
                            {row.verifiedStatus === "verified" ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" data-testid={`button-unlink-player-${row.id}`}><Trash2 className="w-3 h-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Unlink player?</AlertDialogTitle><AlertDialogDescription>This will remove the player mapping permanently.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(row.id)}>Unlink</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 4. Deposit Monitor ───────────────────────────────────────────────────────

export function GamingDepositsTab({ toast }: { toast: any }) {
  const [merchantId, setMerchantId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/deposits", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/admin/gaming/deposits?merchantId=${encodeURIComponent(merchantId)}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filtered = useMemo(() => {
    let rows = statusFilter === "all" ? data : data.filter((r: any) => r.status === statusFilter);
    if (usernameFilter) rows = rows.filter((r: any) => r.username?.toLowerCase().includes(usernameFilter.toLowerCase()));
    if (dateFrom) rows = rows.filter((r: any) => r.createdAt && new Date(r.createdAt) >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((r: any) => r.createdAt && new Date(r.createdAt) <= new Date(dateTo + "T23:59:59"));
    return rows;
  }, [data, statusFilter, usernameFilter, dateFrom, dateTo]);

  const { paged, Pagination } = usePagination(filtered);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ArrowDownLeft className="w-6 h-6" />Deposit Monitor</h2>
        <p className="text-muted-foreground text-sm mt-1">Filterable log of all deposit transactions per merchant.</p>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <MerchantSelector value={merchantId} onChange={setMerchantId} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Username</Label>
          <Input className="w-36 h-9" value={usernameFilter} onChange={e => setUsernameFilter(e.target.value)} placeholder="Filter by username" data-testid="input-deposit-username" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Date From</Label>
          <Input type="date" className="w-36 h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="input-deposit-date-from" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Date To</Label>
          <Input type="date" className="w-36 h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="input-deposit-date-to" />
        </div>
      </div>
      <Card>
        <CardContent className="pt-4">
          {isError ? <ErrorState error={error as Error} />
          : !merchantId ? <p className="text-center text-muted-foreground py-12">Select a merchant to view deposits.</p>
            : isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : paged.length === 0 ? <p className="text-center text-muted-foreground py-12">No deposits found.</p>
            : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Paid At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.transactionId}</TableCell>
                        <TableCell>{r.username ?? "—"}</TableCell>
                        <TableCell>{formatIDR(r.amount)}</TableCell>
                        <TableCell className="text-sm">{r.paymentMethod ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.paymentChannel ?? "—"}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeFormat(r.createdAt, "dd MMM HH:mm")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeFormat(r.paidAt, "dd MMM HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination />
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 5. Withdrawal Monitor ────────────────────────────────────────────────────

export function GamingWithdrawalsTab({ toast }: { toast: any }) {
  const [merchantId, setMerchantId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/withdrawals", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/admin/gaming/withdrawals?merchantId=${encodeURIComponent(merchantId)}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filtered = useMemo(() => {
    let rows = statusFilter === "all" ? data : data.filter((r: any) => r.status === statusFilter);
    if (usernameFilter) rows = rows.filter((r: any) => r.username?.toLowerCase().includes(usernameFilter.toLowerCase()));
    if (dateFrom) rows = rows.filter((r: any) => r.requestedAt && new Date(r.requestedAt) >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((r: any) => r.requestedAt && new Date(r.requestedAt) <= new Date(dateTo + "T23:59:59"));
    return rows;
  }, [data, statusFilter, usernameFilter, dateFrom, dateTo]);

  const { paged, Pagination } = usePagination(filtered);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ArrowUpLeft className="w-6 h-6" />Withdrawal Monitor</h2>
        <p className="text-muted-foreground text-sm mt-1">Filterable log of all withdrawal transactions. Bank account numbers are masked.</p>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <MerchantSelector value={merchantId} onChange={setMerchantId} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Username</Label>
          <Input className="w-36 h-9" value={usernameFilter} onChange={e => setUsernameFilter(e.target.value)} placeholder="Filter by username" data-testid="input-withdraw-username" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Date From</Label>
          <Input type="date" className="w-36 h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="input-withdraw-date-from" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Date To</Label>
          <Input type="date" className="w-36 h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="input-withdraw-date-to" />
        </div>
      </div>
      <Card>
        <CardContent className="pt-4">
          {isError ? <ErrorState error={error as Error} />
          : !merchantId ? <p className="text-center text-muted-foreground py-12">Select a merchant to view withdrawals.</p>
            : isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : paged.length === 0 ? <p className="text-center text-muted-foreground py-12">No withdrawals found.</p>
            : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Withdraw ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.withdrawId}</TableCell>
                        <TableCell>{r.username ?? "—"}</TableCell>
                        <TableCell>{formatIDR(r.amount)}</TableCell>
                        <TableCell className="text-sm">{r.bankName ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.accountNumberMasked ?? "—"}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeFormat(r.requestedAt, "dd MMM HH:mm")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{r.rejectedReason ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination />
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 6. Turnover Monitor ──────────────────────────────────────────────────────

export function GamingTurnoversTab({ toast }: { toast: any }) {
  const [merchantId, setMerchantId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/turnovers", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/admin/gaming/turnovers?merchantId=${encodeURIComponent(merchantId)}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filtered = useMemo(() =>
    statusFilter === "all" ? data : data.filter((r: any) => r.status === statusFilter),
    [data, statusFilter]);

  const { paged, Pagination } = usePagination(filtered);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="w-6 h-6" />Turnover Tracker</h2>
        <p className="text-muted-foreground text-sm mt-1">Bonus turnover progress per player with eligibility status.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <MerchantSelector value={merchantId} onChange={setMerchantId} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="pt-4">
          {isError ? <ErrorState error={error as Error} />
          : !merchantId ? <p className="text-center text-muted-foreground py-12">Select a merchant to view turnovers.</p>
            : isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : paged.length === 0 ? <p className="text-center text-muted-foreground py-12">No turnover records found.</p>
            : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Current / Required</TableHead>
                      <TableHead>Eligible</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r: any) => {
                      const pct = r.progressPercentage ?? 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.username ?? "—"}</TableCell>
                          <TableCell className="text-sm">{r.bonusName ?? "—"}</TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="space-y-1">
                              <Progress value={Math.min(pct, 100)} className="h-2" />
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{formatIDR(r.currentTurnover)} / {formatIDR(r.requiredTurnover)}</TableCell>
                          <TableCell>{r.eligibleWithdraw ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{safeFormat(r.expiryDate, "dd MMM yyyy")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <Pagination />
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 7. Balance Snapshots ─────────────────────────────────────────────────────

export function GamingBalancesTab({ toast }: { toast: any }) {
  const [merchantId, setMerchantId] = useState("");

  const { data = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/balances", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/admin/gaming/balances?merchantId=${encodeURIComponent(merchantId)}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!merchantId,
  });

  const { paged, Pagination } = usePagination(data);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Database className="w-6 h-6" />Balance Snapshots</h2>
        <p className="text-muted-foreground text-sm mt-1">Point-in-time balance captures per player from webhook events.</p>
      </div>
      <MerchantSelector value={merchantId} onChange={setMerchantId} />
      <Card>
        <CardContent className="pt-4">
          {isError ? <ErrorState error={error as Error} />
          : !merchantId ? <p className="text-center text-muted-foreground py-12">Select a merchant to view balances.</p>
            : isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : paged.length === 0 ? <p className="text-center text-muted-foreground py-12">No balance snapshots found.</p>
            : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead>Locked Balance</TableHead>
                      <TableHead>Bonus Balance</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Captured At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.username ?? "—"}</TableCell>
                        <TableCell>{formatIDR(r.currentBalance)}</TableCell>
                        <TableCell>{formatIDR(r.lockedBalance)}</TableCell>
                        <TableCell>{formatIDR(r.bonusBalance)}</TableCell>
                        <TableCell className="text-sm">{r.currency ?? "IDR"}</TableCell>
                        <TableCell className="text-sm">{r.source ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeFormat(r.createdAt, "dd MMM HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination />
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 8. Webhook Logs ──────────────────────────────────────────────────────────

export function GamingWebhooksTab({ toast }: { toast: any }) {
  const [merchantId, setMerchantId] = useState("");
  const [viewPayload, setViewPayload] = useState<any>(null);

  const { data = [], isLoading, isError, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/webhook-logs", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/admin/gaming/webhook-logs?merchantId=${encodeURIComponent(merchantId)}&limit=200`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!merchantId,
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/gaming/webhook-logs/${id}/reprocess`, {}),
    onSuccess: () => { toast({ title: "Event queued for reprocessing" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { paged, Pagination } = usePagination(data);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Wifi className="w-6 h-6" />Webhook Logs</h2>
        <p className="text-muted-foreground text-sm mt-1">All incoming webhook events with signature verification status and payload viewer.</p>
      </div>
      <MerchantSelector value={merchantId} onChange={setMerchantId} />

      <Dialog open={!!viewPayload} onOpenChange={() => setViewPayload(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Webhook Payload</DialogTitle><DialogDescription>Sanitized event payload for log #{viewPayload?.id}</DialogDescription></DialogHeader>
          <pre className="bg-muted rounded-md p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap break-all">
            {viewPayload ? JSON.stringify(viewPayload.payload, null, 2) : ""}
          </pre>
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-4">
          {isError ? <ErrorState error={error as Error} />
          : !merchantId ? <p className="text-center text-muted-foreground py-12">Select a merchant to view webhook logs.</p>
            : isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : paged.length === 0 ? <p className="text-center text-muted-foreground py-12">No webhook logs found.</p>
            : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Event ID</TableHead>
                      <TableHead>Player ID</TableHead>
                      <TableHead>Sig Valid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received At</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.eventType}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[100px]">{r.eventId ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.playerId ?? "—"}</TableCell>
                        <TableCell>{r.signatureValid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeFormat(r.receivedAt, "dd MMM HH:mm:ss")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{r.errorMessage ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setViewPayload(r)} data-testid={`button-view-payload-${r.id}`}><Eye className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" disabled={reprocessMutation.isPending || r.status === "processed"} onClick={() => reprocessMutation.mutate(r.id)} data-testid={`button-reprocess-${r.id}`} title="Reprocess">
                              {reprocessMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination />
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 9. API Health Monitor ────────────────────────────────────────────────────

export function GamingHealthTab({ toast }: { toast: any }) {
  const [merchantId, setMerchantId] = useState("");

  const { data, isLoading, isError, error } = useQuery<{ summary: any; logs: any[] }>({
    queryKey: ["/api/admin/gaming/health", merchantId],
    queryFn: async () => {
      if (!merchantId) return { summary: null, logs: [] };
      const res = await fetch(`/api/admin/gaming/health?merchantId=${encodeURIComponent(merchantId)}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!merchantId,
  });

  const logs = data?.logs ?? [];
  const summary = data?.summary;
  const { paged, Pagination } = usePagination(logs);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6" />API Health Monitor</h2>
        <p className="text-muted-foreground text-sm mt-1">Per-endpoint health checks with uptime percentage and response times.</p>
      </div>
      <MerchantSelector value={merchantId} onChange={setMerchantId} />

      {merchantId && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Checks", value: summary.totalChecks ?? 0 },
            { label: "Successful", value: summary.successfulChecks ?? 0 },
            { label: "Failed", value: summary.failedChecks ?? 0 },
            { label: "Uptime", value: summary.uptimePercentage != null ? `${summary.uptimePercentage}%` : "—" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          {isError ? <ErrorState error={error as Error} />
          : !merchantId ? <p className="text-center text-muted-foreground py-12">Select a merchant to view health logs.</p>
            : isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : paged.length === 0 ? <p className="text-center text-muted-foreground py-12">No health logs found.</p>
            : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status Code</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Checked At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs truncate max-w-[200px]">{r.endpoint}</TableCell>
                        <TableCell><Badge variant="outline">{r.method ?? "GET"}</Badge></TableCell>
                        <TableCell>
                          <Badge className={r.statusCode >= 200 && r.statusCode < 300 ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/20 text-red-700 dark:text-red-400"}>
                            {r.statusCode ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.responseTimeMs != null ? `${r.responseTimeMs}ms` : "—"}</TableCell>
                        <TableCell>{r.success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeFormat(r.checkedAt, "dd MMM HH:mm:ss")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{r.errorMessage ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination />
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 10. Failed Events ────────────────────────────────────────────────────────

export function GamingFailedEventsTab({ toast }: { toast: any }) {
  const [merchantId, setMerchantId] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/failed-events", merchantId, statusFilter],
    queryFn: async () => {
      if (!merchantId) return [];
      const params = new URLSearchParams({ merchantId });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/gaming/failed-events?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!merchantId,
  });

  const { paged, Pagination } = usePagination(data);

  const retryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/gaming/failed-events/${id}/retry`, {}),
    onSuccess: () => { toast({ title: "Event queued for retry" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/gaming/failed-events/${id}/resolve`, {}),
    onSuccess: () => { toast({ title: "Event marked as resolved" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="w-6 h-6" />Failed Events</h2>
        <p className="text-muted-foreground text-sm mt-1">Events that failed during processing. Retry to re-process or mark resolved to dismiss.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <MerchantSelector value={merchantId} onChange={setMerchantId} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="retrying">Retrying</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="pt-4">
          {!merchantId ? <p className="text-center text-muted-foreground py-12">Select a merchant to view failed events.</p>
            : isLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : paged.length === 0 ? <p className="text-center text-muted-foreground py-12">No failed events found.</p>
            : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Failure Reason</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Next Retry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-28">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.eventType}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{r.failureReason ?? "—"}</TableCell>
                        <TableCell>{r.retryCount ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeFormat(r.nextRetryAt, "dd MMM HH:mm")}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeFormat(r.createdAt, "dd MMM HH:mm")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retryMutation.isPending || r.status === "resolved"}
                              onClick={() => retryMutation.mutate(r.id)}
                              data-testid={`button-retry-event-${r.id}`}
                              title="Retry"
                            >
                              {retryMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                              Retry
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={resolveMutation.isPending || r.status === "resolved"}
                              onClick={() => resolveMutation.mutate(r.id)}
                              data-testid={`button-resolve-event-${r.id}`}
                              title="Mark resolved"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination />
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 11. AI Response Rules ────────────────────────────────────────────────────

const EVENT_TYPES = [
  "deposit.created", "deposit.paid", "deposit.failed", "deposit.expired",
  "withdraw.requested", "withdraw.approved", "withdraw.rejected", "withdraw.completed",
  "turnover.updated", "balance.updated", "player.verified",
];

export function GamingAiRulesTab({ toast }: { toast: any }) {
  const [merchantId, setMerchantId] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const emptyForm = { eventType: "", conditionKey: "", conditionOperator: "", conditionValue: "", responseTemplate: "", escalationRequired: false, active: true };
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading, isError, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/ai-rules", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(`/api/admin/gaming/ai-rules?merchantId=${encodeURIComponent(merchantId)}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!merchantId,
  });

  const { paged, Pagination } = usePagination(data);

  const openCreate = () => { setEditRow(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (row: any) => {
    setEditRow(row);
    setForm({ eventType: row.eventType, conditionKey: row.conditionKey ?? "", conditionOperator: row.conditionOperator ?? "", conditionValue: row.conditionValue ?? "", responseTemplate: row.responseTemplate, escalationRequired: !!row.escalationRequired, active: !!row.active });
    setShowDialog(true);
  };

  const saveMutation = useMutation({
    mutationFn: (body: any) => editRow
      ? apiRequest("PATCH", `/api/admin/gaming/ai-rules/${editRow.id}`, body)
      : apiRequest("POST", "/api/admin/gaming/ai-rules", { ...body, merchantId }),
    onSuccess: () => { toast({ title: editRow ? "Rule updated" : "Rule created" }); setShowDialog(false); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/gaming/ai-rules/${id}`),
    onSuccess: () => { toast({ title: "Rule deleted" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Bot className="w-6 h-6" />AI Response Rules</h2>
        <p className="text-muted-foreground text-sm mt-1">Configure AI response templates per event type. Use <code className="text-xs bg-muted px-1 rounded">{"{{amount}}"}</code>, <code className="text-xs bg-muted px-1 rounded">{"{{username}}"}</code> as placeholders.</p>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <MerchantSelector value={merchantId} onChange={setMerchantId} />
        <Button size="sm" disabled={!merchantId} onClick={openCreate} data-testid="button-create-ai-rule"><Plus className="w-4 h-4 mr-1" />New Rule</Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editRow ? "Edit" : "Create"} AI Response Rule</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Event Type *</Label>
              <Select value={form.eventType} onValueChange={v => setForm(f => ({ ...f, eventType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select event type…" /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Condition Key</Label><Input value={form.conditionKey} onChange={e => setForm(f => ({ ...f, conditionKey: e.target.value }))} placeholder="e.g. amount" /></div>
              <div><Label className="text-xs">Operator</Label><Input value={form.conditionOperator} onChange={e => setForm(f => ({ ...f, conditionOperator: e.target.value }))} placeholder="gte / eq / lt" /></div>
              <div><Label className="text-xs">Value</Label><Input value={form.conditionValue} onChange={e => setForm(f => ({ ...f, conditionValue: e.target.value }))} placeholder="e.g. 1000000" /></div>
            </div>
            <div>
              <Label>Response Template *</Label>
              <Textarea rows={4} value={form.responseTemplate} onChange={e => setForm(f => ({ ...f, responseTemplate: e.target.value }))} placeholder="Your deposit of {{amount}} has been confirmed. Thank you, {{username}}!" />
              <p className="text-xs text-muted-foreground mt-1">Placeholders: <code>{"{{amount}}"}</code> <code>{"{{username}}"}</code> <code>{"{{status}}"}</code> <code>{"{{bank_name}}"}</code></p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={form.escalationRequired} onCheckedChange={v => setForm(f => ({ ...f, escalationRequired: v }))} id="escalation" />
                <Label htmlFor="escalation" className="text-sm">Requires human escalation</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} id="active" />
                <Label htmlFor="active" className="text-sm">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button disabled={!form.eventType || !form.responseTemplate || saveMutation.isPending} onClick={() => saveMutation.mutate(form)} data-testid="button-save-ai-rule">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-4">
          {isError ? <ErrorState error={error as Error} />
          : !merchantId ? <p className="text-center text-muted-foreground py-12">Select a merchant to view AI rules.</p>
            : isLoading ? <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            : paged.length === 0 ? <p className="text-center text-muted-foreground py-12">No AI rules configured. Create one to get started.</p>
            : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Response Template</TableHead>
                      <TableHead>Escalate</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.eventType}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.conditionKey ? `${r.conditionKey} ${r.conditionOperator ?? ""} ${r.conditionValue ?? ""}` : "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{r.responseTemplate}</TableCell>
                        <TableCell>{r.escalationRequired ? <CheckCircle className="w-4 h-4 text-orange-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                        <TableCell>{r.active ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(r)} data-testid={`button-edit-rule-${r.id}`}><Pencil className="w-3 h-3" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" data-testid={`button-delete-rule-${r.id}`}><Trash2 className="w-3 h-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete rule?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(r.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination />
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 12. Security Settings ────────────────────────────────────────────────────

export function GamingSecurityTab({ toast }: { toast: any }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [testResult, setTestResult] = useState<Record<number, any>>({});
  const [testingId, setTestingId] = useState<number | null>(null);
  const emptyForm = { merchantId: "", merchantName: "", brandName: "", apiBaseUrl: "", apiKey: "", apiSecret: "", ipWhitelist: "", status: "active" };
  const [form, setForm] = useState(emptyForm);

  const { data: allMerchants = [], isLoading, isError, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/merchants"],
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => editRow
      ? apiRequest("PATCH", `/api/admin/gaming/merchants/${editRow.id}`, body)
      : apiRequest("POST", "/api/admin/gaming/merchants", body),
    onSuccess: () => { toast({ title: editRow ? "Merchant updated" : "Merchant created" }); setShowCreate(false); setEditRow(null); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/admin/gaming/merchants/${id}/rotate-secret`, {}),
    onSuccess: () => { toast({ title: "Webhook secret rotated. Configure the new secret in your panel integration." }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/gaming/merchants/${id}`),
    onSuccess: () => { toast({ title: "Merchant removed" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => { setEditRow(null); setForm(emptyForm); setShowCreate(true); };
  const openEdit = (row: any) => {
    setEditRow(row);
    setForm({ merchantId: row.merchantId, merchantName: row.merchantName, brandName: row.brandName ?? "", apiBaseUrl: row.apiBaseUrl, apiKey: "", apiSecret: "", ipWhitelist: (row.ipWhitelist ?? []).join(", "), status: row.status });
    setShowCreate(true);
  };

  const handleSave = () => {
    const body: any = {
      merchantId: form.merchantId,
      merchantName: form.merchantName,
      brandName: form.brandName || undefined,
      apiBaseUrl: form.apiBaseUrl,
      status: form.status,
      ipWhitelist: form.ipWhitelist ? form.ipWhitelist.split(",").map(s => s.trim()).filter(Boolean) : [],
    };
    if (form.apiKey) body.apiKey = form.apiKey;
    if (form.apiSecret) body.apiSecret = form.apiSecret;
    createMutation.mutate(body);
  };

  const testWebhook = async (m: any) => {
    setTestingId(m.id);
    try {
      const res = await apiRequest("POST", `/api/admin/gaming/merchants/${m.id}/test-webhook`, {});
      setTestResult(prev => ({ ...prev, [m.id]: res }));
      toast({ title: (res as any).success ? "Webhook reachable" : "Webhook unreachable", description: `Status: ${(res as any).statusCode ?? "—"} | ${(res as any).responseTimeMs}ms` });
    } catch (e: any) {
      setTestResult(prev => ({ ...prev, [m.id]: { success: false, error: e.message } }));
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const { paged, Pagination } = usePagination(allMerchants);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" />Security Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage gaming merchant credentials, webhook secrets, and IP whitelists.</p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate} data-testid="button-add-gaming-merchant"><Plus className="w-4 h-4 mr-1" />Add Merchant</Button>
      </div>

      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setEditRow(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editRow ? "Edit" : "Add"} Gaming Merchant</DialogTitle><DialogDescription>Configure credentials for this gaming platform integration.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Chatvice Merchant ID *</Label><Input disabled={!!editRow} value={form.merchantId} onChange={e => setForm(f => ({ ...f, merchantId: e.target.value }))} placeholder="merchant ID" /></div>
              <div><Label>Merchant Name *</Label><Input value={form.merchantName} onChange={e => setForm(f => ({ ...f, merchantName: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Brand Name</Label><Input value={form.brandName} onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))} placeholder="optional" /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>API Base URL *</Label><Input value={form.apiBaseUrl} onChange={e => setForm(f => ({ ...f, apiBaseUrl: e.target.value }))} placeholder="https://api.gameplatform.com/v1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>API Key {editRow ? "(leave blank to keep)" : ""}</Label><Input type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder={editRow ? "••••" : "enter key"} /></div>
              <div><Label>API Secret {editRow ? "(leave blank to keep)" : ""}</Label><Input type="password" value={form.apiSecret} onChange={e => setForm(f => ({ ...f, apiSecret: e.target.value }))} placeholder={editRow ? "••••" : "enter secret"} /></div>
            </div>
            <div><Label>IP Whitelist (comma-separated)</Label><Input value={form.ipWhitelist} onChange={e => setForm(f => ({ ...f, ipWhitelist: e.target.value }))} placeholder="203.0.113.1, 198.51.100.2" /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button disabled={!form.merchantId || !form.merchantName || !form.apiBaseUrl || createMutation.isPending} onClick={handleSave} data-testid="button-save-gaming-merchant">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-4">
          {isError ? <ErrorState error={error as Error} />
          : isLoading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            : paged.length === 0 ? <p className="text-center text-muted-foreground py-12">No gaming merchants configured yet.</p>
            : (
              <>
                <div className="space-y-4">
                  {paged.map((m: any) => {
                    const tr = testResult[m.id];
                    return (
                      <Card key={m.id} className="border">
                        <CardContent className="pt-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{m.merchantName}</span>
                                {m.brandName && <span className="text-muted-foreground text-sm">({m.brandName})</span>}
                                {statusBadge(m.status)}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div><span className="font-medium">Merchant ID:</span> {m.merchantId}</div>
                                <div><span className="font-medium">API Base URL:</span> {m.apiBaseUrl}</div>
                                <div><span className="font-medium">API Key:</span> {m.apiKeyHint ? <code className="bg-muted px-1 rounded">{m.apiKeyHint}</code> : <span className="text-yellow-600">Not set</span>}</div>
                                <div><span className="font-medium">API Secret:</span> {m.apiSecretHint ? <code className="bg-muted px-1 rounded">{m.apiSecretHint}</code> : <span className="text-yellow-600">Not set</span>}</div>
                                <div><span className="font-medium">Webhook Secret:</span> {m.webhookSecretSet ? <span className="text-green-600">Set</span> : <span className="text-yellow-600">Not set</span>}</div>
                                <div><span className="font-medium">IP Whitelist:</span> {(m.ipWhitelist ?? []).length > 0 ? m.ipWhitelist.join(", ") : <span className="text-muted-foreground">None (all IPs allowed)</span>}</div>
                                <div><span className="font-medium">Created:</span> {safeFormat(m.createdAt, "dd MMM yyyy")}</div>
                              </div>
                              {tr && (
                                <div className={`mt-2 text-xs px-2 py-1 rounded ${tr.success ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-700 dark:text-red-400"}`}>
                                  Test result: {tr.success ? `OK ${tr.statusCode}` : `FAIL${tr.statusCode ? ` ${tr.statusCode}` : ""}`} — {tr.responseTimeMs}ms
                                  {tr.error ? ` (${tr.error})` : ""}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(m)} data-testid={`button-edit-merchant-${m.id}`}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                              <Button size="sm" variant="outline" disabled={testingId === m.id} onClick={() => testWebhook(m)} data-testid={`button-test-webhook-${m.id}`}>
                                {testingId === m.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wifi className="w-3 h-3 mr-1" />}Test
                              </Button>
                              <Button size="sm" variant="outline" disabled={rotateMutation.isPending} onClick={() => rotateMutation.mutate(m.id)} data-testid={`button-rotate-secret-${m.id}`}>
                                {rotateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}Rotate Secret
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" data-testid={`button-delete-merchant-${m.id}`}><Trash2 className="w-3 h-3 mr-1" />Remove</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Remove merchant?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the gaming merchant configuration and all associated data.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(m.id)}>Remove</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <Pagination />
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 13. Roadmap (Kanban) ─────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "testing", label: "Testing" },
  { id: "done", label: "Done" },
];

export function GamingRoadmapTab({ toast }: { toast: any }) {
  const [showCreate, setShowCreate] = useState(false);
  const emptyForm = { category: "", title: "", description: "", priority: "medium", status: "backlog", ownerRole: "", acceptanceCriteria: "" };
  const [form, setForm] = useState(emptyForm);

  const { data = [], isLoading, isError, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/gaming/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/gaming/tasks", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/admin/gaming/tasks", body),
    onSuccess: () => { toast({ title: "Task created" }); setShowCreate(false); setForm(emptyForm); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/gaming/tasks/seed", {}),
    onSuccess: (r: any) => { toast({ title: r.seeded > 0 ? `Seeded ${r.seeded} tasks` : (r.message ?? "Tasks already exist") }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => apiRequest("PATCH", `/api/admin/gaming/tasks/${id}`, body),
    onSuccess: () => { toast({ title: "Updated" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/gaming/tasks/${id}`),
    onSuccess: () => { toast({ title: "Deleted" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const tasksByStatus = useMemo(() => {
    const map: Record<string, any[]> = {};
    KANBAN_COLUMNS.forEach(c => { map[c.id] = []; });
    data.forEach((t: any) => { if (map[t.status]) map[t.status].push(t); });
    return map;
  }, [data]);

  const MOVE_OPTIONS = KANBAN_COLUMNS.map(c => c.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Layers className="w-6 h-6" />Integration Roadmap</h2>
          <p className="text-muted-foreground text-sm mt-1">Kanban board tracking gaming integration development tasks.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={seedMutation.isPending} onClick={() => seedMutation.mutate()} data-testid="button-seed-tasks">
            {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}Seed Default Tasks
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-task"><Plus className="w-4 h-4 mr-1" />New Task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Category *</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Backend, UI, QA" /></div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{KANBAN_COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Owner Role</Label><Input value={form.ownerRole} onChange={e => setForm(f => ({ ...f, ownerRole: e.target.value }))} placeholder="e.g. Backend Dev" /></div>
                </div>
                <div><Label>Acceptance Criteria</Label><Textarea rows={2} value={form.acceptanceCriteria} onChange={e => setForm(f => ({ ...f, acceptanceCriteria: e.target.value }))} /></div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button disabled={!form.category || !form.title || createMutation.isPending} onClick={() => createMutation.mutate(form)} data-testid="button-save-task">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isError ? <ErrorState error={error as Error} />
      : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map(c => <Skeleton key={c.id} className="h-64 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{col.label}</span>
                <Badge variant="secondary" className="text-xs">{tasksByStatus[col.id]?.length ?? 0}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {(tasksByStatus[col.id] ?? []).length === 0 ? (
                  <div className="border border-dashed rounded-md p-4 text-center text-xs text-muted-foreground">Empty</div>
                ) : (tasksByStatus[col.id] ?? []).map((task: any) => (
                  <Card key={task.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.category}</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0"><Trash2 className="w-3 h-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete task?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(task.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-1 flex-wrap">
                      {priorityBadge(task.priority)}
                      {task.ownerRole && <Badge variant="outline" className="text-xs">{task.ownerRole}</Badge>}
                    </div>
                    <div className="pt-1">
                      <Select value={task.status} onValueChange={v => updateMutation.mutate({ id: task.id, body: { status: v } })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{KANBAN_COLUMNS.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
