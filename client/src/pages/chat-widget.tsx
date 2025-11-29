import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Minimize2, HeadphonesIcon, User } from "lucide-react";
import type { Message } from "@shared/schema";

interface ChatWidgetProps {
  merchantId: string;
  sessionId?: string;
  embedded?: boolean;
}

export default function ChatWidget({ merchantId, sessionId: initialSessionId, embedded = false }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [sessionId] = useState(() => initialSessionId || `sess_${Math.random().toString(36).substring(2, 12)}`);
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<Array<{ from: string; content: string; timestamp: Date }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: merchantConfig } = useQuery({
    queryKey: ["/api/merchant/status", merchantId],
    enabled: !!merchantId,
  });

  const { data: serverMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages", sessionId],
    enabled: !!sessionId && isOpen,
    refetchInterval: 2000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      return apiRequest("POST", "/api/chat/ask", {
        merchantId,
        sessionId,
        message: userMessage,
      });
    },
    onSuccess: (data: any) => {
      setLocalMessages((prev) => [
        ...prev,
        { from: data.mode === "HUMAN" ? "system" : "jeany", content: data.answer, timestamp: new Date() },
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/messages", sessionId] });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages, serverMessages]);

  useEffect(() => {
    if (isOpen && localMessages.length === 0 && merchantConfig?.welcomeMessage) {
      setLocalMessages([
        { from: "jeany", content: merchantConfig.welcomeMessage, timestamp: new Date() },
      ]);
    }
  }, [isOpen, merchantConfig]);

  const handleSend = () => {
    if (!message.trim()) return;
    const userMessage = message.trim();
    setLocalMessages((prev) => [...prev, { from: "user", content: userMessage, timestamp: new Date() }]);
    setMessage("");
    sendMessageMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const primaryColor = merchantConfig?.primaryColor || "#6b5dfc";
  const iconSize = merchantConfig?.iconSize || 70;
  const isOnline = merchantConfig?.online ?? true;

  const allMessages = serverMessages && serverMessages.length > 0 ? serverMessages : localMessages;

  if (!embedded && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 rounded-full shadow-lg flex items-center justify-center z-50 transition-transform hover:scale-105"
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
    );
  }

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
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            {merchantConfig?.iconUrl ? (
              <img
                src={merchantConfig.iconUrl}
                alt="Chat"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <Bot className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="text-white">
            <p className="font-medium text-sm">Jeany AI</p>
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
            <div
              key={index}
              className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.from !== "user" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  {msg.from === "supervisor" ? (
                    <HeadphonesIcon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
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
          ))}
          {sendMessageMutation.isPending && (
            <div className="flex gap-2 justify-start">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Bot className="w-3.5 h-3.5" style={{ color: primaryColor }} />
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

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!isOnline}
            className="flex-1"
            data-testid="input-widget-message"
          />
          <Button
            onClick={handleSend}
            disabled={sendMessageMutation.isPending || !message.trim() || !isOnline}
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
