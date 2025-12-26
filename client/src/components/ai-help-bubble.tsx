import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, X, Send, Loader2, Sparkles, Minimize2, GripVertical, EyeOff, Eye, ExternalLink, ChevronRight, ChevronUp } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PlatformSettings {
  guide_enabled?: string;
  guide_name?: string;
  guide_welcome_message?: string;
  guide_show_landing?: string;
  guide_show_dashboard?: string;
  guide_widget_position?: string;
  guide_widget_color?: string;
  guide_bubble_enabled?: string;
  guide_bubble_text?: string;
  guide_button_icon_url?: string;
  guide_button_icon_width?: string;
  guide_button_icon_height?: string;
  guide_promo_image_enabled?: string;
  guide_promo_image_url?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ParsedContent {
  type: "text" | "button" | "link";
  content: string;
  action?: string;
  url?: string;
}

// Parse AI response to extract buttons and links
function parseMessageContent(content: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  
  // Pattern for buttons: [BTN:Label:action] or [BTN:Label]
  // Pattern for links: [LINK:Text:/path] or [LINK:Text:https://...]
  const regex = /\[BTN:([^\]:]+)(?::([^\]]+))?\]|\[LINK:([^\]:]+):([^\]]+)\]/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Add text before this match (preserve whitespace/newlines)
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: "text", content: textBefore });
      }
    }
    
    if (match[1]) {
      // Button match: [BTN:Label:action] or [BTN:Label]
      parts.push({ 
        type: "button", 
        content: match[1], 
        action: match[2] || match[1] 
      });
    } else if (match[3] && match[4]) {
      // Link match: [LINK:Text:url]
      parts.push({ 
        type: "link", 
        content: match[3], 
        url: match[4] 
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text (preserve whitespace)
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining) {
      parts.push({ type: "text", content: remaining });
    }
  }
  
  // If no special elements found, return original content as text
  if (parts.length === 0) {
    parts.push({ type: "text", content });
  }
  
  return parts;
}

const INITIAL_MESSAGE = `Hi! I'm Chatvice Guide, here to help you make the most of your Chatvice dashboard. I can help you with:

- Setting up your AI agents
- Managing knowledge sources
- Understanding analytics
- Configuring your chat widget
- Subscription plans and billing
- Best practices for customer support

What would you like to know?`;

const CARD_WIDTH = 384;
const CARD_HEIGHT = 700; // Increased by 40% from 500
const BUTTON_SIZE = 56;
const WELCOME_BUBBLE_DISMISSED_KEY_SUFFIX = "-welcome-dismissed";

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
  } catch {
    return null;
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch {
    // Silently fail if localStorage is not available
  }
}

interface AIHelpBubbleProps {
  publicMode?: boolean;
}

const PUBLIC_INITIAL_MESSAGE = `Hi! I'm Chatvice Guide. I can help you learn about our AI customer service platform:

- What is Chatvice?
- Our key features
- Pricing plans
- How to get started
- Integration options

What would you like to know?`;

export function AIHelpBubble({ publicMode = false }: AIHelpBubbleProps) {
  const storageKeySuffix = publicMode ? "-public" : "-dashboard";
  const STORAGE_KEY = `chatvice-guide-position${storageKeySuffix}`;
  const HIDDEN_KEY = `chatvice-guide-hidden${storageKeySuffix}`;
  const WELCOME_KEY = `chatvice-guide${WELCOME_BUBBLE_DISMISSED_KEY_SUFFIX}${storageKeySuffix}`;
  
  // Fetch platform settings for guide configuration
  const { data: platformSettings, isLoading: settingsLoading, isError: settingsError } = useQuery<PlatformSettings>({
    queryKey: ["/api/platform-settings"],
    retry: 2,
    staleTime: 30000,
  });
  
  // Settings are ready when loaded successfully OR when errored (use fallbacks)
  const settingsReady = !settingsLoading;
  const hasSettings = platformSettings !== undefined;
  
  // Always use fallback defaults when settings are missing or failed to load
  // This ensures the widget always works even if API is unavailable
  const defaultWelcomeMessage = publicMode ? PUBLIC_INITIAL_MESSAGE : INITIAL_MESSAGE;
  
  const isEnabled = hasSettings ? platformSettings?.guide_enabled !== "false" : true;
  const guideName = platformSettings?.guide_name || "Chatvice Guide";
  const welcomeMessage = platformSettings?.guide_welcome_message || defaultWelcomeMessage;
  const showOnLanding = hasSettings ? platformSettings?.guide_show_landing !== "false" : true;
  const showOnDashboard = hasSettings ? platformSettings?.guide_show_dashboard !== "false" : true;
  const widgetColor = platformSettings?.guide_widget_color || "#7c3aed";
  const bubbleEnabled = hasSettings ? platformSettings?.guide_bubble_enabled !== "false" : true;
  const bubbleText = platformSettings?.guide_bubble_text || "Need help?";
  const buttonIconUrl = platformSettings?.guide_button_icon_url || "";
  const buttonIconWidth = parseInt(platformSettings?.guide_button_icon_width || "0") || 0;
  const buttonIconHeight = parseInt(platformSettings?.guide_button_icon_height || "0") || 0;
  const promoImageEnabled = platformSettings?.guide_promo_image_enabled === "true";
  const promoImageUrl = platformSettings?.guide_promo_image_url || "";
  
  // Determine if widget should be shown - always show with defaults if API fails
  const shouldShow = settingsReady && isEnabled && (publicMode ? showOnLanding : showOnDashboard);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    const saved = safeGetItem(HIDDEN_KEY);
    return saved === "true";
  });
  const [showWelcomeBubble, setShowWelcomeBubble] = useState(true);
  const [bubbleCollapsed, setBubbleCollapsed] = useState(false);
  const [bubbleTranslateY, setBubbleTranslateY] = useState(0);
  const bubbleTouchStart = useRef<{ y: number; time: number } | null>(null);
  const lastDismissedAt = useRef<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = safeGetItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: 24, y: 24 };
      }
    }
    return { x: 24, y: 24 };
  });
  // Session storage key for conversation persistence
  const CONVERSATION_KEY = `chatvice-guide-conversation${storageKeySuffix}`;
  
  // Load conversation from sessionStorage or initialize with welcome message
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem(CONVERSATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
    return [];
  });
  
  const isInitialized = useRef(messages.length > 0);
  
  // Initialize messages ONCE when settings are loaded - never reset during conversation
  useEffect(() => {
    if (settingsReady && welcomeMessage && !isInitialized.current && messages.length === 0) {
      isInitialized.current = true;
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [settingsReady, welcomeMessage, messages.length]);
  
  // Persist messages to sessionStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(CONVERSATION_KEY, JSON.stringify(messages));
      } catch {
        // Ignore sessionStorage errors
      }
    }
  }, [messages, CONVERSATION_KEY]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPosition = useRef({ x: 0, y: 0 });

  const dismissWelcomeBubble = () => {
    setShowWelcomeBubble(false);
    lastDismissedAt.current = Date.now();
  };

  const handleOpenFromWelcome = () => {
    dismissWelcomeBubble();
    setIsOpen(true);
  };

  // Welcome bubble swipe handlers for mobile
  const handleBubbleTouchStart = (e: React.TouchEvent) => {
    bubbleTouchStart.current = { y: e.touches[0].clientY, time: Date.now() };
    setBubbleTranslateY(0);
  };

  const handleBubbleTouchMove = (e: React.TouchEvent) => {
    if (!bubbleTouchStart.current) return;
    const deltaY = e.touches[0].clientY - bubbleTouchStart.current.y;
    // Limit to half screen height (50vh)
    const maxDrag = window.innerHeight * 0.5;
    const clampedDelta = Math.max(-maxDrag, Math.min(maxDrag, deltaY));
    setBubbleTranslateY(clampedDelta);
  };

  const handleBubbleTouchEnd = () => {
    if (!bubbleTouchStart.current) return;
    const threshold = 50; // pixels to trigger toggle
    
    if (bubbleTranslateY > threshold) {
      // Swiped down - collapse
      setBubbleCollapsed(true);
    } else if (bubbleTranslateY < -threshold) {
      // Swiped up - expand
      setBubbleCollapsed(false);
    }
    
    setBubbleTranslateY(0);
    bubbleTouchStart.current = null;
  };

  const toggleBubbleCollapse = () => {
    setBubbleCollapsed(!bubbleCollapsed);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceDismissal = Date.now() - lastDismissedAt.current;
      if (!isOpen && !isHidden && timeSinceDismissal >= 60000) {
        setShowWelcomeBubble(true);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isOpen, isHidden]);

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    safeSetItem(HIDDEN_KEY, String(isHidden));
  }, [isHidden]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    initialPosition.current = { ...position };
  }, [position]);

  const handleDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = dragStartPos.current.x - clientX;
    const deltaY = dragStartPos.current.y - clientY;
    
    const minX = 0;
    const maxX = Math.max(0, window.innerWidth - CARD_WIDTH - 24);
    const minY = 0;
    const maxY = Math.max(0, window.innerHeight - CARD_HEIGHT - 24);
    
    const newX = Math.max(minX, Math.min(maxX, initialPosition.current.x + deltaX));
    const newY = Math.max(minY, Math.min(maxY, initialPosition.current.y + deltaY));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDrag);
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDrag);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDrag);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDrag, handleDragEnd]);

  const askMutation = useMutation({
    mutationFn: async ({ question, conversationHistory }: { question: string; conversationHistory: Message[] }) => {
      const endpoint = publicMode ? "/api/help/public-ask" : "/api/help/ask";
      const response = await apiRequest("POST", endpoint, { question, conversationHistory });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble responding right now. Please try again later or contact support at support@chatvice.ai." 
      }]);
    }
  });

  // Direct send function that takes message as parameter (for button clicks)
  const sendMessage = (messageText: string) => {
    if (!messageText.trim() || askMutation.isPending) return;
    
    const userMessage = messageText.trim();
    
    // Get fresh messages from sessionStorage
    let currentMessages = messages;
    try {
      const saved = sessionStorage.getItem(CONVERSATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentMessages = parsed;
        }
      }
    } catch {
      // Use state if sessionStorage fails
    }
    
    // Build conversation history - exclude welcome message
    const conversationHistory = currentMessages.length > 1 ? currentMessages.slice(1) : [];
    
    // Update UI with new user message
    const newMessages = [...currentMessages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setInput("");
    
    // Save to sessionStorage
    try {
      sessionStorage.setItem(CONVERSATION_KEY, JSON.stringify(newMessages));
    } catch {
      // Ignore
    }
    
    askMutation.mutate({ question: userMessage, conversationHistory });
  };

  const handleSend = () => {
    if (!input.trim() || askMutation.isPending) return;
    
    const userMessage = input.trim();
    
    // Get fresh messages from sessionStorage to avoid stale state issues
    let currentMessages = messages;
    try {
      const saved = sessionStorage.getItem(CONVERSATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentMessages = parsed;
        }
      }
    } catch {
      // Use state if sessionStorage fails
    }
    
    // Build conversation history - exclude welcome message (first assistant message)
    const conversationHistory = currentMessages.length > 1 ? currentMessages.slice(1) : [];
    
    // Update UI with new user message
    const newMessages = [...currentMessages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setInput("");
    
    // Also save to sessionStorage immediately
    try {
      sessionStorage.setItem(CONVERSATION_KEY, JSON.stringify(newMessages));
    } catch {
      // Ignore
    }
    
    // Send question and history (history doesn't include current question - backend adds it)
    askMutation.mutate({ question: userMessage, conversationHistory });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleHidden = () => {
    setIsHidden(!isHidden);
  };

  // Don't render if widget is disabled via platform settings
  if (!shouldShow) {
    return null;
  }

  if (isHidden) {
    return (
      <div 
        className="fixed z-50"
        style={{ bottom: position.y, right: position.x }}
      >
        <Button
          size="icon"
          variant="outline"
          onClick={toggleHidden}
          className="rounded-full w-10 h-10 shadow-lg bg-background/80 backdrop-blur-sm"
          title={`Show ${guideName}`}
          data-testid="button-show-ai-help"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div 
        className="fixed z-50"
        style={{ bottom: position.y, right: position.x }}
      >
        <div 
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Expanded hover hotspot that includes the side buttons area */}
          <div className="absolute -left-14 -top-2 -bottom-2 -right-2 pointer-events-auto" />
          
          {isHovered && (
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-150 z-10">
              <button
                onClick={toggleHidden}
                className="w-8 h-8 bg-muted/90 hover:bg-muted rounded-full shadow-md transition-colors flex items-center justify-center"
                title="Hide guide"
                data-testid="button-hide-ai-help"
              >
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                className="w-8 h-8 bg-muted/90 hover:bg-muted rounded-full shadow-md cursor-grab active:cursor-grabbing transition-colors flex items-center justify-center"
                title="Drag to reposition"
                data-testid="button-drag-ai-help"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          
          {/* Combined Promo Image + Welcome Bubble container with smooth toggle */}
          {showWelcomeBubble && bubbleEnabled && (
            <div 
              className="absolute bottom-full right-0 mb-2 touch-pan-y"
              style={{
                transform: `translateY(${bubbleTranslateY}px)`,
                transition: bubbleTranslateY === 0 ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease' : 'none',
                opacity: bubbleCollapsed ? 0 : 1,
                pointerEvents: bubbleCollapsed ? 'none' : 'auto',
                maxHeight: '50vh',
              }}
              onTouchStart={handleBubbleTouchStart}
              onTouchMove={handleBubbleTouchMove}
              onTouchEnd={handleBubbleTouchEnd}
              data-testid="container-welcome-bubble"
            >
              {/* Drag handle indicator for mobile */}
              <div className="flex justify-center mb-1 md:hidden">
                <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              {/* Promo Image - displayed above welcome bubble when enabled, same width */}
              {promoImageEnabled && promoImageUrl && (
                <img 
                  src={promoImageUrl} 
                  alt="Promotion" 
                  className="w-52 h-auto object-cover rounded-t-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  data-testid="img-promo-bubble"
                />
              )}
              {/* Welcome bubble - compact style */}
              <div className={`bg-card shadow-xl p-3 w-52 border border-border ${promoImageEnabled && promoImageUrl ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">
                    {bubbleEnabled ? bubbleText : (publicMode ? "Need help?" : "Need help navigating?")}
                  </p>
                  <button
                    onClick={dismissWelcomeBubble}
                    className="p-0.5 rounded-full hover:bg-muted transition-colors flex-shrink-0 -mr-0.5"
                    data-testid="button-dismiss-welcome"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {publicMode 
                    ? `Ask me about ${guideName.replace('Guide', '').trim()} features and pricing!` 
                    : "I can guide you through the dashboard features."}
                </p>
                <Button
                  size="sm"
                  onClick={handleOpenFromWelcome}
                  className="w-full mt-2 h-7 text-xs text-white bg-primary hover:bg-primary/90"
                  data-testid="button-open-from-welcome"
                >
                  Chat with Guide
                </Button>
              </div>
            </div>
          )}
          
          {/* Collapsed state indicator - tap to expand (mobile only) */}
          {showWelcomeBubble && bubbleCollapsed && bubbleEnabled && (
            <button
              onClick={toggleBubbleCollapse}
              className="absolute bottom-full right-0 mb-2 w-52 py-2 bg-card/90 backdrop-blur-sm rounded-xl border border-border shadow-lg flex items-center justify-center gap-2 transition-all duration-300 md:hidden"
              data-testid="button-expand-bubble"
            >
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tap to expand</span>
            </button>
          )}
          
          {buttonIconUrl && buttonIconWidth > 0 && buttonIconHeight > 0 ? (
            <button
              onClick={() => setIsOpen(true)}
              className="shadow-lg flex items-center justify-center relative z-10 transition-transform hover:scale-105"
              style={{ 
                width: buttonIconWidth,
                height: buttonIconHeight,
              }}
              data-testid="button-ai-help"
            >
              <img 
                src={buttonIconUrl} 
                alt={guideName}
                className="w-full h-full object-contain"
              />
              <span
                className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white bg-green-500"
              />
            </button>
          ) : (
            <button
              onClick={() => setIsOpen(true)}
              className="shadow-lg rounded-full w-14 h-14 flex items-center justify-center text-white relative z-10 transition-transform hover:scale-105"
              style={{ backgroundColor: widgetColor }}
              data-testid="button-ai-help"
            >
              <Bot className="w-7 h-7" />
              <span
                className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white bg-green-500"
              />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div 
        className="fixed z-50"
        style={{ bottom: position.y, right: Math.max(8, position.x) }}
      >
        <div className="w-56 sm:w-64 max-w-[calc(100vw-16px)] rounded-xl shadow-xl border border-white/20 backdrop-blur-md bg-background/80 dark:bg-background/70">
          <div className="p-2.5 sm:p-3 flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${widgetColor}30` }}
              >
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: widgetColor }} />
              </div>
              <span className="font-semibold text-xs sm:text-sm truncate">{guideName}</span>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-muted"
                onClick={() => setIsMinimized(false)}
                data-testid="button-maximize-help"
              >
                <Minimize2 className="w-3 h-3 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-muted"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-help"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50"
      style={{ bottom: position.y, right: Math.max(8, position.x) }}
    >
      <Card className="w-[320px] sm:w-80 md:w-96 max-w-[calc(100vw-16px)] shadow-xl border border-border overflow-hidden">
        <CardHeader className="p-3 sm:p-4 flex flex-row items-center justify-between space-y-0 gap-2" style={{ backgroundColor: widgetColor }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base truncate text-white">{guideName}</CardTitle>
              <p className="text-[10px] sm:text-xs text-white/70 truncate">Here to help you succeed</p>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
              onClick={() => setIsMinimized(true)}
              data-testid="button-minimize-help"
            >
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-help"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[360px] sm:h-[448px] p-3 sm:p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const parsedContent = msg.role === "assistant" ? parseMessageContent(msg.content) : null;
                const hasButtons = parsedContent?.some(p => p.type === "button");
                
                return (
                  <div 
                    key={index} 
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div 
                      className={`rounded-2xl p-3 max-w-[85%] ${
                        msg.role === "user" 
                          ? "bg-primary text-white rounded-br-sm" 
                          : "bg-muted rounded-bl-sm"
                      }`}
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {msg.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      ) : (
                        <div className="text-sm break-words">
                          {parsedContent?.map((part, partIndex) => {
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
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                  data-testid={`link-feature-${partIndex}`}
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
                              {parsedContent?.filter(p => p.type === "button").map((btn, btnIndex) => (
                                <button
                                  key={`btn-${btnIndex}`}
                                  className="px-3 py-1 text-xs rounded-md border transition-all duration-200 bg-white/10 hover:bg-white/20 text-gray-200 border-gray-400/50"
                                  onClick={() => sendMessage(btn.action || btn.content)}
                                  disabled={askMutation.isPending}
                                  data-testid={`button-quick-${btnIndex}`}
                                >
                                  <ChevronRight className="w-3 h-3 mr-1 inline" />
                                  {btn.content}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {askMutation.isPending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-3 sm:p-4 border-t">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 text-sm h-9"
                disabled={askMutation.isPending}
                data-testid="input-help-question"
              />
              <Button 
                size="icon" 
                className="h-9 w-9 flex-shrink-0"
                onClick={handleSend}
                disabled={askMutation.isPending || !input.trim()}
                data-testid="button-help-send"
              >
                {askMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
