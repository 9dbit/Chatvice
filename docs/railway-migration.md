# Chatvice migration to Railway

Source: Replit Chatvice.app, serving https://chatvice.app.
Target: Railway Chatvice project, service Chatvice, production environment.

## Worker ownership

Railway disables background jobs by default, detected through RAILWAY_PROJECT_ID.
Set ENABLE_BACKGROUND_JOBS=false explicitly during validation. The old Replit
production worker remains enabled unless explicitly disabled. After parity
passes and traffic is cut over, disable jobs on Replit before setting
ENABLE_BACKGROUND_JOBS=true on Railway.

The switch covers startup addon/admin seeding, scheduled source synchronization,
chat cleanup, subscription maintenance/reminders, blog generation, token usage
maintenance, guide refresh, custom data health monitoring, password recovery
polling/sweeping, blast scheduling and startup Telegram webhook registration.
It does not disable user-triggered API writes; validate against an isolated
production database copy and sandbox integrations until cutover.

## Health

GET /health and /__health report process liveness.
GET /api/health checks database access and returns 503 when unavailable.
A successful readiness response alone is not a parity pass.

## Required configuration audit

Copy configuration directly from the source into Railway; never commit secrets.
Verify DATABASE_URL, SESSION_SECRET, JWT_SECRET and any existing encryption keys
(CUSTOM_DATA_ENC_KEY, GAMING_ENC_KEY). Replacing encryption keys can make stored
credentials unreadable. Do not seed or replace production admin passwords.

Audit APP_URL, Google/GitHub OAuth clients and callbacks, OpenAI/Gemini keys and
base URLs, Resend, Twilio, payment gateways and their webhook signing keys.
Replit AI proxy URLs may require replacement with provider-native credentials.

## Portable object storage

server/objectStorage.ts supports S3-compatible storage on Railway while retaining
the existing Replit sidecar adapter for the source deployment. Existing
/storage/uploads/... URLs remain unchanged and files are streamed through the backend.

Set OBJECT_STORAGE_PROVIDER=s3, OBJECT_STORAGE_BUCKET, S3_ENDPOINT,
S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_REGION (Railway uses auto).
Map Railway bucket BUCKET, ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY and REGION
into those application variable names using Railway reference variables.
Use the base endpoint supplied by Railway, without adding the bucket name.
Only set S3_FORCE_PATH_STYLE=true when the bucket requires path-style access;
new Railway buckets use virtual-hosted-style access by default.

Export source objects plus local uploads/exports and copy them preserving keys,
content types and cache metadata. Compare object counts and checksums.
Adapter tests do not prove production media has been migrated. Never point the
validation deployment at writable source media.

## Portable links and email

Set RESEND_API_KEY and RESEND_FROM_EMAIL using the existing verified sender.
Direct credentials take priority; the existing Replit connector remains supported.
Set APP_URL to the Railway validation URL during parity checks. Email, request-based URLs, calendar links, AI media URL fallbacks, PayPal redirects,
payment webhook URLs and Telegram URLs use it. Railway requires APP_URL for these
URL builders, preventing links from falling back to localhost or the source domain.
Use https://chatvice.app only after domain cutover. Validate email delivery and
domain verification separately; local tests mock Resend and send no real emails.

## Verification status

| Check | Status |
| --- | --- |
| Server tests (including S3 HTTP integration and email URLs) | 151 PASS |
| Production build | PASS |
| Repository TypeScript check | 280 errors on source and branch; existing diagnostic categories |
| Database restore and row counts | BLOCKED: source snapshot/configuration unavailable |
| Existing login, dashboard, chat/AI, widget and API | BLOCKED: target cannot start without DATABASE_URL |
| Production media and persistence | BLOCKED: source media not exported |
| OAuth, email delivery and sandbox payment/webhooks | BLOCKED: source credentials/configuration unavailable |

Railway bucket credentials are redacted to this connected app. Bucket provisioning
and reference variables are confirmed; live upload/download remains unverified.

The S3 tests use a local HTTP fixture with disposable objects, not production
buckets. Email tests mock the provider. Neither is a full production parity check.

## Deployment and cutover gate

1. Back up actual production database and media; verify backup restoration.
2. Restore an isolated database snapshot for Railway validation.
3. Configure secrets and portable storage, deploy with background jobs disabled.
4. Verify database counts, existing login/session, dashboard, chat and AI,
   widget assets/WebSocket, upload/download, OAuth, sandbox payments/webhooks,
   API and persistent media after restart.
5. Record each outcome; cutover requires every applicable parity check PASS.
6. Take a final backup, drain writes and synchronize the final delta.
7. Switch DNS only after target readiness, TLS and rollback checks.
8. Transfer worker ownership and integration webhook destinations deliberately.
9. Keep the old deployment available for rollback until verification completes.

Current status: target storage bucket ChatviceMedia and S3 references are configured,
with NODE_ENV=production and ENABLE_BACKGROUND_JOBS=false. No redeploy was triggered.
Source credentials and DATABASE_URL remain missing; latest deployment is CRASHED.
Production database/media export, production media transfer and parity remain blocked.
No domain cutover has been performed.
