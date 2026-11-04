# Independent mailbox onboarding

Creating a mailbox with `accountMode: standalone` atomically creates a mailbox,
one restricted login, one member assignment, a delivery check, and a one-time
24-hour activation link. The owner chooses a 16–256 character password. Only
the token hash is stored. Activated accounts cannot be reset by invitation
rotation, even if subsequently disabled.

The legacy create request remains available for shared mailboxes. Existing
credentials, memberships, messages, aliases, attachment limits, and exact
Cloudflare routing rules are preserved.

## Readiness and transport

The background worker sends a signed-secret probe through Resend to the new
canonical address. Provider acceptance alone does not mean Ready. The returning
probe must reach the correct mailbox, and its account must be activated. The
dashboard reports pending, checking, awaiting activation, ready, or an actionable
failure. Duplicate requests return a conflict rather than creating another account.

`workers/mail-router/worker.mjs` is a Cloudflare Email Worker for the domain
catch-all. Exact rules retain precedence. The router checks the actual SMTP
recipient against enabled, verified, managed mailboxes and their same-tenant
aliases. Unknown addresses are rejected. It forwards to one verified Resend
transport address with an HMAC-authenticated envelope; the backend routes only
to that SMTP recipient, regardless of forged To/CC/BCC headers.

During an app outage the Worker forwards into Resend's durable receiving store;
webhook failures are retried by Resend. The existing ingestion, threading,
encrypted storage, scanning, deduplication, and attachment pipeline are reused.

The application attachment setting remains **40 MB**. Cloudflare's current
inbound transport limit is **25 MiB for the complete message**. No MX cutover or
increase to that external limit is included in this change.

## Configuration and release gate

Mail app variables:

| Variable | Value |
| --- | --- |
| `CHATVICE_MAIL_ONBOARDING_ENABLED` | `true` only after router deployment is ready |
| `CHATVICE_MAIL_ROUTER_DOMAINS` | `chatvice.app` |
| `CHATVICE_MAIL_ROUTER_FORWARD_TO` | `mail-router@qa-mail-staging.chatvice.app` |
| `CHATVICE_MAIL_ROUTER_SECRET` | Fresh 32-byte random secret encoded as 64 hex characters |

The Worker uses the same router secret as a **secret binding**. Public Worker
configuration lives in `workers/mail-router/wrangler.jsonc`. Never commit a
token, password, activation URL, or router secret. A deployment token is needed
only to install/update the Worker, not to create each subsequent mailbox.

Release sequence:

1. Run the disposable database suite and app build.
2. Deploy the Mail app with onboarding disabled. Its pre-deploy script applies
   the additive sixth migration only to the exact isolated Mail schema history.
3. Deploy the Worker using a token restricted to `chatvice-mail-router`, and set
   its secret binding plus the matching Mail app environment variable.
4. Preserve the exact `master`, `hello`, and `64cor` rules. Connect the catch-all
   to the new Worker; do not change the domain's MX records.
5. Enable onboarding, create a clearly named pilot account, activate it, and
   verify login isolation, external inbound, outbound, reply, and an attachment.
6. Confirm the dashboard reports Ready only after the returning probe and
   activation. Then complete the release report.

If setup fails, keep existing mailbox rules unchanged. Disable new onboarding
while investigating. Preserve queued messages and the additive schema; do not
drop onboarding tables or roll the schema installer back to an older manifest.
After new accounts are in use, plan their inbound continuity before disabling
the catch-all or rolling back the router.

## Validation checkpoint — 2026-11-05 (Indonesia)

Engine commit: `6dfc823d361427817fb56aa869c3963bd35fe8dd`.
PR: https://github.com/9dbit/Chatvice/pull/26

45 checks passed: 3 Worker transport tests, 6 schema migration tests, 7 onboarding
integration tests, and 29 existing Mail integration tests. This includes
concurrent duplicate creation, tenant and mailbox isolation, expired/replayed
activation, origin protection, invitation rotation, disabled-account protection,
forged routing headers, outage handling, encrypted attachments and the existing
40 MB attachment policy. The isolated app build passed. Full repository typecheck
still has pre-existing diagnostics outside the changed files; changed Mail files
had no diagnostics in the targeted review.

Railway test deployment: `d9a656e4-c1ad-40ad-b021-0ea3dfb4cc74`, SUCCESS, with
`CHATVICE_MAIL_ONBOARDING_DATABASE_TESTS_PASSED`. The test service uses a disposable
loopback PostgreSQL instance, no production database URL, no credentials, no
public domain, and restart policy NEVER.

Production onboarding is **not yet enabled or verified** at this checkpoint.
The Resend transport address is verified in Cloudflare. The Worker shell exists;
the actual router code still requires deployment authorization. Wrangler on the
authorized SPARK device is not authenticated. No live Mail app source, schema,
existing password, exact-address rule, or catch-all rule has been changed.
