# Chatvice migration parity audit — 18 October 2026

Status: **HARD BLOCK — development snapshot parity verified; live published production data not yet audited.**

This document records a read-only comparison of the legacy Replit deployment and the Railway Chatvice production environment. It contains **no credentials, customer identifiers, user messages, media filenames, or database rows**.

## Exact scope and baseline

> **P0 SOURCE-PROVENANCE CORRECTION (2026-10-18):** The 13 October backup's `sourceDatabaseUrl` host is exactly **`helium`**, Replit's internal development database. This is **not verified as the published Replit production database**. The 140/140 checksum pass below compares the development snapshot with Railway, not necessarily live `chatvice.app` customer data. Replit can provision an independent production database when publishing. **Do not change DNS, discard old hosting, or run a final restore to Railway until the published production database has been independently identified, backed up, and compared.**


- Source service: Replit **Chatvice.app**, publicly serving `https://chatvice.app`.
- Target: Railway project **Chatvice** (`40970ac6-3ce6-4d31-8d6a-555d2dd6fecf`), app service `c9d4bade-3f8b-4270-b68a-4e03d576493b`, Postgres service `d3d64e81-89df-4969-9bff-5f3246303d69`.
- Target deployment branch: `feat/railway-migration-safety`, source commit `9e146b7d834a43c596c1e0241b9eff48538d4223`.
- Baseline **Replit development (Helium)** snapshot: 13 October 2026 17:35 UTC (partial backup manifest). The backup was located on an authorized Mac. Its `sourceDatabaseUrl` hostname was checked without disclosing the URI and is exactly `helium`. It is internal to Replit, not externally routable. Published production DB connection and provenance have NOT been established.
- The source transfer ZIP contained two custom-format PostgreSQL dumps, 86,423,457 bytes each. Both passed ZIP/PGDMP read and `pg_restore --list` checks. The second backup (`chatvice-SNnEcT`) was used for full parity testing. Its SHA-256 differs from the other snapshot; do not assume they are identical merely from identical row counts.
- The backup is **partial**: local media and database exports exist, but legacy Replit object-storage export failed at token exchange (HTTP 401). The backup contains production-sensitive data and must remain private.

## Development-snapshot database parity: PASS (NOT production parity)

Compared the selected source PostgreSQL custom-format dump locally on Mac against the current Railway PostgreSQL service using read-only queries and SHA-256 of sorted PostgreSQL `COPY` text rows. No database updates/restores were performed.

| Schema | Tables | Source rows | Railway rows | Count/row-content checksum |
| --- | ---: | ---: | ---: | --- |
| public | 110 | 31,705 | 31,705 | PASS |
| stripe | 29 | 69 | 69 | PASS |
| drizzle | 1 | 2 | 2 | PASS |
| **Total** | **140** | **31,776** | **31,776** | **140/140 PASS** |

- No missing tables, count mismatches, failed queries or table-content checksum mismatches were detected.
- The earlier apparent discrepancy in `customers` was an audit aggregation error: `public.customers` has 3 records on both sides, while `stripe.customers` contains another record. All public tables match.
- The large message history is in `public.chat_logs` (11,891 rows); `public.messages` has 17 rows and `public.sessions` has 16,491 rows on both source snapshot and Railway.
- **Limitation:** checksum parity establishes equivalence to the historical snapshot, not current Replit data as of 18 October.

## Configuration drift after snapshot: OPEN

Public read-only API comparisons on 18 October:

| Value | Legacy live Replit | Railway |
| --- | ---: | ---: |
| Starter plan `domainsLimit` | 2 | 1 |
| Platform `exchange_rate` | 17,688 | 18,089 |

The **Helium development** dump stores the Railway values (1 and 18,089). This divergence does NOT establish when a production setting changed: it may reflect independent development and production database state. Do not blindly patch one-off values until the published production database is identified and audited.

## Local media and object storage

- The source partial manifest has **1,168 local media files**, total **784,917,507 bytes**.
- The Cloudflare R2 migration manifest and local source manifest have the same canonical SHA-256:
  `4d1e38b96dea83a1f64338e4d64742cee4be674de4e05b77d89dbae4cf01b5f9`.
- Verified all **1,168/1,168 Railway volume files** against their SHA-256 hashes: **0 missing**, **0 mismatched**.
- Connected Railway application's S3 endpoint is **Cloudflare R2**. Bucket listing found **1,169 objects**, none with the `uploads/` prefix at audit time.
- Disposable Cloudflare R2 smoke test: S3 PUT succeeded, GET via `https://chatvice-production.up.railway.app/storage/uploads/...` returned HTTP 200 with exact byte match; DELETE and nonexistence read-back passed. Test object was removed.
- The source snapshot has 27 `chat_media` records with embedded `file_data` and no `storage_url`. It references 60 unique `/uploads/` paths and no `/storage/uploads/` paths in scanned public table data.
- HEAD tests of all 60 legacy media paths showed **26 valid files** on both hosts, and **34 HTML fallbacks** (not valid media) on both hosts, without source/target differences.
- **Limitation:** no complete listing/checksum inventory of the legacy Replit object-storage bucket exists because its export failed HTTP 401. The absence of referenced `/storage/uploads/` objects in this snapshot does not prove the source bucket contains no other historical objects or that no new objects were added since the snapshot.

## Railway health / domains

- Chatvice service and PostgreSQL service: online with no recent failed deployments or active issues during the check.
- Railway HTTP error-rate check (24 hours): 118 requests, 0 server-side 5xx, 2 client-side 4xx.
- `chatvice.app` and `www.chatvice.app` custom-domain ownership: **verified** after Cloudflare TXT additions.
- Routing CNAME remains pointed at old hosting; Railway certificate still reports ownership-validation state until routing/certificate setup is completed.
- Railway-required routing CNAME targets for future cutover:
  - `chatvice.app` -> `u1zxqg3a.up.railway.app`
  - `www.chatvice.app` -> `zgxfkc89.up.railway.app`
- **Do not change production DNS yet.** The legacy host stays online and remains the writer/background-worker owner until final synchronization and UAT succeed.

## Cutover gates still outstanding

1. **Fresh source backup** from the live Replit workspace after 13 October, plus a final delta/freeze strategy so subsequent user writes are not lost. The existing Replit export script is `script/export-replit-migration.mjs`; check prerequisites in the source workspace with `node script/export-replit-migration.mjs --check`. Do not post dumps or credentials to chat.
2. Inspect and securely export **the published production App Storage/bucket** objects or independently establish that none are required, including objects created after the snapshot; do not assume the development bucket is the production bucket.
3. Restore-test a fresh backup in an isolated database, compare tables and content checksums again, and reconcile changed configuration (Starter `domainsLimit`, exchange rate and any newly changed records).
4. Perform authenticated UAT for admin/member login, OAuth callbacks, dashboard, chat/AI agent responses, WebSocket/widget, persistent uploads, email, subscriptions, PayPal/12Pay sandbox and webhook signature handling. No live payment transactions during migration testing.
5. Prepare cutover rollback: drain or pause legacy writes, take final consistent backup, apply delta, verify HTTPS, switch DNS records, transfer webhook destinations and background-job ownership exactly once, then monitor and keep legacy available for rollback.

## Safety record

- No DNS traffic cutover, service deletion, database modification, source deployment modification, or worker ownership switch performed.
- One disposable R2 object was created/read/deleted and cleanup verified.
- This audit document is on a separate GitHub branch; it is not a Railway production deployment or a change to the running `feat/railway-migration-safety` branch.

## Verified offline restore recovery test (2026-10-18)

- Built PostgreSQL 18.6 in a temporary, private Mac directory and launched a Unix-socket-only throwaway cluster (no TCP listener).
- Restored the `chatvice-SNnEcT` development snapshot using `pg_restore --no-owner --no-privileges --exit-on-error --jobs=4`: **PASS**, 140 tables restored; 39 merchants and 11,891 chat logs verified; 0 unvalidated constraints.
- Initial post-restore text `COPY` SHA-256 check showed 136/140 matches. The remaining 4 Stripe tables contained timezone-sensitive text representations: Mac's PostgreSQL default session timezone was `Asia/Jakarta` while the dump used UTC. Repeating those four checks with `PGOPTIONS='-c timezone=UTC'` yielded **4/4 PASS**. No content differences remained after normalizing session timezone.
- The temporary PostgreSQL server was stopped; production Railway and Replit databases were untouched.
- This recovery test proves the development backup is restorable, **not** that it contains current live production data.
