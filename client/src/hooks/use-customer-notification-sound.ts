import { useCallback, useRef, useEffect, useState } from "react";

const defaultSoundMap: Record<string, string> = {
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

function getSoundUrl(soundId: string): string {
  return defaultSoundMap[soundId] || "/sounds/incoming-msg.mp3";
}

export type CustomerSoundType = "typing" | "sent" | "incomingPersonal" | "incomingStore";

export function useCustomerNotificationSound() {
  const settingsRef = useRef<SoundSettings>(loadSettings());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.5;
    setIsReady(true);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "customer_sound_settings") {
        settingsRef.current = loadSettings();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const playSound = useCallback((type: CustomerSoundType) => {
    const settings = settingsRef.current;
    
    if (!settings.enabled) return;

    let soundId: string | null = null;
    let soundEnabled = false;

    switch (type) {
      case "typing":
        soundId = settings.typingSound;
        soundEnabled = settings.typingSoundEnabled;
        break;
      case "sent":
        soundId = settings.sentMessageSound;
        soundEnabled = settings.sentMessageSoundEnabled;
        break;
      case "incomingPersonal":
        soundId = settings.incomingPersonalChatSound;
        soundEnabled = settings.incomingPersonalChatSoundEnabled;
        break;
      case "incomingStore":
        soundId = settings.incomingStoreChatSound;
        soundEnabled = settings.incomingStoreChatSoundEnabled;
        break;
    }

    if (!soundEnabled || !soundId) return;

    const audio = audioRef.current;
    if (audio) {
      audio.src = getSoundUrl(soundId);
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }, []);

  const reloadSettings = useCallback(() => {
    settingsRef.current = loadSettings();
  }, []);

  return {
    playSound,
    isReady,
    reloadSettings,
  };
}
