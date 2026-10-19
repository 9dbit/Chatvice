/**
 * Derive the PayPal billing-cycle deduplication key from the provider's
 * actual payment time, not the time a webhook was received.
 *
 * Both PAYMENT.SALE.COMPLETED and BILLING.SUBSCRIPTION.RENEWED must use the
 * same paid-at timestamp (from the sale or subscription last_payment).
 */
export function paypalBillingCycleKey(subscriptionId: string, paidAtIso: string): string {
  if (typeof subscriptionId !== "string" || !subscriptionId || subscriptionId.length > 255) {
    throw new Error("Invalid PayPal subscription ID");
  }
  if (typeof paidAtIso !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(paidAtIso)) {
    throw new Error("Missing PayPal provider payment timestamp");
  }
  const date = new Date(paidAtIso);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid PayPal provider payment timestamp");
  const normalizedMonth = date.toISOString().slice(0, 7).replace("-", "_");
  return `paypal_cycle_${subscriptionId}_${normalizedMonth}`;
}
