import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Bot, HeadphonesIcon, Send, Search, User, Download, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Session, Message, Supervisor } from "@shared/schema";

export default function SessionsPage() {
  const merchantId = localStorage.getItem("merchantId") || "";
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: sessions, isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions", merchantId],
    enabled: !!merchantId,
    refetchInterval: 5000,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const filteredSessions = sessions?.filter((session) =>
    session.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Chat Sessions</h1>
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
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredSessions && filteredSessions.length > 0 ? (
                <div className="space-y-2">
                  {filteredSessions.map((session) => (
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {session.customerName || "Customer"}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {session.id.slice(0, 16)}...
                            </p>
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
                      <p className="text-xs text-muted-foreground font-mono">
                        Session: {selectedSession.slice(0, 20)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                                : "bg-muted rounded-2xl rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-1 ${msg.from === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
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
    </div>
  );
}
