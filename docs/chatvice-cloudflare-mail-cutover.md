# Chatvice Email Routing Cloudflare release gate

**Source:** \`hello@chatvice.app\` (Hostinger Mail)
**Target:** verified \`9dragons.project@gmail.com\` via Cloudflare Email Routing
**Outgoing application mail:** Resend on Railway, unchanged.

This script runs on a machine that already has a zone-scoped Cloudflare API token. **Never paste a token into a chat, shell command history, GitHub, CI logs or a repository.** Required permissions include Zone Read, DNS Read/Write, Email Routing Addresses Read/Write, Email Routing Rules Read/Write and Zone Settings Read/Write.

Commands (run locally in a protected shell environment):
\`\`\`bash
node scripts/email-routing-cutover.mjs status
node scripts/email-routing-cutover.mjs prepare
# Verify the Cloudflare Email Routing destination confirmation message in Gmail.
node scripts/email-routing-cutover.mjs prepare
node scripts/email-routing-cutover.mjs status
node scripts/email-routing-cutover.mjs cutover
\`\`\`

\`status\` is read-only. The first \`prepare\` sends verification if needed; the second sets a specific verified forwarding rule. \`cutover\` saves a locally permission-restricted Cloudflare DNS backup, enables Cloudflare routing and only retires known Hostinger MX records after observing at least two Cloudflare MX records and verified/active forwarding.

Cloudflare DNS activation might fail if the existing Hostinger DNS cannot be replaced automatically. If so, the tool fails closed and retains Hostinger records rather than guessing. Before declaring production ready, check public MX and SPF using two resolvers, send an independent external email to \`hello@chatvice.app\`, confirm receipt at Gmail and ensure replies/outbound Resend still work.

The Hostinger mailbox contains historic mail. Do not delete/cancel it before an IMAP/RFC822 export and completeness check. This tool does NOT access or modify past messages. Do not enable catch-all or change other subdomains.
