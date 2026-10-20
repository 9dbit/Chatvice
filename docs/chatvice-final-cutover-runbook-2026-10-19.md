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

## Source Production attestation (confirmed)

Owner confirmed the hidden URI came from Replit > Chatvice.app > Database > Production > Settings. Separate read-only attestation returned `READONLY_SOURCE_CONTENT_CONSISTENT`, 59 merchants, 40 agents, 20,624 chat logs, with published exchange rate and Starter domain limit matching. This establishes content consistency and owner-confirmed origin, but not an independent vendor-signed provenance attestation.

## One local command for controlled freeze + source-only shadow restore

**Operator must paste the Replit Production URI locally into a hidden TTY. Never send it in chat.** The earlier staged script was superseded by a fail-closed one-command wrapper:

```bash
bash "$HOME/Documents/Chatvice/Backup File Replit/chatvice-final-freeze-and-stage.sh"
```

The wrapper performs in order:

1. Freeze Replit Production via `chatvice-cutover-freeze-backup.mjs --freeze-and-backup --prompt`, starting the 25-minute auto-unfreeze watchdog. Expect website write failures during maintenance.
2. Verify an active read-only source and watchdog with `chatvice-freeze-active-verify.py`.
3. Restore the fresh frozen Replit Production snapshot into an isolated, Unix-socket-only PostgreSQL locally and generate a **source-only** application archive with `chatvice-final-source-only-offline.py --final`. This excludes 589 records found only in the historical Railway database. Historical Railway backup/database remain intact for separate reconciliation; do not contaminate published Production with unproven notifications/chat records.
4. Restore the checksum-verified source-only archive into **unattached** Railway production shadow `Postgres-F6Uj` using `restore-sourceonly-to-railway-shadow.py`. Existing Railway production `Postgres` and the live Chatvice service `DATABASE_URL` remain unchanged at this stage.
5. Verify source read-only guard is still active. Only a final `RESULT=FROZEN_SOURCE_AND_RAILWAY_SHADOW_VERIFIED_AWAITING_PROMOTION` qualifies for the next promotion step.

On any pre-promotion script failure, wrapper calls `chatvice-source-emergency-unfreeze.py` and the detached watchdog remains the last-resort fallback. The emergency unfreeze procedure was tested against a local isolated database; original backup, restoration on a populated local clone, source-only offline assembly, and source-only shadow script fail-closed behavior were all separately tested. No testing claims extend to live authenticated payments/AI until actual UAT.

**Strict timing:** after wrapper success, send the redacted output immediately so the operator can verify the source remains frozen and promote Railway + DNS within the watchdog window. If the guard expires, do not promote. Never mark cutover successful based only on shadow restore. The source write guard is a database-level default, not proof every network writer has been stopped.

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


## Actual cutover checkpoint: 2026-10-19

**Main domain migrated, full authenticated/payment acceptance remains gated.**

- New frozen Replit Published Production backup: 109,176,591 bytes, SHA-256 74ad5a00199077a38e7e3dcde512cf97cd76549728989da70d56b63d6bca34ae (private folder final-frozen-1Yc2vO).
- Verified restored Railway shadow Postgres-F6Uj: 140 app tables, 52,761 rows, 20,625 chat logs, 59 merchants, 40 agents, 26,716 sessions, 0 unvalidated FK. Excluded 589 Railway-only historical records.
- Cloudflare apex chatvice.app and www.chatvice.app CNAME to Railway, both Proxied. HTTPS GET /api/health returns JSON status ok, database connected on both hosts. Homepage, landing settings, auth providers, subscription plans, platform settings and /topup pass public HTTP smoke.
- Chatvice production Railway service uses Postgres-F6Uj, APP_URL=https://chatvice.app and PAYMENT_BASE_URL=https://chatvice.app; ENABLE_BACKGROUND_JOBS remains false. Successful deployment: 0ad04f3a-e269-436d-b352-7cf188a06ff1.
- Replit source write-freeze watchdog status CUTOVER_CONFIRMED_OLD_DB_STAYS_READONLY. Source DB must NOT be unfrozen, otherwise split-brain writes may occur.
- Orchestration bug: onepass script falsely reported SOURCE_WRITE_FREEZE_LATCH_MISSING after both Cloudflare records were saved. Root cause was a macOS /tmp symlink not traversed by find. We recovered Railway native Postgres-F6Uj variable before obsolete rollback deployment became active, and patched the onepass latch check to canonicalize tmpdir. Subsequent check PASS.
- Cloudflare Full SSL and active Universal edge cert; Railway custom-domain origin cert still validating ownership. Verify edge and origin TLS before switching to Full Strict.
- Startup logs confirmed database connected, LOCAL_MEDIA_READY:1168, 12Pay key configuration detected, and background jobs disabled. Post-cutover sampled HTTP logs had no 5xx.
- PENDING: authenticated merchant login, AI chat send/receive, subscriptions, PayPal and 12Pay QRIS/VA/webhook E2E, uploads/media parity, topup token/session continuity. Existing pay, chat, blaster legacy hostnames failed SSL checks and were intentionally not re-routed.
- SECURITY ACTION REQUIRED: Railway JWT_SECRET is not set, so token signing configuration needs urgent controlled remediation. Verify in-flight topup sessions before setting or rotating the secret.
- Before enabling Railway background jobs, disable Replit legacy schedulers safely and establish singleton ownership. Draft Command Center Gate A PR #4 remains unmerged/unactivated.
- WARNING: never blindly revert DB after Railway production starts accepting new writes; snapshot and reconcile under new write freeze.


## Post-cutover security hardening, 2026-10-19

- Railway Production Chatvice, Postgres-F6Uj, legacy Postgres, and agent-directory remain online. Main apex certificate became valid; www is reachable through Cloudflare TLS, although Railway DNS checker can still report pending for proxied www CNAME.
- Production `JWT_SECRET` was initially missing. Generated a new high-entropy signing key via a local secure random source and saved it to Railway's production Chatvice variable store without logging the value. Deployment completed successfully. Snapshot of `public.coin_orders` reported zero total, zero created within 30 minutes, zero pending at that point. Pre-rotation unsigned/unsubmitted top-up links may need restarting.
- Security hotfix [PR #5](https://github.com/9dbit/Chatvice/pull/5) removes the predictable top-up JWT fallback in three endpoints, fails closed with HTTP 503 if missing or short, restricts HS256, and adds Node test + targeted TypeScript regression. GitHub Actions targeted tests and isolated helper typecheck pass. **PR #5 is DRAFT, not merged/deployed.**
- Staging source update pinned to PR #5 head was **staged only** for the isolated `cutover-staging/Chatvice-staging` service (two non-destructive source fields changed in patch `2bfcd815-6772-40d1-a8b0-93670c9bc0e8`). No staged changes were accepted or deployed. Production service source remains on `feat/railway-migration-safety`.
- CI baseline debt is tracked in [Issue #6](https://github.com/9dbit/Chatvice/issues/6). `npm ci` fails on a stale lockfile, Vitest 4 is incompatible with the existing Vite dependency setup on a clean CI install, and full TypeScript audit reports approximately 291 existing errors. The workflow records the global typecheck as **nonblocking**; do not misstate that it passed.
- Replit old published deployment is still reported published by the Replit provider. Its published Production database must remain read-only. Railway `ENABLE_BACKGROUND_JOBS=false` remains required until legacy schedulers are disabled/stopped and an explicitly owned singleton worker is proven safe; do **not** flip to true just because the new API health check passes. Telegram webhook re-registration, blast scheduler, and password-recovery pollers have independent side effects.
- Legacy subdomains `pay.chatvice.app`, `chat.chatvice.app`, `blaster.chatvice.app` had TLS failures when independently probed after cutover, and DNS for these hosts was intentionally not altered. Verify their consumers/callbacks before any alias change. Review R2 and known missing legacy `/uploads` references separately.
- The authenticated merchant, real top-up/QRIS/VA payment, webhook, AI message and customer media E2E checks are not yet proven. Do not process test money or modify customer records without an explicit controlled test plan and approval.

## 2026-10-19 Post-Cutover Security Release and Operations QA

- JWT security PR [#5](https://github.com/9dbit/Chatvice/pull/5) merged into Railway production source branch `feat/railway-migration-safety`, squash commit `d3c5a9a05c11f9a1a692618d18077e9ac7ecf964`. Production service source deliberately pinned to this SHA; deployment `6ecba2d0-b7bb-4cf1-9212-8b4307a4622f` SUCCESS.
- Production app source bundle verified to contain `Top-up temporarily unavailable` fail-closed logic, and not contain the predictable old top-up JWT signing default. Runtime has strong `JWT_SECRET`, non-default long `SESSION_SECRET`, uses Railway `Postgres-F6Uj`, and keeps `ENABLE_BACKGROUND_JOBS=false`.
- Staging service was previously redeploying a cached old image despite showing the new branch in config. Reconnected **Chatvice-staging only** to `security/chatvice-topup-jwt-failclosed-20261019`, without commit pin. Fresh staging deployment `f047fcf2-f463-42cc-bcc5-4f7961e7a039` SUCCESS, exact code and bundle fingerprint verified; invalid token 401, health/auth/landing 200, jobs disabled and staging-specific strong JWT configured.
- CI run `39212036568` completed successfully for postcutover Node tests and targeted helper typecheck. The full-project TypeScript audit remains advisory because the preexisting repository-wide check emits hundreds of errors. Local `vitest` targeted 7/7 PASS and frontend/server `npm run build` PASS. `package-lock.json` remains out of sync with npm resolution; CI currently installs with pnpm without frozen lock. Treat dependency reproducibility as follow-up.
- Public `https://chatvice.app` and `https://www.chatvice.app`: `/`, `/api/health`, `/topup` HTTP 200 and TLS validation 0; production instance `/api/auth/providers`, `/api/landing-settings`, `/api/subscription-plans` HTTP 200; malformed top-up token HTTP 401. Application, production PostgreSQL, agent directory and retained old PostgreSQL services all online at the observed checkpoint. No sampled new deployment HTTP 5xx.
- Read-only Production DB checks: 0 total `coin_orders`, 0 pending or paid-but-not-credited, 0 created in preceding hour before merge. Counts still 20,625 `chat_logs`, 59 merchants, 40 agents at post-cutover snapshot. No real payment charge or merchant login was attempted.
- Production storage is S3-compatible with configured credentials and media path. Read-only S3 ListObjectsV2 succeeded (HTTP 200). Bucket contains at least one object; **no `uploads/` objects** were found in prefix test. Production app local persisted `uploads/` has 27 files (7,605,456 bytes) and `exports/` 2 files. All 27 local file URLs under `/uploads` returned HTTP 200 on public apex. Database includes `stored_files` 91 and `chat_media` 27; full historical media / object-storage parity still unverified, so retain local media and do not purge backups.
- External checks: legacy `pay.chatvice.app`, `chat.chatvice.app`, `blaster.chatvice.app` fail TLS handshake against Replit IP `34.111.179.208`; `web.chatvice.app` HTTP 200 over TLS. Subdomain DNS remains unchanged. **Do not blindly reroute those names** until payment webhook, chat widget, and blaster route ownership is verified.
- **Release gate still open** for authenticated merchant logins, AI chat send/receive, actual 12Pay QRIS/VA, PayPal callbacks, webhook delivery and idempotency, full media parity, Replit legacy worker shutdown and singleton Railway worker handoff. These are separate operational items, not satisfied by public smoke tests.
