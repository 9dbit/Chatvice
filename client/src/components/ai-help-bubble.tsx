import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, X, Send, Loader2, Sparkles, Minimize2, GripVertical, EyeOff, Eye } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
const CARD_HEIGHT = 500;
const BUTTON_SIZE = 56;

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
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    const saved = safeGetItem(HIDDEN_KEY);
    return saved === "true";
  });
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
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: publicMode ? PUBLIC_INITIAL_MESSAGE : INITIAL_MESSAGE }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPosition = useRef({ x: 0, y: 0 });

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
          title="Show Chatvice Guide"
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
          className="relative group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isHovered && (
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 animate-in fade-in slide-in-from-right-2 duration-150">
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
          
          <Button
            size="lg"
            onClick={() => setIsOpen(true)}
            className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
            data-testid="button-ai-help"
          >
            <Sparkles className="w-6 h-6" />
          </Button>
          <div className="absolute -top-2 -right-1">
            <span className="flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500"></span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div 
        className="fixed z-50"
        style={{ bottom: position.y, right: position.x }}
      >
        <Card className="w-64 shadow-xl border-2 border-primary/20">
          <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 gap-2 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Chatvice Guide</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(false)}
                data-testid="button-maximize-help"
              >
                <Minimize2 className="w-3 h-3 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
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
      style={{ bottom: position.y, right: position.x }}
    >
      <Card className="w-96 shadow-xl border-2 border-primary/20">
        <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 gap-2 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Chatvice Guide</CardTitle>
              <p className="text-xs text-muted-foreground">Here to help you succeed</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(true)}
              data-testid="button-minimize-help"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-help"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-80 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div 
                    className={`rounded-2xl p-3 max-w-[85%] ${
                      msg.role === "user" 
                        ? "bg-foreground text-background rounded-br-sm" 
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {askMutation.isPending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
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
          <div className="p-4 border-t">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about Chatvice..."
                className="flex-1"
                disabled={askMutation.isPending}
                data-testid="input-help-question"
              />
              <Button 
                size="icon" 
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
