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

## Storage blocker

server/objectStorage.ts authenticates and signs URLs using Replit's sidecar
on 127.0.0.1:1106. OBJECT_STORAGE_BUCKET alone does not make Railway compatible.
Export bucket objects plus local uploads/exports, compare object counts and
checksums, and implement an authenticated portable storage adapter before
claiming storage parity. Preserve existing /storage/uploads/... paths.

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

Current status: target lacks application variables and latest deployment crashed.
Production database/media export, portable storage and parity remain blocked.
No domain cutover has been performed.
