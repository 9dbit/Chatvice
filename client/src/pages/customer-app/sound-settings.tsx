import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Volume2, Play, Square, ArrowLeft, MessageCircle, Send, UserPlus, Store } from "lucide-react";
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

interface SoundRowProps {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  onEnabledChange: (val: boolean) => void;
  soundId: string;
  onSoundChange: (val: string) => void;
  globalEnabled: boolean;
  isPlaying: string | null;
  onPlay: (id: string) => void;
}

function SoundRow({ icon, label, enabled, onEnabledChange, soundId, onSoundChange, globalEnabled, isPlaying, onPlay }: SoundRowProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex items-center gap-2 w-32 shrink-0">
        {icon}
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onEnabledChange}
        disabled={!globalEnabled}
        className="scale-75"
      />
      <Select 
        value={soundId}
        onValueChange={onSoundChange}
        disabled={!globalEnabled || !enabled}
      >
        <SelectTrigger className="flex-1 h-8 text-xs">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {defaultSounds.map(sound => (
            <SelectItem key={sound.id} value={sound.id} className="text-xs">
              {sound.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => onPlay(soundId)}
        disabled={!globalEnabled || !enabled}
      >
        {isPlaying === soundId ? (
          <Square className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3" />
        )}
      </Button>
    </div>
  );
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
          toast({ title: "Cannot play sound", variant: "destructive" });
        };
        await audio.play();
      } catch (error) {
        setIsPlaying(null);
        toast({ title: "Interaction required before playing", variant: "destructive" });
      }
    }
  };

  return (
    <CustomerLayout>
      <div className="sm:ml-64">
        <div className="max-w-md mx-auto p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(chatRoutes.settings())} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Sound Settings</h1>
          </div>

          <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                <span className="text-sm font-medium">Enable All Sounds</span>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSetting("enabled", checked)}
                data-testid="switch-sound-enabled"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-3 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">Configure sounds for each event</p>
            
            <SoundRow
              icon={<MessageCircle className="w-3.5 h-3.5 text-blue-500" />}
              label="Typing"
              enabled={settings.typingSoundEnabled}
              onEnabledChange={(v) => updateSetting("typingSoundEnabled", v)}
              soundId={settings.typingSound}
              onSoundChange={(v) => updateSetting("typingSound", v)}
              globalEnabled={settings.enabled}
              isPlaying={isPlaying}
              onPlay={playSound}
            />
            
            <SoundRow
              icon={<Send className="w-3.5 h-3.5 text-green-500" />}
              label="Sent Message"
              enabled={settings.sentMessageSoundEnabled}
              onEnabledChange={(v) => updateSetting("sentMessageSoundEnabled", v)}
              soundId={settings.sentMessageSound}
              onSoundChange={(v) => updateSetting("sentMessageSound", v)}
              globalEnabled={settings.enabled}
              isPlaying={isPlaying}
              onPlay={playSound}
            />
            
            <SoundRow
              icon={<UserPlus className="w-3.5 h-3.5 text-purple-500" />}
              label="Personal Chat"
              enabled={settings.incomingPersonalChatSoundEnabled}
              onEnabledChange={(v) => updateSetting("incomingPersonalChatSoundEnabled", v)}
              soundId={settings.incomingPersonalChatSound}
              onSoundChange={(v) => updateSetting("incomingPersonalChatSound", v)}
              globalEnabled={settings.enabled}
              isPlaying={isPlaying}
              onPlay={playSound}
            />
            
            <SoundRow
              icon={<Store className="w-3.5 h-3.5 text-orange-500" />}
              label="Store Chat"
              enabled={settings.incomingStoreChatSoundEnabled}
              onEnabledChange={(v) => updateSetting("incomingStoreChatSoundEnabled", v)}
              soundId={settings.incomingStoreChatSound}
              onSoundChange={(v) => updateSetting("incomingStoreChatSound", v)}
              globalEnabled={settings.enabled}
              isPlaying={isPlaying}
              onPlay={playSound}
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Settings saved automatically
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
}
