import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, Send, X, Shrink, Square, Minimize2, Maximize2, HeadphonesIcon, User, ImageIcon, Video, FileText, Plus, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ExternalLink, ShoppingBag, EyeOff, GripVertical, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import type { Message, SuggestedQuestion, WelcomeBubble, ChatButton, ProductCard, ProductCardButton } from "@shared/schema";
import { getImageLocation, type LocationData } from "@/lib/location-utils";

interface MerchantConfig {
  online: boolean;
  primaryColor: string;
  iconUrl: string;
  iconSize: number;
  iconWidth?: number;
  iconHeight?: number;
  useCustomIconDimensions?: boolean;
  welcomeMessage: string;
  companyName: string;
  agentName: string;
  agentPhotoUrl: string;
  socialMediaEnabled?: boolean;
  socialIconStyle?: "colored" | "silhouette";
  socialInstagram?: string;
  socialFacebook?: string;
  socialTelegram?: string;
  socialWhatsapp?: string;
  socialDiscord?: string;
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
  previewMode?: boolean;
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

interface ParsedPart {
  type: "text" | "button" | "link";
  content: string;
  action?: string;
  url?: string;
}

function parseMessageContent(content: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const regex = /\[BTN:([^\]:]+)(?::([^\]]+))?\]|\[LINK:([^\]:]+):([^\]]+)\]/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: "text", content: textBefore });
      }
    }
    
    if (match[1]) {
      parts.push({ 
        type: "button", 
        content: match[1], 
        action: match[2] || match[1] 
      });
    } else if (match[3] && match[4]) {
      parts.push({ 
        type: "link", 
        content: match[3], 
        url: match[4] 
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining) {
      parts.push({ type: "text", content: remaining });
    }
  }
  
  if (parts.length === 0) {
    parts.push({ type: "text", content });
  }
  
  return parts;
}

export default function ChatWidget({ merchantId, sessionId: initialSessionId, embedded = false, previewMode = false }: ChatWidgetProps) {
  const urlParams = new URLSearchParams(window.location.search);
  const showCloseButton = urlParams.get("showClose") === "true";
  // Widget is externally embedded when showClose=true (external widget shows close button)
  const isExternalEmbed = showCloseButton;
  
  const [isOpen, setIsOpen] = useState(embedded);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionId] = useState(() => initialSessionId || `sess_${Math.random().toString(36).substring(2, 12)}`);
  const [message, setMessage] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  
  // Customer name form state
  const customerNameKey = `chatvice_customer_name_${merchantId}_${sessionId}`;
  const [customerName, setCustomerName] = useState(() => {
    if (previewMode) return "";
    try {
      return sessionStorage.getItem(customerNameKey) || "";
    } catch {
      return "";
    }
  });
  const [hasSubmittedName, setHasSubmittedName] = useState(() => {
    if (previewMode) return false;
    try {
      return sessionStorage.getItem(`${customerNameKey}_submitted`) === "true";
    } catch {
      return false;
    }
  });
  const [nameInputValue, setNameInputValue] = useState("");
  const [nameError, setNameError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [productCarouselIndex, setProductCarouselIndex] = useState(0);
  const [viewingImage, setViewingImage] = useState<{ url: string; filename: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedServerMsgId = useRef<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isWidgetHidden, setIsWidgetHidden] = useState(() => {
    if (previewMode) return false;
    try {
      return localStorage.getItem(`chatvice_widget_hidden_${merchantId}`) === "true";
    } catch {
      return false;
    }
  });
  const [socialIconsExpanded, setSocialIconsExpanded] = useState(true);
  const [socialPanelClosing, setSocialPanelClosing] = useState(false);
  
  const handleCloseSocialPanel = () => {
    setSocialPanelClosing(true);
    setTimeout(() => {
      setSocialIconsExpanded(false);
      setSocialPanelClosing(false);
    }, 400);
  };
  const [unreadCount, setUnreadCount] = useState(0);
  const [widgetPosition, setWidgetPosition] = useState(() => {
    if (previewMode) return 20;
    try {
      const saved = localStorage.getItem(`chatvice_widget_position_${merchantId}`);
      return saved ? parseInt(saved, 10) : 20;
    } catch {
      return 20;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartY = useRef(0);
  const dragStartPosition = useRef(0);
  
  const welcomeBubbleKey = `chatvice_welcome_bubble_dismissed_${merchantId}`;
  const [welcomeBubbleDismissedAt, setWelcomeBubbleDismissedAt] = useState<number | null>(() => {
    if (previewMode) return null;
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
    if (!previewMode) {
      try {
        sessionStorage.setItem(welcomeBubbleKey, now.toString());
      } catch {}
    }
  };

  const { data: merchantConfig } = useQuery<MerchantConfig>({
    queryKey: ["/api/merchant/status", merchantId],
    enabled: !!merchantId,
  });

  const { data: serverMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages", sessionId],
    enabled: !!sessionId,
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

  const reappearIntervalMs = (welcomeBubble?.reappearInterval ?? 60) * 1000;
  const showWelcomeBubble = welcomeBubbleDismissedAt === null || 
    (Date.now() - welcomeBubbleDismissedAt >= reappearIntervalMs);

  useEffect(() => {
    if (welcomeBubbleDismissedAt !== null && reappearIntervalMs > 0) {
      const timeRemaining = reappearIntervalMs - (Date.now() - welcomeBubbleDismissedAt);
      if (timeRemaining > 0) {
        const timer = setTimeout(() => {
          setWelcomeBubbleDismissedAt(null);
          if (!previewMode) {
            try {
              sessionStorage.removeItem(welcomeBubbleKey);
            } catch {}
          }
        }, timeRemaining);
        return () => clearTimeout(timer);
      } else {
        setWelcomeBubbleDismissedAt(null);
        if (!previewMode) {
          try {
            sessionStorage.removeItem(welcomeBubbleKey);
          } catch {}
        }
      }
    }
  }, [welcomeBubbleDismissedAt, reappearIntervalMs, welcomeBubbleKey, previewMode]);

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

  interface ProductRecommendationSettings {
    aiAutoRecommendEnabled: boolean;
    triggerKeywords: string;
    aiContextTriggerEnabled: boolean;
    maxProductsPerRecommendation: number;
    showPriceInRecommendation: boolean;
    ctaButtonEnabled: boolean;
    ctaButtonText: string;
    ctaButtonColor: string;
  }

  const { data: productRecommendSettings } = useQuery<ProductRecommendationSettings>({
    queryKey: [`/api/widget/${merchantId}/product-recommendation-settings`],
    enabled: !!merchantId,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInitializedRef = useRef(false);
  
  const initAudio = useCallback(() => {
    if (audioInitializedRef.current) return;
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audioInitializedRef.current = true;
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
  }, []);

  // Initialize audio on first user interaction to enable sound playback
  useEffect(() => {
    const handleFirstInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [initAudio]);

  const playNotificationSound = (type: "incoming" | "reply") => {
    if (!notificationSettings) return;
    
    const enabled = type === "incoming" ? notificationSettings.incomingChatEnabled : notificationSettings.chatReplyEnabled;
    const sound = type === "incoming" ? notificationSettings.incomingChatSound : notificationSettings.chatReplySound;
    
    if (!enabled || sound === "none") return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      if (sound === "default") {
        if (!audioContextRef.current) {
          initAudio();
        }
        
        if (audioContextRef.current) {
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
          
          const oscillator = audioContextRef.current.createOscillator();
          const gainNode = audioContextRef.current.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = "sine";
          gainNode.gain.value = 0.3;
          
          oscillator.start();
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);
          oscillator.stop(audioContextRef.current.currentTime + 0.3);
        }
        return;
      }
      
      if (sound && sound.startsWith("/uploads/")) {
        audioRef.current = new Audio(sound);
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch((e) => {
          console.warn("Audio playback failed:", e);
        });
      }
    } catch (e) {
      console.warn("Sound playback error:", e);
    }
  };
  
  const handleWidgetOpen = () => {
    initAudio();
    setIsOpen(true);
  };
  
  // Centralized widget close handler - always resets fullscreen state
  const handleWidgetClose = useCallback(() => {
    setIsFullscreen(false);
    setIsOpen(false);
  }, []);

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
    if (!productRecommendSettings?.aiAutoRecommendEnabled) return false;
    
    const triggerKeywords = productRecommendSettings?.triggerKeywords || "product,recommend,buy,shop,item,catalog";
    const productTriggers = triggerKeywords.toLowerCase().split(",").map(t => t.trim()).filter(t => t.length > 0);
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
  }, [pendingMessages, serverMessages]);

  useEffect(() => {
    if (isOpen && pendingMessages.length === 0 && merchantConfig?.welcomeMessage && !serverMessages?.length) {
      setPendingMessages([
        { clientId: "welcome", from: "chatvice", content: merchantConfig.welcomeMessage, timestamp: new Date() },
      ]);
    }
  }, [isOpen, merchantConfig, serverMessages, pendingMessages.length]);

  // Notify parent frame that widget is ready for communication
  useEffect(() => {
    if (embedded && showCloseButton && window.parent !== window) {
      window.parent.postMessage({ type: "chatvice-ready" }, "*");
    }
  }, [embedded, showCloseButton]);

  const handleSend = () => {
    if (!message.trim()) return;
    const userMessage = message.trim();
    const clientId = generateClientId();
    setPendingMessages((prev) => [...prev, { clientId, from: "user", content: userMessage, timestamp: new Date() }]);
    setMessage("");
    sendMessageMutation.mutate({ userMessage, clientId });
  };
  
  const sendButtonMessage = (buttonAction: string) => {
    if (!buttonAction.trim() || sendMessageMutation.isPending) return;
    const clientId = generateClientId();
    setPendingMessages((prev) => [...prev, { clientId, from: "user", content: buttonAction, timestamp: new Date() }]);
    sendMessageMutation.mutate({ userMessage: buttonAction, clientId });
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

  // Start chat mutation with customer name
  const startChatMutation = useMutation({
    mutationFn: async ({ name, initialMessage }: { name: string; initialMessage: string }) => {
      const response = await apiRequest("POST", "/api/widget/start-chat", {
        merchantId,
        sessionId,
        customerName: name,
        initialMessage,
      });
      return response.json() as Promise<{ success: boolean; answer: string; error?: string; sanitizedName?: string }>;
    },
    onSuccess: (data) => {
      if (data.success) {
        const finalName = data.sanitizedName || nameInputValue.trim();
        setCustomerName(finalName);
        setHasSubmittedName(true);
        if (!previewMode) {
          try {
            sessionStorage.setItem(customerNameKey, finalName);
            sessionStorage.setItem(`${customerNameKey}_submitted`, "true");
          } catch {}
        }
        
        // Add initial message from user and AI response
        const defaultMessage = "Halo kak, ada yang mau saya tanyakan";
        setPendingMessages([
          { clientId: generateClientId(), from: "user", content: defaultMessage, timestamp: new Date() },
          { clientId: generateClientId(), from: "chatvice", content: data.answer, timestamp: new Date() },
        ]);
        playNotificationSound("reply");
        queryClient.invalidateQueries({ queryKey: ["/api/messages", sessionId] });
      } else {
        setNameError(data.error || "Invalid name. Please try again.");
      }
    },
    onError: () => {
      setNameError("Failed to start chat. Please try again.");
    },
  });

  const handleNameSubmit = () => {
    const name = nameInputValue.trim();
    if (!name) {
      setNameError("Please enter your name");
      return;
    }
    if (name.length < 2) {
      setNameError("Name must be at least 2 characters");
      return;
    }
    if (name.length > 50) {
      setNameError("Name is too long");
      return;
    }
    setNameError("");
    startChatMutation.mutate({ 
      name, 
      initialMessage: "Halo kak, ada yang mau saya tanyakan" 
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleWidgetHidden = useCallback(() => {
    const newValue = !isWidgetHidden;
    setIsWidgetHidden(newValue);
    if (!previewMode) {
      try {
        localStorage.setItem(`chatvice_widget_hidden_${merchantId}`, String(newValue));
      } catch {}
    }
  }, [isWidgetHidden, merchantId, previewMode]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartPosition.current = widgetPosition;
    e.preventDefault();
  }, [widgetPosition]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY;
    const newPosition = Math.max(20, Math.min(window.innerHeight - 100, dragStartPosition.current + deltaY));
    setWidgetPosition(newPosition);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (!previewMode) {
        try {
          localStorage.setItem(`chatvice_widget_position_${merchantId}`, String(widgetPosition));
        } catch {}
      }
    }
  }, [isDragging, widgetPosition, merchantId, previewMode]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleFileUpload = async (file: File, type: "photo" | "video" | "document") => {
    if (!file) return;
    
    setIsUploadingMedia(true);
    
    try {
      let locationData: LocationData | null = null;
      
      if (type === "photo") {
        locationData = await getImageLocation(file);
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("merchantId", merchantId);
      formData.append("sessionId", sessionId);
      formData.append("type", type);
      
      if (locationData) {
        formData.append("locationData", JSON.stringify(locationData));
      }
      
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const data = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/messages", sessionId] });
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
      handleWidgetOpen();
    }
  };

  const primaryColor = merchantConfig?.primaryColor || "#6b5dfc";
  const iconSize = merchantConfig?.iconSize || 70;
  const iconWidth = merchantConfig?.iconWidth || iconSize;
  const iconHeight = merchantConfig?.iconHeight || iconSize;
  const useCustomIconDimensions = merchantConfig?.useCustomIconDimensions || false;
  const isOnline = merchantConfig?.online ?? true;

  interface ProcessedMessage {
    from: string;
    content: string;
    timestamp: Date;
    mediaUrl?: string;
    mediaType?: string;
    messageType?: string;
    payload?: any;
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
        messageType: msg.messageType,
        payload: msg.payload,
        id: msgId,
      };
    }
    
    const matchingButtons = findMatchingButtons(content);
    const showProducts = shouldShowProducts(content);
    
    return {
      from,
      content,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      messageType: msg.messageType,
      payload: msg.payload,
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
        mediaUrl: (msg as any).mediaUrl,
        mediaType: (msg as any).mediaType,
        messageType: (msg as any).messageType,
        payload: (msg as any).payload,
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
        // Play notification sound for incoming messages from AI/supervisor
        playNotificationSound("incoming");
        
        // Increment unread count if widget is minimized
        if (!isOpen && !embedded) {
          setUnreadCount(prev => prev + 1);
        }
      }
      lastProcessedServerMsgId.current = lastServerMsg.id;
    }
  }, [serverMessages, isOpen, embedded]);

  // Clear unread count when widget opens
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const positionClass = previewMode ? "absolute" : "fixed";
  
  const FloatingButton = () => {
    if (embedded || isOpen) return null;
    
    if (isWidgetHidden) {
      return (
        <button
          onClick={toggleWidgetHidden}
          className={`${positionClass} right-0 z-50 bg-primary/90 hover:bg-primary text-white px-2 py-3 rounded-l-lg shadow-lg transition-all`}
          style={{ bottom: previewMode ? "20px" : widgetPosition }}
          data-testid="button-show-widget"
        >
          <Bot className="w-5 h-5" />
        </button>
      );
    }
    
    return (
      <div 
        className={`${positionClass} right-5 z-50 flex flex-col items-end gap-3`}
        style={{ bottom: previewMode ? "20px" : widgetPosition }}
      >
        {showWelcomeBubble && welcomeBubble && welcomeBubble.isEnabled && (
          <div className="w-52 animate-in slide-in-from-bottom-5 fade-in duration-300" data-testid="welcome-bubble-container">
            {welcomeBubble.promoImageEnabled && welcomeBubble.promoImageUrl && (
              <div className="relative z-20" style={{ marginBottom: '-16px' }}>
                <img 
                  src={welcomeBubble.promoImageUrl} 
                  alt="Promotion" 
                  className="w-full h-auto object-contain rounded-t-xl"
                  onLoad={() => console.log('[Widget] Promo image loaded:', welcomeBubble.promoImageUrl)}
                  onError={(e) => {
                    console.error('[Widget] Promo image failed to load:', welcomeBubble.promoImageUrl);
                    (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                  }}
                  data-testid="img-welcome-promo"
                />
              </div>
            )}
            <div 
              className={`bg-card shadow-xl px-4 pt-6 pb-4 border border-border relative z-10 ${welcomeBubble.promoImageEnabled && welcomeBubble.promoImageUrl ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}
            >
              <button
                onClick={dismissWelcomeBubble}
                className="absolute top-2 p-1 rounded-full hover:bg-muted z-30"
                style={{ right: '-2px' }}
                data-testid="button-close-welcome-bubble"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="mb-3 pr-4">
                <p className="font-semibold text-base" data-testid="text-welcome-headline">
                  {welcomeBubble.headline}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1" data-testid="text-welcome-message">
                  {welcomeBubble.message}
                </p>
              </div>
              <Button
                size="sm"
                className="w-full text-white"
                style={{ backgroundColor: welcomeBubble.buttonColor || primaryColor }}
                onClick={() => {
                  dismissWelcomeBubble();
                  handleWidgetOpen();
                }}
                data-testid="button-welcome-primary"
              >
                {welcomeBubble.buttonLabel || "Chat with us"}
              </Button>
            </div>
          </div>
        )}
        
        <div 
          className="relative group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isHovered && (
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-150">
              <button
                onClick={toggleWidgetHidden}
                className="w-8 h-8 bg-muted/90 hover:bg-muted rounded-full shadow-md transition-colors flex items-center justify-center"
                title="Hide widget"
                data-testid="button-hide-widget"
              >
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                className="w-8 h-8 bg-muted/90 hover:bg-muted rounded-full shadow-md cursor-grab active:cursor-grabbing transition-colors flex items-center justify-center"
                title="Drag to reposition"
                data-testid="button-drag-widget"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          
          <button
            onClick={() => {
              dismissWelcomeBubble();
              handleWidgetOpen();
            }}
            className="flex items-center justify-center transition-transform hover:scale-105 relative"
            style={{
              width: merchantConfig?.iconUrl ? iconWidth : iconSize,
              height: merchantConfig?.iconUrl ? iconHeight : iconSize,
              backgroundColor: merchantConfig?.iconUrl ? 'transparent' : primaryColor,
              borderRadius: merchantConfig?.iconUrl ? '0' : '50%',
              boxShadow: merchantConfig?.iconUrl ? 'none' : '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            }}
            data-testid="button-open-widget"
          >
            {merchantConfig?.iconUrl ? (
              <img
                src={merchantConfig.iconUrl}
                alt="Chat"
                className="w-full h-full object-contain drop-shadow-lg"
              />
            ) : (
              <Bot className="w-1/2 h-1/2 text-white" />
            )}
            {!merchantConfig?.iconUrl && (
              <span
                className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? "bg-status-online" : "bg-status-offline"
                }`}
              />
            )}
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse"
                data-testid="badge-unread-count"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  };
  
  if (!embedded && !isOpen) {
    return <FloatingButton />;
  }

  const ProductCarousel = ({ cards }: { cards: ProductCardWithButtons[] }) => {
    const displayCards = cards.slice(0, 2); // Limit to 2 cards max
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    
    const handleImageError = (cardId: string) => {
      setImageErrors(prev => ({ ...prev, [cardId]: true }));
    };

    const ctaEnabled = productRecommendSettings?.ctaButtonEnabled !== false;
    const ctaText = productRecommendSettings?.ctaButtonText || "View";
    const ctaColor = productRecommendSettings?.ctaButtonColor || primaryColor;
    
    return (
      <div className="w-full mt-2" data-testid="product-carousel">
        {/* Simple 2-column grid matching sketch design */}
        <div className="grid grid-cols-2 gap-2">
          {displayCards.map((card) => {
            const hasValidImage = card.imageUrl && !imageErrors[card.id];
            
            return (
              <div 
                key={card.id} 
                className="rounded-lg overflow-hidden border border-border bg-card"
                data-testid={`card-product-${card.id}`}
              >
                {/* Square IMAGE area - enforced square format */}
                <div 
                  className="aspect-square bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover-elevate"
                  onClick={() => card.sourceUrl && window.open(card.sourceUrl, "_blank")}
                >
                  {hasValidImage ? (
                    <img 
                      src={card.imageUrl || ""} 
                      alt={card.title}
                      className="w-full h-full object-contain"
                      onError={() => handleImageError(card.id)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground/50">
                      <ShoppingBag className="w-8 h-8" />
                      <span className="text-[10px] mt-1">No Image</span>
                    </div>
                  )}
                </div>
                
                {/* TEXT area below image */}
                <div className="p-2">
                  <h4 className="font-semibold text-xs line-clamp-2">{card.title}</h4>
                  {card.price && (
                    <p className="font-bold text-xs mt-1" style={{ color: primaryColor }}>{card.price}</p>
                  )}
                  {/* CTA Button */}
                  {ctaEnabled && (
                    <Button
                      size="sm"
                      className="w-full mt-2 h-7 text-[10px] font-medium"
                      style={{ backgroundColor: ctaColor, color: "#fff" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        card.sourceUrl && window.open(card.sourceUrl, "_blank");
                      }}
                      data-testid={`button-product-cta-${card.id}`}
                    >
                      {ctaText}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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

  // External embed uses borderless transparent design to show iframe's frosted glass
  const containerClasses = isExternalEmbed
    ? "w-full h-full bg-transparent overflow-hidden flex flex-col"
    : `${
        embedded 
          ? "w-full h-full" 
          : isFullscreen
            ? "fixed inset-4 z-50 animate-in fade-in duration-300"
            : `${positionClass} bottom-5 right-5 w-[360px] h-[520px] z-50 animate-in slide-in-from-bottom-5 fade-in duration-300`
      } bg-white/25 dark:bg-gray-900/25 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden flex flex-col border border-white/30 dark:border-gray-700/50`;

  return (
    <div
      className={containerClasses}
      style={{
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      data-testid="widget-container"
    >
      {/* Slim Header with drop shadow - z-10 to stay above social panel */}
      <div
        className="px-3 py-2 flex items-center justify-between shadow-md relative z-10"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
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
              <Bot className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="text-white">
            <p className="font-medium text-sm leading-tight">{merchantConfig?.agentName || "Chatvice"}</p>
            <div className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-status-online" : "bg-status-offline"}`}
              />
              <span className="text-[10px] opacity-80">{isOnline ? "Online" : "Offline"}</span>
            </div>
          </div>
        </div>
        
        {/* Get in Touch Toggle - inside header */}
        {merchantConfig?.socialMediaEnabled && (() => {
          const validUrl = (url: string | undefined) => {
            if (!url) return null;
            try {
              const parsed = new URL(url);
              if (parsed.protocol === "https:" || parsed.protocol === "http:") {
                return url;
              }
            } catch {}
            return null;
          };
          const hasSocialLinks = [
            validUrl(merchantConfig.socialInstagram),
            validUrl(merchantConfig.socialFacebook),
            validUrl(merchantConfig.socialTelegram),
            validUrl(merchantConfig.socialWhatsapp),
            validUrl(merchantConfig.socialDiscord),
          ].some(Boolean);
          
          if (!hasSocialLinks) return null;
          
          return (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-white/90 bg-white/15 hover:bg-white/25 transition-colors"
              onClick={() => {
                if (socialIconsExpanded) {
                  handleCloseSocialPanel();
                } else {
                  setSocialIconsExpanded(true);
                }
              }}
              data-testid="button-toggle-social-header"
            >
              Get in touch
              {socialIconsExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          );
        })()}
        
        <div className="flex gap-0.5 flex-shrink-0">
        {/* Fullscreen Toggle - Square for maximize, Minimize2 for minimize */}
        {!embedded && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 h-7 w-7"
                onClick={() => setIsFullscreen(!isFullscreen)}
                data-testid="button-fullscreen-widget"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{isFullscreen ? "Minimize" : "Maximize"}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Close button - X icon */}
        {(!embedded || showCloseButton) && (
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20 h-7 w-7"
            onClick={() => {
              if (embedded && showCloseButton) {
                window.parent.postMessage({ type: "chatvice-close" }, "*");
              } else {
                handleWidgetClose();
              }
            }}
            data-testid="button-close-widget"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
        </div>
      </div>
      
      {/* Social Media Panel - expandable below header */}
      {merchantConfig?.socialMediaEnabled && (socialIconsExpanded || socialPanelClosing) && (() => {
        const validUrl = (url: string | undefined) => {
          if (!url) return null;
          try {
            const parsed = new URL(url);
            if (parsed.protocol === "https:" || parsed.protocol === "http:") {
              return url;
            }
          } catch {}
          return null;
        };
        
        const useCustomIcons = (merchantConfig as any).socialUseCustomIcons;
        const socialLinks = [
          { url: validUrl(merchantConfig.socialInstagram), icon: "instagram", color: "#E4405F", customIcon: (merchantConfig as any).socialCustomInstagram },
          { url: validUrl(merchantConfig.socialFacebook), icon: "facebook", color: "#1877F2", customIcon: (merchantConfig as any).socialCustomFacebook },
          { url: validUrl(merchantConfig.socialTelegram), icon: "telegram", color: "#0088cc", customIcon: (merchantConfig as any).socialCustomTelegram },
          { url: validUrl(merchantConfig.socialWhatsapp), icon: "whatsapp", color: "#25D366", customIcon: (merchantConfig as any).socialCustomWhatsapp },
          { url: validUrl(merchantConfig.socialDiscord), icon: "discord", color: "#5865F2", customIcon: (merchantConfig as any).socialCustomDiscord },
        ].filter(s => s.url);
        
        if (socialLinks.length === 0) return null;
        
        const iconStyle = merchantConfig.socialIconStyle || "colored";
        
        return (
          <div 
            className="backdrop-blur-lg overflow-hidden"
            style={{ 
              backgroundColor: `${primaryColor}40`,
              animation: socialPanelClosing 
                ? 'slideUpSmooth 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                : 'slideDownSmooth 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            }}
          >
            <style>{`
              @keyframes slideDownSmooth {
                from {
                  opacity: 0;
                  max-height: 0;
                }
                to {
                  opacity: 1;
                  max-height: 60px;
                }
              }
              @keyframes slideUpSmooth {
                from {
                  opacity: 1;
                  max-height: 60px;
                }
                to {
                  opacity: 0;
                  max-height: 0;
                }
              }
            `}</style>
            
            {/* Social icons */}
            <div className="px-3 py-2 flex items-center justify-center gap-3">
                  {socialLinks.map(social => (
                    <a
                      key={social.icon}
                      href={social.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform overflow-hidden"
                      style={{ 
                        backgroundColor: useCustomIcons && social.customIcon ? "transparent" : (iconStyle === "colored" ? social.color : "rgba(255,255,255,0.2)")
                      }}
                      data-testid={`social-${social.icon}`}
                    >
                      {useCustomIcons && social.customIcon ? (
                        <img src={social.customIcon} alt={social.icon} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          {social.icon === "instagram" && (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                          )}
                          {social.icon === "facebook" && (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          )}
                          {social.icon === "telegram" && (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                            </svg>
                          )}
                          {social.icon === "whatsapp" && (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          )}
                          {social.icon === "discord" && (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
                            </svg>
                          )}
                        </>
                      )}
                    </a>
                  ))}
            </div>
          </div>
        );
      })()}

      {/* Customer name form - shown for new customers */}
      {!hasSubmittedName && !serverMessages?.length ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}20` }}>
            <User className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-center">Welcome!</h3>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            Please enter your name to start chatting with us.
          </p>
          
          <div className="w-full max-w-xs space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter your name"
                value={nameInputValue}
                onChange={(e) => {
                  setNameInputValue(e.target.value);
                  setNameError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleNameSubmit();
                  }
                }}
                className="text-center"
                data-testid="input-customer-name"
              />
              {nameError && (
                <p className="text-xs text-red-500 text-center" data-testid="text-name-error">
                  {nameError}
                </p>
              )}
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground mb-1">Your message:</p>
              <p className="text-sm italic">"Halo kak, ada yang mau saya tanyakan"</p>
            </div>
            
            <Button
              onClick={handleNameSubmit}
              disabled={startChatMutation.isPending || !nameInputValue.trim()}
              className="w-full text-white"
              style={{ backgroundColor: primaryColor }}
              data-testid="button-start-chat"
            >
              {startChatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Start Chat
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 min-h-0 p-4">
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
                  {!((msg as any).messageType === "media" && (msg as any).payload?.url) && 
                   !((msg as any).messageType === "product_offer" && (msg as any).payload?.productCard) &&
                   !msg.mediaUrl && (() => {
                    const isAiMessage = msg.from === "chatvice" || msg.from === "supervisor";
                    if (!isAiMessage) {
                      return <p className="whitespace-pre-wrap">{msg.content}</p>;
                    }
                    const parsed = parseMessageContent(msg.content);
                    const hasButtons = parsed.some(p => p.type === "button");
                    return (
                      <div className="text-sm">
                        {parsed.map((part, partIndex) => {
                          if (part.type === "text") {
                            return <span key={partIndex} className="whitespace-pre-wrap">{part.content}</span>;
                          }
                          if (part.type === "link") {
                            const isExternal = part.url?.startsWith("http");
                            return (
                              <a
                                key={partIndex}
                                href={part.url}
                                target={isExternal ? "_blank" : "_self"}
                                rel={isExternal ? "noopener noreferrer" : undefined}
                                className="inline-flex items-center gap-1 font-medium hover:underline"
                                style={{ color: primaryColor }}
                                data-testid={`link-widget-${partIndex}`}
                              >
                                {part.content}
                                {isExternal && <ExternalLink className="w-3 h-3" />}
                              </a>
                            );
                          }
                          return null;
                        })}
                        {hasButtons && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {parsed.filter(p => p.type === "button").map((btn, btnIndex) => (
                              <button
                                key={`btn-${btnIndex}`}
                                className="px-4 py-2 text-xs rounded-xl border-2 transition-all duration-200 bg-gradient-to-b from-white/80 to-white/60 dark:from-white/20 dark:to-white/10 backdrop-blur-sm border-gray-200 dark:border-gray-500 text-gray-700 dark:text-white shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] hover:translate-y-0.5 active:translate-y-1 active:shadow-none"
                                onClick={() => sendButtonMessage(btn.action || btn.content)}
                                disabled={sendMessageMutation.isPending}
                                data-testid={`button-widget-quick-${btnIndex}`}
                              >
                                <ChevronRight className="w-3 h-3 mr-1 inline" />
                                {btn.content}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {(msg as any).messageType === "product_offer" && (msg as any).payload?.productCard && (() => {
                    const productCard = (msg as any).payload.productCard;
                    const displayName = customerName || "Kak";
                    return (
                      <div className="mt-2 max-w-[280px]">
                        {/* Conversational intro */}
                        <p className="text-sm mb-2">
                          Hai {displayName}! Berikut produk pilihan yang mungkin cocok untuk kamu 😊
                        </p>
                        
                        {/* Header */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <ShoppingBag className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                          <span className="text-[11px] font-medium">Berikut produk rekomendasi kami:</span>
                        </div>
                        
                        {/* 2-column grid with square images */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
                            {productCard.imageUrl ? (
                              <div className="aspect-square bg-muted flex items-center justify-center">
                                <img 
                                  src={productCard.imageUrl} 
                                  alt={productCard.title}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="aspect-square bg-muted flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-muted-foreground/50" />
                              </div>
                            )}
                            <div className="p-2 space-y-1">
                              <p className="font-semibold text-xs line-clamp-1">{productCard.title}</p>
                              {productCard.description && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{productCard.description}</p>
                              )}
                              {productCard.price && (
                                <p className="text-xs font-medium" style={{ color: primaryColor }}>{productCard.price}</p>
                              )}
                              <div className="flex flex-col gap-1 pt-1">
                                {productCard.sourceUrl && (
                                  <button
                                    className="w-full text-[10px] py-1 px-1 rounded border transition-colors hover:text-white flex items-center justify-center gap-0.5"
                                    style={{ borderColor: primaryColor, color: primaryColor }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = primaryColor; e.currentTarget.style.color = 'white'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = primaryColor; }}
                                    onClick={() => window.open(productCard.sourceUrl, '_blank')}
                                    data-testid="button-visit-product-page"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    Lihat
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Suggestion buttons */}
                        {productCard.buttons && productCard.buttons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {productCard.buttons.slice(0, 3).map((btn: any, idx: number) => (
                              <button
                                key={`suggest-${btn.id || idx}`}
                                className="px-3 py-1.5 text-[10px] rounded-xl border-2 transition-all duration-200 bg-gradient-to-b from-white/80 to-white/60 dark:from-white/20 dark:to-white/10 backdrop-blur-sm border-gray-200 dark:border-gray-500 text-gray-700 dark:text-white shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] hover:translate-y-0.5 active:translate-y-1 active:shadow-none"
                                onClick={() => btn.url && window.open(btn.url, '_blank')}
                                data-testid={`button-suggest-${btn.id || idx}`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {(msg as any).messageType === "media" && (msg as any).payload && (
                    <div>
                      {(msg as any).payload.type === "photo" && (
                        <img 
                          src={(msg as any).payload.url} 
                          alt={(msg as any).payload.filename || "Image"}
                          className="max-w-[160px] max-h-[160px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingImage({ url: (msg as any).payload.url, filename: (msg as any).payload.filename || "Image" });
                          }}
                          data-testid="img-chat-media"
                        />
                      )}
                      {(msg as any).payload.type === "video" && (
                        <video 
                          src={(msg as any).payload.url}
                          controls
                          className="max-w-[200px] max-h-[150px] rounded-lg"
                        />
                      )}
                      {(msg as any).payload.type === "document" && (
                        <a 
                          href={(msg as any).payload.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border hover:bg-background transition-colors"
                        >
                          <FileText className="w-4 h-4" style={{ color: primaryColor }} />
                          <span className="text-xs text-foreground truncate max-w-[120px]">
                            {(msg as any).payload.filename || "Document"}
                          </span>
                        </a>
                      )}
                    </div>
                  )}
                  {msg.mediaUrl && (
                    <div>
                      {msg.mediaType === "photo" && (
                        <img 
                          src={msg.mediaUrl} 
                          alt="Uploaded image"
                          className="max-w-[160px] max-h-[160px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingImage({ url: msg.mediaUrl!, filename: "Image" });
                          }}
                          data-testid="img-chat-media-legacy"
                        />
                      )}
                      {msg.mediaType === "video" && (
                        <video 
                          src={msg.mediaUrl}
                          controls
                          className="max-w-[200px] max-h-[150px] rounded-lg"
                        />
                      )}
                      {msg.mediaType === "document" && (
                        <a 
                          href={msg.mediaUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border hover:bg-background transition-colors"
                        >
                          <FileText className="w-4 h-4" style={{ color: primaryColor }} />
                          <span className="text-xs text-foreground truncate max-w-[120px]">
                            Document
                          </span>
                        </a>
                      )}
                    </div>
                  )}
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
                className="h-auto py-1.5 px-3 text-[10px] font-normal whitespace-normal text-left rounded-xl border-2 transition-all duration-200 bg-gradient-to-b from-white/80 to-white/60 dark:from-white/20 dark:to-white/10 backdrop-blur-sm border-gray-200 dark:border-gray-500 text-gray-700 dark:text-white shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] hover:translate-y-0.5 active:translate-y-1 active:shadow-none"
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
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder="Type your message..."
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              disabled={!isOnline || isUploadingMedia}
              className="w-full"
              data-testid="input-widget-message"
            />
          </div>
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
      </>
      )}
      
      {viewingImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={() => setViewingImage(null)}
          data-testid="modal-image-viewer"
        >
          <div 
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-12 right-0 z-[10000] p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={() => setViewingImage(null)}
              data-testid="button-close-image-viewer"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img 
              src={viewingImage.url} 
              alt={viewingImage.filename}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
              data-testid="img-fullscreen-view"
            />
            <a
              href={viewingImage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute -bottom-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              data-testid="button-open-image-new-tab"
            >
              <ExternalLink className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
