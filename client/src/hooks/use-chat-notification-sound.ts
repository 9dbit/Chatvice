import { useCallback, useRef, useEffect } from "react";

// Import notification sounds from attached assets
import incomingChatSound from "@assets/live-chat-353605_1768724051741.mp3";
import chatReplySound from "@assets/incoming-msg-430444_1768724051741.mp3";
import alertSound from "@assets/alert-102266_1768724051740.mp3";

export type NotificationSoundType = "incoming" | "reply" | "alert";

interface SoundSettings {
  enabled: boolean;
}

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
  return { enabled: true };
}

export function useChatNotificationSound() {
  const audioRefs = useRef<Record<NotificationSoundType, HTMLAudioElement | null>>({
    incoming: null,
    reply: null,
    alert: null,
  });
  
  // Initialize synchronously from localStorage to avoid timing issues
  const settingsRef = useRef<SoundSettings>(loadSoundSettings());
  
  // Initialize audio elements
  useEffect(() => {
    audioRefs.current.incoming = new Audio(incomingChatSound);
    audioRefs.current.reply = new Audio(chatReplySound);
    audioRefs.current.alert = new Audio(alertSound);
    
    // Set volume
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.volume = 0.5;
      }
    });
    
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, []);
  
  const playSound = useCallback((type: NotificationSoundType = "reply") => {
    if (!settingsRef.current.enabled) return;
    
    const audio = audioRefs.current[type];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }, []);
  
  const setEnabled = useCallback((enabled: boolean) => {
    settingsRef.current.enabled = enabled;
    localStorage.setItem("chat_notification_sound", JSON.stringify(settingsRef.current));
  }, []);
  
  const isEnabled = useCallback(() => {
    return settingsRef.current.enabled;
  }, []);
  
  return { playSound, setEnabled, isEnabled };
}
