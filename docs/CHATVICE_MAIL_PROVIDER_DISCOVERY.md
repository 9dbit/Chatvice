# Mail provider discovery and staging setup

Scope: Chatvice Mail staging provider evidence. No provider secret values,
passwords or cookies are recorded here. Dated older checkpoints below describe
the state at that time; the latest continuation supersedes their setup status.

## Mailbox and attachment acceptance — 28 October 2026

Delivery Staging deployment `63276a5d-0015-4b6b-a8eb-1deae12f272c` reached
**SUCCESS** at 01:56 UTC (08:56 WIB). Its reported source is `b7e7cac`; GitHub
comparison against accepted implementation `169b767e` confirms only documentation
changed. The existing compiled offline provisioner created the isolated QA admin
`qa-operator@qa-mail-staging.chatvice.app`. Its random password is managed only by
Railway's `CHATVICE_MAIL_QA_OPERATOR_PASSWORD` and the temporary operator test
process. No password is included here. The temporary provisioning password value
was cleared in service config after success. Schema-only pre-deploy was restored
and read back; do not replay this deployment's old provisioning snapshot.

Authenticated HTTPS setup created `qa-sender@qa-mail-staging.chatvice.app` and
`qa-inbox@qa-mail-staging.chatvice.app`. Seven operator checks passed: admin login,
ClamAV clean verdict, private-storage byte roundtrip, anonymous download denial,
EICAR blocked verdict, blocked download denial and outbound-disabled enforcement.
Three public boundary checks passed: health 200, anonymous mailbox API 401 and
unsigned provider webhook 401; all returned no-store/noindex. The test sessions
were logged out. The clean and quarantined samples remain separate unsent drafts.

The application's domain ownership check is still **pending**. Add this public
TXT in Cloudflare before invoking the application verify endpoint:

| Type | Full host | Content |
| --- | --- | --- |
| TXT | `_chatvice-mail.qa-mail-staging.chatvice.app` | `chatvice-verify=7483e769-a364-43b3-b67e-f6cb6e5a9dbc` |

RDC reported SPARK offline twice during this run. Its authenticated Chrome session
is required for this DNS write. No DNS validation was bypassed. The Resend domain
remains the previously verified sending/receiving domain, but that does not replace
Chatvice's own TXT ownership gate.

Runtime provider and private attachments are configured; outbound and AI remain
off. The provider webhook remains disabled at its last verified provider state;
no provider mutation or email send occurred in this continuation. After SPARK is
online, publish the TXT, run `verify`, enable the existing signed webhook, enable
staging outbound, and run the controlled `send` / `status` / `reply` acceptance.
Verify the exact Resend attachment download host if ingestion refuses a new CDN.

The unrelated pending staging patch is unchanged. Production and apex MX were not
modified. The earlier redeploy failed on an old smoke pre-deploy snapshot, and a
same-source reconnect was skipped by watch patterns; the scoped variable-triggered
deployment above is the accepted result. Initial automatic review of source
reconnection was resolved after confirming this service has no production instance.

See [the operator procedure](CHATVICE_MAIL_DELIVERY_ACCEPTANCE.md) and
[resumable nonsecret evidence](evidence/mail-delivery-staging-20261028.json).

## Credential approval applied — 28 October 2026

The user explicitly approved the Full access receiving key and storage of the
sending/receiving/webhook secrets on Mail Delivery Staging. This supersedes the
approval blockers in the older checkpoint below.

- Existing domain-restricted sending key installed as `RESEND_API_KEY`.
- Created `Chatvice Mail Staging Receiving 20261028` (Full access) and installed
  it as `RESEND_RECEIVING_API_KEY`.
- Created webhook `c1413829-97d6-4947-82c7-f49e1704f101` for the exact staging
  endpoint below, with received/sent/delivered/bounced/complained/failed events.
  A subsequent provider API read confirmed its status is **disabled**.
- Stored its signing secret as `RESEND_WEBHOOK_SECRET`. Railway read-back confirms
  all three variable names on service `d446f23c-2730-49e5-8e3d-6751ebe46afa`
  in `cutover-staging`; values are withheld by the connector.
- All writes used `skipDeploys=true`: these settings apply on the next deployment.
  No new deployment or real email test occurred. Mailbox provisioning, application
  domain verification and private attachment acceptance still precede live ingress.
- No secrets are included in this checkpoint. Root DNS and production remain unchanged.

## RDC / SPARK continuation — 28 October 2026, 01:00 WIB

The user-directed RDC connection on SPARK successfully controlled the existing
authenticated Chrome session. Resend workspace `markstudios.seo` contains the
verified root `chatvice.app` domain. The older `qa-mail.chatvice.app` registration
was not accessible in that workspace. Resend's add-domain flow reported that it
belongs to another team and that claiming it would revoke that team's access.
No ownership-verification DNS was added and no transfer was completed. The
unverified claim flow is `2996826e-f937-40a8-860d-2a47a3e76459`; do not complete
that claim as part of this staging setup.

A separate test domain `qa-mail-staging.chatvice.app` was registered in the
authenticated workspace, domain ID `aced36ba-4db2-4869-8f64-35428c9726b7`, Tokyo
(`ap-northeast-1`). Resend recorded **Verified** at 00:47 WIB; sending and receiving
are enabled at the provider. Its Forge infrastructure is enabled. No tracking
subdomain was configured. The application's provider and outbound flags remain off.

Four provider-issued records were saved in the existing Cloudflare zone:

| Type | Relative name | Target/content | Other settings |
| --- | --- | --- | --- |
| TXT | `resend._domainkey.qa-mail-staging` | Resend-issued DKIM public key, matched against the dashboard | Auto TTL |
| CNAME | `rsend.qa-mail-staging` | `rsend-apne1.forge.rmta.net` | DNS only, Auto TTL |
| CNAME | `send.qa-mail-staging` | `send.forge.rmta.net` | DNS only, Auto TTL |
| MX | `qa-mail-staging` | `receive-apne1.forge.rmta.net` | Priority 10, Auto TTL |

Cloudflare's actual saved rows, Google Public DNS answers and Resend's record
statuses agree. All four records are **Verified** in Resend. Fresh apex MX answers
remain `8 route1.mx.cloudflare.net`, `39 route2.mx.cloudflare.net` and
`80 route3.mx.cloudflare.net`. No apex record or existing mail route was changed.

### Credential checkpoint and explicit approval boundary

- Created `Chatvice Mail Staging Sending 20261028` with **Sending access** restricted
  to **qa-mail-staging.chatvice.app**. The selected permission and domain were
  checked before submission; the key list then confirmed the new sending key.
  Its one-time key dialog remains open in Chrome. Do not create a duplicate key.
- Automatic approval review rejected creation of
  `Chatvice Mail Staging Receiving 20261028` with **Full access**, because the
  account-wide privilege requires explicit user authorization. That key was
  **not created**. Sending-only access cannot perform the required receiving reads.
- Automatic approval review also rejected writing the new sending secret to
  Railway, because transferring a secret to that service requires explicit user
  authorization. The `set_variables` call did **not** execute. The existing
  `RESEND_API_KEY` reference is therefore not replaced or accepted as isolated.
- No credential values were placed in source, this record or the PR. No existing
  key was reused, rotated or revoked. Do not bypass either rejected action through
  another API, browser flow or existing credential; obtain explicit approval first.
- Resend's Webhooks page reports **No webhooks yet**. No live webhook was registered,
  and `RESEND_RECEIVING_API_KEY` / `RESEND_WEBHOOK_SECRET` remain absent on Delivery
  Staging. No test message was sent.

The concrete next credential operation is to create the separate receiving key
with its reviewed account-wide scope and store the dedicated sending key,
receiving key and generated webhook signing secret only on
`Chatvice-Mail-Delivery-Staging` (`d446f23c-2730-49e5-8e3d-6751ebe46afa`) in
`cutover-staging` (`08a3efa0-8a70-44db-a2fb-ca46ddb84b95`), project
`40970ac6-3ce6-4d31-8d6a-555d2dd6fecf`. Register the webhook initially disabled at:

https://chatvice-mail-delivery-staging-cutover-staging.up.railway.app/api/mail/provider/resend/webhook

Required implemented events are `email.received`, `email.sent`, `email.delivered`,
`email.bounced`, `email.complained` and `email.failed`. Keep live ingress disabled
until credentials, application domain ownership, test mailboxes and private
attachment acceptance are ready. Then perform controlled send/receive/reply and
attachment tests. Provider DNS verification alone is not delivery acceptance.

The latest Delivery Staging deployment remains
`af7ba903-9c6b-4c90-8bf4-fef5b54ee699` (**SUCCESS**), implementation `169b767e`.
Its prior 23-check HTTPS/database login probe and cleanup evidence are recorded in
[the login checkpoint](CHATVICE_MAIL_DELIVERY_STAGING_LOGIN.md). No permanent test
login or mailbox is provisioned. No Railway deployment, production mutation,
Hostinger deletion or history import occurred during this RDC provider setup.
The unrelated staged patch `2bfcd815-6772-40d1-a8b0-93670c9bc0e8` is unchanged;
the current API groups its prior fields as two entries (`resource.update` and
`ENABLE_BACKGROUND_JOBS` `variable.set`), both on `Chatvice-staging`.

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

## Public delivery-staging endpoint — 27 October 2026, 23:35 WIB

Continuation now has browser side-panel metadata identifying the selected Resend
domain tab. Nevertheless the Browser control connector still returns the same
originating-browser-context error before any runtime command executes. No live
provider dashboard inspection or configuration was possible. The owner has
already followed the side-panel step; do not keep asking them to repeat it.

The independently secured Mail application now has a Railway HTTPS staging URL:

https://chatvice-mail-delivery-staging-cutover-staging.up.railway.app

Only service `d446f23c-2730-49e5-8e3d-6751ebe46afa` in `cutover-staging`
was configured. Railway domain `6754e823-9780-4378-b68f-69b546de4006`
routes to port 5000. Both `CHATVICE_MAIL_APP_ORIGIN` and
`CHATVICE_MAIL_ALLOWED_ORIGINS` are set to the exact HTTPS URL above.
`PORT=5000`; outbound, attachments and AI are explicitly false; the provider
is explicitly disabled. No provider credential was created, copied or exposed.

Deployment `92b7901c-e035-4136-a343-26b484291ac3`, retaining application commit
`7ffbf51aa4f5f807ff5c674fa36e127439e22f84`, reached **SUCCESS** at
2026-10-27T16:35:40Z. No production application or customer database was changed.

Nine live HTTP checks passed after that deployment:
- `GET /health`: 200, status ok / service chatvice-mail.
- `GET /login`: 200.
- Anonymous `GET /api/mail-auth/session`, `/api/mail/mailboxes` and
  `/api/mail/domains`: 401 each.
- `POST /api/mail/provider/resend/webhook`: 503 while provider disabled.
- Login POST with unrelated Origin, or without Origin: 403 each.
- Login POST with configured Origin and empty credentials: 401, proving the
  correct-origin request reaches credential validation without authenticating.
- All nine responses include no-store and noindex headers.

This is network/authentication-boundary acceptance only. No test identity was
provisioned, no authenticated browser login was performed, and no signed real
provider event or email was tested.

Fresh Google Public DNS queries returned:
- Apex `chatvice.app` MX: Cloudflare route1/route2/route3.
- NXDOMAIN for `qa-mail.chatvice.app` MX/TXT,
  `resend._domainkey.qa-mail.chatvice.app` TXT, and
  `send.qa-mail.chatvice.app` MX/TXT.
These queried selectors do not replace the actual DNS values/labels issued by
the provider; inspect the existing Resend QA domain before creating records.

The concrete webhook destination for subsequent Resend configuration is:

https://chatvice-mail-delivery-staging-cutover-staging.up.railway.app/api/mail/provider/resend/webhook

It is currently intentionally disabled (503); do not register live receiving
traffic until the separate receiving key, webhook signing secret, test-domain
DNS, test mailboxes and private attachment path are ready. Replace the temporary
sending-key reference with a dedicated domain-restricted key. Store credential
values only in Railway service variables, not this document or chat.

Read-back confirmed the domain and successful deployment. The unrelated pending
patch `2bfcd815-6772-40d1-a8b0-93670c9bc0e8` retains exactly five changes;
Delivery Staging has no pending staged changes. No root MX/DNS modification,
Hostinger deletion, customer email send or history import occurred.
