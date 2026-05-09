import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { formatDistanceToNow, format } from "date-fns";
import type { DateRange as CalendarDateRange } from "react-day-picker";
import { invalidateNotificationSoundCache } from "@/lib/sounds";
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
  Bell,
  X,
  HelpCircle,
  Inbox,
  Eye,
  EyeOff,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ArrowDownAZ,
  CalendarRange,
  CalendarIcon,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface NotifSettings {
  browserPushEnabled?: boolean;
}

const DESKTOP_NOTIF_PROMPT_DISMISSED_KEY = "tickets-desktop-notif-prompt-dismissed";
const TUTORIAL_SEEN_KEY = "tickets-tutorial-seen";

function useDesktopNotifPrompt(open: boolean, t: (k: string) => string) {
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DESKTOP_NOTIF_PROMPT_DISMISSED_KEY) === "1"; } catch { return false; }
  });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [enabling, setEnabling] = useState(false);

  const { data: settings } = useQuery<NotifSettings>({
    queryKey: ["/api/notification-settings"],
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<NotifSettings>) => {
      const res = await apiRequest("PUT", "/api/notification-settings", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateNotificationSoundCache();
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
    },
  });

  const enable = async () => {
    if (permission === "unsupported") {
      toast({ title: t("dashboard.ticketsDialog.notif.unsupported"), variant: "destructive" });
      return;
    }
    setEnabling(true);
    try {
      let perm: NotificationPermission = Notification.permission;
      if (perm === "default") {
        perm = await Notification.requestPermission();
        setPermission(perm);
      }
      if (perm !== "granted") {
        toast({ title: t("dashboard.ticketsDialog.notif.denied"), description: t("dashboard.ticketsDialog.notif.deniedDesc"), variant: "destructive" });
        return;
      }
      await updateMutation.mutateAsync({ browserPushEnabled: true });
      setDismissed(true);
      try { localStorage.setItem(DESKTOP_NOTIF_PROMPT_DISMISSED_KEY, "1"); } catch {}
      try {
        new Notification(t("dashboard.ticketsDialog.notif.browserTitle"), {
          body: t("dashboard.ticketsDialog.notif.browserBody"),
          icon: "/favicon.ico",
        });
      } catch {}
      toast({ title: t("dashboard.ticketsDialog.notif.enabled") });
    } catch (err: any) {
      toast({ title: t("dashboard.ticketsDialog.notif.enableFailed"), description: err?.message, variant: "destructive" });
    } finally {
      setEnabling(false);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DESKTOP_NOTIF_PROMPT_DISMISSED_KEY, "1"); } catch {}
  };

  const needsPrompt =
    !dismissed &&
    permission !== "unsupported" &&
    permission !== "denied" &&
    (permission !== "granted" || settings?.browserPushEnabled !== true);

  return { needsPrompt, enable, dismiss, enabling };
}

type TicketStatus = "checking" | "rejected" | "solved";
type SortBy = "newest" | "oldest" | "status" | "username";
type DateRange = "all" | "today" | "7d" | "30d" | "custom";

const STATUS_ORDER: Record<TicketStatus, number> = { checking: 0, rejected: 1, solved: 2 };

const SORT_LABEL_KEY: Record<SortBy, string> = {
  newest: "dashboard.ticketsDialog.sort.newest",
  oldest: "dashboard.ticketsDialog.sort.oldest",
  status: "dashboard.ticketsDialog.sort.status",
  username: "dashboard.ticketsDialog.sort.username",
};

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

const STATUS_LABEL_KEY: Record<TicketStatus, string> = {
  checking: "dashboard.ticketsDialog.status.checking",
  rejected: "dashboard.ticketsDialog.status.rejected",
  solved: "dashboard.ticketsDialog.status.solved",
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

const STATUS_BADGE_TINT: Record<TicketStatus, string> = {
  checking: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30",
  solved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
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

type DateGroup = "today" | "yesterday" | "thisWeek" | "older" | "unknown";
const DATE_GROUP_LABEL_KEY: Record<DateGroup, string> = {
  today: "dashboard.ticketsDialog.group.today",
  yesterday: "dashboard.ticketsDialog.group.yesterday",
  thisWeek: "dashboard.ticketsDialog.group.thisWeek",
  older: "dashboard.ticketsDialog.group.earlier",
  unknown: "dashboard.ticketsDialog.group.earlier",
};
const DATE_GROUP_ORDER: DateGroup[] = ["today", "yesterday", "thisWeek", "older", "unknown"];

function bucketOf(dateStr: string | null | undefined, now: Date): DateGroup {
  if (!dateStr) return "unknown";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "unknown";
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
  const t = d.getTime();
  if (t >= startOfToday) return "today";
  if (t >= startOfYesterday) return "yesterday";
  if (t >= startOfWeek) return "thisWeek";
  return "older";
}

function isWithinRange(
  dateStr: string | null | undefined,
  range: DateRange,
  now: Date,
  custom?: { from?: Date; to?: Date },
): boolean {
  if (range === "all") return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (range === "today") return t >= startOfToday;
  if (range === "7d") return t >= startOfToday - 7 * 24 * 60 * 60 * 1000;
  if (range === "30d") return t >= startOfToday - 30 * 24 * 60 * 60 * 1000;
  if (range === "custom") {
    const from = custom?.from ? new Date(custom.from.getFullYear(), custom.from.getMonth(), custom.from.getDate()).getTime() : -Infinity;
    const toBase = custom?.to ?? custom?.from;
    const to = toBase ? new Date(toBase.getFullYear(), toBase.getMonth(), toBase.getDate()).getTime() + 24 * 60 * 60 * 1000 - 1 : Infinity;
    return t >= from && t <= to;
  }
  return true;
}

const EXAMPLE_TICKET: TicketRow = {
  id: "example-demo-001",
  merchantId: "demo",
  sessionId: null,
  ticketId: "TCK-000123",
  username: "budi.santoso",
  phoneNumber: "+62 812-3456-7890",
  bankAccount: "1234567890",
  requestType: "reset",
  status: "checking",
  newPassword: null,
  sheetRowIndex: 12,
  extraData: { Catatan: "Lupa password sejak kemarin", "ID Anggota": "MBR-7788" },
  manualOverride: false,
  createdAt: new Date().toISOString(),
  lastSyncedAt: new Date().toISOString(),
  session: {
    id: "demo-sess",
    customerName: "Budi Santoso",
    clientIp: "203.0.113.45",
    countryCode: "ID",
    countryName: "Indonesia",
    cityName: "Jakarta",
    userAgent: "Mozilla/5.0",
  },
};

interface TicketsDialogProps {
  merchantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketsDialog({ merchantId, open, onOpenChange }: TicketsDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const desktopNotif = useDesktopNotifPrompt(open, t);
  const [tab, setTab] = useState<TicketStatus>("checking");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [copiedPwdId, setCopiedPwdId] = useState<string | null>(null);
  const [sentPwdIds, setSentPwdIds] = useState<Set<string>>(new Set());
  const [sendingPwdId, setSendingPwdId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customRange, setCustomRange] = useState<CalendarDateRange | undefined>(undefined);
  const [chipStatuses, setChipStatuses] = useState<Set<TicketStatus>>(new Set());
  const [showExample, setShowExample] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Refresh "x minutes ago" labels once per minute while dialog is open.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  // Reset mobile view to list whenever the dialog is closed
  useEffect(() => {
    if (!open) setMobileView("list");
  }, [open]);

  const openTicket = (id: string) => {
    setActiveId(id);
    setMobileView("detail");
  };

  const toggleChip = (s: TicketStatus) => {
    setChipStatuses(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
    setActiveId(null);
    setMobileView("list");
  };

  // Auto-show tutorial once
  useEffect(() => {
    if (!open) return;
    try {
      const seen = localStorage.getItem(TUTORIAL_SEEN_KEY) === "1";
      if (!seen) {
        setTutorialOpen(true);
        localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
      }
    } catch {}
  }, [open]);

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
    const now = new Date();
    const allowed: Set<TicketStatus> = chipStatuses.size > 0 ? chipStatuses : new Set([tab]);
    const list = tickets
      .filter(t => allowed.has(normaliseStatus(t.status)))
      .filter(t => isWithinRange(t.createdAt, dateRange, now, customRange ? { from: customRange.from, to: customRange.to } : undefined))
      .filter(t => {
        if (!q) return true;
        return [
          t.username, t.ticketId, t.bankAccount, t.phoneNumber,
          t.session?.customerName, t.session?.clientIp, t.session?.countryName, t.session?.cityName,
        ].some(v => (v || "").toString().toLowerCase().includes(q));
      });
    list.sort((a, b) => {
      if (sortBy === "username") return a.username.localeCompare(b.username);
      if (sortBy === "status") {
        const sa = STATUS_ORDER[normaliseStatus(a.status)];
        const sb = STATUS_ORDER[normaliseStatus(b.status)];
        if (sa !== sb) return sa - sb;
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (sortBy === "oldest") return ta - tb;
      return tb - ta; // newest
    });
    return list;
  }, [tickets, tab, search, sortBy, dateRange, customRange, chipStatuses]);

  // Always group by date bucket; sort within each bucket follows the selected sort.
  const grouped = useMemo(() => {
    const now = new Date();
    const buckets: Record<DateGroup, TicketRow[]> = {
      today: [], yesterday: [], thisWeek: [], older: [], unknown: [],
    };
    filtered.forEach(t => { buckets[bucketOf(t.createdAt, now)].push(t); });
    return DATE_GROUP_ORDER
      .map(g => ({ group: g as DateGroup, items: buckets[g] }))
      .filter(g => g.items.length > 0);
  }, [filtered]);

  const active = useMemo(() => {
    if (activeId === EXAMPLE_TICKET.id && showExample) return EXAMPLE_TICKET;
    return filtered.find(t => t.id === activeId) || filtered[0] || null;
  }, [filtered, activeId, showExample]);
  const activeStatus = active ? normaliseStatus(active.status) : "checking";

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const res = await apiRequest("PATCH", `/api/merchant/tickets/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/password-recovery-requests/pending-count"] });
      toast({ title: t("dashboard.ticketsDialog.toast.statusUpdated") });
    },
    onError: (err: any) => toast({ title: t("dashboard.ticketsDialog.toast.statusUpdateFailed"), description: err?.message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const res = await apiRequest("POST", `/api/merchant/tickets/${id}/reply`, { message });
      return res.json();
    },
    onSuccess: () => {
      setReplyText("");
      toast({ title: t("dashboard.ticketsDialog.toast.replySent") });
    },
    onError: (err: any) => toast({ title: t("dashboard.ticketsDialog.toast.replyFailed"), description: err?.message, variant: "destructive" }),
  });

  const sendPasswordToCustomer = async (ticket: TicketRow) => {
    if (!ticket.sessionId || !ticket.newPassword) return;
    const displayName = ticket.session?.customerName?.trim() || t("dashboard.ticketsDialog.fallbackCustomerName");
    const message = t("dashboard.ticketsDialog.sendMessageTemplate")
      .replace("{name}", displayName)
      .replace("{username}", ticket.username)
      .replace("{password}", ticket.newPassword);
    setSendingPwdId(ticket.id);
    try {
      await apiRequest("POST", `/api/merchant/tickets/${ticket.id}/reply`, { message });
      setSentPwdIds(prev => {
        const next = new Set(prev);
        next.add(ticket.id);
        return next;
      });
      toast({ title: t("dashboard.ticketsDialog.toast.passwordSent") });
    } catch (err: any) {
      toast({ title: t("dashboard.ticketsDialog.toast.sendFailed"), description: err?.message, variant: "destructive" });
    } finally {
      setSendingPwdId(prev => (prev === ticket.id ? null : prev));
    }
  };

  const copyPwd = async (id: string, pwd: string) => {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopiedPwdId(id);
      setTimeout(() => setCopiedPwdId(prev => (prev === id ? null : prev)), 1800);
    } catch {
      toast({ title: t("dashboard.ticketsDialog.toast.passwordCopied"), variant: "destructive" });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden flex flex-col bg-zinc-900 border border-zinc-800/80 shadow-2xl rounded-2xl w-[94vw] max-w-[420px] h-[88dvh] max-h-[680px] sm:w-[96vw] sm:max-w-6xl sm:h-[88dvh] sm:max-h-none"
        data-testid="dialog-tickets"
      >
        <DialogHeader className="px-3 sm:px-5 py-3 sm:py-4 border-b border-border/50 bg-background/40 pr-12">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Ticket className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <DialogTitle data-testid="text-tickets-title" className="truncate text-base sm:text-lg">{t("dashboard.ticketsDialog.title")}</DialogTitle>
                <DialogDescription className="text-xs mt-0.5 truncate hidden sm:block">
                  {t("dashboard.ticketsDialog.tutorialDialog.desc")}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setTutorialOpen(true)}
                className="sm:hidden"
                aria-label={t("dashboard.ticketsDialog.tutorial")}
                data-testid="button-open-tutorial-mobile"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => refetch()}
                disabled={isFetching}
                className="sm:hidden"
                aria-label={t("dashboard.ticketsDialog.refresh")}
                data-testid="button-refresh-tickets-mobile"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTutorialOpen(true)}
                className="gap-1.5 hidden sm:inline-flex"
                data-testid="button-open-tutorial"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {t("dashboard.ticketsDialog.tutorial")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1.5 hidden sm:inline-flex"
                data-testid="button-refresh-tickets"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t("dashboard.ticketsDialog.refresh")}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {desktopNotif.needsPrompt && (
          <div
            className="px-5 py-3 border-b border-border/50 bg-amber-50/70 dark:bg-amber-950/30 flex items-start sm:items-center gap-3 flex-col sm:flex-row"
            data-testid="banner-enable-desktop-notifications"
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Bell className="w-4 h-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0">
                <div className="text-sm font-medium" data-testid="text-desktop-notif-title">
                  {t("dashboard.ticketsDialog.enableNotif")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("dashboard.ticketsDialog.notifBannerSubtitle")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Button
                size="sm"
                onClick={desktopNotif.enable}
                disabled={desktopNotif.enabling}
                data-testid="button-enable-desktop-notifications"
              >
                {desktopNotif.enabling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                {t("dashboard.ticketsDialog.enableNotif")}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={desktopNotif.dismiss}
                aria-label={t("dashboard.ticketsDialog.close")}
                data-testid="button-dismiss-desktop-notifications"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[380px_1fr]">
          {/* LEFT: list — hidden on mobile when a ticket is open */}
          <div className={`${mobileView === "detail" ? "hidden md:flex" : "flex"} flex-col border-r border-border/50 min-h-0 bg-background/30`}>
            <div className="p-3 border-b border-border/50 flex flex-col gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t("dashboard.ticketsDialog.search")}
                  className="pl-8 h-9 bg-background/60"
                  data-testid="input-search-tickets"
                />
              </div>
              <Tabs value={tab} onValueChange={v => { setTab(v as TicketStatus); setActiveId(null); setMobileView("list"); }}>
                <TabsList className="grid grid-cols-3 w-full">
                  {(["checking", "rejected", "solved"] as TicketStatus[]).map(s => (
                    <TabsTrigger key={s} value={s} className="gap-1.5 text-xs min-w-0" data-testid={`tab-${s}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[s]}`} />
                      <span className="truncate">{t(STATUS_LABEL_KEY[s])}</span>
                      <Badge variant="secondary" className="ml-0.5 px-1.5 h-4 text-[10px] shrink-0">{counts[s]}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Multi-status filter chips — desktop only; mobile uses tabs above to avoid duplication */}
              <div className="hidden md:flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{t("dashboard.ticketsDialog.filterStatus")}</span>
                {(["checking", "rejected", "solved"] as TicketStatus[]).map(s => {
                  const on = chipStatuses.has(s);
                  return (
                    <Badge
                      key={s}
                      onClick={() => toggleChip(s)}
                      className={`cursor-pointer gap-1 px-2 ${on ? STATUS_BADGE_TINT[s] : "bg-muted/40 text-muted-foreground border border-border/40"}`}
                      data-testid={`chip-status-${s}`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
                      {t(STATUS_LABEL_KEY[s])}
                    </Badge>
                  );
                })}
                {chipStatuses.size > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => { setChipStatuses(new Set()); setActiveId(null); }}
                    data-testid="button-clear-chips"
                  >
                    {t("dashboard.ticketsDialog.reset")}
                  </Button>
                ) : null}
              </div>

              {/* Date range + sort row — even 2-column grid on mobile, wrap on desktop */}
              <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:flex-wrap">
                <Select value={dateRange} onValueChange={(v) => { setDateRange(v as DateRange); if (v !== "custom") setCustomRange(undefined); }}>
                  <SelectTrigger className="h-8 w-full md:flex-1 md:min-w-[140px] text-xs gap-1.5 bg-background/60" data-testid="select-date-range">
                    <CalendarRange className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-range-all">{t("dashboard.ticketsDialog.dateAll")}</SelectItem>
                    <SelectItem value="today" data-testid="option-range-today">{t("dashboard.ticketsDialog.dateToday")}</SelectItem>
                    <SelectItem value="7d" data-testid="option-range-7d">{t("dashboard.ticketsDialog.date7d")}</SelectItem>
                    <SelectItem value="30d" data-testid="option-range-30d">{t("dashboard.ticketsDialog.date30d")}</SelectItem>
                    <SelectItem value="custom" data-testid="option-range-custom">{t("dashboard.ticketsDialog.dateCustom")}</SelectItem>
                  </SelectContent>
                </Select>
                {dateRange === "custom" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs bg-background/60"
                        data-testid="button-custom-range"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {customRange?.from
                          ? customRange.to
                            ? `${format(customRange.from, "d MMM")} - ${format(customRange.to, "d MMM")}`
                            : format(customRange.from, "d MMM yyyy")
                          : t("dashboard.ticketsDialog.pickDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={customRange}
                        onSelect={setCustomRange}
                        numberOfMonths={1}
                      />
                      {customRange?.from || customRange?.to ? (
                        <div className="p-2 border-t flex justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setCustomRange(undefined)} data-testid="button-clear-custom-range">
                            {t("dashboard.ticketsDialog.clear")}
                          </Button>
                        </div>
                      ) : null}
                    </PopoverContent>
                  </Popover>
                ) : null}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                  <SelectTrigger className="h-8 w-full md:flex-1 md:min-w-[140px] text-xs gap-1.5 bg-background/60" data-testid="select-sort">
                    {sortBy === "newest" ? (
                      <ArrowDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : sortBy === "oldest" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : sortBy === "username" ? (
                      <ArrowDownAZ className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest" data-testid="option-sort-newest">{t(SORT_LABEL_KEY.newest)}</SelectItem>
                    <SelectItem value="oldest" data-testid="option-sort-oldest">{t(SORT_LABEL_KEY.oldest)}</SelectItem>
                    <SelectItem value="status" data-testid="option-sort-status">{t(SORT_LABEL_KEY.status)}</SelectItem>
                    <SelectItem value="username" data-testid="option-sort-username">{t(SORT_LABEL_KEY.username)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 flex flex-col gap-3">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-md" />)
                ) : grouped.length === 0 ? (
                  <EmptyState
                    showExample={showExample}
                    onToggleExample={() => setShowExample(v => !v)}
                    onSelectExample={() => openTicket(EXAMPLE_TICKET.id)}
                    isExampleActive={active?.id === EXAMPLE_TICKET.id}
                    nowTick={nowTick}
                    t={t}
                  />
                ) : grouped.map(({ group, items }, gi) => (
                  <div key={group ?? `flat-${gi}`} className="flex flex-col gap-2">
                    {group ? (
                      <div className="flex items-center justify-between px-1 sticky top-0 z-[1] py-1 bg-background/95 rounded-md">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                          {t(DATE_GROUP_LABEL_KEY[group])}
                        </span>
                        <Badge variant="secondary" className="px-1.5 h-4 text-[10px] shrink-0">{items.length}</Badge>
                      </div>
                    ) : null}
                    {items.map(t => (
                      <TicketCard
                        key={t.id}
                        ticket={t}
                        isActive={active?.id === t.id}
                        onClick={() => openTicket(t.id)}
                        nowTick={nowTick}
                      />
                    ))}
                  </div>
                ))}

                {/* Inline example below list when not empty but example explicitly opened */}
                {grouped.length > 0 && showExample && (
                  <div className="mt-2 flex flex-col gap-2 border-t border-dashed border-border/50 pt-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("dashboard.ticketsDialog.exampleTickets")}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => setShowExample(false)}
                        data-testid="button-hide-example"
                      >
                        <EyeOff className="w-3 h-3" /> {t("dashboard.ticketsDialog.hide")}
                      </Button>
                    </div>
                    <TicketCard
                      ticket={EXAMPLE_TICKET}
                      isActive={active?.id === EXAMPLE_TICKET.id}
                      onClick={() => openTicket(EXAMPLE_TICKET.id)}
                      isExample
                      nowTick={nowTick}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: detail — hidden on mobile when viewing list */}
          <div className={`${mobileView === "list" ? "hidden md:flex" : "flex"} flex-col min-h-0 bg-background/40`}>
            {!active ? (
              <EmptyDetail onOpenTutorial={() => setTutorialOpen(true)} />
            ) : (
              <>
                {/* Status header strip */}
                <div className={`${STATUS_BAR[activeStatus]} h-1.5 w-full`} />
                <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-border/50">
                  {/* Row 1: back (mobile only) + name + primary status badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="md:hidden h-8 w-8 rounded-full shrink-0 -ml-1"
                      onClick={() => setMobileView("list")}
                      aria-label={t("dashboard.ticketsDialog.back")}
                      data-testid="button-back-to-list"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="text-base sm:text-lg font-semibold truncate min-w-0 flex-1" title={active.username} data-testid="text-detail-username">{active.username}</h3>
                    <Badge className={`gap-1.5 ${STATUS_BADGE_TINT[activeStatus]} shrink-0`} data-testid="badge-detail-status">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[activeStatus]}`} />
                      <span className="hidden xs:inline">{t(STATUS_LABEL_KEY[activeStatus])}</span>
                      <span className="xs:hidden truncate max-w-[80px]">{t(STATUS_LABEL_KEY[activeStatus])}</span>
                    </Badge>
                    {active.manualOverride ? <Badge variant="outline" className="gap-1 shrink-0 hidden sm:inline-flex"><ShieldAlert className="w-3 h-3" /> {t("dashboard.ticketsDialog.manual")}</Badge> : null}
                  </div>

                  {/* Row 2: meta (id, type, time) */}
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-x-3 gap-y-1 flex-wrap">
                    {active.ticketId ? <span className="inline-flex items-center gap-1 truncate max-w-full" title={active.ticketId}><Hash className="w-3 h-3 shrink-0" /><span className="truncate">{active.ticketId}</span></span> : null}
                    {active.requestType ? <span className="truncate" title={active.requestType}>{t("dashboard.ticketsDialog.type")}: {active.requestType}</span> : null}
                    {active.createdAt ? <span className="truncate">{formatDistanceToNow(new Date(active.createdAt), { addSuffix: true })}</span> : null}
                    {active.manualOverride ? <Badge variant="outline" className="gap-1 shrink-0 sm:hidden h-5"><ShieldAlert className="w-3 h-3" /> {t("dashboard.ticketsDialog.manual")}</Badge> : null}
                  </div>

                  {/* Row 3: status override / example badge / sheet link */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {active.id === EXAMPLE_TICKET.id ? (
                      <Badge variant="outline" className="gap-1.5" data-testid="badge-example-readonly">
                        <Eye className="w-3 h-3" /> {t("dashboard.ticketsDialog.exampleMode")}
                      </Badge>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground shrink-0">{t("dashboard.ticketsDialog.overrideStatus")}</span>
                        <Select
                          value={activeStatus}
                          onValueChange={(v) => statusMutation.mutate({ id: active.id, status: v as TicketStatus })}
                          disabled={statusMutation.isPending}
                        >
                          <SelectTrigger className="h-8 flex-1 min-w-[160px] sm:flex-none sm:w-[180px]" data-testid="select-status-override">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking" data-testid="option-checking">{t("dashboard.ticketsDialog.status.checking")}</SelectItem>
                            <SelectItem value="rejected" data-testid="option-rejected">{t("dashboard.ticketsDialog.status.rejected")}</SelectItem>
                            <SelectItem value="solved" data-testid="option-solved">{t("dashboard.ticketsDialog.status.solved")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                      )}
                    {active.id !== EXAMPLE_TICKET.id && sheetId && active.sheetRowIndex ? (
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0&range=A${active.sheetRowIndex}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-open-sheet"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> {t("dashboard.ticketsDialog.openSheet")}
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-5 flex flex-col gap-4">
                    {active.id === EXAMPLE_TICKET.id && (
                      <div className="text-xs px-3 py-2 rounded-md border border-dashed border-border/60 bg-muted/40 text-muted-foreground" data-testid="banner-example-detail">
                        {t("dashboard.ticketsDialog.exampleDetailBanner")}
                      </div>
                    )}

                    {/* Solved highlight */}
                    {activeStatus === "solved" && active.newPassword ? (
                      <Card className="overflow-hidden border-emerald-500/30">
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-start gap-3">
                          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{t("dashboard.ticketsDialog.passwordResetSuccess")}</p>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <code className="px-2 py-1 rounded bg-background border text-sm font-mono break-all max-w-full" data-testid="text-new-password">
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
                                {copiedPwdId === active.id ? t("dashboard.ticketsDialog.copied") : t("dashboard.ticketsDialog.copy")}
                              </Button>
                              {active.sessionId ? (
                                <Button
                                  size="sm"
                                  onClick={() => sendPasswordToCustomer(active)}
                                  disabled={sendingPwdId === active.id || sentPwdIds.has(active.id)}
                                  className="gap-1.5"
                                  data-testid="button-send-password"
                                >
                                  {sendingPwdId === active.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : sentPwdIds.has(active.id) ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  {sentPwdIds.has(active.id) ? t("dashboard.ticketsDialog.sent") : t("dashboard.ticketsDialog.sendPassword")}
                                </Button>
                              ) : null}
                            </div>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {t("dashboard.ticketsDialog.passwordShareHint")}
                            </p>
                          </div>
                          <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        </div>
                      </Card>
                    ) : null}

                    {/* Customer + session info */}
                    <Card className="p-4">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-3">{t("dashboard.ticketsDialog.customerInfo")}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                        <Field label={t("dashboard.ticketsDialog.field.name")} value={active.session?.customerName} testId="field-customer-name" />
                        <Field label={t("dashboard.ticketsDialog.field.username")} value={active.username} testId="field-username" />
                        <Field label={t("dashboard.ticketsDialog.field.phone")} value={active.phoneNumber} testId="field-phone" />
                        <Field label={t("dashboard.ticketsDialog.field.bank")} value={active.bankAccount} testId="field-bank" />
                        <Field
                          label={t("dashboard.ticketsDialog.field.ip")}
                          value={active.session?.clientIp}
                          testId="field-ip"
                          icon={<Globe className="w-3 h-3 text-muted-foreground shrink-0" />}
                        />
                        <Field
                          label={t("dashboard.ticketsDialog.field.country")}
                          value={active.session?.countryName || active.session?.countryCode}
                          testId="field-country"
                          prefix={<CountryFlag code={active.session?.countryCode} />}
                        />
                        <Field label={t("dashboard.ticketsDialog.field.city")} value={active.session?.cityName} testId="field-city" />
                        <Field label={t("dashboard.ticketsDialog.field.requestType")} value={active.requestType || t("dashboard.ticketsDialog.requestTypeFallback")} testId="field-request-type" />
                      </div>
                      {active.session?.userAgent ? (
                        <div className="mt-3 pt-3 border-t border-border/40">
                          <Field label={t("dashboard.ticketsDialog.field.userAgent")} value={active.session.userAgent} testId="field-user-agent" wrap />
                        </div>
                      ) : null}
                    </Card>

                    {/* Sheet row */}
                    {active.extraData && Object.keys(active.extraData).length > 0 ? (
                      <Card className="p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-3">{t("dashboard.ticketsDialog.sheetData")}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm">
                          {Object.entries(active.extraData).map(([k, v]) => (
                            <Field key={k} label={k} value={v} testId={`field-extra-${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} wrap />
                          ))}
                        </div>
                      </Card>
                    ) : null}

                    {/* Reply */}
                    {active.sessionId ? (
                      <Card className="p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-2">{t("dashboard.ticketsDialog.replyCustomer")}</p>
                        <Textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder={t("dashboard.ticketsDialog.replyPlaceholder")}
                          className="min-h-[88px] resize-none"
                          data-testid="textarea-reply"
                        />
                        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[11px] text-muted-foreground">{t("dashboard.ticketsDialog.replyHint")}</p>
                          <Button
                            size="sm"
                            disabled={!replyText.trim() || replyMutation.isPending}
                            onClick={() => replyMutation.mutate({ id: active.id, message: replyText })}
                            className="gap-1.5"
                            data-testid="button-send-reply"
                          >
                            {replyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {t("dashboard.ticketsDialog.send")}
                          </Button>
                        </div>
                      </Card>
                    ) : null}

                    {active.lastSyncedAt ? (
                      <p className="text-[10px] text-muted-foreground text-right">
                        {t("dashboard.ticketsDialog.lastSynced")} {formatDistanceToNow(new Date(active.lastSyncedAt), { addSuffix: true })}
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

    <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </>
  );
}

const TicketCard = React.memo(function TicketCard({
  ticket,
  isActive,
  onClick,
  isExample = false,
  nowTick: _nowTick,
}: {
  ticket: TicketRow;
  isActive: boolean;
  onClick: () => void;
  isExample?: boolean;
  nowTick?: number;
}) {
  const { t } = useLanguage();
  const st = normaliseStatus(ticket.status);
  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer hover-elevate ${isActive ? "ring-2 ring-primary" : ""} ${isExample ? "border-dashed" : ""}`}
      data-testid={`card-ticket-${ticket.id}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${STATUS_BAR[st]}`} />
      <div className="pl-3.5 pr-3 py-3 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <UserIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <span
              className="font-medium text-sm truncate min-w-0"
              title={ticket.username}
              data-testid={`text-ticket-username-${ticket.id}`}
            >
              {ticket.username}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isExample ? (
              <Badge variant="outline" className="text-[9px] px-1.5 border-dashed">{t("dashboard.ticketsDialog.exampleBadge")}</Badge>
            ) : null}
            {ticket.manualOverride ? (
              <Badge variant="outline" className="text-[9px] gap-1 px-1.5">
                <ShieldAlert className="w-2.5 h-2.5" /> {t("dashboard.ticketsDialog.manual")}
              </Badge>
            ) : null}
            <Badge className={`text-[9px] gap-1 px-1.5 ${STATUS_BADGE_TINT[st]}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[st]}`} />
              <span className="truncate max-w-[80px]">{t(STATUS_LABEL_KEY[st])}</span>
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
          {ticket.ticketId ? (
            <span className="inline-flex items-center gap-1 truncate min-w-0 max-w-[50%]" title={ticket.ticketId}>
              <Hash className="w-3 h-3 shrink-0" />
              <span className="truncate">{ticket.ticketId}</span>
            </span>
          ) : null}
          {ticket.session?.countryCode ? (
            <span className="inline-flex items-center gap-1 truncate min-w-0" title={ticket.session.countryName || ticket.session.countryCode}>
              <CountryFlag code={ticket.session.countryCode} />
              <span className="truncate">{ticket.session.countryName || ticket.session.countryCode}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2 min-w-0">
          <span className="truncate min-w-0" title={ticket.session?.clientIp || t("dashboard.ticketsDialog.ipUnavailable")}>
            {ticket.session?.clientIp || t("dashboard.ticketsDialog.ipUnavailable")}
          </span>
          <span className="shrink-0">{ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }) : ""}</span>
        </div>
      </div>
    </Card>
  );
}, (prev, next) => {
  // Re-render only when meaningful fields change.
  return (
    prev.isActive === next.isActive &&
    prev.isExample === next.isExample &&
    prev.nowTick === next.nowTick &&
    prev.ticket.id === next.ticket.id &&
    prev.ticket.status === next.ticket.status &&
    prev.ticket.manualOverride === next.ticket.manualOverride &&
    prev.ticket.username === next.ticket.username &&
    prev.ticket.ticketId === next.ticket.ticketId &&
    prev.ticket.createdAt === next.ticket.createdAt &&
    prev.ticket.session?.clientIp === next.ticket.session?.clientIp &&
    prev.ticket.session?.countryCode === next.ticket.session?.countryCode &&
    prev.ticket.session?.countryName === next.ticket.session?.countryName
  );
});

function EmptyState({
  showExample,
  onToggleExample,
  onSelectExample,
  isExampleActive,
  nowTick,
  t,
}: {
  showExample: boolean;
  onToggleExample: () => void;
  onSelectExample: () => void;
  isExampleActive: boolean;
  nowTick?: number;
  t: (k: string) => string;
}) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4 gap-3" data-testid="text-no-tickets">
      <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
        <Inbox className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">{t("dashboard.ticketsDialog.noTickets")}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
          {t("dashboard.ticketsDialog.noTicketsDesc")}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={onToggleExample}
        data-testid="button-toggle-example"
      >
        {showExample ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {showExample ? t("dashboard.ticketsDialog.hideExample") : t("dashboard.ticketsDialog.showExample")}
      </Button>
      {showExample && (
        <div className="w-full mt-2">
          <TicketCard
            ticket={EXAMPLE_TICKET}
            isActive={isExampleActive}
            onClick={onSelectExample}
            isExample
            nowTick={nowTick}
          />
          <p className="text-[10px] text-muted-foreground mt-2">
            {t("dashboard.ticketsDialog.exampleClickHint")}
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyDetail({ onOpenTutorial }: { onOpenTutorial: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6" data-testid="text-empty-detail">
      <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
        <Ticket className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{t("dashboard.ticketsDialog.selectTicket")}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
          {t("dashboard.ticketsDialog.selectTicketDesc")}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={onOpenTutorial} className="gap-1.5" data-testid="button-open-tutorial-detail">
        <HelpCircle className="w-3.5 h-3.5" /> {t("dashboard.ticketsDialog.openTutorial")}
      </Button>
    </div>
  );
}

function TutorialDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useLanguage();
  const steps = [0, 1, 2, 3, 4].map((i) => ({
    title: t(`dashboard.ticketsDialog.tutorialSteps.${i}.title`),
    body: t(`dashboard.ticketsDialog.tutorialSteps.${i}.body`),
  }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg w-[94vw] bg-background/90 backdrop-blur-xl border border-border/50 shadow-2xl"
        data-testid="dialog-tickets-tutorial"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            {t("dashboard.ticketsDialog.tutorialDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.ticketsDialog.tutorialDialog.desc")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-2 px-2">
          <ol className="flex flex-col gap-3">
            {steps.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-muted/30"
                data-testid={`tutorial-step-${i + 1}`}
              >
                <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-words">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 break-words">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </ScrollArea>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button onClick={() => onOpenChange(false)} className="gap-1.5" data-testid="button-close-tutorial">
            {t("dashboard.ticketsDialog.done")} <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, value, testId, icon, prefix, wrap = false,
}: { label: string; value?: string | null; testId: string; icon?: React.ReactNode; prefix?: React.ReactNode; wrap?: boolean }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-sm min-w-0 ${wrap ? "break-words" : "truncate"}`}
        title={typeof value === "string" ? value : undefined}
        data-testid={testId}
      >
        {prefix}{icon}
        {value ? (
          <span className={wrap ? "break-words min-w-0" : "truncate min-w-0"}>{value}</span>
        ) : (
          <span className="text-muted-foreground italic">—</span>
        )}
      </span>
    </div>
  );
}
