# Chatvice Mail isolated QA on Railway

## Environment isolation

**Railway project:** Chatvice `40970ac6-3ce6-4d31-8d6a-555d2dd6fecf`

**Environment:** `cutover-staging` `08a3efa0-8a70-44db-a2fb-ca46ddb84b95`

**Dedicated QA service:** `Chatvice-Mail-QA` (`fa921e59-5afb-4c3a-b65a-643fcf47fa21`)

**Disposable QA PostgreSQL:** `Postgres-9JXu` (`e4d38f58-68a9-43c1-ad36-9626d2f6b8d1`)

Existing `Chatvice-staging`, its PostgreSQL, and all five previous uncommitted staged config changes are unrelated and **must not** be applied as part of Mail rollout. Production services and MX records are out of scope.

### Build / start

- Source: `9dbit/Chatvice` branch `feature/chatvice-mail-engine-20261026`
- Build: `npx tsx script/build-mail-qa.ts`
- Pre-deploy: `node scripts/mail-qa-bootstrap.mjs`
- Start: `node dist/mail-qa-server.cjs`
- Healthcheck: `GET /health`
- Isolated React UI: `/dashboard/mail` and `/dashboard/mail/admin`
- QA HTML has no Google Tag Manager, Facebook/Meta Pixel, external marketing scripts, or Google Fonts.
- HTTP Basic QA login username: `mailqa`. Password is the **sealed Railway variable** `CHATVICE_MAIL_QA_TOKEN`; do not paste it in chat, commits or logs.
- The QA HTTP API also accepts `Authorization: Bearer <same QA token>`.

### Secrets & flags

`DATABASE_URL` is referenced from the **new dedicated** `Postgres-9JXu` only; never point QA to another Chatvice database.

```dotenv
CHATVICE_MAIL_QA_ROLE=isolated-chatvice-mail
CHATVICE_MAIL_QA_BOOTSTRAP=true
CHATVICE_MAIL_QA_DB_KIND=disposable-empty-only
CHATVICE_MAIL_ENABLED=true
CHATVICE_MAIL_OUTBOUND_ENABLED=false
CHATVICE_MAIL_AI_ENABLED=false
CHATVICE_MAIL_ATTACHMENTS_ENABLED=false
CHATVICE_MAIL_PROVIDER=disabled
CHATVICE_MAIL_ALLOWED_ORIGINS=https://<verified-railway-qa-domain>
CHATVICE_MAIL_QA_TOKEN=<64-hex-secure-secret>
CHATVICE_MAIL_ENCRYPTION_KEY=<64-hex-secure-secret>
```

`CHATVICE_MAIL_QA_TOKEN` and `CHATVICE_MAIL_ENCRYPTION_KEY` are distinct secrets. Backup the encryption key safely before storing non-disposable data.

Bootstrapping refuses to run against production, nonempty databases, or environments lacking the guard variables. It creates minimal synthetic merchant/lead tables, the reviewed Mail migrations, and a **non-deliverable** `hello@qa-mail.example.invalid` mailbox. This is disposable QA content only and is not `hello@chatvice.app`.

Outbound and AI features are deliberately disabled in this isolated QA app, including if someone mistakenly adds provider API credentials. Do not enable either without a separate reviewed rollout.

### Acceptance gates

- GitHub Actions: security, crypto, private attachment, tenant-isolation, DB-bootstrap, and no-tracker QA bundle checks pass.
- QA deployment finishes with **SUCCESS** and /health returns 200.
- Private QA login denies requests without the secret.
- An authorized merchant can open Mail and Mail Admin, create drafts, list/read threads, and verify encrypted DB snapshots.
- An authorized viewer cannot write, and another tenant cannot read data.
- Inbound provider webhook only after separate domain verification and signed callback test; keep main `chatvice.app` MX untouched.
- Configure Cloudflare private R2, internal ClamAV and Resend only after verification. All attachment downloads remain blocked until clean scan.
- Historical Hostinger messages, per-mailbox email hosting, operational deliverability, and final MX cutover are **not** complete in this QA phase.

### Rollback

Disconnect/delete **only** the dedicated QA service and QA database after backing up any test artifacts. Do not touch existing Railway production resources, old `cutover-staging` patch, Cloudflare DNS, MX, or existing mailboxes.
