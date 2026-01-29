import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Send, Paperclip, MoreVertical, Loader2, X, Smile, Image, FileText, Video } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { chatRoutes } from "@/lib/chat-routes";
import { ImageViewer, StickerPicker, ChatRightPanel, type Sticker } from "@/components/chat-media";
import { useCustomerNotificationSound } from "@/hooks/use-customer-notification-sound";

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
  "celebrate_6": "https://media.giphy.com/media/3oz9ZE2Oo9zAu/giphy.gif",
  "celebrate_7": "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
  "celebrate_8": "https://media.giphy.com/media/l378bu6ZYmzS6nBGU/giphy.gif",
  "celebrate_9": "https://media.giphy.com/media/l0Iy5fjHyedk3K0X6/giphy.gif",
  "celebrate_10": "https://media.giphy.com/media/26BRDvCpnNmmq4aeY/giphy.gif",
  "angry_1": "https://media.giphy.com/media/d10dMmzqCYqQ0/giphy.gif",
  "angry_2": "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif",
  "angry_3": "https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif",
  "angry_4": "https://media.giphy.com/media/TJawtKM6OCKkvwCIqX/giphy.gif",
  "angry_5": "https://media.giphy.com/media/l41YqKTI3pFKuI9CE/giphy.gif",
  "angry_6": "https://media.giphy.com/media/3o7P4F86TAI9Kz7XYk/giphy.gif",
  "angry_7": "https://media.giphy.com/media/3o7WIwkSmw32NgXvTG/giphy.gif",
  "angry_8": "https://media.giphy.com/media/3o6wrvdHFbwBrUFenu/giphy.gif",
  "angry_9": "https://media.giphy.com/media/SFkjp1R8gS6lG/giphy.gif",
  "angry_10": "https://media.giphy.com/media/xT0GqfvuVpjJbG1A7m/giphy.gif",
  "thanks_1": "https://media.giphy.com/media/3oz8xIsloV320wXWE0/giphy.gif",
  "thanks_2": "https://media.giphy.com/media/BPJmthQ3YRwD6QqcVD/giphy.gif",
  "thanks_3": "https://media.giphy.com/media/26u4b45b8KlgAB7iM/giphy.gif",
  "thanks_4": "https://media.giphy.com/media/l0MYOU4CQ78lJZxdtm/giphy.gif",
  "thanks_5": "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif",
  "hi_1": "https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif",
  "hi_2": "https://media.giphy.com/media/Vbtc9VG51NtzT1Qnv1/giphy.gif",
  "hi_3": "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
  "hi_4": "https://media.giphy.com/media/3ornk57KwDXf81rjWM/giphy.gif",
  "hi_5": "https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif",
  "bye_1": "https://media.giphy.com/media/KctrWMQ7u9D2du0YmD/giphy.gif",
  "bye_2": "https://media.giphy.com/media/m9eG1qVjvN56H0MXt8/giphy.gif",
  "bye_3": "https://media.giphy.com/media/fxe8v45NNXFd4jdaNI/giphy.gif",
  "bye_4": "https://media.giphy.com/media/42D3CxaINsAFemFuId/giphy.gif",
  "bye_5": "https://media.giphy.com/media/xUPGcC0R9QjyxkPnS8/giphy.gif",
  "laugh_1": "https://media.giphy.com/media/xUA7aM09ByyR1w5YWc/giphy.gif",
  "laugh_2": "https://media.giphy.com/media/26xBwdIuRCiYoCLHi/giphy.gif",
  "laugh_3": "https://media.giphy.com/media/xT9DPIBYf0pAviBLzO/giphy.gif",
  "laugh_4": "https://media.giphy.com/media/3oEdv6sy3ulljPMGdy/giphy.gif",
  "laugh_5": "https://media.giphy.com/media/12PIT4DOj6Tgek/giphy.gif",
  "wow_1": "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
  "wow_2": "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
  "wow_3": "https://media.giphy.com/media/l3q2SaisWTeZnV9wk/giphy.gif",
  "wow_4": "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif",
  "wow_5": "https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif",
};

function getStickerUrlFromContent(content: string): string | null {
  if (!content?.startsWith("[sticker:")) return null;
  const match = content.match(/\[sticker:([^\]]+)\]/);
  if (match && match[1]) {
    return STICKER_URL_MAP[match[1]] || null;
  }
  return null;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  messageType: string;
  payload?: any;
  createdAt: string;
  clientMessageId?: string;
  fileUrl?: string;
  fileName?: string;
}

interface PersonalChatInfo {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto: string | null;
  lastMessageAt: string | null;
}

interface CustomerData {
  id: string;
  phoneNumber: string;
  displayName: string;
  email?: string;
}

interface PendingMessage {
  id?: string;
  chatId?: string;
  clientMessageId: string;
  content: string;
  senderId: string;
  createdAt: string;
  messageType?: string;
  payload?: any;
  isPending: true;
}

type DisplayMessage = Message | PendingMessage;

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function isStickerMessage(msg: DisplayMessage): boolean {
  return msg.messageType === "sticker" || msg.content?.startsWith("[sticker:");
}

function isImageMessage(msg: DisplayMessage): boolean {
  if (msg.messageType === "media" || msg.messageType === "image") return true;
  if (msg.content?.startsWith("[image:")) return true;
  if ('fileUrl' in msg && msg.fileUrl) {
    const ext = msg.fileUrl.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  }
  return false;
}

interface MediaInfo {
  url: string;
  filename: string;
}

function parseMediaFromMessage(msg: DisplayMessage): MediaInfo | null {
  if ('fileUrl' in msg && msg.fileUrl) {
    return {
      url: msg.fileUrl,
      filename: ('fileName' in msg && msg.fileName) || 'image',
    };
  }
  if (msg.payload?.url) {
    return {
      url: msg.payload.url,
      filename: msg.payload.filename || 'image',
    };
  }
  return null;
}

export default function PersonalChatPage() {
  const params = useParams<{ chatId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { playSound } = useCustomerNotificationSound();
  const [message, setMessage] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<MediaInfo[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [panelViewingImage, setPanelViewingImage] = useState<MediaInfo | null>(null);
  const [panelViewingIndex, setPanelViewingIndex] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatId = params.chatId;

  const { data: currentUser } = useQuery<CustomerData>({
    queryKey: ["/api/customer/me"],
  });

  const { data: chatInfo, isLoading: chatLoading } = useQuery<PersonalChatInfo>({
    queryKey: ["/api/customer/personal-chats", chatId, "info"],
    enabled: !!chatId,
  });

  const { data: serverMessages = [], isLoading: messagesLoading, error: messagesError } = useQuery<Message[]>({
    queryKey: ["/api/customer/personal-chats", chatId, "messages"],
    enabled: !!chatId,
    refetchInterval: 3000,
  });

  const allMessages = [...serverMessages, ...pendingMessages.filter(
    pm => !serverMessages.some(sm => sm.clientMessageId === pm.clientMessageId)
  )];

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, clientMessageId, messageType, fileUrl, fileName }: { 
      content: string; 
      clientMessageId: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
    }) => {
      return apiRequest("POST", `/api/customer/personal-chats/${chatId}/messages`, {
        content,
        clientMessageId,
        messageType: messageType || "text",
        fileUrl,
        fileName,
      });
    },
    onSuccess: (_, variables) => {
      setMessage("");
      setPendingMessages(prev => prev.filter(pm => pm.clientMessageId !== variables.clientMessageId));
      queryClient.invalidateQueries({ queryKey: ["/api/customer/personal-chats", chatId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/personal-chats"] });
    },
    onError: (error, variables) => {
      setPendingMessages(prev => prev.filter(pm => pm.clientMessageId !== variables.clientMessageId));
      toast({
        title: "Gagal mengirim pesan",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      return new Promise<{ url: string; filename: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const response = await fetch("/api/customer/media/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                filename: file.name,
                mimeType: file.type,
                fileData: base64,
              }),
              credentials: "include",
            });
            
            if (!response.ok) {
              throw new Error("Upload failed");
            }
            
            const data = await response.json();
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    },
    onSuccess: (data, file) => {
      const clientMessageId = generateClientId();
      const pendingMsg: PendingMessage = {
        clientMessageId,
        content: `[image:${data.filename || 'image'}]`,
        senderId: currentUser?.id || "me",
        createdAt: new Date().toISOString(),
        messageType: "media",
        payload: { url: data.url, filename: data.filename, fileSize: file.size },
        isPending: true,
      };
      setPendingMessages(prev => [...prev, pendingMsg]);
      sendMessageMutation.mutate({ 
        content: `[image:${data.filename || 'image'}]`,
        clientMessageId,
        messageType: "media",
        fileUrl: data.url,
        fileName: data.filename,
      });
      clearSelectedFile();
    },
    onError: (error) => {
      toast({
        title: "Gagal upload",
        description: String(error),
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !chatId) return;

    const clientMessageId = generateClientId();
    const pendingMsg: PendingMessage = {
      clientMessageId,
      content: trimmedMessage,
      senderId: currentUser?.id || "me",
      createdAt: new Date().toISOString(),
      messageType: "text",
      isPending: true,
    };

    setPendingMessages(prev => [...prev, pendingMsg]);
    setMessage("");
    playSound("sent");
    sendMessageMutation.mutate({ content: trimmedMessage, clientMessageId });
  };

  const handleStickerSelect = useCallback((sticker: Sticker) => {
    const clientMessageId = generateClientId();
    const pendingMsg: PendingMessage = {
      clientMessageId,
      content: `[sticker:${sticker.id}]`,
      senderId: currentUser?.id || "me",
      createdAt: new Date().toISOString(),
      messageType: "sticker",
      payload: { stickerUrl: sticker.url, stickerAlt: sticker.alt },
      isPending: true,
    };
    setPendingMessages(prev => [...prev, pendingMsg]);
    sendMessageMutation.mutate({
      content: `[sticker:${sticker.id}]`,
      clientMessageId,
      messageType: "sticker",
    });
    setShowStickerPicker(false);
  }, [currentUser?.id, sendMessageMutation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File terlalu besar",
          description: "Maksimal ukuran file adalah 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);
      uploadMediaMutation.mutate(selectedFile);
    } else if (message.trim()) {
      handleSendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openImageViewer = (images: MediaInfo[], index: number) => {
    setViewerImages(images);
    setViewerInitialIndex(index);
    setImageViewerOpen(true);
  };

  const allMediaItems = allMessages
    .filter(msg => msg.messageType === "media" && msg.payload?.url)
    .map(msg => ({
      url: msg.payload.url,
      filename: msg.payload.filename || msg.content?.replace("[image:", "").replace("]", "") || "image",
      fileSize: msg.payload.fileSize,
    }));

  const openPanelViewer = (image: MediaInfo, index: number) => {
    setPanelViewingImage(image);
    setPanelViewingIndex(index);
  };

  const closePanelViewer = () => {
    setPanelViewingImage(null);
    setPanelViewingIndex(0);
  };

  const handleImageClick = (mediaInfo: MediaInfo) => {
    const idx = allMediaItems.findIndex(m => m.url === mediaInfo.url);
    if (window.innerWidth >= 1024) {
      openPanelViewer(mediaInfo, idx >= 0 ? idx : 0);
    } else {
      openImageViewer([mediaInfo], 0);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  useEffect(() => {
    if (serverMessages.length > lastMessageCount && lastMessageCount > 0) {
      const lastMsg = serverMessages[serverMessages.length - 1];
      if (lastMsg && currentUser && lastMsg.senderId !== currentUser.id) {
        playSound("incomingPersonal");
      }
    }
    setLastMessageCount(serverMessages.length);
  }, [serverMessages.length, lastMessageCount, currentUser, playSound]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const groupMessagesByDate = (messages: DisplayMessage[]) => {
    const groups: { date: string; messages: DisplayMessage[] }[] = [];
    let currentDate = "";
    let currentGroup: DisplayMessage[] = [];

    for (const msg of messages) {
      const msgDate = format(new Date(msg.createdAt), "yyyy-MM-dd");
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
      return "Hari ini";
    }
    if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
      return "Kemarin";
    }
    return format(date, "d MMMM yyyy");
  };

  if (!chatId) {
    navigate(chatRoutes.inbox());
    return null;
  }

  if (chatLoading) {
    return (
      <div className="fixed inset-0 flex flex-col chat-background-pattern">
        <header className="flex items-center gap-3 p-3 glass-header z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(chatRoutes.contacts())} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!chatInfo) {
    return (
      <div className="fixed inset-0 flex flex-col chat-background-pattern">
        <header className="flex items-center gap-3 p-3 glass-header z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(chatRoutes.contacts())} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">Chat tidak ditemukan</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 glass-card rounded-xl">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Chat tidak ditemukan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Percakapan ini mungkin telah dihapus atau tidak tersedia.
            </p>
            <Button onClick={() => navigate(chatRoutes.contacts())}>
              Kembali ke Kontak
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(allMessages);

  return (
    <div className="fixed inset-0 flex chat-background-pattern">
      <div className="flex-1 flex flex-col min-w-0">
      <header className="flex items-center gap-3 p-3 glass-header z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(chatRoutes.contacts())}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={chatInfo.participantPhoto || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20">
              <Users className="w-5 h-5 text-primary" />
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium truncate" data-testid="text-participant-name">{chatInfo.participantName || "User"}</h2>
          <p className="text-xs text-muted-foreground">Personal Chat</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-chat-menu">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast({ title: "Segera Hadir", description: "Fitur ini sedang dikembangkan" })}>
              Lihat Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Segera Hadir", description: "Fitur ini sedang dikembangkan" })}>
              Hapus Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => toast({ title: "Segera Hadir", description: "Fitur ini sedang dikembangkan" })}
              className="text-destructive"
            >
              Blokir User
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
              <p className="text-sm text-destructive mb-2">Gagal memuat pesan</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/customer/personal-chats", chatId, "messages"] })}
              >
                Coba Lagi
              </Button>
            </div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="glass-card rounded-xl p-6">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Mulai percakapan</h3>
              <p className="text-sm text-muted-foreground">
                Sapa {chatInfo.participantName}!
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
                    const isMe = msg.senderId === currentUser?.id || msg.senderId === "me" || ('isPending' in msg && msg.isPending);
                    const msgKey = ('id' in msg && msg.id) || msg.clientMessageId || msg.createdAt;
                    const isPending = "isPending" in msg && msg.isPending;
                    const mediaInfo = parseMediaFromMessage(msg);
                    const isImage = isImageMessage(msg);
                    const isSticker = isStickerMessage(msg);

                    return (
                      <div
                        key={msgKey}
                        className={cn(
                          "flex gap-2",
                          isMe ? "justify-end" : "justify-start",
                          isPending && "opacity-70"
                        )}
                        data-testid={`message-${msgKey}`}
                      >
                        {!isMe && (
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={chatInfo.participantPhoto || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20">
                              <Users className="w-4 h-4 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                        )}

                        {isSticker ? (
                          (() => {
                            const stickerUrl = msg.payload?.stickerUrl || getStickerUrlFromContent(msg.content);
                            return stickerUrl ? (
                              <div className="max-w-[120px]" data-testid="sticker-message">
                                <img 
                                  src={stickerUrl} 
                                  alt={msg.payload?.stickerAlt || "sticker"} 
                                  className="w-full h-auto"
                                  loading="lazy"
                                />
                                <p className="text-[10px] mt-1 text-center text-muted-foreground">
                                  {format(new Date(msg.createdAt), "HH:mm")}
                                  {isPending && " · Mengirim..."}
                                </p>
                              </div>
                            ) : (
                              <div className={cn(
                                "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
                                isMe
                                  ? "bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-br-md"
                                  : "glass-card rounded-bl-md"
                              )}>
                                <p className="text-xs">{msg.content}</p>
                                <p className={cn(
                                  "text-[10px] mt-1",
                                  isMe ? "text-white/70" : "text-muted-foreground"
                                )}>
                                  {format(new Date(msg.createdAt), "HH:mm")}
                                </p>
                              </div>
                            );
                          })()
                        ) : isImage && mediaInfo ? (
                          <div 
                            className="cursor-pointer"
                            onClick={() => handleImageClick(mediaInfo)}
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
                                isMe ? "bg-gradient-to-r from-purple-700 to-indigo-700" : "glass-card"
                              )}>
                                <p className={cn(
                                  "text-xs font-medium truncate",
                                  isMe ? "text-white" : "text-foreground"
                                )}>
                                  {mediaInfo.filename}
                                </p>
                                <p className={cn(
                                  "text-[10px]",
                                  isMe ? "text-white/70" : "text-muted-foreground"
                                )}>
                                  {msg.payload?.fileSize ? `${(msg.payload.fileSize / 1024).toFixed(1)} KB` : ''} {msg.payload?.fileSize ? '·' : ''} {format(new Date(msg.createdAt), "HH:mm")}
                                  {isPending && " · Sending..."}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-3 py-1.5 shadow-sm",
                              isMe
                                ? "bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-br-md"
                                : "glass-card rounded-bl-md"
                            )}
                          >
                            <p className="text-xs whitespace-pre-wrap break-words">{msg.content}</p>
                            <div className={cn(
                              "flex items-center gap-1 mt-1",
                              isMe ? "justify-end" : "justify-start"
                            )}>
                              <span className={cn(
                                "text-[10px]",
                                isMe ? "text-white/70" : "text-muted-foreground"
                              )}>
                                {format(new Date(msg.createdAt), "HH:mm")}
                              </span>
                              {isPending && (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              )}
                            </div>
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
        <div className="p-3 border-t border-border/50 glass-card mx-3 mb-2 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              {selectedFile.type.startsWith("image/") ? (
                <Image className="w-6 h-6 text-muted-foreground" />
              ) : selectedFile.type.startsWith("video/") ? (
                <Video className="w-6 h-6 text-muted-foreground" />
              ) : (
                <FileText className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
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
                    Mengupload... {uploadProgress}%
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
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-attach"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
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
              placeholder="Ketik pesan..."
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

      <div className="hidden lg:block w-80 border-l bg-background/80 backdrop-blur-sm">
        <ChatRightPanel
          participant={{
            name: chatInfo.participantName || "User",
            photo: chatInfo.participantPhoto || undefined,
          }}
          mediaItems={allMediaItems}
          viewingImage={panelViewingImage}
          viewingIndex={panelViewingIndex}
          onImageClick={openPanelViewer}
          onClose={closePanelViewer}
        />
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
