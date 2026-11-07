# Chatvice media integrity verification

## Existing production snapshot

The Railway deployment logged `LOCAL_MEDIA_READY: 1168` on October 19, 2026. This confirms hydration completed for the manifest, but the startup marker skips a full checksum re-check on subsequent starts. It cannot establish whether all database-referenced images and historical media are present.

## Read-only audit

The script `script/audit-hydrated-media.mjs` reads the existing S3 manifest and compares every listed file against `MEDIA_ROOT` using size and SHA256. It reads but never writes the mounted volume, source object storage, or database, and outputs counts only (no paths or customer data).

Run manually **off-peak** inside the Railway service container with the existing environment variables after change review:

```bash
node script/audit-hydrated-media.mjs
```

A complete manifest audit requires `verified === expected`, `missing === 0`, `checksumMismatch === 0`, `sizeMismatch === 0`, and `unsafe === 0`. Exit codes: 0 complete, 1 mismatch, 2 invalid config/manifest/runtime failure.

Further gates: reconcile `public.stored_files`, `chat_media`, upload/export URLs and historic external references against the database; explicitly identify any missing source files before Cloudflare R2 migration. No deletion or migration is performed by this PR.

Test offline with `node --test server/__tests__/media-integrity.node.test.mjs`; tests use temporary synthetic files only.
