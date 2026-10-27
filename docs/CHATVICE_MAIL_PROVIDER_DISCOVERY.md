# Mail provider discovery — 27 October 2026

Scope: read-only discovery for Chatvice Mail staging. No provider key values,
passwords, cookies or DNS changes are recorded here.

## Delivery staging continuation — 27 October 2026

A current Chrome session on the Mac can read the authenticated Cloudflare DNS
page for `chatvice.app`. Searching `qa-mail` returned no records. Resend redirected
to its login page. Automatic approval review rejected Google sign-in because
the prior permission covered read-only inspection of an existing provider session;
explicit sign-in approval is pending. No provider key values were read. A fresh
TRADEVICEPC check still found no existing browser debugging port or pipe.

Real provider testing must use the independent Mail application. The synthetic QA
server rejects outbound activation, does not run the outbox worker, and requires
QA authentication before its `/api/mail` routes. The independent application
exempts only signed provider ingress from browser login and starts the worker.

`Chatvice-Mail-Delivery-Staging` was created only in `cutover-staging`, pinned to
`2905f020d67000b08b2871ef904145cd7a4f8efe`, and built with `Dockerfile.mail-app`.
Deployment `adca86c2-f32f-495e-bcd9-5a12f7a79578` succeeded. Its logs confirm atomic
initialization of the new isolated `Postgres-gFVb` database, runtime start and
database connectivity. No login identity was created. Fresh independent encryption
and session keys are stored only as Railway service variables.

A separate private Railway S3 bucket, `chatvice-mail-delivery-staging-private`,
was created for this staging service. Storage/scanner references are configured
for its next deployment, while attachments, outbound and AI remain disabled.
This is not production Cloudflare R2 acceptance. The service has no public domain;
its allowed origin is deliberately `https://delivery-staging.invalid` until a real
staging URL is approved and configured. Public URL creation was denied while the
service was unconfigured; explicit approval for exposing the now-configured staging
service has been requested.

No real message was sent. Root DNS, production and the unrelated five-change
staging patch remain unchanged. Actual sending, receiving, reply correlation and
attachment receipt still require dedicated provider configuration and test evidence.

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

## Resend account confirmation and safe staging wiring — 27 October 2026

The owner confirmed that the existing Resend workspace uses the Google account
`markstudios.seo@gmail.com` and includes Chatvice. This identifies the intended
provider workspace but is **not** an authenticated dashboard session or proof of
key permissions.

Verified and completed:
- `Chatvice-Mail-Delivery-Staging` in `cutover-staging` now defines
  `RESEND_API_KEY=${{Chatvice-staging.RESEND_API_KEY}}` as a Railway
  same-environment reference. No token value was read, exposed or copied into
  source code. This is a *temporary wiring* to the existing Chatvice staging
  sending key and **not** provider authentication acceptance.
- `CHATVICE_MAIL_OUTBOUND_ENABLED` remains disabled; there was no deployment,
  provider send, webhook registration, DNS change or production mutation.
- An independent public resolver returned Cloudflare Email Routing MX at the
  `chatvice.app` apex, an SES feedback MX on `send.chatvice.app`, a
  `resend._domainkey.chatvice.app` TXT public key, and apex DMARC
  `v=DMARC1; p=none`. Public DNS does not prove Resend's own verified-domain
  status or the current mailbox forwarding destination.
- Existing `qa-mail.chatvice.app` provider registration is documented above
  as Not Started. Prefer completing that **existing** test subdomain rather
  than changing the root domain's MX or adding duplicate domains.

Unblocked next actions once authorized in the named Resend account:
1. Inspect Chatvice sending-domain verification and the existing QA-domain
   registration, without exposing signing/API credentials.
2. Create a dedicated, domain-restricted **Sending access** key for Mail
   staging and replace the temporary Railway cross-service reference.
3. Create a **separate** receiving-capable API key, review its broader access
   scope, register signed webhook with `email.received` and the required
   delivery-status events. Store `RESEND_RECEIVING_API_KEY` and
   `RESEND_WEBHOOK_SECRET` only as Railway secrets.
4. Verify `qa-mail.chatvice.app` records (SPF/DKIM/MX as actually issued by
   Resend), using Cloudflare's authenticated DNS UI. Do **not** alter apex
   `chatvice.app` MX.
5. Expose the independent delivery staging URL only with review and run real
   controlled send, receive, attachment and signed-event tests. Keep customer
   traffic and root-domain cutover disabled until all acceptance gates pass.

### Staging redeploy verification

The Mail Delivery Staging service was redeployed specifically to load the
same-environment `RESEND_API_KEY` reference (not to activate delivery).
Deployment `8b3e4b76-7db1-4151-832b-78cd0c480f97` returned **SUCCESS**
and `/health` passed. The running server reports isolated app start and
database connectivity. The unrelated five pending `Chatvice-staging`
changes remain untouched. This is **not** a successful provider API call,
webhook delivery or real mail send. Dedicated scoped credentials, receiving
access and signed webhook configuration are still release gates.
