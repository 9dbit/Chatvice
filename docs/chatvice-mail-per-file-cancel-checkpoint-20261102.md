# Chatvice Mail | checkpoint 2026-11-02 | Per-file upload progress & cancel

## Requested behavior
- Replace the single aggregate upload progress bar with one transfer row for each selected image, video or document.
- Every queued or actively uploading/scanning attachment has its own filename, type icon, per-file byte-derived percentage, status and an **X Cancel upload** button.
- Cancellation acts on only that file: queued items never POST, active XHRs are aborted. Remaining attachments continue and successfully saved files remain in the draft.
- The Mail composer X/Escape autosave flow from the prior release remains unchanged. Closing the composer stays disabled while the current file queue is being processed, avoiding silent work loss.
- After accepted upload, progress reaches 100% and the existing private thumbnail/preview tile is shown. Failed/cancelled rows have a dismiss action; confirmed saved files can be removed via the existing secure Delete endpoint.
- Preserve the 40 MB combined per-email file budget.

## Implementation
- `client/src/pages/dashboard/mail-attachments.tsx`: stable per-file identities, queue and progress state, individual browser XHR abort, per-file cancellation and completion/error statuses, exact-ID best-effort delete when cancellation races with success.
- `server/mail/attachments.ts`: detect client transport closure during malware scan/put/DB transaction and compensate stored data with scoped deletion before returning, preventing orphan attachments.
- `server/mail/scanner.ts`: optional AbortSignal closes ClamAV stream on cancel rather than waiting for timeout.
- `server/mail/object-store.ts`: optional AbortSignal interrupts encrypted private object PUT; aborted PUT attempts get best-effort cleanup.
- `client/src/mail-retro.css`: per-row orange progress animations and X controls, responsive and reduced-motion compatible.
- `scripts/mail-retro-smoke.mjs`: synthetic Playwright checks for cancelling an active upload, skipping a queued upload and keeping a third upload, plus multi-file progress and the 40 MB boundary.
- `server/mail/attachment-security.test.ts`: scanner-abort security test.

## Release gates
1. Full GitHub Actions Mail CI must pass, including Playwright desktop/mobile and disposable PostgreSQL; no messages to actual recipients.
2. Isolated Railway `Chatvice-Mail-Delivery-Staging` deployment must be SUCCESS and database connected.
3. Production `mail.chatvice.app` remains pinned to its prior working version until gates are green.
4. Confirm production source commit, logs, health and absence of HTTP 5xx after deployment.
5. Maintain privacy/noindex, signed sharing limits and user upload rate caps.
