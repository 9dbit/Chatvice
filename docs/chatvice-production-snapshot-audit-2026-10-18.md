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
