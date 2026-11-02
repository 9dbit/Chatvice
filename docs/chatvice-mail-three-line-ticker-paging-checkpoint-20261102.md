# Chatvice Mail UI checkpoint: three-line list, footer pagination and two-tap notifications
Date: 2026-11-02

## Requested UI changes
- Email list: row 1 sender and right-aligned timestamp; row 2 subject and independently actionable star at right; row 3 a one-line plain-text message preview.
- Reduce vertical padding and row gaps between emails. Keep large circular sender avatars and horizontal overflow protection.
- Move orange floating Compose (+) inside the mail-list panel and raise above the footer; keep a separate mobile reader Compose button when the list is hidden so users can compose from a conversation.
- Move pagination out of the thread-list panel into the activity footer, aligned on the same horizontal baseline as the running ticker. Preserve page formats `1 >`, `1 2 >`, `< 3 >` and higher.
- Ticker: first tap pauses scrolling and reveals a compact private notification preview (up to 10 unread/reminder/draft items). Second tap on the same running text closes the preview and resumes. Notification items remain actionable, the existing Activity drawer is still available, and reduce-motion preference is respected.
- Phone layout: ticker left-aligned, paging on right, compact bell action; no overlap with compose, scrolling messages, or pagination.

## Implementation
- `client/src/pages/dashboard/mail.tsx`: split subject and snippet into dedicated lines; move Compose into the thread list; preserve a mobile-reader compose; pass the pager to MailActivity.
- `client/src/pages/dashboard/mail-activity.tsx`: accessible tap target, paused state, preview panel and pager slot in the footer; keep existing counts and activity drawer.
- `client/src/pages/dashboard/mail-compact.css`: compact row layout, reader-safe Compose, shared footer alignment, notification preview, mobile and reduced-motion rules.
- `scripts/mail-workspace-smoke.mjs`: verify row order, tight spacing, Compose position, aligned pagination, first/second ticker tap and mobile responsiveness.
- `scripts/mail-retro-smoke.mjs`: validate ticker items, preview/resume and footer pager without affecting upload/draft tests.

## Acceptance gates
1. GitHub Mail CI PASS for 30/30 steps, including browser, security, database isolation, and container tests.
2. Independent Chatvice-Mail-Delivery-Staging service builds exact commit, reports SUCCESS and connects to its database.
3. Only once both gates pass, pin Chatvice-Mail production to that commit. No database schema/DNS/mail provider changes.
4. Verify production commit, container health, database connection, pending changes, and HTTP 5xx.
5. Browser QA uses synthetic mail; real-user workflow may require separate final verification.

## Baseline and destinations
Production baseline commit: `748a0d292a600ce3697a21d8f7726b2db1b2612c`
Repo: https://github.com/9dbit/Chatvice
Production: https://mail.chatvice.app/dashboard/mail
