import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Store, Send, Paperclip, MoreVertical, Loader2, Image, FileText, Video, X, Smile } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { chatRoutes } from "@/lib/chat-routes";
import { ImageViewer, StickerPicker, type Sticker } from "@/components/chat-media";
import { useCustomerNotificationSound } from "@/hooks/use-customer-notification-sound";

// Sticker URL mapping for fallback when payload is missing
const STICKER_URL_MAP: Record<string, string> = {
  "happy_1": "https://media.giphy.com/media/WUq1cg9K7uzHa/giphy.gif",
  "happy_2": "https://media.giphy.com/media/DhstvI3zZ598Nb1rFf/giphy.gif",
  "happy_3": "https://media.giphy.com/media/tXL4FHPSnVJ0A/giphy.gif",
  "happy_4": "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif",
  "happy_5": "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  "happy_6": "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
  "happy_7": "https://media.giphy.com/media/3oriNZoNvn73MZaFYk/giphy.gif",
  "happy_8": "https://media.giphy.com/media/l41lUJ1YoZB1lHVPG/giphy.gif",
  "happy_9": "https://media.giphy.com/media/kyLYXonQYYtl6/giphy.gif",
  "happy_10": "https://media.giphy.com/media/13dHtsq7BHJJ4s/giphy.gif",
  "love_1": "https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif",
  "love_2": "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif",
  "love_3": "https://media.giphy.com/media/l0HlN5Y28D9MzzcRy/giphy.gif",
  "love_4": "https://media.giphy.com/media/3oEdv4hwWTzBhWvaU0/giphy.gif",
  "love_5": "https://media.giphy.com/media/MEF1JnhNr66Db0Uk6/giphy.gif",
  "love_6": "https://media.giphy.com/media/l0HlxJMw7rkPTN8sg/giphy.gif",
  "love_7": "https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif",
  "love_8": "https://media.giphy.com/media/108M7gCS1JSoO4/giphy.gif",
  "love_9": "https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif",
  "love_10": "https://media.giphy.com/media/jErnybNlfE1lm/giphy.gif",
  "celebrate_1": "https://media.giphy.com/media/26tOZ42Mg6r8b8iac/giphy.gif",
  "celebrate_2": "https://media.giphy.com/media/l0MYJnJQ4EiYLxvW/giphy.gif",
  "celebrate_3": "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif",
  "celebrate_4": "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
  "celebrate_5": "https://media.giphy.com/media/kyLYXonQYYtl6/giphy.gif",
  "angry_1": "https://media.giphy.com/media/d10dMmzqCYqQ0/giphy.gif",
  "angry_2": "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif",
  "angry_3": "https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif",
  "angry_4": "https://media.giphy.com/media/TJawtKM6OCKkvwCIqX/giphy.gif",
  "angry_5": "https://media.giphy.com/media/l41YqKTI3pFKuI9CE/giphy.gif",
  "thanks_1": "https://media.giphy.com/media/3oz8xIsloV320wXWE0/giphy.gif",
  "thanks_2": "https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/giphy.gif",
  "thanks_3": "https://media.giphy.com/media/26u4b45b8KlgAB7iM/giphy.gif",
  "hi_1": "https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif",
  "hi_2": "https://media.giphy.com/media/Vbtc9VG51NtzT1Qnv1/giphy.gif",
  "hi_3": "https://media.giphy.com/media/3ornk57KwDXf81rjWM/giphy.gif",
  "bye_1": "https://media.giphy.com/media/KctrWMQ7u9D2du0YmD/giphy.gif",
  "bye_2": "https://media.giphy.com/media/m9eG1qVjvN56H0MXt8/giphy.gif",
  "bye_3": "https://media.giphy.com/media/42D3CxaINsAFemFuId/giphy.gif",
  "laugh_1": "https://media.giphy.com/media/xUA7aM09ByyR1w5YWc/giphy.gif",
  "laugh_2": "https://media.giphy.com/media/26xBwdIuRCiYoCLHi/giphy.gif",
  "laugh_3": "https://media.giphy.com/media/3oEjI4sFlp73fvEYgw/giphy.gif",
  "wow_1": "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
  "wow_2": "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
  "wow_3": "https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif",
};

function getStickerUrlFromContent(content: string): string | null {
  if (!content?.startsWith("[sticker:")) return null;
  const match = content.match(/\[sticker:([^\]]+)\]/);
  if (match && match[1]) {
    const stickerId = match[1];
    return STICKER_URL_MAP[stickerId] || null;
  }
  return null;
}

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
  welcomeDescription?: string;
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatFileSizeInline(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

interface MediaInfo {
  id: string;
  url: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  createdAt?: string;
}

export default function StoreChatPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { playSound } = useCustomerNotificationSound();
  const [message, setMessage] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<MediaInfo[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
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
    mutationFn: async ({ content, clientMessageId, mediaId, messageType, payload }: { 
      content: string; 
      clientMessageId: string; 
      mediaId?: string;
      messageType?: string;
      payload?: any;
    }) => {
      return apiRequest("POST", `/api/customer/store-chats/${merchantId}/messages`, {
        content,
        clientMessageId,
        mediaId,
        messageType,
        payload,
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
              sessionId: storeChat?.sessionId || undefined,
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
            // Play notification sound for AI/supervisor messages
            if (data.message?.from === "ai" || data.message?.from === "supervisor") {
              playSound("incomingStore");
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
    let uploadedMediaInfo: any = null;
    
    if (selectedFile) {
      try {
        const uploadResult = await uploadMediaMutation.mutateAsync(selectedFile);
        mediaId = uploadResult.id;
        uploadedMediaInfo = {
          mediaId: uploadResult.id,
          filename: uploadResult.filename || selectedFile.name,
          mimeType: uploadResult.mimeType || selectedFile.type,
          fileSize: uploadResult.fileSize || selectedFile.size,
          mediaUrl: `/api/customer/media/${uploadResult.id}`,
        };
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
      payload: uploadedMediaInfo,
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

  const handleStickerSelect = useCallback((sticker: Sticker) => {
    const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const content = `[sticker:${sticker.id}]`;
    const stickerPayload = { stickerUrl: sticker.url, stickerAlt: sticker.alt };
    
    const pendingMsg: PendingMessage = {
      clientMessageId,
      content,
      from: "customer",
      timestamp: new Date().toISOString(),
      isPending: true,
      messageType: "sticker",
      payload: stickerPayload,
    };
    
    setPendingMessages(prev => [...prev, pendingMsg]);
    sendMessageMutation.mutate({ 
      content, 
      clientMessageId, 
      messageType: "sticker",
      payload: stickerPayload,
    });
    setShowStickerPicker(false);
  }, [sendMessageMutation]);

  const openImageViewer = useCallback((images: MediaInfo[], initialIndex: number = 0) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setImageViewerOpen(true);
  }, []);

  const parseMediaFromMessage = (msg: DisplayMessage): MediaInfo | null => {
    // Handle messages with proper media payload - use unified session-media endpoint
    if (msg.messageType === "media" && msg.payload?.mediaId) {
      return {
        id: msg.payload.mediaId,
        url: msg.payload.mediaUrl || msg.payload.url || `/api/session-media/${msg.payload.mediaId}`,
        filename: msg.payload.filename || "image",
        fileSize: msg.payload.fileSize || 0,
        mimeType: msg.payload.mimeType || "image/jpeg",
        createdAt: msg.timestamp,
      };
    }
    
    // Handle legacy messages with [image:] format in content
    if (msg.content?.startsWith("[image:") && msg.content?.endsWith("]")) {
      const filename = msg.content.slice(7, -1).trim();
      // Check if payload has url, mediaUrl, or mediaId
      let url = msg.payload?.mediaUrl || msg.payload?.url || "";
      // If no URL but has mediaId, construct the URL - use unified session-media endpoint
      if (!url && msg.payload?.mediaId) {
        url = `/api/session-media/${msg.payload.mediaId}`;
      }
      // If still no URL but we have the message ID, try using it as media reference
      if (!url && msg.id) {
        // Skip - we can't construct a valid URL without proper reference
        return null;
      }
      if (url) {
        return {
          id: msg.payload?.mediaId || msg.id?.toString() || "",
          url: url,
          filename: filename,
          fileSize: msg.payload?.fileSize || 0,
          mimeType: msg.payload?.mimeType || "image/jpeg",
          createdAt: msg.timestamp,
        };
      }
    }
    
    // Handle image messages from widget with url in payload
    if (msg.payload?.url && msg.payload?.mimeType?.startsWith("image/")) {
      return {
        id: msg.id?.toString() || msg.payload.mediaId || "",
        url: msg.payload.url,
        filename: msg.payload.filename || "image",
        fileSize: msg.payload.fileSize || 0,
        mimeType: msg.payload.mimeType,
        createdAt: msg.timestamp,
      };
    }
    
    return null;
  };

  const isImageMessage = (msg: DisplayMessage): boolean => {
    // Check for proper media type with mimeType
    if (msg.messageType === "media" && msg.payload?.mimeType?.startsWith("image/")) {
      return true;
    }
    // Check for legacy format with [image:] in content
    if (msg.content?.startsWith("[image:") && msg.content?.endsWith("]")) {
      const url = msg.payload?.mediaUrl || msg.payload?.url;
      return !!url;
    }
    // Check for payload with image mimeType even if messageType is not "media"
    if (msg.payload?.url && msg.payload?.mimeType?.startsWith("image/")) {
      return true;
    }
    return false;
  };

  const isStickerMessage = (msg: DisplayMessage): boolean => {
    return msg.messageType === "sticker" || msg.content.startsWith("[sticker:");
  };

  // Collect all images from conversation for gallery navigation
  const allConversationImages = useMemo(() => {
    const images: MediaInfo[] = [];
    allMessages.forEach(msg => {
      if (isImageMessage(msg)) {
        const mediaInfo = parseMediaFromMessage(msg);
        if (mediaInfo) {
          images.push(mediaInfo);
        }
      }
    });
    return images;
  }, [allMessages]);

  // Get index of a specific image in the conversation gallery
  const getImageIndexInConversation = (imageId: string): number => {
    return allConversationImages.findIndex(img => img.id === imageId);
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
            {store.welcomeDescription && (
              <div className="flex justify-center mb-4" data-testid="store-welcome-description">
                <div className="glass-card rounded-xl p-4 max-w-sm text-center">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {store.welcomeDescription}
                  </p>
                </div>
              </div>
            )}
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
                    const mediaInfo = parseMediaFromMessage(msg);
                    const isImage = isImageMessage(msg);
                    const isSticker = isStickerMessage(msg);
                    
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
                        
                        {isSticker ? (
                          (() => {
                            const stickerUrl = msg.payload?.stickerUrl || getStickerUrlFromContent(msg.content);
                            return stickerUrl ? (
                              <div className="w-48 md:w-56" data-testid="sticker-message">
                                <img 
                                  src={stickerUrl} 
                                  alt={msg.payload?.stickerAlt || "sticker"} 
                                  className="w-full h-auto rounded-lg"
                                  loading="lazy"
                                />
                                <p className={cn(
                                  "text-[10px] mt-1 text-center",
                                  "text-muted-foreground"
                                )}>
                                  {format(new Date(msg.timestamp), "HH:mm")}
                                  {isPending && " · Sending..."}
                                </p>
                              </div>
                            ) : (
                              <div className={cn(
                                "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
                                isCustomer
                                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-br-md"
                                  : "glass-card rounded-bl-md"
                              )}>
                                <p className="text-sm">{msg.content}</p>
                                <p className={cn(
                                  "text-[10px] mt-1",
                                  isCustomer ? "text-white/70" : "text-muted-foreground"
                                )}>
                                  {format(new Date(msg.timestamp), "HH:mm")}
                                </p>
                              </div>
                            );
                          })()
                        ) : isImage && mediaInfo ? (
                          <div 
                            className="cursor-pointer"
                            onClick={() => {
                              const index = getImageIndexInConversation(mediaInfo.id);
                              openImageViewer(allConversationImages, index >= 0 ? index : 0);
                            }}
                            data-testid="image-message"
                          >
                            <div className="w-48 md:w-56 rounded-xl overflow-hidden border border-white/20 shadow-sm">
                              <div className="relative aspect-square bg-black/5 dark:bg-white/5">
                                <img
                                  src={mediaInfo.url}
                                  alt={mediaInfo.filename}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className={cn(
                                "p-2",
                                isCustomer ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-black/5 dark:bg-white/5"
                              )}>
                                <p className={cn(
                                  "text-xs font-medium truncate",
                                  isCustomer && "text-white"
                                )} title={mediaInfo.filename}>
                                  {mediaInfo.filename}
                                </p>
                                <div className={cn(
                                  "flex items-center gap-1 text-[10px]",
                                  isCustomer ? "text-white/70" : "text-muted-foreground"
                                )}>
                                  <span>{formatFileSizeInline(mediaInfo.fileSize)}</span>
                                  <span>•</span>
                                  <span>{format(new Date(msg.timestamp), "HH:mm")}</span>
                                  {isPending && <span>· Sending...</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
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
                        )}
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
                <div className="mt-1" data-testid="upload-progress-container">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                      data-testid="upload-progress-bar"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="upload-progress-text">
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
              data-testid="button-remove-file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="glass-header p-3 relative z-40" style={{ borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: 'none' }}>
        <StickerPicker
          isOpen={showStickerPicker}
          onClose={() => setShowStickerPicker(false)}
          onStickerSelect={handleStickerSelect}
        />
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowStickerPicker(!showStickerPicker)}
            data-testid="button-stickers"
          >
            <Smile className="w-5 h-5" />
          </Button>
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

      <ImageViewer
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
      />
    </div>
  );
}
