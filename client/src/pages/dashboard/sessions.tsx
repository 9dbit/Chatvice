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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  MessageSquare, Bot, HeadphonesIcon, Send, Search, User, Download, Users, 
  Hand, ArrowLeft, Clock, Edit, Check, X, Loader2, RefreshCw, HelpCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Session, Message, Supervisor } from "@shared/schema";

function BlinkingDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
    </span>
  );
}

interface SessionWithPreview extends Session {
  lastMessage?: string;
  lastQuestion?: string;
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

  const filteredSessions = sessions?.filter((session) =>
    session.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedSessions = filteredSessions?.sort((a, b) => {
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

  const activeSessions = sessions?.filter((s) => s.mode === "HUMAN") || [];
  const aiSessions = sessions?.filter((s) => s.mode === "AI") || [];
  const escalatedCount = activeSessions.length;

  const getSessionPreview = (sessionId: string) => {
    if (sessionId === selectedSession && messages) {
      const userMessages = messages.filter(m => m.from === "user");
      const aiMessages = messages.filter(m => m.from === "jeany");
      const lastQuestion = userMessages[userMessages.length - 1]?.content;
      const lastAnswer = aiMessages[aiMessages.length - 1]?.content;
      return { lastQuestion, lastAnswer };
    }
    return { lastQuestion: undefined, lastAnswer: undefined };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Chat Sessions
            {escalatedCount > 0 && <BlinkingDot />}
          </h1>
          <p className="text-muted-foreground">View and manage customer conversations.</p>
        </div>
        {supervisors && supervisors.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50 border">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{supervisors.length} Supervisor{supervisors.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground">
                {activeSessions.length} escalated, {aiSessions.length} AI-handled
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-sessions"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-4 pb-4">
              {sessionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : sortedSessions && sortedSessions.length > 0 ? (
                <div className="space-y-2">
                  {sortedSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors hover-elevate ${
                        selectedSession === session.id
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50"
                      }`}
                      data-testid={`button-session-${session.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {session.customerName || "Customer"}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {session.lastActivity 
                                ? formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })
                                : "No activity"
                              }
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={session.mode === "AI" ? "secondary" : "default"}
                          className="shrink-0"
                        >
                          {session.mode === "AI" ? (
                            <Bot className="w-3 h-3" />
                          ) : (
                            <HeadphonesIcon className="w-3 h-3" />
                          )}
                        </Badge>
                      </div>
                      {session.lastMessage && (
                        <div className="pl-10 space-y-1">
                          <div className="flex items-start gap-1.5">
                            <HelpCircle className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {session.lastQuestion || "..."}
                            </p>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <Bot className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {session.lastMessage}
                            </p>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No sessions found</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
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
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground font-mono">
                          {selectedSession.slice(0, 20)}...
                        </p>
                        {selectedSessionData?.lastActivity && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(new Date(selectedSessionData.lastActivity), { addSuffix: true })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => refetchMessages()}
                      title="Refresh messages"
                      data-testid="button-refresh-messages"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    {selectedSessionData?.mode === "AI" ? (
                      <Button
                        size="sm"
                        onClick={() => takeoverMutation.mutate(selectedSession)}
                        disabled={takeoverMutation.isPending}
                        data-testid="button-takeover-session"
                      >
                        <Hand className="w-4 h-4 mr-1" />
                        Take Over
                      </Button>
                    ) : (
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
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleExportTranscript}
                      title="Export transcript"
                      data-testid="button-export-transcript"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Badge variant={selectedSessionData?.mode === "AI" ? "secondary" : "default"}>
                      {selectedSessionData?.mode === "AI" ? (
                        <>
                          <Bot className="w-3 h-3 mr-1" />
                          AI Mode
                        </>
                      ) : (
                        <>
                          <HeadphonesIcon className="w-3 h-3 mr-1" />
                          Human Mode
                        </>
                      )}
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
                          className={`flex gap-3 ${msg.from === "user" ? "justify-end" : "justify-start"} group`}
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
                          <div className="relative">
                            <div
                              className={`max-w-[70%] p-3 ${
                                msg.from === "user"
                                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                                  : "bg-muted rounded-2xl rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-xs mt-1 ${msg.from === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                              </p>
                            </div>
                            {msg.from === "jeany" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                onClick={() => handleReviseAnswer(msg)}
                                title="Revise answer"
                                data-testid={`button-revise-${msg.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
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
                {selectedSessionData?.mode === "HUMAN" && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        data-testid="input-send-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendMessageMutation.isPending || !newMessage.trim()}
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
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Select a session</p>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <Dialog open={reviseDialogOpen} onOpenChange={setReviseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Revise AI Answer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-2">Original answer:</p>
              <p className="text-sm">{selectedMessage?.content}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">New answer:</p>
              <Textarea
                value={revisedAnswer}
                onChange={(e) => setRevisedAnswer(e.target.value)}
                placeholder="Enter the revised answer..."
                className="min-h-[150px]"
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
