# Mail provider discovery — 27 October 2026

Scope: read-only discovery for Chatvice Mail staging. No provider key values,
passwords, cookies or DNS changes are recorded here.

## Railway locations verified

Project: Chatvice `40970ac6-3ce6-4d31-8d6a-555d2dd6fecf`.

| Service | Environment | Observed configuration names |
| --- | --- | --- |
| `Chatvice-staging` (`5d382dc5-31a7-4774-b393-7a16ad8ab8ae`) | `cutover-staging` | `RESEND_API_KEY` present |
| `Chatvice` (`c9d4bade-3f8b-4270-b68a-4e03d576493b`) | `production` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` present |
| `Chatvice-Mail-QA` (`fa921e59-5afb-4c3a-b65a-643fcf47fa21`) | `cutover-staging` | No `RESEND_API_KEY`, `RESEND_RECEIVING_API_KEY` or `RESEND_WEBHOOK_SECRET` observed; separate S3 storage/scanner/QA auth variables are present |

The connector reveals names, not secret values. Presence is not proof of key
validity, domain scope, receiving permission or isolation. Do not rotate or copy the
existing application sending key into Mail QA merely because its name exists.
Mail requires a dedicated test sending domain/key, a separate receiving credential
and a signed webhook secret. An unrelated product's credential must not be reused.

## Public DNS verified now

- `chatvice.app` MX still resolves to Cloudflare's three routing servers.
- `send.chatvice.app` retains its SES feedback MX and TXT record.
- `resend._domainkey.chatvice.app` has a TXT record. These public records do not
  establish the current Resend dashboard verification state or successful delivery.
- `mail.chatvice.app` and `qa-mail.chatvice.app` returned NXDOMAIN at discovery.
  Neither is an existing configured Mail endpoint. `qa-mail.chatvice.app` is a
  candidate test subdomain only; no ownership/provider/DNS setup has been performed.
- The actual QA application remains on
  `chatvice-mail-qa-cutover-staging.up.railway.app`; `.invalid` mailbox addresses
  in its bootstrap are intentionally non-deliverable fixtures.

## Remaining access findings

- The existing project Cloudflare token verified as expired, with expiry
  `2026-10-22T07:00:00Z`. It cannot be used to inspect current private zone/provider
  settings or change DNS. No replacement token was created.
- Connected Hostinger account exposes only `hello@chatvice.app`; `master` is not
  exposed by this account. No historical messages were copied or modified.
- Connected Gmail searches found Resend product notifications but no matching
  Chatvice domain/key verification notice. This does not prove an account or
  dedicated domain is absent.
- Plugin discovery returned no Resend/Cloudflare connection. Read-only browser
  inspection was proposed separately because automated approval review rejected
  browser debugger endpoint probing. Browser/session control details were not
  obtained or used. Continue only after the requested browser access is approved.

Live provider metadata and dedicated credentials remain unverified. No real
message was sent, root MX changed, production key reused or legacy mailbox removed.
