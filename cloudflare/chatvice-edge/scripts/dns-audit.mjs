#!/usr/bin/env node
// Read-only public DNS audit. This script never changes DNS or accesses mail.
import dns from "node:dns/promises";

const domain = "chatvice.app";
const resolver = new dns.Resolver();
resolver.setServers(["1.1.1.1", "8.8.8.8"]);
const safely = async (fn) => { try { return await fn(); } catch { return []; } };
const hosts = ["chatvice.app", "www.chatvice.app", "pay.chatvice.app", "chat.chatvice.app", "blaster.chatvice.app", "web.chatvice.app"];
console.log("Chatvice Cloudflare migration DNS read-only report");
const nameservers = await safely(() => resolver.resolveNs(domain));
console.log("Authoritative NS:", nameservers.join(", ") || "UNKNOWN");
for (const host of hosts) {
  const addr = await safely(() => resolver.resolve4(host));
  const cname = await safely(() => resolver.resolveCname(host));
  console.log(host, "A", addr.join(","), "CNAME", cname.join(","));
}
const mx = await safely(() => resolver.resolveMx(domain));
console.log("Email MX:", mx.map(x => String(x.priority) + " " + x.exchange).join(",") || "UNKNOWN");
const txt = (await safely(() => resolver.resolveTxt(domain))).map(x => x.join(""));
const dmarc = (await safely(() => resolver.resolveTxt("_dmarc." + domain))).map(x => x.join(""));
console.log("SPF:", txt.filter(x => x.startsWith("v=spf1")).join(" | ") || "MISSING");
console.log("DMARC:", dmarc.filter(x => x.startsWith("v=DMARC1")).join(" | ") || "MISSING");
// Do not print ownership-verification TXT tokens, mailboxes or private data.
const hostingerMail = mx.some(x => x.exchange.toLowerCase().includes("hostinger"));
const legacyReplit = hosts.slice(2).filter(h => h !== "web.chatvice.app");
console.log("Email cutover:", hostingerMail ? "NOT_COMPLETE_HOSTINGER_MX_ACTIVE" : "MX_NO_LONGER_HOSTINGER_REVIEW_PROVIDER");
console.log("Subdomain migration requires HTTPS health/UAT; DNS alone is not proof.");
