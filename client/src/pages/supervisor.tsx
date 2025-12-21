import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Redirect } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
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
  X,
} from "lucide-react";
import type { Session, Message, Notification, ChatLog } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Download } from "lucide-react";

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

export default function SupervisorPanel() {
  const [, setLocation] = useLocation();
  const merchantId = localStorage.getItem("merchantId") || "";
  const userType = localStorage.getItem("userType");
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [takeoverDialogOpen, setTakeoverDialogOpen] = useState(false);
  const [sessionToTakeover, setSessionToTakeover] = useState<Session | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [currentPage, setCurrentPage] = useState<"chat-sessions" | "chat-logs">("chat-sessions");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousSessionsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  if (!merchantId || userType !== "supervisor") {
    return <Redirect to="/login" />;
  }

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/supervisor/notifications", merchantId],
    refetchInterval: 3000,
  });

  const { data: escalatedSessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/supervisor/sessions", merchantId],
    refetchInterval: 5000,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedSession],
    enabled: !!selectedSession,
    refetchInterval: 2000,
  });

  const [selectedLogDate, setSelectedLogDate] = useState<Date | undefined>(undefined);
  const { data: chatLogs, isLoading: chatLogsLoading } = useQuery<ChatLog[]>({
    queryKey: ["/api/chat-logs", selectedLogDate?.toISOString()],
    enabled: currentPage === "chat-logs",
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/supervisor/send", {
        sessionId: selectedSession,
        message,
        supervisorId: merchantId,
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
        supervisorId: merchantId,
      });
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/sessions", merchantId] });
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
        supervisorId: merchantId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/sessions", merchantId] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/supervisor/notifications", merchantId] });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
      playAlertSound();
      setIsAlertActive(true);
      
      newSessions.forEach((session) => {
        toast({
          title: "New escalation alert!",
          description: `${session.customerName || "A customer"} needs human assistance.`,
          duration: 10000,
        });
      });
      
      setTimeout(() => setIsAlertActive(false), 3000);
    }
    
    previousSessionsRef.current = currentSessionIds;
  }, [escalatedSessions, soundEnabled, toast]);

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
    localStorage.removeItem("merchantId");
    localStorage.removeItem("userType");
    setLocation("/");
  };

  const unseenNotifications = notifications?.filter((n) => !n.seen) || [];
  const selectedSessionData = escalatedSessions?.find((s) => s.id === selectedSession);
  const escalatedCount = escalatedSessions?.filter((s) => s.mode === "HUMAN").length || 0;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <HeadphonesIcon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-sidebar-foreground">Supervisor</h1>
                <p className="text-xs text-sidebar-foreground/60">Panel</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Sidebar Menu */}
          <div className="flex-1 p-4 space-y-2">
            {/* Chat Sessions - Primary button with escalation indicator */}
            <button
              onClick={() => setCurrentPage("chat-sessions")}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === "chat-sessions"
                  ? "bg-primary text-primary-foreground"
                  : "bg-sidebar-accent/50 text-sidebar-foreground hover-elevate"
              }`}
              data-testid="button-supervisor-chat-sessions"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">Chat Sessions</span>
              </div>
              {escalatedCount > 0 && (
                <span className={`min-w-[24px] h-6 px-2 rounded-full text-sm font-medium flex items-center justify-center ${
                  currentPage === "chat-sessions" 
                    ? "bg-white/20 text-white" 
                    : "bg-destructive text-destructive-foreground"
                }`}>
                  {escalatedCount}
                </span>
              )}
            </button>

            {/* Chat Logs */}
            <button
              onClick={() => setCurrentPage("chat-logs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === "chat-logs"
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover-elevate"
              }`}
              data-testid="button-supervisor-chat-logs"
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Chat Logs</span>
            </button>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-sidebar-border">
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
                <div className="relative">
                  <Button variant="ghost" size="icon" data-testid="button-notifications">
                    {isAlertActive ? (
                      <BellRing className="w-5 h-5 text-status-away animate-pulse" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                    {unseenNotifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                        {unseenNotifications.length}
                      </span>
                    )}
                  </Button>
                </div>
                <ThemeToggle />
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-background">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-open-sidebar"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">{currentPage === "chat-sessions" ? "Chat Sessions" : "Chat Logs"}</h1>
          <div className="w-9" /> {/* Spacer */}
        </header>

        {currentPage === "chat-sessions" ? (
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
              ) : escalatedSessions && escalatedSessions.length > 0 ? (
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
                            <div className="w-8 h-8 rounded-full bg-status-away/20 flex items-center justify-center">
                              <User className="w-4 h-4 text-status-away" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{session.customerName || "Customer"}</p>
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
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedSessionData?.customerName || "Customer"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">
                        Session: {selectedSession.slice(0, 20)}...
                      </p>
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
                      {messages.map((msg, index) => (
                        <div
                          key={msg.id || index}
                          className={`flex gap-3 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.from !== "user" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              {msg.from === "chatvice" ? (
                                <Bot className="w-4 h-4 text-primary" />
                              ) : (
                                <HeadphonesIcon className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          )}
                          <div
                            className={`max-w-[70%] p-3 ${
                              msg.from === "user"
                                ? "bg-muted rounded-2xl rounded-br-sm"
                                : msg.from === "supervisor"
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-bl-sm"
                                : "bg-muted rounded-2xl rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                msg.from === "supervisor" ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                            </p>
                          </div>
                          {msg.from === "user" && (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      ))}
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
        ) : (
        /* Chat Logs View */
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
        )}
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
    </div>
  );
}
