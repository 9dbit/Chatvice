# Delivery staging operator acceptance

This run targets only the isolated Railway Mail Delivery Staging origin and
`qa-mail-staging.chatvice.app`. It does not test or change production routing.

`scripts/mail-delivery-acceptance.py` uses Python 3's standard library. Supply a
private credential JSON file containing `email` and `password`; the operator email
must be `qa-operator@qa-mail-staging.chatvice.app`. Keep the file outside the repo,
readable only by the operator. The managed password is stored on the isolated
Railway service as `CHATVICE_MAIL_QA_OPERATOR_PASSWORD`; never paste it in logs,
source, documentation, CLI arguments or the PR.

Set `MAIL_ACCEPTANCE_CREDENTIAL_FILE` and `MAIL_ACCEPTANCE_STATE_FILE` to local
absolute paths. The second file records IDs and check results for resuming a run.
Preserve it between commands. The probe logs in independently and logs out in a
`finally` block after each command.

| Command | Operation |
| --- | --- |
| `python scripts/mail-delivery-acceptance.py setup` | Creates or reuses the QA domain and two mailboxes; returns the application's TXT ownership challenge |
| `python scripts/mail-delivery-acceptance.py verify` | Checks the published TXT through the application |
| `python scripts/mail-delivery-acceptance.py storage` | Creates test drafts; checks clean-file storage/download, anonymous denial, EICAR block and disabled sending |
| `python scripts/mail-delivery-acceptance.py send` | Queues the clean attachment draft to the QA inbox only |
| `python scripts/mail-delivery-acceptance.py status` | Checks outgoing status, incoming attachment bytes and reply-thread correlation |
| `python scripts/mail-delivery-acceptance.py reply` | Queues a reply from the QA inbox to the QA sender only |

The `send` and `reply` commands require the additional explicit environment value
`MAIL_ACCEPTANCE_ALLOW_SEND=qa-domain-only`. They re-read the actual draft recipient
set and sender mailbox before queueing; no CC/BCC or address outside the exact QA
pair is allowed. The antivirus test remains a separate draft and is never queued.
Do not requeue after a network ambiguity without inspecting the saved draft state.

Before enabling the signed Resend webhook, verify application domain ownership,
mailbox setup and the private attachment path. The webhook must use only its own
signing secret and the separate receiving key. DNS verification in Resend alone
does not satisfy the application's independent ownership challenge.

## Deployment notes

The reviewed image already contains `dist/mail-provision-user.mjs`. It requires the
isolated database's exact expected host, existing tenant and secret environment
password. A temporary pre-deploy command can run schema validation followed by
the provisioning command once. Restore the schema-only command after success;
the provisioner intentionally refuses a duplicate identity.

Railway's explicit `redeploy` of the old login-smoke deployment replayed its old
pre-deploy snapshot, despite a newer service configuration. It failed at the
smoke script's scope guard once provider/attachments were configured. Reconnecting
the same commit was subsequently skipped by watch patterns. Apply current config
with a new scoped service deployment and inspect its actual pre-deploy logs.
Do not mistake a queued, skipped or failed build for runtime acceptance.
