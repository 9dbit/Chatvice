# Delivery Staging live login acceptance

`scripts/mail-delivery-staging-login-smoke.mjs` verifies the independent Mail app
through its real HTTPS endpoint while running inside its Railway environment.
It is packaged with `Dockerfile.mail-app` and uses the existing compiled offline
identity provisioner. It does not implement a new authentication or signup route.

The script refuses any scope except the exact Chatvice Delivery Staging project,
environment, service, and HTTPS origin. It verifies the database hostname and all
four packaged migration hashes, requires an existing tenant and an empty staging
mail inventory, and requires outbound, attachments, AI and the provider disabled.
It also takes a dedicated advisory lock to prevent simultaneous probe runs.

By default it previews provisioning without creating an account. To run the live
login checks, the operator must explicitly set `MAIL_STAGING_LOGIN_SMOKE` to
`temporary-identity` and pass `--apply`:

```sh
node scripts/mail-delivery-staging-login-smoke.mjs
MAIL_STAGING_LOGIN_SMOKE=temporary-identity node scripts/mail-delivery-staging-login-smoke.mjs --apply
```

The apply mode creates one random synthetic `.invalid` identity with a random
password held only in process memory. It verifies wrong-origin and wrong-password
denial, secure host-only cookies, hashed persistent sessions, authenticated
mailbox/domain reads, disabled delivery capabilities, credential-version revocation
and logout revocation. Each HTTP response must include no-store/noindex headers.

The exact temporary identity and its sessions are removed in `finally`, including
if the provisioner commits just before a child-process timeout. Only the random
probe account's rate-limit record is removed; shared IP limits remain. Failure
output contains a stage label, never credentials, cookies or API response bodies.
An abruptly killed process may skip `finally`; check the failed deployment's
nonsecret `probeId` and remove only `probe-<probeId>@qa-mail.example.invalid`
before retrying. The empty
inventory guard prevents silently creating another identity after such a failure.

For a one-time Railway run, retain the existing schema pre-deploy command and add
the second command above. Restore the original pre-deploy command immediately
after the run, then verify the exact deployment's terminal status. Do not accept
the environment's unrelated staged patch. The app image and its runtime command
remain independent of the diagnostic invocation.

CI runs the packaged diagnostic in both preview and apply modes against the
unrelated disposable image environment and requires scope rejection before any
database access. The live run is a separate acceptance step.

This proves HTTP authentication and database behavior only. It does not prove a
browser's cookie acceptance, provider delivery, test-mailbox provisioning,
production readiness, R2 recovery or historical import. No customer email is sent.

## Accepted live run — 28 October 2026, 00:00 WIB

Implementation commit: `169b767e997f64617e530800ba3ffebaed47b9ee`.
GitHub Actions run [40545204436](https://github.com/9dbit/Chatvice/actions/runs/40545204436)
completed with **success**, including the full existing test/build/browser/image
pipeline and the added packaged-script scope refusal. Local syntax checks and
eight guard cases also passed: production environment, wrong service, wrong
origin, wrong database host, enabled outbound, enabled attachments, QA bootstrap,
and missing explicit apply marker were all refused before database access.

Railway deployment `af7ba903-9c6b-4c90-8bf4-fef5b54ee699` is pinned to that commit
and reached **SUCCESS** at `2026-10-27T17:00:45.092Z` (28 October, 00:00:45 WIB).
The pre-deploy probe exercised the already-running HTTPS application against the
same isolated database; the application/authentication code is unchanged in this
commit. Its structured log at `2026-10-27T17:00:23.275Z` reports **passed**, with
`cleanupPassed=true` and these 23 distinct checks:

1. Exact staging scope and disabled feature flags.
2. Exclusive advisory lock.
3. All four migration hashes match packaged files.
4. Existing isolated tenant.
5. Empty identity/domain/mailbox/message inventory before the probe.
6. Live HTTPS health.
7. Anonymous session denial.
8. Main Chatvice cookie denial.
9. Packaged provisioner preview.
10. Preview creates no identity.
11. Packaged provisioner creates the temporary identity.
12. Salted scrypt password hash.
13. Cross-origin login denial.
14. Wrong-password denial.
15. Secure, HttpOnly, SameSite=Strict, host-only cookie.
16. Authenticated independent session.
17. Session token stored only as a keyed hash.
18. Authenticated empty mailbox API.
19. Authenticated empty domain API.
20. Live outbound, attachment and AI capabilities disabled.
21. Credential-version change revokes the prior session.
22. Logout revokes the subsequent session.
23. Temporary identity and sessions removed.

The original pre-deploy setting `node scripts/mail-app-schema.mjs` was restored
and read back after the run. No diagnostic invocation remains in the service
configuration. The script remains packaged for an explicitly guarded operator
run, and its credentials were never stored in Railway variables, GitHub or logs.
No permanent login identity or mailbox was left provisioned. Shared IP login
throttle counters remain intentionally intact.

At `2026-10-27T17:01:41Z`, nine fresh post-deployment HTTP checks also passed:
health/login documents 200; anonymous session/mailbox/domain APIs 401; disabled
webhook 503; unrelated/missing-Origin login 403; configured-Origin empty login 401.
All nine responses had no-store/noindex headers. These are HTTP checks, not a live
Chrome login assertion.

The unrelated environment patch `2bfcd815-6772-40d1-a8b0-93670c9bc0e8` has the
same grouped pending-work entries before and after this continuation. Delivery
Staging has no pending patch. Production remains at deployment
`ea39e7b8-2323-494a-ae8e-95b4f6529d98`; no production action was performed.

## Resend handoff still required

The Browser connector still returned `Browser access requires the originating
browser context` before executing any browser command, despite selected Resend
tab metadata being present. Plugin discovery returned no Resend/Cloudflare
connector. This is not evidence of logout, and the owner has already opened the
correct Chrome side panel; do not ask them to repeat that step as if it were new.

Fresh public DNS still returns NXDOMAIN for `qa-mail.chatvice.app` MX,
`resend._domainkey.qa-mail.chatvice.app` TXT and `send.qa-mail.chatvice.app` TXT.
The apex MX still resolves to Cloudflare routing. Use the actual records issued
by the existing Resend QA registration before changing DNS; do not infer record
values from these discovery queries.

Delivery Staging still lists only `RESEND_API_KEY` and lacks
`RESEND_RECEIVING_API_KEY` and `RESEND_WEBHOOK_SECRET`. Dedicated sending-key
scope remains unverified. Provider delivery, real test mailboxes, inbound,
outbound, reply and attachment receipt are not accepted. Continue those steps
from the existing QA-domain registration and signed webhook destination in
`CHATVICE_MAIL_PROVIDER_DISCOVERY.md`; no root DNS change or email send occurred.
