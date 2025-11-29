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
} from "lucide-react";
import type { Session, Message, Notification } from "@shared/schema";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <HeadphonesIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold">Supervisor Panel</h1>
            <p className="text-xs text-muted-foreground">Handle escalated conversations</p>
          </div>
        </div>
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
          <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 h-[calc(100vh-80px)]">
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
                  <Badge variant="default">
                    <HeadphonesIcon className="w-3 h-3 mr-1" />
                    You're handling this
                  </Badge>
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
                              {msg.from === "jeany" ? (
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
