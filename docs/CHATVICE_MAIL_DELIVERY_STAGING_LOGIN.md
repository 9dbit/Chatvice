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
