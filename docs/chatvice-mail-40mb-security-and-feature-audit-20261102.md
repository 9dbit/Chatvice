# Chatvice Mail 40 MB checkpoint — 2026-11-02

## Implementation
- Combined **40,000,000 decoded bytes** across attachment files per outbound email. No fixed eight-file outbound cap.
- Shared policy now distinguishes 40 MB product upload quota from 25 MB conservative native MIME allowance and Resend's 40 MB post-encoding ceiling.
- Attachments over native MIME threshold are delivered as individual, seven-day signed HTTPS download links, encrypted in private storage at rest. Signed links require valid exact expiry, authenticated object scope, an approved scan and a message that has been marked sent.
- The 16 MiB / eight-file inbound safety policy stays unchanged.
- Browser upload and PostgreSQL concurrent budget tests changed to 40 MB; private object-storage synthetic test changed to 40 MB, scanner and storage timeouts increased.
- NO credentials or production DNS were changed. This is code-review work; not live deployment or real delivery acceptance.

## Release blockers / QA
1. Confirm CI green for the 40 MB branch; test both provider-native and oversized private-link scenarios and verify no user mail actually sent.
2. Validate 40 MB upload in real staging under scanner and S3/R2 timeouts, including storage quotas, memory usage and fail-closed scanning.
3. Test signed URL expiration, revocation after quarantine/deletion, tenant separation and replay under 7-day expiry. Anyone holding the link can download it, so a recipient-bound OTP download mode is advisable for confidential documents.
4. Ensure HTML/tap-to-download UX, message warnings and delivery-mode indicators clearly tell users when files are shared as links rather than native MIME attachments.
5. Confirm the existing staged Railway service change is reconciled before any deployment. Do not deploy the general Chatvice main app by mistake.
6. Verify outbound and receiving mail with controlled QA addresses, delivery, reply, attachment hashes and historical migration after existing release gates.

## Next product improvements (prioritized)
P0: outbound queue reconciliation, health dashboards, DNS/MX/SPF/DKIM/DMARC checks, transactional backups+restore, abuse protection, reliable upload and cleanup.
P1: global search, labels, advanced filters, unsubscribe/spam controls, send scheduling, undo send, signatures, contacts and calendar, notification/PWA offline support.
P2: domain-email hub workspaces, cross-domain unified inbox, customer 360 and shared team assignment, AI follow-up to tasks/CRM, invoice/receipt extraction (consented), configurable sharing with expiry/access logs and recipients.
Do not market the above as market-exclusive without a competitor-by-competitor verified matrix. Major competitors already offer cloud file links, aliases and various AI/mail workflow features.

## Review
PR #20: https://github.com/9dbit/Chatvice/pull/20
PR #21: https://github.com/9dbit/Chatvice/pull/21
