# Historical mailbox import preparation

`scripts/mail-import-plan.mjs` validates a CVMARCH2 archive and prepares an
encrypted, deterministic import plan. It performs no database writes, provider
calls, outbound sends, antivirus scans, or offsite uploads. A ready plan is one
prerequisite for import; it is not evidence that production migration is complete.

Install the isolated, locked MIME parser with:

```sh
npm ci --prefix config/mail-migration-runtime --ignore-scripts --no-audit --no-fund
node --test scripts/mail-archive-v2.test.mjs scripts/mail-import-plan.test.mjs
```

Run only in the private archive process with the original `MAIL_ARCHIVE_KEY`,
`MAIL_ARCHIVE_DIRECTORY`, and `MAIL_ARCHIVE_MAILBOXES` JSON array. Never regenerate
the key to satisfy the command. No token or database connection is required.

```sh
node scripts/mail-import-plan.mjs
```

The tool verifies every source before returning any raw content to its parser,
checks the entire archive again after parsing, and clears source buffers afterward.
Raw MIME is bounded to 32 MiB per message and 60 MiB total. MIME conversion is
offline, leaves CID links in place, and does not generate alternative bodies.
Original raw sources are never rewritten. Parsed HTML is untrusted and must still
pass the application's display sanitizer after a future import.

The plan retains original folder, UID, timestamp, flags, sender/recipient fields
(including BCC), RFC identifiers, text/HTML and per-attachment SHA-256. It compares
decoded attachment sizes, names, media types and Content-IDs to the archived
provider inventory. Missing or inconsistent data blocks that message explicitly;
there is no silent skip or truncation. Empty, oversized or over-count attachments
remain preserved in the original archive even when application policy blocks them.

Folder mapping uses provider special-use metadata and INBOX. Other nonempty
folders require an explicit `MAIL_IMPORT_FOLDER_MAPPING` JSON object, for example
`{"Projects":"archive"}`. Original paths remain in the encrypted provenance.
Sent messages have terminal `sent` status, never `queued`, `sending` or invented
`delivered` evidence. Drafts remain drafts. Attachments remain `pending` until
the actual importer performs malware scanning and stores encrypted private objects.

The immutable file `import-plan-<encrypted-manifest-sha256>.cvmplan` contains a
CVMPLAN1 AES-256-GCM envelope. Its key is derived with a separate HKDF purpose from
the archive key; the source manifest digest is authenticated. Publication is
atomic, uses mode 0600, refuses symlinks/conflicting existing plans, and verifies
decryption before acceptance. An identical run reuses the existing encrypted file.
CLI output is aggregate counts and digests only. Exit 0 means all messages could
be prepared against a stable snapshot; exit 2 means the encrypted plan records
explicit blockers; exit 1 means archive verification or plan publication failed.

Before applying any plan, the future database importer must independently verify
the envelope/source snapshot, exact tenant/mailbox ownership and target database;
reconcile source identities and hashes transactionally; encrypt application fields;
scan and verify all attachment objects; and ensure no historical mail enters the
outbox. Separate database/object/key recovery, offsite backup, delta reconciliation
and production acceptance remain release gates. Do not feed this format into the
older UTF-8-only V1 archive utility.
