# Chatvice Mail public signup release (12 November 2026)

## Product scope

The initial public signup is a **guarded pilot limited to @chatvice.app**. It permits unlimited independently activated mailboxes and restricted Mail login accounts per verified external contact. This is not Chatvice merchant account registration. It does not offer custom domains, paid subscriptions, storage upgrades, or unrestricted high-speed/bulk outbound.

A user visits `/signup`, enters the preferred mailbox name, display name and an **existing external contact email**, completes Cloudflare Turnstile, then receives a 30-minute confirmation link at that contact. Only that verified link may create a mailbox through the pre-existing atomic standalone engine. The user follows a separate one-time 24-hour activation link to set a unique password of at least 16 characters. Mailbox delivery is Ready only after the existing provider probe returns through the authenticated router.

## Required environment configuration

Do **not** enable public registration unless the following values are configured securely on the isolated `Chatvice-Mail` service:

| Variable | Value / requirement |
| --- | --- |
| `CHATVICE_MAIL_PUBLIC_SIGNUP_ENABLED` | `false` by default; set `true` only after acceptance |
| `CHATVICE_MAIL_PUBLIC_SIGNUP_DOMAIN` | `chatvice.app` |
| `CHATVICE_MAIL_PUBLIC_SIGNUP_FROM` | `hello@chatvice.app` (must already be a verified sender) |
| `CHATVICE_MAIL_TURNSTILE_SITE_KEY` | Public site key of a Turnstile widget restricted to `mail.chatvice.app` |
| `CHATVICE_MAIL_TURNSTILE_SECRET` | Secret server-side widget key; never put in GitHub or browser |
| `CHATVICE_MAIL_INITIAL_TENANT` | Existing verified Mail tenant; no new tenant or domain claim |
| `CHATVICE_MAIL_ONBOARDING_ENABLED` | `true`, with the existing Cloudflare/Resend router functioning |
| `CHATVICE_MAIL_ROUTER_DOMAINS` | Includes `chatvice.app` |
| `CHATVICE_MAIL_OUTBOUND_ENABLED` | `true`; existing Resend credentials must remain valid |

Turnstile must return `success=true`, `hostname=mail.chatvice.app`, and `action=mail_signup`. The app rejects mismatched, expired or reused proofs. A missing setting leaves signup disabled.

## Abuse protection and privacy

- Same-origin write enforcement, restricted CSP, Turnstile, and atomic HMAC-keyed IP/contact/username attempt counters.
- Reserved addresses cannot be registered. Existing mailbox presence is not enumerated to unauthenticated clients.
- Contact verification tokens are cryptographically random; only SHA-256 token hashes are persisted.
- The contact email itself is not persisted in the signup table; a server-keyed contact hash is stored instead. Any number of completed public signups may share the same verified contact; each still requires a new one-time email verification and independent mailbox password.
- Public-created mailboxes have **no fixed daily outgoing quota**, but the verified contact shares a short-term anti-abuse allowance of 12 queued messages per minute across all its mailboxes. The service still enforces **3 total To/CC/BCC recipients per message** and **no attachments** during pilot. Burst protection is atomic for compose and draft sends. Provider policy, sending speed, cost and abuse restrictions still apply.
- Existing mailbox memberships, messages, aliases, and Cloudflare exact routes remain unchanged.

## Release checklist

1. Pass Mail CI including synthetic standalone mail signup, quota, CSRF and replay tests on disposable PostgreSQL.
2. Back up isolated Mail PostgreSQL and verify restore before migration. Preserve existing encryption/session secrets and private attachment objects.
3. Deploy the new Mail image with `CHATVICE_MAIL_PUBLIC_SIGNUP_ENABLED=false`. The guarded installer applies the reviewed eighth migration, which removes only the unique-per-contact index; it leaves login identities, messages and legacy daily counters intact and refuses unexpected schema history or target host.
4. Check `/health`, login, existing mailbox list and inbound/outbound/reply flows for `hello` and `64cor`. Check `/api/mail-auth/signup/config` reports disabled.
5. Create a Cloudflare Turnstile widget for `mail.chatvice.app` and set its site/secret keys on the Mail service. Keep existing routing, DNS, MX and Resend webhooks unchanged.
6. Enable public signup and verify one real external contact can request the verification link, create and activate a new mailbox, sign in with isolated membership and receive/send a test email. Verify recipient and burst controls, no fixed daily quota, multiple mailboxes per contact and retries. Test from desktop and mobile.
7. Review signup attempts, outbound delivery, abuse signals and provider usage before broad marketing.

## Fail-safe rollback

Set `CHATVICE_MAIL_PUBLIC_SIGNUP_ENABLED=false` immediately to block *new* signups. This does not revoke existing accounts. Their shared-contact burst checks remain effective as long as the new schema and compatible application code remain deployed. **Do not remove the additive tables or revert to an image unaware of public-account burst protections after any public mailboxes have been created.** Disable suspect public mailboxes explicitly through the administrator controls, and restore only from a rehearsed database/object/key backup if necessary.

Self-service custom-domain ownership validation and subscriptions require a separately scoped and tested release.

## 13 November 2026 unlimited policy update

- The eighth immutable migration drops only `mail_public_signups_one_contact_idx` and retains all existing accounts.
- Each extra mailbox requires a new contact verification and its own activation password. Independent accounts do not gain shared inbox access.
- No fixed outgoing daily quota is enforced. The legacy daily-counter table is retained for historical audit but is no longer written by the application.
- A transactional, contact-wide 12-message-per-minute burst control limits abuse across multiple public mailboxes. Provider and anti-spam restrictions still apply.
- Require successful disposable PostgreSQL schema and multi-mailbox CI, Docker and browser regression, and live outbound test before directing production traffic to the new build.
