---
name: TanStack Query null-vs-undefined destructuring trap
description: The = [] default in useQuery destructuring does NOT protect against null data — only undefined. On401 returnNull returns null, bypassing array defaults.
---

## The Rule
`const { data: X = [] } = useQuery(...)` — the `= []` default applies only when `data` is `undefined`. When the global queryFn returns `null` (for 401 responses, on401: "returnNull"), `data = null`, and `X = null` (not `[]`).

**Why:** JavaScript destructuring defaults trigger on `undefined` only, not `null`. The global queryClient in this project uses `on401: "returnNull"`, so any query that gets a 401 response produces `null` data, silently bypassing the `= []` default.

**How to apply:** Everywhere array data from useQuery is used with array methods (.find, .filter, .map, .length), protect against null even when there's a destructuring default:
```js
// WRONG — = [] does NOT protect against null
const { data: items = [] } = useQuery(...)
items.length  // crashes if 401 returned null

// CORRECT — ?? [] also handles null
const { data: items = [] } = useQuery(...)
(items ?? []).length  // safe
```

Key fixed files: app-sidebar.tsx, overview.tsx, getting-started-checklist.tsx, usage-upsell-banner.tsx, marketplace-preview-section.tsx
