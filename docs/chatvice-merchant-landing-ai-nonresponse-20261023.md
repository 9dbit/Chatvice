# Merchant landing widget: AI non-response audit (23 October 2026)

This patch addresses the **silent failure UI**, not a provider billing bypass.

## Direct observations

- Railway Production service and Postgres healthy, 0 HTTP 5xx across 5,753 requests in 24h.
- Direct authorized synthetic `POST /api/demo/ask` returned HTTP 200 with a generated GPT-4.1-mini answer in ~2.29 seconds. The shared OpenAI provider key is working for landing demo at test time.
- **Merchant widget** `POST /api/chat/ask` had zero production requests in the last 24h and two 403 responses on 2026-10-21 at 10:41:07Z and 10:41:49Z. Express logs confirm the 403 was returned by the application, not only the edge proxy.
- The `/api/chat/ask` route returns 403 when a merchant trial is expired, subscription term is expired, or subscription inactive. HTTP access logs do not reveal the tenant ID or exact rejection body, so affected merchant subscription state is **not directly proven**.
- The widget's previous `onError` handler only checked error.message for `CONVERSATION_LIMIT_REACHED` and displayed no error for 403/network errors; `apiRequest` stores the HTTP response code on `error.code`. Existing HUMAN-mode sessions intentionally generate empty AI responses and did not show a clear handoff notice.

## Change

- Customer-facing, sanitized failure notices for merchant subscription gate, rate limiting, network failure and unknown HTTP errors.
- Prefer structured `error.code` and `error.limit` to fragile JSON substring regex.
- Explain empty HUMAN-mode responses once per session without reactivating AI or bypassing authorized human takeover.
- Pure regression tests cover 6 cases; compile/bundle build passed from clean Mac SPARK worktree.

## Release gate

1. Verify affected merchant's *own authenticated* dashboard Billing / Subscription: `subscriptionStatus`, trial end, `currentPeriodEnd` and effective conversations used/limit. Do not modify paid entitlements without owner approval.
2. Validate external merchant widget on isolated staging (401/403/429/network, HUMAN handoff and AI happy path) and ensure the merchant domain is allowlisted.
3. Check `POST /api/chat/ask` end-to-end with a controlled consented test merchant; avoid creating production chat records for random customers.
4. Deploy after reviewed staging results and confirm Railway status SUCCESS plus the same flows on public HTTPS.
5. The underlying OpenAI provider billing quota is not fully audited without the OpenAI usage dashboard; however the test demonstrates it is not **globally exhausted** at the time of the demo call.

Never rotate provider keys, alter subscription entitlements, enable background jobs, touch payments, or change DNS as part of this PR.
