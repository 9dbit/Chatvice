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
  Neither is a publicly configured Mail endpoint. The parallel provider setup
  record in PR #19 reports that `qa-mail.chatvice.app` was registered in Resend
  with status **Not Started**, receiving off and no new provider key created
  (domain ID `c2b767f3-6665-461f-b68a-3d6c0d8aa82a`). This is a recorded checkpoint,
  not an independently refreshed dashboard observation. DNS NXDOMAIN alone does
  not establish whether a domain has been registered with the provider.
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
- Plugin discovery returned no Resend/Cloudflare connection. The user subsequently
  approved read-only provider browser inspection on TRADEVICEPC. A constrained
  probe found neither of the expected local debugging ports available; browser
  process metadata also showed no debugging port or pipe enabled. A read-only
  accessibility scan returned no accessible Resend/Cloudflare tabs. These results
  describe the available connection, not the user's provider account state.
  No browser was restarted, debugging enabled, profile/cookie/key values read,
  or provider settings changed. Live dashboard verification remains unavailable
  through this connection despite the user having approved the inspection.

## Latest independent validation checkpoint

- Commit `4bdd6b37558d54d9c5e2da8ab4879cf431465559`: CI run `40380578473`
  succeeded, including 56 tests, desktop/mobile browser contracts, all application
  builds, disposable encrypted database backup/restore and a real Docker runtime
  smoke test. The runtime image measured 257,869,295 bytes (about 246 MiB).
- The exact commit's Railway deployment `3058816a-4ed0-420d-869d-72b7640994a0`
  was still QUEUED at this checkpoint. The public service's health returned 200,
  anonymous Mail UI/API returned 401 and `/login` returned 404: the latest
  first-party login build was not yet confirmed live.
- QA uses `Dockerfile.mail-qa`. Its build watch patterns cover application/runtime
  inputs and exclude documentation-only changes. The unrelated staging patch
  retained its original five changes.

Live provider metadata and dedicated credentials remain unverified. No real
message was sent, root MX changed, production key reused or legacy mailbox removed.
