# Chatvice x Company Command Center: Integration Architecture Review and Approval Plan

**Status:** DESIGN REVIEW / NOT APPROVED FOR FUNCTIONAL IMPLEMENTATION  
**Date:** 2026-10-19  
**Chatvice base:** 9dbit/Chatvice, feat/railway-migration-safety  
**Command Center:** Company Command Center Railway project, staging  
**Scope already authorized in this branch:** dashboard vendor card only (disabled, no network access).  
**Production activation:** PROHIBITED until separate Owner approval and verified cutover.

## 1. Objective and boundaries

Allow Chatvice agents owned by explicitly approved merchants to appear in Company Command Center > Customer Service > Agent Directory > Outsource · Chatvice, including identity, permitted assignment metadata, enabled state, source supervisor, safe avatar, and eventually verified activity. Keep Chatvice as **source of truth and sole engine executor**.

Command Center must never implicitly gain access to private conversations, AI prompts, knowledge files, customer contact information, payment operations, agent edits, or message sending.

Do not change Chatvice's AI/chat routing, chatbot prompting, round-robin assignment, takeover, subscriptions, payment webhooks, storage, login/OAuth, or background workers for Phase 1.

## 2. Verified baseline and architecture findings

Inspected source code on base branch, local offline copy of previously verified Replit Production snapshot, live Railway service configurations, deployed directory sidecar source, and deployed Command Center Python consumer.

| Subject | Verified | Implication |
| --- | --- | --- |
| Core engine | Node/TypeScript, Express, Drizzle/PostgreSQL; POST /api/chat/ask invokes askChatvice | Keep integration outside message execution path in Phase 1 |
| AI routing | getNextAgentId selects enabled agents; existing sessions hold agent ID; new sessions may use round-robin | Enabled, assigned, currently handling, and connected are different |
| Human takeover | HUMAN session mode stops automatic AI replies and hands control to supervisors | Handling telemetry must distinguish AI work from supervisor work |
| Agent schema | agents.id, merchant_id, agent_type, name, description, photo_url, is_active, supervisor_id, created_at; no agent.updated_at | Deterministic revision from allowlisted fields, not nonexistent updated_at |
| Assignments | agents.supervisor_id, agent_supervisors, merchants.active_agent_id; work_shifts and shift_assignments | One agent can have multiple assignments; no duplicate external IDs |
| Merchant auth | /api/agents is merchant-session-authenticated but returns full Agent object, including system_prompt / knowledge data | NEVER proxy /api/agents or serialize full agent rows to CC |
| Photo endpoint | /api/agent-photo/:agentId is public, CORS *, and may redirect to stored URLs | New integration needs distinct tenant-bound photo projection |
| Background tasks | ENABLE_BACKGROUND_JOBS controls worker activation; Railway defaults off | No new background jobs in Phase 1 |
| Sidecar | live public Railway service, GET /api/integrations/command-center/v1/assigned-agents, Bearer + workspace header, hard max 200 | Preserve v1 contract while migrating from sidecar to native endpoint |
| Sidecar actual state | /healthz shows configured=false; roster GET returns 503 NOT_CONFIGURED | Deployment SUCCESS does not mean authenticated sync works |
| Sidecar least privilege design | Requires tenant-specific ccc_directory_* read-only schema and rejects privileged DB roles | Native API should not inherit privileged direct DB access patterns |
| Command Center consumer | Python cs_directory.py, chatvice_pairing.py; Owner-approved merchant pairing and manual sync | Existing v1 consumer and Owner governance MUST remain unchanged |
| Consumer current activity | state unknown, verified false; no functional telemetry | Do not invent idle/handling/connected indicators |
| Consumer image field | photo_data_uri validated and used; v1 rejects incomplete pagination | Maintain exact field in v1, additive schema extensions only |
| Railway traffic | Chatvice staging and production online, source DNS cutover still not confirmed | Complete separate migration/change window before activating this integration |

The above are observations at review time, not promises of current live merchant data.

### Historical Production snapshot, aggregate-only (NOT current-live counters)

From the isolated production backup: 59 merchants, 40 agents (all enabled), 11 supervisors, 9 agent-supervisor mapping rows for 6 distinct agents, 3 multi-supervisor agents, 39 merchants with active_agent_id, 10 shift assignments (4 with agent-like assignee types), and 26,674 sessions, of which 26,534 refer to agents. Eight sessions had AI mode and active status, but **that does not prove eight agents currently handling requests**.

Zero cross-merchant mapping mismatches were found among existing agent_supervisors rows in that historical snapshot. Counts must be refreshed under approved merchant scope before launch.

### Critical assignment semantic mismatch

The engine may route a session to **any enabled merchant agent**, even when it has no supervisor and is not primary. The existing sidecar, by contrast, filters agents to those with supervisor mapping OR merchant primary assignment; shift-only assignments are not included in that existing query. The consumer currently accepts only complete **assigned** rosters, not arbitrary registered agents. Decide scope and visibility explicitly before any integration endpoint is created.

**Recommended definitions (subject to Owner approval):**

1. Merchant ownership: agents.merchant_id matches the approved merchant.
2. Enabled: agents.is_active is true. Disabled agents may remain in approved directory metadata but are not considered route-eligible.
3. Explicitly assigned: a same-merchant supervisor mapping, merchant active_agent_id, or validated active shift assignment (if Owner approves shift-only semantics).
4. Operational eligibility: actual engine routing state, separately derived from enabled/role. No engine routing changes.
5. Handling: positive verified server-side processing signal for the specific agent, never session count or time elapsed.
6. Connection health: separate authentication and verified sync outcome, never badge based only on deployment state.

Before approval select whether disabled/unassigned appear in a **separate management/diagnostic view** (preferred) or are excluded from active CC roster to preserve v1 compatibility.

## 3. Architecture: native integration as a sidecar-to-core migration

                  Chatvice merchant session (admin only)
                                  |
                    Settings > Integrations
                                  |
                 opt-in consent and scoped key grant
                                  |
             Chatvice native integration API (isolated router)
                                  |
                 allowlist DTO + merchant scoping
                                  |
                   Chatvice PostgreSQL (READ ONLY)
                                  |
                 canonical complete v1 snapshot
                                  |
           HTTPS Bearer + workspace scope + replay controls
                                  |
              Company Command Center Python consumer
                                  |
               Owner-approved roster, separate SQLite
                                  |
                 CS / Outsource · Chatvice display

The existing sidecar stays available but **unconfigured** until the migration's security gate. The native endpoint will be preferred after it passes an authenticated contract comparison. No Command Center worker execution or write access is introduced.

**Network caveat:** Chatvice and Company Command Center are different Railway projects. Do not assume Railway private DNS reaches across projects; verify private networking restrictions. If direct private routing is unavailable, use tightly scoped HTTPS with token-bound merchant identity, TLS, request limits, audit logs, and optional gateway restrictions. Never expose PostgreSQL.

## 4. Vendor card scope: authorized now

Dashboard > Integrations, category Operations:
- Company Command Center
- Description: read-only Customer Service agent directory for approved merchants
- Badge: Coming Soon
- Connect action disabled

**Implementation restricted to UI catalog only.** No database schema, API calls, tokens, backend, CC changes, migrations, payment flow, DNS, deployment, or feature activation in this request. Branch will remain PR draft pending review.

Future merchant settings page (not built now): authorized merchant, scopes, consent timestamp, key status, expiry, last successful/failed sync, access audit, rotate/revoke actions. Do not show raw token after initial one-time issue.

## 5. Versioned read-only API contract

Preferred additive module: server/integrations/command-center/ (router + auth + projection + tests). Avoid modification of large server/routes.ts and askChatvice for Phase 1 except a single guarded router mount after auth ordering review.

GET /api/integrations/command-center/v1/assigned-agents

Required scope intersection: the token's merchant_id equals the Owner-approved Command Center workspace ID and the requested workspace scope. Server must take merchant identity from validated grant, never an untrusted query parameter.

v1 required response:
- schema_version: "1", provider: "chatvice", external_workspace_id;
- snapshot_complete: true (ONLY when all eligible agents fit and reads are transactionally consistent);
- snapshot_id: SHA-256 of canonical sorted, allowlisted roster and assignments (exclude snapshot_at and non-deterministic data);
- snapshot_at: ISO-8601 from read-only transaction;
- next_cursor: null;
- agents array: external_agent_id, name, description, photo_data_uri, source_agent_type, source_enabled, source_supervisor_id, assignment_state, assignments, source_revision.

**Do not break the existing consumer**: the current v1 consumer specifically expects photo_data_uri, assignments target_type in supervisor/merchant_primary/shift, max agents, complete snapshot and null cursor. A new photo_url can be added but cannot replace photo_data_uri in v1. Full pagination requires separately negotiated v2; v1 must fail closed on >200 agents, never truncate with snapshot_complete=true. Keep ID stable and deduplicate across assignments.

Required projections (positive allowlist only):
- Include agent ID, merchant scope, approved display name/description, agent type, enabled flag, allowed supervisor IDs, approved shifts/channels, approved avatar reference/thumbnail.
- Exclude systemPrompt, knowledgeContent, customer records, session messages, contact info, account secrets, private payment information and arbitrary URL metadata.

Suggested responses: 200 snapshot; 401 absent/invalid credential; 403 cross-tenant/scope revoked; 409 incomplete/invalid roster; 429 rate limited; 503 verified source unavailable. Cache-Control: no-store; limit request size and response bytes; structured minimal audit.

## 6. Security and consent design

Proposed additive tables after approval:
- integration_connections (merchant_id, vendor, scopes, consent status/revision, created_at, revoked_at);
- integration_api_keys (connection_id, token_digest, issued_at, expires_at, rotated_at/revoked_at, last_four);
- integration_access_audit (connection_id, merchant_id, request_id, route, outcome, timestamp; no customer data);
- later only: integration_outbox, integration_delivery_attempts and integration_agent_activity.

Initial scopes: agents:read, assignments:read, agent_status:read. No customer:read, prompts:read, messages:send, finance:* or agents:write.

Security controls:
- Only authenticated merchant **admin** can grant/rotate/revoke; Owner approves destination merchant in Command Center independently.
- Bind a token to exactly one merchant and one named audience, with a proposed 90-day maximum lifetime (confirm policy), secure random entropy, one-time reveal, server-side hashed storage, TLS, rate limiting and immediate revocation checks.
- Never send master admin keys, merchant password, API master key or a DB URI to CC.
- Verify same-merchant ownership for each agent, supervisor, shift and photo. No implicit privileges via the leader mapping.
- Requests and errors must never log tokens, full Agent rows, customer messages or private images.
- Feature flag OFF by default; explicit merchant allowlist; all old Chatvice routes remain operational.

## 7. Activity telemetry: distinct gated phase, NOT engine rewrite

Only after directory and consent have passed acceptance tests.

Read-only status vocabulary:
- enabled/disabled: static config;
- connected/disconnected/degraded: verified integration authentication plus latest completed sync and health;
- idle: explicit event-based idle/finish when valid, else unknown;
- handling: server-emitted processing start event for assigned agent and request; must expire without heartbeat;
- escalating: actual transition to HUMAN or documented escalation;
- reporting: actual report-task event, if instrumentable; otherwise unsupported;
- error: verified workflow failure only.

Initial consumer should continue rendering activity = unknown, verified = false.

Suggested implementation path:
1. Identify server-side AI response start/finish/error boundaries, session ownership, HUMAN takeover, and supervisor escalation. Do not derive activity from stored chats alone.
2. Provide a tiny guarded, best-effort event emitter at verified boundaries. No customer content or token prompts; do not block AI responses on telemetry.
3. Write a bounded, append-only outbox; delivery worker runs separately with explicit singleton setting. Avoid duplicate delivery across Railway replicas.
4. Event envelope: unique event_id, merchant_id, agent_id, state, occurred_at, expires_at, schema_version, source=chatvice, verified=true. No content/contacts/payment.
5. CC consumes signed webhook with HMAC timestamp and nonce/idempotency, and periodic snapshot fallback; out-of-order events must not overwrite newer state.
6. Expired or missing telemetry becomes UNKNOWN, not Idle/Handling; revocation hides roster immediately.

**No telemetry or webhook work in the UI-only vendor-card PR.**

## 8. Media/avatar policy

The existing anonymous /api/agent-photo/:agentId supports broadly permissive CORS and URLs. Do not treat that endpoint as a privileged integration endpoint.

For v1, provide a bounded, verified 64 KB maximum inline JPEG/PNG/WebP thumbnail in photo_data_uri after source media validation, ideally 128x128 or 256x256 resized server-side. Reject arbitrary remote URL fetching and unsupported MIME types, dimensions, decompression bombs, and cross-merchant access. For missing/unsafe photos return null and render a default avatar. Never expose storage credentials.

## 9. Contract compatibility matrix

| Field or behavior | Current sidecar v1 | Current Command Center consumer | Native v1 requirement |
| --- | --- | --- | --- |
| Endpoint | /api/integrations/command-center/v1/assigned-agents | Same path | Preserve path |
| Merchant scope | Hard-bound workspace + token | CCC_CHATVICE_WORKSPACE_ID + Owner consent | Merchant-bound grant + same explicit workspace |
| Auth | Bearer + workspace header | Sends both | Maintain both; token revocation |
| Max agents | 200; fails over limit | Max validated; snapshot must be complete | <=200, never silent truncation |
| Agent ID | Source agent.id | chatvice:<workspace>:<agent> | Stable and unchanged |
| Assignment | supervisor / merchant_primary | supervisor / merchant_primary / shift | Retain existing and add vetted shift assignment only with approval |
| Photo | photo_data_uri or null | Validates safe data URI | Preserve photo_data_uri |
| Snapshot | SHA canonical sorted roster | Requires SHA-256 lowercase hex and complete snapshot | Deterministic SHA-256 |
| Activity | None | unknown/unverified | Keep unknown in Phase 1 |
| Revocation | Sidecar token missing/not-configured | Owner disconnect hides roster | Revoke token immediately and hide connected status |
| Connection | Currently NOT_CONFIGURED (HTTP 503) | Unconfigured until Owner + env | Never falsely display connected |

## 10. Execution phases, approvals, and acceptance gates

| Gate | Change scope | Proposed test/acceptance | Requires approval |
| --- | --- | --- | --- |
| 0. Protect migration | Finish Chatvice source-to-Railway DNS/data cutover and establish clean stable baseline | Chatvice uptime, chat, login, payment webhook and media smoke green | Migration release owner |
| A. Contract freeze | Approved merchant IDs, assignment policy, v1 JSON schema, ID/photo rules, token policy | Signed contract matrix and threat model; no code changed | Owner |
| B. Read-only native API | New router/DTO, additive consent/key/audit tables; flag OFF | Synthetic 2-merchant separation, correct 401/403/409/429, no PII, no writes | Owner after security review |
| C. Integration settings UI | Merchant admin consent/revoke/rotate, safe thumbnails | UI accessibility, disabled/unassigned states, photo access and revocation tests | Owner |
| D. Staging consumer sync | CC pairing under approved merchant, authenticated complete snapshot | Same roster/IDs/assignments as source, correct lifecycle, rollback sidecar | Owner |
| E. Verified telemetry | Event outbox, idempotent webhooks, activity TTL and fallback | No extra messages, no engine performance regression, expiry -> unknown | Separate Owner approval |
| F. Production limited rollout | Feature flag per approved merchant only | 24-48h observation, dashboards, latency/error budget, cutover+rollback drill | **Explicit final approval** |

Vendor UI catalog card in this PR is NOT any gate's production approval.

Suggested acceptance targets (proposed, not measured): GET roster p95 < 500ms for <=200 agents within warm staging; no cross-merchant leaks across 100+ synthetic negative cases; no customer outbound messages induced by directory calls; zero unauthorized DB writes; exact roster convergence after revocation/multi-supervisor changes; 100% idempotent replay of identical webhook IDs.

Run regression suites:
- Chatvice merchant login and OAuth;
- agent CRUD and supervisor assignment;
- AI/HUMAN chat handoff, existing session continuity and round-robin unchanged;
- merchant billing/subscriptions and webhook validation;
- existing local file/R2 storage and agent photo rendering;
- synthetic read-only API tenant isolation;
- CC roster import, version pinning, failure recovery and snapshot rollback.

## 11. Deployment and rollback

Work in separate PRs for Chatvice backend, Chatvice UI, and Command Center consumer. Never force-push or merge to the production migration branch without review. Only additive database migrations, with dry-run/restore and backup. Stage with synthetic records and no live customer conversation fixtures.

On any integration problem: immediately flip vendor feature flag OFF, revoke integration key, suspend webhook worker, preserve Chatvice chat workers unchanged, mark CC connector degraded/unknown and keep historical audit. Roll back consumer to sidecar if v1 contract is at risk. Never restore whole Chatvice DB to roll back a directory-only feature.

Rollout is NOT authorized by approving this document alone; explicit Gate F approval is required.

## 12. Open decisions for Owner sign-off

1. Which specific merchant/workspace IDs may Command Center read? Do not infer from email, URL, or existing multi-tenant records.
2. Should roster include only explicitly assigned agents (recommended for active CC roster), or all merchant-owned agents with an unassigned diagnostics section? Define treatment of shift-only assignments and disabled agents.
3. Confirm CSL-001 is a coordination label in Command Center only, never an automatic Chatvice supervisor replacement.
4. Confirm initial token expiry/rotation policy (proposal: 90 days) and whether external public HTTPS is acceptable if cross-project private networking is unavailable.
5. Confirm separate approval gates for backend read-only sync and later telemetry/webhooks.

## 13. Current progress accounting

- Completed: engine/schema/sidecar/consumer read-only audit and draft architecture; isolated vendor catalog card in feature branch.
- Not completed: production migration closure, formal approved merchant scope, auth grants, native endpoint, settings page, active consumer sync, telemetry, webhooks, synthetic end-to-end UAT, production rollout.
- **Functional integration completion: 0%.** Vendor-card UI implementation is separate, staged in source control, not deployed.
- **No release, migration, production database write, DNS change or customer message triggered by this proposal.**
