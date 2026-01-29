import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, Send, Paperclip, MoreVertical, Loader2, Image, FileText, Video, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { chatRoutes } from "@/lib/chat-routes";

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  messageType: string;
  payload?: any;
  createdAt: string;
  clientMessageId?: string;
}

interface PersonalChatInfo {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto: string | null;
  lastMessageAt: string | null;
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

export default function PersonalChatPage() {
  const params = useParams<{ chatId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatId = params.chatId;

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
    mutationFn: async ({ content, clientMessageId }: { content: string; clientMessageId: string }) => {
      return apiRequest("POST", `/api/customer/personal-chats/${chatId}/messages`, {
        content,
        clientMessageId,
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
        title: "Failed to send message",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !chatId) return;

    const clientMessageId = generateClientId();
    const pendingMsg: PendingMessage = {
      clientMessageId,
      content: trimmedMessage,
      senderId: "me",
      createdAt: new Date().toISOString(),
      messageType: "text",
      isPending: true,
    };

    setPendingMessages(prev => [...prev, pendingMsg]);
    setMessage("");
    sendMessageMutation.mutate({ content: trimmedMessage, clientMessageId });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

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
      return "Today";
    }
    if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
      return "Yesterday";
    }
    return format(date, "MMMM d, yyyy");
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
          <span className="font-medium">Chat not found</span>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 glass-card rounded-xl">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Chat not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This conversation may have been deleted or is no longer available.
            </p>
            <Button onClick={() => navigate(chatRoutes.contacts())}>
              Back to Contacts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(allMessages);

  return (
    <div className="fixed inset-0 flex flex-col chat-background-pattern">
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
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "This feature is in development" })}>
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "This feature is in development" })}>
              Clear Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => toast({ title: "Coming Soon", description: "This feature is in development" })}
              className="text-destructive"
            >
              Block User
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
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/customer/personal-chats", chatId, "messages"] })}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="glass-card rounded-xl p-6">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Start the conversation</h3>
              <p className="text-sm text-muted-foreground">
                Say hi to {chatInfo.participantName}!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messageGroups.map((group) => (
              <div key={group.date}>
                <div className="flex items-center justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-background/80 px-3 py-1 rounded-full">
                    {formatDateLabel(group.date)}
                  </span>
                </div>
                {group.messages.map((msg, idx) => {
                  const isMe = msg.senderId === "me" || ('isPending' in msg);
                  return (
                    <div
                      key={msg.clientMessageId || msg.id || idx}
                      className={cn(
                        "flex mb-2",
                        isMe ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "glass-card rounded-bl-md"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={cn(
                          "flex items-center gap-1 mt-1",
                          isMe ? "justify-end" : "justify-start"
                        )}>
                          <span className={cn(
                            "text-[10px]",
                            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {format(new Date(msg.createdAt), "HH:mm")}
                          </span>
                          {'isPending' in msg && msg.isPending && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-3 glass-footer border-t border-border/50">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-background/50"
            data-testid="input-message"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!message.trim() || sendMessageMutation.isPending}
            data-testid="button-send"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
