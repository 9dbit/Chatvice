// @vitest-environment node
import { expect, it } from "vitest";
import pg from "pg";
import { ensureWelcomeBubblePromoColumns } from "../welcomeBubbleMigration";

it.skipIf(!process.env.TEST_WELCOME_DATABASE_URL)("migrates existing bubbles without losing settings and can run twice", async () => {
  const schema = `bubble_test_${Date.now()}`;
  const admin = new pg.Pool({ connectionString: process.env.TEST_WELCOME_DATABASE_URL });
  const pool = new pg.Pool({ connectionString: process.env.TEST_WELCOME_DATABASE_URL, options: `-c search_path=${schema}` });
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    await pool.query("CREATE TABLE welcome_bubbles (merchant_id text PRIMARY KEY, promo_image_url text)");
    await pool.query("INSERT INTO welcome_bubbles VALUES ('test-merchant', '/existing.mp4')");
    await ensureWelcomeBubblePromoColumns(pool);
    await pool.query("UPDATE welcome_bubbles SET promo_click_action = 'url', promo_click_url = 'https://example.test/promo'");
    await ensureWelcomeBubblePromoColumns(pool);
    expect((await pool.query("SELECT * FROM welcome_bubbles")).rows).toEqual([{
      merchant_id: "test-merchant", promo_image_url: "/existing.mp4", promo_click_action: "url", promo_click_url: "https://example.test/promo",
    }]);
    await pool.query("INSERT INTO welcome_bubbles (merchant_id) VALUES ('new-merchant')");
    expect((await pool.query("SELECT promo_click_action, promo_click_url FROM welcome_bubbles WHERE merchant_id='new-merchant'")).rows[0]).toEqual({ promo_click_action: "none", promo_click_url: "" });
  } finally {
    await pool.end(); await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end();
  }
});
