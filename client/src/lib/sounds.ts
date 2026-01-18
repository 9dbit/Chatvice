let audioRef: HTMLAudioElement | null = null;

const soundUrls: Record<string, string> = {
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

function playSound(soundId: string) {
  try {
    if (audioRef) {
      audioRef.pause();
      audioRef = null;
    }
    
    let soundUrl = soundUrls[soundId];
    if (!soundUrl) {
      if (soundId.startsWith("/uploads/") || soundId.startsWith("/sounds/")) {
        soundUrl = soundId;
      } else {
        soundUrl = "/sounds/live-chat.mp3";
      }
    }
    
    audioRef = new Audio(soundUrl);
    audioRef.volume = 1.0;
    audioRef.play().catch((e) => {
      console.warn("Audio playback failed:", e);
    });
  } catch (e) {
    console.warn("Sound playback error:", e);
  }
}

export function playIncomingChatSound() {
  playSound("sci-fi-confirm");
}

export function playChatReplySound() {
  playSound("live-chat");
}

export function playAngrySound() {
  playSound("alert");
}

export { soundUrls };
