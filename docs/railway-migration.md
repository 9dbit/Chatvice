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
| Database restore and row counts | BLOCKED: source archive decoded; complete export/transfer unavailable |
| Existing login, dashboard, chat/AI, widget and API | BLOCKED: target cannot start without DATABASE_URL |
| Production media and persistence | BLOCKED: source media not exported |
| OAuth, email delivery and sandbox payment/webhooks | BLOCKED: source credentials/configuration unavailable |

Railway bucket credentials are redacted to this connected app. Bucket provisioning
and reference variables are confirmed; live upload/download remains unverified.

The S3 tests use a local HTTP fixture with disposable objects, not production
buckets. Email tests mock the provider. Neither is a full production parity check.

## Exporting the Replit source

Run script/export-replit-migration.mjs from the source Chatvice workspace.
It requires Node, git, pg_dump, pg_restore and tar. PostgreSQL clients must support
the source server version. Use --check for a prerequisite check before exporting.

The script creates a custom-format database dump and decodes it with pg_restore
without restoring to a database. It exports referenced application environment
variables and the Resend connector credentials into source-config.json.
The source database URL is stored separately from applicationVariables; do not
apply it directly to Railway validation. Restore the dump to an isolated target
and use that target's DATABASE_URL.

Local uploads, exports, attached_assets and upload directories under public are
copied with a path manifest. Replit bucket objects retain original keys, content
types, cache metadata, sizes, source generations and SHA-256 checksums. Downloads
pin object generations; failures or skipped media symlinks prevent a completed
export. Database URIs are decoded into a private libpq service file, rather than put in
PGDATABASE. The dump command references only the fixed service name. This avoids
treating a URI as a literal database name and keeps credentials out of arguments.
SDK errors are not printed because they can contain credentials. PostgreSQL failures
print a classified error code; raw stderr is retained only in a 0600 private log
beside the backup. POSTGRES_VERSION_MISMATCH includes only server/client version
numbers. If newer clients are installed outside PATH, set PG_DUMP_BIN and
PG_RESTORE_BIN to their executable paths.

The primary backup is outside the repository in ~/chatvice-private-backups.
A copy of the tar.gz and its .sha256 file is placed in chatvice-private-transfer
for download from Replit Files. The script first adds this directory to the
checkout's local Git exclude and verifies it is ignored; files have 0600
permissions and directories have 0700 permissions. These archives contain
production secrets and customer data: transfer privately, never publish or commit.

Download the archive and checksum to Spark's Downloads folder. The exporter
does not upload data, change running application code, alter DNS, restore a
database, or switch worker ownership. A live database snapshot and media export
are not an atomic snapshot; final writes still require synchronization at cutover.
Audit dynamically selected environment variables, database-stored integration
settings, role/permission mappings and provider-native AI credentials separately.

The exporter prints EXPORT_STAGE markers and a safe failure code if any stage
fails. Raw SDK details are saved only in export-error.private.log beside the
private backup; do not paste this file into chat or publish it.

If DATABASE_ARCHIVE_DECODE_PASS was printed before a later failure, run the
updated exporter with --reuse-database followed by that backup directory.
It verifies that the saved configuration belongs to the current database and
bucket, requires private regular files owned by the current user, copies the
saved configuration and dump into a new private backup directory, verifies the
dump checksum, and decodes it again before exporting media. It leaves the
original backup intact and records the original dump modification time and
backup name in the new manifest. Reuse retains the earlier database snapshot;
the media export runs at the new time, so final synchronization remains required.

Local exporter verification: 20 fixture tests PASS, Node syntax PASS.
The source reported DATABASE_ARCHIVE_DECODE_PASS, then failed in a later stage.
This confirms archive decoding, not database restoration or a completed export.
Stage diagnostics must identify the remaining failure in the source workspace.
No production restoration has been verified yet.

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
The source database archive decoded successfully, but the complete database/media export,
production media transfer and parity remain blocked.
No domain cutover has been performed.
