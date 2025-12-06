import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, Send, X, Minimize2, HeadphonesIcon, User, ImageIcon, Video, FileText, Plus, Loader2, ChevronLeft, ChevronRight, ExternalLink, ShoppingBag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import type { Message, SuggestedQuestion, WelcomeBubble, ChatButton, ProductCard, ProductCardButton } from "@shared/schema";

interface MerchantConfig {
  online: boolean;
  primaryColor: string;
  iconUrl: string;
  iconSize: number;
  welcomeMessage: string;
  companyName: string;
  agentName: string;
  agentPhotoUrl: string;
}

interface NotificationSettings {
  incomingChatSound: string;
  incomingChatEnabled: boolean;
  chatReplySound: string;
  chatReplyEnabled: boolean;
}

interface ProductCardWithButtons extends ProductCard {
  buttons: ProductCardButton[];
}

interface ChatWidgetProps {
  merchantId: string;
  sessionId?: string;
  embedded?: boolean;
}

interface PendingMessage {
  clientId: string;
  from: string;
  content: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: string;
}

const generateClientId = () => `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export default function ChatWidget({ merchantId, sessionId: initialSessionId, embedded = false }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [sessionId] = useState(() => initialSessionId || `sess_${Math.random().toString(36).substring(2, 12)}`);
  const [message, setMessage] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [productCarouselIndex, setProductCarouselIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedServerMsgId = useRef<string | null>(null);
  
  const welcomeBubbleKey = `chatvice_welcome_bubble_dismissed_${merchantId}`;
  const [welcomeBubbleDismissedAt, setWelcomeBubbleDismissedAt] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem(welcomeBubbleKey);
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  });
  
  const dismissWelcomeBubble = () => {
    const now = Date.now();
    setWelcomeBubbleDismissedAt(now);
    try {
      sessionStorage.setItem(welcomeBubbleKey, now.toString());
    } catch {}
  };

  const showWelcomeBubble = welcomeBubbleDismissedAt === null;

  const { data: merchantConfig } = useQuery<MerchantConfig>({
    queryKey: ["/api/merchant/status", merchantId],
    enabled: !!merchantId,
  });

  const { data: serverMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages", sessionId],
    enabled: !!sessionId && isOpen,
    refetchInterval: 2000,
  });

  const { data: suggestedQuestions = [] } = useQuery<SuggestedQuestion[]>({
    queryKey: [`/api/widget/suggested-questions/${merchantId}`],
    enabled: !!merchantId && isOpen,
  });

  const { data: welcomeBubble } = useQuery<WelcomeBubble>({
    queryKey: [`/api/widget/${merchantId}/welcome-bubble`],
    enabled: !!merchantId && !isOpen,
  });

  const { data: chatButtons = [] } = useQuery<ChatButton[]>({
    queryKey: [`/api/widget/${merchantId}/chat-buttons`],
    enabled: !!merchantId && isOpen,
  });

  const { data: productCards = [] } = useQuery<ProductCardWithButtons[]>({
    queryKey: [`/api/widget/${merchantId}/product-cards`],
    enabled: !!merchantId && isOpen,
  });

  const { data: notificationSettings } = useQuery<NotificationSettings>({
    queryKey: [`/api/widget/${merchantId}/notification-settings`],
    enabled: !!merchantId,
  });

  const playNotificationSound = (type: "incoming" | "reply") => {
    if (!notificationSettings) return;
    
    const enabled = type === "incoming" ? notificationSettings.incomingChatEnabled : notificationSettings.chatReplyEnabled;
    const sound = type === "incoming" ? notificationSettings.incomingChatSound : notificationSettings.chatReplySound;
    
    if (!enabled || sound === "none") return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      let soundUrl: string | null = null;
      
      if (sound === "default") {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.stop(audioContext.currentTime + 0.2);
        return;
      }
      
      if (sound && sound.startsWith("/uploads/")) {
        soundUrl = sound;
      }
      
      if (soundUrl) {
        audioRef.current = new Audio(soundUrl);
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
      }
    } catch {}
  };

  const findMatchingButtons = (messageContent: string): ChatButton[] => {
    if (!chatButtons.length) return [];
    
    const lowerContent = messageContent.toLowerCase();
    return chatButtons.filter(btn => {
      if (!btn.triggerWord) return false;
      const triggers = btn.triggerWord.toLowerCase().split(",").map(t => t.trim());
      return triggers.some(trigger => lowerContent.includes(trigger));
    });
  };

  const shouldShowProducts = (messageContent: string): boolean => {
    if (!productCards.length) return false;
    const productTriggers = ["product", "produk", "recommend", "rekomendasi", "buy", "beli", "shop", "toko", "item", "barang", "catalog", "katalog"];
    const lowerContent = messageContent.toLowerCase();
    return productTriggers.some(trigger => lowerContent.includes(trigger));
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userMessage, clientId }: { userMessage: string; clientId: string }) => {
      const response = await apiRequest("POST", "/api/chat/ask", {
        merchantId,
        sessionId,
        message: userMessage,
        clientMessageId: clientId,
      });
      return response.json() as Promise<{ answer: string; mode: string; clientMessageId?: string; responseClientId?: string }>;
    },
    onSuccess: (data) => {
      setPendingMessages((prev) => [
        ...prev,
        { 
          clientId: data.responseClientId || generateClientId(),
          from: data.mode === "HUMAN" ? "system" : "chatvice", 
          content: data.answer, 
          timestamp: new Date(),
        },
      ]);
      
      playNotificationSound("reply");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", sessionId] });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages]);

  useEffect(() => {
    if (isOpen && allMessages.length === 0 && merchantConfig?.welcomeMessage && !serverMessages?.length) {
      setPendingMessages([
        { clientId: "welcome", from: "chatvice", content: merchantConfig.welcomeMessage, timestamp: new Date() },
      ]);
    }
  }, [isOpen, merchantConfig, serverMessages]);

  const handleSend = () => {
    if (!message.trim()) return;
    const userMessage = message.trim();
    const clientId = generateClientId();
    setPendingMessages((prev) => [...prev, { clientId, from: "user", content: userMessage, timestamp: new Date() }]);
    setMessage("");
    sendMessageMutation.mutate({ userMessage, clientId });
  };

  const useSuggestedQuestionMutation = useMutation({
    mutationFn: async (sq: SuggestedQuestion) => {
      const response = await apiRequest("POST", "/api/widget/suggested-questions/use", {
        merchantId,
        sessionId,
        questionId: sq.id,
      });
      return response.json() as Promise<{ sessionId: string; answer: string }>;
    },
    onSuccess: (data) => {
      setPendingMessages((prev) => [
        ...prev,
        { 
          clientId: generateClientId(),
          from: "chatvice", 
          content: data.answer, 
          timestamp: new Date(),
        },
      ]);
      playNotificationSound("reply");
      queryClient.invalidateQueries({ queryKey: ["/api/messages", sessionId] });
    },
    onError: () => {
      setPendingMessages((prev) => [
        ...prev,
        { clientId: generateClientId(), from: "chatvice", content: "I'm sorry, I couldn't process that quick question. Please type your question in the chat below and I'll be happy to help!", timestamp: new Date() },
      ]);
    },
  });

  const handleSuggestedQuestionClick = (sq: SuggestedQuestion) => {
    setPendingMessages((prev) => [
      ...prev,
      { clientId: generateClientId(), from: "user", content: sq.question, timestamp: new Date() },
    ]);
    useSuggestedQuestionMutation.mutate(sq);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (file: File, type: "photo" | "video" | "document") => {
    if (!file) return;
    
    setIsUploadingMedia(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("merchantId", merchantId);
      formData.append("sessionId", sessionId);
      formData.append("type", type);
      
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const data = await response.json();
      
      const typeLabels: Record<string, string> = {
        photo: "Photo attached",
        video: "Video attached",
        document: "Document attached"
      };
      
      const clientId = generateClientId();
      setPendingMessages((prev) => [
        ...prev,
        { 
          clientId,
          from: "user", 
          content: `[${typeLabels[type]}]`,
          timestamp: new Date(),
          mediaUrl: data.url,
          mediaType: type
        },
      ]);
      
      const messageLabels: Record<string, string> = {
        photo: "Customer sent a photo",
        video: "Customer sent a video",
        document: "Customer sent a document"
      };
      
      sendMessageMutation.mutate({ userMessage: `[${messageLabels[type]}]`, clientId });
    } catch {
      setPendingMessages((prev) => [
        ...prev,
        { clientId: generateClientId(), from: "chatvice", content: "Sorry, I couldn't upload that file. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  };

  const handleChatButtonClick = (button: ChatButton) => {
    if (button.buttonType === "link" && button.url) {
      window.open(button.url, "_blank");
    } else if (button.buttonType === "action") {
      const clientId = generateClientId();
      setPendingMessages((prev) => [
        ...prev,
        { clientId, from: "user", content: button.label, timestamp: new Date() },
      ]);
      sendMessageMutation.mutate({ userMessage: button.label, clientId });
    }
  };

  const handleWelcomeBubbleButtonClick = (url: string | null) => {
    dismissWelcomeBubble();
    if (url) {
      window.open(url, "_blank");
    } else {
      setIsOpen(true);
    }
  };

  const primaryColor = merchantConfig?.primaryColor || "#6b5dfc";
  const iconSize = merchantConfig?.iconSize || 70;
  const isOnline = merchantConfig?.online ?? true;

  interface ProcessedMessage {
    from: string;
    content: string;
    timestamp: Date;
    mediaUrl?: string;
    mediaType?: string;
    showProducts?: boolean;
    showButtons?: ChatButton[];
    id?: string;
  }

  const processMessage = (msg: any, msgId: string): ProcessedMessage => {
    const content = msg.content || "";
    const from = msg.from || (msg.sender === "customer" ? "user" : "chatvice");
    
    if (from === "user") {
      return {
        from,
        content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        mediaUrl: msg.mediaUrl,
        mediaType: msg.mediaType,
        id: msgId,
      };
    }
    
    const matchingButtons = findMatchingButtons(content);
    const showProducts = shouldShowProducts(content);
    
    return {
      from,
      content,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      showProducts,
      showButtons: matchingButtons.length > 0 ? matchingButtons : undefined,
      id: msgId,
    };
  };

  const allMessages: ProcessedMessage[] = useMemo(() => {
    const serverMsgsById = new Map<string, Message>();
    const sortedServerMsgs = [...(serverMessages || [])].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return aTime - bTime;
    });
    
    sortedServerMsgs.forEach(msg => {
      if (msg.id) serverMsgsById.set(msg.id, msg);
    });
    
    const processedFromServer = sortedServerMsgs.map(msg => {
      const from = msg.from === "customer" ? "user" : (msg.from === "supervisor" ? "supervisor" : "chatvice");
      return processMessage({
        from,
        content: msg.content || "",
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }, msg.id || `server_${Math.random()}`);
    });
    
    const pendingNotOnServer = pendingMessages.filter(pending => {
      for (const serverMsg of sortedServerMsgs) {
        if (serverMsg.clientMessageId === pending.clientId) return false;
        if (serverMsg.content === pending.content && 
            serverMsg.from === (pending.from === "user" ? "customer" : pending.from)) {
          const serverTime = serverMsg.timestamp ? new Date(serverMsg.timestamp).getTime() : 0;
          const pendingTime = pending.timestamp.getTime();
          if (Math.abs(serverTime - pendingTime) < 10000) return false;
        }
      }
      return true;
    });
    
    const processedPending = pendingNotOnServer.map(pending => 
      processMessage(pending, pending.clientId)
    );
    
    return [...processedFromServer, ...processedPending].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }, [serverMessages, pendingMessages, chatButtons, productCards]);

  useEffect(() => {
    if (!serverMessages || serverMessages.length === 0) return;
    
    const lastServerMsg = serverMessages[serverMessages.length - 1];
    if (!lastServerMsg?.id) return;
    
    if (lastProcessedServerMsgId.current !== lastServerMsg.id) {
      const isFromOthers = lastServerMsg.from !== "customer";
      if (isFromOthers && lastProcessedServerMsgId.current !== null) {
        playNotificationSound("incoming");
      }
      lastProcessedServerMsgId.current = lastServerMsg.id;
    }
  }, [serverMessages]);

  if (!embedded && !isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {showWelcomeBubble && welcomeBubble?.isEnabled && (
          <div 
            className="bg-card rounded-2xl shadow-xl p-4 w-72 border border-border animate-in slide-in-from-bottom-5 fade-in duration-300"
            data-testid="welcome-bubble-container"
          >
            <button
              onClick={dismissWelcomeBubble}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted"
              data-testid="button-close-welcome-bubble"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="mb-3">
              <p className="font-semibold text-base" data-testid="text-welcome-headline">
                {welcomeBubble.headline}
              </p>
              <p className="text-sm text-muted-foreground mt-1" data-testid="text-welcome-message">
                {welcomeBubble.message}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-white"
                style={{ backgroundColor: welcomeBubble.button1Color || primaryColor }}
                onClick={() => handleWelcomeBubbleButtonClick(welcomeBubble.button1Url || null)}
                data-testid="button-welcome-primary"
              >
                {welcomeBubble.button1Label}
              </Button>
              {welcomeBubble.button2Label && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  style={{ 
                    borderColor: welcomeBubble.button2Color || "#1a1a1a",
                    color: welcomeBubble.button2Color || "#1a1a1a"
                  }}
                  onClick={() => handleWelcomeBubbleButtonClick(welcomeBubble.button2Url || null)}
                  data-testid="button-welcome-secondary"
                >
                  {welcomeBubble.button2Label}
                </Button>
              )}
            </div>
          </div>
        )}
        
        <button
          onClick={() => {
            dismissWelcomeBubble();
            setIsOpen(true);
          }}
          className="rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
          style={{
            width: iconSize,
            height: iconSize,
            backgroundColor: primaryColor,
          }}
          data-testid="button-open-widget"
        >
          {merchantConfig?.iconUrl ? (
            <img
              src={merchantConfig.iconUrl}
              alt="Chat"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <Bot className="w-1/2 h-1/2 text-white" />
          )}
          <span
            className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white ${
              isOnline ? "bg-status-online" : "bg-status-offline"
            }`}
          />
        </button>
      </div>
    );
  }

  const ProductCarousel = ({ cards }: { cards: ProductCardWithButtons[] }) => {
    const visibleCards = 1;
    const maxIndex = Math.max(0, cards.length - visibleCards);
    
    return (
      <div className="w-full mt-3" data-testid="product-carousel">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag className="w-4 h-4" style={{ color: primaryColor }} />
          <span className="text-xs font-medium">Recommended Products</span>
        </div>
        <div className="relative">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-300 gap-2"
              style={{ transform: `translateX(-${productCarouselIndex * 100}%)` }}
            >
              {cards.map((card) => (
                <Card 
                  key={card.id} 
                  className="flex-shrink-0 w-full border-border"
                  data-testid={`card-product-${card.id}`}
                >
                  {card.imageUrl && (
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <img 
                        src={card.imageUrl} 
                        alt={card.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-3">
                    <h4 className="font-semibold text-sm line-clamp-1">{card.title}</h4>
                    {card.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{card.description}</p>
                    )}
                    {card.price && (
                      <p className="font-bold text-sm mt-2" style={{ color: primaryColor }}>{card.price}</p>
                    )}
                    <div className="flex gap-1 mt-2">
                      {card.buttons?.slice(0, 3).map((btn) => (
                        <Button
                          key={btn.id}
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs gap-1"
                          onClick={() => btn.url && window.open(btn.url, "_blank")}
                          data-testid={`button-product-${btn.id}`}
                        >
                          {btn.buttonType === "link" && <ExternalLink className="w-3 h-3" />}
                          {btn.label}
                        </Button>
                      ))}
                      {(!card.buttons || card.buttons.length === 0) && card.sourceUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs gap-1"
                          onClick={() => card.sourceUrl && window.open(card.sourceUrl, "_blank")}
                          data-testid={`button-product-view-${card.id}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {cards.length > visibleCards && (
            <>
              <Button
                size="icon"
                variant="outline"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 rounded-full shadow-md"
                onClick={() => setProductCarouselIndex(Math.max(0, productCarouselIndex - 1))}
                disabled={productCarouselIndex === 0}
                data-testid="button-carousel-prev"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-6 w-6 rounded-full shadow-md"
                onClick={() => setProductCarouselIndex(Math.min(maxIndex, productCarouselIndex + 1))}
                disabled={productCarouselIndex >= maxIndex}
                data-testid="button-carousel-next"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
        
        {cards.length > 1 && (
          <div className="flex justify-center gap-1 mt-2">
            {cards.map((_, idx) => (
              <button
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === productCarouselIndex ? "bg-primary" : "bg-muted"
                }`}
                onClick={() => setProductCarouselIndex(idx)}
                data-testid={`button-carousel-dot-${idx}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const ChatButtonsDisplay = ({ buttons }: { buttons: ChatButton[] }) => (
    <div className="flex flex-wrap gap-1.5 mt-2" data-testid="chat-buttons-container">
      {buttons.map((btn) => (
        <Button
          key={btn.id}
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => handleChatButtonClick(btn)}
          data-testid={`button-chat-action-${btn.id}`}
        >
          {btn.buttonType === "link" && <ExternalLink className="w-3 h-3" />}
          {btn.label}
        </Button>
      ))}
    </div>
  );

  return (
    <div
      className={`${
        embedded ? "w-full h-full" : "fixed bottom-5 right-5 w-[360px] h-[520px] z-50"
      } bg-card rounded-2xl shadow-xl overflow-hidden flex flex-col border border-card-border`}
      data-testid="widget-container"
    >
      <div
        className="p-4 flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            {merchantConfig?.agentPhotoUrl ? (
              <img
                src={merchantConfig.agentPhotoUrl}
                alt="Agent"
                className="w-full h-full object-cover"
              />
            ) : merchantConfig?.iconUrl ? (
              <img
                src={merchantConfig.iconUrl}
                alt="Chat"
                className="w-full h-full object-cover"
              />
            ) : (
              <Bot className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="text-white">
            <p className="font-medium text-sm">{merchantConfig?.agentName || "Chatvice"}</p>
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? "bg-status-online" : "bg-status-offline"}`}
              />
              <span className="text-xs opacity-80">{isOnline ? "Online" : "Offline"}</span>
            </div>
          </div>
        </div>
        {!embedded && (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
              data-testid="button-minimize-widget"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-widget"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {allMessages.map((msg, index) => (
            <div key={msg.id || index}>
              <div
                className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.from !== "user" && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    {msg.from === "supervisor" ? (
                      <HeadphonesIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                    ) : merchantConfig?.agentPhotoUrl ? (
                      <img src={merchantConfig.agentPhotoUrl} alt="Agent" className="w-full h-full object-cover" />
                    ) : (
                      <Bot className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-3 text-sm ${
                    msg.from === "user"
                      ? "rounded-2xl rounded-br-sm text-white"
                      : "bg-muted rounded-2xl rounded-bl-sm"
                  }`}
                  style={msg.from === "user" ? { backgroundColor: primaryColor } : undefined}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.from === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              
              {msg.from !== "user" && msg.showButtons && msg.showButtons.length > 0 && (
                <div className="ml-9">
                  <ChatButtonsDisplay buttons={msg.showButtons} />
                </div>
              )}
              
              {msg.from !== "user" && msg.showProducts && productCards.length > 0 && (
                <div className="ml-9">
                  <ProductCarousel cards={productCards} />
                </div>
              )}
            </div>
          ))}
          {sendMessageMutation.isPending && (
            <div className="flex gap-2 justify-start">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                {merchantConfig?.agentPhotoUrl ? (
                  <img src={merchantConfig.agentPhotoUrl} alt="Agent" className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                )}
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {suggestedQuestions.length > 0 && (
        <div className="px-4 py-2 border-t border-border/50 bg-background/80 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground mb-1.5">Quick questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.slice(0, 5).map((sq) => (
              <Button
                key={sq.id}
                variant="outline"
                size="sm"
                className="h-auto py-1 px-2.5 text-xs font-normal whitespace-normal text-left hover-elevate"
                onClick={() => handleSuggestedQuestionClick(sq)}
                disabled={sendMessageMutation.isPending || useSuggestedQuestionMutation.isPending}
                data-testid={`button-suggested-question-${sq.id}`}
              >
                {sq.question}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file, "photo");
            setShowUploadMenu(false);
          }}
          data-testid="input-file-photo"
        />
        <input
          type="file"
          ref={videoInputRef}
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file, "video");
            setShowUploadMenu(false);
          }}
          data-testid="input-file-video"
        />
        <input
          type="file"
          ref={documentInputRef}
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file, "document");
            setShowUploadMenu(false);
          }}
          data-testid="input-file-document"
        />
        <div className="flex gap-2 items-center">
          <Popover open={showUploadMenu} onOpenChange={setShowUploadMenu}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={!isOnline || isUploadingMedia}
                data-testid="button-upload-menu"
              >
                {isUploadingMedia ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-40 p-1">
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 h-9"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  data-testid="button-upload-image"
                >
                  <ImageIcon className="w-4 h-4" />
                  Image
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 h-9"
                  onClick={() => {
                    videoInputRef.current?.click();
                  }}
                  data-testid="button-upload-video"
                >
                  <Video className="w-4 h-4" />
                  Video
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-2 h-9"
                  onClick={() => {
                    documentInputRef.current?.click();
                  }}
                  data-testid="button-upload-document"
                >
                  <FileText className="w-4 h-4" />
                  Document
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!isOnline || isUploadingMedia}
            className="flex-1"
            data-testid="input-widget-message"
          />
          <Button
            onClick={handleSend}
            disabled={sendMessageMutation.isPending || !message.trim() || !isOnline || isUploadingMedia}
            style={{ backgroundColor: primaryColor }}
            data-testid="button-widget-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!isOnline && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            We're currently offline. Please try again later.
          </p>
        )}
      </div>
    </div>
  );
}
