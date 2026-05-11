import { Globe, Monitor, Smartphone, Tablet } from "lucide-react";
import {
  SiAndroid, SiApple, SiLinux,
  SiGooglechrome, SiFirefox, SiSafari, SiOpera,
  SiSamsung, SiFacebook, SiInstagram, SiTelegram, SiLine,
} from "react-icons/si";
import { FaWindows } from "react-icons/fa";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function parseUserAgent(userAgent?: string | null): {
  browser: string;
  os: string;
  device: "Mobile" | "Tablet" | "Desktop" | "Unknown";
} {
  if (!userAgent || !userAgent.trim()) return { browser: "Unknown", os: "Unknown", device: "Unknown" };
  const ua = userAgent;
  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung";
  else if (/FBAN|FBAV|FB_IAB/i.test(ua)) browser = "Facebook";
  else if (/Instagram/i.test(ua)) browser = "Instagram";
  else if (/Telegram/i.test(ua)) browser = "Telegram";
  else if (/Line\//i.test(ua)) browser = "Line";
  else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  // iPadOS 13+ sends a Macintosh-flavoured UA. The only deterministic tell from the
  // UA string itself is the presence of the iOS-style "Mobile/" build token alongside
  // Safari on Macintosh — desktop Safari never sends "Mobile/".
  const isIpadOs = /Macintosh/i.test(ua) && /Mobile\//i.test(ua) && /Safari/i.test(ua);
  let os = "Unknown";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua) || isIpadOs) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let device: "Mobile" | "Tablet" | "Desktop" | "Unknown" = "Desktop";
  if (/iPad/i.test(ua) || isIpadOs || /Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) device = "Tablet";
  else if (/Android|iPhone|iPod|Mobile|FBAN|FBAV|FB_IAB|Instagram|Telegram|Line\//i.test(ua)) device = "Mobile";
  return { browser, os, device };
}

export function IconTooltip({ children, label, userAgent }: { children: React.ReactNode; label: string; userAgent?: string | null }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs font-medium">{label}</p>
        {userAgent && (
          <p className="text-[10px] text-muted-foreground mt-1 break-all">{userAgent}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function DeviceIcon({ userAgent, size = "sm" }: { userAgent?: string | null; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const { browser, os, device } = parseUserAgent(userAgent);
  const label = userAgent ? `${browser} on ${os} • ${device}` : "Unknown device";
  let Icon: React.ElementType;
  if (device === "Unknown") Icon = Globe;
  else if (device === "Desktop") Icon = Monitor;
  else if (device === "Tablet") Icon = Tablet;
  else Icon = Smartphone;
  return (
    <IconTooltip label={label} userAgent={userAgent}>
      <Icon className={`${cls} text-muted-foreground`} />
    </IconTooltip>
  );
}

export function ReferrerIcon({ referrerUrl, size = "sm" }: { referrerUrl?: string | null; size?: "sm" | "md" }) {
  if (!referrerUrl || !referrerUrl.trim()) return null;
  const cls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  let host = referrerUrl;
  try { host = new URL(referrerUrl).hostname.replace(/^www\./, ""); } catch {}
  return (
    <IconTooltip label={`via ${host}`} userAgent={referrerUrl}>
      <Globe className={`${cls} text-blue-400/80`} />
    </IconTooltip>
  );
}

export function OsIcon({ userAgent, size = "sm" }: { userAgent?: string | null; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  if (!userAgent) return null;
  const { browser, os, device } = parseUserAgent(userAgent);
  let icon: React.ReactNode = null;
  if (os === "Android") icon = <SiAndroid className={`${cls} text-green-500`} />;
  else if (os === "iOS" || os === "macOS") icon = <SiApple className={`${cls} text-muted-foreground`} />;
  else if (os === "Windows") icon = <FaWindows className={`${cls} text-blue-400`} />;
  else if (os === "Linux") icon = <SiLinux className={`${cls} text-yellow-500`} />;
  if (!icon) return null;
  const label = `${browser} on ${os} • ${device}`;
  return (
    <IconTooltip label={label} userAgent={userAgent}>
      {icon}
    </IconTooltip>
  );
}

export function BrowserIcon({ userAgent, size = "sm" }: { userAgent?: string | null; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const { browser, os, device } = parseUserAgent(userAgent);
  let icon: React.ReactNode;
  if (!userAgent) icon = <Globe className={`${cls} text-muted-foreground`} />;
  else if (browser === "Edge") icon = <Globe className={`${cls} text-blue-500`} />;
  else if (browser === "Opera") icon = <SiOpera className={`${cls} text-red-500`} />;
  else if (browser === "Samsung") icon = <SiSamsung className={`${cls} text-blue-600`} />;
  else if (browser === "Facebook") icon = <SiFacebook className={`${cls} text-blue-500`} />;
  else if (browser === "Instagram") icon = <SiInstagram className={`${cls} text-pink-500`} />;
  else if (browser === "Telegram") icon = <SiTelegram className={`${cls} text-sky-500`} />;
  else if (browser === "Line") icon = <SiLine className={`${cls} text-green-500`} />;
  else if (browser === "Chrome") icon = <SiGooglechrome className={`${cls} text-yellow-500`} />;
  else if (browser === "Firefox") icon = <SiFirefox className={`${cls} text-orange-500`} />;
  else if (browser === "Safari") icon = <SiSafari className={`${cls} text-blue-400`} />;
  else icon = <Globe className={`${cls} text-muted-foreground`} />;
  const label = userAgent ? `${browser} on ${os} • ${device}` : "Unknown browser";
  return (
    <IconTooltip label={label} userAgent={userAgent}>
      {icon}
    </IconTooltip>
  );
}
