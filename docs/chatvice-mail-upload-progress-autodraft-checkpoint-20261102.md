# Chatvice Mail checkpoint | 2026-11-02 | Upload progress + automatic Drafts

## Scope

1. Files, photos and video upload through same-origin XHR to the existing, authenticated `/api/mail/messages/:id/attachments` endpoint. Uploading bytes are measured with XMLHttpRequest upload progress rather than a fabricated timer.
2. Composer's attachment panel displays animated orange progress and a numeric percentage for a multi-file batch. It identifies the current file and distinguishes browser transfer from server malware scan/encrypted persistence. It only shows 100% after the server acknowledges and the attachment list refresh succeeds.
3. The Compose close (X and Escape) no longer discards edits: it waits for a successful `POST /api/mail/compose` or `PATCH /api/mail/drafts/:id` before dismissing. Previously saved draft IDs and uploaded attachments remain linked to the same message. The UI shows a global `Message saved to Drafts.` notice.
4. If draft persistence fails (including invalid input or network loss), Compose stays open, the original text stays editable and the user sees an error to retry. Closing during an active upload is disabled so in-flight files cannot disappear.
5. A failed later file upload refreshes any earlier successfully uploaded files, so a partially successful batch is still visible and recoverable from Drafts.

## Quality and verification

- Browser tests: `scripts/mail-workspace-smoke.mjs`, `scripts/mail-glass-smoke.mjs`, `scripts/mail-retro-smoke.mjs`.
- Verify X and Escape close, draft content/reply CC/BCC retention, new and existing drafts, an intentional draft-save failure that leaves Compose open, a slow live progress bar below 100%, partial files and a 40 MB upload; ensure attachment previews remain safe.
- Existing provider and database security suites must stay green. All tests use synthetic fixtures and no real mail is sent.
- Stage deployment to Chatvice-Mail-Delivery-Staging, confirm build/health, then release to `mail.chatvice.app` only after CI and staging validation.
- Production remains on the previously approved 40 MB commit until explicit deployment validation is complete.

## Links

PR #22: https://github.com/9dbit/Chatvice/pull/22
Production baseline: `0dc6d77fca23d1c60c48d0db98f817da1a8b6bc2`
