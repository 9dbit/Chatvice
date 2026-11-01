# Chatvice Mail — inbox space revision

## Implemented

- Header Menu opens a right sidebar with workspace selection, folders, appearance, settings, activity/reminders and sign-out.
- Compose moves to the status row immediately below the header, including conversation-update feedback.
- All, unread and starred filters share one row with refresh and search. Search expands down, supports `/` and Escape, and shows an active-filter indicator when closed.
- Header shrinks on list/reader scroll and expands at the top. Folder/mailbox/page transitions reset scroll appropriately.
- Standard controls are 10% smaller. Desktop uses two content columns; mobile preserves list/reader navigation and safe-area padding.
- Bottom running text is removed. Reminder/draft activity remains in the menu and polls only while open and visible.

## Validation

Mail frontend typecheck and production/QA builds pass. Four browser suites cover 320–2560 px, right-edge drawer placement and focus restoration, header shrinking/expansion, filter/search navigation, mailbox switching, permissions, compose/reply, attachments, reminders and sign-out. Tests use synthetic messages and files; no real mail is sent.

No database migration, variable, password or storage-policy changes are needed for this UI revision. Publish only after CI succeeds, then verify the exact deployment and public health routes.
