import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Volume2, Upload, Play, AlertTriangle, MessageCircle, UserPlus, Square, Send, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import type { NotificationSetting } from "@shared/schema";

const defaultSounds = [
  { id: "incoming-msg", name: "Incoming Message", url: "/sounds/incoming-msg.mp3" },
  { id: "notification-alert", name: "Notification Alert", url: "/sounds/notification-alert.mp3" },
  { id: "live-chat", name: "Live Chat", url: "/sounds/live-chat.mp3" },
  { id: "alert", name: "Alert", url: "/sounds/alert.mp3" },
  { id: "new-notification", name: "New Notification", url: "/sounds/new-notification.mp3" },
  { id: "text-message", name: "Text Message", url: "/sounds/text-message.mp3" },
  { id: "gaming-lock", name: "Gaming Lock", url: "/sounds/gaming-lock.wav" },
  { id: "quick-lock", name: "Quick Lock", url: "/sounds/quick-lock.wav" },
  { id: "sci-fi-confirm", name: "Sci-Fi Confirm", url: "/sounds/sci-fi-confirm.wav" },
  { id: "interface-start", name: "Interface Start", url: "/sounds/interface-start.wav" },
];

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: settings, isLoading } = useQuery<NotificationSetting>({
    queryKey: ["/api/notification-settings"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<NotificationSetting>) => {
      return apiRequest("PUT", "/api/notification-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({ title: "Notification settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("sound", file);
      formData.append("name", file.name);
      
      const res = await fetch("/api/notification-settings/upload-sound", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({ title: "Sound uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload sound", variant: "destructive" });
    },
  });

  function handleUpdate(key: string, value: any) {
    updateMutation.mutate({ [key]: value });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        toast({ title: "File must be an audio file", variant: "destructive" });
        return;
      }
      uploadMutation.mutate(file);
    }
  }

  async function playSound(soundId: string) {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(null);
      return;
    }

    setIsPlaying(soundId);
    
    // Check custom sounds first
    const customSound = customSounds.find((s: any) => s.url === soundId);
    if (customSound) {
      try {
        const audio = new Audio(customSound.url);
        audio.volume = 1.0;
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlaying(null);
          audioRef.current = null;
          toast({ title: "Could not play sound", variant: "destructive" });
        };
        await audio.play();
      } catch (error) {
        setIsPlaying(null);
        toast({ title: "Could not play sound", variant: "destructive" });
      }
      return;
    }

    // Check default sounds (now audio files)
    const defaultSound = defaultSounds.find(s => s.id === soundId);
    if (defaultSound) {
      try {
        const audio = new Audio(defaultSound.url);
        audio.volume = 1.0;
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlaying(null);
          audioRef.current = null;
          toast({ title: "Could not play sound", variant: "destructive" });
        };
        await audio.play();
      } catch (error) {
        setIsPlaying(null);
        toast({ title: "Could not play sound. Please interact with the page first.", variant: "destructive" });
      }
    } else {
      setIsPlaying(null);
      toast({ title: "Sound not found", variant: "destructive" });
    }
  }

  const customSounds = (settings?.customSounds as any[]) || [];
  const allSounds = [...defaultSounds.map(s => ({ id: s.id, name: s.name })), ...customSounds.map((s: any) => ({ id: s.url, name: s.name }))];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Bell className="w-6 h-6" />
          Notification Settings
        </h1>
        <p className="text-muted-foreground">Configure sounds and notifications for various chat events</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-500" />
              New Incoming Chat
            </CardTitle>
            <CardDescription>Notification when a new customer starts a chat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="incomingEnabled">Enable Notification</Label>
              <Switch
                id="incomingEnabled"
                checked={settings?.incomingChatEnabled ?? true}
                onCheckedChange={(checked) => handleUpdate("incomingChatEnabled", checked)}
                data-testid="switch-incoming-enabled"
              />
            </div>
            <div className="space-y-2">
              <Label>Sound Attached</Label>
              <div className="flex gap-2">
                <Select 
                  value={settings?.incomingChatSound || "incoming-msg"}
                  onValueChange={(value) => handleUpdate("incomingChatSound", value)}
                >
                  <SelectTrigger className="flex-1" data-testid="select-incoming-sound">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSounds.map((sound) => (
                      <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => playSound(settings?.incomingChatSound || "incoming-msg")}
                  data-testid="button-play-incoming"
                >
                  {isPlaying === (settings?.incomingChatSound || "incoming-msg") ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Chat Reply
            </CardTitle>
            <CardDescription>Notification when there's a new message from customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="replyEnabled">Enable Notification</Label>
              <Switch
                id="replyEnabled"
                checked={settings?.chatReplyEnabled ?? true}
                onCheckedChange={(checked) => handleUpdate("chatReplyEnabled", checked)}
                data-testid="switch-reply-enabled"
              />
            </div>
            <div className="space-y-2">
              <Label>Sound Attached</Label>
              <div className="flex gap-2">
                <Select 
                  value={settings?.chatReplySound || "live-chat"}
                  onValueChange={(value) => handleUpdate("chatReplySound", value)}
                >
                  <SelectTrigger className="flex-1" data-testid="select-reply-sound">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSounds.map((sound) => (
                      <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => playSound(settings?.chatReplySound || "live-chat")}
                  data-testid="button-play-reply"
                >
                  {isPlaying === (settings?.chatReplySound || "live-chat") ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Angry Customer
            </CardTitle>
            <CardDescription>Notification when the system detects an angry or frustrated customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="angryEnabled">Enable Notification</Label>
              <Switch
                id="angryEnabled"
                checked={settings?.angryCustomerEnabled ?? true}
                onCheckedChange={(checked) => handleUpdate("angryCustomerEnabled", checked)}
                data-testid="switch-angry-enabled"
              />
            </div>
            <div className="space-y-2">
              <Label>Sound Attached</Label>
              <div className="flex gap-2">
                <Select 
                  value={settings?.angryCustomerSound || "notification-alert"}
                  onValueChange={(value) => handleUpdate("angryCustomerSound", value)}
                >
                  <SelectTrigger className="flex-1" data-testid="select-angry-sound">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSounds.map((sound) => (
                      <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => playSound(settings?.angryCustomerSound || "notification-alert")}
                  data-testid="button-play-angry"
                >
                  {isPlaying === (settings?.angryCustomerSound || "notification-alert") ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Custom Sound
            </CardTitle>
            <CardDescription>Upload audio files to use as notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Volume2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Drag and drop an audio file or click to select
              </p>
              <Input
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/flac"
                onChange={handleFileUpload}
                className="hidden"
                id="sound-upload"
                data-testid="input-upload-sound"
              />
              <Label htmlFor="sound-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Select Audio File
                  </span>
                </Button>
              </Label>
              <p className="text-xs text-muted-foreground mt-2">
                Supported formats: MP3, WAV, OGG, M4A, AAC
              </p>
            </div>

            {customSounds.length > 0 && (
              <div className="space-y-2">
                <Label>Your Custom Sounds</Label>
                <div className="space-y-2">
                  {customSounds.map((sound: any, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      data-testid={`custom-sound-${index}`}
                    >
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{sound.name}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => playSound(sound.url)}
                      >
                        {isPlaying === sound.url ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Telegram Notifications
            </CardTitle>
            <CardDescription>
              Receive chat notifications via Telegram Bot even when browser is closed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Telegram Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send new chat alerts to your Telegram
                </p>
              </div>
              <Switch
                checked={settings?.telegramEnabled || false}
                onCheckedChange={(checked) => handleUpdate("telegramEnabled", checked)}
                data-testid="switch-telegram-enabled"
              />
            </div>

            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="telegram-bot-token">Bot Token</Label>
                <Input
                  id="telegram-bot-token"
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={settings?.telegramBotToken || ""}
                  onChange={(e) => handleUpdate("telegramBotToken", e.target.value)}
                  data-testid="input-telegram-bot-token"
                />
                <p className="text-xs text-muted-foreground">
                  Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">@BotFather <ExternalLink className="w-3 h-3" /></a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram-chat-id">Chat ID</Label>
                <Input
                  id="telegram-chat-id"
                  placeholder="Your chat ID or group ID"
                  value={settings?.telegramChatId || ""}
                  onChange={(e) => handleUpdate("telegramChatId", e.target.value)}
                  data-testid="input-telegram-chat-id"
                />
                <p className="text-xs text-muted-foreground">
                  Get your Chat ID from <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">@userinfobot <ExternalLink className="w-3 h-3" /></a>
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  if (!settings?.telegramBotToken || !settings?.telegramChatId) {
                    toast({ title: "Please enter Bot Token and Chat ID first", variant: "destructive" });
                    return;
                  }
                  try {
                    const res = await apiRequest("POST", "/api/notification-settings/test-telegram");
                    if (res.ok) {
                      toast({ title: "Test notification sent! Check your Telegram." });
                    } else {
                      toast({ title: "Failed to send test notification", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Failed to send test notification", variant: "destructive" });
                  }
                }}
                data-testid="button-test-telegram"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Test Notification
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">How to set up Telegram notifications:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Open Telegram and search for @BotFather</li>
                <li>Send /newbot and follow the instructions to create a bot</li>
                <li>Copy the Bot Token and paste it above</li>
                <li>Search for @userinfobot to get your Chat ID</li>
                <li>Start a chat with your new bot (important!)</li>
                <li>Enable the toggle and test the notification</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
