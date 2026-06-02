---
name: Null-safety on 401 returnNull pattern
description: How 401 → returnNull causes null data bypassing = [] defaults, and which error boundary catches it
---

## The Rule
`queryClient.ts` has `on401: "returnNull"`. When any authenticated endpoint returns 401, TanStack Query sets `data = null`. This BYPASSES `= []` destructuring defaults (which only protect against `undefined`). Every array `.length` or `.map()` call on API data MUST use `?? []` or `|| []`.

**Why:** Session expiry causes ALL authenticated endpoints to return 401. With returnNull, every `const { data: x = [] }` quietly gets `x = null`, and any `x.length` call crashes React mid-render.

**How to apply:** Replace `data.length` with `(data ?? []).length` and `data.map(...)` with `(data ?? []).map(...)` for any query that hits an authenticated endpoint.

## Error Boundary Architecture
- `RootErrorBoundary` in `main.tsx` wraps the ENTIRE app (full-screen dark overlay, purple Reload button, ⚠️ emoji).
- `PageErrorBoundary` in `layout.tsx` wraps only the `<Switch>` (shows within the dashboard frame).
- Components OUTSIDE the Switch (AppSidebar, MerchantNotificationCenter, AIHelpBubble in the header/sidebar) are only caught by `RootErrorBoundary`.
- If those crash, the ENTIRE screen goes dark with "Something went wrong" — NOT just the page area.

## Confirmed null endpoints (session-bound, return 401 on expiry)
- `/api/billing/status` → billingStatus
- `/api/merchant/profile` → merchant (profile)
- `/api/agents` → agents
- `/api/merchant/addons` → merchantAddons
- `/api/merchant/notifications` → notifications (refetchInterval: 30000!)
- `/api/merchant/notifications/unread-count` → unreadData

## Confirmed safe (HTTP-cached, return 304)
- `/api/merchant/:id` (layout merchant query)
- `/api/sessions/:id`
- `/api/stats/:id`
- `/api/marketplace/boosters`
- `/api/marketplace/addons`
- `/api/subscription-plans`

## Fixes applied (in session)
All of the following were changed to use `?? []`:
- `agents` in overview.tsx (find call)
- `agents` in getting-started-checklist.tsx (length check)
- `merchantAddons` in app-sidebar.tsx (filter call)
- `merchantAddons` in marketplace-preview-section.tsx (find call)
- `plans` in usage-upsell-banner.tsx (length check)
- `notifications` in merchant-notification-center.tsx (length and map)
