/**
 * Public widget delivery feedback. Keep provider/account details and raw
 * upstream error bodies out of customer-visible messages.
 */
export type ChatDeliveryError = Error & {
  code?: unknown;
  limit?: unknown;
  status?: unknown;
};
export type ChatDeliveryFeedback = {
  kind: "quota" | "account" | "throttled" | "network" | "unavailable";
  message: string;
  limit?: number;
};

export function classifyChatDeliveryError(error: unknown): ChatDeliveryFeedback {
  const e: ChatDeliveryError =
    error instanceof Error ? error as ChatDeliveryError : new Error("");
  const code = typeof e.code === "string" ? e.code : "";
  const text = e.message || "";
  const limit = typeof e.limit === "number" && Number.isFinite(e.limit)
    ? e.limit : undefined;
  if (code === "CONVERSATION_LIMIT_REACHED" || /CONVERSATION_LIMIT_REACHED/i.test(text)) {
    return {
      kind: "quota",
      message: "This AI assistant has temporarily reached its conversation limit. A team member can help you.",
      limit,
    };
  }
  if (["TRIAL_EXPIRED", "SUBSCRIPTION_EXPIRED", "SUBSCRIPTION_INACTIVE"].includes(code)) {
    return {
      kind: "account",
      message: "The AI assistant is temporarily unavailable. Please contact the merchant's support team.",
    };
  }
  if (e.status === 429 || /^429[: ]/.test(text) || /rate.limit|too many requests/i.test(text)) {
    return {
      kind: "throttled",
      message: "The AI assistant is busy. Please try again shortly.",
    };
  }
  if (e.status === 403 || e.status === 401 || /^(403|401)[: ]/.test(text)) {
    return {
      kind: "account",
      message: "Chat is currently unavailable. Please contact the merchant's support team.",
    };
  }
  if (
    e.status === 500 || e.status === 502 || e.status === 503 || e.status === 504 ||
    /^(500|502|503|504)[: ]/.test(text) || /network|failed to fetch|timeout|fetch failed/i.test(text)
  ) {
    return {
      kind: "network",
      message: "We couldn't confirm that your message was delivered. Please check the conversation before trying again.",
    };
  }
  return {
    kind: "unavailable",
    message: "Your message could not be confirmed. Please check your connection and try again.",
  };
}

export function shouldShowHumanHandoffNotice(
  response: { answer?: string | null; mode?: string | null; limitFallback?: boolean; triggerHit?: boolean },
): boolean {
  return response.mode === "HUMAN" &&
    !response.answer?.trim() &&
    !response.limitFallback &&
    !response.triggerHit;
}

export const HUMAN_HANDOFF_NOTICE =
  "This conversation is being handled by a human agent. Automatic AI replies are paused while the team assists you.";
