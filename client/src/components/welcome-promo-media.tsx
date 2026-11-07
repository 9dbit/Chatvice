import { useEffect, useRef, useState } from "react";
import { safePromoLink } from "@shared/welcomeBubble";

export function WelcomePromoMedia({ src, action, destination, onOpenChat }: {
  src: string; action?: string | null; destination?: string | null; onOpenChat: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [needsPlay, setNeedsPlay] = useState(false);
  const [failed, setFailed] = useState(false);
  const target = safePromoLink(destination);
  const isVideo = /\.mp4(?:[?#]|$)/i.test(src);
  const play = () => {
    const playback = video.current?.play();
    playback?.catch(() => setNeedsPlay(true));
  };
  useEffect(() => { setFailed(false); setNeedsPlay(false); if (isVideo) play(); }, [src, isVideo]);
  if (failed) return null;
  const media = isVideo ? (
    <video ref={video} src={src} className="w-full h-auto block object-contain rounded-t-xl"
      autoPlay loop muted playsInline preload="metadata" aria-label="Promotional video"
      onPlaying={() => setNeedsPlay(false)} onError={() => setFailed(true)} data-testid="video-welcome-promo" />
  ) : <img src={src} alt="Promotion" className="w-full h-auto block object-contain rounded-t-xl"
      onError={() => setFailed(true)} data-testid="img-welcome-promo" />;
  const wrapperClass = "block w-full border-0 p-0 bg-transparent rounded-t-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";
  return <div className="relative z-20">
    {action === "chat" ? (
      <button type="button" className={wrapperClass} aria-label="Open chat"
        onClick={e => { e.stopPropagation(); onOpenChat(); }}>{media}</button>
    ) : action === "url" && target ? (
      <a className={wrapperClass} href={target} target="_blank" rel="noopener noreferrer"
        aria-label="Open promotion (new tab)" onClick={e => e.stopPropagation()}>{media}</a>
    ) : media}
    {isVideo && needsPlay && <button type="button" className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-3 py-2 text-white"
      onClick={e => { e.preventDefault(); e.stopPropagation(); play(); }}>Play video</button>}
  </div>;
}
