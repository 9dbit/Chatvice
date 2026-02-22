import { useState, useEffect, useRef, useCallback } from "react";
import { ThumbsUp, ThumbsDown, Heart, Frown, Check, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const REACTION_TYPES = [
  { type: "like", icon: ThumbsUp, label: "Like", color: "#3b82f6" },
  { type: "dislike", icon: ThumbsDown, label: "Dislike", color: "#ef4444" },
  { type: "love", icon: Heart, label: "Love", color: "#ec4899" },
  { type: "sad", icon: Frown, label: "Sad", color: "#f59e0b" },
  { type: "check", icon: Check, label: "Done", color: "#22c55e" },
  { type: "hourglass", icon: Clock, label: "Waiting", color: "#8b5cf6" },
] as const;

type ReactionType = typeof REACTION_TYPES[number]["type"];

interface Reaction {
  id: string;
  messageId: string;
  sessionId: string;
  reactionType: string;
  reactedBy: string;
  reactedByRole: string;
  createdAt?: string;
}

interface ReactionSummary {
  type: string;
  count: number;
  reactedByMe: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  sessionId: string;
  reactions: Reaction[];
  reactedBy: string;
  reactedByRole: string;
  isOwnMessage: boolean;
  primaryColor?: string;
  onReactionsChange?: (reactions: Reaction[]) => void;
  showHint?: boolean;
  isWidget?: boolean;
}

function playReactionSound(reactionType: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;

    const freqs: Record<string, number[]> = {
      like: [523, 659],
      dislike: [330, 262],
      love: [523, 659, 784],
      sad: [392, 330, 262],
      check: [523, 784],
      hourglass: [392, 440, 392],
    };

    const notes = freqs[reactionType] || [440];
    let t = ctx.currentTime;
    osc.type = "sine";

    notes.forEach((freq, i) => {
      osc.frequency.setValueAtTime(freq, t + i * 0.1);
    });

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + notes.length * 0.1 + 0.2);

    osc.start(t);
    osc.stop(t + notes.length * 0.1 + 0.3);
  } catch (e) {
    // silent fail
  }
}

export function MessageReactions({
  messageId,
  sessionId,
  reactions,
  reactedBy,
  reactedByRole,
  isOwnMessage,
  primaryColor = "#6366f1",
  onReactionsChange,
  showHint = false,
  isWidget = false,
}: MessageReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [animatingReaction, setAnimatingReaction] = useState<string | null>(null);
  const [floatingEffects, setFloatingEffects] = useState<{ id: number; type: string; x: number }[]>([]);
  const effectIdRef = useRef(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [hintCycle, setHintCycle] = useState(0);

  useEffect(() => {
    if (!showHint) return;
    const interval = setInterval(() => {
      setHintCycle((c) => c + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, [showHint]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [pickerOpen]);

  const reactionSummary: ReactionSummary[] = REACTION_TYPES.map((rt) => {
    const matching = reactions.filter((r) => r.reactionType === rt.type);
    return {
      type: rt.type,
      count: matching.length,
      reactedByMe: matching.some((r) => r.reactedBy === reactedBy),
    };
  }).filter((r) => r.count > 0);

  const spawnEffect = useCallback((type: string) => {
    const id = ++effectIdRef.current;
    const x = Math.random() * 60 - 30;
    setFloatingEffects((prev) => [...prev, { id, type, x }]);
    setTimeout(() => {
      setFloatingEffects((prev) => prev.filter((e) => e.id !== id));
    }, 1200);
  }, []);

  const toggleReaction = useCallback(async (reactionType: string) => {
    const existing = reactions.find(
      (r) => r.reactionType === reactionType && r.reactedBy === reactedBy
    );

    playReactionSound(reactionType);
    setAnimatingReaction(reactionType);
    setTimeout(() => setAnimatingReaction(null), 400);

    if (existing) {
      const updated = reactions.filter((r) => r.id !== existing.id);
      onReactionsChange?.(updated);
      try {
        await apiRequest("DELETE", `/api/messages/${messageId}/reactions`, {
          reactionType,
          reactedBy,
          sessionId,
        });
      } catch (e) {
        onReactionsChange?.(reactions);
      }
    } else {
      spawnEffect(reactionType);
      const optimistic: Reaction = {
        id: `temp_${Date.now()}`,
        messageId,
        sessionId,
        reactionType,
        reactedBy,
        reactedByRole,
      };
      onReactionsChange?.([...reactions, optimistic]);
      try {
        const res = await apiRequest("POST", `/api/messages/${messageId}/reactions`, {
          sessionId,
          reactionType,
          reactedBy,
          reactedByRole,
        });
        const saved = await res.json();
        onReactionsChange?.(
          [...reactions.filter((r) => r.id !== optimistic.id), saved]
        );
      } catch (e) {
        onReactionsChange?.(reactions);
      }
    }
    setPickerOpen(false);
  }, [messageId, sessionId, reactions, reactedBy, reactedByRole, onReactionsChange, spawnEffect]);

  const getEffectIcon = (type: string) => {
    const rt = REACTION_TYPES.find((r) => r.type === type);
    if (!rt) return null;
    const Icon = rt.icon;
    return <Icon className="w-4 h-4" style={{ color: rt.color }} />;
  };

  return (
    <div className="relative" ref={pickerRef}>
      {floatingEffects.map((effect) => (
        <div
          key={effect.id}
          className="absolute pointer-events-none z-50"
          style={{
            left: `calc(50% + ${effect.x}px)`,
            bottom: "100%",
            animation: "reactionFloat 1.2s ease-out forwards",
          }}
        >
          {getEffectIcon(effect.type)}
        </div>
      ))}

      {reactionSummary.length > 0 && (
        <div
          className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}
          data-testid={`reaction-badges-${messageId}`}
        >
          {reactionSummary.map((rs) => {
            const rt = REACTION_TYPES.find((r) => r.type === rs.type);
            if (!rt) return null;
            const Icon = rt.icon;
            return (
              <button
                key={rs.type}
                onClick={() => toggleReaction(rs.type)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all duration-200 border ${
                  rs.reactedByMe
                    ? "border-primary/30 bg-primary/10"
                    : "border-transparent bg-muted/60 hover:bg-muted"
                } ${animatingReaction === rs.type ? "scale-125" : ""}`}
                style={
                  isWidget && rs.reactedByMe
                    ? { borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}15` }
                    : undefined
                }
                data-testid={`reaction-badge-${rs.type}-${messageId}`}
              >
                <Icon
                  className="w-3 h-3"
                  style={{ color: rt.color }}
                  fill={rs.reactedByMe ? rt.color : "none"}
                />
                <span className="text-muted-foreground">{rs.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mt-0.5`}>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-muted/80 ${
            showHint ? "opacity-100 animate-pulse" : ""
          } ${pickerOpen ? "opacity-100 bg-muted" : ""}`}
          style={
            showHint
              ? {
                  boxShadow: `0 0 ${8 + (hintCycle % 2) * 4}px ${primaryColor}80`,
                  opacity: 1,
                }
              : undefined
          }
          data-testid={`reaction-trigger-${messageId}`}
        >
          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>
      </div>

      {pickerOpen && (
        <div
          className={`absolute z-50 ${isOwnMessage ? "right-0" : "left-0"} bottom-full mb-1`}
          style={{ animation: "reactionPickerSlide 0.2s ease-out" }}
        >
          <div
            className={`flex items-center gap-0.5 px-2 py-1.5 rounded-full shadow-lg border ${
              isWidget ? "" : "bg-popover border-border"
            }`}
            style={
              isWidget
                ? {
                    backgroundColor: "var(--widget-picker-bg, hsl(var(--popover)))",
                    borderColor: "var(--widget-picker-border, hsl(var(--border)))",
                  }
                : undefined
            }
          >
            {REACTION_TYPES.map((rt) => {
              const Icon = rt.icon;
              const isActive = reactions.some(
                (r) => r.reactionType === rt.type && r.reactedBy === reactedBy
              );
              return (
                <button
                  key={rt.type}
                  onClick={() => toggleReaction(rt.type)}
                  className={`p-1.5 rounded-full transition-all duration-150 hover:scale-125 ${
                    animatingReaction === rt.type ? "scale-150" : ""
                  }`}
                  title={rt.label}
                  data-testid={`reaction-pick-${rt.type}-${messageId}`}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: rt.color }}
                    fill={isActive ? rt.color : "none"}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes reactionFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 0.8; transform: translateY(-30px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.5); }
        }
        @keyframes reactionPickerSlide {
          0% { opacity: 0; transform: translateY(8px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export { REACTION_TYPES };
export type { Reaction, ReactionType };
