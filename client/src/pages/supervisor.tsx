import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Redirect, Link } from "wouter";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { MessageReactions, type Reaction } from "@/components/message-reactions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  HeadphonesIcon,
  MessageSquare,
  Send,
  Bell,
  BellRing,
  User,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Hand,
  Volume2,
  VolumeX,
  ArrowLeft,
  FileText,
  LayoutDashboard,
  Reply,
  MousePointer2,
  Eye,
  Users,
  Activity,
  Globe,
  X,
} from "lucide-react";
import type { Session, Message, Notification, ChatLog } from "@shared/schema";
import { playIncomingChatSound, playChatReplySound, playAngrySound } from "@/lib/sounds";
import { DeviceIcon, OsIcon, BrowserIcon } from "@/lib/device-utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Download, ExternalLink } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { SiTelegram } from "react-icons/si";
import chatviceLogoLight from "@assets/Chatvice-02_1769691434945.png";
import chatviceLogoDark from "@assets/Chatvice-04_1769691434945.png";

const CUSTOMER_AVATAR_COLORS = [
  "bg-rose-500", "bg-pink-500", "bg-fuchsia-500", "bg-purple-500",
  "bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-sky-500",
  "bg-cyan-500", "bg-teal-500", "bg-emerald-500", "bg-green-500",
  "bg-lime-600", "bg-amber-500", "bg-orange-500", "bg-red-500",
];

function getCustomerAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CUSTOMER_AVATAR_COLORS[Math.abs(hash) % CUSTOMER_AVATAR_COLORS.length];
}

function getCustomerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "C").toUpperCase();
}

type SupervisorPage = 
  | "overview" 
  | "chat-sessions" 
  | "live-visitors"
  | "chat-logs" 
  | "quick-replies" 
  | "chat-buttons" 
  | "live-preview" 
  | "supervisors" 
  | "team-activity" 
  | "notifications";

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

const supervisorMenuItems: { id: SupervisorPage; title: string; icon: any }[] = [
  { id: "overview", title: "Overview", icon: LayoutDashboard },
  { id: "chat-sessions", title: "Chat Sessions", icon: MessageSquare },
  { id: "live-visitors", title: "Live Visitors", icon: Eye },
  { id: "chat-logs", title: "Chat Logs", icon: FileText },
  { id: "quick-replies", title: "Quick Replies", icon: Reply },
  { id: "chat-buttons", title: "Chat Buttons", icon: MousePointer2 },
  { id: "live-preview", title: "Live Preview", icon: Eye },
  { id: "supervisors", title: "Supervisors", icon: Users },
  { id: "team-activity", title: "Team Activity", icon: Activity },
  { id: "notifications", title: "Notifications", icon: Bell },
];

function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const createBellTone = (startTime: number, freq: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, startTime);
      
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    createBellTone(now, 880, 0.15);
    createBellTone(now + 0.15, 1100, 0.15);
    createBellTone(now + 0.30, 880, 0.2);
  } catch (error) {
    console.log("Could not play alert sound:", error);
  }
}

function SupervisorSidebar({
  currentPage,
  setCurrentPage,
  escalatedCount,
  soundEnabled,
  setSoundEnabled,
  isAlertActive,
  unseenNotifications,
  handleLogout,
}: {
  currentPage: SupervisorPage;
  setCurrentPage: (page: SupervisorPage) => void;
  escalatedCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isAlertActive: boolean;
  unseenNotifications: Notification[];
  handleLogout: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const chatviceLogo = resolvedTheme === "dark" ? chatviceLogoDark : chatviceLogoLight;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer" data-testid="link-supervisor-logo">
          <img src={chatviceLogo} alt="Chatvice" className="h-8 w-auto" />
          <div>
            <p className="text-xs text-muted-foreground">Supervisor Panel</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supervisorMenuItems.map((item) => {
                const isActive = currentPage === item.id;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      className={isActive ? "bg-sidebar-accent" : ""}
                      onClick={() => setCurrentPage(item.id)}
                      data-testid={`button-supervisor-${item.id}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.id === "chat-sessions" && escalatedCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {escalatedCount}
                        </Badge>
                      )}
                      {item.id === "notifications" && unseenNotifications.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {unseenNotifications.length}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant={soundEnabled ? "ghost" : "outline"} 
              size="icon" 
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Sound alerts on" : "Sound alerts off"}
              data-testid="button-toggle-sound"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <ThemeToggle />
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function TelegramLinkingCard() {
  const { toast } = useToast();
  const [telegramId, setTelegramId] = useState("");

  const { data: telegramData, isLoading } = useQuery<{ telegramChatId: string | null }>({
    queryKey: ["/api/supervisor/telegram"],
  });

  useEffect(() => {
    if (telegramData?.telegramChatId) {
      setTelegramId(telegramData.telegramChatId);
    }
  }, [telegramData]);

  const linkMutation = useMutation({
    mutationFn: async (chatId: string | null) => {
      await apiRequest("PATCH", "/api/supervisor/telegram", { telegramChatId: chatId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/telegram"] });
      toast({ title: telegramId ? "Telegram linked" : "Telegram unlinked" });
    },
    onError: () => {
      toast({ title: "Failed to update Telegram ID", variant: "destructive" });
    },
  });

  const isLinked = !!telegramData?.telegramChatId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <SiTelegram className="w-5 h-5 text-[#0088cc]" />
          Telegram Notifications
        </CardTitle>
        <CardDescription>
          Receive escalated chat notifications and reply to customers directly from Telegram.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Your Telegram Chat ID"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="max-w-xs"
                data-testid="input-telegram-chat-id"
              />
              <Button
                onClick={() => linkMutation.mutate(telegramId || null)}
                disabled={linkMutation.isPending}
                data-testid="button-save-telegram-id"
              >
                {linkMutation.isPending ? "Saving..." : "Save"}
              </Button>
              {isLinked && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setTelegramId("");
                    linkMutation.mutate(null);
                  }}
                  disabled={linkMutation.isPending}
                  data-testid="button-unlink-telegram"
                >
                  Unlink
                </Button>
              )}
            </div>
            {isLinked && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  Telegram linked (ID: {telegramData?.telegramChatId})
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              To link your Telegram: open the merchant's bot on Telegram and send /start. The bot will show your Chat ID. Paste it above and save. When a chat is escalated, you will receive a DM from the bot. Reply to the message to respond to the customer directly.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function SupervisorPanel() {
  const [, setLocation] = useLocation();
  const merchantId = localStorage.getItem("merchantId") || "";
  const storedSupervisorId = localStorage.getItem("supervisorUserId");
  const [supervisorUserId, setSupervisorUserId] = useState(storedSupervisorId || merchantId);
  const [supervisorIdReady, setSupervisorIdReady] = useState(!!storedSupervisorId);
  const userType = localStorage.getItem("userType");
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [takeoverDialogOpen, setTakeoverDialogOpen] = useState(false);
  const [sessionToTakeover, setSessionToTakeover] = useState<Session | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("supervisorSoundEnabled");
    return saved !== null ? saved === "true" : true;
  });
  const [isAlertActive, setIsAlertActive] = useState(false);
  
  useEffect(() => {
    if (userType === "supervisor" && !localStorage.getItem("supervisorUserId")) {
      fetch("/api/auth/me", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
          if (data.authenticated && data.userType === "supervisor" && data.userId) {
            localStorage.setItem("supervisorUserId", data.userId);
            setSupervisorUserId(data.userId);
          }
          setSupervisorIdReady(true);
        })
        .catch(() => {
          setSupervisorIdReady(true);
        });
    }
  }, [userType]);

  // Persist sound preference
  useEffect(() => {
    localStorage.setItem("supervisorSoundEnabled", String(soundEnabled));
  }, [soundEnabled]);
  const [currentPage, setCurrentPage] = useState<SupervisorPage>("overview");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousSessionsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  // Track message counts per session for notification sounds
  const sessionMessageCountsRef = useRef<Map<string, number>>(new Map());
  const lastProcessedMessageIdRef = useRef<string | null>(null);

  if (!merchantId || userType !== "supervisor") {
    return <Redirect to="/login" />;
  }

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/supervisor/notifications", supervisorUserId],
    enabled: supervisorIdReady,
    refetchInterval: 3000,
    // Primary supervisor auth-validating query: trigger session-expired flow
    // when the server rejects with 401, instead of polling forever silently.
    queryFn: getQueryFn({ on401: "redirect" }),
  });

  const { data: escalatedSessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/supervisor/sessions", supervisorUserId],
    enabled: supervisorIdReady,
    refetchInterval: 5000,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedSession],
    enabled: !!selectedSession,
    refetchInterval: 2000,
  });

  const { data: sessionReactions } = useQuery<Reaction[]>({
    queryKey: ["/api/reactions", selectedSession],
    enabled: !!selectedSession,
    refetchInterval: 3000,
  });

  const [localReactions, setLocalReactions] = useState<Reaction[]>([]);
  useEffect(() => {
    if (sessionReactions) setLocalReactions(sessionReactions);
  }, [sessionReactions]);

  const [selectedLogDate, setSelectedLogDate] = useState<Date | undefined>(undefined);
  const { data: chatLogs, isLoading: chatLogsLoading } = useQuery<ChatLog[]>({
    queryKey: ["/api/chat-logs", selectedLogDate?.toISOString()],
    enabled: currentPage === "chat-logs",
  });

  const { data: quickReplies, isLoading: quickRepliesLoading } = useQuery<any[]>({
    queryKey: ["/api/quick-replies"],
    enabled: currentPage === "quick-replies",
  });

  const { data: chatButtons, isLoading: chatButtonsLoading } = useQuery<any[]>({
    queryKey: ["/api/chat-buttons"],
    enabled: currentPage === "chat-buttons",
  });

  const { data: supervisors, isLoading: supervisorsLoading } = useQuery<any[]>({
    queryKey: ["/api/supervisors"],
    enabled: currentPage === "supervisors",
  });

  const { data: teamActivity, isLoading: teamActivityLoading } = useQuery<any>({
    queryKey: ["/api/team/activity"],
    enabled: currentPage === "team-activity",
  });

  const { data: liveVisitors, isLoading: visitorsLoading } = useQuery<Session[]>({
    queryKey: ["/api/supervisor/visitors", supervisorUserId],
    enabled: supervisorIdReady && currentPage === "live-visitors",
    refetchInterval: 5000,
  });

  const [proactiveChatMessage, setProactiveChatMessage] = useState("");
  const [proactiveChatSessionId, setProactiveChatSessionId] = useState<string | null>(null);

  const proactiveChatMutation = useMutation({
    mutationFn: async (data: { sessionId: string; message: string }) => {
      return apiRequest("POST", "/api/supervisor/proactive-chat", {
        sessionId: data.sessionId,
        supervisorId: supervisorUserId,
        message: data.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/visitors", supervisorUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/sessions", supervisorUserId] });
      setProactiveChatMessage("");
      setProactiveChatSessionId(null);
      toast({ title: "Message sent", description: "Proactive chat started. The visitor will see your message." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send proactive message", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/supervisor/send", {
        sessionId: selectedSession,
        message,
        supervisorId: supervisorUserId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedSession] });
      setNewMessage("");
    },
  });

  const takeOverMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", "/api/supervisor/takeover", {
        sessionId,
        supervisorId: supervisorUserId,
      });
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/sessions", supervisorUserId] });
      setSelectedSession(sessionId);
      setTakeoverDialogOpen(false);
      setSessionToTakeover(null);
      toast({
        title: "Session taken over",
        description: "You are now handling this conversation. The customer has been notified.",
      });
    },
  });

  const returnToBotMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", "/api/supervisor/return-to-bot", {
        sessionId,
        supervisorId: supervisorUserId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/sessions", supervisorUserId] });
      setSelectedSession(null);
      toast({
        title: "Returned to AI",
        description: "The conversation is now being handled by the AI assistant.",
      });
    },
  });

  const handleTakeoverClick = (session: Session) => {
    setSessionToTakeover(session);
    setTakeoverDialogOpen(true);
  };

  const confirmTakeover = () => {
    if (sessionToTakeover) {
      takeOverMutation.mutate(sessionToTakeover.id);
    }
  };

  const markSeenMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest("POST", `/api/supervisor/notifications/${notificationId}/seen`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/notifications", supervisorUserId] });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Track notifications to detect anger/trigger - play angry sound for anger or trigger
  const previousNotificationIdsRef = useRef<Set<string>>(new Set());
  const soundPlayedForSessionRef = useRef<Set<string>>(new Set()); // Track sessions we've played sounds for
  
  // Check for anger or trigger notifications and play angry sound
  useEffect(() => {
    if (!notifications || !soundEnabled) return;
    
    const currentNotificationIds = new Set(notifications.map((n) => n.id));
    const newNotifications = notifications.filter((n) => !previousNotificationIdsRef.current.has(n.id) && !n.seen);
    
    // Check for anger or trigger notifications - both should play angry sound
    for (const notification of newNotifications) {
      if (notification.message?.includes("anger detected") || notification.message?.includes("trigger detected")) {
        playAngrySound();
        // Mark this session so we don't play incoming sound for it
        if (notification.sessionId) {
          soundPlayedForSessionRef.current.add(notification.sessionId);
        }
        setIsAlertActive(true);
        setTimeout(() => setIsAlertActive(false), 3000);
        
        toast({
          title: notification.message?.includes("anger") ? "Angry customer alert!" : "Trigger word detected!",
          description: "A customer needs immediate attention.",
          duration: 10000,
        });
        break;
      }
    }
    
    previousNotificationIdsRef.current = currentNotificationIds;
  }, [notifications, soundEnabled, toast]);
  
  // Handle new sessions - play incoming chat sound for first message
  useEffect(() => {
    if (!escalatedSessions) return;
    
    const humanSessions = escalatedSessions.filter((s) => s.mode === "HUMAN");
    const currentSessionIds = new Set(humanSessions.map((s) => s.id));
    
    if (initialLoadRef.current) {
      previousSessionsRef.current = currentSessionIds;
      initialLoadRef.current = false;
      return;
    }
    
    const newSessions = humanSessions.filter((s) => !previousSessionsRef.current.has(s.id));
    
    if (newSessions.length > 0 && soundEnabled) {
      // Check if any new session hasn't already had a sound played (from anger/trigger)
      const sessionsNeedingSound = newSessions.filter(s => !soundPlayedForSessionRef.current.has(s.id));
      
      if (sessionsNeedingSound.length > 0) {
        // Play incoming chat sound for new sessions (first message)
        playIncomingChatSound();
        setIsAlertActive(true);
        
        sessionsNeedingSound.forEach((session) => {
          toast({
            title: "New chat alert!",
            description: `${session.customerName || "A customer"} started a conversation.`,
            duration: 10000,
          });
        });
        
        setTimeout(() => setIsAlertActive(false), 3000);
      }
    }
    
    previousSessionsRef.current = currentSessionIds;
  }, [escalatedSessions, soundEnabled, toast]);

  // Track messages for notification sounds in selected session
  // Only play chat reply sound for incoming customer messages
  useEffect(() => {
    if (!messages || messages.length === 0 || !selectedSession || !soundEnabled) return;
    
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.id || lastProcessedMessageIdRef.current === lastMessage.id) return;
    
    const prevCount = sessionMessageCountsRef.current.get(selectedSession) || 0;
    const currentCount = messages.length;
    
    if (currentCount > prevCount && prevCount > 0 && lastMessage.from === "user") {
      playChatReplySound({ from: "Customer", content: lastMessage.content || "" });
    }
    
    sessionMessageCountsRef.current.set(selectedSession, currentCount);
    lastProcessedMessageIdRef.current = lastMessage.id;
  }, [messages, selectedSession, soundEnabled]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = () => {
    queryClient.clear();
    localStorage.removeItem("merchantId");
    localStorage.removeItem("userType");
    localStorage.removeItem("supervisorUserId");
    setLocation("/");
  };

  const unseenNotifications = notifications?.filter((n) => !n.seen) || [];
  const selectedSessionData = escalatedSessions?.find((s) => s.id === selectedSession);
  const escalatedCount = escalatedSessions?.filter((s) => s.mode === "HUMAN").length || 0;

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const renderContent = () => {
    switch (currentPage) {
      case "overview":
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6" />
                Overview
              </h1>
              <p className="text-muted-foreground">Welcome to the Supervisor Panel</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover-elevate cursor-pointer" onClick={() => setCurrentPage("chat-sessions")} data-testid="card-escalations">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Active Escalations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-escalation-count">{escalatedCount}</div>
                  <p className="text-sm text-muted-foreground">Chats needing attention</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate cursor-pointer" onClick={() => setCurrentPage("notifications")} data-testid="card-notifications">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Unread Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="text-notification-count">{unseenNotifications.length}</div>
                  <p className="text-sm text-muted-foreground">Pending alerts</p>
                </CardContent>
              </Card>
              <Card data-testid="card-status">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                    <span className="text-lg font-medium" data-testid="text-status">Online</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Ready to assist</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "chat-sessions":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 flex-1 h-[calc(100vh-80px)] lg:h-screen overflow-hidden">
            <Card className="lg:col-span-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-status-away" />
                  Escalated Chats
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-4 pb-4">
                  {sessionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : escalatedSessions && escalatedSessions.filter((s) => s.mode === "HUMAN").length > 0 ? (
                    <div className="space-y-3">
                      {escalatedSessions
                        .filter((s) => s.mode === "HUMAN")
                        .map((session) => (
                          <div
                            key={session.id}
                            className={`p-3 rounded-lg transition-colors ${
                              selectedSession === session.id
                                ? "bg-primary/10 border border-primary/20"
                                : "bg-muted/50 hover-elevate"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className={`${getCustomerAvatarColor(session.customerName || "Customer")} text-white text-xs font-semibold`}>
                                    {getCustomerInitials(session.customerName || "Customer")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-sm font-medium">{session.customerName || "Customer"}</p>
                                    {session.limitFallback && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"
                                        data-testid={`badge-limit-fallback-${session.id}`}
                                      >
                                        Limit
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {session.id.slice(0, 12)}...
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={selectedSession === session.id ? "secondary" : "default"}
                                onClick={() => setSelectedSession(session.id)}
                                className="flex-1"
                                data-testid={`button-view-session-${session.id}`}
                              >
                                {selectedSession === session.id ? "Viewing" : "View Chat"}
                              </Button>
                              {!session.supervisorId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTakeoverClick(session)}
                                  disabled={takeOverMutation.isPending}
                                  data-testid={`button-takeover-${session.id}`}
                                >
                                  <Hand className="w-3 h-3 mr-1" />
                                  Take Over
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 mx-auto text-status-online/50 mb-3" />
                      <p className="text-muted-foreground">No escalated chats</p>
                      <p className="text-sm text-muted-foreground">
                        All conversations are being handled by AI
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 flex flex-col">
              {selectedSession ? (
                <>
                  <CardHeader className="border-b pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={`${getCustomerAvatarColor(selectedSessionData?.customerName || "Customer")} text-white text-sm font-semibold`}>
                            {getCustomerInitials(selectedSessionData?.customerName || "Customer")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {selectedSessionData?.customerName || "Customer"}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <p className="text-xs text-muted-foreground font-mono">
                              Session: {selectedSession.slice(0, 20)}...
                            </p>
                            {selectedSessionData && (
                              selectedSessionData.limitFallback ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10"
                                  data-testid="badge-escalation-reason-limit"
                                >
                                  Escalated: Conversation Limit
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 h-4 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                                  data-testid="badge-escalation-reason-manual"
                                >
                                  Escalated: Manual
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => returnToBotMutation.mutate(selectedSession)}
                          disabled={returnToBotMutation.isPending}
                          data-testid="button-return-to-bot"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Return to Bot
                        </Button>
                        <Badge variant="default">
                          <HeadphonesIcon className="w-3 h-3 mr-1" />
                          You're handling this
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                    <ScrollArea className="flex-1 p-4">
                      {messagesLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-3/4" />
                          ))}
                        </div>
                      ) : messages && messages.length > 0 ? (
                        <div className="space-y-4">
                          {messages.map((msg, index) => {
                            const isCustomer = msg.from === "user";
                            const isLastCustomerMsg = isCustomer && index === messages.length - 1;
                            const msgReactions = localReactions.filter((r) => r.messageId === msg.id);
                            return (
                            <div
                              key={msg.id || index}
                              className={`group flex gap-3 ${isCustomer ? "justify-end" : "justify-start"}`}
                            >
                              {!isCustomer && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  {msg.from === "chatvice" ? (
                                    <Bot className="w-4 h-4 text-primary" />
                                  ) : (
                                    <HeadphonesIcon className="w-4 h-4 text-primary" />
                                  )}
                                </div>
                              )}
                              <div className="max-w-[70%]">
                                <div
                                  className={`p-3 ${
                                    isCustomer
                                      ? "bg-muted rounded-2xl rounded-br-sm"
                                      : msg.from === "supervisor"
                                      ? "bg-primary text-primary-foreground rounded-2xl rounded-bl-sm"
                                      : "bg-muted rounded-2xl rounded-bl-sm"
                                  } ${isLastCustomerMsg && msgReactions.length === 0 ? "ring-1 ring-primary/30 shadow-[0_0_8px_rgba(99,102,241,0.3)]" : ""}`}
                                >
                                  <p className="text-sm whitespace-pre-wrap">{renderMessageWithLinks(msg.content)}</p>
                                  <div
                                    className={`flex items-center gap-1 mt-1 ${
                                      msg.from === "supervisor" ? "text-primary-foreground/70" : "text-muted-foreground"
                                    }`}
                                  >
                                    <span className="text-xs">
                                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                                    </span>
                                    {msg.from === "supervisor" && msg.payload && typeof msg.payload === "object" && (msg.payload as Record<string, unknown>).source === "telegram" && (
                                      <span className="flex items-center gap-0.5 text-xs opacity-80" data-testid={`badge-telegram-source-${msg.id}`}>
                                        <SiTelegram className="w-3 h-3" />
                                        via Telegram
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {msg.id && (
                                  <MessageReactions
                                    messageId={msg.id}
                                    sessionId={selectedSession!}
                                    reactions={msgReactions}
                                    reactedBy={supervisorUserId || "supervisor"}
                                    reactedByRole="supervisor"
                                    isOwnMessage={msg.from === "supervisor"}
                                    showHint={isLastCustomerMsg && msgReactions.length === 0}
                                    onReactionsChange={(updated) => {
                                      setLocalReactions((prev) => [
                                        ...prev.filter((r) => r.messageId !== msg.id),
                                        ...updated,
                                      ]);
                                    }}
                                  />
                                )}
                              </div>
                              {isCustomer && (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <User className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                          );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                          <p className="text-muted-foreground">No messages yet</p>
                        </div>
                      )}
                    </ScrollArea>
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          data-testid="input-supervisor-message"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={sendMessageMutation.isPending || !newMessage.trim()}
                          data-testid="button-send-supervisor-message"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <HeadphonesIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">Select a chat</p>
                    <p className="text-sm text-muted-foreground">
                      Choose an escalated conversation to start helping
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        );

      case "live-visitors":
        return (
          <div className="flex-1 p-6 overflow-auto">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
                  Live Visitors
                </h1>
                <p className="text-sm text-muted-foreground">
                  Website visitors currently browsing. Start a conversation before they do.
                </p>
              </div>

              {visitorsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : liveVisitors && liveVisitors.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    // Count how many times each customerName (IP) appears to detect same-IP / different-device cases
                    const nameCount: Record<string, number> = {};
                    const nameIndex: Record<string, number> = {};
                    for (const v of liveVisitors) {
                      const name = v.customerName || "Unknown";
                      nameCount[name] = (nameCount[name] || 0) + 1;
                    }
                    return liveVisitors.map((visitor) => {
                      const arrivalTime = visitor.createdAt ? new Date(visitor.createdAt) : new Date();
                      const minutesAgo = Math.floor((Date.now() - arrivalTime.getTime()) / 60000);
                      const timeLabel = minutesAgo < 1 ? "Just now" : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;
                      const cc = (visitor.countryCode || "").toLowerCase();
                      const baseName = visitor.customerName || "Unknown";
                      let displayName = baseName;
                      if (nameCount[baseName] > 1) {
                        nameIndex[baseName] = (nameIndex[baseName] || 0) + 1;
                        displayName = `${baseName} #${nameIndex[baseName]}`;
                      }

                    return (
                      <Card key={visitor.id} data-testid={`card-visitor-${visitor.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                {cc ? (
                                  <img
                                    src={`https://flagcdn.com/16x12/${cc}.png`}
                                    alt={visitor.countryName || cc}
                                    className="w-4 h-3"
                                  />
                                ) : (
                                  <Globe className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                                  <span data-testid={`text-visitor-name-${visitor.id}`}>{displayName}</span>
                                  {(visitor.cityName || visitor.countryName) && (
                                    <Badge variant="outline" className="text-xs">
                                      {[visitor.cityName, visitor.countryName].filter(Boolean).join(", ")}
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground truncate" data-testid={`text-visitor-page-${visitor.id}`}>
                                  {visitor.pageUrl || "Unknown page"}
                                </p>
                                {visitor.userAgent && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <DeviceIcon userAgent={visitor.userAgent} />
                                    <OsIcon userAgent={visitor.userAgent} />
                                    <BrowserIcon userAgent={visitor.userAgent} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {timeLabel}
                              </span>
                              {proactiveChatSessionId === visitor.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    placeholder="Type your message..."
                                    value={proactiveChatMessage}
                                    onChange={(e) => setProactiveChatMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && proactiveChatMessage.trim()) {
                                        proactiveChatMutation.mutate({ sessionId: visitor.id, message: proactiveChatMessage.trim() });
                                      }
                                    }}
                                    className="w-48"
                                    data-testid={`input-proactive-message-${visitor.id}`}
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (proactiveChatMessage.trim()) {
                                        proactiveChatMutation.mutate({ sessionId: visitor.id, message: proactiveChatMessage.trim() });
                                      }
                                    }}
                                    disabled={proactiveChatMutation.isPending || !proactiveChatMessage.trim()}
                                    data-testid={`button-send-proactive-${visitor.id}`}
                                  >
                                    <Send className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => { setProactiveChatSessionId(null); setProactiveChatMessage(""); }}
                                    data-testid={`button-cancel-proactive-${visitor.id}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => setProactiveChatSessionId(visitor.id)}
                                  data-testid={`button-chat-visitor-${visitor.id}`}
                                >
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Chat
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                  })()}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No live visitors</p>
                  <p className="text-sm text-muted-foreground">
                    Visitors will appear here when they browse your website with the chat widget installed.
                    Make sure "Live Visitor Tracking" is enabled in merchant settings.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "chat-logs":
        return (
          <div className="flex-1 p-6 overflow-auto">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    Chat Logs
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Archived conversation history
                  </p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !selectedLogDate && "text-muted-foreground"
                      )}
                      data-testid="button-date-picker"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedLogDate ? format(selectedLogDate, "PPP") : "Filter by date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedLogDate}
                      onSelect={setSelectedLogDate}
                      initialFocus
                    />
                    {selectedLogDate && (
                      <div className="p-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedLogDate(undefined)}
                          data-testid="button-clear-date"
                        >
                          Clear filter
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Archived Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                  {chatLogsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : chatLogs && chatLogs.length > 0 ? (
                    <ScrollArea className="h-[calc(100vh-300px)]">
                      <div className="space-y-3 pr-4">
                        {chatLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-4 rounded-lg border bg-card"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{log.customerName || "Customer"}</span>
                              </div>
                              <Badge variant="secondary">
                                {log.messageCount || 0} messages
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {log.clearedAt ? format(new Date(log.clearedAt), "MMM d, yyyy") : "N/A"}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/chat-logs/${log.id}/download`, {
                                    credentials: 'include',
                                  });
                                  if (!response.ok) throw new Error('Download failed');
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `chat-log-${log.id}.txt`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(url);
                                } catch (error) {
                                  console.error('Download failed:', error);
                                }
                              }}
                              data-testid={`button-download-log-${log.id}`}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No chat logs found</p>
                      <p className="text-sm text-muted-foreground">
                        Archived conversations will appear here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "quick-replies":
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Reply className="w-6 h-6" />
                Quick Replies
              </h1>
              <p className="text-muted-foreground">Pre-defined response templates (Read-only)</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Available Quick Replies</CardTitle>
                <CardDescription>Quick replies configured by your merchant</CardDescription>
              </CardHeader>
              <CardContent>
                {quickRepliesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : quickReplies && quickReplies.length > 0 ? (
                  <div className="space-y-3">
                    {quickReplies.map((reply: any) => (
                      <div key={reply.id} className="p-4 rounded-lg border bg-card" data-testid={`card-quick-reply-${reply.id}`}>
                        <p className="font-medium" data-testid={`text-quick-reply-title-${reply.id}`}>{reply.title || reply.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">{reply.content || reply.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Reply className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No quick replies configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "chat-buttons":
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MousePointer2 className="w-6 h-6" />
                Chat Buttons
              </h1>
              <p className="text-muted-foreground">Interactive button options (Read-only)</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Available Chat Buttons</CardTitle>
                <CardDescription>Buttons configured for the chat widget</CardDescription>
              </CardHeader>
              <CardContent>
                {chatButtonsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : chatButtons && chatButtons.length > 0 ? (
                  <div className="space-y-3">
                    {chatButtons.map((button: any) => (
                      <div key={button.id} className="p-4 rounded-lg border bg-card" data-testid={`card-chat-button-${button.id}`}>
                        <p className="font-medium" data-testid={`text-chat-button-label-${button.id}`}>{button.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">{button.action || button.url || "No action defined"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MousePointer2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No chat buttons configured</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "live-preview":
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Eye className="w-6 h-6" />
                Live Preview
              </h1>
              <p className="text-muted-foreground">View the chat widget as customers see it</p>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Widget Preview</p>
                  <p className="text-sm text-muted-foreground">
                    Open your merchant's website to see the live widget
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "supervisors":
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Supervisors
              </h1>
              <p className="text-muted-foreground">Team member list (Read-only)</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Other supervisors in your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {supervisorsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : supervisors && supervisors.length > 0 ? (
                  <div className="space-y-3">
                    {supervisors.map((supervisor: any) => (
                      <div key={supervisor.id} className="p-4 rounded-lg border bg-card flex items-center gap-4" data-testid={`card-supervisor-${supervisor.id}`}>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-supervisor-name-${supervisor.id}`}>{supervisor.name || supervisor.email}</p>
                          <p className="text-sm text-muted-foreground">{supervisor.role || "Supervisor"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No other supervisors found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "team-activity":
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="w-6 h-6" />
                Team Activity
              </h1>
              <p className="text-muted-foreground">Recent team activity and performance</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Recent actions by team members</CardDescription>
              </CardHeader>
              <CardContent>
                {teamActivityLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : teamActivity && teamActivity.length > 0 ? (
                  <div className="space-y-3">
                    {(Array.isArray(teamActivity) ? teamActivity : []).map((activity: any, index: number) => (
                      <div key={activity.id || index} className="p-4 rounded-lg border bg-card">
                        <p className="font-medium">{activity.action || activity.description}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.timestamp ? format(new Date(activity.timestamp), "PPp") : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Notifications
              </h1>
              <p className="text-muted-foreground">Your alerts and notifications</p>
            </div>
            <TelegramLinkingCard />
            <Card>
              <CardHeader>
                <CardTitle>All Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {notificationsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : notifications && notifications.length > 0 ? (
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-3 pr-4">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 rounded-lg border ${!notification.seen ? "bg-primary/5 border-primary/20" : "bg-card"}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">Notification</p>
                            {!notification.seen && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markSeenMutation.mutate(notification.id.toString())}
                                data-testid={`button-mark-seen-${notification.id}`}
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {notification.timestamp ? format(new Date(notification.timestamp), "PPp") : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No notifications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <SupervisorSidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          escalatedCount={escalatedCount}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          isAlertActive={isAlertActive}
          unseenNotifications={unseenNotifications}
          handleLogout={handleLogout}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background">
            <SidebarTrigger data-testid="button-supervisor-sidebar-toggle" />
            <h1 className="text-lg font-semibold">
              {supervisorMenuItems.find(item => item.id === currentPage)?.title || "Supervisor"}
            </h1>
            <div className="w-9" />
          </header>
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>

      <AlertDialog open={takeoverDialogOpen} onOpenChange={setTakeoverDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Hand className="w-5 h-5 text-primary" />
              Take Over Conversation?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to take over the conversation with{" "}
                <span className="font-medium text-foreground">
                  {sessionToTakeover?.customerName || "this customer"}
                </span>.
              </p>
              <p>
                This will:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Notify the customer that a human agent is joining</li>
                <li>Assign this conversation to you</li>
                <li>Disable AI responses for this session</li>
              </ul>
              <p className="text-muted-foreground">
                You can send messages directly to the customer once you take over.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-takeover">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmTakeover}
              disabled={takeOverMutation.isPending}
              data-testid="button-confirm-takeover"
            >
              {takeOverMutation.isPending ? "Taking over..." : "Yes, Take Over"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
