# Encrypted mailbox archive recovery

`scripts/mail-archive-v2.mjs` verifies a completed CVMARCH2 snapshot using only
Node built-ins. It reads the encrypted manifest selected by `LATEST`, authenticates
each original RFC822 source, and reconciles exact byte counts, hashes, identities,
mailboxes and folder counts. Complete source bytes retain MIME attachments and
headers, including content that is not valid UTF-8.

Set these variables in the private recovery process:

| Variable | Value |
| --- | --- |
| `MAIL_ARCHIVE_DIRECTORY` | Absolute path to the private archive volume |
| `MAIL_ARCHIVE_KEY` | The original 64-character lowercase hex key, supplied as a secret |
| `MAIL_ARCHIVE_MAILBOXES` | JSON array of the exact expected mailbox addresses |

Run `node scripts/mail-archive-v2.mjs`. The command performs no network access,
mailbox mutation or database import. Output contains only aggregate recovery
results and mailbox counts. Failure output is deliberately generic to avoid
printing private paths, email content or secret-bearing exception messages.

Verification refuses an active archive writer, unsafe paths, symlinked files,
missing or changed objects, wrong keys, mailbox scope mismatches, duplicated
identities, changed manifests and inconsistent folder totals. Reads are bounded
to 5,000 messages, 32 MiB per original, 60 MiB total and an 8 MiB manifest.

`verified: true` proves the selected local snapshot can be authenticated and read
with the supplied key. Check `sourceInventoryStable` separately: a false value
requires source delta reconciliation before cutover. The report explicitly leaves
`independentOffsiteCopy` and `mailboxDatabaseImported` false. A local recovery does
not prove independent key recovery, an offsite backup or application import.

The older `scripts/mail-archive.mjs` reads/writes CVMARCH1. It must not be used to
verify a CVMARCH2 volume. Never replace the archive key to retry a failed run;
retain the original key and encrypted files while diagnosing the failure.

Run the synthetic recovery regression suite with:

```sh
node --test scripts/mail-archive-v2.test.mjs
```
