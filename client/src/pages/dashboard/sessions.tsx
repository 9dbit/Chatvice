import { useState, useEffect, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, Bot, HeadphonesIcon, Send, Search, User, Download, 
  Hand, ArrowLeft, Clock, Edit, Check, X, Loader2, RefreshCw, AlertCircle,
  CheckCircle2, Circle, XCircle, Filter, ShoppingBag, Plus, ImageIcon, Video, FileText,
  ExternalLink, Maximize2, Minimize2, MapPin, Volume2, VolumeX, Monitor, Globe, Smartphone, Radio
} from "lucide-react";
import {
  SiAndroid, SiApple, SiLinux,
  SiGooglechrome, SiFirefox, SiSafari, SiOpera,
} from "react-icons/si";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
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
    return <Smartphone className={`${cls} text-muted-foreground`} title="Mobile" />;
  return <Monitor className={`${cls} text-muted-foreground`} title="Desktop" />;
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

function HandlerAvatar({ mode, supervisorPhoto, agentPhoto, size = "md" }: { 
  mode: "AI" | "HUMAN";
  supervisorPhoto?: string | null;
  agentPhoto?: string | null;
  size?: "sm" | "md";
}) {
  const avatarCls = size === "sm" ? "h-8 w-8 border border-primary/20" : "h-12 w-12 border-2 border-primary/20";
  const iconCls  = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  if (mode === "HUMAN") {
    return (
      <Avatar className={`${avatarCls} border-primary/20`}>
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
    <Avatar className={`${avatarCls} border-secondary/20`}>
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
}

interface PreviewContent {
  type: "photo" | "video" | "document" | "url";
  url: string;
  filename?: string;
  title?: string;
}

export default function SessionsPage() {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
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
  
  // Save sound preference
  useEffect(() => {
    localStorage.setItem("sessionSoundEnabled", String(soundEnabled));
  }, [soundEnabled]);
  
  // Clear preview when session changes
  useEffect(() => {
    setPreviewContent(null);
    setIsPreviewExpanded(false);
  }, [selectedSession]);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<SessionWithPreview[]>({
    queryKey: ["/api/sessions", merchantId],
    enabled: !!merchantId,
    refetchInterval: 5000,
  });

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

  // Track new sessions - play incoming sound for first message
  useEffect(() => {
    if (!sessions || !soundEnabled) return;
    
    const currentSessionIds = new Set(sessions.map(s => s.id));
    const currentAttentionSessions = new Set(
      sessions.filter(s => s.needsSupervisorAttention).map(s => s.id)
    );
    
    if (initialLoadRef.current) {
      previousSessionIdsRef.current = currentSessionIds;
      previousAttentionSessionsRef.current = currentAttentionSessions;
      sessions.forEach(s => sessionMessageCountsRef.current.set(s.id, 0));
      initialLoadRef.current = false;
      return;
    }
    
    // Check for new sessions
    const newSessions = sessions.filter(s => !previousSessionIdsRef.current.has(s.id));
    if (newSessions.length > 0) {
      playIncomingChatSound();
      toast({
        title: "Pesan baru!",
        description: `${newSessions.length} sesi baru dimulai`,
        duration: 5000,
      });
    }
    
    // Check for sessions that newly require attention (trigger words or anger detected)
    // This includes both new sessions AND existing sessions that just got escalated
    const newlyEscalatedSessions = sessions.filter(s => 
      s.needsSupervisorAttention &&
      !previousAttentionSessionsRef.current.has(s.id)
    );
    if (newlyEscalatedSessions.length > 0) {
      playAngrySound();
      toast({
        title: "Escalated session!",
        description: `${newlyEscalatedSessions.length} session(s) need immediate attention`,
        duration: 10000,
      });
    }
    
    previousSessionIdsRef.current = currentSessionIds;
    previousAttentionSessionsRef.current = currentAttentionSessions;
  }, [sessions, soundEnabled, toast]);
  
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
        title: "Product offered",
        description: "The product recommendation has been sent to the customer.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to offer product",
        description: "Something went wrong. Please try again.",
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

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/session/send-message", {
        sessionId: selectedSession,
        message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedSession] });
      setNewMessage("");
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Something went wrong. Please try again.",
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
        throw new Error("Upload failed");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedSession] });
      toast({
        title: "File sent",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} has been sent to the customer.`,
      });
    } catch {
      toast({
        title: "Upload failed",
        description: "Failed to upload the file. Please try again.",
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
        title: "Session taken over",
        description: "You are now handling this conversation.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to take over",
        description: "Something went wrong. Please try again.",
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
        title: "Returned to AI",
        description: "The conversation is now being handled by the AI assistant.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to return to bot",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

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
        title: "Answer revised",
        description: "The AI response has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to revise",
        description: "Something went wrong. Please try again.",
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

  // Merge sessions from the same browser (deviceFingerprint) into a single list entry (show most recent; badge shows count).
  // Using deviceFingerprint instead of clientIp prevents customers on shared IPs/NATs from being collapsed together.
  const displayedSessions = sortedSessions ? (() => {
    const ipMap = new Map<string, SessionWithPreview & { sessionCount: number }>();
    for (const session of sortedSessions) {
      const key = session.deviceFingerprint || session.id;
      const existing = ipMap.get(key);
      if (!existing) {
        ipMap.set(key, { ...session, sessionCount: 1 });
      } else {
        // Prefer the session with "better" status (lower statusOrder) then more recent activity
        const statusOrder = { needs_response: 0, angry: 1, active: 2, ended: 3 };
        const existingRank = statusOrder[getSessionStatus(existing) as keyof typeof statusOrder] ?? 3;
        const newRank     = statusOrder[getSessionStatus(session)  as keyof typeof statusOrder] ?? 3;
        const existingTime = existing.lastActivity ? new Date(existing.lastActivity).getTime() : 0;
        const newTime      = session.lastActivity  ? new Date(session.lastActivity).getTime()  : 0;
        const count = existing.sessionCount + 1;
        if (newRank < existingRank || (newRank === existingRank && newTime > existingTime)) {
          ipMap.set(key, { ...session, sessionCount: count });
        } else {
          existing.sessionCount = count;
        }
      }
    }
    return Array.from(ipMap.values());
  })() : undefined;

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
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
        title: "Transcript exported",
        description: "The chat transcript has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export the transcript. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedSessionData = sessions?.find((s) => s.id === selectedSession);

  const statusCounts = {
    angry: sortedSessions?.filter(s => getSessionStatus(s) === "angry").length || 0,
    active: sortedSessions?.filter(s => getSessionStatus(s) === "active").length || 0,
    needsResponse: sortedSessions?.filter(s => getSessionStatus(s) === "needs_response").length || 0,
    ended: sortedSessions?.filter(s => getSessionStatus(s) === "ended").length || 0,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex-shrink-0 pb-2 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2 sm:mb-4">
          <div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3" data-testid="text-page-title">
                Chat Sessions
                {(statusCounts.needsResponse > 0 || statusCounts.angry > 0) && (
                  <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500" />
                  </span>
                )}
              </h1>
              {/* Handler avatar + name to the right of title — shown when a session is selected */}
              {selectedSession && selectedSessionData && (
                <div className="flex items-center gap-2" data-testid="handler-identity">
                  <HandlerAvatar
                    size="sm"
                    mode={selectedSessionData.mode as "AI" | "HUMAN"}
                    agentPhoto={getAgentPhoto(selectedSessionData.agentId)}
                    supervisorPhoto={getSupervisorPhoto(selectedSessionData.supervisorId, selectedSessionData.agentId)}
                  />
                  <span className="text-sm text-muted-foreground" data-testid="text-handler-name">
                    {selectedSessionData.mode === "AI"
                      ? getAgentName(selectedSessionData.agentId)
                      : getSupervisorName(selectedSessionData.supervisorId, selectedSessionData.agentId) || "Awaiting"}
                  </span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">View and manage customer conversations</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs flex-wrap">
            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-red-500/10 border border-red-500/20" title="Angry Customer - Alert">
              <StatusDot status="angry" />
              <span className="hidden sm:inline text-red-600 dark:text-red-400">Alert</span>
              <span data-testid="text-count-angry">{statusCounts.angry}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-green-500/10 border border-green-500/20" title="Active Chat">
              <StatusDot status="active" />
              <span className="hidden sm:inline text-green-600 dark:text-green-400">Active</span>
              <span data-testid="text-count-active">{statusCounts.active}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-orange-500/10 border border-orange-500/20" title="Needs Supervisor Response">
              <StatusDot status="needs_response" />
              <span className="hidden sm:inline text-orange-600 dark:text-orange-400">Pending</span>
              <span data-testid="text-count-needs-response">{statusCounts.needsResponse}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-gray-500/10 border border-gray-500/20" title="Finished">
              <StatusDot status="ended" />
              <span className="hidden sm:inline text-gray-600 dark:text-gray-400">Finished</span>
              <span data-testid="text-count-ended">{statusCounts.ended}</span>
            </div>
            <Button
              variant={soundEnabled ? "ghost" : "outline"}
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Sound alerts on" : "Sound alerts off"}
              className="h-7 w-7 sm:h-8 sm:w-8"
              data-testid="button-toggle-sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        <div className={`lg:col-span-5 xl:col-span-4 flex flex-col min-h-0 ${selectedSession ? 'hidden lg:flex' : 'flex'}`}>
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0 py-3 px-4 space-y-2">
              <div className="relative">
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
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="h-9" data-testid="select-agent-filter">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="px-2 pb-2 space-y-1">
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
                          onClick={() => setSelectedSession(session.id)}
                          className={`w-full p-2.5 rounded-lg text-left transition-colors hover-elevate ${
                            isSelected
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted/80"
                          }`}
                          data-testid={`button-session-${session.id}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="relative flex-shrink-0">
                              <Avatar className={`h-9 w-9 ${session.visitorSession ? 'ring-2 ring-primary/40' : ''}`}>
                                {session.customerAvatarUrl ? (
                                  <AvatarImage src={session.customerAvatarUrl} alt={getVisitorDisplayName(session.customerName)} />
                                ) : null}
                                <AvatarFallback className={`${getAvatarColor(getVisitorDisplayName(session.customerName))} text-white text-xs font-semibold`}>
                                  {session.visitorSession
                                    ? <Radio className="w-4 h-4 text-white" />
                                    : getInitials(getVisitorDisplayName(session.customerName))}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5">
                                <StatusDot status={status} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              {/* Row 1: Flag + IP/Name + icons + time */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <CountryFlag code={session.countryCode} name={session.countryName} />
                                  <span className="text-sm font-semibold truncate font-mono">
                                    {session.clientIp || getVisitorDisplayName(session.customerName)}
                                  </span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <DeviceIcon userAgent={session.userAgent} />
                                    <OsIcon userAgent={session.userAgent} />
                                    <BrowserIcon userAgent={session.userAgent} />
                                  </div>
                                  {session.sessionCount > 1 && (
                                    <span className="flex-shrink-0 text-[10px] font-semibold bg-muted text-muted-foreground rounded px-1 py-0.5 leading-none">
                                      {session.sessionCount}
                                    </span>
                                  )}
                                  {session.visitorSession && session.proactiveGreetingSent && (
                                    <span className="flex-shrink-0 text-[9px] font-semibold bg-primary/15 text-primary rounded px-1 py-0.5 leading-none">
                                      Proactive
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                  {session.lastActivity 
                                    ? formatDistanceToNow(new Date(session.lastActivity), { addSuffix: false })
                                    : ""}
                                </span>
                              </div>
                              {/* Row 2: Customer name (suppressed when customerName is an IP address since Row 1 already shows clientIp) */}
                              {session.customerName && !isIpAddress(session.customerName) && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span className="truncate">{session.customerName}</span>
                                </div>
                              )}
                              {/* Row 3: Handler */}
                              <div className="flex items-center gap-1.5 text-xs font-medium">
                                {session.mode === "HUMAN" ? (
                                  <>
                                    <HeadphonesIcon className="h-3 w-3 text-primary flex-shrink-0" />
                                    <span className="truncate text-primary">
                                      {getSupervisorName(session.supervisorId, session.agentId) || "Awaiting Supervisor"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Bot className="h-3 w-3 text-secondary-foreground flex-shrink-0" />
                                    <span className="truncate text-secondary-foreground">
                                      {getAgentName(session.agentId)}
                                    </span>
                                  </>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                <span className="text-foreground/70">Q:</span> {session.lastQuestion || (session.visitorSession ? "Proactive greeting sent" : "No messages yet")}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                <span className="text-primary/70">A:</span> {session.lastMessage || "Awaiting reply..."}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 px-4">
                      <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No sessions found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className={`lg:col-span-7 xl:col-span-8 flex min-h-0 gap-3 ${selectedSession ? 'flex' : 'hidden lg:flex'}`}>
          <Card className={`flex flex-col h-full transition-all duration-300 ${previewContent ? 'flex-1' : 'w-full'}`}>
            {selectedSession ? (
              <>
                <CardHeader className="flex-shrink-0 border-b py-2 sm:py-3 px-3 sm:px-4">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    {/* LEFT: back button + customer avatar + customer name/time */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedSession(null)}
                        className="h-8 w-8 lg:hidden flex-shrink-0"
                        data-testid="button-back-to-list"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
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
                        <CardTitle className="text-sm sm:text-base truncate" data-testid="text-selected-customer">
                          {getVisitorDisplayName(selectedSessionData?.customerName)}
                        </CardTitle>
                        {/* Client info row: flag + IP + device + OS + browser + country */}
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <CountryFlag code={selectedSessionData?.countryCode} name={selectedSessionData?.countryName} />
                          {selectedSessionData?.clientIp && (
                            <span className="font-mono text-[11px] sm:text-xs text-muted-foreground">
                              {selectedSessionData.clientIp}
                            </span>
                          )}
                          <DeviceIcon userAgent={selectedSessionData?.userAgent} size="md" />
                          <OsIcon userAgent={selectedSessionData?.userAgent} size="md" />
                          <BrowserIcon userAgent={selectedSessionData?.userAgent} size="md" />
                          {selectedSessionData?.countryName && selectedSessionData.countryCode !== "xx" && selectedSessionData.countryCode !== "XX" && (
                            <span className="text-[11px] sm:text-xs text-muted-foreground">
                              {selectedSessionData.countryName}
                            </span>
                          )}
                          {selectedSessionData?.lastActivity && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] sm:text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(selectedSessionData.lastActivity), { addSuffix: true })}
                              </span>
                            </>
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
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            data-testid="button-refresh-messages"
                          >
                            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                          {selectedSessionData?.mode === "AI" ? (
                            <Button
                              size="sm"
                              onClick={() => takeoverMutation.mutate(selectedSession)}
                              disabled={takeoverMutation.isPending}
                              className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                              data-testid="button-takeover-session"
                            >
                              <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" />
                              <span className="hidden sm:inline">Take Over</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => returnToBotMutation.mutate(selectedSession)}
                              disabled={returnToBotMutation.isPending}
                              className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                              data-testid="button-return-to-bot"
                            >
                              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" />
                              <span className="hidden sm:inline">Return to Bot</span>
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleExportTranscript}
                            title="Export"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            data-testid="button-export-transcript"
                          >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-3">
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
                            <div key={msg.id || index} className="space-y-2">
                            <div
                              className={`flex gap-2.5 ${isCustomerMessage ? "justify-start" : "justify-end"} group`}
                            >
                              {/* Customer avatar on left */}
                              {isCustomerMessage && (
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  {selectedSessionData?.customerAvatarUrl ? (
                                    <AvatarImage src={selectedSessionData.customerAvatarUrl} alt={getVisitorDisplayName(selectedSessionData?.customerName)} />
                                  ) : null}
                                  <AvatarFallback className={`${getAvatarColor(getVisitorDisplayName(selectedSessionData?.customerName))} text-white text-sm font-semibold`}>
                                    {getInitials(getVisitorDisplayName(selectedSessionData?.customerName))}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className="relative max-w-[75%]">
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
                                  {/* Customer name on customer messages */}
                                  {isCustomerMessage && (
                                    <p className="text-[10px] font-medium mb-1 text-foreground/70">
                                      {getVisitorDisplayName(selectedSessionData?.customerName)}
                                    </p>
                                  )}
                                  {/* AI/Supervisor name on their messages */}
                                  {!isCustomerMessage && msg.from !== "system" && (
                                    <p className="text-[10px] font-medium mb-1 text-primary-foreground/80">
                                      {msg.from === "chatvice" || msg.from === "bot" || msg.from === "ai"
                                        ? getAgentName(selectedSessionData?.agentId)
                                        : msg.from === "supervisor" 
                                          ? getSupervisorName(selectedSessionData?.supervisorId, selectedSessionData?.agentId) || "Supervisor"
                                          : getAgentName(selectedSessionData?.agentId)}
                                    </p>
                                  )}
                                  {!((msg as any).messageType === "media" && ((msg as any).payload?.url || (msg as any).payload?.mediaUrl)) && 
                                   !((msg as any).messageType === "product_offer" && (msg as any).payload?.productCard) && (
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{renderMessageWithLinks(msg.content)}</p>
                                  )}
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
                                                    fallback.innerHTML = '<span class="text-xs text-muted-foreground">Image unavailable</span>';
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
                                  <p className={`text-[10px] mt-1 ${msg.from === "user" ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                  </p>
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
                              {/* Agent/Supervisor avatar on right */}
                              {!isCustomerMessage && (
                                <Avatar className="h-10 w-10 flex-shrink-0">
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
                            {/* Product Cards Display - show when AI message matches product triggers */}
                            {!isCustomerMessage && (msg.from === "chatvice" || msg.from === "bot" || msg.from === "ai") && 
                             shouldShowProductsForMessage(msg.content) && productCards.filter(c => c.isActive).length > 0 && (
                              <div className="flex justify-end mt-2 mr-12">
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2 justify-end">
                                    <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-[11px] font-medium text-muted-foreground">Produk rekomendasi:</span>
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
                  {selectedSessionData?.mode === "HUMAN" && (
                    <div className="flex-shrink-0 p-3 border-t bg-background">
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
                          disabled={sendMessageMutation.isPending || !newMessage.trim() || showQuickReplyPopup}
                          className="h-9"
                          data-testid="button-send-message"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      {quickReplies.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Type "/" to see quick replies
                        </p>
                      )}
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
    </div>
  );
}
