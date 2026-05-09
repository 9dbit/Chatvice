/**
 * E2E test for the Custom Data Source ConnectWizard 4-step first-run flow.
 *
 * Covers all three presets (judi, finansial, ecommerce). For each preset:
 *   1. Register a fresh merchant via the public /register page.
 *   2. Mark the merchant as email-verified + seed an active agent in
 *      PostgreSQL so the dashboard guard does not redirect to /select-agent.
 *   3. Log in.
 *   4. Walk all four wizard steps (preset -> connect -> api-key -> intent).
 *   5. Click Finish.
 *   6. Persistence readback: assert that exactly one row landed in
 *      custom_data_sources for this merchant AND at least one row landed in
 *      custom_data_intents with the expected intent_key.
 *
 * Run with:
 *   npx playwright test --config=playwright.config.ts
 *
 * Requires the dev server to be reachable at E2E_BASE_URL (defaults to
 * http://localhost:5000) and DATABASE_URL set so we can do the DB readback.
 */
import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

const PRESETS = [
  { id: "judi", firstIntentKey: "deposit_status" },
  { id: "finansial", firstIntentKey: "saldo_rekening" },
  { id: "ecommerce", firstIntentKey: "status_pesanan" },
] as const;

const BUSINESS_CATEGORY_OPTION = '[role="option"]';
const RUN_ID = Math.random().toString(36).slice(2, 10);
const PASSWORD = "TestPass123";

function makeIdentifiers(presetId: string) {
  return {
    presetId,
    email: `wizard_e2e_${presetId}_${RUN_ID}@chatvice-test.local`,
    username: `wize2e_${presetId}_${RUN_ID}`.slice(0, 32),
    agentId: `a_e2e_${presetId}_${RUN_ID}`.slice(0, 32),
  };
}

async function pgClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set — required for E2E persistence readback");
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

async function dismissGuideBubble(page: Page) {
  // The floating "Chatvice Guide" can intercept clicks on the wizard's right
  // side. If a close button is present, click it; otherwise it's harmless.
  const closeCandidates = [
    'button[aria-label*="lose"i]',
    '[data-testid*="close-guide"]',
    '[data-testid*="guide-close"]',
  ];
  for (const sel of closeCandidates) {
    const btn = page.locator(sel).first();
    if (await btn.count().catch(() => 0)) {
      await btn.click({ trial: false }).catch(() => {});
    }
  }
}

async function registerMerchant(page: Page, ids: ReturnType<typeof makeIdentifiers>) {
  await page.goto("/register");
  await page.getByTestId("input-register-username").fill(ids.username);
  await page.getByTestId("input-register-email").fill(ids.email);
  await page.getByTestId("input-register-password").fill(PASSWORD);
  await page.getByTestId("input-register-confirm-password").fill(PASSWORD);

  await page.getByTestId("select-business-category").click();
  await page.locator(BUSINESS_CATEGORY_OPTION).first().click();

  await page.getByTestId("select-staff-count").click();
  await page.locator(BUSINESS_CATEGORY_OPTION).first().click();

  await page.getByTestId("button-register-submit").click();

  // Either we land on a "verify your email" screen or stay on /register;
  // both are fine — we'll bypass verification via DB next.
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function verifyAndActivateMerchant(ids: ReturnType<typeof makeIdentifiers>) {
  const db = await pgClient();
  try {
    await db.query(
      `UPDATE merchants
          SET is_email_verified = true,
              profile_completed = true
        WHERE email = $1`,
      [ids.email],
    );
    await db.query(
      `INSERT INTO agents (id, merchant_id, name, is_active, created_at)
       SELECT $1, m.id, 'E2E Wizard Agent', true, NOW()
         FROM merchants m
        WHERE m.email = $2
       ON CONFLICT (id) DO NOTHING`,
      [ids.agentId, ids.email],
    );
    await db.query(
      `UPDATE merchants SET active_agent_id = $1 WHERE email = $2`,
      [ids.agentId, ids.email],
    );
  } finally {
    await db.end();
  }
}

async function login(page: Page, ids: ReturnType<typeof makeIdentifiers>) {
  await page.goto("/login");
  await page.getByTestId("input-login-email").fill(ids.email);
  await page.getByTestId("input-login-password").fill(PASSWORD);
  await page.getByTestId("button-login-submit").click();
  await page.waitForURL((u) => u.pathname.startsWith("/dashboard"), { timeout: 30_000 });
}

async function readbackPersistence(ids: ReturnType<typeof makeIdentifiers>) {
  const db = await pgClient();
  try {
    const sourceRows = await db.query(
      `SELECT cds.base_url
         FROM merchants m
         JOIN custom_data_sources cds ON cds.merchant_id = m.id
        WHERE m.email = $1`,
      [ids.email],
    );
    const intentRows = await db.query(
      `SELECT cdi.intent_key
         FROM merchants m
         JOIN custom_data_sources cds ON cds.merchant_id = m.id
         JOIN custom_data_intents  cdi ON cdi.source_id  = cds.id
        WHERE m.email = $1
        ORDER BY cdi.created_at DESC`,
      [ids.email],
    );
    return {
      sources: sourceRows.rows as Array<{ base_url: string }>,
      intentKeys: intentRows.rows.map((r: { intent_key: string }) => r.intent_key),
    };
  } finally {
    await db.end();
  }
}

for (const { id: presetId, firstIntentKey } of PRESETS) {
  test(`ConnectWizard end-to-end persists source + intent for preset "${presetId}"`, async ({ page }) => {
    test.setTimeout(180_000);
    const ids = makeIdentifiers(presetId);

    await registerMerchant(page, ids);
    await verifyAndActivateMerchant(ids);
    await login(page, ids);

    // Mock the wizard's test-connection endpoint with a deterministic
    // success payload so Step 2 doesn't depend on a reachable upstream
    // (the merchant's panel obviously isn't reachable in CI). We assert
    // below that this mocked response is surfaced as the success banner.
    let testEndpointHits = 0;
    await page.route("**/api/merchant/custom-data-source/test", async (route) => {
      testEndpointHits += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: 200,
          latencyMs: 42,
          sample: '{"status":"ok"}',
        }),
      });
    });

    await page.goto("/dashboard/custom-data-source");
    await dismissGuideBubble(page);

    // ----- STEP 1: choose preset -----
    await expect(page.getByTestId("wizard-connect-panel")).toBeVisible();
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();

    const presetBtn = page.getByTestId(`button-preset-${presetId}`);
    await presetBtn.scrollIntoViewIfNeeded();
    await presetBtn.click();

    // The Next button enable transition can lag; retry the preset click if so.
    const nextBtn = page.getByTestId("wizard-button-next");
    try {
      await expect(nextBtn).toBeEnabled({ timeout: 3_000 });
    } catch {
      await dismissGuideBubble(page);
      await presetBtn.click();
      await expect(nextBtn).toBeEnabled({ timeout: 5_000 });
    }
    await nextBtn.click();

    // ----- STEP 2: connect -----
    await expect(page.getByTestId("wizard-step-2")).toBeVisible();
    const baseUrlInput = page.getByTestId("wizard-input-base-url");
    await baseUrlInput.fill("");
    await baseUrlInput.fill("https://api.example.com/v1");
    await page.getByTestId("wizard-button-test").click();

    // The mocked /test response (ok:true, status:200, latencyMs:42) must be
    // surfaced via the success banner — this proves the wizard consumes
    // the test-connection contract correctly, not just the source save.
    const okBanner = page.getByTestId("wizard-test-result-ok");
    await expect(okBanner).toBeVisible({ timeout: 15_000 });
    await expect(okBanner).toContainText("Status 200");
    await expect(okBanner).toContainText("42ms");
    expect(testEndpointHits).toBeGreaterThanOrEqual(1);

    await expect(nextBtn).toBeEnabled({ timeout: 15_000 });
    await nextBtn.click();

    // ----- STEP 3: api key -----
    await expect(page.getByTestId("wizard-step-3")).toBeVisible();
    await expect(page.getByTestId("wizard-text-api-key")).toBeVisible();
    await nextBtn.click();

    // ----- STEP 4: scaffold intent -----
    await expect(page.getByTestId("wizard-step-4")).toBeVisible();
    const addBtn = page.getByTestId(`wizard-button-add-${firstIntentKey}`);
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(addBtn).toBeDisabled({ timeout: 10_000 });

    await page.getByTestId("wizard-button-finish").click();

    // Dismiss the one-time API key dialog if it appears.
    const closeKey = page.getByTestId("button-close-key-dialog");
    if (await closeKey.isVisible().catch(() => false)) {
      await closeKey.click();
    }

    // ----- PERSISTENCE READBACK -----
    const { sources, intentKeys } = await readbackPersistence(ids);
    expect(sources).toHaveLength(1);
    expect(sources[0].base_url).toContain("example.com");
    expect(intentKeys).toContain(firstIntentKey);
  });
}
