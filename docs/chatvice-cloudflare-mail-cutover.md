# Chatvice Email Routing Cloudflare release gate

**Sources:** `hello@chatvice.app` and `master@chatvice.app` (Hostinger Mail)
**Target:** verified `9dragons.project@gmail.com` via Cloudflare Email Routing
**Outgoing application mail:** Resend on Railway.

Use the existing authenticated Cloudflare browser, or a token held only in a protected local environment. Never paste tokens into chat, command history, GitHub or logs. API access needs Zone Read, DNS Read/Write, Email Routing Addresses Read/Write, Email Routing Rules Read/Write and Zone Settings Read/Write, restricted to the intended account and zone wherever supported.

## Before any production MX change

1. Export every folder, message and attachment from **both** Hostinger mailboxes. Verify folder counts, RFC822 byte sizes, Message-IDs and checksums; decode and verify attachments. A partial archive of either mailbox does not pass this gate. Keep Hostinger available for a final synchronization of messages received during the export.
2. Verify the Gmail destination and one exact forwarding rule for **each** source address. Reject missing, disabled or duplicate rules and rules containing extra matchers, actions or destinations. A destination registration or verification email alone is not proof of forwarding.
3. Verify forwarding on an isolated test subdomain if production MX still points to Hostinger. Preserve application sending via Resend and prove receipt at Gmail.
4. Save a complete zone backup, including subdomains, Resend, DKIM, priorities, proxy settings and TTLs, and retain the rollback procedure. Public DNS queries do not enumerate a complete zone.

Commands, in the protected environment after the corresponding readiness gates pass:

```bash
node scripts/email-routing-cutover.mjs status
node scripts/email-routing-cutover.mjs prepare
# Verify the destination confirmation in Gmail, then:
node scripts/email-routing-cutover.mjs prepare
node scripts/email-routing-cutover.mjs status
# Only after the complete historical archive and delivery gates pass:
node scripts/email-routing-cutover.mjs cutover
```

`status` is read-only and reports both required recipients. `prepare` registers the destination if absent and creates missing forwarding rules only after destination verification. It checks both addresses for conflicts before creating any rules, preserves correct existing rules, and can be rerun after a partial API failure. The historical archive gate for both mailboxes is an operator prerequisite; this CLI does not export or verify mailbox history.

`cutover` snapshots all pages of the zone's DNS records with restrictive local permissions. It calls the current [Cloudflare Email Routing enable API](https://developers.cloudflare.com/api/resources/email_routing/subresources/dns/methods/create/). This call adds and locks routing DNS records and can itself change DNS; a later error must not be interpreted as an automatic rollback. Inspect actual DNS against the saved backup after any error.

Explicit legacy deletions require verified forwarding rules for both recipients, enabled routing, at least two distinct Cloudflare MX servers, and a root SPF configuration that converges to one Cloudflare-authorizing record after removal of only a recognized Hostinger-only SPF. Unknown or duplicate SPF records require review. Resend subdomain MX/SPF and all unrelated records are preserved. Routing API read failures abort rather than being treated as disabled routing.

After cutover, compare public MX/SPF through two resolvers. Send an independent external message to each of `hello@chatvice.app` and `master@chatvice.app` and verify both forwarded messages at Gmail; recheck application sending and SPF/DKIM/DMARC. Keep Hostinger live during propagation and export any late arrivals before retirement. Cloudflare forwarding does not move historical email into Gmail. Do not enable catch-all or cancel legacy services until the full acceptance checks pass.

## Observed dashboard cutover path

On 21 October 2026 the authenticated dashboard rejected **Activate** while the two existing Hostinger apex MX records remained: `Existing non-Cloudflare MX records conflict with Email Routing. Remove or update them and try again.` The limited token used for preparation grants only **Email Routing Rules: Edit** on `chatvice.app`; it cannot execute the CLI's DNS cutover mode. Both exact forwarding rules were successfully created and read back before domain activation.

For a supervised dashboard cutover after both complete archives and a fresh full-zone export are verified:

1. Stage the three MX records and priorities displayed by Cloudflare. Retain the old Hostinger MX while preparing these replacements, so the domain is never left without MX records.
2. Replace only the known Hostinger-only root SPF with the displayed Cloudflare SPF. Keep exactly one root SPF and preserve Resend's separate sending-domain MX/SPF and DKIM records.
3. Confirm the exact two Hostinger apex MX records and remove only those records. Complete any required action-time deletion confirmation before submitting the final delete.
4. Activate routing promptly, inspect the resulting DNS and routing status, and verify the Cloudflare DKIM record. If activation fails after legacy MX removal, restore the saved Hostinger MX and SPF rather than leaving an unverified route in production.
5. Verify public MX/SPF with two resolvers and send separate tests for hello and master from an account **different from the destination Gmail**. Some providers suppress messages forwarded back to the sending account; see [Cloudflare's routing test instructions](https://developers.cloudflare.com/email-service/get-started/route-emails/#test-your-routing-rule).

The observed dashboard conflict does not establish the behavior of every API activation endpoint. Do not claim that the CLI DNS path has been validated against production merely because rule preparation and local tests passed. Keep Hostinger available through propagation and final mailbox synchronization.

## Production verification, 21 October 2026

After explicit approval of the exact two legacy MX deletions, the dashboard activated routing and published the Cloudflare DKIM record. Google and Cloudflare public DNS resolvers returned exactly the three displayed Cloudflare apex MX records, one root SPF authorizing Cloudflare, and the Cloudflare DKIM. Resend's sending-subdomain MX/SPF and DKIM and the existing DMARC policy were preserved.

Separate test messages from an independent Gmail sender to `hello@chatvice.app` and `master@chatvice.app` both arrived in the destination Gmail inbox. Received and forwarding headers identified Cloudflare, Gmail reported SPF/DKIM/DMARC passes, and the Cloudflare activity log showed both messages as **Forwarded**. Both exact rules are Active; catch-all remains disabled. The overview initially showed Syncing even after live forwarding succeeded, so dashboard propagation status and delivery evidence must be reported separately.

Verified local archives cover 833 hello messages and 14 master messages, including attachments. A post-cutover inventory check still found 831 hello Inbox messages plus 2 Sent messages and the same 14 master Inbox conversation IDs. Keep Hostinger accessible through a final propagation check and archive any late arrivals before retiring it. Historical email has not been imported into Gmail, and this verification does not establish completion of the application-subdomain migrations.
