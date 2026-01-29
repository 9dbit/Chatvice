import { useCallback, useRef, useEffect, useState } from "react";

// Import default notification sounds from attached assets
import defaultIncomingSound from "@assets/live-chat-353605_1768724051741.mp3";
import defaultReplySound from "@assets/incoming-msg-430444_1768724051741.mp3";
import defaultAlertSound from "@assets/alert-102266_1768724051740.mp3";

export type NotificationSoundType = "incoming" | "reply" | "alert";

interface SoundSettings {
  enabled: boolean;
  incomingSound: string;
  replySound: string;
  alertSound: string;
}

interface MerchantSoundSettings {
  incomingChatSound: string;
  incomingChatEnabled: boolean;
  chatReplySound: string;
  chatReplyEnabled: boolean;
  angryCustomerSound: string;
  angryCustomerEnabled: boolean;
  customSounds: Array<{ name: string; url: string }>;
}

// Sound template options
export const SOUND_TEMPLATES = [
  { id: "default", name: "Default", description: "Standard notification" },
  { id: "gentle", name: "Gentle Chime", description: "Soft chime sound" },
  { id: "alert", name: "Alert", description: "Attention-grabbing alert" },
  { id: "pop", name: "Pop", description: "Quick pop sound" },
] as const;

// Helper to load settings synchronously from localStorage
function loadSoundSettings(): SoundSettings {
  try {
    const saved = localStorage.getItem("chat_notification_sound");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return { 
    enabled: true, 
    incomingSound: "default",
    replySound: "default",
    alertSound: "alert",
  };
}

// Default sound mappings (matching notification-settings.tsx)
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

// Get the correct audio URL based on sound setting
function getSoundUrl(soundSetting: string, customSounds: Array<{ name: string; url: string }> = []): string {
  // Check if it's a custom sound URL (starts with /uploads/)
  if (soundSetting.startsWith("/uploads/") || soundSetting.startsWith("http")) {
    return soundSetting;
  }
  
  // Check if it's a path to a sound file
  if (soundSetting.startsWith("/sounds/")) {
    return soundSetting;
  }
  
  // Check custom sounds array by URL
  const customSound = customSounds.find(s => s.url === soundSetting);
  if (customSound) {
    return customSound.url;
  }
  
  // Check default sound map
  if (defaultSoundMap[soundSetting]) {
    return defaultSoundMap[soundSetting];
  }
  
  // Return fallback sounds based on setting type
  switch (soundSetting) {
    case "default":
      return defaultReplySound;
    case "alert":
      return defaultAlertSound;
    default:
      // If not found, try to use it as a path or fallback
      return defaultReplySound;
  }
}

export function useChatNotificationSound(merchantId?: string) {
  const audioRefs = useRef<Record<NotificationSoundType, HTMLAudioElement | null>>({
    incoming: null,
    reply: null,
    alert: null,
  });
  
  const [merchantSettings, setMerchantSettings] = useState<MerchantSoundSettings | null>(null);
  const settingsRef = useRef<SoundSettings>(loadSoundSettings());
  const [isReady, setIsReady] = useState(false);
  
  // Fetch merchant sound settings if merchantId is provided
  useEffect(() => {
    if (merchantId) {
      fetch(`/api/customer/stores/${merchantId}/notification-settings`)
        .then(res => res.json())
        .then(data => {
          setMerchantSettings(data);
        })
        .catch(err => {
          console.error("Failed to fetch notification settings:", err);
        });
    }
  }, [merchantId]);
  
  // Initialize audio elements based on settings
  useEffect(() => {
    const settings = settingsRef.current;
    const customSounds = merchantSettings?.customSounds || [];
    
    // Determine sound sources based on merchant settings or local settings
    const incomingSoundSrc = merchantSettings?.incomingChatSound 
      ? getSoundUrl(merchantSettings.incomingChatSound, customSounds)
      : getSoundUrl(settings.incomingSound, customSounds);
      
    const replySoundSrc = merchantSettings?.chatReplySound
      ? getSoundUrl(merchantSettings.chatReplySound, customSounds)
      : getSoundUrl(settings.replySound, customSounds);
      
    const alertSoundSrc = merchantSettings?.angryCustomerSound
      ? getSoundUrl(merchantSettings.angryCustomerSound, customSounds)
      : getSoundUrl(settings.alertSound, customSounds);
    
    audioRefs.current.incoming = new Audio(incomingSoundSrc);
    audioRefs.current.reply = new Audio(replySoundSrc);
    audioRefs.current.alert = new Audio(alertSoundSrc);
    
    // Set volume
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.volume = 0.5;
      }
    });
    
    setIsReady(true);
    
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, [merchantSettings]);
  
  const playSound = useCallback((type: NotificationSoundType = "reply") => {
    if (!settingsRef.current.enabled) return;
    
    // Check if specific sound type is enabled from merchant settings
    if (merchantSettings) {
      if (type === "incoming" && !merchantSettings.incomingChatEnabled) return;
      if (type === "reply" && !merchantSettings.chatReplyEnabled) return;
      if (type === "alert" && !merchantSettings.angryCustomerEnabled) return;
    }
    
    const audio = audioRefs.current[type];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }, [merchantSettings]);
  
  const setEnabled = useCallback((enabled: boolean) => {
    settingsRef.current.enabled = enabled;
    localStorage.setItem("chat_notification_sound", JSON.stringify(settingsRef.current));
  }, []);
  
  const isEnabled = useCallback(() => {
    return settingsRef.current.enabled;
  }, []);
  
  const setSoundTemplate = useCallback((type: NotificationSoundType, templateId: string) => {
    const customSounds = merchantSettings?.customSounds || [];
    const soundUrl = getSoundUrl(templateId, customSounds);
    
    // Update the audio element
    const audio = audioRefs.current[type];
    if (audio) {
      audio.src = soundUrl;
    }
    
    // Save to settings
    const key = type === "incoming" ? "incomingSound" : type === "reply" ? "replySound" : "alertSound";
    settingsRef.current[key] = templateId;
    localStorage.setItem("chat_notification_sound", JSON.stringify(settingsRef.current));
  }, [merchantSettings]);
  
  const getCurrentTemplates = useCallback(() => {
    return {
      incoming: settingsRef.current.incomingSound,
      reply: settingsRef.current.replySound,
      alert: settingsRef.current.alertSound,
    };
  }, []);
  
  return { 
    playSound, 
    setEnabled, 
    isEnabled, 
    isReady,
    merchantSettings,
    setSoundTemplate,
    getCurrentTemplates,
    soundTemplates: SOUND_TEMPLATES,
  };
}
