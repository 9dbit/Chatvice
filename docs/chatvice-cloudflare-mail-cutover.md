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
