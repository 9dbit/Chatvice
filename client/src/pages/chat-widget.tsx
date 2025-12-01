import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, Send, X, Minimize2, HeadphonesIcon, User, ImageIcon, Video, Camera, Loader2 } from "lucide-react";
import type { Message, SuggestedQuestion } from "@shared/schema";

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

interface ChatWidgetProps {
  merchantId: string;
  sessionId?: string;
  embedded?: boolean;
}

export default function ChatWidget({ merchantId, sessionId: initialSessionId, embedded = false }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [sessionId] = useState(() => initialSessionId || `sess_${Math.random().toString(36).substring(2, 12)}`);
  const [message, setMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<Array<{ from: string; content: string; timestamp: Date; mediaUrl?: string; mediaType?: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

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

  const [hasUsedSuggestion, setHasUsedSuggestion] = useState(false);

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
      setLocalMessages((prev) => [
        ...prev,
        { from: "jeany", content: data.answer, timestamp: new Date() },
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/messages", sessionId] });
    },
    onError: () => {
      setLocalMessages((prev) => [
        ...prev,
        { from: "jeany", content: "I'm sorry, I couldn't process that quick question. Please type your question in the chat below and I'll be happy to help!", timestamp: new Date() },
      ]);
    },
  });

  const handleSuggestedQuestionClick = (sq: SuggestedQuestion) => {
    setHasUsedSuggestion(true);
    setLocalMessages((prev) => [
      ...prev,
      { from: "user", content: sq.question, timestamp: new Date() },
    ]);
    useSuggestedQuestionMutation.mutate(sq);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (file: File, type: "photo" | "video") => {
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
      
      setLocalMessages((prev) => [
        ...prev,
        { 
          from: "user", 
          content: type === "photo" ? "[Photo attached]" : "[Video attached]",
          timestamp: new Date(),
          mediaUrl: data.url,
          mediaType: type
        },
      ]);
      
      sendMessageMutation.mutate(`[${type === "photo" ? "Customer sent a photo" : "Customer sent a video"}]`);
    } catch {
      setLocalMessages((prev) => [
        ...prev,
        { from: "jeany", content: "Sorry, I couldn't upload that file. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
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
            <p className="font-medium text-sm">{merchantConfig?.agentName || "Jeany AI"}</p>
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
          ))}
          {suggestedQuestions.length > 0 && !hasUsedSuggestion && allMessages.length <= 1 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedQuestions.slice(0, 5).map((sq) => (
                  <Button
                    key={sq.id}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1 px-2.5 text-xs font-normal whitespace-normal text-left hover-elevate"
                    onClick={() => handleSuggestedQuestionClick(sq)}
                    data-testid={`button-suggested-question-${sq.id}`}
                  >
                    {sq.question}
                  </Button>
                ))}
              </div>
            </div>
          )}
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

      <div className="p-4 border-t border-border">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file, "photo");
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
          }}
          data-testid="input-file-video"
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file, "photo");
          }}
          data-testid="input-file-camera"
        />
        <div className="flex gap-2 items-center">
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isOnline || isUploadingMedia}
                  data-testid="button-upload-photo"
                >
                  {isUploadingMedia ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Upload photo</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={!isOnline || isUploadingMedia}
                  data-testid="button-upload-video"
                >
                  <Video className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Upload video</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!isOnline || isUploadingMedia}
                  data-testid="button-take-photo"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Take photo</p>
              </TooltipContent>
            </Tooltip>
          </div>
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
