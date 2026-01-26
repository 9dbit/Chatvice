import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Store, Send, Paperclip, MoreVertical, Loader2, Image, FileText, Video, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { chatRoutes } from "@/lib/chat-routes";

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

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function parseMessageContent(content: string): (string | { type: 'link'; url: string })[] {
  const parts: (string | { type: 'link'; url: string })[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = URL_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push({ type: 'link', url: match[0] });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  URL_REGEX.lastIndex = 0;
  
  return parts.length > 0 ? parts : [content];
}

function MessageContent({ content }: { content: string }) {
  const parts = parseMessageContent(content);
  
  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        }
        return (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
            data-testid={`link-${index}`}
          >
            {part.url}
          </a>
        );
      })}
    </p>
  );
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

export default function StoreChatPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    mutationFn: async ({ content, clientMessageId, mediaId }: { content: string; clientMessageId: string; mediaId?: string }) => {
      return apiRequest("POST", `/api/customer/store-chats/${merchantId}/messages`, {
        content,
        clientMessageId,
        mediaId,
      });
    },
    onSuccess: (_, variables) => {
      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
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

  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      return new Promise<{ id: string; filename: string; mimeType: string; fileSize: number }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64 = (e.target?.result as string).split(",")[1];
            
            const response = await fetch("/api/customer/media/upload", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                filename: file.name,
                mimeType: file.type,
                fileData: base64,
                sessionId: storeChat?.sessionId || undefined,
              }),
              credentials: "include",
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || error.message || "Upload failed");
            }
            
            resolve(await response.json());
          } catch (err: any) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload file",
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

  const allowedMimeTypes = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/webm", "video/quicktime",
    "application/pdf", "text/plain",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 3MB",
        variant: "destructive",
      });
      return;
    }
    
    if (!file.type || !allowedMimeTypes.includes(file.type)) {
      toast({
        title: "File type not allowed",
        description: "Supported: images, videos, PDF, Word, Excel, and text files",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      setFilePreview("video");
    } else {
      setFilePreview("document");
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || sendMessageMutation.isPending || uploadMediaMutation.isPending) return;
    
    const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let mediaId: string | undefined;
    
    if (selectedFile) {
      try {
        const uploadResult = await uploadMediaMutation.mutateAsync(selectedFile);
        mediaId = uploadResult.id;
      } catch {
        return;
      }
    }
    
    const content = message.trim() || (selectedFile ? `[${selectedFile.type.split('/')[0]}: ${selectedFile.name}]` : "");
    
    const pendingMsg: PendingMessage = {
      clientMessageId,
      content,
      from: "customer",
      timestamp: new Date().toISOString(),
      isPending: true,
      messageType: selectedFile ? "media" : "text",
    };
    
    setPendingMessages(prev => [...prev, pendingMsg]);
    sendMessageMutation.mutate({ content, clientMessageId, mediaId });
    setMessage("");
    clearSelectedFile();
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
      <div className="fixed inset-0 flex flex-col chat-background-pattern">
        <header className="flex items-center gap-3 p-4 glass-header z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(chatRoutes.inbox())}>
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
      <div className="fixed inset-0 flex flex-col chat-background-pattern">
        <header className="flex items-center gap-3 p-4 glass-header z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(chatRoutes.inbox())}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">Store not found</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 glass-card rounded-xl">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Store not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This store may no longer be available
            </p>
            <Button onClick={() => navigate(chatRoutes.stores())} data-testid="button-browse-stores">
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
    <div className="fixed inset-0 flex flex-col chat-background-pattern">
      <header className="flex items-center gap-3 p-3 glass-header z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(chatRoutes.inbox())}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={store.profilePhotoUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20">
              <Store className="w-5 h-5 text-primary" />
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
            <DropdownMenuItem onClick={() => navigate(chatRoutes.storeInfo(merchantId!))}>
              View Store Info
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "This feature is in development" })}>
              Clear Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
            <div className="glass-card rounded-xl p-6">
              <p className="text-sm text-destructive mb-2">Failed to load messages</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats", merchantId, "messages"] })}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="glass-card rounded-xl p-6">
              <Avatar className="w-16 h-16 mb-4 mx-auto">
                <AvatarImage src={store.profilePhotoUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20">
                  <Store className="w-8 h-8 text-primary" />
                </AvatarFallback>
              </Avatar>
              <h3 className="font-medium mb-1">{store.companyName}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {store.welcomeMessage || "Send a message to start the conversation"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messageGroups.map((group) => (
              <div key={group.date}>
                <div className="flex items-center justify-center my-4">
                  <span className="text-xs text-muted-foreground glass-card px-3 py-1 rounded-full">
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
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20">
                              <Store className="w-4 h-4 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
                            isCustomer
                              ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-br-md"
                              : "glass-card rounded-bl-md"
                          )}
                        >
                          <MessageContent content={msg.content} />
                          <p
                            className={cn(
                              "text-[10px] mt-1",
                              isCustomer ? "text-white/70" : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(msg.timestamp), "HH:mm")}
                            {isPending && " · Sending..."}
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

      {selectedFile && (
        <div className="px-3 py-2 glass-header">
          <div className="flex items-center gap-3 glass-card rounded-lg p-2">
            {filePreview && filePreview !== "video" && filePreview !== "document" ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 rounded object-cover" />
            ) : filePreview === "video" ? (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                <Video className="w-6 h-6 text-muted-foreground" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={clearSelectedFile} data-testid="button-remove-file">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="glass-header p-3" style={{ borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: 'none' }}>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-attach"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => {
                fileInputRef.current?.setAttribute("accept", "image/*");
                fileInputRef.current?.click();
              }}>
                <Image className="w-4 h-4 mr-2" />
                Photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                fileInputRef.current?.setAttribute("accept", "video/*");
                fileInputRef.current?.click();
              }}>
                <Video className="w-4 h-4 mr-2" />
                Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                fileInputRef.current?.setAttribute("accept", ".pdf,.doc,.docx,.txt,.xls,.xlsx");
                fileInputRef.current?.click();
              }}>
                <FileText className="w-4 h-4 mr-2" />
                Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="pr-12 glass-input"
              disabled={sendMessageMutation.isPending || uploadMediaMutation.isPending}
              data-testid="input-message"
            />
          </div>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!message.trim() && !selectedFile) || sendMessageMutation.isPending || uploadMediaMutation.isPending}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0"
            data-testid="button-send"
          >
            {(sendMessageMutation.isPending || uploadMediaMutation.isPending) ? (
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
