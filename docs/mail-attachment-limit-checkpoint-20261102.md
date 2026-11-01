# Attachment sending allowance — 2 November 2026

## Behavior

Outgoing messages now accept 25 MB (25,000,000 decoded bytes) of attachments in total. There is no eight-file sending cap. Compose/reply show the number of files and the consumed size budget in decimal MB. Empty files and batches over the budget are rejected before upload; a loaded over-budget draft cannot be sent from the UI.

The shared policy is applied by the browser, the transactionally locked upload quota, the draft send endpoint, the outbox and the provider adapter. The provider adapter also checks conservative MIME/Base64 overhead and the serialized request against Resend's 40 MB message ceiling. Private storage and scanning support a 25 MB file. The upload burst allowance is 120 files/minute per authenticated user, separate from message size, with Retry-After on throttling.

Mailbox quotas, authentication, tenant isolation, security scanning and blocked-file handling remain enforced. Receiving keeps its separate existing limits. No database migration, credential rotation or configuration changes are needed.

## Validation

- Local provider and attachment security suite: 16 passed, including exact 25 MB encrypted storage/transport, 20 outgoing files, malformed Base64, and rejection at one byte over budget.
- Local TypeScript check and isolated application build passed.
- Browser contract passed using synthetic data: 16 files accepted, the exact 25 MB budget accepted, one extra byte rejected without an upload, draft/reply continuity, previews and 320–2560px responsive layouts.
- Added PostgreSQL coverage for concurrent uploads at the boundary, sending 22 clean files, and rejection of an oversized imported draft. The existing CI pipeline runs this and the complete application/container checks on the release commit.
- No real email was sent during testing.

## Sources and release

- Gmail's personal attachment allowance: https://support.google.com/mail/answer/6584
- Resend's encoded message ceiling: https://resend.com/docs/dashboard/emails/attachments

Source is prepared on the existing redesign branch and PR. A screenshot generated from the supplied image is an illustration only, not deployment evidence. Do not describe this change as live until the release is deployed and verified.
