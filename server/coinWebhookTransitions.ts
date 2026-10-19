/**
 * Verified gateway callbacks must never claim that merchant coins were credited.
 * A completed order is immutable here; only the merchant credit pipeline may
 * promote PAID_BUT_NOT_CREDITED to COMPLETED with proof of fulfilment.
 */
export type CoinWebhookStatus = "PAID" | "FAILED" | "EXPIRED";
export type CoinWebhookAction = {
  status: "PAID_BUT_NOT_CREDITED" | "FAILED" | "EXPIRED";
  expectedStatuses: readonly string[];
} | null;

export function decideCoinWebhookTransition(
  current: string | null | undefined,
  incoming: string,
): CoinWebhookAction {
  if (current == null) return null;
  if (incoming === "PAID") {
    if (!["PENDING", "FAILED", "EXPIRED", "PAID"].includes(current)) {
      return null;
    }
    return {
      status: "PAID_BUT_NOT_CREDITED",
      expectedStatuses: ["PENDING", "FAILED", "EXPIRED", "PAID"],
    };
  }
  if (incoming === "FAILED" || incoming === "EXPIRED") {
    if (current !== "PENDING" && current != null) return null;
    return {
      status: incoming,
      expectedStatuses: ["PENDING"],
    };
  }
  return null;
}
