import { describe, expect, it } from "vitest";
import { paypalBillingCycleKey } from "../paypalBillingCycle";

describe("PayPal cycle identity", () => {
  it("deduplicates SALE and RENEWED even when delivery crosses a month boundary", () => {
    const paidAt = "2026-09-30T23:59:30.000Z";
    const sale = paypalBillingCycleKey("I-provider-synthetic", paidAt);
    // RENEWED event arrives on October 1 but carries the same actual
    // last_payment timestamp from the provider.
    const renewed = paypalBillingCycleKey("I-provider-synthetic", paidAt);
    expect(sale).toBe("paypal_cycle_I-provider-synthetic_2026_09");
    expect(renewed).toBe(sale);
    expect(paypalBillingCycleKey("I-provider-synthetic", "2026-10-01T00:00:01Z")).not.toBe(sale);
  });
  it("rejects absent, malformed and invalid paid-at times", () => {
    for (const value of ["", "2026-10-01", "invalid", "2026-99-99T12:00:00Z"]) {
      expect(() => paypalBillingCycleKey("I-123", value)).toThrow();
    }
  });
});
