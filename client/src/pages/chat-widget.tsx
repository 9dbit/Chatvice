import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, Send, X, Shrink, Square, Minimize2, Maximize2, HeadphonesIcon, User, ImageIcon, Video, FileText, Plus, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ExternalLink, ShoppingBag, EyeOff, GripVertical, MapPin, Phone, Mail, Minus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Message, SuggestedQuestion, WelcomeBubble, ChatButton, ProductCard, ProductCardButton } from "@shared/schema";
import { getImageLocation, type LocationData } from "@/lib/location-utils";
import { countryPhoneConfigs, validatePhoneNumber } from "@shared/phoneValidation";
import chatviceLogoLight from "../assets/chatvice-logo-light.png";
import chatviceLogoDark from "../assets/chatvice-logo-dark.png";

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
  widgetTheme?: "light" | "dark";
  socialMediaEnabled?: boolean;
  socialIconStyle?: "colored" | "silhouette";
  socialInstagram?: string;
  socialFacebook?: string;
  socialTelegram?: string;
  socialWhatsapp?: string;
  socialDiscord?: string;
  welcomeDescription?: string;
  quickMessageOptions?: string[];
  activeAgentId?: string;
}

interface NotificationSettings {
  incomingChatSound: string;
  incomingChatEnabled: boolean;
  chatReplySound: string;
  chatReplyEnabled: boolean;
  angryCustomerSound?: string;
  angryCustomerEnabled?: boolean;
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

// Generate a simple device fingerprint for session persistence
function generateDeviceFingerprint(): string {
  try {
    const components: string[] = [];
    
    // Safely collect browser components with fallbacks
    if (typeof navigator !== 'undefined') {
      components.push(navigator.userAgent || 'unknown');
      components.push(navigator.language || 'unknown');
    } else {
      components.push('no-navigator');
    }
    
    if (typeof screen !== 'undefined') {
      components.push((screen.width || 0) + 'x' + (screen.height || 0));
      components.push(String(screen.colorDepth || 0));
    } else {
      components.push('no-screen');
    }
    
    components.push(String(new Date().getTimezoneOffset()));
    
    // Create a simple hash from the components
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'fp_' + Math.abs(hash).toString(36);
  } catch {
    // Fallback to random ID if fingerprinting fails
    return 'fp_' + Math.random().toString(36).substring(2, 10);
  }
}

// Calculate contrasting text color based on background luminance
function getContrastColor(hexColor: string): string {
  try {
    // Remove # if present and normalize
    let hex = hexColor.replace('#', '');
    
    // Validate hex format (3 or 6 characters)
    if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(hex)) {
      return '#ffffff'; // Default to white for invalid input
    }
    
    // Expand shorthand hex (#abc -> #aabbcc)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Check for NaN
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return '#ffffff';
    }
    
    // Calculate relative luminance using WCAG formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, dark grey for light backgrounds
    return luminance > 0.5 ? '#374151' : '#ffffff';
  } catch {
    return '#ffffff'; // Fallback to white on any error
  }
}

export default function ChatWidget({ merchantId, sessionId: initialSessionId, embedded = false, previewMode = false }: ChatWidgetProps) {
  const urlParams = new URLSearchParams(window.location.search);
  const showCloseButton = urlParams.get("showClose") === "true";
  // Widget is externally embedded when showClose=true (external widget shows close button)
  const isExternalEmbed = showCloseButton;
  
  const [isOpen, setIsOpen] = useState(embedded);
  
  // Device fingerprint for 24-hour session persistence
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>(() => {
    if (previewMode) return '';
    // Try to get from localStorage first (for consistency)
    try {
      const stored = localStorage.getItem(`chatvice_device_fp_${merchantId}`);
      if (stored) return stored;
    } catch {}
    return ''; // Will be generated in useEffect
  });
  
  // Generate fingerprint on client-side only (avoids SSR issues)
  useEffect(() => {
    if (previewMode || deviceFingerprint) return;
    
    const fp = generateDeviceFingerprint();
    setDeviceFingerprint(fp);
    
    // Persist to localStorage
    try {
      localStorage.setItem(`chatvice_device_fp_${merchantId}`, fp);
    } catch {}
  }, [merchantId, previewMode, deviceFingerprint]);
  
  // Session can be resumed from existing session (24-hour persistence for all widgets)
  const [isCheckingSession, setIsCheckingSession] = useState(!previewMode);
  const [resumedSessionId, setResumedSessionId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Make body, html, and #root transparent for external embed mode so frosted glass shows through
  useEffect(() => {
    if (isExternalEmbed || embedded) {
      // Set all possible backgrounds to transparent
      document.body.style.background = "transparent";
      document.body.style.backgroundColor = "transparent";
      document.documentElement.style.background = "transparent";
      document.documentElement.style.backgroundColor = "transparent";
      
      // Also make #root transparent
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.style.background = "transparent";
        rootEl.style.backgroundColor = "transparent";
      }
    }
    return () => {
      document.body.style.background = "";
      document.body.style.backgroundColor = "";
      document.documentElement.style.background = "";
      document.documentElement.style.backgroundColor = "";
      
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.style.background = "";
        rootEl.style.backgroundColor = "";
      }
    };
  }, [isExternalEmbed, embedded]);
  const [generatedSessionId] = useState(() => initialSessionId || `sess_${Math.random().toString(36).substring(2, 12)}`);
  // Use resumed session ID if available, otherwise use generated one
  const sessionId = resumedSessionId || generatedSessionId;
  const [message, setMessage] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  
  // Customer name form state - use merchantId only to persist across sessions
  const customerNameKey = `chatvice_customer_name_${merchantId}`;
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
  const [selectedQuickMessage, setSelectedQuickMessage] = useState<string | null>(null);
  
  // Phone and email state for welcome form
  const [phoneDialCode, setPhoneDialCode] = useState("62"); // Default to Indonesia
  const [phoneLocalNumber, setPhoneLocalNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [emailError, setEmailError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Inactivity timer for closing statement
  const [closingStatementSent, setClosingStatementSent] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeAgentIdRef = useRef<string | undefined>(undefined);
  
  // Inactivity timeout (2 minutes = 120000ms)
  const INACTIVITY_TIMEOUT = 120000;
  
  // Reset inactivity timer on user activity
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    // Only set new timeout if chat is active and closing statement wasn't sent
    if (hasSubmittedName && !closingStatementSent && !previewMode) {
      inactivityTimeoutRef.current = setTimeout(async () => {
        // Check if still inactive
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        if (timeSinceActivity >= INACTIVITY_TIMEOUT && !closingStatementSent) {
          try {
            const response = await fetch('/api/widget/closing-statement', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                sessionId, 
                merchantId,
                agentId: activeAgentIdRef.current,
              }),
            });
            const data = await response.json();
            
            if (data.success && data.closingStatement && data.enabled) {
              setPendingMessages(prev => [
                ...prev,
                {
                  clientId: generateClientId(),
                  from: "chatvice",
                  content: data.closingStatement,
                  timestamp: new Date(),
                },
              ]);
              setClosingStatementSent(true);
            }
          } catch (err) {
            console.error("Error fetching closing statement:", err);
          }
        }
      }, INACTIVITY_TIMEOUT);
    }
  }, [hasSubmittedName, closingStatementSent, previewMode, sessionId, merchantId]);
  
  // Set up inactivity timer when chat becomes active
  useEffect(() => {
    if (hasSubmittedName && !closingStatementSent && !previewMode) {
      resetInactivityTimer();
    }
    
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [hasSubmittedName, closingStatementSent, previewMode, resetInactivityTimer]);
  
  // Check for existing session on mount (24-hour persistence for all widgets)
  useEffect(() => {
    // Wait for fingerprint to be generated
    if (previewMode) {
      setIsCheckingSession(false);
      return;
    }
    
    // Keep checking state true until fingerprint is available
    if (!deviceFingerprint) {
      setIsCheckingSession(true);
      return;
    }
    
    const checkExistingSession = async () => {
      try {
        const response = await fetch('/api/widget/find-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId, deviceFingerprint }),
        });
        const data = await response.json();
        
        if (data.found && data.sessionId && data.customerName) {
          // Resume existing session
          setResumedSessionId(data.sessionId);
          setCustomerName(data.customerName);
          setHasSubmittedName(true);
          // Update sessionStorage with session-specific key
          try {
            sessionStorage.setItem(`${customerNameKey}_${data.sessionId}`, data.customerName);
            sessionStorage.setItem(`${customerNameKey}_${data.sessionId}_submitted`, "true");
          } catch {}
        } else {
          // No session found - clear any stale submitted flags
          setHasSubmittedName(false);
        }
      } catch (err) {
        console.error("Error checking existing session:", err);
        // On error, allow name form to show
        setHasSubmittedName(false);
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    checkExistingSession();
  }, [merchantId, deviceFingerprint, previewMode]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [productCarouselIndex, setProductCarouselIndex] = useState(0);
  const [viewingImage, setViewingImage] = useState<{ url: string; filename: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedServerMsgId = useRef<string | null>(null);
  const processedMsgIdsSet = useRef<Set<string>>(new Set()); // Track all processed message IDs
  const isFirstEffectRun = useRef<boolean>(true); // Track if this is the first effect run
  
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

  // Sync activeAgentIdRef when merchantConfig loads
  useEffect(() => {
    if (merchantConfig?.activeAgentId) {
      activeAgentIdRef.current = merchantConfig.activeAgentId;
    }
  }, [merchantConfig?.activeAgentId]);

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

  // Fetch session info including supervisor and agent data
  interface SessionInfo {
    found: boolean;
    mode: "AI" | "HUMAN";
    supervisorId: string | null;
    supervisorInfo: { id: string; name: string; photoUrl: string } | null;
    agentId: string | null;
    agentInfo: { id: string; name: string; photoUrl: string } | null;
  }
  
  const { data: sessionInfo } = useQuery<SessionInfo>({
    queryKey: [`/api/widget/session-info`, sessionId],
    enabled: !!sessionId,
    refetchInterval: 3000, // Poll for supervisor takeover
  });

  // Stop inactivity timer when supervisor takes over (HUMAN mode)
  useEffect(() => {
    if (sessionInfo?.mode === "HUMAN") {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    }
  }, [sessionInfo?.mode]);

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

  // Default sounds for customer widget
  const defaultSoundUrls: Record<string, string> = {
    "incoming-msg": "/sounds/incoming-msg.mp3",
    "notification-alert": "/sounds/notification-alert.mp3",
    "live-chat": "/sounds/live-chat.mp3",
    "alert": "/sounds/alert.mp3",
    "new-notification": "/sounds/new-notification.mp3",
    "text-message": "/sounds/text-message.mp3",
    "gaming-lock": "/sounds/gaming-lock.wav",
    "quick-lock": "/sounds/quick-lock.wav",
    "sci-fi-confirm": "/sounds/sci-fi-confirm.wav",
    "interface-start": "/sounds/interface-start.wav",
  };

  const playNotificationSound = (type: "incoming" | "reply" | "angry") => {
    if (!notificationSettings) {
      // Play default sounds even without settings
      const defaultSounds: Record<string, string> = {
        incoming: "/sounds/sci-fi-confirm.wav",
        reply: "/sounds/live-chat.mp3",
        angry: "/sounds/alert.mp3",
      };
      try {
        const audio = new Audio(defaultSounds[type] || defaultSounds.reply);
        audio.volume = 1.0;
        audio.play().catch((e) => console.warn("Audio playback failed:", e));
      } catch (e) {
        console.warn("Sound playback error:", e);
      }
      return;
    }
    
    let enabled: boolean;
    let sound: string;
    
    if (type === "incoming") {
      enabled = notificationSettings.incomingChatEnabled;
      sound = notificationSettings.incomingChatSound || "sci-fi-confirm";
    } else if (type === "angry") {
      enabled = notificationSettings.angryCustomerEnabled !== false;
      sound = notificationSettings.angryCustomerSound || "alert";
    } else {
      enabled = notificationSettings.chatReplyEnabled;
      sound = notificationSettings.chatReplySound || "live-chat";
    }
    
    if (!enabled || sound === "none") return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Get sound URL - check if it's a default sound ID or a custom upload path
      let soundUrl: string | null = null;
      if (defaultSoundUrls[sound]) {
        soundUrl = defaultSoundUrls[sound];
      } else if (sound.startsWith("/uploads/") || sound.startsWith("/sounds/")) {
        soundUrl = sound;
      } else if (sound === "default") {
        // Fallback default sounds
        const fallbackSounds: Record<string, string> = {
          incoming: "/sounds/sci-fi-confirm.wav",
          reply: "/sounds/live-chat.mp3",
          angry: "/sounds/alert.mp3",
        };
        soundUrl = fallbackSounds[type] || fallbackSounds.reply;
      }
      
      if (soundUrl) {
        audioRef.current = new Audio(soundUrl);
        audioRef.current.volume = 1.0;
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
      return response.json() as Promise<{ 
        answer: string; 
        mode: string; 
        clientMessageId?: string; 
        responseClientId?: string;
        isAngry?: boolean;
        triggerHit?: boolean;
        isNewSession?: boolean;
      }>;
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
      
      // Play reply sound for customer when receiving AI response
      // (angry sound is for merchant/supervisor side only)
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
    // Reset inactivity timer on user activity
    resetInactivityTimer();
  };
  
  const sendButtonMessage = (buttonAction: string) => {
    if (!buttonAction.trim() || sendMessageMutation.isPending) return;
    const clientId = generateClientId();
    setPendingMessages((prev) => [...prev, { clientId, from: "user", content: buttonAction, timestamp: new Date() }]);
    sendMessageMutation.mutate({ userMessage: buttonAction, clientId });
    // Reset inactivity timer on user activity
    resetInactivityTimer();
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
    // Reset inactivity timer on user activity
    resetInactivityTimer();
  };

  // Start chat mutation with customer name, phone and email
  const startChatMutation = useMutation({
    mutationFn: async ({ name, phone, email, initialMessage, welcomeDescription, isQuickQuestion }: { name: string; phone: string; email: string; initialMessage: string; welcomeDescription?: string; isQuickQuestion?: boolean }) => {
      const response = await apiRequest("POST", "/api/widget/start-chat", {
        merchantId,
        sessionId,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        initialMessage,
        deviceFingerprint, // For 24-hour session persistence
        welcomeDescription, // Include welcome description for chat history (only if no quick question)
        isQuickQuestion, // Flag to indicate if user selected a quick question
      });
      return response.json() as Promise<{ success: boolean; answer: string; error?: string; sanitizedName?: string; welcomeMessage?: string }>;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        const finalName = data.sanitizedName || nameInputValue.trim();
        setCustomerName(finalName);
        setHasSubmittedName(true);
        setSelectedQuickMessage(null); // Clear selected quick message after submission
        if (!previewMode) {
          try {
            sessionStorage.setItem(customerNameKey, finalName);
            sessionStorage.setItem(`${customerNameKey}_submitted`, "true");
          } catch {}
        }
        
        // Add welcome message (if available), user's initial message, and AI response
        const newMessages: Array<{clientId: string; from: string; content: string; timestamp: Date}> = [];
        
        // Add welcome description as a system message first
        if (data.welcomeMessage) {
          newMessages.push({
            clientId: generateClientId(),
            from: "chatvice",
            content: data.welcomeMessage,
            timestamp: new Date(Date.now() - 2000), // 2 seconds earlier
          });
        }
        
        // Add user's initial message (quick message selection)
        newMessages.push({
          clientId: generateClientId(),
          from: "user",
          content: variables.initialMessage,
          timestamp: new Date(Date.now() - 1000), // 1 second earlier
        });
        
        // Add AI response
        newMessages.push({
          clientId: generateClientId(),
          from: "chatvice",
          content: data.answer,
          timestamp: new Date(),
        });
        
        setPendingMessages(newMessages);
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
    let hasError = false;
    
    // Validate name
    if (!name) {
      setNameError("Please enter your name");
      hasError = true;
    } else if (name.length < 2) {
      setNameError("Name must be at least 2 characters");
      hasError = true;
    } else if (name.length > 50) {
      setNameError("Name is too long");
      hasError = true;
    } else {
      setNameError("");
    }
    
    // Validate phone (required)
    const phoneValidation = validatePhoneNumber(phoneDialCode, phoneLocalNumber);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error || "Invalid phone number");
      hasError = true;
    } else {
      setPhoneError("");
    }
    
    // Validate email (optional, but must be valid if provided)
    if (emailValue.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue.trim())) {
        setEmailError("Invalid email format");
        hasError = true;
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }
    
    if (hasError) return;
    
    // Use selected quick message if available, otherwise default
    const hasQuickQuestion = !!selectedQuickMessage;
    const initialMessage = selectedQuickMessage || "Hello, I have a question";
    // Only include welcome description if no quick question was selected
    // If user selects quick question, they want direct answer to their question
    startChatMutation.mutate({ 
      name, 
      phone: phoneValidation.formattedNumber || "",
      email: emailValue.trim() || "",
      initialMessage,
      welcomeDescription: hasQuickQuestion ? "" : (merchantConfig?.welcomeDescription || ""),
      isQuickQuestion: hasQuickQuestion,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    // Reset inactivity timer on user typing
    resetInactivityTimer();
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
    
    const RECENT_THRESHOLD_MS = 30000; // 30 seconds - messages within this window are "new"
    const now = Date.now();
    
    // Initialize tracking on first run
    if (isFirstEffectRun.current) {
      isFirstEffectRun.current = false;
      
      // On first run, process recent AI/supervisor messages (could be proactive outreach)
      for (const msg of serverMessages) {
        if (msg.id) processedMsgIdsSet.current.add(msg.id);
        
        // Check if this is a recent non-customer message (received in last 30s)
        const msgTime = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
        const isRecent = (now - msgTime) < RECENT_THRESHOLD_MS;
        const isFromOthers = msg.from !== "customer";
        
        if (isRecent && isFromOthers) {
          // Recent AI/supervisor message on first load - play sound
          playNotificationSound("reply");
          if (!isOpen && !embedded) {
            setUnreadCount(prev => prev + 1);
          }
          break; // Only play once even if multiple recent messages
        }
      }
      
      const lastMsg = serverMessages[serverMessages.length - 1];
      if (lastMsg?.id) lastProcessedServerMsgId.current = lastMsg.id;
      return;
    }
    
    // Find new messages that we haven't processed yet
    const newMessages = serverMessages.filter(msg => msg.id && !processedMsgIdsSet.current.has(msg.id));
    
    // Process new messages - only for polling (supervisor messages coming from server)
    // Note: AI responses from sendMessageMutation are handled in mutation.onSuccess
    for (const msg of newMessages) {
      if (msg.id) processedMsgIdsSet.current.add(msg.id);
      
      // Only play sounds for messages from AI/supervisor that weren't already handled by mutation
      // Check if this message is already in pendingMessages (handled by mutation)
      const isAlreadyInPending = pendingMessages.some(pm => 
        pm.content === msg.content && pm.from !== "user"
      );
      
      const isFromOthers = msg.from !== "customer";
      if (isFromOthers && !isAlreadyInPending) {
        // This is a new message from supervisor/AI that came via polling (not mutation)
        playNotificationSound("reply");
        
        // Increment unread count if widget is minimized
        if (!isOpen && !embedded) {
          setUnreadCount(prev => prev + 1);
        }
      }
    }
    
    const lastMsg = serverMessages[serverMessages.length - 1];
    if (lastMsg?.id) lastProcessedServerMsgId.current = lastMsg.id;
  }, [serverMessages, isOpen, embedded, pendingMessages]);

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
          className={`${positionClass} right-0 z-40 bg-primary/90 hover:bg-primary text-white px-2 py-3 rounded-l-lg shadow-lg transition-all`}
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
          <div 
            className="w-52 animate-in slide-in-from-bottom-5 fade-in duration-300" 
            data-testid="welcome-bubble-container"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
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
              className={`bg-card shadow-xl px-4 pt-3 pb-4 border border-border relative z-10 ${welcomeBubble.promoImageEnabled && welcomeBubble.promoImageUrl ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}
            >
              {/* Header row with title and controls aligned */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-semibold text-base" data-testid="text-welcome-headline">
                  {welcomeBubble.headline}
                </p>
                <div className="flex items-center -mr-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      dismissWelcomeBubble();
                    }}
                    data-testid="button-minimize-welcome-bubble"
                  >
                    <Minus className="w-3 h-3 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      dismissWelcomeBubble();
                    }}
                    data-testid="button-close-welcome-bubble"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-[11px] text-muted-foreground" data-testid="text-welcome-message">
                  {welcomeBubble.message}
                </p>
              </div>
              <Button
                className="w-full rounded-[14px] text-white"
                style={{ backgroundColor: welcomeBubble.buttonColor || primaryColor }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  dismissWelcomeBubble();
                  handleWidgetOpen();
                }}
                data-testid="button-welcome-primary"
              >
                {welcomeBubble.buttonLabel || "Chat with us"}
              </Button>
              {/* Action buttons */}
              {Array.isArray(welcomeBubble.actionButtons) && welcomeBubble.actionButtons.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {(welcomeBubble.actionButtons as Array<{label: string; url: string; color?: string}>).map((btn, index) => (
                    <Button
                      key={index}
                      className="w-full rounded-[14px] text-white"
                      style={{ backgroundColor: btn.color || primaryColor }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleWelcomeBubbleButtonClick(btn.url);
                      }}
                      data-testid={`button-welcome-action-${index}`}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
              )}
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
            className="flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 relative animate-in zoom-in-75 fade-in duration-500"
            style={{
              width: iconWidth,
              height: iconHeight,
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
                {/* Square IMAGE area - enforced square format with object-contain to show full product */}
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

  // Frosted glass styling - use merchant's widget theme setting, not document dark class
  // This ensures the widget respects the merchant's configured theme
  const widgetIsDark = merchantConfig?.widgetTheme === "dark" || document.documentElement.classList.contains('dark');
  
  // Styles apply to external embed, embedded mode, AND preview mode (for sync)
  const applyEmbedStyles = isExternalEmbed || embedded || previewMode;
  
  // External embed and previewMode both use absolute positioning to fill their container (iframe)
  // The iframe itself is positioned at bottom-right by the parent page (live-preview.tsx)
  // Maximized state: mobile = full height below header (top: 60px), desktop = 20% larger
  const getContainerClasses = () => {
    if (isExternalEmbed || previewMode) {
      return "absolute inset-0 w-full h-full overflow-hidden flex flex-col";
    }
    if (embedded) {
      return "w-full h-full overflow-hidden flex flex-col";
    }
    if (isFullscreen) {
      return `fixed inset-4 z-50 animate-in fade-in duration-300 overflow-hidden flex flex-col`;
    }
    if (isMaximized) {
      // Maximized: responsive - mobile fills below header, desktop 20% larger
      return `${positionClass} bottom-5 right-5 z-50 animate-in fade-in duration-300 overflow-hidden flex flex-col`;
    }
    return `${positionClass} bottom-5 right-5 w-[360px] h-[520px] z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 overflow-hidden flex flex-col`;
  };
  const containerClasses = getContainerClasses();
  
  // Consistent border radius throughout widget
  const widgetBorderRadius = '28px';
  
  // Maximized dimensions - responsive
  const getMaximizedStyle = (): React.CSSProperties => {
    if (!isMaximized) return {};
    // Mobile: fill height below website header (60px), desktop: 20% larger
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      return {
        position: 'fixed',
        top: '70px', // Below external website header
        left: '20px',
        right: '20px',
        bottom: '20px',
        width: 'auto',
        height: 'auto',
        maxWidth: '100vw',
        maxHeight: 'calc(100vh - 90px)',
      };
    }
    return {
      width: '432px', // 360px + 20%
      height: '624px', // 520px + 20%
      maxWidth: 'calc(100vw - 40px)',
      maxHeight: 'calc(100vh - 90px)',
    };
  };
  
  // Glassmorphism container - Light mode uses solid white, dark mode uses transparent
  // Preview mode also gets glassmorphism to match external widget appearance
  const frostedGlassContainerStyle: React.CSSProperties = applyEmbedStyles
    ? widgetIsDark 
      ? {
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
          borderRadius: widgetBorderRadius,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          backdropFilter: 'blur(20px) saturate(120%)',
          WebkitBackdropFilter: 'blur(20px) saturate(120%)',
          ...getMaximizedStyle(),
        }
      : {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: widgetBorderRadius,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          backdropFilter: 'blur(20px) saturate(120%)',
          WebkitBackdropFilter: 'blur(20px) saturate(120%)',
          ...getMaximizedStyle(),
        }
    : {};
  
  // Header style - Pill shaped with 50px rounded corners (top and bottom)
  const frostedHeaderStyle: React.CSSProperties = applyEmbedStyles
    ? { 
        background: `linear-gradient(180deg, ${primaryColor}FF 0%, ${primaryColor}E6 60%, ${primaryColor}D9 100%)`,
        boxShadow: `
          0 10px 40px rgba(0, 0, 0, 0.4), 
          0 20px 60px rgba(0, 0, 0, 0.25), 
          inset 0 2px 1px rgba(255, 255, 255, 0.5), 
          inset 0 -2px 1px rgba(0, 0, 0, 0.15),
          inset 1px 0 1px rgba(255, 255, 255, 0.2),
          inset -1px 0 1px rgba(255, 255, 255, 0.2)
        `,
        borderRadius: '50px',
        border: '1px solid rgba(255, 255, 255, 0.25)',
      }
    : { backgroundColor: primaryColor };
  
  // Body uses glassmorphism - Light mode uses solid white, dark mode uses transparent
  const frostedBodyStyle: React.CSSProperties = applyEmbedStyles
    ? widgetIsDark
      ? { 
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
          backgroundColor: 'rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(30px) saturate(150%)',
          WebkitBackdropFilter: 'blur(30px) saturate(150%)',
        }
      : { 
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(248, 250, 252, 1) 100%)',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
        }
    : {};

  // Footer style - Aligned with scroll area corners (0 top, 28px bottom)
  const frostedFooterStyle: React.CSSProperties = applyEmbedStyles
    ? widgetIsDark
      ? { 
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
          backgroundColor: 'rgba(0, 0, 0, 0.12)',
          backdropFilter: 'blur(30px) saturate(150%)',
          WebkitBackdropFilter: 'blur(30px) saturate(150%)',
          borderRadius: '0 0 28px 28px',
        }
      : { 
          background: 'linear-gradient(180deg, rgba(248, 250, 252, 1) 0%, rgba(241, 245, 249, 1) 100%)',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '0 0 28px 28px',
        }
    : {};

  return (
    <div
      className={containerClasses}
      style={{
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        ...frostedGlassContainerStyle,
      }}
      data-testid="widget-container"
    >
      {/* Slim Header with drop shadow - z-10 to stay above social panel */}
      <div
        className="px-3 py-2 flex items-center justify-between shadow-md relative z-10"
        style={frostedHeaderStyle}
      >
        <div className="flex items-center gap-2.5">
          {/* Show supervisor photo when in HUMAN mode, otherwise show agent photo */}
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            {sessionInfo?.mode === "HUMAN" && sessionInfo?.supervisorInfo ? (
              // Supervisor is handling - show supervisor photo
              sessionInfo.supervisorInfo.photoUrl && sessionInfo.supervisorInfo.photoUrl.trim() !== "" ? (
                <img
                  src={sessionInfo.supervisorInfo.photoUrl}
                  alt="Supervisor"
                  className="w-full h-full object-cover"
                />
              ) : (
                <HeadphonesIcon className="w-5 h-5 text-white" />
              )
            ) : sessionInfo?.agentInfo?.photoUrl && sessionInfo.agentInfo.photoUrl.trim() !== "" ? (
              <img
                src={sessionInfo.agentInfo.photoUrl}
                alt="Agent"
                className="w-full h-full object-cover"
              />
            ) : merchantConfig?.agentPhotoUrl ? (
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
          
          <div style={{ color: applyEmbedStyles ? getContrastColor(primaryColor) : 'white' }}>
            {/* Show supervisor name when in HUMAN mode, otherwise assigned agent name */}
            <p className="font-medium text-sm leading-tight">
              {sessionInfo?.mode === "HUMAN" && sessionInfo?.supervisorInfo
                ? sessionInfo.supervisorInfo.name
                : sessionInfo?.agentInfo?.name || merchantConfig?.agentName || "Chatvice"}
            </p>
            <div className="flex items-center gap-1">
              <span className="text-[10px] flex items-center gap-1" style={{ opacity: 0.8 }}>
                {sessionInfo?.mode === "HUMAN" && sessionInfo?.supervisorInfo
                  ? <>
                      <User className="w-2.5 h-2.5" />
                      Supervisor: {sessionInfo.supervisorInfo.name}
                    </>
                  : isOnline 
                    ? <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Online - Customer Service
                      </>
                    : <>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Offline
                      </>}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
        {/* Maximize Toggle - responsive sizing (mobile: full height, desktop: 20% larger) */}
        {!embedded && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                style={{ 
                  color: applyEmbedStyles ? getContrastColor(primaryColor) : 'white'
                }}
                onClick={() => setIsMaximized(!isMaximized)}
                data-testid="button-maximize-widget"
              >
                {isMaximized ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{isMaximized ? "Minimize" : "Maximize"}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Get in Touch Toggle - next to X button */}
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
              className="flex items-center gap-1 text-[10px] font-medium transition-colors px-2.5 py-0 rounded leading-none tracking-wide"
              style={{ 
                color: applyEmbedStyles ? getContrastColor(primaryColor) : 'white',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: applyEmbedStyles ? (getContrastColor(primaryColor) === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(55,65,81,0.3)') : 'rgba(255,255,255,0.2)',
                textShadow: getContrastColor(primaryColor) === '#ffffff' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                height: '16px'
              }}
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
        
        {/* Close button - X icon */}
        {(!embedded || showCloseButton) && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            style={{ 
              color: applyEmbedStyles ? getContrastColor(primaryColor) : 'white'
            }}
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
      
      {/* Main content area with relative positioning for social panel overlay */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {/* Social Media Panel - absolute positioned overlay on top of chat area */}
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
              className="absolute top-0 left-0 right-0 z-20 overflow-hidden"
              style={{ 
                backgroundColor: 'transparent',
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
              
              {/* Social icons with close button */}
              <div className="px-3 py-2 flex items-center justify-center gap-3 relative">
                  {/* Close drawer button - positioned at right */}
                  <button
                    onClick={handleCloseSocialPanel}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:scale-110 transition-transform"
                    style={{ 
                      backgroundColor: widgetIsDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                      color: widgetIsDark ? '#ffffff' : '#374151'
                    }}
                    data-testid="button-close-drawer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {socialLinks.map(social => (
                    <a
                      key={social.icon}
                      href={social.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform overflow-hidden"
                      style={{ 
                        backgroundColor: useCustomIcons && social.customIcon ? "transparent" : (iconStyle === "colored" ? social.color : "rgba(255,255,255,0.2)"),
                        boxShadow: '0 5px 8px rgba(0, 0, 0, 0.35)'
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

      {/* Customer name form - shown for new customers - frosted glass background */}
      {isCheckingSession ? (
        <div 
          className="flex-1 min-h-0 flex flex-col p-4 items-center justify-center"
          style={frostedBodyStyle}
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p 
            className="text-sm"
            style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#374151' } : undefined}
          >Loading...</p>
        </div>
      ) : !hasSubmittedName && !serverMessages?.length ? (
        <div 
          className="flex-1 min-h-0 flex flex-col p-4 overflow-y-auto"
          style={frostedBodyStyle}
        >
          <div className="flex-1 flex flex-col items-center">
            <h3 
              className="text-lg font-semibold mb-3 text-center"
              style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#1f2937' } : undefined}
            >Welcome!</h3>
            
            {/* Custom Description Box */}
            {merchantConfig?.welcomeDescription && (
              <div 
                className="w-full rounded-[14px] p-3 border mb-4 text-sm whitespace-pre-wrap" 
                style={applyEmbedStyles ? (widgetIsDark ? {
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                } : {
                  background: 'rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  color: '#374151',
                }) : undefined}
                data-testid="text-welcome-description"
              >
                {merchantConfig.welcomeDescription.split(/(\bhttps?:\/\/\S+)/g).map((part: string, i: number) => 
                  part.match(/^https?:\/\//) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                      {part}
                    </a>
                  ) : part
                )}
              </div>
            )}
            
            <p 
              className="text-sm mb-4 text-center"
              style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#374151' } : undefined}
            >
              Please fill in your details to start chatting.
            </p>
            
            <div className="w-full max-w-xs space-y-3">
              {/* Name Input */}
              <div className="space-y-1.5">
                <Label 
                  className="text-xs flex items-center gap-1"
                  style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#374151' } : undefined}
                >
                  <User className="w-3 h-3" /> Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={nameInputValue}
                  onChange={(e) => {
                    setNameInputValue(e.target.value);
                    setNameError("");
                  }}
                  className="text-sm"
                  name="chatvice_customer_display_name"
                  id="chatvice_customer_display_name"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  aria-autocomplete="none"
                  style={applyEmbedStyles ? (widgetIsDark ? {
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
                    color: '#ffffff',
                    borderRadius: '14px',
                  } : {
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 1) 100%)',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.08)',
                    color: '#1f2937',
                    borderRadius: '14px',
                  }) : undefined}
                  data-testid="input-customer-name"
                />
                {nameError && (
                  <p className="text-xs text-red-500" data-testid="text-name-error">
                    {nameError}
                  </p>
                )}
              </div>
              
              {/* Phone Input with Country Code */}
              <div className="space-y-1.5">
                <Label 
                  className="text-xs flex items-center gap-1"
                  style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#374151' } : undefined}
                >
                  <Phone className="w-3 h-3" /> Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-1.5">
                  <Select value={phoneDialCode} onValueChange={setPhoneDialCode}>
                    <SelectTrigger 
                      className="w-[90px] text-xs" 
                      data-testid="select-country-code"
                      style={applyEmbedStyles ? (widgetIsDark ? {
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
                        color: '#ffffff',
                        borderRadius: '14px',
                      } : {
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 1) 100%)',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.08)',
                        color: '#1f2937',
                        borderRadius: '14px',
                      }) : undefined}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                      className="max-h-[200px]"
                      style={applyEmbedStyles ? (widgetIsDark ? {
                        background: 'rgba(30, 30, 30, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '14px',
                      } : {
                        background: 'rgba(255, 255, 255, 0.98)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '14px',
                      }) : undefined}
                    >
                      {countryPhoneConfigs.map((country) => (
                        <SelectItem 
                          key={country.code} 
                          value={country.dialCode}
                          className="text-xs"
                          style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#1f2937' } : undefined}
                        >
                          +{country.dialCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder="81234567890"
                    value={phoneLocalNumber}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '');
                      setPhoneLocalNumber(value);
                      setPhoneError("");
                    }}
                    className="flex-1 text-sm"
                    name="chatvice_customer_phone"
                    id="chatvice_customer_phone"
                    autoComplete="tel"
                    style={applyEmbedStyles ? (widgetIsDark ? {
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
                      color: '#ffffff',
                      borderRadius: '14px',
                    } : {
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 1) 100%)',
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.08)',
                      color: '#1f2937',
                      borderRadius: '14px',
                    }) : undefined}
                    data-testid="input-customer-phone"
                  />
                </div>
                {phoneError && (
                  <p className="text-xs text-red-500" data-testid="text-phone-error">
                    {phoneError}
                  </p>
                )}
              </div>
              
              {/* Email Input (Optional) */}
              <div className="space-y-1.5">
                <Label 
                  className="text-xs flex items-center gap-1"
                  style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#374151' } : undefined}
                >
                  <Mail className="w-3 h-3" /> Email <span style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#6b7280' } : undefined}>(optional)</span>
                </Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={emailValue}
                  onChange={(e) => {
                    setEmailValue(e.target.value);
                    setEmailError("");
                  }}
                  className="text-sm"
                  name="chatvice_customer_email"
                  id="chatvice_customer_email"
                  autoComplete="email"
                  style={applyEmbedStyles ? (widgetIsDark ? {
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
                    color: '#ffffff',
                    borderRadius: '14px',
                  } : {
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 1) 100%)',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.08)',
                    color: '#1f2937',
                    borderRadius: '14px',
                  }) : undefined}
                  data-testid="input-customer-email"
                />
                {emailError && (
                  <p className="text-xs text-red-500" data-testid="text-email-error">
                    {emailError}
                  </p>
                )}
              </div>
              
              {/* Quick Message Options */}
              {merchantConfig?.quickMessageOptions && merchantConfig.quickMessageOptions.length > 0 ? (
                <div 
                  className="rounded-lg p-3"
                  style={applyEmbedStyles ? (widgetIsDark ? {
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                  } : {
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '14px',
                  }) : undefined}
                >
                  <p 
                    className="text-xs mb-2"
                    style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#6b7280' } : undefined}
                  >⚡ Quick Question</p>
                  <div className="space-y-2">
                    {merchantConfig.quickMessageOptions.map((option: string, index: number) => (
                      <label 
                        key={index} 
                        className="flex items-center gap-2 cursor-pointer text-sm p-1 rounded transition-colors"
                        style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#1f2937' } : undefined}
                        data-testid={`quick-message-option-${index}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedQuickMessage === option}
                          onChange={() => setSelectedQuickMessage(selectedQuickMessage === option ? null : option)}
                          className="w-4 h-4 rounded"
                          style={applyEmbedStyles ? { accentColor: primaryColor } : undefined}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div 
                  className="rounded-lg p-3"
                  style={applyEmbedStyles ? (widgetIsDark ? {
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                  } : {
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '14px',
                  }) : undefined}
                >
                  <p 
                    className="text-xs mb-1"
                    style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#6b7280' } : undefined}
                  >Your message:</p>
                  <p 
                    className="text-sm italic"
                    style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#1f2937' } : undefined}
                  >"Hello, I have a question"</p>
                </div>
              )}
              
              <Button
                onClick={handleNameSubmit}
                disabled={startChatMutation.isPending || !nameInputValue.trim() || !phoneLocalNumber.trim()}
                className="w-full"
                style={applyEmbedStyles ? { 
                  background: `linear-gradient(180deg, ${primaryColor}FF 0%, ${primaryColor}E6 50%, ${primaryColor}CC 100%)`,
                  boxShadow: `0 6px 24px rgba(0, 0, 0, 0.35), 0 12px 36px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.15)`,
                  borderRadius: '14px',
                  border: 'none',
                  color: getContrastColor(primaryColor),
                } : { backgroundColor: primaryColor }}
                data-testid="button-start-chat"
              >
                {startChatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Start Chat
              </Button>
              
              {/* Powered by Chatvice branding */}
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <span 
                  className="text-[10px]"
                  style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#6b7280' } : undefined}
                >Powered by</span>
                <a 
                  href="https://chatvice.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 transition-opacity"
                  data-testid="link-powered-by-chatvice-welcome"
                >
                  <img 
                    src={widgetIsDark ? chatviceLogoDark : chatviceLogoLight} 
                    alt="Chatvice" 
                    className="h-4"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1 min-h-0" style={{ ...frostedBodyStyle, borderRadius: '0' }}>
            {/* Add extra top padding when social panel is open to prevent overlap */}
            <div className={`space-y-4 p-4 ${socialIconsExpanded ? 'pt-16' : ''}`}>
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
                      // Show supervisor photo if available, otherwise headphones icon
                      sessionInfo?.supervisorInfo?.photoUrl && sessionInfo.supervisorInfo.photoUrl.trim() !== "" ? (
                        <img src={sessionInfo.supervisorInfo.photoUrl} alt="Supervisor" className="w-full h-full object-cover" />
                      ) : (
                        <HeadphonesIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      )
                    ) : sessionInfo?.agentInfo?.photoUrl && sessionInfo.agentInfo.photoUrl.trim() !== "" ? (
                      // Use the session's assigned agent photo
                      <img src={sessionInfo.agentInfo.photoUrl} alt="Agent" className="w-full h-full object-cover" />
                    ) : merchantConfig?.agentPhotoUrl ? (
                      // Fallback to merchant's default agent photo
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
                      : `rounded-2xl rounded-bl-sm ${applyEmbedStyles ? 'text-white' : 'bg-muted'}`
                  }`}
                  style={msg.from === "user" 
                    ? { 
                        backgroundColor: primaryColor,
                        boxShadow: applyEmbedStyles 
                          ? '0 6px 24px rgba(0, 0, 0, 0.35), 0 12px 40px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)' 
                          : undefined,
                        border: applyEmbedStyles ? '1px solid rgba(255, 255, 255, 0.2)' : undefined,
                      } 
                    : applyEmbedStyles 
                      ? { 
                          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)',
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                          backdropFilter: 'blur(20px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 16px 48px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                        }
                      : undefined}
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
                          <div 
                            className={`rounded-xl overflow-hidden ${applyEmbedStyles ? '' : 'bg-background border shadow-sm'}`}
                            style={applyEmbedStyles ? { 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 20px 60px rgba(0, 0, 0, 0.15)',
                              border: '1px solid rgba(255, 255, 255, 0.5)',
                            } : undefined}
                          >
                            {productCard.imageUrl ? (
                              <div className="aspect-square bg-muted overflow-hidden">
                                <img 
                                  src={productCard.imageUrl} 
                                  alt={productCard.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="aspect-square bg-muted flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-muted-foreground/50" />
                              </div>
                            )}
                            <div className="p-2 space-y-1">
                              <p className={`font-semibold text-xs line-clamp-1 ${applyEmbedStyles ? 'text-gray-900' : ''}`}>{productCard.title}</p>
                              {productCard.description && (
                                <p className={`text-[10px] line-clamp-1 ${applyEmbedStyles ? 'text-gray-600' : 'text-muted-foreground'}`}>{productCard.description}</p>
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
                {/* Use same logic as header - show supervisor when HUMAN mode, otherwise session's assigned agent */}
                {sessionInfo?.mode === "HUMAN" && sessionInfo?.supervisorInfo?.photoUrl ? (
                  <img src={sessionInfo.supervisorInfo.photoUrl} alt="Supervisor" className="w-full h-full object-cover" />
                ) : sessionInfo?.agentInfo?.photoUrl ? (
                  <img src={sessionInfo.agentInfo.photoUrl} alt="Agent" className="w-full h-full object-cover" />
                ) : merchantConfig?.agentPhotoUrl ? (
                  <img src={merchantConfig.agentPhotoUrl} alt="Agent" className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                )}
              </div>
              <div 
                className="rounded-2xl rounded-bl-sm p-3"
                style={applyEmbedStyles ? {
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                } : { backgroundColor: 'hsl(var(--muted))' }}
              >
                <div className="flex gap-1">
                  <span className={`w-2 h-2 rounded-full animate-bounce ${applyEmbedStyles ? 'bg-white/50' : 'bg-muted-foreground/50'}`} style={{ animationDelay: "0ms" }} />
                  <span className={`w-2 h-2 rounded-full animate-bounce ${applyEmbedStyles ? 'bg-white/50' : 'bg-muted-foreground/50'}`} style={{ animationDelay: "150ms" }} />
                  <span className={`w-2 h-2 rounded-full animate-bounce ${applyEmbedStyles ? 'bg-white/50' : 'bg-muted-foreground/50'}`} style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {suggestedQuestions.length > 0 && (
        <div 
          className={`px-2 py-3 ${applyEmbedStyles ? '' : 'border-t border-border'}`} 
          style={applyEmbedStyles ? (widgetIsDark ? {
            ...frostedFooterStyle,
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: '16px',
            margin: '8px 8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
          } : {
            ...frostedFooterStyle,
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 1) 100%)',
            borderRadius: '16px',
            margin: '8px 8px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          }) : frostedFooterStyle}
        >
          <div className="flex flex-col gap-2">
            {suggestedQuestions.slice(0, 5).map((sq) => (
              <Button
                key={sq.id}
                variant="ghost"
                size="lg"
                className={`w-full justify-start text-left rounded-xl ${
                  applyEmbedStyles 
                    ? (widgetIsDark ? 'text-white/90 bg-white/10' : 'text-gray-700 bg-gray-100/60')
                    : 'text-foreground bg-muted/30'
                }`}
                onClick={() => handleSuggestedQuestionClick(sq)}
                disabled={sendMessageMutation.isPending || useSuggestedQuestionMutation.isPending}
                data-testid={`button-suggested-question-${sq.id}`}
              >
                <ChevronRight className={`w-4 h-4 flex-shrink-0 mr-2 ${applyEmbedStyles ? (widgetIsDark ? 'text-white/50' : 'text-gray-400') : 'text-muted-foreground'}`} />
                <span className="flex-1 text-left">{sq.question}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className={`p-4 ${applyEmbedStyles ? '' : 'border-t border-border'}`} style={frostedFooterStyle}>
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
        {/* Input field with + button and send button INSIDE */}
        <div 
          className="flex items-center gap-1"
          style={applyEmbedStyles ? (widgetIsDark ? {
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.15)',
            borderRadius: '50px',
            padding: '4px 4px 4px 8px',
            height: '48px',
          } : {
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 1) 100%)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.08)',
            borderRadius: '50px',
            padding: '4px 4px 4px 8px',
            height: '48px',
          }) : {
            border: '1px solid hsl(var(--border))',
            borderRadius: '50px',
            padding: '4px 4px 4px 8px',
            height: '48px',
            backgroundColor: 'hsl(var(--background))',
          }}
        >
          {/* Plus button inside input */}
          <Popover open={showUploadMenu} onOpenChange={setShowUploadMenu}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                style={applyEmbedStyles ? {
                  color: widgetIsDark ? 'white' : '#374151',
                  borderRadius: '50%',
                } : undefined}
                disabled={!isOnline || isUploadingMedia}
                data-testid="button-upload-menu"
              >
                {isUploadingMedia ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="top" 
              align="start" 
              className="w-44 p-2"
              style={applyEmbedStyles ? (widgetIsDark ? {
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
                backgroundColor: 'rgba(30, 30, 30, 0.85)',
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                borderRadius: '20px',
              } : {
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 1) 100%)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                borderRadius: '20px',
              }) : undefined}
            >
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3 h-10"
                  style={applyEmbedStyles ? { color: widgetIsDark ? 'white' : '#374151', borderRadius: '12px' } : undefined}
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  data-testid="button-upload-image"
                >
                  <ImageIcon className="w-5 h-5" />
                  Image
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3 h-10"
                  style={applyEmbedStyles ? { color: widgetIsDark ? 'white' : '#374151', borderRadius: '12px' } : undefined}
                  onClick={() => {
                    videoInputRef.current?.click();
                  }}
                  data-testid="button-upload-video"
                >
                  <Video className="w-5 h-5" />
                  Video
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3 h-10"
                  style={applyEmbedStyles ? { color: widgetIsDark ? 'white' : '#374151', borderRadius: '12px' } : undefined}
                  onClick={() => {
                    documentInputRef.current?.click();
                  }}
                  data-testid="button-upload-document"
                >
                  <FileText className="w-5 h-5" />
                  Document
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Input field - transparent background when embedded */}
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            disabled={!isOnline || isUploadingMedia}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            style={applyEmbedStyles ? {
              background: 'transparent',
              color: widgetIsDark ? 'white' : '#1f2937',
              height: '36px',
              padding: '0 8px',
            } : {
              background: 'transparent',
              height: '36px',
              padding: '0 8px',
            }}
            data-testid="input-widget-message"
          />
          
          {/* Send button inside input */}
          <Button
            onClick={handleSend}
            disabled={sendMessageMutation.isPending || !message.trim() || !isOnline || isUploadingMedia}
            className="shrink-0"
            style={applyEmbedStyles ? { 
              background: `linear-gradient(180deg, ${primaryColor}FF 0%, ${primaryColor}E6 60%, ${primaryColor}D9 100%)`,
              boxShadow: `0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.1)`,
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              width: '40px',
              height: '40px',
              padding: 0,
              color: getContrastColor(primaryColor),
            } : { 
              backgroundColor: primaryColor,
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              padding: 0,
              color: getContrastColor(primaryColor),
            }}
            data-testid="button-widget-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!isOnline && (
          <p 
            className="text-xs text-center mt-2"
            style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#374151' } : undefined}
          >
            We're currently offline. Please try again later.
          </p>
        )}
        {/* Powered by Chatvice branding */}
        <div className="flex items-center justify-center gap-1.5 mt-3 pb-1">
          <span 
            className="text-[10px]"
            style={applyEmbedStyles ? { color: widgetIsDark ? '#ffffff' : '#6b7280' } : undefined}
          >Powered by</span>
          <a 
            href="https://chatvice.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="opacity-70 hover:opacity-100 transition-opacity"
            data-testid="link-powered-by-chatvice"
          >
            <img 
              src={widgetIsDark ? chatviceLogoDark : chatviceLogoLight} 
              alt="Chatvice" 
              className="h-4"
            />
          </a>
        </div>
      </div>
      </div>
      )}
      </div>
      {/* End of main content area wrapper */}
      
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
