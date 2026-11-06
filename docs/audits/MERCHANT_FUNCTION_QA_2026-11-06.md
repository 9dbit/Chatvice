# Merchant functional QA — 6 November 2026

Base: production commit `184eaac` (Knowledge Base responsive grid).

## Verified findings and fixes

- Billing had two authenticated simulation endpoints which activated subscriptions without gateway verification. Retired both with HTTP 410, removed the associated Billing/Checkout controls, and retired the unauthenticated legacy 12Pay diagnostic route behind admin authentication. Real checkout, webhook and manual administrator confirmation paths are unchanged.
- Work Scheduler updated/deleted shifts and reports by ID without merchant ownership checks. Routes now validate ownership, reject immutable/unknown fields, validate assignee ownership and type, and validate time/timezone/date inputs. Sequential duplicate assignments return 409. This is not a database-level concurrent uniqueness guarantee.
- Knowledge entry creation and unlinking did not validate the target agent's merchant. Routes now validate target ownership and entry inputs; partial content/name updates refresh the chat fallback, and `skipEmbeddings` skips only indexing rather than the fallback update.
- Billing status ignored merchant-specific custom plan limits and treated `annual` as monthly. It now respects custom limits (including zero and unlimited), recognizes annual/yearly periods, and clamps month-end/leap-year boundaries.
- Custom Data Source could test the old saved endpoint while unsaved changes were visible. Testing now requires saving first. Loading/request failures are visible, and a failed test clears an old success result.
- Knowledge cards now group status separately from equally sized Share/Clarity/Delete controls, move View larger beside Save, and use a dedicated collapse button so toolbar actions never collapse the editor. Desktop retains three responsive columns and the tall editor.
- Scheduler errors now appear in toasts, and removing a shift refreshes assignments. Affiliate amounts accept cents in the UI and require a positive safe integer in cents at the API.

## Validation

- 60 targeted Vitest tests pass across HTTP handlers, tenant boundaries, Knowledge Base save/share/deactivate behavior, custom plan/period handling, Custom Data Source UI feedback, and existing source/plan tests.
- Client/server production build passes.
- Added regression tests to the existing CI workflow.
- Production health was read successfully: `status: ok`, `database: connected` before deployment.

## Limits of verification

HTTP handler tests use isolated storage fixtures and mocked embedding processing. They prove route behavior, not a fresh production AI response or real database persistence. No live payment, withdrawal, supervisor invitation, source configuration, or credential change was performed. The connected local-browser tool was unavailable in this turn. Authenticated production QA remains outstanding. Custom connector requests to a real merchant endpoint and payouts remain untested. Existing repository-wide TypeScript diagnostics are not claimed resolved.
