# Isolated Mail implementation and release evidence

Mail is not production-ready until delivery, data preservation and restore gates
below have actual evidence. Existing Chatvice production and Hostinger remain live.

Latest provider checkpoint (28 October 2026): the independent
`qa-mail-staging.chatvice.app` domain and all four Cloudflare records are verified
for sending/receiving in Resend. A domain-restricted sending key exists, but
automatic approval review blocked its transfer to Railway and creation of the
separate Full access receiving key pending explicit authorization. No webhook or
real email has been tested; application provider/outbound/attachments remain off.
See the [RDC / SPARK setup and exact remaining actions](CHATVICE_MAIL_PROVIDER_DISCOVERY.md#rdc--spark-continuation--28-october-2026-0100-wib).

## Independent application

- Build: `npx tsx script/build-mail-app.ts`; start `node dist/mail-app-server.cjs`.
- Dedicated service, database and private R2 bucket. No main Chatvice jobs/routes or marketing entry document.
- Required: `CHATVICE_MAIL_APP_ROLE=isolated-mail`, exact HTTPS `CHATVICE_MAIL_APP_ORIGIN`, identical `CHATVICE_MAIL_ALLOWED_ORIGINS`, stable encryption key and separate 64-hex `CHATVICE_MAIL_SESSION_SECRET`.
- Apply the reviewed login and delivery-recipient migrations after Mail v1/v2 only on the isolated Mail DB after backup. QA bootstrap must be disabled. The delivery migration adds opaque recipient evidence and clears unsupported legacy multi-recipient delivery summaries to `sent`; it never requeues mail or changes message bodies.
- Webmail login supports independent identities with memberships in multiple mailboxes. It does not provide IMAP/SMTP client compatibility.
- Passwords use random-salt scrypt; sessions store keyed token hashes, expire after eight hours and check live enabled/credential-version state on every request. Host-only `__Host-chatvice_mail` cookie is Secure, HttpOnly, SameSite=Strict. Main-app cookies are not accepted.
- Persistent atomic login request limits apply per source IP and account. AI stays disabled.
- `RESEND_API_KEY` is for sending and should be restricted to the Mail domain. Inbound retrieval requires a separate `RESEND_RECEIVING_API_KEY`; it never falls back to a sending key. The provider dashboard currently offers Full access for receiving API reads, so isolate its account or review that broader scope explicitly. Do not reuse the existing Pentagon credential.
- `scripts/mail-provision-user.ts` previews by default. It requires the exact expected database hostname, existing tenant, and (for nonadmins) existing supervisor plus mailbox membership. Only `--apply` creates credentials. Password comes from a secret environment variable, never an argument or chat. No public signup/reset endpoint exists.

For a brand-new isolated application database, use `node scripts/mail-app-schema.mjs` as pre-deploy with `CHATVICE_MAIL_SCHEMA_INSTALL=reviewed-isolated-only`, the exact `CHATVICE_MAIL_SCHEMA_EXPECTED_HOST`, and explicit `CHATVICE_MAIL_INITIAL_TENANT`. It creates the minimal standalone tenant/CRM tables and all reviewed Mail migrations in one transaction, records SHA-256 migration history, refuses unmanaged/nonempty databases, and checks history on every repeat. It creates no password or public signup. The installer can also advance only the exact immutable three-migration Mail release to the reviewed fourth migration under the same expected-host, tenant, transaction and history guards. Unknown, incomplete, altered or unmanaged histories are refused. This installer is separately tested on disposable PostgreSQL; do not point it at the main Chatvice database.

## Independent application image

`Dockerfile.mail-app` packages the independent Mail application. Build it explicitly
with `docker build --file Dockerfile.mail-app --tag chatvice-mail-app:review .`.
It is separate from `Dockerfile.mail-qa`; selecting or building this file does not
change a Railway service, create credentials, enable outbound mail or perform a
production deployment.

The image contains the compiled private frontend/server, the guarded schema installer,
all four reviewed migrations and the compiled offline identity command
`node dist/mail-provision-user.mjs`. It uses the same exact locked database/schema
dependencies as QA and runs as `node`. Main app sources, attached assets, development
dependencies, the QA server and the disposable QA bootstrap are excluded from the
runtime. HTTP/application modules are bundled explicitly; a new unrelated main-app
dependency cannot silently become an uninstalled runtime dependency.

For a reviewed new Mail service, select this Dockerfile, use `/health`, start
`node dist/mail-app-server.cjs` and configure the exact isolated app origin, stable
session/encryption keys and isolated database listed above. Run the guarded schema
installer as a pre-deploy step only after verifying its expected host and empty
database. Provision the first identity separately: the compiled command previews
by default and uses the existing `MAIL_PROVISION_*` environment variables; only
`--apply` writes an account. The password stays in the operator's secret environment.
Neither the image nor schema installer embeds an initial login.

`scripts/mail-app-container-smoke.mjs` boots this actual image on a new disposable
CI database. It verifies wrong-host refusal, packaged migration history, preview
without account creation, offline account creation, tracker-free UI/assets,
main-app cookie denial, cross-origin login denial, independent secure sessions,
session persistence after a runtime restart, logout revocation and disabled
provider/AI/attachment features. It also verifies the non-root runtime, source/QA
exclusion and a 350 MiB image ceiling. Passing this test does not prove delivery,
real browser acceptance behind the target TLS proxy or production recovery.

## Attachment encryption compatibility

New private objects use authenticated AES-256-GCM envelopes bound to their complete
tenant/message/object key. Database fields retain their existing version. Size limits
count original bytes, and network read caps include envelope overhead.

Unversioned plaintext objects are refused. Existing synthetic QA objects must be
reuploaded or migrated after an inventory; never silently delete them. Real historical
mail must be preserved as complete RFC822 originals, including oversized attachments,
before applying a normal attachment upload policy. Do not truncate an original to
fit 8 MiB or silently skip it.

## Historical preservation utility

`scripts/mail-archive.mjs` accepts JSONL `{folder,uid,size,source}` from a read-only
export. It verifies exact UTF-8 byte count against the source inventory, encrypts each
complete RFC822 original with a separate protected `MAIL_ARCHIVE_KEY`, verifies the
authenticated decrypt/hash roundtrip, and writes immutable object/hash manifests.
Up to 128 MiB per raw message is allowed. An encoding/size mismatch is a blocker,
not permission to rewrite the email. `--verify` reopens and checks all saved records.

The optional temporary `--serve` bridge binds loopback only, requires a random
bearer token, rejects browser Origin requests, and keeps the archive key in its
process/child environment. Shut it down after export. Protect and back up the key
separately; a local archive is not proof of a Cloudflare R2 copy or database import.

`scripts/mail-backup.mjs seal|open` wraps a pg_dump stream in a separate
authenticated backup envelope, bounded to 512 MiB. `open` authenticates the entire
dump before releasing restore bytes. CI restores a dump into a separate disposable
PostgreSQL database and compares all 14 table row sets by count and SHA-256.
This is a synthetic rehearsal; it does not establish production backup coverage,
R2 restoration, external key recovery or successful application rollback.

Once encrypted attachments exist, never roll back to an unversioned plaintext
object reader. A rollback target must retain the new envelope reader (commit
8d2022f or later) and the original encryption key; rehearse that exact image and
database/object snapshot combination before production release.

## Verified baseline and outstanding release gates

- QA baseline commit `be5aff16ad29ead0a135b0770e6812add32e01b3`: GitHub run `40267853550` success.
- QA token rotated without posting its value. Deployment `9f4f2132-ed1d-43d2-a066-83780cd3602a` observed SUCCESS; health 200 and anonymous UI/API 401, all no-store.
- Hostinger authorized account exposes hello only: 831 Inbox + 2 Sent. Sent UID 1 is 11,601,838 bytes with one attachment. master is not exposed by that account.
- Old unrelated staging patch `2bfcd815-6772-40d1-a8b0-93670c9bc0e8` has five changes and must not be accepted or overwritten for Mail.
- New code needs full CI, authenticated browser QA, live ClamAV clean/EICAR tests, and independent login/permission tests.
- Cloudflare authenticated access, private R2 credentials, provider sending/receiving credentials and signed webhook secret still need verification.
- Use only a dedicated test subdomain first. Prove real inbound, outbound, replies, attachment bytes, duplicate events, rejection and delivery status with test recipients.
- Preserve and verify every Hostinger source, import with per-message/attachment hashes and folder/date/flag reconciliation, identify master, and complete delta reconciliation.
- Create isolated production only after review and secure backup; rehearse database/object/key restore and app rollback. An available Railway rollback button is not a restore rehearsal.
- Change root MX/SPF/DKIM/DMARC only after all preceding gates pass. Do not delete Hostinger until integrity and rollback retention are confirmed.

## Large-file and outbound payload contract

The shared file ceiling is 16 MiB, with the existing 16 MiB aggregate decoded attachment ceiling and eight-file cap retained. This accommodates the observed 8,477,526-byte legacy attachment without unbounded buffers. Browser and private-store limits share one policy. The adapter explicitly serializes filename/base64 attachment pairs, rejects malformed or over-budget data before transport, and has a byte-for-byte payload regression. Resend documents 40 MB after attachment Base64 encoding: https://resend.com/docs/api-reference/emails/send-email. The historical large source still requires a successful export; synthetic size coverage is not a claim that it has been imported.

## Per-recipient delivery acceptance

Resend outcome webhooks identify individual recipients in `data.to`. A message
may be marked delivered only when signed evidence covers every unique To/CC/BCC
recipient. A later CC/BCC bounce or complaint must remain visible as a delivery
issue even after an earlier recipient was delivered. Late sent events must not
downgrade final recipient outcomes or revive an expired send.

Recipient evidence stored in delivery events uses keyed, tenant/message-bound
opaque values; private BCC addresses and event keys must not appear in thread
responses. Replay deduplication and mixed-recipient order must be tested with
signed events on disposable PostgreSQL before real multi-recipient testing.

The separate delivery staging application is currently private with outbound, AI
and attachments disabled. A successful private deployment proves application/DB
startup only. Provider authentication, test-domain DNS, signed ingress, test-login
provisioning and actual message/attachment receipt remain acceptance gates.
