# Mail workspace upgrade

Continues draft PR #19 on `feature/chatvice-mail-engine-20261026`. Deploy the frontend
and backend together; no schema migration or provider activation is required.

## User behavior

- Responsive dark workspace with folder navigation, mailbox selection, conversation
  reader, delivery labels and Customer 360. Long inboxes scroll within their panel.
- All / Unread / Starred filters run on the server before pagination. Read state is
  aggregated across messages in the current folder, so an older unread message is
  not hidden by a newer read reply. Stars use the same conversation aggregation.
- Folder badges count conversations, not individual messages. Paging loads 40
  conversations and requests one extra to determine whether another page exists.
- Search intentionally matches only the current page's decrypted previews. It is
  labeled "Search this page"; no claim of full mailbox/body search is made.
- Mark read/unread, star/unstar, archive, move to Trash and move to Inbox update
  messages in the conversation's **current folder**. Drafts elsewhere in that same
  conversation remain editable. Trash retains the content; nothing is deleted.
- Viewer mailboxes show read-only access. Compose, write actions and CRM conversion
  respect mailbox permissions; backend authorization is checked again on every write.
- Capabilities hide unavailable AI/attachment tools and disable sending when outbound
  is not configured. Optional AI still requires explicit per-action consent.
- Compose uses a focus-trapped dialog with labeled inputs. Unsaved edits are guarded
  on close, mailbox switch and browser unload. `N` opens compose and `/` focuses
  search when outside an input/dialog. A saved draft is edited in place, with its ID
  retained if queuing fails. Sending creates/saves a draft before atomic queueing;
  "queued" is not presented as delivered.
- Reader requests are canceled when switching conversation/mailbox. Synthetic browser
  tests deliberately delay a response to verify that it does not repopulate another
  mailbox's reader. Email markup is displayed as plain text.
- Compose supports To/CC/BCC, and can save a draft before To is filled. Queueing
  still requires a valid To recipient and an enabled provider. Clearing recipient
  fields updates the saved draft rather than silently retaining hidden addresses.
- Reply All deduplicates addresses, excludes the current mailbox and its aliases,
  and never adds BCC recipients. Normal Reply addresses only the sender.
- Complete draft recipients are loaded from the writer-only draft editor API.
  Thread reading continues to omit BCC, including for read-only mailbox members.

## API additions

- `GET /api/mail/capabilities`: admin/outbound/AI/attachment booleans only.
- `GET /api/mail/mailboxes`: adds `can_write`, retaining the existing array contract.
- `GET /api/mail/mailboxes/:id/stats`: membership-checked folder conversation counts.
- `GET /api/mail/threads`: adds `filter=all|unread|starred` and `message_count`;
  existing limit/offset defaults remain compatible. Ordering includes stable ID ties.
- `PATCH /api/mail/threads/:id`: requires `mailboxId` and `sourceFolder`, plus
  `isRead`, `isStarred` and/or `folder`. Mutations require an allowed Origin and live
  enabled mailbox with owner/member access. Draft folder moves are rejected.
- `GET /api/mail/drafts/:id`: writer-only, enabled-mailbox, tenant-scoped draft data
  including To/CC/BCC and decrypted subject/body. It refuses queued/sent messages.
- Mailbox listing adds only that mailbox's aliases for correct Reply All exclusion.

## Validation

- Commit `4bdd6b37558d54d9c5e2da8ab4879cf431465559`, CI run `40380578473`:
  56 tests passed (33 security/unit/QA-auth, 19 PostgreSQL integration, two QA
  bootstrap and two isolated-schema tests). Main Chatvice, standalone QA and
  independent-login Mail builds passed.
- Repository TypeScript check retains 280 existing diagnostics; the Mail-specific
  diagnostic gate passed.
- A real Docker image passed bootstrap, first-party browser login/session,
  protected UI/assets, anonymous denial, encrypted CC/BCC draft storage and
  disabled-outbound checks. Its runtime excludes source assets, runs as a
  non-root user and measured 257,869,295 bytes (about 246 MiB).
- `node scripts/mail-workspace-smoke.mjs` tests the actual compiled React bundle
  with synthetic API fixtures: navigation, filters, pagination, local search,
  archive/restore, star/read, recipient-free draft save/edit, CC/BCC persistence,
  Reply All, queue retry without duplication, unsaved-close protection, disabled
  sending, mobile overflow, stale response isolation, viewer access and safe text.
  Set `CHATVICE_MAIL_BROWSER_PATH` for an existing Chrome executable or install
  Playwright Chromium. Optional `CHATVICE_MAIL_SMOKE_OUTPUT` writes synthetic previews.
- Added disposable PostgreSQL integration cases for aggregation/pagination, action
  scope, draft preservation, tenant/viewer/disabled-mailbox denial and capabilities.
  CI runs these against its own PostgreSQL and saves browser previews for review.

The browser fixtures do not prove live delivery or attachment infrastructure. Real
provider/domain verification, signed inbound/outbound/reply tests, historical import,
restore rehearsal and production rollout retain their separate gates in
`CHATVICE_MAIL_PRODUCTION_GATES.md`. This upgrade does not complete those gates.
