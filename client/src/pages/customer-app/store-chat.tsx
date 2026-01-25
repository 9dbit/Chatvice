import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Store, Send, Paperclip, MoreVertical, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sessionId: string;
  from: string;
  content: string;
  messageType: string;
  payload?: any;
  timestamp: string;
  clientMessageId?: string;
}

interface StoreInfo {
  id: string;
  companyName: string;
  profilePhotoUrl: string | null;
  online: boolean;
  welcomeMessage?: string;
  businessCategory?: string;
}

interface StoreChatData {
  id: string;
  sessionId: string;
  merchantId: string;
  merchant: StoreInfo | null;
}

interface PendingMessage {
  id?: string;
  sessionId?: string;
  clientMessageId: string;
  content: string;
  from: string;
  timestamp: string;
  messageType?: string;
  payload?: any;
  isPending: true;
}

type DisplayMessage = Message | PendingMessage;

export default function StoreChatPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: storeChat, isLoading: chatLoading, error: chatError } = useQuery<StoreChatData>({
    queryKey: ["/api/customer/store-chats", merchantId],
    enabled: !!merchantId,
  });

  const { data: storeInfo, isLoading: storeLoading, error: storeError } = useQuery<StoreInfo>({
    queryKey: ["/api/customer/stores", merchantId],
    enabled: !!merchantId,
  });

  const { data: serverMessages = [], isLoading: messagesLoading, error: messagesError } = useQuery<Message[]>({
    queryKey: ["/api/customer/store-chats", merchantId, "messages"],
    enabled: !!storeChat?.sessionId,
  });

  const allMessages = [...serverMessages, ...pendingMessages.filter(
    pm => !serverMessages.some(sm => sm.clientMessageId === pm.clientMessageId)
  )];

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, clientMessageId }: { content: string; clientMessageId: string }) => {
      return apiRequest("POST", `/api/customer/store-chats/${merchantId}/messages`, {
        content,
        clientMessageId,
      });
    },
    onSuccess: (_, variables) => {
      setMessage("");
      setPendingMessages(prev => prev.filter(pm => pm.clientMessageId !== variables.clientMessageId));
      queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats", merchantId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats"] });
    },
    onError: (error: any, variables) => {
      setPendingMessages(prev => prev.filter(pm => pm.clientMessageId !== variables.clientMessageId));
      toast({
        title: "Failed to send message",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const initializeChatMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/customer/stores/${merchantId}/chat`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats"] });
    },
  });

  useEffect(() => {
    if (!chatLoading && !storeChat && merchantId) {
      initializeChatMutation.mutate();
    }
  }, [chatLoading, storeChat, merchantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  // WebSocket connection for real-time messages
  useEffect(() => {
    if (!storeChat?.sessionId) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?session=${storeChat.sessionId}`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "message") {
            queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats", merchantId, "messages"] });
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [storeChat?.sessionId, merchantId, queryClient]);

  const handleSend = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pendingMsg: PendingMessage = {
      clientMessageId,
      content: message.trim(),
      from: "customer",
      timestamp: new Date().toISOString(),
      isPending: true,
    };
    
    setPendingMessages(prev => [...prev, pendingMsg]);
    sendMessageMutation.mutate({ content: message.trim(), clientMessageId });
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const store = storeChat?.merchant || storeInfo;
  const isLoading = chatLoading || storeLoading;

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        <header className="flex items-center gap-3 p-4 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chat/inbox")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="animate-pulse flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        <header className="flex items-center gap-3 p-4 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chat/inbox")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">Store not found</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Store not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This store may no longer be available
            </p>
            <Button onClick={() => navigate("/chat/stores")} data-testid="button-browse-stores">
              Browse Stores
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const groupMessagesByDate = (msgs: DisplayMessage[]) => {
    const groups: { date: string; messages: DisplayMessage[] }[] = [];
    let currentDate = "";

    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.timestamp), "yyyy-MM-dd");
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
      return "Today";
    }
    if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
      return "Yesterday";
    }
    return format(date, "MMMM d, yyyy");
  };

  const messageGroups = groupMessagesByDate(allMessages);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex items-center gap-3 p-3 border-b bg-card z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/chat/inbox")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={store.profilePhotoUrl || undefined} />
            <AvatarFallback>
              <Store className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          {store.online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium truncate">{store.companyName || "Store"}</h2>
          <p className="text-xs text-muted-foreground">
            {store.online ? "Online" : "Offline"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-chat-menu">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/chat/store/${merchantId}/info`)}>
              View Store Info
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "This feature is in development" })}>
              Clear Chat
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => toast({ title: "Coming Soon", description: "This feature is in development" })}
              className="text-destructive"
            >
              Block Store
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading && allMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messagesError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-destructive mb-2">Failed to load messages</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats", merchantId, "messages"] })}
            >
              Retry
            </Button>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar className="w-16 h-16 mb-4">
              <AvatarImage src={store.profilePhotoUrl || undefined} />
              <AvatarFallback>
                <Store className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <h3 className="font-medium mb-1">{store.companyName}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {store.welcomeMessage || "Send a message to start the conversation"}
            </p>
          </div>
        ) : (
          <>
            {messageGroups.map((group) => (
              <div key={group.date}>
                <div className="flex items-center justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {formatDateLabel(group.date)}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.messages.map((msg) => {
                    const isCustomer = msg.from === "customer";
                    const msgKey = msg.id || msg.clientMessageId || msg.timestamp;
                    const isPending = "isPending" in msg && msg.isPending;
                    return (
                      <div
                        key={msgKey}
                        className={cn(
                          "flex gap-2",
                          isCustomer ? "justify-end" : "justify-start",
                          isPending && "opacity-70"
                        )}
                        data-testid={`message-${msgKey}`}
                      >
                        {!isCustomer && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={store.profilePhotoUrl || undefined} />
                            <AvatarFallback>
                              <Store className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2",
                            isCustomer
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-1",
                              isCustomer ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(msg.timestamp), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t bg-card p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toast({ title: "Coming Soon", description: "File attachments are in development" })}
            data-testid="button-attach"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="pr-12"
              disabled={sendMessageMutation.isPending}
              data-testid="input-message"
            />
          </div>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            data-testid="button-send"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
