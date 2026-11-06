# Chatvice merchant UX audit — 2026-11-06

## Scope and evidence

Reviewed all 36 declared dashboard routes, signup, profile setup and agent selection. Dashboard routes were rendered using the real React components in an isolated browser preview with synthetic read-only API fixtures. Settings was visually checked in light/dark desktop and a 390px mobile iframe; signup in desktop/mobile. Route rendering covers navigation and empty states, not every populated business workflow or every action in every tab.

The connected production Chrome browser timed out during this session. These preview checks do **not** constitute a signed-in production merchant transaction audit. No real signup email, withdrawal, checkout, integration connection, or customer message was submitted. Provider configuration and keys were not changed.

## Implemented

- Merchant-only styling: solid rounded cards, no neutral card/section borders, pill tabs/sidebar/selectors, solid dialogs, responsive tab scrolling, visible keyboard focus. Admin, Mail and widget pages outside the merchant shell retain their styles.
- Desktop form width limits for Settings, Profile, Welcome Bubble, Proactive Chat and Widget; eliminate double outer padding; readable mobile email/change layout.
- Signup requires four account fields. Business category/team size are optional and collapsed. Frontend and backend share the same validation schema; password requirements and email verification remain intact. Field-level duplicate email/username feedback and proper password labels/autocomplete.
- Profile wizard retains existing backend-required steps, saves existing progress, prefills widget display name from company name when blank and suggests domain from website URL without replacing a saved domain.
- New-agent API response is parsed before selecting the new agent. Current selection is visible and agent cards support keyboard activation.
- Deduplicate/validate saved menu configuration, avoid duplicate addon links, match active routes by segment, and expose the active page for assistive technology.
- Unknown routes show a useful fallback. Page errors reset when navigating elsewhere. Merchant-load failures offer retry instead of rendering an undefined workspace.
- Tutorials and the floating Guide no longer cover the dashboard automatically; explicit tutorial/help controls remain available.
- Help Articles opens the correct Knowledge tab. Missing Custom Data Source breadcrumb labels added.
- Analytics removes hardcoded +12%, +5%, −0.3s and +2% trends, sample response/duration fallbacks, and 95%/65% bars. Missing durations show N/A. The top-level CSAT card was misleading because the API currently supplies resolution rate in that field; it is replaced with actual Active Sessions. Calculating a true CSAT from explicit customer ratings remains follow-up work.

## Route inventory

Every row received source/routing review and isolated fixture render checks. Shared surface and selector styles apply to every route.

| Route | Notes |
|---|---|
| `/dashboard` | Tutorial/Guide no longer opens over the workspace automatically; explicit help remains. |
| `/dashboard/profile` | Business details retained; desktop form constrained to 72rem. |
| `/dashboard/affiliate` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/agents` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/sources` | Existing standalone compatibility page; also accessible within Knowledge. |
| `/dashboard/analytics` | Removed fixed weekly trends, sample durations and arbitrary progress percentages; Active Sessions replaces misleading CSAT proxy. |
| `/dashboard/sessions` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/chat-logs` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/user-data` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/knowledge` | Supports ?tab=articles and ?tab=sources. |
| `/dashboard/triggers` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/widget` | Configuration and preview retain two columns on wide desktops; page capped at 72rem. |
| `/dashboard/supervisors` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/integrations` | Coming Soon integrations remain visibly disabled. |
| `/dashboard/custom-data-source/integration-checklist` | Missing-configuration state and breadcrumb checked. |
| `/dashboard/custom-data-source` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/work-scheduler` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/quick-replies` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/welcome-bubble` | Desktop form constrained to 72rem; duplicate outer padding removed. |
| `/dashboard/product-cards` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/team-activity` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/chat-buttons` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/live-preview` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/checkout` | Unavailable payment methods remain disabled; no payment was executed. |
| `/dashboard/plans` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/billing` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/settings` | Account tab distinguished from Business Profile; compact fields and responsive email action. |
| `/dashboard/chat-monitoring` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/data-usage` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/proactive-chat` | Form cards capped at 48rem. |
| `/dashboard/leads` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/additional-services` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/marketplace/:productId` | Missing-product state checked with a synthetic ID, not a paid product purchase. |
| `/dashboard/marketplace` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/appointments` | Shared UI applied; route/empty-state render checked. |
| `/dashboard/help-articles` | Redirect now opens Knowledge → Articles, not Training. |

## Remaining UX recommendations

1. Reduce the post-verification setup to **Business + first agent → test a chat**. Move contact enrichment and domain entry to a persistent checklist, with domain verification required when deploying the widget. This needs an explicit backend onboarding-contract change; current required fields are preserved in this release.
2. Consolidate company/photo editing into Business Profile; keep Settings focused on account, notifications, security and domain. Shared data currently appears in both places. This release clarifies the Account tab but preserves working controls.
3. Group primary navigation into **Inbox, AI & Knowledge, Widget, Reports, Business**. Keep advanced modules behind an expandable group and retain admin-controlled visibility and role permissions. Do not remove existing operational features just to shorten the menu.
4. Sources and Help Articles are already embedded in Knowledge. Preserve legacy links as compatibility routes. `notification-settings.tsx` is an unmounted duplicate implementation; Settings → Notifications is the active UI. Consolidate the source in a separate cleanup to avoid divergent settings behavior.
5. Implement true customer satisfaction metrics before displaying CSAT. Several external integrations and payment methods are explicitly Coming Soon; this UI audit does not activate them.

## Validation

- 37 Vitest tests pass: 7 merchant onboarding/navigation regressions plus the 30 existing provider/top-up tests.
- 4 post-cutover Node security tests pass.
- Production client/server build passes.
- TypeScript reports 280 existing diagnostics, with no new diagnostics compared with the baseline captured before the final edits. This is not a clean repository-wide typecheck.
- Browser preview: all 36 dashboard routes, unknown-route fallback, desktop light/dark settings, desktop/mobile signup and mobile settings. Synthetic fixtures were corrected to match API response shapes before confirming the three initially failing preview pages (Analytics, integration checklist, Additional Services).
- Preview artifacts and data fixtures are not included in the production bundle.
