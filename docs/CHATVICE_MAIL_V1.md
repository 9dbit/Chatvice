# Chatvice Mail V1 (isolated development branch)

This change adds a first, disabled-by-default mail data-plane and UI to the existing Chatvice React/Vite + Express + PostgreSQL application. **This is not a live SMTP/IMAP/email hosting solution yet.**

## Feature flag / safety
- `CHATVICE_MAIL_ENABLED=true`: opt-in ONLY after staging migration and security tests.
- `CHATVICE_MAIL_INBOUND_SECRET`: random 32+ character secret for HMAC webhook verification; do not print.
- No MX/DNS/Hostinger changes. No automatic database schema push.
- Existing outbound creation stores *queued* messages only. **No external email is sent** until a verified, retry-safe provider worker is implemented.
- Inbound JSON requires headers `x-mail-timestamp` (epoch milliseconds) and `x-mail-signature` (hex HMAC-SHA256 of `timestamp + "." + JSON.stringify(body)`). This is a provider-neutral adapter contract; keep publicly inaccessible until a provider adapter implements signature verification and normalization.
- All internal mail API routes require merchant/supervisor HTTP session and tenant-scoped checks (except independently HMAC-authenticated provider ingestion).
- Mail content must never be exposed to third-party analytics, indexed pages, generic public uploads or public object storage.

## Apply ONLY to isolated staging Postgres
1. Verify backup and restore point. Check database owner and targeted instance.
2. Run `migrations/20261026_chatvice_mail_v1.sql` as a transaction against **staging** database.
3. Verify table structures and indexes. Do not run `npm run db:push` against production.
4. Set `CHATVICE_MAIL_ENABLED=true` on staging **only**.
5. Sign in as merchant at `/dashboard/mail`.
6. Add domain from merchant-admin API (pending state), then create mailbox. Domain verification must be implemented via DNS verification before sending is enabled. Do not manually mark unverified domain verified without checking DNS.
7. Verify unauthenticated 401, noindex/no-store, tenant isolation and inability to send from unverified domain.

## API (V1)
`GET /api/mail/mailboxes`: accessible mailboxes.
`GET /api/mail/threads?mailboxId=...&folder=inbox`: paged previews.
`GET /api/mail/threads/:id`: authorized full thread.
`POST /api/mail/compose`: create draft or outbound queued record.
`PATCH /api/mail/messages/:id`: read/star/folder.
`GET /api/mail/domains`: merchant-only.
`POST /api/mail/domains`: merchant-only, creates pending domain.
`POST /api/mail/mailboxes`: merchant-only.
`POST /api/mail/inbound`: HMAC-authenticated provider adapter ingestion.

## Required next work before readiness
- Add real provider transport and background worker with idempotency, retries, bounce handling, DKIM signing, rate limits and delivery webhooks.
- Validate domain ownership (DNS TXT) before enabling a sending identity; prevent duplicate mailbox names/aliases and domain spoofing across tenants.
- Implement secure attachment upload/scan/private object storage and authorized download.
- Implement operator membership management, aliases, admin UI, customer 360 and AI assist workflows.
- Harden CSRF/origin handling behind reverse proxy and test same-site/cookie configurations.
- Add API and E2E test suites; run `npm run check`, `npm run build`, route smoke tests, and full security regression in an isolated staging environment.
- Inspect public/static legacy uploads paths separately before handling mail attachments.
- Coordinate production cutover only once actual inbound/outbound delivery pass with MX, SPF, DKIM, DMARC, rollback and archived mailbox migration verified.

**Do not merge this PR or deploy to production until the above requirements are met.**
