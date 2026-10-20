# Chatvice Replit Production snapshot vs Railway audit — 18 October 2026

**Status: Production data parity FAIL; production cutover is BLOCKED.**

This document records read-only database comparisons and an isolated recovery test. It contains **only aggregates and metadata**, no credentials, customer IDs, media objects, chat contents, personal data, raw connection strings, or database records. The source was a **Replit Production PostgreSQL connection string selected by the operator**, but its provenance has **not yet been independently attested** against the published Replit deployment settings.

## Critical correction to prior migration baseline

The 13 October transfer archive came from Replit **Helium development**. Its 140-table content parity with Railway proves Railway mirrors that *development* snapshot, **not** the live published production dataset.

A new source PostgreSQL dump was obtained on 18 October from the connection string the operator copied as **Production**. The download was created and stored solely on the operator's Mac with a mode-`0600` file; no URI was supplied to chat, GitHub, or Railway.

- Dump byte length: **109,180,474**.
- Private manifest byte count and SHA-256: **both verified against actual dump**.
- Valid custom `PGDMP` header and `pg_restore --list`: **PASS**.
- `pg_restore` toc data table sections: **141**.
- Isolated offline PostgreSQL restore with `--exit-on-error --no-owner --no-privileges --jobs=4`: **PASS**.
- Local restore produced 141 tables and expected counts (59 merchants, 26,674 sessions, 20,602 chat logs, 40 agents, 36 messages, 91 stored files).
- Isolated restore database was Unix-socket only, with no TCP listener, and was shut down after testing.

## Fresh source snapshot vs actual current Railway

Read-only Railway queries were refreshed after the production backup.

| Schema | Replit operator-selected Production snapshot | Railway |
| --- | ---: | ---: |
| `public` | 52,862 | 31,705 |
| `stripe` | 69 | 69 |
| `drizzle` | 2 | 2 |
| Replit internal `_system` | 2 | absent |
| **All schemas** | **52,935** | **31,776** |

- **Net delta: 21,159 more records in the new source snapshot** (including 2 records in Replit's internal `_system` schema; application `public` delta is 21,157).
- All **140 Railway table names** are present in the new source; the source adds one **Replit-only internal table**: `_system.replit_database_migrations_v1`. Do not blindly migrate Replit service-managed internal metadata.
- **30 shared application tables differ in row count**.
- `information_schema.columns` inspection: **2,165 application columns on each side, with 0 missing columns and 0 differences in PostgreSQL type or nullability** (across `public`, `stripe`, and `drizzle`). This does not by itself verify indexes, constraints, extensions, routines, or triggers.

| Critical table | Source snapshot | Railway | Net missing from Railway |
| --- | ---: | ---: | ---: |
| `public.merchants` | 59 | 39 | +20 |
| `public.agents` | 40 | 29 | +11 |
| `public.sessions` | 26,674 | 16,491 | +10,183 |
| `public.chat_logs` | 20,602 | 11,891 | +8,711 |
| `public.messages` | 36 | 17 | +19 |
| `public.stored_files` | 91 | 56 | +35 |
| `public.knowledge_entries` | 91 | 39 | +52 |
| `public.knowledge_chunks` | 738 | 286 | +452 |
| `public.payment_transactions` | 49 | 48 | +1 |
| `public.session` | 973 | 0 | +973 |

## Primary ID overlap: data loss risk if naively replacing either side

Compared exact `id::text` identifier sets in 13 critical `public` tables. Individual identifiers were handled on the authorized Mac only and were **not logged**.

- Merchants: 39 ID matches, **20 source-only, 0 Railway-only**.
- Agents: 29 matches, **11 source-only, 0 Railway-only**.
- Sessions: 16,491 matches, **10,183 source-only, 0 Railway-only**.
- Chat logs: **11,888 common IDs**, **8,714 source-only IDs**, **3 Railway-only IDs**. Therefore direct replacement of Railway with the source snapshot could discard 3 Railway-unique chat logs.
- Messages: 17 common, 19 source-only, 0 Railway-only.
- Stored files: 56 common, 35 source-only, 0 Railway-only.
- Knowledge entries: 39 common, 52 source-only, 0 Railway-only.
- Payment transactions: 48 common, 1 source-only, 0 Railway-only.
- Platform settings: all 35 IDs shared; no count delta.
- The 3 Railway-only chat logs require an ownership/FK/content reconciliation plan before migration.

## Same-ID row-content comparison: drift also exists

For the 13 tables, compared read-only PostgreSQL `md5(to_jsonb(row)::text)` digests with both database sessions set to UTC. The hashes and IDs were compared locally, and only counts were reported. MD5 here is a content-difference diagnostic, **not a cryptographic authentication guarantee**.

| Table | Shared IDs, differing record content |
| --- | ---: |
| Merchants | 1 |
| Sessions | 3 |
| Knowledge entries | 2 |
| Platform settings | 6 |
| Other nine audited tables | 0 |

Source configuration and content updates are therefore not entirely captured by a delta-insert-only migration. Reconcile settings, selected existing rows, source-only rows and three Railway-only chat logs separately.

## Required migration gates, in order

1. **Prove source provenance:** confirm the operator-supplied URI corresponds to Replit's **published Production database**, not Helium; do so in Replit Database → Production settings without sharing credentials.
2. **Immutable backups:** retain this fresh source backup privately; take an independent full **Railway current database backup** before any write/restore.
3. **Production storage parity:** inventory Replit **published production object storage** and compare it to Cloudflare R2; the previously verified 1,168 media files came from the Helium development backup, not proof of Production completeness. `stored_files` has 35 more source records.
4. **Reconciliation design:** retain the 3 Railway-only chat logs and their relationships, decide authoritative values for 6 settings and other drifted rows, preserve identity/auth/payment history and all referential constraints.
5. **Isolated staging restore and UAT:** apply a protected copy of current Production backup to a separate non-public environment, test login/OAuth, AI agent, chat history, files, dashboard, subscriptions, sandbox payments/webhook signatures, background worker ownership, and data integrity.
6. **Final delta/freeze:** current source may continue to accept writes after the backup. Define maintenance/write freeze or independently validated change capture; take a final consistent snapshot and verify counts/content and media again before switching DNS.
7. **Cutover with rollback:** only when gates pass, archive the target state, migrate data, verify health/TLS, switch DNS, transfer worker/webhook ownership once, monitor carefully, and preserve the old hosting for rollback.

**This audit made NO writes to either the published Replit Production database or Railway PostgreSQL. There was NO DNS cutover, deployment, payment operation, or background-worker switch.** Local temporary PostgreSQL was started and stopped only for isolated restore/read-only inspections.

See also `docs/chatvice-migration-parity-audit-2026-10-18.md` for the earlier *development baseline* audit. Draft PR #3 adds an exporter safeguard against accidentally treating Helium as Production.


## Railway backup and local staging merge rehearsal

Status on 18 October 2026: **MERGE REHEARSAL PASS; LIVE CUTOVER STILL BLOCKED.**

### Independent backups and recovery

- Operator-selected Replit Production snapshot: 109,180,474 bytes, SHA-256 verified, 141 database tables and isolated PostgreSQL restore PASS.
- Independent Railway Production snapshot via encrypted SSH tunnel (no public TCP proxy): 86,425,709 bytes, SHA-256 verified, 140 table data sections, archive list PASS. Tunnel closed.
- Both backups are stored privately on the authorized Mac. Neither file, credentials, nor customer content was published to GitHub.
- Railway backup was restored to a new local database using a private Unix-socket-only PostgreSQL cluster. No live database changes.

### Insert-only merge simulation

Imported the Production source snapshot into an isolated clone of Railway with PostgreSQL ON CONFLICT DO NOTHING, a single transaction, and pre/post union checks of primary keys for all 140 application tables. No existing Railway record was overwritten.

| Check | Result |
| --- | ---: |
| Source app records | 52,933 |
| Railway baseline records | 31,776 |
| Expected union / staged result | 53,522 / 53,522 |
| Railway-only IDs preserved | 589 |
| Source or Railway IDs missing | 0 |
| Unexpected IDs created | 0 |
| Merged chat logs | 20,605 |
| Foreign keys unvalidated | 0 |
| Live database writes | 0 |

589 Railway-only records: 546 custom_data_health_pings, 31 merchant_notifications, 9 knowledge_chunks, and 3 chat_logs.

### Content conflicts and optional field-level policy rehearsal

After insert-only merge, 24 shared-primary-key rows differed from the published Production snapshot, across eight tables:
- 6 custom_data_sources (health check times, latency, error, timestamp);
- 6 platform_settings (6 timestamp differences, 4 value differences);
- 3 sessions (last_activity);
- 3 unknown_domain_attempts (attempt_count and last_seen_at);
- 2 crawled_links (content, sync status/time);
- 2 knowledge_entries (content);
- 1 knowledge (content);
- 1 merchants (last_login_ip).

Four platform setting values with real drift: exchange_rate, exchange_rate_updated, guide_knowledge_last_refreshed and subscription_plans_custom. Two other settings differ only in timestamps.

A **second independent offline database clone** tested a candidate policy: Replit Production values for platform configuration and knowledge content; latest timestamps for transient activity and health; preserve all Railway-only records; defer merchant login IP. Results: **21 rows updated**, **3 differences remaining** (2 Railway session activity times intentionally retained because newer, 1 security-sensitive merchant login IP intentionally deferred). Total rows still 53,522, chat logs still 20,605, foreign-key validation remains PASS.

**This candidate policy has NOT been approved for live use.** Staging tests do not constitute permission to overwrite Production data.

### File/media storage clarification

- All 91 Production stored_files rows contain their file content embedded directly in PostgreSQL: aggregate 101,937,792 bytes. All 91 records are in staging, including the 35 missing from the prior Helium Development snapshot.
- All 27 chat_media rows have embedded file_data with no storage_url.
- All 50 media_attachments URLs are relative paths under /uploads/; their physical files still require source-vs-target parity checks.
- The former 1,168 local media files match the Development backup and Railway volume, but **this does not establish complete published Production App Storage parity**.
- The Replit read-only Agent did not produce a verifiable object inventory. Production App Storage reconciliation remains a cutover blocker.

### Production-origin public API corroboration

The newly acquired source snapshot matches the live public chatvice.app API for exchange_rate (17,688) and Starter domainsLimit (2). This supports the Production provenance claim but does not replace a final consistent backup immediately before cutover.

### Outstanding gates

1. Inventory Production Replit App Storage and reconcile object bytes/checksums with Cloudflare R2 and physical /uploads/ files.
2. Review and approve business-data conflict policy, preserving security metadata and all 589 Railway-only records.
3. Authenticate UAT on staging: login/OAuth, merchants, agents, chat/widget, file URLs, webhooks and sandbox payments.
4. Define final write freeze or validated change capture; take and verify a fresh source snapshot and rerun reconciliation.
5. Preserve Railway backup, verify rollback, and only then consider cutover of DNS/worker/webhook ownership.

**No production database, application, DNS, object storage or worker ownership was changed during these offline tests.**
