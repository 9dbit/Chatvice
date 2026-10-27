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

## Owner-confirmed Resend Chrome tab, 27 October 2026

The owner opened and authenticated the existing Resend page at
`https://resend.com/domains/12a480c4-31d5-4bca-91a0-9f0ee36ae658`.
A read-only browser tab inspection confirmed workspace `markstudios.seo`,
`chatvice.app` domain status **Verified**, region **Tokyo (ap-northeast-1)**,
and the banner **Domain verified: Your domain is ready to send emails**.
`Resend Forge` is **Disabled**, which is not a blocker for the existing
verified sending-domain configuration. Resend displays DNS provider
**Hostinger** in its UI; the public authoritative MX check separately shows
Cloudflare Email Routing, so do not assume that Resend's displayed provider
is the active DNS control plane.

**Important scope:** Resend Verified here demonstrates the sending domain
is configured. It does not demonstrate inbound receiving, a working
webhook, mail app mailbox provisioning, or email delivery. No API key,
webhook secret, message body, or customer details were exposed in this check.
The connected Browser tool in Chat mode has **read-only access** to the
open tab. Further changes require ChatGPT **Work mode** (browser control)
or an explicit authenticated connector operation; do not imply dashboard
settings have been edited from Chat mode.

Next safely in Work: inspect the existing `qa-mail.chatvice.app` domain,
API key scope and webhook configuration; create isolated staging credentials,
verify test-domain DNS without changing apex MX, then run one controlled
end-to-end send/receive/reply/attachment test and preserve rollback evidence.

## Work continuation verification — 27 October 2026

The continuation request was received in Work mode. The connected Browser control
entry point returned: "Browser access requires the originating browser context.
Open ChatGPT in the browser with the connected extension and try again."
This is a connection-context limitation, not evidence that Resend is logged out.
The previously verified sending-domain observation above remains historical;
neither Resend nor Cloudflare dashboard state was refreshed in this session.
A fresh plugin-directory search for Resend/Cloudflare returned no matching plugin.

Read-only GitHub/Railway verification completed:
- PR #19 remains a draft on `feature/chatvice-mail-engine-20261026`.
- Delivery Staging service `d446f23c-2730-49e5-8e3d-6751ebe46afa`, environment
  `08a3efa0-8a70-44db-a2fb-ca46ddb84b95`, is live at deployment
  `8b3e4b76-7db1-4151-832b-78cd0c480f97` with status **SUCCESS**.
- Service configuration remains pinned to
  `7ffbf51aa4f5f807ff5c674fa36e127439e22f84` using `Dockerfile.mail-app`.
  GitHub Actions run `40443921664` for that commit is completed/success.
- Runtime logs confirm reviewed migration history is current, the isolated app
  is listening, and the database pool connected.
- No generated/custom public domain or TCP proxy is attached to Delivery Staging.
- The service lists `RESEND_API_KEY`; it does not list
  `RESEND_RECEIVING_API_KEY` or `RESEND_WEBHOOK_SECRET`. Secret values and
  scopes were not read or inferred from variable names. Sending remains disabled
  according to the previous checkpoint; no enabling change was made here.
- The unrelated staging patch `2bfcd815-6772-40d1-a8b0-93670c9bc0e8`
  still has exactly five changes, none belonging to Delivery Staging.
- Chatvice production deployment remains
  `ea39e7b8-2323-494a-ae8e-95b4f6529d98`, status **SUCCESS**.

Only this evidence record was updated. No provider settings, API keys, Railway
variables, deployments, DNS/MX records or mailboxes were changed; no email was sent.
Provider delivery and history-import acceptance remain incomplete.

Resume from the connected Chrome Work session with Resend and Cloudflare tabs
available. Inspect the already registered QA domain, complete its issued DNS
records, then provision dedicated provider credentials and signed webhook ingress.
Do not treat successful application startup as successful email delivery.
