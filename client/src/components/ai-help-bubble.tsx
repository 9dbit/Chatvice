import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, X, Send, Loader2, Sparkles, Minimize2, GripVertical, EyeOff, Eye } from "lucide-react";
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
}

interface Message {
  role: "user" | "assistant";
  content: string;
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
  
  // Determine if widget should be shown - always show with defaults if API fails
  const shouldShow = settingsReady && isEnabled && (publicMode ? showOnLanding : showOnDashboard);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    const saved = safeGetItem(HIDDEN_KEY);
    return saved === "true";
  });
  const [showWelcomeBubble, setShowWelcomeBubble] = useState(true);
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastWelcomeMessage, setLastWelcomeMessage] = useState<string>("");
  
  // Initialize messages once settings are loaded, and update if welcome message changes
  useEffect(() => {
    if (settingsReady && welcomeMessage) {
      // Only update if this is the first load OR if welcome message changed and no user messages yet
      const hasOnlyBotMessage = messages.length <= 1 && messages.every(m => m.role === "assistant");
      const welcomeChanged = welcomeMessage !== lastWelcomeMessage;
      
      if (messages.length === 0 || (hasOnlyBotMessage && welcomeChanged)) {
        setMessages([{ role: "assistant", content: welcomeMessage }]);
        setLastWelcomeMessage(welcomeMessage);
      }
    }
  }, [settingsReady, welcomeMessage, messages.length, lastWelcomeMessage]);
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
    mutationFn: async (question: string) => {
      const endpoint = publicMode ? "/api/help/public-ask" : "/api/help/ask";
      const response = await apiRequest("POST", endpoint, { question });
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

  const handleSend = () => {
    if (!input.trim() || askMutation.isPending) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    askMutation.mutate(userMessage);
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
                className="p-2 bg-muted/90 hover:bg-muted rounded-full shadow-md transition-colors"
                title="Hide guide"
                data-testid="button-hide-ai-help"
              >
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                className="p-2 bg-muted/90 hover:bg-muted rounded-full shadow-md cursor-grab active:cursor-grabbing transition-colors"
                title="Drag to reposition"
                data-testid="button-drag-ai-help"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          
          {/* Welcome bubble - matching live preview style, only show if enabled in settings */}
          {showWelcomeBubble && !isHovered && bubbleEnabled && (
            <div className="absolute bottom-full right-0 mb-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
              <div className="bg-card rounded-2xl shadow-xl p-4 w-72 border border-border relative">
                <button
                  onClick={dismissWelcomeBubble}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
                  data-testid="button-dismiss-welcome"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="mb-3">
                  <p className="font-semibold text-base">
                    {bubbleEnabled ? bubbleText : (publicMode ? "Need help?" : "Need help navigating?")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {publicMode 
                      ? `Ask me about ${guideName.replace('Guide', '').trim()} features and pricing!` 
                      : "I can guide you through the dashboard features."}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenFromWelcome}
                  className="w-full text-white bg-primary hover:bg-primary/90"
                  data-testid="button-open-from-welcome"
                >
                  Chat with Guide
                </Button>
              </div>
            </div>
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
        <Card className="w-56 sm:w-64 max-w-[calc(100vw-16px)] shadow-xl border border-border">
          <CardHeader className="p-2.5 sm:p-3 flex flex-row items-center justify-between space-y-0 gap-2" style={{ backgroundColor: widgetColor }}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <span className="font-semibold text-xs sm:text-sm truncate text-white">{guideName}</span>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(false)}
                data-testid="button-maximize-help"
              >
                <Minimize2 className="w-3 h-3 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-help"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
        </Card>
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
              {messages.map((msg, index) => (
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
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
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
