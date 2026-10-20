# Chatvice Email Routing Cloudflare release gate

**Source:** `hello@chatvice.app` (Hostinger Mail)
**Target:** verified `9dragons.project@gmail.com` via Cloudflare Email Routing
**Outgoing application mail:** Resend on Railway.

Use the existing authenticated Cloudflare browser, or a token held only in a protected local environment. Never paste tokens into chat, command history, GitHub or logs. API access needs Zone Read, DNS Read/Write, Email Routing Addresses Read/Write, Email Routing Rules Read/Write and Zone Settings Read/Write, restricted to the intended account and zone wherever supported.

## Before any production MX change

1. Export every Hostinger folder, message and attachment. Verify folder counts, RFC822 byte sizes, Message-IDs and checksums; decode and verify attachments. A partial archive does not pass this gate. Keep Hostinger available for a final synchronization of messages received during the export.
2. Verify the Gmail destination and the single exact `hello@chatvice.app` forwarding rule. Reject rules containing extra matchers or actions. A destination registration or verification email alone is not proof of forwarding.
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

`status` is read-only. `prepare` registers the destination if absent and creates a forwarding rule only after destination verification. The historical archive gate is an operator prerequisite; this CLI does not export or verify mailbox history.

`cutover` snapshots all pages of the zone's DNS records with restrictive local permissions. It calls the current [Cloudflare Email Routing enable API](https://developers.cloudflare.com/api/resources/email_routing/subresources/dns/methods/create/). This call adds and locks routing DNS records and can itself change DNS; a later error must not be interpreted as an automatic rollback. Inspect actual DNS against the saved backup after any error.

Explicit legacy deletions require a verified forwarding rule, enabled routing, at least two distinct Cloudflare MX servers, and a root SPF configuration that converges to one Cloudflare-authorizing record after removal of only a recognized Hostinger-only SPF. Unknown or duplicate SPF records require review. Resend subdomain MX/SPF and all unrelated records are preserved. Routing API read failures abort rather than being treated as disabled routing.

After cutover, compare public MX/SPF through two resolvers. Send an independent external message to `hello@chatvice.app` and verify the forwarded message at Gmail; recheck application sending and SPF/DKIM/DMARC. Keep Hostinger live during propagation and export any late arrivals before retirement. Cloudflare forwarding does not move historical email into Gmail. Do not enable catch-all or cancel legacy services until the full acceptance checks pass.
