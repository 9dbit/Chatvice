import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Volume2, Play, Square, ArrowLeft, MessageCircle, Send, UserPlus, Store } from "lucide-react";
import CustomerLayout from "./layout";
import { chatRoutes } from "@/lib/chat-routes";

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

interface SoundSettings {
  enabled: boolean;
  typingSound: string;
  typingSoundEnabled: boolean;
  sentMessageSound: string;
  sentMessageSoundEnabled: boolean;
  incomingPersonalChatSound: string;
  incomingPersonalChatSoundEnabled: boolean;
  incomingStoreChatSound: string;
  incomingStoreChatSoundEnabled: boolean;
}

const defaultSettings: SoundSettings = {
  enabled: true,
  typingSound: "quick-lock",
  typingSoundEnabled: true,
  sentMessageSound: "text-message",
  sentMessageSoundEnabled: true,
  incomingPersonalChatSound: "incoming-msg",
  incomingPersonalChatSoundEnabled: true,
  incomingStoreChatSound: "live-chat",
  incomingStoreChatSoundEnabled: true,
};

function loadSettings(): SoundSettings {
  try {
    const saved = localStorage.getItem("customer_sound_settings");
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore
  }
  return defaultSettings;
}

function saveSettings(settings: SoundSettings) {
  localStorage.setItem("customer_sound_settings", JSON.stringify(settings));
}

export default function CustomerSoundSettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SoundSettings>(loadSettings);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSetting = <K extends keyof SoundSettings>(key: K, value: SoundSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const playSound = async (soundId: string) => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(null);
      if (isPlaying === soundId) return;
    }

    setIsPlaying(soundId);
    const sound = defaultSounds.find(s => s.id === soundId);
    if (sound) {
      try {
        const audio = new Audio(sound.url);
        audio.volume = 0.5;
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlaying(null);
          audioRef.current = null;
          toast({ title: "Tidak dapat memutar suara", variant: "destructive" });
        };
        await audio.play();
      } catch (error) {
        setIsPlaying(null);
        toast({ title: "Interaksi diperlukan sebelum memutar suara", variant: "destructive" });
      }
    }
  };

  return (
    <CustomerLayout>
      <div className="sm:ml-64">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(chatRoutes.settings())} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
                <Bell className="w-6 h-6" />
                Pengaturan Suara
              </h1>
              <p className="text-muted-foreground">Atur suara notifikasi untuk berbagai event</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Suara Global
              </CardTitle>
              <CardDescription>Aktifkan atau nonaktifkan semua suara notifikasi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Aktifkan Suara</p>
                  <p className="text-sm text-muted-foreground">Matikan untuk membisukan semua notifikasi</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSetting("enabled", checked)}
                  data-testid="switch-sound-enabled"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                Suara Mengetik
              </CardTitle>
              <CardDescription>Suara saat Anda mengetik pesan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Aktifkan</Label>
                <Switch
                  checked={settings.typingSoundEnabled}
                  onCheckedChange={(checked) => updateSetting("typingSoundEnabled", checked)}
                  disabled={!settings.enabled}
                  data-testid="switch-typing-sound-enabled"
                />
              </div>
              <div className="space-y-2">
                <Label>Pilih Suara</Label>
                <div className="flex gap-2">
                  <Select 
                    value={settings.typingSound}
                    onValueChange={(value) => updateSetting("typingSound", value)}
                    disabled={!settings.enabled || !settings.typingSoundEnabled}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-typing-sound">
                      <SelectValue placeholder="Pilih suara" />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultSounds.map(sound => (
                        <SelectItem key={sound.id} value={sound.id}>
                          {sound.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => playSound(settings.typingSound)}
                    disabled={!settings.enabled || !settings.typingSoundEnabled}
                    data-testid="button-play-typing-sound"
                  >
                    {isPlaying === settings.typingSound ? (
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
                <Send className="w-5 h-5 text-green-500" />
                Suara Pesan Terkirim
              </CardTitle>
              <CardDescription>Suara saat pesan berhasil dikirim</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Aktifkan</Label>
                <Switch
                  checked={settings.sentMessageSoundEnabled}
                  onCheckedChange={(checked) => updateSetting("sentMessageSoundEnabled", checked)}
                  disabled={!settings.enabled}
                  data-testid="switch-sent-message-sound-enabled"
                />
              </div>
              <div className="space-y-2">
                <Label>Pilih Suara</Label>
                <div className="flex gap-2">
                  <Select 
                    value={settings.sentMessageSound}
                    onValueChange={(value) => updateSetting("sentMessageSound", value)}
                    disabled={!settings.enabled || !settings.sentMessageSoundEnabled}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-sent-message-sound">
                      <SelectValue placeholder="Pilih suara" />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultSounds.map(sound => (
                        <SelectItem key={sound.id} value={sound.id}>
                          {sound.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => playSound(settings.sentMessageSound)}
                    disabled={!settings.enabled || !settings.sentMessageSoundEnabled}
                    data-testid="button-play-sent-message-sound"
                  >
                    {isPlaying === settings.sentMessageSound ? (
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
                <UserPlus className="w-5 h-5 text-purple-500" />
                Pesan Personal Masuk
              </CardTitle>
              <CardDescription>Suara saat menerima pesan dari kontak pribadi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Aktifkan</Label>
                <Switch
                  checked={settings.incomingPersonalChatSoundEnabled}
                  onCheckedChange={(checked) => updateSetting("incomingPersonalChatSoundEnabled", checked)}
                  disabled={!settings.enabled}
                  data-testid="switch-incoming-personal-chat-sound-enabled"
                />
              </div>
              <div className="space-y-2">
                <Label>Pilih Suara</Label>
                <div className="flex gap-2">
                  <Select 
                    value={settings.incomingPersonalChatSound}
                    onValueChange={(value) => updateSetting("incomingPersonalChatSound", value)}
                    disabled={!settings.enabled || !settings.incomingPersonalChatSoundEnabled}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-incoming-personal-chat-sound">
                      <SelectValue placeholder="Pilih suara" />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultSounds.map(sound => (
                        <SelectItem key={sound.id} value={sound.id}>
                          {sound.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => playSound(settings.incomingPersonalChatSound)}
                    disabled={!settings.enabled || !settings.incomingPersonalChatSoundEnabled}
                    data-testid="button-play-incoming-personal-chat-sound"
                  >
                    {isPlaying === settings.incomingPersonalChatSound ? (
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
                <Store className="w-5 h-5 text-orange-500" />
                Pesan Toko Masuk
              </CardTitle>
              <CardDescription>Suara saat menerima balasan dari toko/merchant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Aktifkan</Label>
                <Switch
                  checked={settings.incomingStoreChatSoundEnabled}
                  onCheckedChange={(checked) => updateSetting("incomingStoreChatSoundEnabled", checked)}
                  disabled={!settings.enabled}
                  data-testid="switch-incoming-store-chat-sound-enabled"
                />
              </div>
              <div className="space-y-2">
                <Label>Pilih Suara</Label>
                <div className="flex gap-2">
                  <Select 
                    value={settings.incomingStoreChatSound}
                    onValueChange={(value) => updateSetting("incomingStoreChatSound", value)}
                    disabled={!settings.enabled || !settings.incomingStoreChatSoundEnabled}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-incoming-store-chat-sound">
                      <SelectValue placeholder="Pilih suara" />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultSounds.map(sound => (
                        <SelectItem key={sound.id} value={sound.id}>
                          {sound.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => playSound(settings.incomingStoreChatSound)}
                    disabled={!settings.enabled || !settings.incomingStoreChatSoundEnabled}
                    data-testid="button-play-incoming-store-chat-sound"
                  >
                    {isPlaying === settings.incomingStoreChatSound ? (
                      <Square className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground pb-6">
            Pengaturan disimpan otomatis ke perangkat ini
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
