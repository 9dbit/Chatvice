# Gate A | Chatvice → Company Command Center

**State:** TECHNICAL CONTRACT READY FOR REVIEW, NOT OWNER-APPROVED  
**Prepared:** 2026-10-19 (Jakarta)  
**Deployment authority:** NONE. No read-only API, token, DB grant, automatic sync, webhook or engine changes are authorized by this document.  
**Dependency:** Finish independent Chatvice Replit → Railway cutover, verify production payment/login/AI/media, close migration rollback window.

## Decision record

| Decision | Proposed binding rule | Approval state |
| --- | --- | --- |
| Authority | Chatvice owns AI runtime, customer conversations, model configuration, supervisors and payments. Command Center is a read-only observer of approved metadata | Proposed |
| Merchant scope | Owner first explicitly approves one Chatvice merchant/workspace ID in Command Center; authenticated Chatvice merchant admin independently authorizes that ID. Both grants must match exactly | Awaiting specific merchant ID |
| Directory visibility | v1 ACTIVE roster includes only *explicitly assigned* agents for the approved merchant, with an assignment from primary merchant ID or same-merchant supervisor links | Proposed |
| Unassigned / inactive | Never label as connected/handling. Exclude from v1 active roster; any diagnostics must be an additional separate, permissioned UI, not silent expansion of v1 | Proposed |
| Shift-only assignments | Existing sidecar does not include shift-only roster members. Do not add them without source schema validation and separate v2 contract/approval | Proposed |
| Leader | CSL-001 is Command Center organizational coordinator only. Does not become a Chatvice supervisor or acquire message access | Proposed |
| V1 transport | GET /api/integrations/command-center/v1/assigned-agents over HTTPS, Bearer token + X-Command-Center-Workspace, strict request authentication, no-store | Proposed |
| Key policy | Merchant-scoped service credential, SHA-256/HMAC-acceptable server-side digest only, created by merchant admin, revocable immediately, expires in ≤90 days subject to security approval | Proposed |
| Photo | Use verified bounded PNG/JPEG/WebP thumbnail as `photo_data_uri`, otherwise null. Never arbitrary private photo URL or remote fetch | Proposed |
| Sync | Owner-triggered manual, only after complete source snapshot passes v1 validator; rejected snapshots cannot replace prior valid roster | Proposed |
| Telemetry | Phase E later, NOT part of Gate A/B/C; all agent activity displayed UNKNOWN/UNVERIFIED until real event evidence | Proposed |
| Initial vendor card | Operations > Company Command Center, Coming Soon (disabled), never claim connected | Already on Draft PR #4; not released |

## Required invariants

1. A tenant A key cannot enumerate, modify, infer, or distinguish tenant B data. Unknown IDs fail closed with 403 or 404, no detailed cross-tenant error.
2. No AI execution, supervisor takeover, message creation, file upload, payment, knowledge retrieval or database mutation in v1 directory reads. Critical engine paths remain untouched.
3. At most 200 agents per complete v1 snapshot. If count exceeds bound, respond 409/503 and mark `snapshot_complete` false or omit payload, **never truncate while declaring complete**.
4. Native API uses positive allowlist rather than serializing Agent object returned by /api/agents, which contains model prompts and knowledge.
5. All agent-supervisor/merchant_primary relationships are same merchant. Deduplicate `external_agent_id` while retaining multiple `assignments`.
6. `enabled`, `assigned`, `routeEligible`, `handling`, `syncHealthy` are distinct. No default green status based only on is_active or current session count.
7. Consumer activation requires independent owner approval of merchant scope and positive credential/revocation tests.

## Existing deployed contract

- **Sidecar:** isolated Railway service `chatvice-agent-directory`; source is a 119-line Node HTTP server. It requires a specialized read-only tenant-bound `ccc_directory_<12hex>` schema, explicit merchant ID and bearer token. GET roster currently returns `503 NOT_CONFIGURED`, /healthz returns `configured:false`.
- **Command Center:** deployed Python `orgweb/cs_directory.py` accepts **exact** `assigned-agents.v1` and requires `schema_version=1`, `provider=chatvice`, approved workspace, SHA-256 snapshot ID, complete snapshot, null cursor and validated identities, assignments and safe `photo_data_uri`. Owner pairing and manual sync is in `orgweb/chatvice_pairing.py`.
- Neither deployed application presently has verified end-to-end authenticated sync; service health alone is not proof of integration.
- Do not copy or recreate a privileged database user in Command Center.

## Canonical response v1 (synthetic demonstration ONLY)

```json
{
  "schema_version": "1",
  "provider": "chatvice",
  "external_workspace_id": "merchant-synthetic-001",
  "snapshot_id": "f28d8484fa4a8ee5d459fae2b83a1bd590e1d98bd03f83c976f624292055e83a",
  "snapshot_at": "2026-10-19T00:00:00.000Z",
  "snapshot_complete": true,
  "next_cursor": null,
  "agents": [
    {
      "external_agent_id": "agent-synthetic-001",
      "name": "Example CS Agent",
      "description": "Customer support",
      "photo_data_uri": null,
      "source_agent_type": "support",
      "source_enabled": true,
      "source_supervisor_id": "supervisor-synthetic-001",
      "assignment_state": "assigned",
      "assignments": [
        {"target_type": "supervisor", "target_id": "supervisor-synthetic-001"}
      ],
      "source_revision": null
    }
  ]
}
```

**Note:** `snapshot_id` above is an illustrative format, not an assertion of the SHA-256 for this sample data. In production it must be SHA-256 of deterministic canonical data, excluding timestamp and volatile metadata. Do not use the example as a golden checksum.

## Security implementation contract (Phase B, after approval)

- Authenticated merchant admin initiates integration grant. Validate current merchant_id against the allowed merchant, Owner pairing, and internal approved merchant list.
- Generate a 256-bit or stronger cryptographically secure random token with one-time reveal and max 90-day expiry. Store digest; never put bearer in browser localStorage, URL, logs or webhook payload.
- Require `Authorization: Bearer <token>` and exact `X-Command-Center-Workspace: <approvedMerchantId>`, both checked server-side, constant-time digest check. A requested `merchant_id` query parameter never overrides grant scope.
- Read queries must use one `REPEATABLE READ READ ONLY` transaction against source-owned tables with explicit `WHERE merchant_id = granted_merchant_id` restrictions, size and timeout caps.
- Data minimization: ID, display name, allowed short description, type, enabled, approved assignment references, sanitized bounded avatar. Explicitly disallow `systemPrompt`, private KB, messages, customer details, financial details and unrestricted URLs.
- Exact v1 response contract; compare native implementation with sidecar and Python validator. Do not alter consumer to excuse source violations.
- Fail closed on source outage, invalid mapping, oversized roster, absent Owner approval, expired token, revoked token, snapshot mismatch or non-standard MIME.
- Deny credentials any scope of chat:write, finance:*, prompts:read, customer:read, agents:write.
- Audit aggregate access outcome with redacted request ID, merchant ID and status; no chat content.

## Threat-model acceptance tests

| Attack / failure | Expected behavior |
| --- | --- |
| No bearer / wrong bearer / expired token | 401; zero roster data |
| Merchant A token + merchant B workspace header | 403; zero roster data |
| Agent/supervisor ID from another merchant inserted in source test fixture | Fail closed; zero leaked foreign data |
| Repeated multi-supervisor mapping | One agent entry, multiple deduplicated assignments |
| 201+ eligible agents | Rejected as incomplete, no silently truncated snapshot |
| Outdated / partially retrieved snapshot | Command Center preserves last verified roster, marks DEGRADED |
| Owner disconnects pairing | Immediately removes visibility; credential revocation follows |
| Revoked merchant key but unchanged UI cache | Server denies all requests immediately; UI never claims Connected |
| Invalid data URI, huge photo, remote photo URL | Null safe avatar with no external network fetch |
| Activity absent, stale or unknown | UNKNOWN/UNVERIFIED, never Handling |
| Malformed/too many requests | 400 or 429 with bounded response; no role escalation |
| Source schema or PostgreSQL connection unavailable | 503, no call into AI/chat engine |

## Gate A acceptance

The Owner must explicitly select/approve:
- exact source Chatvice `merchant_id` or whitelist of merchant IDs with separately auditable grants;
- whether shift-only and disabled/unassigned agents should be future diagnostic-only (recommended) and how multi-supervisor assignment is represented;
- CSL-001 coordinator-only mapping;
- key expiration/rotation cadence and public HTTPS fallback policy;
- which integrations can ever proceed to Phase E telemetry (none by default).

After approvals are recorded, the Gate A artifact is frozen with schema JSON + tests. *Only then* may a separate Gate B draft PR implement native API, still feature flagged OFF. Gate C/B must not merge to production while migration release gates are unresolved.

## Evidence / regressions to keep immutable

- Base Chatvice `server/routes.ts`: `getNextAgentId`, `askChatvice`, /api/agents CRUD, agent/supervisor mappings, HUMAN takeover, /api/agent-photo/:agentId.
- `shared/schema.ts`: `agents`, `agent_supervisors`, `merchants`, `sessions`, `shift_assignments`.
- Existing sidecar `/app/server.js` and consumer `/app/orgweb/cs_directory.py`.
- Offline snapshot 2026-10-18: 59 merchants, 40 enabled agents, 9 mapping rows, 3 agents with multiple supervisor links; aggregate historical, not live.
- PR #4: UI card + review documents only; do not deploy until separately approved.
