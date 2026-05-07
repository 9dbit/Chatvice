import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Ticket,
  Search,
  Globe,
  User as UserIcon,
  Hash,
  ExternalLink,
  Copy,
  Check,
  Send,
  RefreshCw,
  Sparkles,
  KeyRound,
  ShieldAlert,
  Loader2,
} from "lucide-react";

type TicketStatus = "checking" | "rejected" | "solved";

interface TicketSession {
  id: string;
  customerName?: string | null;
  clientIp?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  cityName?: string | null;
  userAgent?: string | null;
  status?: string | null;
  mode?: string | null;
}

interface TicketRow {
  id: string;
  merchantId: string;
  sessionId: string | null;
  ticketId?: string | null;
  username: string;
  phoneNumber?: string | null;
  bankAccount?: string | null;
  requestType?: string | null;
  status: TicketStatus | string;
  newPassword?: string | null;
  sheetRowIndex?: number | null;
  extraData?: Record<string, string> | null;
  manualOverride?: boolean | null;
  createdAt?: string | null;
  solvedAt?: string | null;
  rejectedAt?: string | null;
  lastSyncedAt?: string | null;
  session?: TicketSession | null;
}

interface PRConfig {
  id?: string;
  sheetCsvUrl?: string;
  writeBackUrl?: string;
  isActive?: boolean;
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  checking: "Sedang Diperiksa",
  rejected: "Ditolak",
  solved: "Selesai",
};

const STATUS_BAR: Record<TicketStatus, string> = {
  checking: "bg-amber-500",
  rejected: "bg-rose-500",
  solved: "bg-emerald-500",
};

const STATUS_DOT: Record<TicketStatus, string> = {
  checking: "bg-amber-500",
  rejected: "bg-rose-500",
  solved: "bg-emerald-500",
};

const STATUS_TEXT: Record<TicketStatus, string> = {
  checking: "text-amber-700 dark:text-amber-400",
  rejected: "text-rose-700 dark:text-rose-400",
  solved: "text-emerald-700 dark:text-emerald-400",
};

function normaliseStatus(s: string | undefined | null): TicketStatus {
  if (s === "rejected") return "rejected";
  if (s === "solved" || s === "delivered") return "solved";
  return "checking";
}

function spreadsheetIdFromUrl(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function CountryFlag({ code }: { code?: string | null }) {
  if (!code || code.length !== 2) return null;
  const cp = code.toUpperCase().split("").map(c => 127397 + c.charCodeAt(0));
  return <span className="text-base leading-none" data-testid={`flag-country-${code.toLowerCase()}`}>{String.fromCodePoint(...cp)}</span>;
}

interface TicketsDialogProps {
  merchantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketsDialog({ merchantId, open, onOpenChange }: TicketsDialogProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<TicketStatus>("checking");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [copiedPwdId, setCopiedPwdId] = useState<string | null>(null);

  const { data: tickets = [], isLoading, refetch, isFetching } = useQuery<TicketRow[]>({
    queryKey: ["/api/merchant/tickets"],
    enabled: open && !!merchantId,
    refetchInterval: open ? 5000 : false,
  });

  const { data: prConfig } = useQuery<PRConfig | null>({
    queryKey: ["/api/merchant/password-recovery-config"],
    enabled: open && !!merchantId,
  });

  const sheetId = spreadsheetIdFromUrl(prConfig?.sheetCsvUrl || "");

  const counts = useMemo(() => {
    const acc: Record<TicketStatus, number> = { checking: 0, rejected: 0, solved: 0 };
    tickets.forEach(t => { acc[normaliseStatus(t.status)]++; });
    return acc;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter(t => normaliseStatus(t.status) === tab)
      .filter(t => {
        if (!q) return true;
        return [
          t.username, t.ticketId, t.bankAccount, t.phoneNumber,
          t.session?.customerName, t.session?.clientIp, t.session?.countryName, t.session?.cityName,
        ].some(v => (v || "").toString().toLowerCase().includes(q));
      });
  }, [tickets, tab, search]);

  const active = useMemo(() => filtered.find(t => t.id === activeId) || filtered[0] || null, [filtered, activeId]);
  const activeStatus = active ? normaliseStatus(active.status) : "checking";

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const res = await apiRequest("PATCH", `/api/merchant/tickets/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/password-recovery-requests/pending-count"] });
      toast({ title: "Status diperbarui" });
    },
    onError: (err: any) => toast({ title: "Gagal memperbarui status", description: err?.message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await apiRequest("POST", `/api/merchant/tickets/${id}/reply`, { message });
      return res.json();
    },
    onSuccess: () => {
      setReplyText("");
      toast({ title: "Pesan terkirim" });
    },
    onError: (err: any) => toast({ title: "Gagal mengirim pesan", description: err?.message, variant: "destructive" }),
  });

  const copyPwd = async (id: string, pwd: string) => {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopiedPwdId(id);
      setTimeout(() => setCopiedPwdId(prev => (prev === id ? null : prev)), 1800);
    } catch {
      toast({ title: "Gagal menyalin", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[88vh] p-0 overflow-hidden flex flex-col" data-testid="dialog-tickets">
        <DialogHeader className="px-5 py-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              <div>
                <DialogTitle data-testid="text-tickets-title">Tiket Pemulihan Password</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Daftar permintaan pelanggan disinkronkan otomatis dari Google Sheet.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1.5"
                data-testid="button-refresh-tickets"
              >
                {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Segarkan
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[380px_1fr]">
          {/* LEFT: list */}
          <div className="flex flex-col border-r min-h-0">
            <div className="p-3 border-b flex flex-col gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari username, IP, kota..."
                  className="pl-8 h-9"
                  data-testid="input-search-tickets"
                />
              </div>
              <Tabs value={tab} onValueChange={v => { setTab(v as TicketStatus); setActiveId(null); }}>
                <TabsList className="grid grid-cols-3 w-full">
                  {(["checking", "rejected", "solved"] as TicketStatus[]).map(s => (
                    <TabsTrigger key={s} value={s} className="gap-1.5 text-xs" data-testid={`tab-${s}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
                      <span>{STATUS_LABEL[s]}</span>
                      <Badge variant="secondary" className="ml-0.5 px-1.5 h-4 text-[10px]">{counts[s]}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 flex flex-col gap-2">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground" data-testid="text-no-tickets">
                    Belum ada tiket pada kategori ini.
                  </div>
                ) : filtered.map(t => {
                  const st = normaliseStatus(t.status);
                  const isActive = active?.id === t.id;
                  return (
                    <Card
                      key={t.id}
                      onClick={() => setActiveId(t.id)}
                      className={`relative overflow-hidden cursor-pointer hover-elevate ${isActive ? "ring-2 ring-primary" : ""}`}
                      data-testid={`card-ticket-${t.id}`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${STATUS_BAR[st]}`} />
                      <div className="pl-3 pr-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <UserIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            <span className="font-medium text-sm truncate" data-testid={`text-ticket-username-${t.id}`}>{t.username}</span>
                          </div>
                          {t.manualOverride ? (
                            <Badge variant="outline" className="text-[9px] gap-1 px-1.5">
                              <ShieldAlert className="w-2.5 h-2.5" /> Manual
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {t.ticketId ? <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{t.ticketId}</span> : null}
                          {t.session?.countryCode ? <span className="inline-flex items-center gap-1"><CountryFlag code={t.session.countryCode} /> {t.session.countryName || t.session.countryCode}</span> : null}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{t.session?.clientIp || "IP tidak tersedia"}</span>
                          <span>{t.createdAt ? formatDistanceToNow(new Date(t.createdAt), { addSuffix: true }) : ""}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: detail */}
          <div className="flex flex-col min-h-0">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground" data-testid="text-empty-detail">
                Pilih sebuah tiket untuk melihat detail.
              </div>
            ) : (
              <>
                {/* Status header strip */}
                <div className={`${STATUS_BAR[activeStatus]} h-1.5 w-full`} />
                <div className="px-5 py-4 border-b">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold" data-testid="text-detail-username">{active.username}</h3>
                        <Badge className={`gap-1.5 ${STATUS_BAR[activeStatus]} text-white border-0`} data-testid="badge-detail-status">
                          {STATUS_LABEL[activeStatus]}
                        </Badge>
                        {active.manualOverride ? <Badge variant="outline" className="gap-1"><ShieldAlert className="w-3 h-3" /> Manual</Badge> : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                        {active.ticketId ? <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{active.ticketId}</span> : null}
                        {active.requestType ? <span>Tipe: {active.requestType}</span> : null}
                        {active.createdAt ? <span>{formatDistanceToNow(new Date(active.createdAt), { addSuffix: true })}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Override status:</span>
                      <Select
                        value={activeStatus}
                        onValueChange={(v) => statusMutation.mutate({ id: active.id, status: v as TicketStatus })}
                        disabled={statusMutation.isPending}
                      >
                        <SelectTrigger className="h-8 w-[180px]" data-testid="select-status-override">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking" data-testid="option-checking">Sedang Diperiksa</SelectItem>
                          <SelectItem value="rejected" data-testid="option-rejected">Ditolak</SelectItem>
                          <SelectItem value="solved" data-testid="option-solved">Selesai</SelectItem>
                        </SelectContent>
                      </Select>
                      {sheetId && active.sheetRowIndex ? (
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0&range=A${active.sheetRowIndex}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="link-open-sheet"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Buka Sheet
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-5 flex flex-col gap-4">
                    {/* Solved highlight */}
                    {activeStatus === "solved" && active.newPassword ? (
                      <Card className="overflow-hidden border-emerald-500/30">
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-start gap-3">
                          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Reset password berhasil</p>
                            <div className="mt-2 flex items-center gap-2">
                              <code className="px-2 py-1 rounded bg-background border text-sm font-mono break-all" data-testid="text-new-password">
                                {active.newPassword}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyPwd(active.id, active.newPassword || "")}
                                className="gap-1.5"
                                data-testid="button-copy-password"
                              >
                                {copiedPwdId === active.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedPwdId === active.id ? "Tersalin" : "Salin"}
                              </Button>
                            </div>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              Bagikan password baru ini ke pelanggan dan minta segera ganti dengan password yang lebih aman.
                            </p>
                          </div>
                          <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </Card>
                    ) : null}

                    {/* Customer + session info */}
                    <Card className="p-4">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-3">Informasi Pelanggan</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                        <Field label="Nama" value={active.session?.customerName} testId="field-customer-name" />
                        <Field label="Username" value={active.username} testId="field-username" />
                        <Field label="Nomor Telepon" value={active.phoneNumber} testId="field-phone" />
                        <Field label="Nomor Rekening" value={active.bankAccount} testId="field-bank" />
                        <Field
                          label="IP"
                          value={active.session?.clientIp}
                          testId="field-ip"
                          icon={<Globe className="w-3 h-3 text-muted-foreground" />}
                        />
                        <Field
                          label="Negara"
                          value={active.session?.countryName || active.session?.countryCode}
                          testId="field-country"
                          prefix={<CountryFlag code={active.session?.countryCode} />}
                        />
                        <Field label="Kota" value={active.session?.cityName} testId="field-city" />
                        <Field label="Tipe Permintaan" value={active.requestType || "reset"} testId="field-request-type" />
                      </div>
                    </Card>

                    {/* Sheet row */}
                    {active.extraData && Object.keys(active.extraData).length > 0 ? (
                      <Card className="p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-3">Data dari Google Sheet</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                          {Object.entries(active.extraData).map(([k, v]) => (
                            <Field key={k} label={k} value={v} testId={`field-extra-${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} />
                          ))}
                        </div>
                      </Card>
                    ) : null}

                    {/* Reply */}
                    {active.sessionId ? (
                      <Card className="p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">Balas Pelanggan</p>
                        <Textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Tulis pesan untuk pelanggan..."
                          className="min-h-[88px] resize-none"
                          data-testid="textarea-reply"
                        />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-muted-foreground">Pesan akan terkirim ke chat pelanggan secara langsung.</p>
                          <Button
                            size="sm"
                            disabled={!replyText.trim() || replyMutation.isPending}
                            onClick={() => replyMutation.mutate({ id: active.id, message: replyText })}
                            className="gap-1.5"
                            data-testid="button-send-reply"
                          >
                            {replyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Kirim
                          </Button>
                        </div>
                      </Card>
                    ) : null}

                    {active.lastSyncedAt ? (
                      <p className="text-[10px] text-muted-foreground text-right">
                        Terakhir disinkronkan {formatDistanceToNow(new Date(active.lastSyncedAt), { addSuffix: true })}
                      </p>
                    ) : null}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, value, testId, icon, prefix,
}: { label: string; value?: string | null; testId: string; icon?: React.ReactNode; prefix?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-sm break-words" data-testid={testId}>
        {prefix}{icon}{value || <span className="text-muted-foreground italic">—</span>}
      </span>
    </div>
  );
}
