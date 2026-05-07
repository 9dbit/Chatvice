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

interface NotificationSettings {
  incomingChatSound?: string;
  incomingChatEnabled?: boolean;
  chatReplySound?: string;
  chatReplyEnabled?: boolean;
  angryCustomerSound?: string;
  angryCustomerEnabled?: boolean;
  browserPushEnabled?: boolean;
}

function sendBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  
  // Only show notification when tab is in background
  if (!document.hidden) return;
  
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "chatvice-notification",
    });
  } catch (e) {
    console.warn("Browser notification failed:", e);
  }
}

export async function sendTicketBrowserNotification(opts: {
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
}) {
  const settings = await fetchNotificationSettings();
  if (!settings?.browserPushEnabled) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!document.hidden) return;
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: "/favicon.ico",
      tag: opts.tag || "chatvice-ticket",
    });
    n.onclick = () => {
      try { window.focus(); } catch {}
      try { opts.onClick?.(); } catch {}
      try { n.close(); } catch {}
    };
  } catch (e) {
    console.warn("Browser notification failed:", e);
  }
}

let cachedNotificationSettings: NotificationSettings | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export function invalidateNotificationSoundCache() {
  cachedNotificationSettings = null;
  lastFetchTime = 0;
}

async function fetchNotificationSettings(): Promise<NotificationSettings | null> {
  const now = Date.now();
  if (cachedNotificationSettings && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedNotificationSettings;
  }
  
  try {
    const response = await fetch('/api/notification-settings');
    if (response.ok) {
      cachedNotificationSettings = await response.json();
      lastFetchTime = now;
      return cachedNotificationSettings;
    }
  } catch (e) {
    console.warn("Failed to fetch notification settings:", e);
  }
  return null;
}

export async function playIncomingChatSound(
  sessionInfo?: { customerName?: string },
  options?: { skipBrowserNotification?: boolean },
) {
  const settings = await fetchNotificationSettings();
  if (settings?.incomingChatEnabled === false) return;
  const raw = settings?.incomingChatSound;
  const soundId = (raw && raw !== "default") ? raw : "sci-fi-confirm";
  playSound(soundId);
  
  if (settings?.browserPushEnabled && !options?.skipBrowserNotification) {
    const name = sessionInfo?.customerName || "Customer";
    sendBrowserNotification("New Chat", `${name} started a new conversation`);
  }
}

export async function playChatReplySound(messageInfo?: { from?: string; content?: string }) {
  const settings = await fetchNotificationSettings();
  if (settings?.chatReplyEnabled === false) return;
  const raw = settings?.chatReplySound;
  const soundId = (raw && raw !== "default") ? raw : "live-chat";
  playSound(soundId);
  
  if (settings?.browserPushEnabled) {
    const from = messageInfo?.from || "Customer";
    const preview = messageInfo?.content?.substring(0, 50) || "New message received";
    sendBrowserNotification(`Message from ${from}`, preview);
  }
}

export async function playAngrySound(sessionInfo?: { customerName?: string; reason?: string }) {
  const settings = await fetchNotificationSettings();
  if (settings?.angryCustomerEnabled === false) return;
  const raw = settings?.angryCustomerSound;
  const soundId = (raw && raw !== "default") ? raw : "notification-alert";
  playSound(soundId);
  
  if (settings?.browserPushEnabled) {
    const name = sessionInfo?.customerName || "Customer";
    sendBrowserNotification("Escalated Chat", `${name} needs immediate attention`);
  }
}

export { soundUrls };
