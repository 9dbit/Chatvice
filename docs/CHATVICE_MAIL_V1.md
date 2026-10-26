# Chatvice Mail Engine (V1 development branch)

Owner: GitHub `9dbit/Chatvice`, Railway is the deployment target. Replit is **not** used.

> Security gate: Mail is **OFF by default**. This is a code branch, NOT an operating email service. Do not change `chatvice.app` MX or decommission existing mailboxes.

## Implementation
- Multi-tenant PostgreSQL schema for domains, mailbox memberships, aliases, threads, messages, attachments metadata and delivery events.
- Private dashboard pages: `/dashboard/mail` and `/dashboard/mail/admin`.
- Domain ownership proof via TXT `_chatvice-mail.DOMAIN` containing `chatvice-verify=TOKEN`.
- Mailbox create/disable, aliases, existing Chatvice supervisor permissions (owner/member/viewer).
- Session-authenticated mailbox APIs; tenant/box scope and explicit origin allowlist for mutating requests.
- Provider-neutral signed normalized inbound endpoint (raw payload HMAC) and Resend provider adapter.
- Resend webhook signature verification on original raw bytes (Svix protocol), inbound fetching with recipient-to-verified-mailbox routing, deduplication, and delivery-state updates.
- Provider-specific outbound queue processor with DB lease and up to seven bounded retries. Resend idempotency key uses internal message UUID; retries stop ahead of the 24-hour provider idempotency window.
- RFC Message-ID correlation through Resend send/delivery events for more accurate reply threading.
- Customer 360 context via tenant-filtered CRM lead lookup, with user-triggered Convert to Lead.
- Safe/plain text email rendering in React, **never inject untrusted email HTML**.
- AI Summary and Draft Reply are opt-in (both feature flag + individual explicit user consent), and **never auto-send**. Snippets have basic email/phone redaction, which is not a guarantee of full PII removal.
- Mail page uses stricter CSP, suppresses Google Tag Manager on private documents, and forces a clean full-document navigation when entering the Mail route from a tracker-loaded SPA page. This is a transitional defense, not equal to dedicated cross-origin isolation.
- Private R2 draft/inbound attachments are implemented behind disabled-by-default flags, with tenant authorization, bounded file sizes, quarantine and optional clamd scanning. Real provider and infrastructure verification remain outstanding.

## Railway environment template
Keep these values disabled until a segregated staging environment is ready. Never commit real values.

```dotenv
CHATVICE_MAIL_ENABLED=false
CHATVICE_MAIL_OUTBOUND_ENABLED=false
CHATVICE_MAIL_PROVIDER=resend
CHATVICE_MAIL_ALLOWED_ORIGINS=https://your-staging-host.example
CHATVICE_MAIL_INBOUND_SECRET=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
```

The Resend API key must support sending AND receiving according to provider permissions. The webhook secret must be the `whsec_...` signing secret. Prefer scoped keys and restrict access in Railway. Do not reuse secrets from production Chatvice authentication.

## Staging migration
1. Confirm which Railway project/environment/database is **non-production** and test its backup/restore.
2. Explicitly review the five older staged changes already present on `cutover-staging`. **Do not blindly commit or overwrite those changes.**
3. Run `migrations/20261026_chatvice_mail_v1.sql` only against the isolated staging PostgreSQL after a backup.
4. Confirm tables, indexes and foreign keys, and ensure no existing production tables changed.
5. Set `CHATVICE_MAIL_ENABLED=true`, `CHATVICE_MAIL_OUTBOUND_ENABLED=false`, and the exact staging origin.
6. Log into staging as an existing Chatvice merchant at `/dashboard/mail/admin`. Add a disposable test domain and read the DNS TXT proof.
7. Verify TXT proof in test DNS; this **does not** set up MX, SPF, DKIM or Resend sending-domain verification.
8. Configure a test provider domain (prefer dedicated subdomain; do not touch primary MX). Configure Resend webhook for `email.received`, `email.sent`, `email.delivered`, `email.bounced`, `email.failed`, `email.complained`, and secret.
9. Test inbound without attachment and confirm unknown recipients cannot access another tenant's mail. Test duplicate delivery, invalid signatures, expired signatures and direct unauthenticated API calls.
10. Confirm outbound sending-domain verified by provider; enable `CHATVICE_MAIL_OUTBOUND_ENABLED=true` on staging only. Test draft, send, receive, reply, delivery and bounces.
11. Test user permission changes, disabled mailbox and concurrent outbox workers.
12. Keep feature disabled on production and maintain old mailboxes until complete cutover + rollback checks.

## User API (mail engine enabled)
- `GET /api/mail/mailboxes` (membership filtered)
- `GET /api/mail/threads?mailboxId=UUID&folder=inbox&limit=40&offset=0`
- `GET /api/mail/threads/:id`
- `GET /api/mail/threads/:id/context`
- `POST /api/mail/threads/:id/convert-to-lead`
- `POST /api/mail/compose` (only sends when outbound provider is fully configured)
- `POST /api/mail/threads/:id/ai` (feature flag `CHATVICE_MAIL_AI_ENABLED=true`, `acknowledgeExternalProcessing=true` required; server-only `CHATVICE_MAIL_AI_API_KEY`)
- `PATCH /api/mail/messages/:id` (isRead, isStarred, folder)

## Merchant administration
- `GET /api/mail/domains`, `POST /api/mail/domains`
- `GET /api/mail/domains/:id/dns`, `POST /api/mail/domains/:id/verify`
- `POST /api/mail/mailboxes`, `PATCH /api/mail/mailboxes/:id`
- `GET/POST /api/mail/mailboxes/:id/members`, `DELETE /api/mail/mailboxes/:id/members/:userId`
- `GET/POST /api/mail/mailboxes/:id/aliases`, `DELETE /api/mail/mailboxes/:id/aliases/:aliasId`

## Provider ingress
- `POST /api/mail/provider/resend/webhook` requires verified Svix `svix-id`, `svix-timestamp`, `svix-signature` on raw payload bytes.
- `POST /api/mail/inbound` is only for controlled internal adapters. Requires HMAC-SHA256 hex `x-mail-signature` of `timestamp + "." + raw_body` and `x-mail-timestamp` in epoch **milliseconds**. Secret must be 32+ characters.
- Both ingress routes only use verified recipient addresses to identify mailbox/tenant. Incoming payload cannot select an arbitrary tenant.

## Current testing
- GitHub Actions workflow: `.github/workflows/chatvice-mail-ci.yml`.
- Unit tests: `npx tsx --test server/mail/security.test.ts`.
- CI initially passed all six Mail signature/provider tests. App-wide `npm run check` had ~280 pre-existing TypeScript errors in unrelated modules, so CI currently reports baseline separately while **failing on new Mail-specific TS errors** and running `npm run build`.
- The mail tables now have a Drizzle schema mirror at `shared/mail-schema.ts` and are included in `drizzle.config.ts`. Still use reviewed SQL migrations and do not run `db:push` against production.
- Full database integration, E2E, R2 attachments, mailbox history migration and live DNS delivery are still pending. Do not claim production readiness.

## Remaining hard blockers
- Private Cloudflare R2 attachment storage, malware scan, bounded uploads and authorized downloads.
- Production provider credentials, ownership verification, inbound MX cutover and mailbox history copy.
- Integration tests against isolated PostgreSQL, origin/session/CSRF tests, tenant boundary tests and real provider delivery smoke tests.
- Optional AI is now implemented with consent and is off by default. Must pass independent PII/data-processing and billing review before enabling.
- For **strictest mailbox privacy**, move Mail to a separately hosted `mail.chatvice.app` origin/build with no shared marketing scripts. The current route-level CSP and forced reload mitigate GTM exposure but do not make same-origin scripts an absolute browser security boundary.
- Independent mailbox account login/IMAP compatibility, if Chatvice Mail should also operate outside existing Chatvice merchant/supervisor sessions.
- Safe provider and domain rollback for `hello@chatvice.app` and `master@chatvice.app`.

**Do not merge or deploy to production before those checks and explicit approval.**


## Private attachment integration (development only)
- New additive migration: `migrations/20261026_chatvice_mail_attachments_v2.sql`. Apply after v1, only against isolated staging PostgreSQL.
- R2 is accessed server-side via S3 SigV4 over HTTPS (`auto` region). Files have server-generated private keys. No public bucket or presigned browser link is used. Set a bucket-scoped R2 token in Railway secrets.
- Set `CHATVICE_MAIL_ATTACHMENTS_ENABLED=true` only in staging after a private R2 bucket is configured. Credentials: `CHATVICE_MAIL_R2_ACCOUNT_ID`, `CHATVICE_MAIL_R2_BUCKET`, `CHATVICE_MAIL_R2_ACCESS_KEY_ID`, `CHATVICE_MAIL_R2_SECRET_ACCESS_KEY`.
- Resend attachments are fetched through the provider API, then from signed download URLs restricted to exact hostnames configured in `CHATVICE_MAIL_ATTACHMENT_DOWNLOAD_HOSTS`. Redirects and unapproved hosts fail closed. Never use a wildcard.
- ClamAV: `CHATVICE_MAIL_CLAMAV_HOST` (private Railway network) and `CHATVICE_MAIL_CLAMAV_PORT=3310`. If unavailable or scanning fails, scan status remains `pending`. Pending/blocked attachments cannot be downloaded or sent.
- `POST /api/mail/messages/:id/attachments` uploads one file to a draft. `GET /api/mail/messages/:id/attachments` lists safe metadata. `GET /api/mail/attachments/:id/download` requires a session and clean scan status. `POST /api/mail/attachments/:id/rescan` allows an authorized operator to retry.
- `PATCH /api/mail/drafts/:id` edits a saved draft; `POST /api/mail/drafts/:id/send` queues a draft only when every attachment is clean. Outbound worker reads clean attachments privately from R2 and sends as provider base64 payloads.
- Limits: 16 MiB per file, at most 8 attachments, and maximum 16 MiB total decoded attachment payload. Current draft upload quota accounting and automatic retention/garbage collection require additional hardening.
- Never switch the main domain MX solely to test attachments. Use a disposable provider test domain/subdomain; verify signed inbound event, safe file, blocked EICAR, scanner outage, provider retry, duplicate event and tenant separation.
- Unit tests: `server/mail/attachment-security.test.ts`. DB integration: `server/mail/integration.test.ts` with disposable PostgreSQL.

### Activation checklist
1. Verify provider sending and receiving domains in staging (TXT/SPF/DKIM/MX) and configure exact callback origin/secret.
2. Provision private R2 bucket and key scoped to that bucket only; disable public bucket access and public URL.
3. Provision ClamAV on a private internal network with no public service exposure.
4. Run CI and test real inbound and outbound messages with safe attachments and scanner failures.
5. Verify operator/member access, email privacy headers, original sender references, bounded upload, no email data in analytics and rollback.
6. Keep production email and Mail feature flags untouched until all gates pass.

## Encryption at rest (added in Mail V1)

- Chatvice Mail now requires a stable `CHATVICE_MAIL_ENCRYPTION_KEY` before any Mail API, inbound webhook or outbound worker can operate. The key is **64 hex characters** (32 cryptographically random bytes); keep it in Railway's secret variable storage and a separate encrypted recovery vault.
- Mail message subject, plain text body, HTML body (when present) and thread subject are encrypted before PostgreSQL inserts/updates using AES-256-GCM and random IVs. Each tenant has an HKDF-derived subkey; message ID and field label are included as authenticated associated data. Swapped, modified or wrong-tenant ciphertext is rejected.
- Mail lists, thread readers, AI (only when consented), and the sending worker decrypt on the server after mailbox/tenant checks. `/api/mail` fails closed if the key is unavailable.
- **Not end-to-end encryption:** this protects database snapshots/accidental DB access, not the provider or a compromised authenticated app server. Sender/recipient email addresses and status metadata are still stored as plaintext for routing and CRM matching. Private attachments use R2 access controls and malware scanning but currently **do not yet have application-layer encryption**; consider an envelope-key/KMS-based implementation before broad public launch.
- This development branch has no old Mail data. Never enable encrypted Mail over old plaintext Mail records without an explicit one-time migration plan.
- There is no automated key rotation in V1. Back up this exact secret securely before ingesting real customer messages, since losing it permanently loses access to encrypted content.
