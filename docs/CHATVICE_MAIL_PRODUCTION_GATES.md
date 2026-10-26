# Isolated Mail implementation and release evidence

Mail is not production-ready until delivery, data preservation and restore gates
below have actual evidence. Existing Chatvice production and Hostinger remain live.

## Independent application

- Build: `npx tsx script/build-mail-app.ts`; start `node dist/mail-app-server.cjs`.
- Dedicated service, database and private R2 bucket. No main Chatvice jobs/routes or marketing entry document.
- Required: `CHATVICE_MAIL_APP_ROLE=isolated-mail`, exact HTTPS `CHATVICE_MAIL_APP_ORIGIN`, identical `CHATVICE_MAIL_ALLOWED_ORIGINS`, stable encryption key and separate 64-hex `CHATVICE_MAIL_SESSION_SECRET`.
- Apply additive `migrations/20261027_chatvice_mail_login.sql` after Mail v1/v2 only on the isolated Mail DB after backup. QA bootstrap must be disabled.
- Webmail login supports independent identities with memberships in multiple mailboxes. It does not provide IMAP/SMTP client compatibility.
- Passwords use random-salt scrypt; sessions store keyed token hashes, expire after eight hours and check live enabled/credential-version state on every request. Host-only `__Host-chatvice_mail` cookie is Secure, HttpOnly, SameSite=Strict. Main-app cookies are not accepted.
- Persistent atomic login request limits apply per source IP and account. AI stays disabled.
- `scripts/mail-provision-user.ts` previews by default. It requires the exact expected database hostname, existing tenant, and (for nonadmins) existing supervisor plus mailbox membership. Only `--apply` creates credentials. Password comes from a secret environment variable, never an argument or chat. No public signup/reset endpoint exists.

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
