# Mail operations without SPARK or TradevicePC

GitHub stores reviewed code and runs checks. Railway runs the application and a
one-shot operator job, `Chatvice-Mail-Cloud-Ops`, in `cutover-staging`. The job has
no public domain, HTTP listener, schedule, customer recipients or production
environment instance. It exits after the requested action (`restartPolicy=NEVER`).
No local computer or browser session is needed for subsequent runs.

## Resources

- Project: `40970ac6-3ce6-4d31-8d6a-555d2dd6fecf`
- Environment: `08a3efa0-8a70-44db-a2fb-ca46ddb84b95`
- Job service: `f6bc0735-5751-444d-bdf6-cd7bc9446271`
- Job volume: `3d92cc90-e340-4919-b063-4aeae6bf945b`, 100 MB, `/state`
- Image recipe: `Dockerfile.mail-ops`, Python standard library only.
- Job source is pinned to a reviewed commit; connecting a newer commit explicitly
  upgrades it. The application service is independently pinned.

The job references `CHATVICE_MAIL_QA_OPERATOR_PASSWORD` and
`RESEND_RECEIVING_API_KEY` from `Chatvice-Mail-Delivery-Staging` using Railway
reference variables. It uses them only inside the cloud process. It cannot export
them via an endpoint, command output or evidence. No password, provider key,
signing secret, database credential or storage credential is committed to GitHub.
The original sending key and webhook signing secret stay on the application.

## One-time Cloudflare setup

An account owner must create a Cloudflare API token and put it directly into the
job's Railway Variables tab as `CLOUDFLARE_DNS_API_TOKEN`. Never send it through
chat. Use **Zone / DNS / Edit** and **Zone / Zone / Read**, with resources limited
to the single zone **chatvice.app**. Add the zone's **Zone ID** as
`CLOUDFLARE_ZONE_ID` (not the Cloudflare account ID).

Token creation: <https://dash.cloudflare.com/profile/api-tokens>

Job variables:
<https://railway.com/project/40970ac6-3ce6-4d31-8d6a-555d2dd6fecf/service/f6bc0735-5751-444d-bdf6-cd7bc9446271/variables?environmentId=08a3efa0-8a70-44db-a2fb-ca46ddb84b95>

Cloudflare grants DNS editing at zone scope, not single-record scope. The job
additionally restricts writes to one TXT record:
`_chatvice-mail.qa-mail-staging.chatvice.app`. It verifies the zone name, refuses
conflicting records, creates only if absent and reads back the result. It never
updates/deletes existing records or touches apex MX. Credentials are sent only to
fixed HTTPS hosts; redirects are refused.

Official references: [Cloudflare tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
and [Resend webhook updates](https://resend.com/docs/api-reference/webhooks/update-webhook).

## Run an action

Use the Railway connector to set `MAIL_CLOUD_ACTION` on **only this job service**,
with the explicit project and staging environment IDs and `skipDeploys=false`.
Read the resulting deployment logs and terminal result. A cleanly exited job is
not a web server; assess its `result=completed` log as well as process exit.
No GitHub access token or Railway API token needs to be placed in the job.

| Action | Effect |
| --- | --- |
| `preflight` | Health, real operator login/logout, public TXT presence and configuration presence; no provider mutation |
| `dns` | Create/read back the exact application ownership TXT through Cloudflare |
| `verify` | Ask the application to verify its DNS ownership challenge |
| `webhook-check` | Read the existing Resend webhook; reject unexpected endpoint/events |
| `webhook-enable` | Reverify application ownership and storage gates before enabling that existing webhook |
| `webhook-disable` | Disable that same webhook; no secret rotation or deletion |
| `storage` | Existing antivirus/private-storage tests; requires staging outbound OFF |
| `send` | Queue the existing clean draft to the QA inbox only |
| `status` | Read delivery, received attachment and reply correlation evidence |
| `wait` | Poll the existing QA exchange for up to two minutes using one login, then log out; never sends mail |
| `reply` | Queue a reply from QA inbox to QA sender only |

Use `wait` after the reply has been queued instead of repeatedly invoking `status`.
Completion requires fresh original and reply delivery evidence, one correlated
reply, and exact attachment bytes. Only MIME terminal line endings are normalized
for the controlled reply; changed content, spaces and duplicate replies fail.
TXT verification accepts the exact challenge either raw or with one presentation
quote pair. Conflicting values are still refused without overwriting DNS.

`send` and `reply` additionally require `MAIL_ACCEPTANCE_ALLOW_SEND=qa-domain-only`.
The application outbound flag remains a separate explicit control on Delivery
Staging; the job cannot enable it. Do not run `storage` with outbound enabled.
After acceptance restore the job action to `preflight` and the send gate to
`disabled`, and turn application outbound off until the next approved QA run.

The durable `/state/acceptance.json` starts with the accepted nonsecret checkpoint.
Updates are atomic; a file lock prevents concurrent runs. Queue intent is saved
before transport. After an ambiguous send response, inspect message status rather
than automatically retrying. Never delete/reset the volume to retry a send. Logs
include only fixed diagnostic codes, check booleans and QA webhook ID/status.

## GitHub checks

`.github/workflows/chatvice-mail-ops.yml` runs mocked safety tests, builds the
actual operator container and proves the production-scope guard fails closed.
It needs no secrets. Manual `workflow_dispatch` also checks public staging health;
GitHub only exposes manual dispatch once this workflow exists on the default
branch. Until PR #19 is merged, push/PR checks and the Railway job are available.

## Remaining gates

Before claiming end-to-end delivery, publish the TXT, verify ownership, enable
the existing webhook, enable staging outbound, and prove send/receive/reply with
attachment bytes. Production routing, historical mail preservation/import and
recovery remain separate gates documented in `CHATVICE_MAIL_PRODUCTION_GATES.md`.
