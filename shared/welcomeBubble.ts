import { z } from "zod";

export const promoClickActions = ["none", "chat", "url"] as const;
export type PromoClickAction = typeof promoClickActions[number];

export function safePromoLink(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export const promoClickSettings = z.object({
  promoClickAction: z.enum(promoClickActions).default("none"),
  promoClickUrl: z.string().max(2048).default(""),
}).superRefine((data, ctx) => {
  if (data.promoClickAction === "url" && !safePromoLink(data.promoClickUrl)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["promoClickUrl"], message: "Enter a valid destination URL starting with https:// or http://." });
  }
}).transform(data => ({ ...data, promoClickUrl: data.promoClickAction === "url" ? safePromoLink(data.promoClickUrl)! : "" }));
