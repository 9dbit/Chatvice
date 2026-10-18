# Chatvice Cutover Execution Gate | 2026-10-19

**Status:** BLOCKED, PREPARED, NOT DEPLOYED.  
**Previous approval:** Owner authorized a short maintenance window and Railway promotion/DNS cutover.  
**Not yet supplied:** Verified *fresh* Replit published Production snapshot after write-freeze.  
**Safety principle:** no DB switchover or DNS changes until source writes are blocked and the final snapshot is verified. **Do not infer success from an old backup, domain TXT verification, or a 200 SPA HTML fallback.**

## Baseline (actual observed)

- Railway project `40970ac6-3ce6-4d31-8d6a-555d2dd6fecf`; production app `Chatvice` and PostgreSQL `Postgres` online.
- Isolated staging: `cutover-staging`, `Chatvice-staging` and `Postgres-c8Lq` online, 53,522 merged records, 140 application tables, 20,605 chat logs in the **old** merger baseline.
- Unattached production shadow DB `Postgres-F6Uj` online and populated from the **old** merger baseline. It is **not** connected to the live Chatvice app.
- Existing live production app still points to legacy Railway Postgres; preserve it for rollback. `ENABLE_BACKGROUND_JOBS=false`; `NODE_ENV=production`, `OBJECT_STORAGE_PROVIDER=s3`, `S3_FORCE_PATH_STYLE=true`.
- Current production Railway APP_URL points to `chatvice-production.up.railway.app`; PAYMENT_BASE_URL host is `pay.chatvice.app`.
- Replit public website `chatvice.app` currently serves HTML at `/api/health` (SPA fallback); Railway returns JSON with `status=ok,database=connected`. Do not count Replit HTML as health PASS.
- Replit vs Railway public site: homepage, landing settings and provider list byte-identical; **platform exchange_rate and subscription plan content differ**. Final source snapshot required.
- DNS at time of inspection: `chatvice.app` and `www.chatvice.app` A to 34.111.179.208, routing update NOT completed. Railway domain ownership TXT verified; TLS cert `VALIDATING_OWNERSHIP` pending DNS route change.
- Railway required CNAME for apex: **u1zxqg3a.up.railway.app**; for www: **zgxfkc89.up.railway.app**. Verify live target values through Railway domain_status again immediately before editing.
- Separate existing `chat`, `pay`, `web`, and `blaster` DNS records must not be changed.
- Historic 50 /uploads references: 17 valid byte-identical old/Railway, 33 no valid file in either, 0 valid old-only. This is not a complete Replit Production App Storage inventory; do not falsely certify all media.
- Latest confirmed backup is 2026-10-18; no `final-frozen-*/manifest.json` at last Mac inspection.

## Critical blocker, manual local step

At the owner's authorized Mac, in local Terminal (NOT through remote agent/clipboard):

```bash
node "$HOME/Documents/Chatvice/Backup File Replit/chatvice-cutover-freeze-backup.mjs" --freeze-and-backup --prompt
```

Only the owner pastes a **Replit published Production** PostgreSQL URI into the hidden TTY prompt. Do not paste URI, password, token or raw backups into chat. Do not run against `helium`, `localhost`, Railway database or Replit Development.

Expected terminal evidence (redacted, without credentials):
- `SOURCE_WRITE_GUARD=ACTIVE`
- `ROLLBACK_FAILSAFE=AUTOMATIC_UNFREEZE_AFTER_25_MINUTES`
- `FINAL_SOURCE_BACKUP=STARTED`
- `RESULT=FROZEN_PRODUCTION_SNAPSHOT_VERIFIED`
- Final backup folder, bytes, SHA256.

Script's freeze is a DB-level default read-only setting plus client disconnect; not a platform-wide maintenance feature. Do not claim every external writer is blocked without verifying behavior. Check web/app, webhooks, worker queues and all known writers, and do not accept new payments while not ready. The watchdog automatically **UNFREEZES** the legacy DB 25 minutes after activation unless cutover is explicitly confirmed. Stop promotion if it expired.

**On initial failure:** confirm `AUTO_ROLLBACK_WRITE_GUARD`; verify legacy writes restored and app service functioning. Do not proceed on `FAILED_*` statuses.

## Offline final archive assembly

After fresh frozen backup and **while guard is still active**:

```bash
python3 "$HOME/Documents/Chatvice/Backup File Replit/chatvice-final-assemble-offline.py" --final
```

Expected `RESULT=FINAL_ASSEMBLY_VERIFIED`. Script restores a new isolated local DB and appends only previously verified Railway-only IDs where they do not collide with final Replit Production data. Verify 140 app tables, every source table row count preserved, complete SHA256 manifest, zero unvalidated FK, no newly resurrected deleted source rows. No direct remote DB writes in assembly.

## Restore final snapshot to unattached Railway shadow

Only if final archive is fresh and checksum valid:

```bash
python3 "$HOME/Documents/Chatvice/Backup File Replit/restore-final-to-railway-shadow.py"
```

This uses an approved SSH tunnel to the **unattached** `Postgres-F6Uj` in Railway production. It does **not** touch the currently connected legacy Postgres service. Abort on archive/schema mismatch or failed row/foreign-key verification. Obtain independent updated shadow backup/checksum.

## Production app promotion and validation

- Recheck write guard **still active** and watchdog deadline (otherwise abort).
- Confirm latest app deployment source commit and all existing Railway secrets are configured, without displaying secrets.
- Update **only** Chatvice production `DATABASE_URL` to `${{Postgres-F6Uj.DATABASE_URL}}` using Railway's native reference variable. Expect app redeploy; confirm readiness `/api/health` returns JSON with `database:connected`.
- Run public content and authenticated UAT: merchant login, previously existing sessions, multi-agent routing, AI response and HUMAN handoff, media/R2, API widgets, checkout and signed payment webhook. Production payment tests require explicit safe controls: no fake credits, untracked charges, or unauthenticated webhook fire.
- Keep `ENABLE_BACKGROUND_JOBS=false` until old source workers and writers are confirmed stopped. Switch to true in Railway **only once**, after ownership transfer and payment/webhook routing are verified; monitor singleton job lock.
- Maintain prior Railway Postgres service and Replit backup for rollback.

## Cloudflare DNS cutover

**Only after final DB promotion and acceptance.** Domain-status required values can change; re-query Railway before editing. In Cloudflare zone `chatvice.app`:
- Apex `@` old A → required Railway CNAME from fresh `domain_status`.
- `www` old A → required Railway www CNAME.
- Preserve TXT verification, MX, SPF, DKIM, DMARC and all other subdomains including chat/pay/web/blaster.
- Cloudflare supports apex CNAME flattening. Check SSL/TLS encryption mode and proxy/WAF behavior. Railway docs state **Cloudflare proxy enabled requires SSL/TLS Full rather than Full (Strict)** during their documented setup; verify certificate/proxy state and avoid silent insecure TLS changes. See https://docs.railway.com/networking/domains/working-with-domains.
- Verify DNS resolution and HTTP Host routing independently. Wait for Railway domain status route and TLS cert to settle. A 200 from an HTML SPA fallback is not an API PASS.
- Monitor errors, auth redirects, websocket delivery, cache, image links, billing/webhook receipts and uptime for both apex and www.

## Abort, unfreeze and rollback

- If no frozen snapshot or if 25-minute guard expires: **stop**. Do not promote stale merge, do not change DNS.
- If final Railway restore fails: keep production app on old Railway DB; keep DNS on Replit; ensure legacy source unfreezes, then diagnose.
- If Railway app promotion fails before DNS: revert its DATABASE_URL to old Railway Postgres, verify old Railway generated hostname, keep DNS unchanged, unfreeze Replit.
- If Cloudflare DNS cutover fails: restore original apex/www routing, revert app DB (if no new committed writes), verify old Replit DB unfrozen. **Never blindly roll back a DB after Railway has accepted new user writes**, or data will split/loss. Use reconciled rollback under a new freeze and backup.
- No completion claims until customer-facing UAT and monitoring pass. Route and SSL propagation can take longer than the freeze window; choose rollback instead of leaving split-brain traffic.

## Gate A dependency

Draft PR #4 includes the disabled Company Command Center vendor card and the Gate A technical contract. **Keep that PR Draft and unmerged**, no directory credentials/engine integration until migration is closed and owner signs Gate A tenant scope and security policies.

### Operator checkpoint

When source freeze has been activated, record `snapshot_started_at`, `backup_finished_at`, estimated watchdog deadline, final source SHA and size (do not send secrets), and each gate result. Stop on unknown/failed gate. Do not run unattended background work or promise automatic cutover merely because a preparation script exists.
