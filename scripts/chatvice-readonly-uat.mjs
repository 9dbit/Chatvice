#!/usr/bin/env node
/**
 * Read-only public post-cutover smoke/UAT. All requests are GET with no cookies
 * or credentials. This does NOT validate authenticated business journeys,
 * financial callbacks, real media completeness, or background execution.
 *
 * node scripts/chatvice-readonly-uat.mjs --base https://chatvice.app --www https://www.chatvice.app
 */
const args = process.argv.slice(2);
function readArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
const baseArg = readArg("--base");
if (!baseArg) {
  console.error("Usage: node scripts/chatvice-readonly-uat.mjs --base https://chatvice.app [--www https://www.chatvice.app]");
  process.exit(2);
}
function safeOrigin(raw) {
  try {
    const u = new URL(raw);
    if (u.username || u.password || u.search || u.hash) return null;
    if (u.protocol !== "https:" && !(u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname))) return null;
    return u.origin;
  } catch {
    return null;
  }
}
const base = safeOrigin(baseArg);
const www = readArg("--www") ? safeOrigin(readArg("--www")) : null;
if (!base || (readArg("--www") && !www)) {
  console.error("Invalid URL. Require HTTPS, or localhost HTTP for local staging.");
  process.exit(2);
}
const cases = [
  { id: "homepage", origin: base, path: "/", allowed: [200] },
  { id: "health", origin: base, path: "/api/health", allowed: [200], health: true },
  { id: "merchant-auth-guard", origin: base, path: "/api/merchant/profile", allowed: [401] },
  { id: "admin-auth-guard", origin: base, path: "/api/admin/me", allowed: [401] },
  { id: "topup-requests-guard", origin: base, path: "/api/merchant/topup-requests", allowed: [401] },
  { id: "topup-token-missing", origin: base, path: "/api/topup/verify", allowed: [400] },
  { id: "topup-token-malformed", origin: base, path: "/api/topup/verify?token=not-a-valid-jwt", allowed: [401] },
  { id: "missing-media-object", origin: base, path: "/storage/uploads/__chatvice_uat_nonexistent_object_20261019.png", allowed: [404] },
];
if (www) cases.splice(2, 0, { id: "www-health", origin: www, path: "/api/health", allowed: [200], health: true });
const results = [];
for (const t of cases) {
  let status = null;
  let details = null;
  let ok = false;
  try {
    const response = await fetch(new URL(t.path, t.origin), {
      method: "GET",
      redirect: "follow",
      headers: { "Cache-Control": "no-store", "User-Agent": "Chatvice-ReadOnly-UAT/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    status = response.status;
    ok = t.allowed.includes(status);
    if (t.health && ok) {
      const data = await response.json().catch(() => null);
      ok = !!data && data.status === "ok" && data.database === "connected";
      details = ok ? "status=ok database=connected" : "health payload not healthy";
    }
  } catch (e) {
    details = "network error: " + (e && e.name ? e.name : "unknown");
  }
  const result = { id: t.id, status, verdict: ok ? "PASS" : "FAIL", ...(details ? { details } : {}) };
  results.push(result);
  console.log(result.verdict + " " + result.id + " " + (status === null ? "NO_RESPONSE" : "HTTP " + status) + (details ? " " + details : ""));
}
const failures = results.filter(x => x.verdict !== "PASS").length;
console.log("TOTAL=" + results.length + " PASS=" + (results.length - failures) + " FAIL=" + failures);
if (failures) process.exitCode = 1;
