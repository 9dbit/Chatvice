# Chatvice Mail — desktop navigation and motion

Desktop now shows the main menu in the leftmost column. Expand/collapse preserves an accessible 64 px icon rail and remembers the preference locally. Mobile keeps the compact right drawer. The header brand opens the landing page.

Landing assets and inbox decorations use bounded pointer/scroll parallax, with requestAnimationFrame coalescing, no perpetual animation loop, and reduced-motion/hidden-tab handling. Message content and controls remain stable.

The desktop-only ticker shows unread previews, unread/spam/draft counts and subscription reminders. Pause/hover/focus controls and the Activity drawer preserve access without relying on moving text. Mobile does not poll ticker activity unless the drawer is open.

Validation covers frontend typechecking, production and QA builds, existing mailbox/dialog/attachment browser contracts, desktop sidebar placement and persisted collapse, workspace-selector focus, responsive breakpoints from 320 to 2560 px, ticker visibility/pause, reduced-motion parallax and actual logo navigation. Fixtures contain only synthetic messages and files. No database, password or storage-policy changes are required.
