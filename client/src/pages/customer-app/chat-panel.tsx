import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, Send, Paperclip, MoreVertical, Loader2, Image, FileText, Video, X, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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

interface PersonalChatInfo {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto: string | null;
  lastMessageAt: string | null;
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

const MAX_FILE_SIZE = 3 * 1024 * 1024;

interface ChatPanelProps {
  chatId: string;
  chatType: "store" | "personal";
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function ChatPanel({ chatId, chatType, onClose, isEmbedded }: ChatPanelProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: storeChat, isLoading: chatLoading } = useQuery<StoreChatData>({
    queryKey: ["/api/customer/store-chats", chatId],
    enabled: !!chatId && chatType === "store",
  });

  const { data: storeInfo, isLoading: storeLoading } = useQuery<StoreInfo>({
    queryKey: ["/api/customer/stores", chatId],
    enabled: !!chatId && chatType === "store",
  });

  const { data: personalChatInfo, isLoading: personalChatLoading } = useQuery<PersonalChatInfo>({
    queryKey: ["/api/customer/personal-chats", chatId, "info"],
    enabled: !!chatId && chatType === "personal",
  });

  const chatInfo = chatType === "store" 
    ? storeInfo 
    : personalChatInfo 
      ? { 
          companyName: personalChatInfo.participantName, 
          profilePhotoUrl: personalChatInfo.participantPhoto,
          online: false 
        } 
      : null;
  const chatInfoLoading = chatType === "store" ? storeLoading : personalChatLoading;

  const { data: serverMessages = [], isLoading: messagesLoading, error: messagesError } = useQuery<Message[]>({
    queryKey: chatType === "store" 
      ? ["/api/customer/store-chats", chatId, "messages"]
      : ["/api/customer/personal-chats", chatId, "messages"],
    enabled: chatType === "store" ? !!storeChat?.sessionId : !!chatId,
  });

  const allMessages = [...serverMessages, ...pendingMessages.filter(
    pm => !serverMessages.some(sm => sm.clientMessageId === pm.clientMessageId)
  )];

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, clientMessageId, mediaId }: { content: string; clientMessageId: string; mediaId?: string }) => {
      const endpoint = chatType === "store" 
        ? `/api/customer/store-chats/${chatId}/messages`
        : `/api/customer/personal-chats/${chatId}/messages`;
      return apiRequest("POST", endpoint, {
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
      if (chatType === "store") {
        queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats", chatId, "messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/customer/personal-chats", chatId, "messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/customer/personal-chats"] });
      }
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
      setIsUploading(true);
      setUploadProgress(0);
      
      return new Promise<{ id: string; filename: string; mimeType: string; fileSize: number }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64 = (e.target?.result as string).split(",")[1];
            
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener("progress", (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
              }
            });
            
            xhr.addEventListener("load", () => {
              setIsUploading(false);
              setUploadProgress(0);
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  resolve(JSON.parse(xhr.responseText));
                } catch {
                  reject(new Error("Invalid server response"));
                }
              } else {
                try {
                  const error = JSON.parse(xhr.responseText);
                  reject(new Error(error.error || error.message || "Upload failed"));
                } catch {
                  reject(new Error("Upload failed"));
                }
              }
            });
            
            xhr.addEventListener("error", () => {
              setIsUploading(false);
              setUploadProgress(0);
              reject(new Error("Network error during upload"));
            });
            
            xhr.addEventListener("abort", () => {
              setIsUploading(false);
              setUploadProgress(0);
              reject(new Error("Upload cancelled"));
            });
            
            xhr.open("POST", "/api/customer/media/upload");
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.withCredentials = true;
            xhr.send(JSON.stringify({
              filename: file.name,
              mimeType: file.type,
              fileData: base64,
              sessionId: chatType === "store" ? storeChat?.sessionId : chatId,
              chatType,
            }));
          } catch (err: any) {
            setIsUploading(false);
            setUploadProgress(0);
            reject(err);
          }
        };
        reader.onerror = () => {
          setIsUploading(false);
          setUploadProgress(0);
          reject(new Error("Failed to read file"));
        };
        reader.readAsDataURL(file);
      });
    },
    onError: (error: any) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload file",
        variant: "destructive",
      });
    },
  });

  const initializeChatMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/customer/stores/${chatId}/chat`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats", chatId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats"] });
    },
  });

  useEffect(() => {
    if (!chatLoading && !storeChat && chatId && chatType === "store") {
      initializeChatMutation.mutate();
    }
  }, [chatLoading, storeChat, chatId, chatType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  useEffect(() => {
    const sessionId = chatType === "store" ? storeChat?.sessionId : chatId;
    if (!sessionId) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?session=${sessionId}`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "message") {
            if (chatType === "store") {
              queryClient.invalidateQueries({ queryKey: ["/api/customer/store-chats", chatId, "messages"] });
            } else {
              queryClient.invalidateQueries({ queryKey: ["/api/customer/personal-chats", chatId, "messages"] });
            }
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
  }, [storeChat?.sessionId, chatId, chatType, queryClient]);

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

  const displayInfo = chatType === "store" 
    ? (storeChat?.merchant || storeInfo) 
    : chatInfo;
  const isLoading = chatType === "store" 
    ? (chatLoading || storeLoading) 
    : (personalChatLoading);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full chat-background-pattern">
        <header className="flex items-center gap-3 p-3 glass-header z-10">
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

  if (!displayInfo) {
    return (
      <div className="flex flex-col h-full chat-background-pattern">
        <header className="flex items-center gap-3 p-3 glass-header z-10">
          <span className="font-medium">{chatType === "store" ? "Store not found" : "Chat not found"}</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 glass-card rounded-xl">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">{chatType === "store" ? "Store not found" : "Chat not found"}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {chatType === "store" ? "This store may no longer be available" : "This conversation may no longer be available"}
            </p>
            {chatType === "store" && (
              <Button onClick={() => navigate(chatRoutes.stores())} data-testid="button-browse-stores-panel">
                Browse Stores
              </Button>
            )}
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
    <div className="flex flex-col h-full chat-background-pattern">
      <header className="flex items-center gap-3 p-3 glass-header z-10 border-b border-border/50">
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={displayInfo.profilePhotoUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20">
              {chatType === "store" ? <Store className="w-5 h-5 text-primary" /> : <Users className="w-5 h-5 text-primary" />}
            </AvatarFallback>
          </Avatar>
          {displayInfo.online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium truncate" data-testid="panel-store-name">{displayInfo.companyName || (chatType === "store" ? "Store" : "User")}</h2>
          <p className="text-xs text-muted-foreground">
            {displayInfo.online ? "Online" : "Offline"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-panel-menu">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => chatType === "store" && navigate(chatRoutes.storeInfo(chatId))}>
              {chatType === "store" ? "View Store Info" : "View Profile"}
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
        {isEmbedded && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-panel">
            <X className="w-5 h-5" />
          </Button>
        )}
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
                onClick={() => queryClient.invalidateQueries({ 
                  queryKey: chatType === "store" 
                    ? ["/api/customer/store-chats", chatId, "messages"]
                    : ["/api/customer/personal-chats", chatId, "messages"]
                })}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="glass-card rounded-xl p-6">
              <Avatar className="w-16 h-16 mb-4 mx-auto">
                <AvatarImage src={displayInfo.profilePhotoUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20">
                  <Store className="w-8 h-8 text-primary" />
                </AvatarFallback>
              </Avatar>
              <h3 className="font-medium mb-1">{displayInfo.companyName}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {chatType === "store" && storeInfo?.welcomeMessage ? storeInfo.welcomeMessage : "Send a message to start the conversation"}
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
                        data-testid={`panel-message-${msgKey}`}
                      >
                        {!isCustomer && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={displayInfo.profilePhotoUrl || undefined} />
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
              {isUploading && (
                <div className="mt-1" data-testid="panel-upload-progress-container">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                      data-testid="panel-upload-progress-bar"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="panel-upload-progress-text">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearSelectedFile} 
              disabled={isUploading}
              data-testid="button-panel-remove-file"
            >
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
            data-testid="input-panel-file"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                disabled={uploadMediaMutation.isPending}
                data-testid="button-panel-attach"
              >
                {uploadMediaMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Paperclip className="w-5 h-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "image/*";
                  fileInputRef.current.click();
                }
              }}>
                <Image className="w-4 h-4 mr-2" />
                Photo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = "video/*";
                  fileInputRef.current.click();
                }
              }}>
                <Video className="w-4 h-4 mr-2" />
                Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = ".pdf,.doc,.docx,.txt,.xls,.xlsx";
                  fileInputRef.current.click();
                }
              }}>
                <FileText className="w-4 h-4 mr-2" />
                Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 glass-input"
            disabled={sendMessageMutation.isPending}
            data-testid="input-panel-message"
          />
          <Button 
            size="icon"
            onClick={handleSend}
            disabled={(!message.trim() && !selectedFile) || sendMessageMutation.isPending || uploadMediaMutation.isPending}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0"
            data-testid="button-panel-send"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
