# Chatvice Cloudflare subdomains and email cutover

**Audit date:** 2026-10-20. This branch introduces non-mutating tools only. The existing apex `chatvice.app` and `www` remain on Cloudflare DNS → Railway Production. Do not alter apex, Postgres, Replit frozen database or payment gateways.

## What is confirmed

- `chat.chatvice.app` has a dedicated customer app router inside the existing Chatvice React application. Backend can be accessed via `https://chatvice-production.up.railway.app` and responds to `/api/health`.
- Railway's existing service cannot accept another custom domain under the current plan. A Cloudflare Worker Custom Domain or orange-clouded Route can front the Railway origin without another Railway hostname.
- `pay.chatvice.app` and `blaster.chatvice.app` currently map to legacy Replit, but no dedicated hostname router was found in the migrated React application. **Do not automatically enable those hostnames** until checkout, status, redirects, callbacks and merchant account behavior have been mapped.
- `web.chatvice.app` is a *separate* Replit app. Its source/build and data flows must be exported and validated for Cloudflare Pages/Workers (or an independently deployed Railway service) before DNS is changed. A proxy pointing to the same `web.chatvice.app` hostname would loop.
- MX is currently `mx1.hostinger.com` / `mx2.hostinger.com`, SPF authorizes Hostinger mail, and Hostinger DKIM CNAMEs are present. Domain DNS is already on Cloudflare.

## Edge proxy preparation

`wrangler.example.jsonc` is a template only; it deliberately contains `"routes": []`. It cannot change live DNS or Worker routes.

1. Test with `node --test cloudflare/chatvice-edge/test/edge.test.mjs`.
2. Authenticate using a user-controlled Cloudflare session in ChatGPT Work or a **zone-scoped DNS/Workers API token entered locally**. Never paste the token in chat, GitHub source, or logs.
3. Copy `wrangler.example.jsonc` to `wrangler.jsonc` inside this directory. Test the Worker at its temporary workers.dev preview first.
4. Check customer login/OTP, cookie/session persistence, WebSocket, media uploads, CORS, support routing and 4xx/5xx on an isolated environment. Verify negative tests too.
5. Only after UAT, bind `chat.chatvice.app` as Worker Custom Domain (Cloudflare automatically manages DNS/SSL), or use an explicit Worker Route with a proxied DNS record. Verify its DNS and HTTPS from multiple resolvers.
6. **Keep `pay`, `blaster`, `web` disabled** until their original business functions have confirmed replacements. Change one host at a time, retaining rollback of old DNS records and a pre-cutover snapshot.
7. Keep Railway `ENABLE_BACKGROUND_JOBS=false`. Do not create or replay live payment orders in UAT.

## Email migration without losing messages

1. Inventory every Hostinger mailbox, alias, forwarding address, sender and shared mailbox. Export/backup historical messages via IMAP or provider tooling. The read-only audit cannot list private mailboxes.
2. Choose destination: Cloudflare Email Routing to a **verified existing mailbox** for receive-only forwarding; or a mail-hosting provider for a full mailbox/IMAP user experience. Cloudflare Email Sending (public beta) provides application SMTP/API sending separately, conditional on plan and onboarding.
3. Verify destination address and routing aliases; test from independent sender addresses **before changing MX**. For an initial trial, use a test subdomain that does not affect the production apex MX.
4. Configure SPF for the *actual* outgoing senders (for example Resend and/or Cloudflare Email Sending), and DKIM/DMARC from the target provider. Do not copy old Hostinger records blindly.
5. Change MX only after recipients, sending, history, and rollback path are proven. Keep Hostinger live during DNS propagation and monitor undelivered/rejected mail.
6. Do not disable Hostinger mail or delete historical mailboxes before delivery and archive verification.

Read-only live DNS report: `node cloudflare/chatvice-edge/scripts/dns-audit.mjs`.

## Rollback

Snapshot prior DNS records and Worker route mapping; disable the Worker Custom Domain/Route and restore old DNS records only if the old origin is still verified healthy. If original legacy Replit TLS is broken, rollback may **not** restore working HTTPS; maintain a tested recovery origin separately.
