import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "../db";
import { commitPaypalRenewal, validatePaypalRenewalInput } from "../paypalRenewalAtomic";

// Never allow this fixture test to manipulate a production or staging DB.
// The workflow provisions an ephemeral PostgreSQL service on localhost.
const runOnIsolatedCiPostgres = process.env.CHATVICE_PAYPAL_TEST_DB === "isolated_ci_fixture"
  && (() => { try { return ["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL || "").hostname); } catch { return false; } })();

const cycle = (month: string) => ({
  subscriptionId: "I-ci-test-0001",
  cycleKey: "paypal_cycle_I-ci-test-0001_" + month,
  amountUsd: 10,
  exchangeRate: 17500,
});

describe.runIf(runOnIsolatedCiPostgres)("PayPal atomic renewal (ephemeral database only)", () => {
  beforeAll(async () => {
    await pool.query('CREATE TABLE merchants (id varchar(32) primary key, email text not null, company_name text, subscription_plan_id text, current_period_end timestamp, paypal_subscription_id text, subscription_status text, expiry_reminder_7d_sent_at timestamp, expiry_reminder_3d_sent_at timestamp)');
    await pool.query('CREATE TABLE payment_transactions (id varchar(32) primary key, merchant_id varchar(32) not null, amount integer not null, status varchar(20), gateway_name text, external_id text, payment_method text, plan_id varchar(32), plan_name text, subscription_months integer, merchant_email text, merchant_company_name text, currency varchar(10), paid_at timestamp, invoice_number text, created_at timestamp, updated_at timestamp)');
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE payment_transactions, merchants');
    await pool.query("INSERT INTO merchants(id,email,company_name,subscription_plan_id,current_period_end,paypal_subscription_id,subscription_status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      ["m-ci-1", "merchant@example.invalid", "Synthetic Merchant", "starter", new Date("2030-01-01T00:00:00Z"), "I-ci-test-0001", "active"]);
  });

  afterAll(async () => {
    await pool.query("DROP TABLE IF EXISTS payment_transactions");
    await pool.query("DROP TABLE IF EXISTS merchants");
    await pool.end();
  });

  it("commits exactly once for 16 simultaneous deliveries of one billing cycle", async () => {
    const events = await Promise.all(Array.from({ length: 16 }, () => commitPaypalRenewal(cycle("2030_01"))));
    expect(events.filter(x => x.status === "created")).toHaveLength(1);
    expect(events.filter(x => x.status === "duplicate")).toHaveLength(15);
    const journal = await pool.query("SELECT external_id, amount, merchant_id FROM payment_transactions");
    expect(journal.rows).toHaveLength(1);
    expect(journal.rows[0].amount).toBe(175000);
    expect(journal.rows[0].merchant_id).toBe("m-ci-1");
    const merchant = await pool.query("SELECT current_period_end::date::text AS ends_at FROM merchants WHERE id='m-ci-1'");
    expect(merchant.rows[0].ends_at).toBe("2030-01-31");
  });

  it("allows a different month exactly once and does not duplicate journal entries", async () => {
    const jan = await commitPaypalRenewal(cycle("2030_01"));
    const feb = await commitPaypalRenewal(cycle("2030_02"));
    const replay = await commitPaypalRenewal(cycle("2030_01"));
    expect([jan.status, feb.status, replay.status]).toEqual(["created", "created", "duplicate"]);
    const result = await pool.query("SELECT COUNT(*)::int AS n FROM payment_transactions");
    expect(result.rows[0].n).toBe(2);
  });

  it("rolls back the merchant extension when the payment journal insert fails", async () => {
    await pool.query("CREATE FUNCTION ci_fail_payment_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic journal insert failure'; END; $$");
    await pool.query("CREATE TRIGGER ci_fail_payment BEFORE INSERT ON payment_transactions FOR EACH ROW EXECUTE FUNCTION ci_fail_payment_insert()");
    try {
      await expect(commitPaypalRenewal(cycle("2030_01"))).rejects.toThrow(/synthetic journal insert failure/);
      const merchant = await pool.query("SELECT current_period_end::date::text AS ends_at FROM merchants WHERE id='m-ci-1'");
      expect(merchant.rows[0].ends_at).toBe("2030-01-01");
      const journal = await pool.query("SELECT COUNT(*)::int AS n FROM payment_transactions");
      expect(journal.rows[0].n).toBe(0);
    } finally {
      await pool.query("DROP TRIGGER ci_fail_payment ON payment_transactions");
      await pool.query("DROP FUNCTION ci_fail_payment_insert()");
    }
  });

  it("does not credit unmatched or ambiguous subscription owners", async () => {
    const unmatched = await commitPaypalRenewal({ ...cycle("2030_01"), subscriptionId: "I-ci-unknown" });
    expect(unmatched.status).toBe("missing_merchant");
    await pool.query("INSERT INTO merchants(id,email,paypal_subscription_id) VALUES ($1,$2,$3)",
      ["m-ci-2", "other@example.invalid", "I-ci-test-0001"]);
    await expect(commitPaypalRenewal(cycle("2030_01"))).rejects.toThrow(/Ambiguous PayPal subscription owner/);
    const journal = await pool.query("SELECT COUNT(*)::int AS n FROM payment_transactions");
    expect(journal.rows[0].n).toBe(0);
  });

  it("rejects bad cycle keys and non-finite, zero or negative financial inputs", () => {
    expect(() => validatePaypalRenewalInput({ ...cycle("2030_01"), amountUsd: 0 })).toThrow();
    expect(() => validatePaypalRenewalInput({ ...cycle("2030_01"), amountUsd: Number.NaN })).toThrow();
    expect(() => validatePaypalRenewalInput({ ...cycle("2030_01"), amountUsd: -1 })).toThrow();
    expect(() => validatePaypalRenewalInput({ ...cycle("2030_01"), exchangeRate: 0 })).toThrow();
    expect(() => validatePaypalRenewalInput({ ...cycle("2030_01"), cycleKey: "non-paypal-cycle" })).toThrow();
  });
});