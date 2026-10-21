#!/usr/bin/env node
/**
 * Chatvice Email Routing cutover guard.
 * No live mutations by default. A validated Cloudflare API token is supplied
 * through a process environment variable on an authorized machine, NEVER a
 * command argument, tracked file, chat message, or log.
 *
 * Modes:
 *   status   read Cloudflare configuration (default)
 *   prepare  create destination for verification, then exact-match rules
 *   cutover  back up DNS and enable Cloudflare Email Routing, retiring only
 *            known Hostinger root MX after verifying Cloudflare routing first
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

export const DOMAIN = "chatvice.app";
export const SOURCES = Object.freeze(["hello@chatvice.app", "master@chatvice.app"]);
export const DEST = "9dragons.project@gmail.com";
const API = "https://api.cloudflare.com/client/v4";

export const isHostingerMX = (r) =>
  r?.type === "MX" && r?.name?.toLowerCase() === DOMAIN &&
  ["mx1.hostinger.com", "mx2.hostinger.com"].includes(String(r.content || "").replace(/\.$/, "").toLowerCase());
export const isCloudflareMX = (r) =>
  r?.type === "MX" && r?.name?.toLowerCase() === DOMAIN &&
  /^route[123]\.mx\.cloudflare\.net\.?$/i.test(String(r.content || ""));
export const hostingerOnlySPF = (r) =>
  r?.type === "TXT" && r?.name?.toLowerCase() === DOMAIN &&
  /^v=spf1\s+include:_spf\.mail\.hostinger\.com\s+~all$/i.test(String(r.content || "").replace(/^"|"$/g, ""));

export function exactForwardRule(rule, source = SOURCES[0], destination = DEST) {
  return !!rule?.enabled &&
    Array.isArray(rule.matchers) && rule.matchers.length === 1 && rule.matchers.every(m =>
      m.type === "literal" && m.field === "to" && m.value?.toLowerCase() === source) &&
    Array.isArray(rule.actions) && rule.actions.length === 1 && rule.actions.every(a =>
      a.type === "forward" && Array.isArray(a.value) &&
      a.value.length === 1 && a.value[0]?.toLowerCase() === destination);
}
export function cutoverReady({ destinations, rules }) {
  if (!destinations.some(d => d.email?.toLowerCase() === DEST && d.verified)) {
    return { ready: false, reason: "GMAIL_DESTINATION_UNVERIFIED" };
  }
  for (const source of SOURCES) {
    const matches = rulesForSource(rules, source);
    if (matches.length !== 1 || !exactForwardRule(matches[0], source)) {
      return { ready: false, reason: "EXACT_FORWARDING_RULE_MISSING_OR_CONFLICTING", source };
    }
  }
  return { ready: true, reason: "VERIFIED_FORWARDING" };
}

const rulesForSource = (rules, source) => rules.filter(r =>
  r.matchers?.some(m => m.type === "literal" && m.field === "to" && m.value?.toLowerCase() === source));

export function forwardingPlan(rules) {
  const missing = [];
  // Inspect both recipients before creating anything. A conflict on either
  // address must not leave a partially prepared configuration.
  for (const source of SOURCES) {
    const matches = rulesForSource(rules, source);
    if (!matches.length) missing.push(source);
    else if (matches.length !== 1 || !exactForwardRule(matches[0], source)) {
      throw new Error("Existing conflicting " + source + " rule requires manual review");
    }
  }
  return missing;
}
export function canRemoveOldMX({ routingEnabled, dns }) {
  const servers = new Set(dns.filter(isCloudflareMX).map(r =>
    String(r.content).replace(/\.$/, "").toLowerCase()));
  return routingEnabled && servers.size >= 2;
}

export const isRootMX = r => r?.type === "MX" && r?.name?.toLowerCase() === DOMAIN;
const rootSPF = dns => dns.filter(r => r.type === "TXT" && r.name?.toLowerCase() === DOMAIN &&
  /^v=spf1(?:\s|$)/i.test(String(r.content || "").replace(/^"|"$/g, "")));
export function routingSPFReady(dns) {
  const records = rootSPF(dns);
  return records.length === 1 && /(?:^|\s)include:_spf\.mx\.cloudflare\.net(?:\s|$)/i.test(
    String(records[0].content).replace(/^"|"$/g, ""));
}

async function cloudflare(method, endpoint, payload, token, fetcher = fetch) {
  const resp = await fetcher(API + endpoint, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  let body;
  try { body = await resp.json(); } catch { throw new Error("Cloudflare returned a non-JSON response"); }
  if (!resp.ok || !body?.success) {
    const codes = (body?.errors || []).map(e => e.code).filter(Boolean).slice(0, 3);
    throw new Error("Cloudflare API rejected request: HTTP " + resp.status + " codes=" + codes.join(","));
  }
  return body;
}

async function paginated(endpoint, token, api = cloudflare) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const glue = endpoint.includes("?") ? "&" : "?";
    const r = await api("GET", endpoint + glue + "per_page=50&page=" + page, null, token);
    if (!Array.isArray(r.result)) throw new Error("Unexpected Cloudflare listing");
    all.push(...r.result);
    if (!r.result_info?.total_pages || page >= r.result_info.total_pages) return all;
  }
  throw new Error("Cloudflare listing exceeds safety pagination limit");
}

export async function state(token, api = cloudflare) {
  const zones = await api("GET", "/zones?name=" + encodeURIComponent(DOMAIN), null, token);
  const choices = (zones.result || []).filter(z => z.name === DOMAIN);
  if (choices.length !== 1 || !choices[0].id || !choices[0].account?.id) {
    throw new Error("No uniquely accessible Cloudflare DNS zone for chatvice.app");
  }
  const zone = choices[0];
  const zid = zone.id;
  const aid = zone.account.id;
  const [addresses, rules, dns, routing] = await Promise.all([
    paginated("/accounts/" + aid + "/email/routing/addresses", token, api),
    paginated("/zones/" + zid + "/email/routing/rules", token, api),
    // A rollback snapshot must include subdomains, Resend and DKIM as well.
    paginated("/zones/" + zid + "/dns_records", token, api),
    api("GET", "/zones/" + zid + "/email/routing", null, token),
  ]);
  return { zoneId: zid, accountId: aid, destinations: addresses, rules, dns, routingEnabled: !!routing.result?.enabled };
}

async function snapshotDNS(s) {
  const folder = path.join(os.homedir(), "Documents", "Chatvice", "Cloudflare Email Migration 20261020");
  await fs.mkdir(folder, { recursive: true, mode: 0o700 });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = path.join(folder, "cloudflare-dns-before-" + ts + ".json");
  // Snapshot stays on authorized machine, does not enter GitHub/chat.
  await fs.writeFile(filename, JSON.stringify({
    timestamp: new Date().toISOString(),
    zone: DOMAIN,
    dns: s.dns,
  }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return filename;
}

export async function run(mode, token) {
  if (!["status", "prepare", "cutover"].includes(mode)) throw new Error("Invalid mode");
  if (typeof token !== "string" || !token.trim()) throw new Error("CLOUDFLARE_API_TOKEN_NOT_AVAILABLE");
  let s = await state(token);
  const verified = s.destinations.some(x => x.email?.toLowerCase() === DEST && !!x.verified);
  console.log(JSON.stringify({
    domain: DOMAIN, mode, requiredSources: SOURCES,
    destinationRegistered: s.destinations.some(x => x.email?.toLowerCase() === DEST),
    destinationVerified: verified,
    forwardingReady: cutoverReady(s).ready,
    cloudflareRoutingEnabled: s.routingEnabled,
    cloudflareMXCount: s.dns.filter(isCloudflareMX).length,
    hostingerMXCount: s.dns.filter(isHostingerMX).length,
    rootSPFReady: routingSPFReady(s.dns),
  }));

  if (mode === "status") return;
  if (mode === "prepare") {
    if (!s.destinations.some(x => x.email?.toLowerCase() === DEST)) {
      await cloudflare("POST", "/accounts/" + s.accountId + "/email/routing/addresses", { email: DEST }, token);
      console.log("DESTINATION_VERIFICATION_SENT: approve the message in the destination Gmail inbox.");
      return;
    }
    if (!verified) {
      console.log("WAIT_FOR_DESTINATION_VERIFICATION; no routing or DNS changes made.");
      return;
    }
    if (cutoverReady(s).ready) {
      console.log("EXACT_FORWARDING_RULES_ALREADY_READY");
      return;
    }
    for (const source of forwardingPlan(s.rules)) {
      await cloudflare("POST", "/zones/" + s.zoneId + "/email/routing/rules", {
        name: "Forward " + source + " to verified Gmail",
        enabled: true,
        matchers: [{ type: "literal", field: "to", value: source }],
        actions: [{ type: "forward", value: [DEST] }],
      }, token);
    }
    console.log("FORWARD_RULES_CREATED; DNS unchanged. Run status before cutover.");
    return;
  }

  if (!cutoverReady(s).ready) {
    const readiness = cutoverReady(s);
    throw new Error("CUTOVER_BLOCKED: " + readiness.reason + (readiness.source ? " " + readiness.source : ""));
  }
  const nonstandard = s.dns.filter(r => isRootMX(r) && !isHostingerMX(r) && !isCloudflareMX(r));
  if (nonstandard.length) throw new Error("CUTOVER_BLOCKED: unrecognized root MX provider");
  const snapshot = await snapshotDNS(s);
  console.log("DNS_BACKUP_SAVED_LOCALLY:", snapshot);
  if (!s.routingEnabled || s.dns.filter(isCloudflareMX).length < 2) {
    await cloudflare("POST", "/zones/" + s.zoneId + "/email/routing/dns", { name: DOMAIN }, token);
    s = await state(token);
  }
  if (!cutoverReady(s).ready || !canRemoveOldMX(s)) {
    throw new Error("CUTOVER_PARTIAL: Cloudflare Email Routing MX not ready; no explicit legacy deletions attempted; inspect DNS against backup");
  }
  // Only the known Hostinger-only SPF may be retired. Refuse to remove MX
  // if that would still leave missing, duplicate or unknown SPF records.
  if (!routingSPFReady(s.dns.filter(r => !hostingerOnlySPF(r)))) {
    throw new Error("CUTOVER_PARTIAL: root SPF requires review; no explicit legacy deletions attempted; inspect DNS against backup");
  }
  // Only remove exact legacy Hostinger MX and SPF. No other DNS records
  // (DKIM, Resend, web, API, verification tokens) are modified.
  for (const record of s.dns.filter(isHostingerMX)) {
    await cloudflare("DELETE", "/zones/" + s.zoneId + "/dns_records/" + record.id, null, token);
  }
  s = await state(token);
  const cfSPFExists = s.dns.some(r =>
    r.type === "TXT" && r.name?.toLowerCase() === DOMAIN &&
    String(r.content || "").includes("include:_spf.mx.cloudflare.net"));
  if (cfSPFExists && canRemoveOldMX(s)) {
    for (const record of s.dns.filter(hostingerOnlySPF)) {
      await cloudflare("DELETE", "/zones/" + s.zoneId + "/dns_records/" + record.id, null, token);
    }
  }
  s = await state(token);
  if (!cutoverReady(s).ready || !canRemoveOldMX(s) || s.dns.some(isHostingerMX) || !routingSPFReady(s.dns)) {
    throw new Error("DNS_CUTOVER_INCOMPLETE: verify MX before disconnecting Hostinger");
  }
  console.log("DNS_CUTOVER_APPLIED; MUST VERIFY live Gmail delivery from independent sender.");
  console.log("HOSTINGER_MAILBOX_NOT_DELETED: retain as historical archive until separately exported.");
}

const isEntry = process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isEntry) {
  run(process.argv[2] || "status", process.env.CLOUDFLARE_API_TOKEN).catch(e => {
    console.error("CHATVICE_EMAIL_CUTOVER_BLOCKED:", e.message);
    process.exitCode = 1;
  });
}
