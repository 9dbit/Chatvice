import crypto, { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "crypto";
import { promises as dnsPromises } from "dns";
import net from "net";
import { storage } from "./storage";
import type { CustomDataIntent, CustomDataSource } from "@shared/schema";

// Shape of one entry in CustomDataIntent.requiredFields (jsonb column).
export interface RequiredFieldDef {
  key: string;
  label?: string;
  type?: "text" | "number" | string;
  required?: boolean;
}

function parseRequiredFields(raw: unknown): RequiredFieldDef[] {
  if (!Array.isArray(raw)) return [];
  const out: RequiredFieldDef[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && typeof (item as any).key === "string") {
      const f = item as Record<string, unknown>;
      out.push({
        key: String(f.key),
        label: typeof f.label === "string" ? f.label : undefined,
        type: typeof f.type === "string" ? f.type : "text",
        required: typeof f.required === "boolean" ? f.required : true,
      });
    }
  }
  return out;
}

// ── API key encryption (AES-256-GCM) ──────────────────────────────────────
// We derive the encryption key from the same SESSION_SECRET that already
// protects sessions, so deployments don't have to provision an extra secret.
// If a dedicated CUSTOM_DATA_ENC_KEY is set, prefer that.
function getEncKey(): Buffer {
  const seed = process.env.CUSTOM_DATA_ENC_KEY || process.env.SESSION_SECRET;
  if (!seed) {
    throw new Error("CUSTOM_DATA_ENC_KEY (or SESSION_SECRET) must be set to use the custom data source connector.");
  }
  return scryptSync(seed, "chatvice-custom-data-source", 32);
}

export function encryptApiKey(plain: string): string {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptApiKey(encoded: string | null | undefined): string {
  if (!encoded) return "";
  const parts = encoded.split(":");
  if (parts.length !== 3) return "";
  try {
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = createDecipheriv("aes-256-gcm", getEncKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return "";
  }
}

export function generateApiKey(): string {
  // Format: cv_live_<48 hex chars> — easy to recognise and grep for in logs
  return "cv_live_" + randomBytes(24).toString("hex");
}

export function maskValue(v: string | undefined | null): string {
  if (!v) return "";
  const s = String(v);
  if (s.length <= 4) return "*".repeat(s.length);
  return s.slice(0, 2) + "***" + s.slice(-2);
}

// ── SSRF protection ───────────────────────────────────────────────────────
// Block requests targeting localhost, link-local, or private network ranges
// to prevent merchants from pointing the connector at internal services or
// cloud metadata endpoints.
const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,        // link-local (incl. AWS/GCP metadata 169.254.169.254)
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^metadata\.google\.internal$/i,
];

export function validateBaseUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  if (!rawUrl) return { ok: false, error: "Base URL belum diisi." };
  let u: URL;
  try { u = new URL(rawUrl); } catch { return { ok: false, error: "Base URL tidak valid." }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { ok: false, error: "Base URL harus menggunakan http:// atau https://." };
  }
  if (process.env.NODE_ENV === "production" && u.protocol !== "https:") {
    return { ok: false, error: "Base URL wajib menggunakan https:// di production." };
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  for (const pat of PRIVATE_HOST_PATTERNS) {
    if (pat.test(host)) {
      return { ok: false, error: `Host "${host}" tidak diizinkan (alamat lokal/internal diblokir untuk keamanan).` };
    }
  }
  // If the host is a literal IP, also check it directly.
  if (net.isIP(host) && isPrivateIp(host)) {
    return { ok: false, error: `IP "${host}" termasuk alamat internal/private.` };
  }
  return { ok: true, url: u };
}

// True for any IP that is private, loopback, link-local, multicast, broadcast,
// or otherwise unsafe for outbound merchant calls.
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(n => parseInt(n, 10));
    if (parts.length !== 4 || parts.some(p => Number.isNaN(p))) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast/reserved/broadcast
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("ff")) return true; // multicast
    // IPv4-mapped (::ffff:127.0.0.1) → check inner
    const m = lower.match(/^::ffff:([0-9.]+)$/);
    if (m && net.isIPv4(m[1])) return isPrivateIp(m[1]);
    return false;
  }
  return true;
}

// Resolve a hostname and assert no resolved IP is private. Defends against
// DNS rebinding and merchant-controlled domains pointing at internal IPs.
async function assertPublicHost(host: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (net.isIP(host)) {
    return isPrivateIp(host) ? { ok: false, error: `IP "${host}" termasuk alamat internal/private.` } : { ok: true };
  }
  try {
    const records = await dnsPromises.lookup(host, { all: true, verbatim: true });
    for (const r of records) {
      if (isPrivateIp(r.address)) {
        return { ok: false, error: `Host "${host}" mengarah ke IP internal (${r.address}).` };
      }
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: `Tidak bisa resolve host "${host}": ${err?.message || "DNS error"}` };
  }
}

// ── Per-merchant rate limiter & cache (in-memory) ─────────────────────────
const rateBuckets = new Map<string, number[]>();
const responseCache = new Map<string, { at: number; status: number; body: any }>();

function rateLimitOk(merchantId: string, perMin: number): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const arr = (rateBuckets.get(merchantId) || []).filter(t => t > windowStart);
  if (arr.length >= perMin) {
    rateBuckets.set(merchantId, arr);
    return false;
  }
  arr.push(now);
  rateBuckets.set(merchantId, arr);
  return true;
}

function cacheKey(intentId: string, fields: Record<string, string>): string {
  const sorted = Object.keys(fields).sort().map(k => `${k}=${fields[k]}`).join("&");
  return `${intentId}|${sorted}`;
}

// Walk a JSON value with a dot-path like "data.status" or "amount".
function getPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

// Replace {field} placeholders in a template with values, handling missing
// gracefully ("(tidak diketahui)").
export function renderTemplate(template: string, data: any, fallback = "(tidak diketahui)"): string {
  if (!template) {
    try { return JSON.stringify(data); } catch { return String(data); }
  }
  return template.replace(/\{([\w\.]+)\}/g, (_m, key) => {
    const v = getPath(data, key);
    if (v === undefined || v === null || v === "") return fallback;
    if (typeof v === "object") {
      try { return JSON.stringify(v); } catch { return fallback; }
    }
    return String(v);
  });
}

// ── Main connector entry ──────────────────────────────────────────────────
export interface ConnectorResult {
  ok: boolean;
  text: string;          // Customer-facing text to display
  httpStatus: number;
  latencyMs: number;
  rawData?: any;
  errorMessage?: string;
}

export async function executeIntentLookup(opts: {
  merchantId: string;
  source: CustomDataSource;
  intent: CustomDataIntent;
  fields: Record<string, string>;
  sessionId?: string;
}): Promise<ConnectorResult> {
  const { merchantId, source, intent, fields, sessionId } = opts;
  const t0 = Date.now();
  const userFacingError = "Maaf, sistem sedang sibuk. Silakan coba lagi sebentar atau hubungi admin.";

  // Server-side validation: every required field for this intent must be present
  // and non-empty BEFORE we dispatch to the merchant's panel API. The AI is
  // instructed to collect them but we never trust the prompt alone.
  const requiredDefs = parseRequiredFields(intent.requiredFields);
  const missing = requiredDefs
    .filter(f => f.required !== false)
    .map(f => f.key)
    .filter(k => !fields[k] || String(fields[k]).trim() === "");
  if (missing.length > 0) {
    const errMsg = `Missing required fields: ${missing.join(", ")}`;
    await logAudit({ merchantId, intent, sessionId, fields, httpStatus: 0, latencyMs: 0, success: false, errorMessage: errMsg, endpointUrl: null, httpMethod: intent.httpMethod || "GET" });
    return { ok: false, text: `Kakak, untuk cek ${intent.name.toLowerCase()} saya masih perlu data: ${missing.join(", ")}. Boleh dilengkapi dulu ya.`, httpStatus: 0, latencyMs: 0, errorMessage: errMsg };
  }

  // SSRF guard on base URL — string check + DNS resolution check
  const urlCheck = validateBaseUrl(source.baseUrl || "");
  if (!urlCheck.ok) {
    await logAudit({ merchantId, intent, sessionId, fields, httpStatus: 0, latencyMs: 0, success: false, errorMessage: urlCheck.error, endpointUrl: null, httpMethod: intent.httpMethod || "GET" });
    return { ok: false, text: userFacingError, httpStatus: 0, latencyMs: 0, errorMessage: urlCheck.error };
  }
  const dnsCheck = await assertPublicHost(urlCheck.url.hostname.replace(/^\[|\]$/g, ""));
  if (!dnsCheck.ok) {
    await logAudit({ merchantId, intent, sessionId, fields, httpStatus: 0, latencyMs: 0, success: false, errorMessage: dnsCheck.error, endpointUrl: null, httpMethod: intent.httpMethod || "GET" });
    return { ok: false, text: userFacingError, httpStatus: 0, latencyMs: 0, errorMessage: dnsCheck.error };
  }

  // Rate limit
  if (!rateLimitOk(merchantId, source.rateLimitPerMin || 60)) {
    await logAudit({ merchantId, intent, sessionId, fields, httpStatus: 429, latencyMs: 0, success: false, errorMessage: "Rate limit exceeded", endpointUrl: null, httpMethod: intent.httpMethod || "GET" });
    return { ok: false, text: userFacingError, httpStatus: 429, latencyMs: 0, errorMessage: "Rate limit exceeded" };
  }

  // Cache lookup
  const ckey = cacheKey(intent.id, fields);
  const ttl = (source.cacheTtlSec || 30) * 1000;
  const cached = responseCache.get(ckey);
  if (cached && Date.now() - cached.at < ttl) {
    const text = renderTemplate(intent.responseTemplate || "", cached.body);
    return { ok: true, text, httpStatus: cached.status, latencyMs: 0, rawData: cached.body };
  }

  // Build URL: substitute {field} placeholders in path, then append remaining
  // fields as query params for GET (POST sends them as JSON body).
  const baseUrl = (source.baseUrl || "").replace(/\/+$/, "");
  const usedKeys = new Set<string>();
  let path = intent.endpointPath || "";
  path = path.replace(/\{([\w]+)\}/g, (_m, key) => {
    usedKeys.add(key);
    return encodeURIComponent(fields[key] ?? "");
  });
  if (!path.startsWith("/")) path = "/" + path;
  const method = (intent.httpMethod || "GET").toUpperCase();
  let url = baseUrl + path;
  let body: string | undefined;
  if (method === "GET") {
    const qs = Object.keys(fields).filter(k => !usedKeys.has(k)).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(fields[k])}`).join("&");
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  } else {
    body = JSON.stringify(fields);
  }

  const apiKey = decryptApiKey(source.apiKeyEncrypted);
  const headerName = source.headerAuthName || "X-API-Key";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "Chatvice-Connector/1.0",
  };
  if (apiKey) headers[headerName] = apiKey;

  let httpStatus = 0;
  let json: any = null;
  let errorMessage: string | undefined;
  let parseFailed = false;
  try {
    // redirect: "manual" prevents merchant endpoints from chaining into
    // internal hosts via 3xx responses (open-redirect SSRF defence).
    const resp = await fetch(url, { method, headers, body, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if (resp.status >= 300 && resp.status < 400) {
      const latencyNow = Date.now() - t0;
      const errMsg = `Redirect ${resp.status} from panel — merchant endpoints must respond directly (no 3xx).`;
      await logAudit({ merchantId, intent, sessionId, fields, httpStatus: resp.status, latencyMs: latencyNow, success: false, errorMessage: errMsg, endpointUrl: url, httpMethod: method });
      return { ok: false, text: userFacingError, httpStatus: resp.status, latencyMs: latencyNow, errorMessage: errMsg };
    }
    httpStatus = resp.status;
    const txt = await resp.text();
    if (txt) {
      try { json = JSON.parse(txt); } catch {
        // Spec: malformed JSON must degrade gracefully — do NOT pretend success.
        parseFailed = true;
        errorMessage = "Invalid JSON response from panel";
      }
    }
    if (!resp.ok) errorMessage = errorMessage || `HTTP ${httpStatus}`;
  } catch (err: any) {
    errorMessage = err?.name === "TimeoutError" ? "Request timeout" : (err?.message || "Network error");
  }
  const latencyMs = Date.now() - t0;
  const success = httpStatus >= 200 && httpStatus < 300 && !!json && !parseFailed;

  await logAudit({ merchantId, intent, sessionId, fields, httpStatus, latencyMs, success, errorMessage, endpointUrl: url, httpMethod: method });

  if (!success) {
    return { ok: false, text: userFacingError, httpStatus, latencyMs, errorMessage };
  }

  responseCache.set(ckey, { at: Date.now(), status: httpStatus, body: json });
  // Prevent unbounded growth
  if (responseCache.size > 5000) {
    const cutoff = Date.now() - ttl;
    responseCache.forEach((v, k) => { if (v.at < cutoff) responseCache.delete(k); });
  }

  const text = renderTemplate(intent.responseTemplate || "", json);
  return { ok: true, text, httpStatus, latencyMs, rawData: json };
}

async function logAudit(opts: {
  merchantId: string;
  intent: CustomDataIntent;
  sessionId?: string;
  fields: Record<string, string>;
  httpStatus: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  endpointUrl?: string | null;
  httpMethod?: string | null;
}): Promise<void> {
  try {
    const masked: Record<string, string> = {};
    for (const k of Object.keys(opts.fields)) masked[k] = maskValue(opts.fields[k]);
    await storage.createCustomDataAuditLog({
      merchantId: opts.merchantId,
      intentId: opts.intent.id,
      intentKey: opts.intent.intentKey,
      sessionId: opts.sessionId || null,
      httpStatus: opts.httpStatus,
      latencyMs: opts.latencyMs,
      success: opts.success,
      errorMessage: opts.errorMessage || null,
      maskedFields: masked,
      endpointUrl: opts.endpointUrl ?? null,
      httpMethod: opts.httpMethod ?? null,
    });
  } catch (err) {
    console.error("[CustomConnector] Audit log failed:", err);
  }
}

// ── Default intents (seeded for new merchants on first save) ──────────────
export const DEFAULT_INTENTS: Array<Omit<import("@shared/schema").InsertCustomDataIntent, "sourceId">> = [
  {
    intentKey: "deposit_status",
    name: "Cek Status Deposit",
    description: "Customer menanyakan status deposit / topup mereka.",
    triggerKeywords: "depo,deposit,top up,topup,dp masuk,depo belum,depo udah,cek depo,status depo,sudah masuk,belum masuk,saldo masuk,konfirmasi pembayaran,bukti transfer",
    httpMethod: "GET",
    endpointPath: "/deposit/status",
    requiredFields: [
      { key: "username", label: "Username", type: "text", required: true },
      { key: "amount", label: "Nominal Deposit", type: "number", required: true },
      { key: "bank_account", label: "Bank Account Terdaftar", type: "text", required: true },
      { key: "method", label: "Metode Transfer (bank/qris/va/dana/ovo/gopay/linkaja)", type: "text", required: true },
    ],
    responseTemplate: "Status deposit untuk username {username}: {status}. Nominal: {amount}. {message}",
    isEnabled: true,
    sortOrder: 1,
  },
  {
    intentKey: "withdraw_status",
    name: "Cek Status Withdraw",
    description: "Customer menanyakan status penarikan / WD.",
    triggerKeywords: "wd,withdraw,withdrawal,tarik,penarikan,cair,wd belum,wd cair,cek wd,status wd,mau cabut,mau tarik",
    httpMethod: "GET",
    endpointPath: "/withdraw/status",
    requiredFields: [
      { key: "username", label: "Username", type: "text", required: true },
      { key: "amount", label: "Nominal WD", type: "number", required: true },
      { key: "bank_name", label: "Nama Bank Tujuan", type: "text", required: true },
      { key: "account_number", label: "Nomor Rekening Tujuan", type: "text", required: true },
    ],
    responseTemplate: "Status withdraw untuk username {username}: {status}. Nominal: {amount}. {message}",
    isEnabled: true,
    sortOrder: 2,
  },
  {
    intentKey: "turnover_progress",
    name: "Cek Progress Turnover",
    description: "Customer menanyakan progress turnover / TO mereka.",
    triggerKeywords: "turnover,to,progress to,cek to,sisa to,target turnover,bonus belum cair",
    httpMethod: "GET",
    endpointPath: "/turnover/progress",
    requiredFields: [
      { key: "username", label: "Username", type: "text", required: true },
      { key: "last_deposit_amount", label: "Nominal Depo Terakhir (verifikasi)", type: "number", required: true },
    ],
    responseTemplate: "Progress turnover {username}: {progress} dari target {target}. Sisa: {remaining}.",
    isEnabled: true,
    sortOrder: 3,
  },
  {
    intentKey: "last_login_ip",
    name: "Cek IP Login Terakhir",
    description: "Customer menanyakan IP / lokasi login terakhir untuk verifikasi keamanan akun.",
    triggerKeywords: "ip login,login terakhir,akun dibuka dimana,akun saya diakses,riwayat login,siapa buka akun",
    httpMethod: "GET",
    endpointPath: "/account/last-login",
    requiredFields: [
      { key: "username", label: "Username", type: "text", required: true },
      { key: "last_deposit_amount", label: "Nominal Depo Terakhir (verifikasi)", type: "number", required: true },
    ],
    responseTemplate: "Login terakhir untuk {username}: IP {ip} pada {timestamp} dari {location}.",
    isEnabled: true,
    sortOrder: 4,
  },
];

// ── Documentation generators ──────────────────────────────────────────────
export function buildPostmanCollection(opts: {
  merchantName: string;
  source: CustomDataSource;
  intents: CustomDataIntent[];
}): any {
  const { merchantName, source, intents } = opts;
  return {
    info: {
      _postman_id: crypto.randomUUID(),
      name: `Chatvice — ${merchantName} Panel API`,
      description: `REST endpoints that the Chatvice AI agent will call on your panel. Configure your panel to accept these requests and return JSON. The AI provides identification fields collected from the visitor.\n\nAuthentication: send the API key in the \`${source.headerAuthName}\` header on every request.`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      { key: "base_url", value: source.baseUrl || "https://your-panel.example.com", type: "string" },
      { key: "api_key", value: "REPLACE_WITH_YOUR_KEY", type: "string" },
    ],
    auth: {
      type: "apikey",
      apikey: [
        { key: "key", value: source.headerAuthName, type: "string" },
        { key: "value", value: "{{api_key}}", type: "string" },
        { key: "in", value: "header", type: "string" },
      ],
    },
    item: intents.map(intent => {
      const fields: RequiredFieldDef[] = parseRequiredFields(intent.requiredFields);
      const exampleFields: Record<string, string> = {};
      for (const f of fields) {
        exampleFields[f.key] = f.type === "number" ? "100000" : `example_${f.key}`;
      }
      const usedInPath = new Set<string>();
      let path = intent.endpointPath.replace(/\{(\w+)\}/g, (_m, k) => { usedInPath.add(k); return `:${k}`; });
      if (!path.startsWith("/")) path = "/" + path;
      const method = (intent.httpMethod || "GET").toUpperCase();
      const queryFields = Object.keys(exampleFields).filter(k => !usedInPath.has(k));
      const url: any = {
        raw: `{{base_url}}${path}` + (method === "GET" && queryFields.length ? `?${queryFields.map(k => `${k}=${exampleFields[k]}`).join("&")}` : ""),
        host: ["{{base_url}}"],
        path: path.split("/").filter(Boolean),
      };
      if (method === "GET" && queryFields.length) {
        url.query = queryFields.map(k => ({ key: k, value: exampleFields[k] }));
      }
      const req: any = {
        method,
        header: [{ key: source.headerAuthName, value: "{{api_key}}", type: "text" }],
        url,
        description: intent.description || "",
      };
      if (method !== "GET") {
        req.body = { mode: "raw", raw: JSON.stringify(exampleFields, null, 2), options: { raw: { language: "json" } } };
      }
      return {
        name: `${intent.name} (${intent.intentKey})`,
        request: req,
        response: [],
      };
    }),
  };
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function buildHtmlDocs(opts: {
  merchantName: string;
  source: CustomDataSource;
  intents: CustomDataIntent[];
}): string {
  const { merchantName, source, intents } = opts;
  const baseUrl = source.baseUrl || "https://your-panel.example.com";
  const intentsHtml = intents.map(intent => {
    const fields: RequiredFieldDef[] = parseRequiredFields(intent.requiredFields);
    const exampleFields: Record<string, string> = {};
    for (const f of fields) exampleFields[f.key] = f.type === "number" ? "100000" : `example_${f.key}`;
    const method = (intent.httpMethod || "GET").toUpperCase();
    const usedInPath = new Set<string>();
    const renderedPath = intent.endpointPath.replace(/\{(\w+)\}/g, (_m, k) => { usedInPath.add(k); return encodeURIComponent(exampleFields[k] || ""); });
    const queryFields = Object.keys(exampleFields).filter(k => !usedInPath.has(k));
    const exampleUrl = baseUrl.replace(/\/+$/, "") + (renderedPath.startsWith("/") ? renderedPath : "/" + renderedPath) +
      (method === "GET" && queryFields.length ? `?${queryFields.map(k => `${k}=${exampleFields[k]}`).join("&")}` : "");
    const fieldsRows = fields.map(f => `<tr><td><code>${escapeHtml(f.key)}</code></td><td>${escapeHtml(f.label || "")}</td><td>${escapeHtml(f.type || "text")}</td><td>${f.required ? "Yes" : "No"}</td></tr>`).join("");
    const bodyExample = method !== "GET" ? `\n<h4>Request Body (JSON)</h4><pre><code>${escapeHtml(JSON.stringify(exampleFields, null, 2))}</code></pre>` : "";
    return `
    <section class="intent">
      <h2>${escapeHtml(intent.name)} <span class="intent-key">${escapeHtml(intent.intentKey)}</span></h2>
      ${intent.description ? `<p>${escapeHtml(intent.description)}</p>` : ""}
      <p><span class="method method-${method.toLowerCase()}">${method}</span> <code>${escapeHtml(intent.endpointPath)}</code></p>
      <h4>Required Fields</h4>
      <table><thead><tr><th>Key</th><th>Label</th><th>Type</th><th>Required</th></tr></thead><tbody>${fieldsRows || '<tr><td colspan="4">No fields configured</td></tr>'}</tbody></table>
      ${bodyExample}
      <h4>Example Request</h4>
      <pre><code>curl -X ${method} '${escapeHtml(exampleUrl)}' \\
  -H '${escapeHtml(source.headerAuthName)}: YOUR_API_KEY'${method !== "GET" ? ` \\\n  -H 'Content-Type: application/json' \\\n  -d '${escapeHtml(JSON.stringify(exampleFields))}'` : ""}</code></pre>
      <h4>Expected Response (JSON)</h4>
      <p>Return any JSON object. The AI will format the answer using the response template configured in the dashboard:</p>
      <pre><code>${escapeHtml(intent.responseTemplate || "{ ... }")}</code></pre>
    </section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Chatvice Panel API — ${escapeHtml(merchantName)}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 880px; margin: 32px auto; padding: 0 24px; color: #111; line-height: 1.55; }
  h1 { border-bottom: 2px solid #111; padding-bottom: 8px; }
  h2 { margin-top: 32px; }
  code, pre { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; font-size: 13px; }
  th { background: #f0f0f0; }
  .method { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; color: #fff; }
  .method-get { background: #2563eb; } .method-post { background: #16a34a; }
  .intent { border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px; }
  .intent-key { font-size: 12px; background: #eee; padding: 2px 6px; border-radius: 3px; color: #555; font-family: ui-monospace, monospace; }
  .meta { color: #555; font-size: 13px; }
  @media print { body { font-size: 12px; } pre { font-size: 11px; } }
</style></head>
<body>
<h1>Chatvice Panel API Specification</h1>
<p class="meta">Merchant: <strong>${escapeHtml(merchantName)}</strong> &middot; Generated ${new Date().toISOString().slice(0, 10)}</p>
<p>This document describes the REST endpoints your panel must implement so the Chatvice AI agent can answer customer questions in real-time (deposit/withdraw status, turnover progress, last-login IP, etc.).</p>
<h2>Authentication</h2>
<p>All requests include your API key in the <code>${escapeHtml(source.headerAuthName)}</code> header. Reject any request whose header value does not match. Rotate the key from the Chatvice dashboard if it is ever exposed.</p>
<pre><code>${escapeHtml(source.headerAuthName)}: YOUR_API_KEY</code></pre>
<h2>Base URL</h2>
<pre><code>${escapeHtml(baseUrl)}</code></pre>
<h2>Rate &amp; Cache</h2>
<p>Chatvice caches successful responses for <strong>${source.cacheTtlSec || 30} seconds</strong> per (intent + identifier) and limits outbound calls to <strong>${source.rateLimitPerMin || 60} requests/minute</strong> per merchant. Your panel does not need to be high-throughput.</p>
<h2>Endpoints</h2>
${intentsHtml}
<hr/>
<p class="meta">Tip: open <em>File → Print → Save as PDF</em> to export this document.</p>
</body></html>`;
}
