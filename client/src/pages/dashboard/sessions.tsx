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
import { 
  MessageSquare, Bot, HeadphonesIcon, Send, Search, User, Download, 
  Hand, ArrowLeft, Clock, Edit, Check, X, Loader2, RefreshCw, AlertCircle,
  CheckCircle2, Circle, XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Session, Message, Supervisor } from "@shared/schema";

type SessionStatus = "needs_response" | "angry" | "active" | "ended";

function StatusDot({ status }: { status: SessionStatus }) {
  switch (status) {
    case "needs_response":
      return (
        <span className="relative flex h-2.5 w-2.5" title="Needs Response">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      );
    case "angry":
      return (
        <span className="relative flex h-2.5 w-2.5 items-center justify-center" title="Angry Customer">
          <AlertCircle className="h-3 w-3 text-yellow-500 fill-yellow-500" />
        </span>
      );
    case "active":
      return (
        <span className="relative flex h-2.5 w-2.5" title="Active">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
      );
    case "ended":
      return (
        <span className="relative flex h-2.5 w-2.5" title="Ended">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
        </span>
      );
    default:
      return null;
  }
}

function HandlerAvatar({ mode, supervisorPhoto, agentPhoto }: { 
  mode: "AI" | "HUMAN";
  supervisorPhoto?: string | null;
  agentPhoto?: string | null;
}) {
  if (mode === "HUMAN") {
    return (
      <Avatar className="h-8 w-8 border-2 border-primary/20">
        {supervisorPhoto ? (
          <AvatarImage src={supervisorPhoto} alt="Supervisor" />
        ) : null}
        <AvatarFallback className="bg-primary/10">
          <HeadphonesIcon className="h-4 w-4 text-primary" />
        </AvatarFallback>
      </Avatar>
    );
  }
  
  return (
    <Avatar className="h-8 w-8 border-2 border-secondary/20">
      {agentPhoto ? (
        <AvatarImage src={agentPhoto} alt="AI Agent" />
      ) : null}
      <AvatarFallback className="bg-secondary">
        <Bot className="h-4 w-4 text-secondary-foreground" />
      </AvatarFallback>
    </Avatar>
  );
}

interface SessionWithPreview extends Session {
  lastMessage?: string;
  lastQuestion?: string;
  supervisorId?: string | null;
}

export default function SessionsPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [revisedAnswer, setRevisedAnswer] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
    if (session.status === "ended" || session.status === "closed") {
      return "ended";
    }
    
    if (session.mode === "HUMAN") {
      return "active";
    }
    
    const angerIndicators = ["marah", "kesal", "kecewa", "angry", "frustrated", "upset", "terrible", "worst", "hate", "bodoh", "goblok", "!!!"];
    const lastQuestion = session.lastQuestion?.toLowerCase() || "";
    const isAngry = angerIndicators.some(indicator => lastQuestion.includes(indicator));
    if (isAngry) {
      return "angry";
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

  const filteredSessions = sessions?.filter((session) =>
    session.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  const agentPhoto = merchant?.widgetSettings?.agentPhotoUrl;

  const statusCounts = {
    needsResponse: sortedSessions?.filter(s => getSessionStatus(s) === "needs_response").length || 0,
    angry: sortedSessions?.filter(s => getSessionStatus(s) === "angry").length || 0,
    active: sortedSessions?.filter(s => getSessionStatus(s) === "active").length || 0,
    ended: sortedSessions?.filter(s => getSessionStatus(s) === "ended").length || 0,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex-shrink-0 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="text-page-title">
              Chat Sessions
              {(statusCounts.needsResponse > 0 || statusCounts.angry > 0) && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">View and manage customer conversations</p>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50" title="Needs Response">
              <StatusDot status="needs_response" />
              <span data-testid="text-count-needs-response">{statusCounts.needsResponse}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50" title="Angry">
              <StatusDot status="angry" />
              <span data-testid="text-count-angry">{statusCounts.angry}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50" title="Active">
              <StatusDot status="active" />
              <span data-testid="text-count-active">{statusCounts.active}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50" title="Ended">
              <StatusDot status="ended" />
              <span data-testid="text-count-ended">{statusCounts.ended}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col min-h-0">
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0 py-3 px-4">
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
                  ) : sortedSessions && sortedSessions.length > 0 ? (
                    sortedSessions.map((session) => {
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
                              <HandlerAvatar 
                                mode={session.mode as "AI" | "HUMAN"} 
                                agentPhoto={agentPhoto}
                              />
                              <div className="absolute -bottom-0.5 -right-0.5">
                                <StatusDot status={status} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium truncate">
                                  {session.customerName || "Customer"}
                                </span>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {session.lastActivity 
                                    ? formatDistanceToNow(new Date(session.lastActivity), { addSuffix: false })
                                    : ""}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                <span className="text-foreground/70">Q:</span> {session.lastQuestion || "No messages yet"}
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

        <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0">
          <Card className="flex flex-col h-full">
            {selectedSession ? (
              <>
                <CardHeader className="flex-shrink-0 border-b py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <HandlerAvatar 
                        mode={selectedSessionData?.mode as "AI" | "HUMAN"} 
                        agentPhoto={agentPhoto}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base truncate" data-testid="text-selected-customer">
                            {selectedSessionData?.customerName || "Customer"}
                          </CardTitle>
                          <Badge 
                            variant={selectedSessionData?.mode === "AI" ? "secondary" : "default"}
                            className="h-5 text-[10px]"
                          >
                            {selectedSessionData?.mode === "AI" ? "AI" : "Human"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono truncate max-w-[120px]">
                            {selectedSession.slice(0, 12)}...
                          </span>
                          {selectedSessionData?.lastActivity && (
                            <>
                              <span className="text-muted-foreground/50">|</span>
                              <Clock className="w-3 h-3" />
                              <span>
                                {formatDistanceToNow(new Date(selectedSessionData.lastActivity), { addSuffix: true })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => refetchMessages()}
                        title="Refresh"
                        className="h-8 w-8"
                        data-testid="button-refresh-messages"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      {selectedSessionData?.mode === "AI" ? (
                        <Button
                          size="sm"
                          onClick={() => takeoverMutation.mutate(selectedSession)}
                          disabled={takeoverMutation.isPending}
                          className="h-8"
                          data-testid="button-takeover-session"
                        >
                          <Hand className="w-4 h-4 mr-1.5" />
                          Take Over
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => returnToBotMutation.mutate(selectedSession)}
                          disabled={returnToBotMutation.isPending}
                          className="h-8"
                          data-testid="button-return-to-bot"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1.5" />
                          Return to Bot
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleExportTranscript}
                        title="Export"
                        className="h-8 w-8"
                        data-testid="button-export-transcript"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
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
                          {messages.map((msg, index) => (
                            <div
                              key={msg.id || index}
                              className={`flex gap-2.5 ${msg.from === "user" ? "justify-end" : "justify-start"} group`}
                            >
                              {msg.from !== "user" && (
                                <Avatar className="h-7 w-7 flex-shrink-0">
                                  {msg.from === "jeany" && agentPhoto ? (
                                    <AvatarImage src={agentPhoto} alt="AI" />
                                  ) : null}
                                  <AvatarFallback className="text-xs">
                                    {msg.from === "jeany" ? (
                                      <Bot className="h-3.5 w-3.5" />
                                    ) : (
                                      <HeadphonesIcon className="h-3.5 w-3.5" />
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className="relative max-w-[75%]">
                                <div
                                  className={`p-2.5 ${
                                    msg.from === "user"
                                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                                      : "bg-muted rounded-2xl rounded-bl-sm"
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                  <p className={`text-[10px] mt-1 ${msg.from === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                  </p>
                                </div>
                                {msg.from === "jeany" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute -right-9 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                                    onClick={() => handleReviseAnswer(msg)}
                                    title="Revise"
                                    data-testid={`button-revise-${msg.id}`}
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                              {msg.from === "user" && (
                                <Avatar className="h-7 w-7 flex-shrink-0">
                                  <AvatarFallback className="bg-muted text-xs">
                                    <User className="h-3.5 w-3.5" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
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
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className="h-9"
                          data-testid="input-send-message"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={sendMessageMutation.isPending || !newMessage.trim()}
                          className="h-9"
                          data-testid="button-send-message"
                        >
                          <Send className="w-4 h-4" />
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
