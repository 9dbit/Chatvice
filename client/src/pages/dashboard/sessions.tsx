import { useLanguage } from "@/hooks/use-language";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  MessageSquare, Bot, HeadphonesIcon, Send, Search, User, Download, 
  Hand, ArrowLeft, Clock, Edit, Check, X, Loader2, RefreshCw, AlertCircle,
  CheckCircle2, Circle, XCircle, Filter, ShoppingBag, Plus, ImageIcon, Video, FileText,
  ExternalLink, Maximize2, Minimize2, MapPin, Volume2, VolumeX, Monitor, Globe, Smartphone, Radio,
  Languages, Wand2, Settings2, Info, Copy, Link2, StopCircle, Archive, CalendarDays,
  Megaphone, Users, ChevronDown, ChevronUp, FileUp, RotateCcw, Ban, TrendingUp, Ticket
} from "lucide-react";
import {
  SiAndroid, SiApple, SiLinux,
  SiGooglechrome, SiFirefox, SiSafari, SiOpera,
} from "react-icons/si";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { formatDistanceToNow } from "date-fns";
import type { Session, Message, Supervisor, Agent, QuickReply, ProductCard, ProductCardButton } from "@shared/schema";
import { playIncomingChatSound, playChatReplySound, playAngrySound } from "@/lib/sounds";

function renderMessageWithLinks(content: string) {
  const urlRegex = /(https?:\/\/[^\s<>"')\]]+|(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:com|org|net|io|app|dev|id|co|me|info|biz|xyz|tech|store|shop|site|online|cloud|ai|gg|tv|cc|us|uk|eu|de|fr|jp|kr|cn|in|au|ca|br|ru|nl|se|no|fi|dk|pl|cz|at|ch|it|es|pt|be|ie|nz|sg|my|th|ph|vn|hk|tw|za|mx|ar|cl|co\.id|co\.uk|co\.jp|co\.kr|co\.nz|com\.au|com\.br|com\.sg|com\.my|com\.ph|ac\.id|or\.id|go\.id|web\.id|sch\.id))(?:\/[^\s<>"')\]]*)?)/gi;
  const parts: { type: "text" | "link"; content: string; url?: string }[] = [];
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const matchStart = match.index;
    const charBefore = matchStart > 0 ? content[matchStart - 1] : " ";
    if (charBefore === "@" || charBefore === "/") continue;
    if (matchStart > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, matchStart) });
    }
    const matchedUrl = match[1];
    const fullUrl = matchedUrl.startsWith("http") ? matchedUrl : `https://${matchedUrl}`;
    parts.push({ type: "link", content: matchedUrl, url: fullUrl });
    lastIndex = matchStart + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }
  if (parts.length === 0) return <span className="whitespace-pre-wrap">{content}</span>;
  return (
    <>
      {parts.map((part, i) => part.type === "link" ? (
        <a key={i} href={part.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium italic hover:underline break-all" style={{ color: '#8b5cf6' }}>
          {part.content}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      ) : (
        <span key={i} className="whitespace-pre-wrap">{part.content}</span>
      ))}
    </>
  );
}

interface ProductCardWithButtons extends ProductCard {
  buttons?: ProductCardButton[];
}

type SessionStatus = "angry" | "active" | "needs_response" | "ended";

function StatusDot({ status }: { status: SessionStatus }) {
  switch (status) {
    case "angry":
      return (
        <span className="relative flex h-2.5 w-2.5" title="Angry Customer - Alert">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      );
    case "active":
      return (
        <span className="relative flex h-2.5 w-2.5" title="Active Chat">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
      );
    case "needs_response":
      return (
        <span className="relative flex h-2.5 w-2.5" title="Needs Supervisor Response">
          <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
        </span>
      );
    case "ended":
      return (
        <span className="relative flex h-2.5 w-2.5" title="Finished">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-400" />
        </span>
      );
    default:
      return null;
  }
}

const AVATAR_COLORS = [
  "bg-rose-500", "bg-pink-500", "bg-fuchsia-500", "bg-purple-500",
  "bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-sky-500",
  "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-green-500",
  "bg-lime-600", "bg-amber-500", "bg-orange-500", "bg-red-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "C").toUpperCase();
}

function isIpAddress(value: string | null | undefined): boolean {
  if (!value) return false;
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+:[0-9a-fA-F:]*$/;
  return ipv4.test(value.trim()) || ipv6.test(value.trim());
}

function getVisitorDisplayName(customerName: string | null | undefined): string {
  if (!customerName || isIpAddress(customerName)) return "Visitor";
  return customerName;
}

function CountryFlag({ code, name }: { code?: string | null; name?: string | null }) {
  if (!code || code === "xx" || code === "XX") return null;
  const lower = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/16x12/${lower}.png`}
      alt={name || code.toUpperCase()}
      title={name || code.toUpperCase()}
      width={16}
      height={12}
      className="inline-block rounded-sm flex-shrink-0"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function DeviceIcon({ userAgent, size = "sm" }: { userAgent?: string | null; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  if (!userAgent) return <Monitor className={`${cls} text-muted-foreground`} />;
  const ua = userAgent.toLowerCase();
  if (/android|iphone|ipad|ipod|mobile|tablet/i.test(ua))
    return <Smartphone className={`${cls} text-muted-foreground`} aria-label="Mobile" />;
  return <Monitor className={`${cls} text-muted-foreground`} aria-label="Desktop" />;
}

function OsIcon({ userAgent, size = "sm" }: { userAgent?: string | null; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (/android/i.test(ua)) return <SiAndroid className={`${cls} text-green-500`} title="Android" />;
  if (/iphone|ipad|ipod/i.test(ua)) return <SiApple className={`${cls} text-muted-foreground`} title="iOS" />;
  if (/windows/i.test(ua)) return <Monitor className={`${cls} text-blue-400`} title="Windows" />;
  if (/macintosh|mac os x/i.test(ua)) return <SiApple className={`${cls} text-muted-foreground`} title="macOS" />;
  if (/linux/i.test(ua)) return <SiLinux className={`${cls} text-yellow-500`} title="Linux" />;
  return null;
}

function BrowserIcon({ userAgent, size = "sm" }: { userAgent?: string | null; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  if (!userAgent) return <Globe className={`${cls} text-muted-foreground`} />;
  const ua = userAgent.toLowerCase();
  if (/edg\//i.test(ua)) return <Globe className={`${cls} text-blue-500`} title="Edge" />;
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return <SiOpera className={`${cls} text-red-500`} title="Opera" />;
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return <SiGooglechrome className={`${cls} text-yellow-500`} title="Chrome" />;
  if (/firefox/i.test(ua)) return <SiFirefox className={`${cls} text-orange-500`} title="Firefox" />;
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return <SiSafari className={`${cls} text-blue-400`} title="Safari" />;
  return <Globe className={`${cls} text-muted-foreground`} />;
}

function HandlerAvatar({ mode, supervisorPhoto, agentPhoto, size = "md", className: extraClass }: { 
  mode: "AI" | "HUMAN";
  supervisorPhoto?: string | null;
  agentPhoto?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const avatarCls = size === "sm" ? "h-8 w-8 border border-primary/20" : "h-12 w-12 border-2 border-primary/20";
  const iconCls  = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  const combinedCls = extraClass ?? avatarCls;

  if (mode === "HUMAN") {
    return (
      <Avatar className={`${combinedCls} border-primary/20`}>
        {supervisorPhoto ? (
          <AvatarImage src={supervisorPhoto} alt="Supervisor" />
        ) : null}
        <AvatarFallback className="bg-primary/10">
          <HeadphonesIcon className={`${iconCls} text-primary`} />
        </AvatarFallback>
      </Avatar>
    );
  }
  
  return (
    <Avatar className={`${combinedCls} border-secondary/20`}>
      {agentPhoto ? (
        <AvatarImage src={agentPhoto} alt="AI Agent" />
      ) : null}
      <AvatarFallback className="bg-secondary">
        <Bot className={`${iconCls} text-secondary-foreground`} />
      </AvatarFallback>
    </Avatar>
  );
}

interface SessionWithPreview extends Omit<Session, 'status' | 'needsSupervisorAttention'> {
  lastMessage?: string;
  lastQuestion?: string;
  status?: string | null;
  needsSupervisorAttention?: boolean | null;
  pendingCustomerMessages?: number;
  hasPasswordTicket?: boolean;
}

interface PreviewContent {
  type: "photo" | "video" | "document" | "url";
  url: string;
  filename?: string;
  title?: string;
}

const TRANSLATE_LANGUAGES = [
  { code: "id", name: "Indonesian" },
  { code: "en", name: "English" },
  { code: "zh", name: "Chinese" },
  { code: "ms", name: "Malay" },
  { code: "ar", name: "Arabic" },
  { code: "ko", name: "Korean" },
  { code: "ja", name: "Japanese" },
  { code: "th", name: "Thai" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
];

export default function SessionsPage() {
  const { t } = useLanguage();
  const { data: authData } = useQuery<{ authenticated: boolean; merchantId?: string }>({
    queryKey: ["/api/auth/me"],
  });
  const merchantId = authData?.merchantId || localStorage.getItem("merchantId") || "";
  
  useEffect(() => {
    if (authData?.merchantId && authData.merchantId !== localStorage.getItem("merchantId")) {
      localStorage.setItem("merchantId", authData.merchantId);
    }
  }, [authData?.merchantId]);
  
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [unreadEscalatedSessionIds, setUnreadEscalatedSessionIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newMessage, setNewMessage] = useState("");
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [revisedAnswer, setRevisedAnswer] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [showQuickReplyPopup, setShowQuickReplyPopup] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState("");
  const [selectedQuickReplyIndex, setSelectedQuickReplyIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [plusMenuView, setPlusMenuView] = useState<"main" | "products">("main");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // Preview panel state
  const [previewContent, setPreviewContent] = useState<PreviewContent | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  
  // Sound notification system
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("sessionSoundEnabled");
    return saved !== null ? saved === "true" : true;
  });
  const previousSessionIdsRef = useRef<Set<string>>(new Set());
  const previousAttentionSessionsRef = useRef<Set<string>>(new Set());
  const sessionMessageCountsRef = useRef<Map<string, number>>(new Map());
  const lastProcessedMessageIdRef = useRef<string | null>(null);
  const initialLoadRef = useRef(true);
  const lastQuestionPerEscalatedRef = useRef<Map<string, string | undefined>>(new Map());
  const sessionRowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  
  // Save sound preference
  useEffect(() => {
    localStorage.setItem("sessionSoundEnabled", String(soundEnabled));
  }, [soundEnabled]);
  
  // Auto-translate state
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [translateLang, setTranslateLang] = useState("Indonesian");
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [isSendingWithTranslate, setIsSendingWithTranslate] = useState(false);
  const translationFetchingRef = useRef<Set<string>>(new Set());
  const translationsDoneRef = useRef<Set<string>>(new Set()); // IDs that already have a result

  // Auto-refine state
  const [autoRefineEnabled, setAutoRefineEnabled] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refineSuggestion, setRefineSuggestion] = useState<string | null>(null);
  const [refineOriginalText, setRefineOriginalText] = useState<string | null>(null);

  // Mobile settings popover state
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  // Visitor info panel state
  const [showVisitorInfo, setShowVisitorInfo] = useState(true);

  // End Session dialog state
  const [endSessionDialogOpen, setEndSessionDialogOpen] = useState(false);

  // Archive popover state (desktop) and dialog state (mobile)
  const [archivePopoverOpen, setArchivePopoverOpen] = useState(false);
  const [archiveMobileDialogOpen, setArchiveMobileDialogOpen] = useState(false);
  const [selectedArchivePeriod, setSelectedArchivePeriod] = useState<string | null>(null);

  // Blast Message dialog state
  const [blastDialogOpen, setBlastDialogOpen] = useState(false);
  const [blastTab, setBlastTab] = useState<"compose" | "history">("compose");
  const [blastFilters, setBlastFilters] = useState<{
    periods: string[]; countries: string[]; cities: string[]; deviceOs: string[];
  }>({ periods: [], countries: [], cities: [], deviceOs: [] });
  const [blastMessage, setBlastMessage] = useState("");
  const [blastMessageTypeVal, setBlastMessageTypeVal] = useState<"text" | "announcement">("text");
  const [blastMediaUrl, setBlastMediaUrl] = useState<string | null>(null);
  const [blastMediaType, setBlastMediaType] = useState<string | null>(null);
  const [blastMediaPreview, setBlastMediaPreview] = useState<string | null>(null);
  const [blastScheduleMode, setBlastScheduleMode] = useState<"now" | "later">("now");
  const [blastScheduleDate, setBlastScheduleDate] = useState<Date | undefined>(undefined);
  const [blastScheduleHour, setBlastScheduleHour] = useState("09");
  const [blastScheduleMinute, setBlastScheduleMinute] = useState("00");
  const [blastConfirmOpen, setBlastConfirmOpen] = useState(false);
  const [blastHistoryPage, setBlastHistoryPage] = useState(1);
  const [blastPreviewExpanded, setBlastPreviewExpanded] = useState(false);
  const [blastCitySearch, setBlastCitySearch] = useState("");
  const [blastIsUploadingMedia, setBlastIsUploadingMedia] = useState(false);
  const [blastCancelId, setBlastCancelId] = useState<string | null>(null);
  const blastFileRef = useRef<HTMLInputElement>(null);
  // Debounced filter state for preview queries
  const [blastFiltersDebounced, setBlastFiltersDebounced] = useState(blastFilters);

  // Clear preview when session changes
  useEffect(() => {
    setPreviewContent(null);
    setIsPreviewExpanded(false);
  }, [selectedSession]);

  // Debounce blast filters for preview queries (400ms)
  useEffect(() => {
    const t = setTimeout(() => setBlastFiltersDebounced(blastFilters), 400);
    return () => clearTimeout(t);
  }, [blastFilters]);

  // Reset auto-translate and auto-refine state when switching sessions
  useEffect(() => {
    setAutoTranslateEnabled(false);
    setTranslateLang("Indonesian");
    setTranslations(new Map());
    setTranslatingIds(new Set());
    translationFetchingRef.current.clear();
    translationsDoneRef.current.clear();
    // Clear any pending refine suggestion so stale state doesn't carry over
    setAutoRefineEnabled(false);
    setRefineSuggestion(null);
    setRefineOriginalText(null);
    setIsRefining(false);
  }, [selectedSession]);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<SessionWithPreview[]>({
    queryKey: ["/api/sessions", merchantId],
    enabled: !!merchantId,
    refetchInterval: 5000,
  });

  const selectedSessionData = sessions?.find((s) => s.id === selectedSession);

  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedSession],
    enabled: !!selectedSession,
    refetchInterval: 2000,
  });

  const { data: supervisors } = useQuery<Supervisor[]>({
    queryKey: ["/api/supervisors", merchantId],
    enabled: !!merchantId,
  });

  const { data: merchant } = useQuery<{ activeAgentId?: string; widgetSettings?: { agentPhotoUrl?: string } }>({
    queryKey: ["/api/merchant", merchantId],
    enabled: !!merchantId,
  });

  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
    enabled: !!merchantId,
  });

  const { data: quickReplies = [] } = useQuery<QuickReply[]>({
    queryKey: ["/api/quick-replies"],
    enabled: !!merchantId,
  });

  const { data: productCards = [] } = useQuery<ProductCardWithButtons[]>({
    queryKey: ["/api/product-cards"],
    enabled: !!merchantId,
  });

  // Product recommendation settings for detecting when to show products
  interface ProductRecommendSettings {
    aiAutoRecommendEnabled: boolean;
    triggerKeywords: string;
    aiContextTriggerEnabled: boolean;
    maxProductsPerRecommendation: number;
    showPriceInRecommendation: boolean;
  }
  
  const { data: productRecommendSettings } = useQuery<ProductRecommendSettings>({
    queryKey: ["/api/product-recommendation-settings"],
    enabled: !!merchantId,
  });

  // Track session escalation state — always runs regardless of sound settings.
  // This drives both the tab-title badge and (when soundEnabled) audio/toast alerts.
  useEffect(() => {
    if (!sessions) return;

    const currentSessionIds = new Set(sessions.map(s => s.id));
    const currentAttentionSessions = new Set(
      sessions.filter(s => s.needsSupervisorAttention).map(s => s.id)
    );

    if (initialLoadRef.current) {
      previousSessionIdsRef.current = currentSessionIds;
      previousAttentionSessionsRef.current = currentAttentionSessions;
      sessions.forEach(s => sessionMessageCountsRef.current.set(s.id, 0));
      // Seed lastQuestion tracking for escalated sessions on first load
      sessions.filter(s => s.needsSupervisorAttention).forEach(s => {
        lastQuestionPerEscalatedRef.current.set(s.id, s.lastQuestion);
      });
      initialLoadRef.current = false;
      return;
    }

    // Check for new sessions
    const newSessions = sessions.filter(s => !previousSessionIdsRef.current.has(s.id));
    if (newSessions.length > 0 && soundEnabled) {
      playIncomingChatSound();
      toast({
        title: t("dashboard.sessions.newMessage"),
        description: `${newSessions.length} ${t("dashboard.sessions.newSessions")}`,
        duration: 5000,
      });
    }

    // Check for sessions that newly require attention (trigger words or anger detected)
    // This includes both new sessions AND existing sessions that just got escalated
    const newlyEscalatedSessions = sessions.filter(s =>
      s.needsSupervisorAttention &&
      !previousAttentionSessionsRef.current.has(s.id)
    );

    // Check for already-escalated sessions that received a new customer message
    const retriggeredSessions = sessions.filter(s =>
      s.needsSupervisorAttention &&
      previousAttentionSessionsRef.current.has(s.id) &&
      lastQuestionPerEscalatedRef.current.has(s.id) &&
      s.lastQuestion !== lastQuestionPerEscalatedRef.current.get(s.id)
    );

    if (soundEnabled) {
      if (newlyEscalatedSessions.length > 0) {
        playAngrySound();
        toast({
          title: t("dashboard.sessions.escalatedAlert"),
          description: `${newlyEscalatedSessions.length} ${t("dashboard.sessions.escalatedDesc")}`,
          duration: 10000,
        });
      } else if (retriggeredSessions.length > 0) {
        playAngrySound();
        const firstRetriggered = retriggeredSessions[0];
        toast({
          title: t("dashboard.sessions.retriggeredAlert"),
          description: `${retriggeredSessions.length} ${t("dashboard.sessions.retriggeredDesc")}`,
          duration: 5000,
          action: (
            <ToastAction
              altText={t("dashboard.sessions.viewChat")}
              onClick={() => handleSelectSession(firstRetriggered.id, true)}
              data-testid="button-toast-view-chat"
            >
              {t("dashboard.sessions.viewChat")}
            </ToastAction>
          ),
        });
      }
    }

    // Update unread escalated badge: add new/retriggered, remove de-escalated.
    // Always runs — independent of soundEnabled.
    // Sessions the merchant is currently viewing are never counted as unread.
    const newlyAlerted = [...newlyEscalatedSessions, ...retriggeredSessions]
      .map(s => s.id)
      .filter(id => id !== selectedSession);
    setUnreadEscalatedSessionIds(prev => {
      const next = new Set(prev);
      newlyAlerted.forEach(id => next.add(id));
      // Remove sessions that are no longer escalated or are currently being viewed
      prev.forEach(id => {
        if (!currentAttentionSessions.has(id) || id === selectedSession) {
          next.delete(id);
        }
      });
      return next;
    });

    // Update lastQuestion tracking: add newly escalated, update existing, remove de-escalated
    sessions.filter(s => s.needsSupervisorAttention).forEach(s => {
      lastQuestionPerEscalatedRef.current.set(s.id, s.lastQuestion);
    });
    lastQuestionPerEscalatedRef.current.forEach((_, id) => {
      if (!currentAttentionSessions.has(id)) {
        lastQuestionPerEscalatedRef.current.delete(id);
      }
    });

    previousSessionIdsRef.current = currentSessionIds;
    previousAttentionSessionsRef.current = currentAttentionSessions;
  }, [sessions, soundEnabled, selectedSession, toast]);
  
  // Track messages in selected session - play reply sound for new messages
  useEffect(() => {
    if (!messages || messages.length === 0 || !selectedSession || !soundEnabled) return;
    
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.id || lastProcessedMessageIdRef.current === lastMessage.id) return;
    
    const prevCount = sessionMessageCountsRef.current.get(selectedSession) || 0;
    const currentCount = messages.length;
    
    if (currentCount > prevCount && prevCount > 0) {
      playChatReplySound();
    }
    
    sessionMessageCountsRef.current.set(selectedSession, currentCount);
    lastProcessedMessageIdRef.current = lastMessage.id;
  }, [messages, selectedSession, soundEnabled]);

  // Capture the page title to restore when sessions page unmounts
  const preMountTitleRef = useRef<string>(document.title);
  useEffect(() => {
    const titleOnMount = document.title;
    preMountTitleRef.current = titleOnMount;
    return () => {
      document.title = preMountTitleRef.current;
    };
  }, []);

  // Update browser tab title when there are unread escalated sessions
  const sessionsBaseTitle = "Sessions | Chatvice";
  useEffect(() => {
    const count = unreadEscalatedSessionIds.size;
    document.title = count > 0 ? `(${count}) ${sessionsBaseTitle}` : sessionsBaseTitle;
  }, [unreadEscalatedSessionIds]);

  // Helper to select a session and mark it as read in the escalated unread set
  const handleSelectSession = (sessionId: string | null, scrollIntoView = false) => {
    setSelectedSession(sessionId);
    if (sessionId) {
      setUnreadEscalatedSessionIds(prev => {
        if (!prev.has(sessionId)) return prev;
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
      if (scrollIntoView) {
        requestAnimationFrame(() => {
          const el = sessionRowRefs.current.get(sessionId);
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
    }
  };

  // Helper function to check if products should be shown based on message content
  const shouldShowProductsForMessage = (messageContent: string): boolean => {
    if (!productCards.length) return false;
    if (!productRecommendSettings?.aiAutoRecommendEnabled) return false;
    
    const triggerKeywords = productRecommendSettings?.triggerKeywords || "product,recommend,buy,shop,item,catalog,produk,beli,harga,barang,katalog";
    const productTriggers = triggerKeywords.toLowerCase().split(",").map(t => t.trim()).filter(t => t.length > 0);
    const lowerContent = messageContent.toLowerCase();
    
    return productTriggers.some(trigger => lowerContent.includes(trigger));
  };

  const offerProductMutation = useMutation({
    mutationFn: async (productCardId: string) => {
      return apiRequest("POST", "/api/session/offer-product", {
        sessionId: selectedSession,
        productCardId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedSession] });
      setShowPlusMenu(false);
      setPlusMenuView("main");
      toast({
        title: t("dashboard.sessions.productOffered"),
        description: t("dashboard.sessions.productOfferedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.sessions.productOfferFailed"),
        description: t("dashboard.common.errorDesc"),
        variant: "destructive",
      });
    },
  });

  const filteredQuickReplies = quickReplies.filter(qr => {
    if (!quickReplyFilter) return true;
    return qr.label.toLowerCase().includes(quickReplyFilter.toLowerCase()) ||
           qr.content.toLowerCase().includes(quickReplyFilter.toLowerCase());
  });

  const handleQuickReplyClick = (qr: QuickReply) => {
    setNewMessage(qr.content);
    setShowQuickReplyPopup(false);
    setQuickReplyFilter("");
    inputRef.current?.focus();
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (value.startsWith("/") && quickReplies.length > 0) {
      setShowQuickReplyPopup(true);
      setQuickReplyFilter(value.slice(1));
      setSelectedQuickReplyIndex(0);
    } else {
      setShowQuickReplyPopup(false);
      setQuickReplyFilter("");
    }
  };

  const getAgentName = (agentId: string | null | undefined) => {
    // Don't fall back to active agent - show only the agent that was assigned to this session
    if (!agentId || !agents) return "AI Assistant";
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || "AI Assistant";
  };

  const getAgentPhoto = (agentId: string | null | undefined) => {
    // Don't fall back to active agent - show only the agent that was assigned to this session
    if (!agentId || !agents) return null;
    const agent = agents.find(a => a.id === agentId);
    return agent?.photoUrl || null;
  };

  const getSupervisorName = (supervisorId: string | null | undefined, agentId?: string | null) => {
    // First try the session's assigned supervisor
    if (supervisorId && supervisors) {
      const supervisor = supervisors.find(s => s.id === supervisorId);
      if (supervisor?.name) return supervisor.name;
    }
    // Fallback to the agent's assigned supervisor
    const effectiveAgentId = agentId || merchant?.activeAgentId;
    if (effectiveAgentId && agents && supervisors) {
      const agent = agents.find(a => a.id === effectiveAgentId);
      if (agent?.supervisorId) {
        const supervisor = supervisors.find(s => s.id === agent.supervisorId);
        if (supervisor?.name) return supervisor.name;
      }
    }
    return null;
  };

  const getSupervisorPhoto = (supervisorId: string | null | undefined, agentId?: string | null) => {
    // First try the session's assigned supervisor
    if (supervisorId && supervisors) {
      const supervisor = supervisors.find(s => s.id === supervisorId);
      if (supervisor?.photoUrl) return supervisor.photoUrl;
    }
    // Fallback to the agent's assigned supervisor
    const effectiveAgentId = agentId || merchant?.activeAgentId;
    if (effectiveAgentId && agents && supervisors) {
      const agent = agents.find(a => a.id === effectiveAgentId);
      if (agent?.supervisorId) {
        const supervisor = supervisors.find(s => s.id === agent.supervisorId);
        if (supervisor?.photoUrl) return supervisor.photoUrl;
      }
    }
    return null;
  };

  // Fetch a single translation and cache it; skips if already fetched or in-progress
  const fetchTranslation = useCallback(async (id: string, text: string, lang: string) => {
    if (!text?.trim() || translationFetchingRef.current.has(id) || translationsDoneRef.current.has(id)) return;
    translationFetchingRef.current.add(id);
    setTranslatingIds(prev => new Set([...prev, id]));
    try {
      const res = await apiRequest("POST", "/api/translate", { text, targetLang: lang });
      const data = await res.json();
      if (data.translated) {
        translationsDoneRef.current.add(id);
        setTranslations(prev => new Map([...prev, [id, data.translated]]));
      }
    } catch {
      // silently ignore translation errors so UI continues working
    } finally {
      translationFetchingRef.current.delete(id);
      setTranslatingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, []);

  // Clear translations when language changes or translate is toggled off/on
  useEffect(() => {
    setTranslations(new Map());
    setTranslatingIds(new Set());
    translationFetchingRef.current.clear();
    translationsDoneRef.current.clear();
  }, [translateLang, autoTranslateEnabled]);

  // Fetch translations for all loaded messages when translate is ON
  useEffect(() => {
    if (!autoTranslateEnabled || !messages || messages.length === 0) return;
    messages.forEach(msg => {
      if (msg.content?.trim()) {
        fetchTranslation(String(msg.id), msg.content, translateLang);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTranslateEnabled, translateLang, messages?.length, fetchTranslation]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, payload }: { message: string; payload?: Record<string, unknown> }) => {
      return apiRequest("POST", "/api/session/send-message", {
        sessionId: selectedSession,
        message,
        ...(payload ? { payload } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedSession] });
      setNewMessage("");
    },
    onError: () => {
      toast({
        title: t("dashboard.sessions.sendFailed"),
        description: t("dashboard.common.errorDesc"),
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File, type: "photo" | "video" | "document") => {
    if (!file || !selectedSession) return;
    
    setIsUploadingMedia(true);
    setShowPlusMenu(false);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("merchantId", merchantId);
      formData.append("sessionId", selectedSession);
      formData.append("type", type);
      formData.append("fromSupervisor", "true");
      
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(t("dashboard.sessions.throw.uploadFailed"));
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedSession] });
      toast({
        title: t("dashboard.sessions.fileSent"),
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} has been sent to the customer.`,
      });
    } catch {
      toast({
        title: t("dashboard.sessions.uploadFailed"),
        description: t("dashboard.sessions.uploadFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  };

  const takeoverMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", "/api/session/takeover", { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedSession] });
      toast({
        title: t("dashboard.sessions.sessionTakenOver"),
        description: t("dashboard.sessions.sessionTakenOverDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.sessions.takeOverFailed"),
        description: t("dashboard.common.errorDesc"),
        variant: "destructive",
      });
    },
  });

  const returnToBotMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", "/api/session/return-to-bot", { sessionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedSession] });
      toast({
        title: t("dashboard.sessions.returnedToAI"),
        description: t("dashboard.sessions.returnedToAIDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.sessions.returnToBotFailed"),
        description: t("dashboard.common.errorDesc"),
        variant: "destructive",
      });
    },
  });

  // Fetch archive periods (always, not just when popover opens, so it's ready)
  const { data: archivePeriods = [] } = useQuery<string[]>({
    queryKey: ["/api/merchant/chat-logs/periods"],
    enabled: !!merchantId,
  });

  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("PATCH", `/api/merchant/sessions/${sessionId}/end`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", merchantId] });
      setEndSessionDialogOpen(false);
      toast({
        title: "Session ended",
        description: "The session has been marked as finished.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to end session",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const archiveSessionMutation = useMutation({
    mutationFn: async ({ sessionId, period }: { sessionId: string; period: string }) => {
      return apiRequest("POST", `/api/merchant/sessions/${sessionId}/archive`, { period });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/chat-logs/periods"] });
      setArchivePopoverOpen(false);
      setArchiveMobileDialogOpen(false);
      setSelectedArchivePeriod(null);
      toast({
        title: "Session archived",
        description: "The session transcript has been added to the selected archive period.",
      });
    },
    onError: () => {
      toast({
        title: "Archive failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  interface BlastFilterState { periods: string[]; countries: string[]; cities: string[]; deviceOs: string[]; }
  interface BlastPreviewSession { id: string; customerName: string | null; countryName: string | null; cityName: string | null; userAgent: string | null; }
  interface BlastPreviewResult { count: number; sessions: BlastPreviewSession[]; }
  interface BlastCampaignRow {
    id: string; message: string; blastMessageType: string; status: string;
    filters: BlastFilterState; mediaUrl: string | null; mediaType: string | null;
    matchedCount: number; deliveredCount: number; failedCount: number;
    sentAt: string | null; scheduledFor: string | null; successRate: number;
  }
  interface BlastHistoryResult { campaigns: BlastCampaignRow[]; total: number; page: number; pages: number; }
  interface BlastSendPayload {
    message: string; blastMessageType: string;
    filters: BlastFilterState; scheduledFor?: string;
    mediaUrl?: string; mediaType?: string;
  }
  interface BlastSendResult { sent?: boolean; scheduled?: boolean; delivered?: number; failed?: number; matchedCount?: number; scheduledFor?: string; }

  // Blast: options
  const { data: blastOptions } = useQuery<{ countries: { name: string; code: string }[]; cities: string[]; periods: string[]; osOptions: string[] }>({
    queryKey: ["/api/merchant/blast/options"],
    enabled: blastDialogOpen,
    staleTime: 30_000,
  });

  // Blast: preview — uses debounced filters to avoid a request on every keystroke
  const { data: blastPreview, isLoading: blastPreviewLoading } = useQuery<BlastPreviewResult>({
    queryKey: ["/api/merchant/blast/preview", blastFiltersDebounced],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/blast/preview", blastFiltersDebounced);
      return res.json() as Promise<BlastPreviewResult>;
    },
    enabled: blastDialogOpen && blastTab === "compose",
    staleTime: 5_000,
  });

  // Blast: history
  const { data: blastHistory, isLoading: blastHistoryLoading, refetch: refetchBlastHistory } = useQuery<BlastHistoryResult>({
    queryKey: ["/api/merchant/blast/history", blastHistoryPage],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/merchant/blast/history?page=${blastHistoryPage}`);
      return res.json() as Promise<BlastHistoryResult>;
    },
    enabled: blastDialogOpen && blastTab === "history",
    staleTime: 10_000,
  });

  // Blast: send mutation
  const blastSendMutation = useMutation({
    mutationFn: async (payload: BlastSendPayload): Promise<BlastSendResult> => {
      const res = await apiRequest("POST", "/api/merchant/blast/send", payload);
      return res.json();
    },
    onSuccess: (data: BlastSendResult) => {
      setBlastConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/blast/history"] });
      if (data.scheduled) {
        toast({ title: "Blast scheduled", description: `Will send to ${data.matchedCount} sessions on ${new Date(data.scheduledFor!).toLocaleString()}.` });
      } else {
        toast({ title: "Blast sent", description: `Sent to ${data.matchedCount} sessions — Delivered: ${data.delivered}, Failed: ${data.failed}` });
      }
      setBlastMessage("");
      setBlastMessageTypeVal("text");
      setBlastMediaUrl(null);
      setBlastMediaType(null);
      setBlastMediaPreview(null);
      setBlastFilters({ periods: [], countries: [], cities: [], deviceOs: [] });
      setBlastScheduleMode("now");
      setBlastScheduleDate(undefined);
    },
    onError: () => {
      setBlastConfirmOpen(false);
      toast({ title: "Blast failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  // Blast: cancel scheduled
  const blastCancelMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/merchant/blast/${id}/cancel`),
    onSuccess: () => {
      setBlastCancelId(null);
      refetchBlastHistory();
      toast({ title: "Blast cancelled" });
    },
  });

  // Blast helper: build scheduledFor ISO string
  function buildBlastScheduledFor() {
    if (!blastScheduleDate) return undefined;
    const d = new Date(blastScheduleDate);
    const h = Math.min(23, Math.max(0, parseInt(blastScheduleHour, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(blastScheduleMinute, 10) || 0));
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  // Blast media upload handler
  async function handleBlastMediaUpload(file: File) {
    setBlastIsUploadingMedia(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "blast");
      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      // Normalize to chat-standard types: photo | video | document
      const normalizedType = file.type.startsWith("image") ? "photo" : file.type.startsWith("video") ? "video" : "document";
      setBlastMediaUrl(data.url);
      setBlastMediaType(normalizedType);
      setBlastMediaPreview(URL.createObjectURL(file));
    } catch {
      toast({ title: "Upload failed", description: "Could not upload the file.", variant: "destructive" });
    } finally {
      setBlastIsUploadingMedia(false);
    }
  }

  const reviseAnswerMutation = useMutation({
    mutationFn: async ({ messageId, newContent }: { messageId: string; newContent: string }) => {
      return apiRequest("POST", "/api/message/revise", { messageId, content: newContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedSession] });
      setReviseDialogOpen(false);
      setSelectedMessage(null);
      setRevisedAnswer("");
      toast({
        title: t("dashboard.sessions.answerRevised"),
        description: t("dashboard.sessions.answerRevisedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dashboard.sessions.reviseFailed"),
        description: t("dashboard.common.errorDesc"),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getSessionStatus = (session: SessionWithPreview): SessionStatus => {
    if (session.status === "ended" || session.status === "closed" || session.status === "archived") {
      return "ended";
    }
    
    const angerIndicators = ["marah", "kesal", "kecewa", "angry", "frustrated", "upset", "terrible", "worst", "hate", "bodoh", "goblok", "!!!"];
    const lastQuestion = session.lastQuestion?.toLowerCase() || "";
    const isAngry = angerIndicators.some(indicator => lastQuestion.includes(indicator));
    if (isAngry) {
      return "angry";
    }
    
    if (session.needsSupervisorAttention) {
      return "needs_response";
    }
    
    if (session.mode === "HUMAN") {
      return "active";
    }
    
    if (session.lastQuestion && (!session.lastMessage || session.lastMessage === "Awaiting reply...")) {
      return "needs_response";
    }
    
    const lastActivity = session.lastActivity ? new Date(session.lastActivity) : null;
    if (lastActivity) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      if (lastActivity > tenMinutesAgo) {
        return "active";
      }
    }
    
    return "ended";
  };

  const filteredSessions = sessions?.filter((session) => {
    const matchesSearch = 
      session.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    // For agent filtering, consider sessions without agentId as belonging to the merchant's active agent
    const effectiveAgentId = session.agentId || merchant?.activeAgentId;
    const matchesAgent = agentFilter === "all" || effectiveAgentId === agentFilter;
    
    return matchesSearch && matchesAgent;
  });

  const sortedSessions = filteredSessions?.sort((a, b) => {
    const statusOrder = { needs_response: 0, angry: 1, active: 2, ended: 3 };
    const statusA = getSessionStatus(a);
    const statusB = getSessionStatus(b);
    
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB];
    }
    
    const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
    return bTime - aTime;
  });

  // Apply status filter on top of sorted sessions (status counts always reflect pre-filter totals)
  const statusFilteredSessions =
    statusFilter === "all"
      ? sortedSessions
      : statusFilter === "ticket"
        ? sortedSessions?.filter(s => s.hasPasswordTicket)
        : sortedSessions?.filter(s => getSessionStatus(s) === statusFilter);

  // Group sessions by deviceFingerprint, but only collapse empty visitor-only sessions.
  // Real chat sessions (those with at least one message) are always shown as separate list entries —
  // even if multiple sessions share the same browser fingerprint — so no conversation is ever hidden.
  const displayedSessions = statusFilteredSessions ? (() => {
    const fpMap = new Map<string, SessionWithPreview[]>();
    for (const session of statusFilteredSessions) {
      const key = session.deviceFingerprint || session.id;
      const group = fpMap.get(key) || [];
      group.push(session);
      fpMap.set(key, group);
    }

    const result: (SessionWithPreview & { sessionCount: number })[] = [];
    for (const [, group] of fpMap) {
      const withMessages    = group.filter(s => !!(s.lastQuestion || s.lastMessage));
      const withoutMessages = group.filter(s => !(s.lastQuestion  || s.lastMessage));

      if (withMessages.length > 0) {
        // Show every session that has real messages as its own entry.
        withMessages.forEach(s => result.push({ ...s, sessionCount: 1 }));
        // Empty visitor sessions from the same device are suppressed — they have no content to show.
      } else {
        // All sessions from this device are visitor-only (no messages). Collapse into the most recent.
        const best = [...withoutMessages].sort((a, b) => {
          const aT = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const bT = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          return bT - aT;
        })[0];
        result.push({ ...best, sessionCount: group.length });
      }
    }

    // Re-sort the flat list by last activity (most recent first).
    return result.sort((a, b) => {
      const aT = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const bT = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      return bT - aT;
    });
  })() : undefined;

  // Sends the final text (after refine/translate decisions) via the mutation
  const dispatchSend = useCallback(async (text: string) => {
    if (autoTranslateEnabled && selectedSessionData?.mode === "HUMAN") {
      setIsSendingWithTranslate(true);
      try {
        const contextText = (messages || [])
          .filter(m => m.from === "customer" || m.from === "user")
          .slice(-3)
          .map(m => m.content)
          .join("\n");
        const res = await apiRequest("POST", "/api/translate", {
          text,
          targetLang: "auto",
          contextText: contextText || undefined,
        });
        const data = await res.json();
        const translatedText: string = data.translated || text;
        sendMessageMutation.mutate({
          message: translatedText,
          payload: { originalText: text },
        });
      } catch {
        sendMessageMutation.mutate({ message: text });
      } finally {
        setIsSendingWithTranslate(false);
      }
    } else {
      sendMessageMutation.mutate({ message: text });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTranslateEnabled, selectedSessionData?.mode, messages, sendMessageMutation]);

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text) return;

    // Auto Refine: intercept send, show suggestion popup
    if (autoRefineEnabled && selectedSessionData?.mode === "HUMAN") {
      setIsRefining(true);
      try {
        const res = await apiRequest("POST", "/api/refine-message", {
          message: text,
          sessionId: selectedSession,
        });
        if (!res.ok) throw new Error(t("dashboard.sessions.throw.refinementFailed"));
        const data = await res.json();
        const refined: string = data.refined?.trim() || text;
        setRefineOriginalText(text);
        setRefineSuggestion(refined);
        // Don't send yet — wait for supervisor to approve/reject
      } catch {
        toast({ title: t("dashboard.sessions.refinementFailed"), description: t("dashboard.sessions.refinementFailedDesc"), variant: "destructive" });
        await dispatchSend(text);
        setNewMessage("");
      } finally {
        setIsRefining(false);
      }
      return;
    }

    await dispatchSend(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showQuickReplyPopup) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedQuickReplyIndex(prev => 
          Math.min(prev + 1, filteredQuickReplies.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedQuickReplyIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredQuickReplies[selectedQuickReplyIndex]) {
          handleQuickReplyClick(filteredQuickReplies[selectedQuickReplyIndex]);
        }
      } else if (e.key === "Escape") {
        setShowQuickReplyPopup(false);
        setQuickReplyFilter("");
        setNewMessage("");
      }
      return;
    }
    
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Block Enter when refine is in progress or awaiting decision
      if (isRefining || refineSuggestion !== null) return;
      handleSendMessage();
    }
  };

  const handleReviseAnswer = (msg: Message) => {
    setSelectedMessage(msg);
    setRevisedAnswer(msg.content);
    setReviseDialogOpen(true);
  };

  const handleExportTranscript = async () => {
    if (!selectedSession) return;
    
    try {
      const response = await fetch(`/api/transcript/${selectedSession}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export transcript');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${selectedSession.slice(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: t("dashboard.sessions.transcriptExported"),
        description: t("dashboard.sessions.transcriptExportedDesc"),
      });
    } catch (error) {
      toast({
        title: t("dashboard.sessions.exportFailed"),
        description: t("dashboard.sessions.exportFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const statusCounts = {
    angry: sortedSessions?.filter(s => getSessionStatus(s) === "angry").length || 0,
    active: sortedSessions?.filter(s => getSessionStatus(s) === "active").length || 0,
    needsResponse: sortedSessions?.filter(s => getSessionStatus(s) === "needs_response").length || 0,
    ended: sortedSessions?.filter(s => getSessionStatus(s) === "ended").length || 0,
    ticket: sortedSessions?.filter(s => s.hasPasswordTicket).length || 0,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex-shrink-0 pb-2 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2 sm:mb-4">
          <div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <h1 className="hidden sm:flex text-2xl font-semibold tracking-tight items-center gap-2 sm:gap-3" data-testid="text-page-title">
                Chat Sessions
                {(statusCounts.needsResponse > 0 || statusCounts.angry > 0) && (
                  <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500" />
                  </span>
                )}
              </h1>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">{t("dashboard.sessions.subtitle")}</p>
          </div>
          <div className={`${selectedSession ? 'hidden' : 'flex'} sm:flex items-center gap-1.5 flex-wrap`}>
            {/* All */}
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer select-none transition-colors ${statusFilter === "all" ? "bg-primary/10 border-primary/50 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
              title="Show all sessions"
              data-testid="button-filter-all"
            >
              <span className="text-[11px] font-medium">All</span>
            </button>
            {/* Alert */}
            <button
              onClick={() => setStatusFilter(statusFilter === "angry" ? "all" : "angry")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer select-none transition-colors ${statusFilter === "angry" ? "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400" : "bg-card border-border text-muted-foreground hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400"}`}
              title="Filter: Alert"
              data-testid="button-filter-angry"
            >
              <StatusDot status="angry" />
              <span className="text-[11px] font-medium">{t("dashboard.sessions.alert")}</span>
              <span className="text-[11px] font-bold" data-testid="text-count-angry">{statusCounts.angry}</span>
            </button>
            {/* Active */}
            <button
              onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer select-none transition-colors ${statusFilter === "active" ? "bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400" : "bg-card border-border text-muted-foreground hover:border-green-500/40 hover:text-green-600 dark:hover:text-green-400"}`}
              title="Filter: Active"
              data-testid="button-filter-active"
            >
              <StatusDot status="active" />
              <span className="text-[11px] font-medium">{t("common.active")}</span>
              <span className="text-[11px] font-bold" data-testid="text-count-active">{statusCounts.active}</span>
            </button>
            {/* Pending */}
            <button
              onClick={() => setStatusFilter(statusFilter === "needs_response" ? "all" : "needs_response")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer select-none transition-colors ${statusFilter === "needs_response" ? "bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-400" : "bg-card border-border text-muted-foreground hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-400"}`}
              title="Filter: Pending"
              data-testid="button-filter-needs-response"
            >
              <StatusDot status="needs_response" />
              <span className="text-[11px] font-medium">{t("dashboard.sessions.pending")}</span>
              <span className="text-[11px] font-bold" data-testid="text-count-needs-response">{statusCounts.needsResponse}</span>
            </button>
            {/* Finished */}
            <button
              onClick={() => setStatusFilter(statusFilter === "ended" ? "all" : "ended")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer select-none transition-colors ${statusFilter === "ended" ? "bg-muted border-border/80 text-foreground" : "bg-card border-border text-muted-foreground hover:border-border/80 hover:text-foreground"}`}
              title="Filter: Finished"
              data-testid="button-filter-ended"
            >
              <StatusDot status="ended" />
              <span className="text-[11px] font-medium">{t("dashboard.sessions.finished")}</span>
              <span className="text-[11px] font-bold" data-testid="text-count-ended">{statusCounts.ended}</span>
            </button>
            {/* Ticket — sessions with an active password recovery request */}
            <button
              onClick={() => setStatusFilter(statusFilter === "ticket" ? "all" : "ticket")}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer select-none transition-colors ${statusFilter === "ticket" ? "bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400" : "bg-card border-border text-muted-foreground hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-400"}`}
              title="Filter: Password Reset Tickets"
              data-testid="button-filter-ticket"
            >
              <Ticket className="w-3 h-3" />
              <span className="text-[11px] font-medium">Ticket</span>
              <span className="text-[11px] font-bold" data-testid="text-count-ticket">{statusCounts.ticket}</span>
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setBlastDialogOpen(true); setBlastTab("compose"); }}
              className="gap-1.5"
              data-testid="button-open-blast"
            >
              <Megaphone className="w-4 h-4" />
              <span>Blast Message</span>
            </Button>
            <Button
              variant={soundEnabled ? "ghost" : "outline"}
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Sound alerts on" : "Sound alerts off"}
              data-testid="button-toggle-sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            {/* Handler avatar + name: right of sound button, right-aligned */}
            {selectedSession && selectedSessionData && (
              <div className="flex items-center gap-1.5 ml-auto" data-testid="handler-identity">
                <HandlerAvatar
                  size="sm"
                  mode={selectedSessionData.mode as "AI" | "HUMAN"}
                  agentPhoto={getAgentPhoto(selectedSessionData.agentId)}
                  supervisorPhoto={getSupervisorPhoto(selectedSessionData.supervisorId, selectedSessionData.agentId)}
                />
                <span className="text-xs text-muted-foreground" data-testid="text-handler-name">
                  {selectedSessionData.mode === "AI"
                    ? getAgentName(selectedSessionData.agentId)
                    : getSupervisorName(selectedSessionData.supervisorId, selectedSessionData.agentId) || "Awaiting"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-[30%_1fr] gap-4 min-h-0">
        <div className={`lg:col-span-4 xl:col-span-1 flex flex-col min-h-0 min-w-0 ${selectedSession ? 'hidden lg:flex' : 'flex'}`}>
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0 py-3 px-4">
              <div className="flex items-center gap-2">
                <div className="relative w-[60%] flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                    data-testid="input-search-sessions"
                  />
                </div>
                {agents && agents.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <Select value={agentFilter} onValueChange={setAgentFilter}>
                      <SelectTrigger className="h-9 w-full" data-testid="select-agent-filter">
                        <Filter className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                        <SelectValue placeholder="All Agents" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("dashboard.sessions.allAgents")}</SelectItem>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="pb-2 divide-y divide-border/40">
                  {sessionsLoading ? (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full mx-2" />
                      ))}
                    </>
                  ) : displayedSessions && displayedSessions.length > 0 ? (
                    displayedSessions.map((session) => {
                      const status = getSessionStatus(session);
                      const isSelected = selectedSession === session.id;
                      
                      return (
                        <button
                          key={session.id}
                          ref={(el) => {
                            if (el) sessionRowRefs.current.set(session.id, el);
                            else sessionRowRefs.current.delete(session.id);
                          }}
                          onClick={() => handleSelectSession(session.id)}
                          className={`w-full text-left transition-colors hover-elevate relative ${
                            isSelected
                              ? "bg-primary/10"
                              : "hover:bg-muted/40"
                          }`}
                          data-testid={`button-session-${session.id}`}
                        >
                          {/* Status color bar on left edge */}
                          <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                            status === "angry" ? "bg-red-500" :
                            status === "needs_response" ? "bg-orange-500" :
                            status === "active" ? "bg-green-500" :
                            "bg-transparent"
                          }`} />
                          <div className="pl-3 pr-3 py-2 flex items-start gap-2.5">
                            <div className="relative flex-shrink-0 mt-0.5">
                              <Avatar className={`h-8 w-8 ${session.visitorSession ? 'ring-2 ring-primary/40' : ''}`}>
                                {session.customerAvatarUrl ? (
                                  <AvatarImage src={session.customerAvatarUrl} alt={getVisitorDisplayName(session.customerName)} />
                                ) : null}
                                <AvatarFallback className={`${getAvatarColor(getVisitorDisplayName(session.customerName))} text-white text-xs font-semibold`}>
                                  {session.visitorSession
                                    ? <Radio className="w-3.5 h-3.5 text-white" />
                                    : getInitials(getVisitorDisplayName(session.customerName))}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Row 1: Name + mode badge + time */}
                              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <StatusDot status={status} />
                                  <CountryFlag code={session.countryCode} name={session.countryName} />
                                  <span className={`text-sm font-semibold truncate${session.customerName && !isIpAddress(session.customerName) ? "" : " font-mono"}`}>
                                    {session.customerName && !isIpAddress(session.customerName)
                                      ? session.customerName
                                      : session.clientIp || getVisitorDisplayName(session.customerName)}
                                  </span>
                                  {session.sessionCount > 1 && (
                                    <span className="flex-shrink-0 text-[10px] font-semibold bg-muted text-muted-foreground rounded px-1 py-0.5 leading-none">
                                      {session.sessionCount}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className={`text-[9px] font-semibold px-1 py-0.5 rounded leading-none ${session.mode === "HUMAN" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                                    {session.mode === "HUMAN" ? "Human" : "AI"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {session.lastActivity 
                                      ? formatDistanceToNow(new Date(session.lastActivity), { addSuffix: false })
                                      : ""}
                                  </span>
                                </div>
                              </div>
                              {/* Row 2: Handler + device icons */}
                              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                                <div className="flex items-center gap-1 text-xs font-medium min-w-0">
                                  {session.mode === "HUMAN" ? (
                                    <>
                                      <HeadphonesIcon className="h-3 w-3 text-primary flex-shrink-0" />
                                      <span className="truncate text-primary">
                                        {getSupervisorName(session.supervisorId, session.agentId) || "Awaiting Supervisor"}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Bot className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="truncate text-muted-foreground">
                                        {getAgentName(session.agentId)}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <DeviceIcon userAgent={session.userAgent} />
                                  <OsIcon userAgent={session.userAgent} />
                                  <BrowserIcon userAgent={session.userAgent} />
                                </div>
                              </div>
                              {/* Row 3: Last message preview */}
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {session.lastQuestion || (session.visitorSession ? "Proactive greeting sent" : "No messages yet")}
                              </p>
                              {session.lastMessage && session.lastMessage !== "Awaiting reply..." && (
                                <p className="text-xs text-muted-foreground/70 line-clamp-1">
                                  <span className="text-primary/60">↳</span> {session.lastMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 px-4">
                      <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">{t("dashboard.sessions.noSessions")}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className={`lg:col-span-8 xl:col-span-1 flex flex-col min-h-0 min-w-0 gap-2 ${selectedSession ? 'flex' : 'hidden lg:flex'}`}>
          {/* Mobile: back arrow shown above the card */}
          {selectedSession && (
            <div className="lg:hidden flex items-center">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedSession(null)}
                data-testid="button-back-to-list"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
          )}
          <div className="flex flex-1 min-h-0 gap-3">
          <Card className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ${!previewContent ? 'w-full' : ''}`}>
            {selectedSession ? (
              <>
                <CardHeader className="flex-shrink-0 border-b py-2 sm:py-3 px-3 sm:px-4">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    {/* LEFT: customer avatar + customer name/time */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {/* Customer avatar with colored initials */}
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        {selectedSessionData?.customerAvatarUrl ? (
                          <AvatarImage src={selectedSessionData.customerAvatarUrl} alt={getVisitorDisplayName(selectedSessionData?.customerName)} />
                        ) : null}
                        <AvatarFallback className={`${getAvatarColor(getVisitorDisplayName(selectedSessionData?.customerName))} text-white text-sm font-semibold`}>
                          {getInitials(getVisitorDisplayName(selectedSessionData?.customerName))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        {/* Name row: name + device/OS/browser icons + last-active time */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CardTitle className="text-base sm:text-lg font-semibold truncate" data-testid="text-selected-customer">
                            {getVisitorDisplayName(selectedSessionData?.customerName)}
                          </CardTitle>
                          <DeviceIcon userAgent={selectedSessionData?.userAgent} size="md" />
                          <OsIcon userAgent={selectedSessionData?.userAgent} size="md" />
                          <BrowserIcon userAgent={selectedSessionData?.userAgent} size="md" />
                          {selectedSessionData?.lastActivity && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(selectedSessionData.lastActivity), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {/* Sub-info row: flag + city/country + IP */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <CountryFlag code={selectedSessionData?.countryCode} name={selectedSessionData?.countryName} />
                          {(selectedSessionData?.cityName || selectedSessionData?.countryName) && selectedSessionData?.countryCode !== "xx" && selectedSessionData?.countryCode !== "XX" && (
                            <span className="text-[11px] sm:text-xs text-muted-foreground">
                              {[selectedSessionData.cityName, selectedSessionData.countryName].filter(Boolean).join(", ")}
                            </span>
                          )}
                          {selectedSessionData?.clientIp && (
                            <span className="font-mono text-[11px] sm:text-xs text-muted-foreground">
                              · {selectedSessionData.clientIp}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* RIGHT: action buttons */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => refetchMessages()}
                            title="Refresh"
                            className="hidden sm:flex h-8 w-8"
                            data-testid="button-refresh-messages"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>

                          {/* Desktop: Auto Refine toggle (hidden on mobile) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="hidden sm:flex items-center gap-1" data-testid="auto-refine-controls">
                                <Switch
                                  id="auto-refine-toggle"
                                  checked={autoRefineEnabled}
                                  onCheckedChange={setAutoRefineEnabled}
                                  disabled={selectedSessionData?.mode !== "HUMAN"}
                                  className="scale-75 origin-center"
                                  data-testid="switch-auto-refine"
                                />
                                <label
                                  htmlFor="auto-refine-toggle"
                                  className="flex items-center gap-0.5 text-[11px] text-muted-foreground cursor-pointer select-none"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  <span>{t("dashboard.sessions.refine")}</span>
                                </label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              {selectedSessionData?.mode !== "HUMAN"
                                ? <p>{t("dashboard.sessions.availableOnTakeover")}</p>
                                : <p>{t("dashboard.sessions.autoRefineMessage")}</p>}
                            </TooltipContent>
                          </Tooltip>

                          {/* Desktop: Auto-translate toggle (hidden on mobile) */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="hidden sm:flex items-center gap-1" data-testid="auto-translate-controls">
                                <Switch
                                  id="auto-translate-toggle"
                                  checked={autoTranslateEnabled}
                                  onCheckedChange={setAutoTranslateEnabled}
                                  className="scale-75 origin-center"
                                  data-testid="switch-auto-translate"
                                />
                                <label
                                  htmlFor="auto-translate-toggle"
                                  className="flex items-center gap-0.5 text-[11px] text-muted-foreground cursor-pointer select-none"
                                >
                                  <Languages className="w-3 h-3" />
                                </label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>{t("dashboard.sessions.autoTranslate")}</p>
                            </TooltipContent>
                          </Tooltip>
                          {autoTranslateEnabled && (
                            <Select value={translateLang} onValueChange={setTranslateLang}>
                              <SelectTrigger
                                className="hidden sm:flex h-7 sm:h-8 text-[11px] sm:text-xs w-24 sm:w-28 px-1.5 sm:px-2"
                                data-testid="select-translate-lang"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TRANSLATE_LANGUAGES.map(lang => (
                                  <SelectItem key={lang.code} value={lang.name} className="text-xs">
                                    {lang.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Desktop: Take Over / Return to Bot (hidden on mobile) */}
                          {selectedSessionData?.mode === "AI" ? (
                            <Button
                              size="sm"
                              onClick={() => takeoverMutation.mutate(selectedSession)}
                              disabled={takeoverMutation.isPending}
                              className="hidden sm:flex h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                              data-testid="button-takeover-session"
                            >
                              <Hand className="w-3.5 h-3.5 sm:mr-1.5" />
                              <span>{t("dashboard.sessions.takeOver")}</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => returnToBotMutation.mutate(selectedSession)}
                              disabled={returnToBotMutation.isPending}
                              className="hidden sm:flex h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                              data-testid="button-return-to-bot"
                            >
                              <Bot className="w-3.5 h-3.5 sm:mr-1.5" />
                              <span>{t("dashboard.sessions.returnToBot")}</span>
                            </Button>
                          )}

                          {/* Desktop: End Session (only when session is live) */}
                          {selectedSessionData && ["active", "needs_response", "angry"].includes(getSessionStatus(selectedSessionData)) && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setEndSessionDialogOpen(true)}
                              disabled={endSessionMutation.isPending}
                              className="hidden sm:flex h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 gap-1.5"
                              data-testid="button-end-session"
                            >
                              <StopCircle className="w-3.5 h-3.5" />
                              <span>End Session</span>
                            </Button>
                          )}

                          {/* Desktop: Archive button */}
                          <Popover open={archivePopoverOpen} onOpenChange={(open) => { setArchivePopoverOpen(open); if (!open) setSelectedArchivePeriod(null); }}>
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="hidden sm:flex h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 gap-1.5"
                                data-testid="button-archive-session"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>Archive</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" align="end" className="w-64 p-3">
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Add to Archive</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Select a month period to archive this session transcript into.</p>
                                <ScrollArea className="max-h-48">
                                  <div className="flex flex-col gap-1">
                                    {archivePeriods.map((period) => {
                                      const [yr, mo] = period.split("-");
                                      const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                                      return (
                                        <button
                                          key={period}
                                          onClick={() => setSelectedArchivePeriod(period === selectedArchivePeriod ? null : period)}
                                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${selectedArchivePeriod === period ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted/60 text-foreground"}`}
                                          data-testid={`button-period-${period}`}
                                        >
                                          <Check className={`w-3.5 h-3.5 flex-shrink-0 ${selectedArchivePeriod === period ? "opacity-100" : "opacity-0"}`} />
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </ScrollArea>
                                <Button
                                  size="sm"
                                  disabled={!selectedArchivePeriod || archiveSessionMutation.isPending}
                                  onClick={() => {
                                    if (selectedSession && selectedArchivePeriod) {
                                      archiveSessionMutation.mutate({ sessionId: selectedSession, period: selectedArchivePeriod });
                                    }
                                  }}
                                  data-testid="button-confirm-archive"
                                >
                                  {archiveSessionMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Archive className="w-3.5 h-3.5 mr-1.5" />}
                                  Confirm Archive
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Mobile gear icon: opens settings + actions dropdown */}
                          <Popover open={showMobileSettings} onOpenChange={setShowMobileSettings}>
                            <PopoverTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="flex sm:hidden h-10 w-10"
                                data-testid="button-mobile-settings"
                              >
                                <Settings2 className="w-6 h-6" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" align="end" className="w-72 p-3">
                              <div className="flex flex-col gap-3">
                                {/* Quick actions: Refresh + Export */}
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-1.5"
                                    onClick={() => { refetchMessages(); setShowMobileSettings(false); }}
                                    data-testid="button-refresh-messages-mobile"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Refresh
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-1.5"
                                    onClick={() => { handleExportTranscript(); setShowMobileSettings(false); }}
                                    data-testid="button-export-transcript-mobile"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Export transcript
                                  </Button>
                                </div>
                                <div className="border-t" />
                                {/* Auto Translate */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Languages className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm">Auto Translate</span>
                                  </div>
                                  <Switch
                                    checked={autoTranslateEnabled}
                                    onCheckedChange={setAutoTranslateEnabled}
                                    data-testid="switch-auto-translate-mobile"
                                  />
                                </div>
                                {autoTranslateEnabled && (
                                  <Select value={translateLang} onValueChange={setTranslateLang}>
                                    <SelectTrigger className="h-8 text-xs" data-testid="select-translate-lang-mobile">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TRANSLATE_LANGUAGES.map(lang => (
                                        <SelectItem key={lang.code} value={lang.name} className="text-xs">
                                          {lang.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                {/* Auto Refine */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm">Auto Refine</span>
                                  </div>
                                  <Switch
                                    checked={autoRefineEnabled}
                                    onCheckedChange={setAutoRefineEnabled}
                                    disabled={selectedSessionData?.mode !== "HUMAN"}
                                    data-testid="switch-auto-refine-mobile"
                                  />
                                </div>
                                {selectedSessionData?.mode !== "HUMAN" && (
                                  <p className="text-[11px] text-muted-foreground">Auto Refine is available when you take over.</p>
                                )}
                                <div className="border-t" />
                                {/* Visitor Info */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm">Visitor Info</span>
                                  </div>
                                  <Switch
                                    checked={showVisitorInfo}
                                    onCheckedChange={(v) => { setShowVisitorInfo(v); setShowMobileSettings(false); }}
                                    data-testid="switch-visitor-info-mobile"
                                  />
                                </div>
                                <div className="border-t" />
                                {/* Take Over / Return to Bot */}
                                {selectedSessionData?.mode === "AI" ? (
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => { takeoverMutation.mutate(selectedSession); setShowMobileSettings(false); }}
                                    disabled={takeoverMutation.isPending}
                                    data-testid="button-takeover-session-mobile"
                                  >
                                    <Hand className="w-3.5 h-3.5 mr-1.5" />
                                    Take Over
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => { returnToBotMutation.mutate(selectedSession); setShowMobileSettings(false); }}
                                    disabled={returnToBotMutation.isPending}
                                    data-testid="button-return-to-bot-mobile"
                                  >
                                    <Bot className="w-3.5 h-3.5 mr-1.5" />
                                    Return to Bot
                                  </Button>
                                )}
                                <div className="border-t" />
                                {/* End Session (mobile) */}
                                {selectedSessionData && ["active", "needs_response", "angry"].includes(getSessionStatus(selectedSessionData)) && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="w-full gap-1.5"
                                    onClick={() => { setShowMobileSettings(false); setEndSessionDialogOpen(true); }}
                                    disabled={endSessionMutation.isPending}
                                    data-testid="button-end-session-mobile"
                                  >
                                    <StopCircle className="w-3.5 h-3.5" />
                                    End Session
                                  </Button>
                                )}
                                {/* Archive (mobile) */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full gap-1.5"
                                  onClick={() => { setShowMobileSettings(false); setSelectedArchivePeriod(null); setArchiveMobileDialogOpen(true); }}
                                  data-testid="button-archive-session-mobile"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  Archive Session
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleExportTranscript}
                            title="Export"
                            className="hidden sm:flex h-8 w-8"
                            data-testid="button-export-transcript"
                          >
                            <Download className="w-4 h-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setShowVisitorInfo(!showVisitorInfo)}
                            title="Visitor Info"
                            className={`hidden sm:flex h-8 w-8 ${showVisitorInfo ? "bg-primary/10 text-primary" : ""}`}
                            data-testid="button-toggle-visitor-info"
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-1.5 overflow-x-hidden">
                      {messagesLoading ? (
                        <>
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-14 w-3/4" />
                          ))}
                        </>
                      ) : messages && messages.length > 0 ? (
                        <>
                          {messages.map((msg, index) => {
                            const isCustomerMessage = msg.from === "customer" || msg.from === "user";
                            return (
                            <div key={msg.id || index} className="space-y-0.5">
                            <div
                              className={`flex gap-2.5 ${isCustomerMessage ? "justify-start" : "justify-end"} group`}
                            >
                              {/* Customer avatar on left (hidden on mobile) */}
                              {isCustomerMessage && (
                                <Avatar className="hidden sm:flex h-10 w-10 flex-shrink-0">
                                  {selectedSessionData?.customerAvatarUrl ? (
                                    <AvatarImage src={selectedSessionData.customerAvatarUrl} alt={getVisitorDisplayName(selectedSessionData?.customerName)} />
                                  ) : null}
                                  <AvatarFallback className={`${getAvatarColor(getVisitorDisplayName(selectedSessionData?.customerName))} text-white text-sm font-semibold`}>
                                    {getInitials(getVisitorDisplayName(selectedSessionData?.customerName))}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className="relative max-w-[75%] min-w-0">
                                <div
                                  className={`p-2.5 ${
                                    isCustomerMessage
                                      ? "rounded-2xl rounded-bl-sm border border-white/20"
                                      : "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                                  }`}
                                  style={isCustomerMessage ? {
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  } : undefined}
                                >
                                  {/* Customer name + timestamp on same row */}
                                  {isCustomerMessage && (
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span className="text-[10px] font-medium text-foreground/70 truncate">
                                        {getVisitorDisplayName(selectedSessionData?.customerName)}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                      </span>
                                    </div>
                                  )}
                                  {/* AI/Supervisor name + timestamp on same row */}
                                  {!isCustomerMessage && msg.from !== "system" && (
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span className="text-[10px] font-medium text-primary-foreground/80 truncate">
                                        {msg.from === "chatvice" || msg.from === "bot" || msg.from === "ai"
                                          ? getAgentName(selectedSessionData?.agentId)
                                          : msg.from === "supervisor"
                                            ? getSupervisorName(selectedSessionData?.supervisorId, selectedSessionData?.agentId) || "Supervisor"
                                            : getAgentName(selectedSessionData?.agentId)}
                                      </span>
                                      <span className="text-[10px] text-primary-foreground/60 whitespace-nowrap flex-shrink-0">
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                      </span>
                                    </div>
                                  )}
                                  {!((msg as any).messageType === "media" && ((msg as any).payload?.url || (msg as any).payload?.mediaUrl)) && 
                                   !((msg as any).messageType === "product_offer" && (msg as any).payload?.productCard) &&
                                   !((msg as any).messageType === "password_recovery_form") &&
                                   !((msg as any).messageType === "password_recovery_ticket" && (msg as any).payload?.ticketId) && (
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{renderMessageWithLinks(msg.content)}</p>
                                  )}
                                  {(msg as any).messageType === "password_recovery_form" && (
                                    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 max-w-[260px]">
                                      <Ticket className="w-4 h-4 shrink-0 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground italic">Form reset password ditampilkan ke customer</span>
                                    </div>
                                  )}
                                  {(msg as any).messageType === "password_recovery_ticket" && (msg as any).payload?.ticketId && (() => {
                                    const tp = (msg as any).payload as { ticketId: string; username: string; bankAccount: string };
                                    return (
                                      <div className="rounded-xl border bg-background overflow-hidden max-w-[300px]">
                                        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b bg-muted/30">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <Ticket className="w-3.5 h-3.5 shrink-0 text-primary" />
                                            <span className="text-xs font-semibold">Reset Password Ticket</span>
                                          </div>
                                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wide text-yellow-600 border-yellow-300 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-700 dark:bg-yellow-950/30">
                                            Pending
                                          </Badge>
                                        </div>
                                        <div className="px-3 py-3 space-y-2">
                                          <div>
                                            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Ticket ID</p>
                                            <p className="text-[11px] font-mono font-semibold text-foreground">{tp.ticketId}</p>
                                          </div>
                                          <div className="h-px bg-border" />
                                          <div>
                                            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Username</p>
                                            <p className="text-xs text-foreground">{tp.username}</p>
                                          </div>
                                          <div>
                                            <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Bank Terdaftar</p>
                                            <p className="text-xs text-foreground">{tp.bankAccount}</p>
                                          </div>
                                          <div className="h-px bg-border" />
                                          <p className="text-[10px] text-muted-foreground">Menunggu password baru dari admin</p>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {(msg as any).messageType === "product_offer" && (msg as any).payload?.productCard && (
                                    <div className="mt-2 bg-background rounded-xl border shadow-sm overflow-hidden max-w-[300px]">
                                      {(msg as any).payload.productCard.imageUrl ? (
                                        <button 
                                          className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => setPreviewContent({
                                            type: "photo",
                                            url: (msg as any).payload.productCard.imageUrl,
                                            title: (msg as any).payload.productCard.title
                                          })}
                                          data-testid={`button-preview-product-image-${msg.id}`}
                                        >
                                          <div className="aspect-[4/3] w-full overflow-hidden">
                                            <img 
                                              src={(msg as any).payload.productCard.imageUrl} 
                                              alt={(msg as any).payload.productCard.title}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        </button>
                                      ) : (
                                        <div className="bg-blue-50 dark:bg-blue-950/30 h-40 flex items-center justify-center">
                                          <ShoppingBag className="w-12 h-12 text-muted-foreground/50" />
                                        </div>
                                      )}
                                      <div className="p-3 space-y-1.5">
                                        <p className="font-semibold text-sm text-foreground">{(msg as any).payload.productCard.title}</p>
                                        {(msg as any).payload.productCard.description ? (
                                          <p className="text-xs text-muted-foreground line-clamp-2">{(msg as any).payload.productCard.description}</p>
                                        ) : (
                                          <div className="space-y-1">
                                            <div className="h-2 bg-muted rounded w-full" />
                                            <div className="h-2 bg-muted rounded w-3/4" />
                                          </div>
                                        )}
                                        {(msg as any).payload.productCard.price && (
                                          <p className="text-xs text-muted-foreground">{(msg as any).payload.productCard.price}</p>
                                        )}
                                        <div className="flex flex-col gap-1.5 pt-2">
                                          {(msg as any).payload.productCard.sourceUrl && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full text-xs font-medium"
                                              onClick={() => window.open((msg as any).payload.productCard.sourceUrl, '_blank')}
                                              data-testid="button-select-product"
                                            >
                                              Select product
                                            </Button>
                                          )}
                                          {(msg as any).payload.productCard.buttons?.map((btn: any) => (
                                            <Button
                                              key={btn.id}
                                              size="sm"
                                              variant="outline"
                                              className="w-full text-xs font-medium"
                                              onClick={() => btn.url && window.open(btn.url, '_blank')}
                                              disabled={!btn.url}
                                              data-testid={`button-product-action-${btn.id}`}
                                            >
                                              {btn.label}
                                            </Button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {(msg as any).messageType === "media" && (msg as any).payload && (() => {
                                    const payload = (msg as any).payload;
                                    // Use unified session-media endpoint for cross-platform media access
                                    const mediaUrl = payload.url || payload.mediaUrl || (payload.mediaId ? `/api/session-media/${payload.mediaId}` : "");
                                    const mimeType = payload.mimeType || "";
                                    const isImage = payload.type === "photo" || mimeType.startsWith("image/");
                                    const isVideo = payload.type === "video" || mimeType.startsWith("video/");
                                    const isDocument = payload.type === "document" || (!isImage && !isVideo);
                                    
                                    return (
                                      <div>
                                        {isImage && (
                                          <div className="space-y-1">
                                            <button 
                                              onClick={() => setPreviewContent({
                                                type: "photo",
                                                url: mediaUrl,
                                                filename: payload.filename
                                              })}
                                              className="block"
                                              data-testid={`button-preview-photo-${msg.id}`}
                                            >
                                              <img 
                                                src={mediaUrl} 
                                                alt={payload.filename || "Image"}
                                                className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity bg-muted"
                                                onError={(e) => {
                                                  const target = e.currentTarget;
                                                  target.onerror = null;
                                                  target.style.display = 'none';
                                                  const parent = target.parentElement;
                                                  if (parent) {
                                                    const fallback = document.createElement('div');
                                                    fallback.className = 'w-[200px] h-[150px] rounded-lg bg-muted flex items-center justify-center';
                                                    fallback.innerHTML = '<span class="text-xs text-muted-foreground">{t("dashboard.sessions.imageUnavailable")}</span>';
                                                    parent.appendChild(fallback);
                                                  }
                                                }}
                                              />
                                            </button>
                                            {(msg as any).locationData && 
                                              typeof (msg as any).locationData.latitude === 'number' && 
                                              typeof (msg as any).locationData.longitude === 'number' && (
                                              <a
                                                href={`https://www.google.com/maps?q=${(msg as any).locationData.latitude},${(msg as any).locationData.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 hover:underline"
                                                data-testid={`link-location-${msg.id}`}
                                              >
                                                <MapPin className="w-3 h-3" />
                                                <span>
                                                  {Number((msg as any).locationData.latitude).toFixed(4)}, {Number((msg as any).locationData.longitude).toFixed(4)}
                                                  {" "}({(msg as any).locationData.source === 'exif' ? 'EXIF' : 'GPS'})
                                                </span>
                                              </a>
                                            )}
                                          </div>
                                        )}
                                        {isVideo && (
                                          <button 
                                            onClick={() => setPreviewContent({
                                              type: "video",
                                              url: mediaUrl,
                                              filename: payload.filename
                                            })}
                                            className="block relative group"
                                            data-testid={`button-preview-video-${msg.id}`}
                                          >
                                            <video 
                                              src={mediaUrl}
                                              className="max-w-[240px] max-h-[180px] rounded-lg cursor-pointer"
                                              muted
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                                <Maximize2 className="w-5 h-5 text-foreground" />
                                              </div>
                                            </div>
                                          </button>
                                        )}
                                        {isDocument && !isImage && !isVideo && (
                                          <button 
                                            onClick={() => setPreviewContent({
                                              type: "document",
                                              url: mediaUrl,
                                              filename: payload.filename
                                            })}
                                            className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border hover:bg-background transition-colors"
                                            data-testid={`button-preview-document-${msg.id}`}
                                          >
                                            <FileText className="w-5 h-5 text-primary" />
                                            <span className="text-sm text-foreground truncate max-w-[150px]">
                                              {payload.filename || "Document"}
                                            </span>
                                            <Maximize2 className="w-3 h-3 text-muted-foreground" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {/* "Originally sent as" — shows supervisor's pre-translate original text */}
                                  {msg.from === "supervisor" && (() => {
                                    const msgPayload = msg.payload as { originalText?: string } | null | undefined;
                                    return msgPayload?.originalText ? (
                                      <p className="text-[10px] mt-1.5 pt-1 border-t border-primary-foreground/20 text-primary-foreground/50 italic leading-snug">
                                        Originally: {msgPayload.originalText}
                                      </p>
                                    ) : null;
                                  })()}
                                  {/* Standalone timestamp only for system messages (others have it inline with name) */}
                                  {msg.from === "system" && (
                                    <p className="text-[10px] mt-1 text-muted-foreground">
                                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                    </p>
                                  )}
                                </div>
                                {msg.from === "chatvice" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute -left-9 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                                    onClick={() => handleReviseAnswer(msg)}
                                    title="Revise"
                                    data-testid={`button-revise-${msg.id}`}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                              {/* Agent/Supervisor avatar on right (hidden on mobile) */}
                              {!isCustomerMessage && (
                                <Avatar className="hidden sm:flex h-10 w-10 flex-shrink-0">
                                  {msg.from === "chatvice" || msg.from === "bot" || msg.from === "ai" ? (
                                    getAgentPhoto(selectedSessionData?.agentId) ? (
                                      <AvatarImage src={getAgentPhoto(selectedSessionData?.agentId)!} alt="AI" />
                                    ) : null
                                  ) : (
                                    getSupervisorPhoto(selectedSessionData?.supervisorId, selectedSessionData?.agentId) ? (
                                      <AvatarImage src={getSupervisorPhoto(selectedSessionData?.supervisorId, selectedSessionData?.agentId)!} alt="Supervisor" />
                                    ) : null
                                  )}
                                  <AvatarFallback className="bg-primary/10 text-sm">
                                    {msg.from === "chatvice" || msg.from === "bot" || msg.from === "ai" ? (
                                      <Bot className="h-5 w-5 text-primary" />
                                    ) : (
                                      <HeadphonesIcon className="h-5 w-5 text-primary" />
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                            {/* Auto-translate: show translated text below message bubble */}
                            {autoTranslateEnabled && msg.content?.trim() && (
                              <div className={`flex mt-0.5 ${isCustomerMessage ? "justify-start pl-0 sm:pl-12" : "justify-end pr-0 sm:pr-[50px]"}`}>
                                <div className="flex items-start gap-1 text-[11px] text-muted-foreground italic max-w-[75%] min-w-0">
                                  {translatingIds.has(String(msg.id)) ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mt-0.5 flex-shrink-0 animate-spin" />
                                      <span>{t("dashboard.sessions.translating")}</span>
                                    </>
                                  ) : translations.has(String(msg.id)) ? (
                                    <>
                                      <Languages className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground/70" />
                                      <span className="leading-snug">{translations.get(String(msg.id))}</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            )}
                            {/* Product Cards Display - show when AI message matches product triggers */}
                            {!isCustomerMessage && (msg.from === "chatvice" || msg.from === "bot" || msg.from === "ai") && 
                             shouldShowProductsForMessage(msg.content) && productCards.filter(c => c.isActive).length > 0 && (
                              <div className="flex justify-end mt-2 mr-12">
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2 justify-end">
                                    <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[11px] font-medium text-muted-foreground">{t("dashboard.sessions.productRecommendations")}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2.5 max-w-[450px]">
                                    {productCards.filter(c => c.isActive).slice(0, 2).map((card) => (
                                      <div key={card.id} className="bg-background rounded-lg border overflow-hidden">
                                        {card.imageUrl ? (
                                          <button 
                                            className="bg-muted/30 w-full h-28 cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => setPreviewContent({
                                              type: "photo",
                                              url: card.imageUrl!,
                                              title: card.title
                                            })}
                                            data-testid={`button-preview-product-${card.id}`}
                                          >
                                            <img 
                                              src={card.imageUrl} 
                                              alt={card.title}
                                              className="w-full h-full object-cover"
                                            />
                                          </button>
                                        ) : (
                                          <div className="bg-muted/30 w-full h-28 flex items-center justify-center">
                                            <ShoppingBag className="w-6 h-6 text-muted-foreground/50" />
                                          </div>
                                        )}
                                        <div className="p-2.5 space-y-1">
                                          <p className="font-medium text-xs text-foreground line-clamp-2">{card.title}</p>
                                          {card.price && (
                                            <p className="text-xs text-primary font-semibold">{card.price}</p>
                                          )}
                                          {card.sourceUrl && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full text-[10px]"
                                              onClick={() => card.sourceUrl && window.open(card.sourceUrl, '_blank')}
                                              data-testid={`button-product-visit-${card.id}`}
                                            >
                                              View
                                            </Button>
                                          )}
                                          {card.buttons && card.buttons.length > 0 && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full text-[10px]"
                                              onClick={() => card.buttons?.[0]?.url && window.open(card.buttons[0].url, '_blank')}
                                              data-testid={`button-product-action-${card.id}`}
                                            >
                                              {card.buttons[0].label || 'View'}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          );})}
                          <div ref={messagesEndRef} />
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground">No messages yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  {/* Last active — mobile only, shown just above the input */}
                  {selectedSessionData?.lastActivity && (
                    <div className="flex sm:hidden items-center gap-1 px-3 py-1 border-t text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>Last active {formatDistanceToNow(new Date(selectedSessionData.lastActivity), { addSuffix: true })}</span>
                    </div>
                  )}
                  {selectedSessionData?.mode === "HUMAN" && (
                    <div className="flex-shrink-0 p-3 border-t bg-background relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "photo");
                        }}
                        data-testid="input-file-photo"
                      />
                      <input
                        type="file"
                        ref={videoInputRef}
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "video");
                        }}
                        data-testid="input-file-video"
                      />
                      <input
                        type="file"
                        ref={documentInputRef}
                        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "document");
                        }}
                        data-testid="input-file-document"
                      />
                      {/* Refine suggestion popup — absolute overlay blocking the input row */}
                      {refineSuggestion !== null && (
                        <div
                          className="absolute inset-x-0 bottom-full mb-1 z-50 p-3 bg-popover border border-border rounded-md shadow-md flex flex-col gap-2"
                          data-testid="refine-suggestion-popup"
                        >
                          <div className="flex items-start gap-2">
                            <Wand2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span className="text-xs font-medium text-muted-foreground">Refined suggestion</span>
                          </div>
                          <p className="text-sm leading-snug max-h-28 overflow-y-auto whitespace-pre-wrap" data-testid="text-refine-suggestion">
                            {refineSuggestion}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="flex-1 h-8 gap-1.5"
                              onClick={async () => {
                                const approved = refineSuggestion;
                                setRefineSuggestion(null);
                                setRefineOriginalText(null);
                                setNewMessage("");
                                await dispatchSend(approved);
                              }}
                              data-testid="button-refine-approve"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Send refined
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 gap-1.5"
                              onClick={async () => {
                                const original = refineOriginalText ?? "";
                                setRefineSuggestion(null);
                                setRefineOriginalText(null);
                                setNewMessage("");
                                await dispatchSend(original);
                              }}
                              data-testid="button-refine-reject"
                            >
                              <X className="w-3.5 h-3.5" />
                              Keep original
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 relative">
                        <Popover 
                          open={showPlusMenu} 
                          onOpenChange={(open) => {
                            setShowPlusMenu(open);
                            if (!open) setPlusMenuView("main");
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              disabled={isUploadingMedia}
                              data-testid="button-plus-menu"
                            >
                              {isUploadingMedia ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="top" align="start" className="w-56 p-0">
                            {plusMenuView === "main" ? (
                              <div className="flex flex-col p-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start gap-2 h-9"
                                  onClick={() => {
                                    fileInputRef.current?.click();
                                    setShowPlusMenu(false);
                                  }}
                                  data-testid="button-upload-image"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                  Image
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start gap-2 h-9"
                                  onClick={() => {
                                    videoInputRef.current?.click();
                                    setShowPlusMenu(false);
                                  }}
                                  data-testid="button-upload-video"
                                >
                                  <Video className="w-4 h-4" />
                                  Video
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start gap-2 h-9"
                                  onClick={() => {
                                    documentInputRef.current?.click();
                                    setShowPlusMenu(false);
                                  }}
                                  data-testid="button-upload-document"
                                >
                                  <FileText className="w-4 h-4" />
                                  Document
                                </Button>
                                <div className="border-t my-1" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="justify-start gap-2 h-9"
                                  onClick={() => setPlusMenuView("products")}
                                  disabled={productCards.filter(c => c.isActive).length === 0}
                                  data-testid="button-offer-product"
                                >
                                  <ShoppingBag className="w-4 h-4" />
                                  Offer Product
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <div className="p-2 border-b flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setPlusMenuView("main")}
                                    data-testid="button-back-to-menu"
                                  >
                                    <ArrowLeft className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm font-medium">Select Product</span>
                                </div>
                                <ScrollArea className="h-72 overflow-y-auto">
                                  <div className="p-2 space-y-1.5">
                                    {productCards.filter(c => c.isActive).map((card) => (
                                      <button
                                        key={card.id}
                                        onClick={() => offerProductMutation.mutate(card.id)}
                                        disabled={offerProductMutation.isPending}
                                        className="w-full p-2.5 rounded-md hover:bg-muted transition-colors flex items-start gap-3 text-left border border-border/50 hover:border-border"
                                        data-testid={`product-option-${card.id}`}
                                      >
                                        {card.imageUrl ? (
                                          <img 
                                            src={card.imageUrl} 
                                            alt={card.title}
                                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <p className="text-sm font-medium line-clamp-2 break-words">{card.title}</p>
                                          {card.price && (
                                            <p className="text-xs text-primary font-semibold mt-0.5">{card.price}</p>
                                          )}
                                          {card.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 break-words">{card.description}</p>
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                    {productCards.filter(c => c.isActive).length === 0 && (
                                      <p className="text-sm text-muted-foreground text-center py-4">
                                        No products available. Add products in Widget Settings.
                                      </p>
                                    )}
                                  </div>
                                </ScrollArea>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                        <div className="flex-1 relative">
                          <Input
                            ref={inputRef}
                            placeholder="Type / for quick replies..."
                            value={newMessage}
                            onChange={handleMessageInputChange}
                            onKeyDown={handleKeyPress}
                            disabled={isRefining || refineSuggestion !== null}
                            className="h-9"
                            data-testid="input-send-message"
                          />
                          {showQuickReplyPopup && filteredQuickReplies.length > 0 && (
                            <div 
                              className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
                              data-testid="quick-reply-popup"
                            >
                              {filteredQuickReplies.map((qr, index) => (
                                <button
                                  key={qr.id}
                                  onClick={() => handleQuickReplyClick(qr)}
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex flex-col ${
                                    index === selectedQuickReplyIndex ? 'bg-muted' : ''
                                  }`}
                                  data-testid={`quick-reply-option-${qr.id}`}
                                >
                                  <span className="font-medium">{qr.label}</span>
                                  <span className="text-xs text-muted-foreground truncate">{qr.content}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={handleSendMessage}
                          disabled={sendMessageMutation.isPending || isSendingWithTranslate || isRefining || refineSuggestion !== null || !newMessage.trim() || showQuickReplyPopup}
                          className="h-9"
                          data-testid="button-send-message"
                        >
                          {(sendMessageMutation.isPending || isSendingWithTranslate || isRefining) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-14 h-14 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-base font-medium text-muted-foreground">Select a session</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a conversation from the list
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* Visitor Info Panel */}
          {showVisitorInfo && selectedSessionData && (
            <Card className="flex flex-col h-full w-72 flex-shrink-0" data-testid="card-visitor-info-panel">
              <CardHeader className="flex-shrink-0 border-b py-2 px-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Visitor Info</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowVisitorInfo(false)}
                    className="h-7 w-7"
                    data-testid="button-close-visitor-info"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-3 overflow-auto">
                <div className="space-y-4 text-sm">

                  {/* Location */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Location</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CountryFlag code={selectedSessionData.countryCode} name={selectedSessionData.countryName} />
                        <span className="text-foreground">
                          {[selectedSessionData.cityName, selectedSessionData.countryName].filter(Boolean).join(", ") || "Unknown"}
                        </span>
                      </div>
                      {selectedSessionData.clientIp && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{selectedSessionData.clientIp}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedSessionData.clientIp || "");
                              toast({ description: "IP address copied" });
                            }}
                            data-testid="button-copy-ip"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t" />

                  {/* Device */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Device</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <DeviceIcon userAgent={selectedSessionData.userAgent} size="md" />
                      <OsIcon userAgent={selectedSessionData.userAgent} size="md" />
                      <BrowserIcon userAgent={selectedSessionData.userAgent} size="md" />
                    </div>
                    {selectedSessionData.userAgent && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 break-all leading-relaxed line-clamp-3" title={selectedSessionData.userAgent}>
                        {selectedSessionData.userAgent}
                      </p>
                    )}
                  </div>

                  <div className="border-t" />

                  {/* Current Page */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Current Page</p>
                    {selectedSessionData.pageUrl ? (
                      <a
                        href={selectedSessionData.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 text-xs text-sky-500 dark:text-sky-400 hover:underline break-all"
                        data-testid="link-current-page"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{selectedSessionData.pageUrl}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unknown</span>
                    )}
                  </div>

                  <div className="border-t" />

                  {/* Traffic Source */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Traffic Source</p>
                    {selectedSessionData.referrerUrl ? (
                      <a
                        href={selectedSessionData.referrerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 text-xs text-primary hover:underline break-all"
                        data-testid="link-referrer-url"
                      >
                        <Link2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{selectedSessionData.referrerUrl}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Direct / Unknown</span>
                      </div>
                    )}
                  </div>

                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Panel */}
          {previewContent && (
            <Card className={`flex flex-col h-full transition-all duration-300 ${isPreviewExpanded ? 'w-2/3' : 'w-80'}`} data-testid="card-preview-panel">
              <CardHeader className="flex-shrink-0 border-b py-2 px-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0" data-testid="preview-header-info">
                    {previewContent.type === "photo" && <ImageIcon className="w-4 h-4 text-blue-500" data-testid="icon-preview-photo" />}
                    {previewContent.type === "video" && <Video className="w-4 h-4 text-purple-500" data-testid="icon-preview-video" />}
                    {previewContent.type === "document" && <FileText className="w-4 h-4 text-orange-500" data-testid="icon-preview-document" />}
                    {previewContent.type === "url" && <ExternalLink className="w-4 h-4 text-green-500" data-testid="icon-preview-url" />}
                    <span className="text-sm font-medium truncate" data-testid="text-preview-title">
                      {previewContent.title || previewContent.filename || "Preview"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                      title={isPreviewExpanded ? "Minimize" : "Expand"}
                      className="h-7 w-7"
                      data-testid="button-toggle-preview-size"
                    >
                      {isPreviewExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (!previewContent?.url) return;
                        const link = document.createElement('a');
                        link.href = previewContent.url;
                        link.download = previewContent.filename || 'download';
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      title="Download"
                      className="h-7 w-7"
                      data-testid="button-download-preview"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setPreviewContent(null);
                        setIsPreviewExpanded(false);
                      }}
                      title="Close"
                      className="h-7 w-7"
                      data-testid="button-close-preview"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-3 overflow-auto flex items-center justify-center bg-muted/30" data-testid="preview-content-area">
                {previewContent.type === "photo" && (
                  <img 
                    src={previewContent.url} 
                    alt={previewContent.filename || "Preview"} 
                    className="max-w-full max-h-full object-contain rounded-lg"
                    data-testid="preview-image"
                  />
                )}
                {previewContent.type === "video" && (
                  <video 
                    src={previewContent.url} 
                    controls 
                    autoPlay
                    className="max-w-full max-h-full rounded-lg"
                    data-testid="preview-video"
                  />
                )}
                {previewContent.type === "document" && (
                  <iframe 
                    src={previewContent.url} 
                    className="w-full h-full border-0 rounded-lg bg-white"
                    title={previewContent.filename || "Document"}
                    sandbox="allow-scripts"
                    data-testid="preview-document"
                  />
                )}
                {previewContent.type === "url" && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4" data-testid="preview-url-container">
                    <ExternalLink className="w-12 h-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">External links cannot be previewed inline for security reasons.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(previewContent.url, '_blank')}
                      data-testid="button-open-external-link"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>

      <Dialog open={reviseDialogOpen} onOpenChange={setReviseDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Revise AI Answer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1.5">Original answer:</p>
              <p className="text-sm">{selectedMessage?.content}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">New answer:</p>
              <Textarea
                value={revisedAnswer}
                onChange={(e) => setRevisedAnswer(e.target.value)}
                placeholder="Enter the revised answer..."
                className="min-h-[120px]"
                data-testid="textarea-revised-answer"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setReviseDialogOpen(false)}
              data-testid="button-cancel-revise"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedMessage && revisedAnswer.trim()) {
                  reviseAnswerMutation.mutate({ 
                    messageId: selectedMessage.id, 
                    newContent: revisedAnswer.trim() 
                  });
                }
              }}
              disabled={reviseAnswerMutation.isPending || !revisedAnswer.trim()}
              data-testid="button-save-revision"
            >
              {reviseAnswerMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile archive Dialog — proper dialog anchored correctly on small screens */}
      <Dialog open={archiveMobileDialogOpen} onOpenChange={(open) => { setArchiveMobileDialogOpen(open); if (!open) setSelectedArchivePeriod(null); }}>
        <DialogContent className="sm:hidden max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              Add to Archive
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Select a month period to archive this session transcript into.</p>
          <ScrollArea className="max-h-56">
            <div className="flex flex-col gap-1">
              {archivePeriods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No archive periods found. Archive a session first to create a period.</p>
              ) : archivePeriods.map((period) => {
                const [yr, mo] = period.split("-");
                const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                return (
                  <button
                    key={period}
                    onClick={() => setSelectedArchivePeriod(period === selectedArchivePeriod ? null : period)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors text-left ${selectedArchivePeriod === period ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted/60 text-foreground"}`}
                    data-testid={`button-period-mobile-${period}`}
                  >
                    <Check className={`w-3.5 h-3.5 flex-shrink-0 ${selectedArchivePeriod === period ? "opacity-100" : "opacity-0"}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setArchiveMobileDialogOpen(false)} data-testid="button-cancel-archive-mobile">
              Cancel
            </Button>
            <Button
              disabled={!selectedArchivePeriod || archiveSessionMutation.isPending}
              onClick={() => {
                if (selectedSession && selectedArchivePeriod) {
                  archiveSessionMutation.mutate({ sessionId: selectedSession, period: selectedArchivePeriod });
                }
              }}
              data-testid="button-confirm-archive-mobile"
            >
              {archiveSessionMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Archive className="w-3.5 h-3.5 mr-1.5" />}
              Confirm Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Blast Message Dialog ─────────────────────────────────────────── */}
      <Dialog open={blastDialogOpen} onOpenChange={(open) => { setBlastDialogOpen(open); if (!open) { setBlastConfirmOpen(false); setBlastCancelId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Megaphone className="w-5 h-5 text-primary" />
              Blast Message
            </DialogTitle>
          </DialogHeader>

          <Tabs value={blastTab} onValueChange={(v) => setBlastTab(v as "compose" | "history")} className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-6 mt-4 mb-0 w-fit">
              <TabsTrigger value="compose" data-testid="tab-blast-compose">Compose</TabsTrigger>
              <TabsTrigger value="history" onClick={() => { setBlastHistoryPage(1); }} data-testid="tab-blast-history">History</TabsTrigger>
            </TabsList>

            {/* ── COMPOSE TAB ── */}
            <TabsContent value="compose" className="flex-1 overflow-y-auto px-6 pb-6 pt-4 mt-0 space-y-5">

              {/* Section 1: Audience */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5"><Users className="w-4 h-4 text-muted-foreground" />Audience</h3>

                {/* Period chips */}
                {(blastOptions?.periods?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Session periods</p>
                    <div className="flex flex-wrap gap-1.5">
                      {blastOptions!.periods.map(p => {
                        const [yr, mo] = p.split("-");
                        const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                        const active = blastFilters.periods.includes(p);
                        return (
                          <button key={p}
                            onClick={() => setBlastFilters(f => ({ ...f, periods: active ? f.periods.filter(x => x !== p) : [...f.periods, p] }))}
                            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                            data-testid={`chip-period-${p}`}
                          >{label}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Country chips */}
                {(blastOptions?.countries?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Country</p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {blastOptions!.countries.map(({ name, code }) => {
                        const active = blastFilters.countries.includes(name);
                        return (
                          <button key={name}
                            onClick={() => setBlastFilters(f => ({ ...f, countries: active ? f.countries.filter(x => x !== name) : [...f.countries, name] }))}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                            data-testid={`chip-country-${name}`}
                          >
                            <CountryFlag code={code} name={name} />
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* City search */}
                {(blastOptions?.cities?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">City</p>
                    <Input
                      placeholder="Search city..."
                      value={blastCitySearch}
                      onChange={e => setBlastCitySearch(e.target.value)}
                      className="h-8 text-sm mb-1.5"
                      data-testid="input-blast-city-search"
                    />
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                      {blastOptions!.cities
                        .filter(c => c.toLowerCase().includes(blastCitySearch.toLowerCase()))
                        .map(c => {
                          const active = blastFilters.cities.includes(c);
                          return (
                            <button key={c}
                              onClick={() => setBlastFilters(f => ({ ...f, cities: active ? f.cities.filter(x => x !== c) : [...f.cities, c] }))}
                              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                              data-testid={`chip-city-${c}`}
                            >{c}</button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Device OS toggle */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Device OS</p>
                  <div className="flex gap-2 flex-wrap">
                    {[{ value: "all", label: "All" }, { value: "android", label: "Android" }, { value: "ios", label: "iOS" }, { value: "desktop", label: "Desktop" }].map(({ value, label }) => {
                      const active = blastFilters.deviceOs.includes(value);
                      return (
                        <button key={value}
                          onClick={() => {
                            if (value === "all") {
                              setBlastFilters(f => ({ ...f, deviceOs: active ? [] : ["all"] }));
                            } else {
                              setBlastFilters(f => {
                                const next = active ? f.deviceOs.filter(x => x !== value) : [...f.deviceOs.filter(x => x !== "all"), value];
                                return { ...f, deviceOs: next };
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                          data-testid={`button-os-${value}`}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Live preview count */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs gap-1.5" data-testid="badge-match-count">
                    {blastPreviewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                    {blastPreviewLoading ? "Calculating..." : `${blastPreview?.count ?? 0} sessions matched`}
                  </Badge>
                  {(blastPreview?.count ?? 0) > 0 && (
                    <button
                      onClick={() => setBlastPreviewExpanded(v => !v)}
                      className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
                      data-testid="button-toggle-preview-list"
                    >
                      {blastPreviewExpanded ? <><ChevronUp className="w-3.5 h-3.5" />Hide</>: <><ChevronDown className="w-3.5 h-3.5" />Show matched</>}
                    </button>
                  )}
                </div>
                {blastPreviewExpanded && (blastPreview?.sessions?.length ?? 0) > 0 && (
                  <ScrollArea className="max-h-32 rounded-md border p-2">
                    <div className="flex flex-col gap-1">
                      {blastPreview!.sessions.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{s.customerName || "Visitor"}</span>
                          {s.countryName && <span className="text-muted-foreground/60">· {s.countryName}</span>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Section 2: Message Composer */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-muted-foreground" />Message</h3>

                {/* Message type selector */}
                <div className="flex gap-2">
                  {([{ value: "text", label: "Text" }, { value: "announcement", label: "Announcement" }] as const).map(({ value, label }) => (
                    <button key={value}
                      onClick={() => setBlastMessageTypeVal(value)}
                      className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${blastMessageTypeVal === value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                      data-testid={`button-blast-type-${value}`}
                    >{label}</button>
                  ))}
                </div>

                <div className="relative">
                  <Textarea
                    placeholder={blastMessageTypeVal === "announcement" ? "Type your announcement here..." : "Type your blast message here..."}
                    value={blastMessage}
                    onChange={e => setBlastMessage(e.target.value.slice(0, 1000))}
                    className="min-h-[80px] text-sm resize-none pr-12"
                    data-testid="textarea-blast-message"
                  />
                  <span className={`absolute bottom-2 right-3 text-[10px] ${blastMessage.length > 900 ? "text-destructive" : "text-muted-foreground"}`}>
                    {blastMessage.length}/1000
                  </span>
                </div>

                {/* Media uploader */}
                <div>
                  <input
                    ref={blastFileRef}
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleBlastMediaUpload(f); e.target.value = ""; }}
                    data-testid="input-blast-file"
                  />
                  {blastMediaPreview ? (
                    <div className="relative inline-block">
                      {blastMediaType === "photo" ? (
                        <img src={blastMediaPreview} alt="Preview" className="max-h-24 rounded-md border object-cover" />
                      ) : blastMediaType === "video" ? (
                        <video src={blastMediaPreview} className="max-h-24 rounded-md border" controls />
                      ) : (
                        <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted text-xs">
                          <FileText className="w-4 h-4" />
                          Document attached
                        </div>
                      )}
                      <button
                        onClick={() => { setBlastMediaUrl(null); setBlastMediaType(null); setBlastMediaPreview(null); }}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"
                        data-testid="button-remove-blast-media"
                      ><X className="w-2.5 h-2.5" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => blastFileRef.current?.click()}
                      disabled={blastIsUploadingMedia}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={e => {
                        e.preventDefault(); e.stopPropagation();
                        const f = e.dataTransfer.files?.[0];
                        if (f && !blastIsUploadingMedia) handleBlastMediaUpload(f);
                      }}
                      className="flex items-center gap-2 border border-dashed rounded-md px-3 py-2.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors w-full justify-center"
                      data-testid="button-blast-media-upload"
                    >
                      {blastIsUploadingMedia ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                      {blastIsUploadingMedia ? "Uploading..." : "Drag & drop or click to attach image, video, or PDF"}
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: Schedule */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5"><Clock className="w-4 h-4 text-muted-foreground" />Schedule</h3>
                <div className="flex gap-2">
                  {[{ value: "now", label: "Send Now" }, { value: "later", label: "Schedule for later" }].map(({ value, label }) => (
                    <button key={value}
                      onClick={() => setBlastScheduleMode(value as "now" | "later")}
                      className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${blastScheduleMode === value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}
                      data-testid={`button-schedule-${value}`}
                    >{label}</button>
                  ))}
                </div>

                {blastScheduleMode === "later" && (
                  <div className="space-y-2">
                    <Calendar
                      mode="single"
                      selected={blastScheduleDate}
                      onSelect={setBlastScheduleDate}
                      disabled={(d) => {
                        const today = new Date(); today.setHours(0, 0, 0, 0);
                        const max = new Date(Date.now() + 30 * 86400_000);
                        return d < today || d > max;
                      }}
                      className="rounded-md border w-fit"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min="0" max="23" placeholder="HH"
                        value={blastScheduleHour}
                        onChange={e => {
                          const v = Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0));
                          setBlastScheduleHour(String(v).padStart(2, "0"));
                        }}
                        className="w-16 h-8 text-sm text-center"
                        data-testid="input-blast-hour"
                      />
                      <span className="text-muted-foreground font-bold">:</span>
                      <Input
                        type="number" min="0" max="59" placeholder="MM"
                        value={blastScheduleMinute}
                        onChange={e => {
                          const v = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
                          setBlastScheduleMinute(String(v).padStart(2, "0"));
                        }}
                        className="w-16 h-8 text-sm text-center"
                        data-testid="input-blast-minute"
                      />
                    </div>
                    {blastScheduleDate && (
                      <p className="text-xs text-muted-foreground">
                        Will send on {blastScheduleDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {blastScheduleHour}:{blastScheduleMinute}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── HISTORY TAB ── */}
            <TabsContent value="history" className="flex-1 overflow-y-auto px-6 pb-6 pt-4 mt-0">
              {blastHistoryLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
                </div>
              ) : (blastHistory?.campaigns?.length ?? 0) === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  No blasts sent yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-2 pb-1 border-b">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Message / Audience</span>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide text-right">Matched</span>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide text-right">Delivered</span>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide text-right">Failed</span>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide text-right">Rate</span>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide text-right">Actions</span>
                  </div>
                  {blastHistory!.campaigns.map(c => {
                    const f = c.filters;
                    const dateLabel = (c.sentAt ?? c.scheduledFor) ? new Date(c.sentAt ?? c.scheduledFor).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
                    const rate = c.successRate ?? 0;
                    const statusBadge: Record<string, string> = { sent: "bg-green-500/15 text-green-700 dark:text-green-400", scheduled: "bg-blue-500/15 text-blue-700 dark:text-blue-400", sending: "bg-amber-500/15 text-amber-700 dark:text-amber-400", cancelled: "bg-muted text-muted-foreground" };
                    return (
                      <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 items-center px-2 py-2 rounded-md hover-elevate" data-testid={`row-blast-${c.id}`}>
                        {/* Message + audience column */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusBadge[c.status] || statusBadge.cancelled}`}>
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{dateLabel}</span>
                          </div>
                          <p className="text-xs truncate" data-testid={`text-blast-message-${c.id}`}>{c.message}</p>
                          {(f.countries?.length || f.cities?.length || f.deviceOs?.filter((o: string) => o !== "all").length || f.periods?.length) ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {f.countries?.map((ct: string) => <Badge key={ct} variant="outline" className="text-[10px] h-4 gap-0.5 px-1"><CountryFlag code={blastOptions?.countries?.find(x => x.name === ct)?.code} name={ct} />{ct}</Badge>)}
                              {f.cities?.map((ci: string) => <Badge key={ci} variant="outline" className="text-[10px] h-4 px-1">{ci}</Badge>)}
                              {f.deviceOs?.filter((o: string) => o !== "all").map((o: string) => <Badge key={o} variant="outline" className="text-[10px] h-4 px-1">{o}</Badge>)}
                              {f.periods?.map((p: string) => { const [yr,mo]=p.split("-"); return <Badge key={p} variant="outline" className="text-[10px] h-4 px-1">{new Date(Number(yr),Number(mo)-1,1).toLocaleDateString("en-US",{month:"short",year:"numeric"})}</Badge>; })}
                            </div>
                          ) : null}
                        </div>
                        {/* Matched */}
                        <span className="text-xs text-muted-foreground text-right tabular-nums">{c.matchedCount}</span>
                        {/* Delivered */}
                        <span className="text-xs text-right tabular-nums" style={{ color: c.status === "sent" ? '#22c55e' : undefined }}>{c.status === "sent" ? c.deliveredCount : "—"}</span>
                        {/* Failed */}
                        <span className="text-xs text-right tabular-nums" style={{ color: c.status === "sent" && c.failedCount > 0 ? '#ef4444' : undefined }}>{c.status === "sent" ? c.failedCount : "—"}</span>
                        {/* Success rate */}
                        <div className="flex items-center gap-1 justify-end w-16">
                          {c.status === "sent" ? (
                            <>
                              <div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: rate >= 80 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444' } satisfies React.CSSProperties} />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-6 text-right tabular-nums">{rate}%</span>
                            </>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] gap-0.5"
                            onClick={() => {
                              setBlastMessage(c.message);
                              setBlastMessageTypeVal(c.blastMessageType === "announcement" ? "announcement" : "text");
                              setBlastFilters(c.filters || { periods: [], countries: [], cities: [], deviceOs: [] });
                              setBlastMediaUrl(c.mediaUrl ?? null);
                              setBlastMediaType(c.mediaType ?? null);
                              // Restore preview from stored URL so user can see and optionally remove the attachment
                              setBlastMediaPreview(c.mediaUrl ?? null);
                              setBlastTab("compose");
                            }}
                            data-testid={`button-blast-again-${c.id}`}
                          ><RotateCcw className="w-2.5 h-2.5" />Again</Button>
                          {c.status === "scheduled" && (
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] gap-0.5 text-destructive"
                              onClick={() => setBlastCancelId(c.id)}
                              data-testid={`button-cancel-blast-${c.id}`}
                            ><Ban className="w-2.5 h-2.5" /></Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(blastHistory?.pages ?? 0) > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button size="sm" variant="outline" disabled={blastHistoryPage <= 1} onClick={() => setBlastHistoryPage(p => p - 1)} data-testid="button-blast-history-prev">Prev</Button>
                      <span className="text-xs text-muted-foreground">Page {blastHistory?.page} of {blastHistory?.pages}</span>
                      <Button size="sm" variant="outline" disabled={blastHistoryPage >= (blastHistory?.pages ?? 1)} onClick={() => setBlastHistoryPage(p => p + 1)} data-testid="button-blast-history-next">Next</Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Footer for Compose tab */}
          {blastTab === "compose" && (
            <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {blastPreviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                {blastPreviewLoading ? "Calculating..." : `${blastPreview?.count ?? 0} recipients`}
              </div>
              <Button
                disabled={!blastMessage.trim() || (blastPreview?.count ?? 0) === 0 || blastSendMutation.isPending || (blastScheduleMode === "later" && !blastScheduleDate)}
                onClick={() => setBlastConfirmOpen(true)}
                className="gap-2"
                data-testid="button-blast-send"
              >
                {blastSendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                {blastScheduleMode === "later" ? "Schedule Blast" : "Send Blast"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Blast send confirmation */}
      <AlertDialog open={blastConfirmOpen} onOpenChange={setBlastConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              {blastScheduleMode === "later" ? "Schedule this blast?" : `Send to ${blastPreview?.count ?? 0} sessions?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blastScheduleMode === "later"
                ? `This blast will be delivered to ${blastPreview?.count ?? 0} sessions on ${blastScheduleDate?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${blastScheduleHour}:${blastScheduleMinute}.`
                : `This will immediately send your message to ${blastPreview?.count ?? 0} active sessions. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-blast-confirm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blastSendMutation.mutate({
                message: blastMessage,
                blastMessageType: blastMessageTypeVal,
                filters: blastFilters,
                scheduledFor: blastScheduleMode === "later" ? buildBlastScheduledFor() : undefined,
                mediaUrl: blastMediaUrl ?? undefined,
                mediaType: blastMediaType ?? undefined,
              })}
              data-testid="button-confirm-blast-send"
              disabled={blastSendMutation.isPending}
            >
              {blastSendMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {blastScheduleMode === "later" ? "Schedule" : "Send Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blast cancel scheduled confirmation */}
      <AlertDialog open={!!blastCancelId} onOpenChange={(open) => { if (!open) setBlastCancelId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel scheduled blast?</AlertDialogTitle>
            <AlertDialogDescription>This will cancel the scheduled blast. It will not be sent.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-blast-cancel">Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { if (blastCancelId) blastCancelMutation.mutate(blastCancelId); }}
              data-testid="button-confirm-blast-cancel"
            >
              {blastCancelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Yes, Cancel Blast
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Session confirmation dialog */}
      <AlertDialog open={endSessionDialogOpen} onOpenChange={setEndSessionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <StopCircle className="w-5 h-5 text-destructive" />
              End this session?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the session with{" "}
              <span className="font-medium text-foreground">
                {getVisitorDisplayName(selectedSessionData?.customerName)}
              </span>{" "}
              as finished. The chat history is preserved and you can still view it afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-end-session">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (selectedSession) endSessionMutation.mutate(selectedSession); }}
              data-testid="button-confirm-end-session"
            >
              {endSessionMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <StopCircle className="w-4 h-4 mr-2" />
              )}
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
