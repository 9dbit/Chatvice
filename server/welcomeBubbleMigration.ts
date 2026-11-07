import type { Pool } from "pg";

// Additive and safe to rerun. Existing bubbles retain their non-clickable media.
export async function ensureWelcomeBubblePromoColumns(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query(`ALTER TABLE welcome_bubbles
      ADD COLUMN IF NOT EXISTS promo_click_action text NOT NULL DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS promo_click_url text NOT NULL DEFAULT ''`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
