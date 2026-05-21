import crypto, { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "crypto";
import { promises as dnsPromises } from "dns";
import net from "net";
import { storage } from "./storage";
import type { CustomDataIntent, CustomDataSource } from "@shared/schema";
import { fetchGoogleSheet } from "./fileParser";

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
export async function assertPublicHostExt(host: string) { return assertPublicHost(host); }
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
    // No merchant template configured — produce a friendly key:value summary
    // from the response object instead of dumping raw JSON to the customer.
    return summarizeForCustomer(data);
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

// Convert a panel JSON response into plain Indonesian "key: value" lines so
// customers never see raw JSON when a merchant forgot to set responseTemplate.
export function summarizeForCustomer(data: any): string {
  if (data === null || data === undefined) return "(tidak ada data)";
  if (typeof data !== "object") return String(data);
  if (Array.isArray(data)) {
    if (data.length === 0) return "(tidak ada data)";
    return data.slice(0, 5).map((row, i) => `${i + 1}. ${summarizeForCustomer(row)}`).join("\n");
  }
  const lines: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined || v === "") continue;
    const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    if (typeof v === "object") {
      const inner = summarizeForCustomer(v).split("\n").map(l => "  " + l).join("\n");
      lines.push(`${label}:\n${inner}`);
    } else {
      lines.push(`${label}: ${String(v)}`);
    }
    if (lines.length >= 12) break;
  }
  return lines.length ? lines.join("\n") : "(tidak ada data)";
}

// ── Main connector entry ──────────────────────────────────────────────────
export interface ConnectorResult {
  ok: boolean;
  text: string;          // Customer-facing text to display
  httpStatus: number;
  latencyMs: number;
  rawData?: any;
  errorMessage?: string;
  // success  — panel returned usable data, `text` is the rendered template
  // not_found — panel responded but the record/field doesn't exist; the
  //             dispatcher should ask the AI to generate a clarifying follow-up
  // error    — network/timeout/5xx/parse failure; show a generic friendly msg
  outcome?: "success" | "not_found" | "error";
}

// Heuristic: did the panel respond cleanly but with "no record"? This must be
// distinguished from system errors so the AI can ask "are you sure the username
// is correct?" instead of dead-ending the customer with raw template text.
export function isNotFoundResponse(httpStatus: number, json: any): boolean {
  if (httpStatus === 404) return true;
  if (httpStatus < 200 || httpStatus >= 300) return false;
  if (json === null || json === undefined) return true;
  if (Array.isArray(json)) return json.length === 0;
  if (typeof json !== "object") return false;
  if (Object.keys(json).length === 0) return true;
  // Common "no record" payload shapes from merchant panels.
  if (json.success === false) return true;
  if (json.found === false) return true;
  if (json.exists === false) return true;
  if (json.status === "not_found" || json.status === "NOT_FOUND") return true;
  if (json.code === "not_found" || json.code === 404) return true;
  if (typeof json.error === "string" && /not[_\s-]?found/i.test(json.error)) return true;
  if (json.data === null) return true;
  if (Array.isArray(json.data) && json.data.length === 0) return true;
  return false;
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
  const userFacingError = intent.fallbackMessage?.trim() || "Data tidak ditemukan. Silahkan periksa kembali data Anda, atau saya bantu hubungkan ke tim support.";

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
  // Strict format validation per field type — number fields must be numeric.
  const formatErrors: string[] = [];
  for (const def of requiredDefs) {
    const raw = fields[def.key];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    const v = String(raw).trim();
    if (def.type === "number") {
      // Allow digits and an optional single decimal point. Reject anything else.
      if (!/^-?\d+(\.\d+)?$/.test(v.replace(/[,\s_]/g, ""))) {
        formatErrors.push(`${def.label || def.key} harus berupa angka`);
      }
    }
    if (v.length > 200) formatErrors.push(`${def.label || def.key} terlalu panjang`);
  }
  if (formatErrors.length > 0) {
    const errMsg = `Field format invalid: ${formatErrors.join("; ")}`;
    await logAudit({ merchantId, intent, sessionId, fields, httpStatus: 0, latencyMs: 0, success: false, errorMessage: errMsg, endpointUrl: null, httpMethod: intent.httpMethod || "GET" });
    return { ok: false, text: `Kakak, ${formatErrors.join("; ")}. Boleh diperbaiki ya.`, httpStatus: 0, latencyMs: 0, errorMessage: errMsg };
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
  // We build TWO versions:
  //   - `url`: real URL with substituted values, sent over the wire only.
  //   - `auditUrl`: PII-safe version for audit log/UI — keeps {field} markers
  //     in the path and replaces query values with "***" so customer
  //     identifiers (username, account #, IP) are never persisted.
  const baseUrl = (source.baseUrl || "").replace(/\/+$/, "");
  const usedKeys = new Set<string>();
  const rawTemplate = intent.endpointPath || "";
  let path = rawTemplate.replace(/\{([\w]+)\}/g, (_m, key) => {
    usedKeys.add(key);
    return encodeURIComponent(fields[key] ?? "");
  });
  if (!path.startsWith("/")) path = "/" + path;
  let auditPath = rawTemplate;
  if (!auditPath.startsWith("/")) auditPath = "/" + auditPath;
  const method = (intent.httpMethod || "GET").toUpperCase();
  let url = baseUrl + path;
  let auditUrl = baseUrl + auditPath;
  let body: string | undefined;
  if (method === "GET") {
    const qsKeys = Object.keys(fields).filter(k => !usedKeys.has(k));
    const qs = qsKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(fields[k])}`).join("&");
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
    const auditQs = qsKeys.map(k => `${encodeURIComponent(k)}=***`).join("&");
    if (auditQs) auditUrl += (auditUrl.includes("?") ? "&" : "?") + auditQs;
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
      await logAudit({ merchantId, intent, sessionId, fields, httpStatus: resp.status, latencyMs: latencyNow, success: false, errorMessage: errMsg, endpointUrl: auditUrl, httpMethod: method });
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
  const transportOk = httpStatus >= 200 && httpStatus < 300 && !parseFailed;
  // 404 with parsed body is still a valid "not found" response — surface it
  // to the dispatcher so the AI can ask a clarifying follow-up question.
  const notFound = !parseFailed && isNotFoundResponse(httpStatus, json);
  const success = transportOk && !!json && !notFound;

  await logAudit({ merchantId, intent, sessionId, fields, httpStatus, latencyMs, success, errorMessage: notFound ? "Not found" : errorMessage, endpointUrl: auditUrl, httpMethod: method });

  if (notFound) {
    // Don't cache misses: the customer may correct their input on the next turn
    // and we want a fresh lookup rather than a stale "not found" reply.
    return { ok: false, text: "", httpStatus, latencyMs, rawData: json, outcome: "not_found" };
  }

  if (!success) {
    return { ok: false, text: userFacingError, httpStatus, latencyMs, errorMessage, outcome: "error" };
  }

  responseCache.set(ckey, { at: Date.now(), status: httpStatus, body: json });
  // Prevent unbounded growth
  if (responseCache.size > 5000) {
    const cutoff = Date.now() - ttl;
    responseCache.forEach((v, k) => { if (v.at < cutoff) responseCache.delete(k); });
  }

  const text = renderTemplate(intent.responseTemplate || "", json);
  return { ok: true, text, httpStatus, latencyMs, rawData: json, outcome: "success" };
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
  fallbackUsed?: boolean;
  fallbackOutcome?: string | null;
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
      fallbackUsed: opts.fallbackUsed ?? false,
      fallbackOutcome: opts.fallbackOutcome ?? null,
    });
  } catch (err) {
    console.error("[CustomConnector] Audit log failed:", err);
  }
}

// ── Google Sheet fallback lookup ──────────────────────────────────────────
// When a primary panel API lookup returns not_found or error, and the intent
// has a fallbackSourceId pointing to a Google Sheet active source, we fetch
// that sheet and ask GPT-4.1-mini to answer the customer's original query
// from the sheet content instead of showing a generic error.
export async function executeFallbackSheetLookup(opts: {
  merchantId: string;
  intent: CustomDataIntent;
  fields: Record<string, string>;
  customerMessage: string;
  sessionId?: string;
  openai: any; // OpenAI client passed in from routes.ts
}): Promise<{ ok: boolean; text: string; outcome: "success" | "error" }> {
  const { merchantId, intent, fields, customerMessage, sessionId, openai } = opts;

  if (!intent.fallbackSourceId) {
    return { ok: false, text: "", outcome: "error" };
  }

  const auditBase = { merchantId, intent, sessionId, fields, httpStatus: 0, latencyMs: 0, httpMethod: null, endpointUrl: null };

  try {
    // Look up the source record for the fallback Google Sheet — must belong to
    // the same merchant and be a google_sheet subtype to prevent cross-merchant access.
    const fallbackSource = await storage.getSource(intent.fallbackSourceId);
    if (!fallbackSource || !fallbackSource.url) {
      console.warn(`[FallbackSheet] Source ${intent.fallbackSourceId} not found or has no URL`);
      await logAudit({ ...auditBase, success: false, errorMessage: "Fallback source not found", fallbackUsed: true, fallbackOutcome: "failed" });
      return { ok: false, text: "", outcome: "error" };
    }
    if (fallbackSource.merchantId !== merchantId) {
      console.error(`[FallbackSheet] Cross-merchant access attempt: intent merchant=${merchantId} source merchant=${fallbackSource.merchantId}`);
      await logAudit({ ...auditBase, success: false, errorMessage: "Fallback source belongs to different merchant", fallbackUsed: true, fallbackOutcome: "failed" });
      return { ok: false, text: "", outcome: "error" };
    }
    if (fallbackSource.sourceSubtype !== "google_sheet") {
      console.warn(`[FallbackSheet] Source ${fallbackSource.id} is not a google_sheet (subtype=${fallbackSource.sourceSubtype})`);
      await logAudit({ ...auditBase, success: false, errorMessage: "Fallback source is not a Google Sheet", fallbackUsed: true, fallbackOutcome: "failed" });
      return { ok: false, text: "", outcome: "error" };
    }

    // Prefer DB-cached content (synced by the background scheduler) to avoid
    // a live HTTP round-trip on every fallback activation.  Fall back to a
    // live fetch only when the cache is empty or stale (no content stored).
    let sheetContent: string;
    if (fallbackSource.content && fallbackSource.content.trim().length > 20) {
      sheetContent = fallbackSource.content;
      console.log(`[FallbackSheet] Using cached content for source=${fallbackSource.id} (${sheetContent.length} chars)`);
    } else {
      const sheetResult = await fetchGoogleSheet(fallbackSource.url);
      if (!sheetResult.success || !sheetResult.content) {
        console.warn(`[FallbackSheet] Failed to fetch sheet: ${sheetResult.error}`);
        await logAudit({ ...auditBase, success: false, errorMessage: `Sheet fetch failed: ${sheetResult.error}`, fallbackUsed: true, fallbackOutcome: "failed" });
        return { ok: false, text: "", outcome: "error" };
      }
      sheetContent = sheetResult.content;
      console.log(`[FallbackSheet] Live-fetched sheet for source=${fallbackSource.id} (${sheetContent.length} chars)`);
    }

    // Build a concise field summary so GPT knows what the customer submitted
    const fieldSummary = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    const systemPrompt =
      `Kamu adalah asisten customer service yang membantu menjawab pertanyaan customer berdasarkan data dari Google Sheet berikut.\n\n` +
      `DATA GOOGLE SHEET:\n${sheetContent.slice(0, 6000)}\n\n` +
      `Data yang customer berikan: ${fieldSummary || "(tidak ada)"}\n\n` +
      `Jawab pertanyaan customer dalam bahasa yang sama dengan pesan mereka. ` +
      `Berikan jawaban langsung dan ringkas berdasarkan data di sheet. ` +
      `Jika data tidak ditemukan di sheet, akui dengan ramah dan sarankan menghubungi tim support. ` +
      `Jangan tampilkan JSON, jangan pakai format markdown berlebihan, jangan sebut nama teknis sheet atau kolom.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      max_tokens: 350,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: customerMessage },
      ],
    });

    const answer = response.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      await logAudit({ ...auditBase, success: false, errorMessage: "GPT returned empty answer for fallback sheet", fallbackUsed: true, fallbackOutcome: "failed" });
      return { ok: false, text: "", outcome: "error" };
    }

    console.log(`[FallbackSheet] intent=${intent.intentKey} sheetSource=${fallbackSource.id} session=${sessionId} outcome=success`);
    await logAudit({ ...auditBase, success: true, fallbackUsed: true, fallbackOutcome: "success" });
    return { ok: true, text: answer, outcome: "success" };
  } catch (err) {
    console.error("[FallbackSheet] Error during fallback sheet lookup:", err);
    await logAudit({ ...auditBase, success: false, errorMessage: `Fallback exception: ${String(err)}`, fallbackUsed: true, fallbackOutcome: "failed" });
    return { ok: false, text: "", outcome: "error" };
  }
}

// ── Default intents (seeded for new merchants on first save) ──────────────
type PresetIntent = Omit<import("@shared/schema").InsertCustomDataIntent, "sourceId">;

export const DEFAULT_INTENTS: Array<PresetIntent> = [
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

// Finansial / fintech preset — saldo, mutasi, transfer, kartu, kredit.
const FINANSIAL_INTENTS: Array<PresetIntent> = [
  {
    intentKey: "saldo_rekening",
    name: "Cek Saldo Rekening",
    description: "Customer menanyakan saldo rekening atau e-wallet mereka.",
    triggerKeywords: "saldo,sisa saldo,cek saldo,balance,saldo rekening,sisa uang",
    httpMethod: "GET",
    endpointPath: "/account/balance",
    requiredFields: [
      { key: "account_number", label: "Nomor Rekening", type: "text", required: true },
      { key: "id_number", label: "No. KTP / ID Verifikasi", type: "text", required: true },
    ],
    responseTemplate: "Saldo rekening {account_number}: Rp {balance}. Terakhir update {updated_at}.",
    isEnabled: true,
    sortOrder: 1,
  },
  {
    intentKey: "mutasi_terakhir",
    name: "Cek Mutasi Terakhir",
    description: "Customer ingin tahu transaksi terakhir di rekening.",
    triggerKeywords: "mutasi,transaksi terakhir,riwayat transaksi,history transfer,transaksi masuk,transaksi keluar",
    httpMethod: "GET",
    endpointPath: "/account/transactions",
    requiredFields: [
      { key: "account_number", label: "Nomor Rekening", type: "text", required: true },
      { key: "id_number", label: "No. KTP / ID Verifikasi", type: "text", required: true },
    ],
    responseTemplate: "5 transaksi terakhir rekening {account_number}: {transactions}.",
    isEnabled: true,
    sortOrder: 2,
  },
  {
    intentKey: "status_transfer",
    name: "Cek Status Transfer",
    description: "Customer menanyakan apakah transfer mereka sudah berhasil.",
    triggerKeywords: "status transfer,transfer belum masuk,transfer pending,transfer gagal,cek transfer",
    httpMethod: "GET",
    endpointPath: "/transfer/status",
    requiredFields: [
      { key: "reference_id", label: "Nomor Referensi Transfer", type: "text", required: true },
      { key: "amount", label: "Nominal Transfer", type: "number", required: true },
    ],
    responseTemplate: "Transfer ref {reference_id} sebesar Rp {amount}: status {status}. {message}",
    isEnabled: true,
    sortOrder: 3,
  },
  {
    intentKey: "tagihan_kartu",
    name: "Cek Tagihan Kartu Kredit",
    description: "Customer menanyakan total tagihan dan jatuh tempo kartu kredit.",
    triggerKeywords: "tagihan kartu kredit,bill kartu,jatuh tempo,tagihan cc,minimum payment",
    httpMethod: "GET",
    endpointPath: "/card/bill",
    requiredFields: [
      { key: "card_number_last4", label: "4 Digit Terakhir Kartu", type: "text", required: true },
      { key: "id_number", label: "No. KTP / ID Verifikasi", type: "text", required: true },
    ],
    responseTemplate: "Tagihan kartu …{card_number_last4}: Rp {total_bill}. Minimum: Rp {minimum_payment}. Jatuh tempo {due_date}.",
    isEnabled: true,
    sortOrder: 4,
  },
];

// E-commerce preset — pesanan, pengiriman, retur, stok, voucher.
const ECOMMERCE_INTENTS: Array<PresetIntent> = [
  {
    intentKey: "status_pesanan",
    name: "Cek Status Pesanan",
    description: "Customer menanyakan status pesanan mereka (proses, dikirim, sampai).",
    triggerKeywords: "status pesanan,order saya,pesanan saya,cek order,kapan dikirim,pesanan belum sampai",
    httpMethod: "GET",
    endpointPath: "/orders/{order_id}",
    requiredFields: [
      { key: "order_id", label: "Nomor Pesanan", type: "text", required: true },
      { key: "email", label: "Email Pemesan", type: "text", required: true },
    ],
    responseTemplate: "Pesanan {order_id}: status {status}. Estimasi tiba {eta}. Kurir: {courier} ({tracking_number}).",
    isEnabled: true,
    sortOrder: 1,
  },
  {
    intentKey: "lacak_pengiriman",
    name: "Lacak Pengiriman",
    description: "Customer ingin melacak posisi paket mereka.",
    triggerKeywords: "lacak,tracking,resi,nomor resi,paket dimana,kurir sampai mana",
    httpMethod: "GET",
    endpointPath: "/shipments/{tracking_number}",
    requiredFields: [
      { key: "tracking_number", label: "Nomor Resi", type: "text", required: true },
    ],
    responseTemplate: "Resi {tracking_number}: {status}. Posisi terakhir {last_location} pada {last_update}.",
    isEnabled: true,
    sortOrder: 2,
  },
  {
    intentKey: "stok_produk",
    name: "Cek Stok Produk",
    description: "Customer menanyakan ketersediaan produk tertentu.",
    triggerKeywords: "stok,ready stock,available,masih ada,kosong,restock",
    httpMethod: "GET",
    endpointPath: "/products/{sku}/stock",
    requiredFields: [
      { key: "sku", label: "Kode SKU / Produk", type: "text", required: true },
    ],
    responseTemplate: "Stok {sku} ({product_name}): {stock} unit. Harga Rp {price}.",
    isEnabled: true,
    sortOrder: 3,
  },
  {
    intentKey: "status_retur",
    name: "Cek Status Retur / Refund",
    description: "Customer menanyakan progress retur barang atau pengembalian dana.",
    triggerKeywords: "retur,refund,pengembalian,uang kembali,barang dikembalikan,komplain",
    httpMethod: "GET",
    endpointPath: "/returns/{return_id}",
    requiredFields: [
      { key: "return_id", label: "Nomor Retur", type: "text", required: true },
      { key: "order_id", label: "Nomor Pesanan Asal", type: "text", required: true },
    ],
    responseTemplate: "Retur {return_id} dari pesanan {order_id}: status {status}. {message}",
    isEnabled: true,
    sortOrder: 4,
  },
  {
    intentKey: "validasi_voucher",
    name: "Validasi Voucher / Promo",
    description: "Customer menanyakan apakah kode voucher masih berlaku.",
    triggerKeywords: "voucher,kode promo,promo,diskon,kupon,kode voucher",
    httpMethod: "GET",
    endpointPath: "/vouchers/{code}",
    requiredFields: [
      { key: "code", label: "Kode Voucher", type: "text", required: true },
    ],
    responseTemplate: "Voucher {code}: {status}. Diskon {discount}. Berlaku sampai {expires_at}.",
    isEnabled: true,
    sortOrder: 5,
  },
];

export const PRESET_INTENTS: Record<string, Array<PresetIntent>> = {
  judi: DEFAULT_INTENTS,
  finansial: FINANSIAL_INTENTS,
  ecommerce: ECOMMERCE_INTENTS,
};

export type PresetListEntry = {
  id: string;
  name: string;
  description: string;
  intents: Array<{
    intentKey: string;
    name: string;
    description: string;
    httpMethod: string;
    endpointPath: string;
    requiredFields: PresetIntent["requiredFields"];
  }>;
};

export type ScaffoldPresetIntentDeps = {
  getCustomDataSource: (merchantId: string) => Promise<CustomDataSource | undefined | null>;
  getCustomDataIntents: (sourceId: string) => Promise<CustomDataIntent[]>;
  createCustomDataIntent: (data: Omit<PresetIntent, never> & { sourceId: string }) => Promise<CustomDataIntent>;
};

export type ScaffoldPresetIntentResult =
  | { ok: true; status: 200; intent: CustomDataIntent }
  | { ok: false; status: 400 | 404 | 409; error: string; intentKey?: string };

export function listPresetsForApi(): PresetListEntry[] {
  return Object.values(PRESET_META).map(meta => ({
    ...meta,
    intents: (PRESET_INTENTS[meta.id] || []).map(i => ({
      intentKey: i.intentKey,
      name: i.name,
      description: i.description,
      httpMethod: i.httpMethod,
      endpointPath: i.endpointPath,
      requiredFields: i.requiredFields,
    })),
  }));
}

export async function scaffoldPresetIntent(opts: {
  merchantId: string;
  preset: unknown;
  intentKey: unknown;
  deps: ScaffoldPresetIntentDeps;
}): Promise<ScaffoldPresetIntentResult> {
  const { merchantId, preset, intentKey, deps } = opts;
  const source = await deps.getCustomDataSource(merchantId);
  if (!source) {
    return { ok: false, status: 400, error: "Buat custom data source terlebih dahulu" };
  }
  const seeds = PRESET_INTENTS[String(preset)] || [];
  const def = seeds.find(s => s.intentKey === intentKey);
  if (!def) {
    return { ok: false, status: 404, error: "Preset intent not found" };
  }
  const existing = await deps.getCustomDataIntents(source.id);
  if (existing.some(e => e.intentKey === def.intentKey)) {
    return { ok: false, status: 409, error: "Intent already exists", intentKey: def.intentKey };
  }
  const intent = await deps.createCustomDataIntent({ ...def, sourceId: source.id });
  return { ok: true, status: 200, intent };
}

export const PRESET_META: Record<string, { id: string; name: string; description: string }> = {
  judi: {
    id: "judi",
    name: "Online Gaming",
    description: "Cek status deposit, withdraw, turnover, dan IP login terakhir.",
  },
  finansial: {
    id: "finansial",
    name: "Finansial / Fintech",
    description: "Saldo rekening, mutasi, status transfer, dan tagihan kartu.",
  },
  ecommerce: {
    id: "ecommerce",
    name: "E-commerce",
    description: "Status pesanan, lacak pengiriman, stok produk, retur, dan voucher.",
  },
};

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

// ════════════════════════════════════════════════════════════════════════════
// HEALTH MONITORING — background pinger + alerting
// ════════════════════════════════════════════════════════════════════════════
// Every 60s we ping each enabled merchant's panel API (just like the manual
// "Test connection" button) and store the result in `customDataHealthPings`.
// We then compute a rolling 5-minute success rate and:
//   1. Cache the latest "up | degraded | down" verdict on the source row so
//      the dashboard badge can render without scanning the pings table.
//   2. Send an alert (email + telegram if configured) when the error rate
//      exceeds 50% over the rolling window. The alert is de-duplicated:
//      we only re-alert after the source recovers (status returns to "up")
//      and then degrades again — never spam the merchant for one outage.

export type HealthStatus = "up" | "degraded" | "down" | "unknown";

export interface HealthPingResult {
  success: boolean;
  httpStatus: number;
  latencyMs: number;
  errorMessage?: string | null;
}

// Single ping. Mirrors the test-connection logic but stays self-contained so
// the background job never depends on Express request/response objects.
export async function pingCustomDataSourceHealth(source: CustomDataSource): Promise<HealthPingResult> {
  const t0 = Date.now();
  if (!source.baseUrl) {
    return { success: false, httpStatus: 0, latencyMs: 0, errorMessage: "Base URL belum diisi" };
  }
  const urlCheck = validateBaseUrl(source.baseUrl);
  if (!urlCheck.ok) {
    return { success: false, httpStatus: 0, latencyMs: 0, errorMessage: urlCheck.error };
  }
  const dnsCheck = await assertPublicHostExt(urlCheck.url.hostname.replace(/^\[|\]$/g, ""));
  if (!dnsCheck.ok) {
    return { success: false, httpStatus: 0, latencyMs: Date.now() - t0, errorMessage: dnsCheck.error };
  }
  const apiKey = decryptApiKey(source.apiKeyEncrypted);
  const url = source.baseUrl.replace(/\/+$/, "") + (source.healthPath || "/health");
  const headers: Record<string, string> = { "User-Agent": "Chatvice-Connector-Healthcheck/1.0" };
  if (apiKey) headers[source.headerAuthName || "X-API-Key"] = apiKey;
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers,
      // Same SSRF defence as the dispatcher — never auto-follow 3xx.
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    const latencyMs = Date.now() - t0;
    if (resp.status >= 300 && resp.status < 400) {
      return { success: false, httpStatus: resp.status, latencyMs, errorMessage: `Redirect ${resp.status}` };
    }
    return {
      success: resp.ok,
      httpStatus: resp.status,
      latencyMs,
      errorMessage: resp.ok ? null : `HTTP ${resp.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      httpStatus: 0,
      latencyMs: Date.now() - t0,
      errorMessage: err?.name === "TimeoutError" ? "Request timeout" : (err?.message || "Network error"),
    };
  }
}

// Compute a verdict from the rolling window. We require a minimum sample
// size before flagging "down" so a single transient blip during the first
// minute doesn't immediately page the merchant.
export function computeHealthVerdict(pings: { success: boolean }[]): {
  status: HealthStatus;
  total: number;
  successCount: number;
  errorRate: number;
} {
  const total = pings.length;
  if (total === 0) return { status: "unknown", total: 0, successCount: 0, errorRate: 0 };
  const successCount = pings.filter(p => p.success).length;
  const errorRate = (total - successCount) / total;
  let status: HealthStatus;
  if (errorRate === 0) status = "up";
  else if (errorRate > 0.5 && total >= 3) status = "down";
  else status = "degraded";
  return { status, total, successCount, errorRate };
}

// Alerting helper. Sends both email (if Resend is configured) and Telegram
// (if the merchant linked a bot). All sends are best-effort.
async function sendHealthDownAlert(opts: {
  merchantId: string;
  source: CustomDataSource;
  errorRate: number;
  total: number;
  lastError: string | null;
}): Promise<void> {
  const { merchantId, source, errorRate, total, lastError } = opts;
  const merchant = await storage.getMerchant(merchantId);
  if (!merchant) return;

  const pct = Math.round(errorRate * 100);
  const subject = `[Chatvice] Panel API "${source.name}" gangguan (${pct}% error)`;
  const summary = `Panel API merchant Anda mengalami error rate ${pct}% dalam 5 menit terakhir (${total} pemeriksaan). ` +
    (lastError ? `Pesan error terakhir: ${lastError}.` : "") +
    ` Endpoint: ${source.baseUrl}${source.healthPath || "/health"}`;

  // Email via Resend — gracefully no-op if Resend connector isn't configured.
  if (merchant.email) {
    try {
      const { sendPanelHealthAlertEmail } = await import("./resendClient");
      await sendPanelHealthAlertEmail({
        toEmail: merchant.email,
        merchantName: merchant.companyName || merchant.username || "Merchant",
        sourceName: source.name,
        endpoint: `${source.baseUrl}${source.healthPath || "/health"}`,
        errorRatePct: pct,
        totalPings: total,
        lastError: lastError || null,
      }).catch((err) => console.error("[health-monitor] email send failed:", err?.message || err));
    } catch (err) {
      console.error("[health-monitor] email helper failed:", err);
    }
  }

  // Telegram via merchant's notification settings — same pipe used for chat alerts.
  try {
    const settings = await storage.getNotificationSettings(merchantId);
    if (settings?.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      const { sendTelegramNotification } = await import("./telegram");
      const text = `🚨 <b>Panel API Down</b>\n` +
        `Source: <b>${escapeHtmlSafe(source.name)}</b>\n` +
        `Error rate: <b>${pct}%</b> (${total} ping/5m)\n` +
        `Endpoint: ${escapeHtmlSafe(source.baseUrl)}${escapeHtmlSafe(source.healthPath || "/health")}\n` +
        (lastError ? `Last error: ${escapeHtmlSafe(lastError)}` : "");
      await sendTelegramNotification(settings.telegramBotToken, settings.telegramChatId, text)
        .catch((err) => console.error("[health-monitor] telegram send failed:", err?.message || err));
    }
  } catch (err) {
    console.error("[health-monitor] telegram lookup failed:", err);
  }

  console.log(`[health-monitor] Alert sent to merchant ${merchantId} for source ${source.id} (errorRate=${pct}%)`);
  void summary;
  void subject;
}

function escapeHtmlSafe(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Process a single source: ping, persist, recompute verdict, possibly alert.
export async function checkOneSourceHealth(source: CustomDataSource): Promise<void> {
  const result = await pingCustomDataSourceHealth(source);
  await storage.recordCustomDataHealthPing({
    merchantId: source.merchantId,
    sourceId: source.id,
    success: result.success,
    httpStatus: result.httpStatus,
    latencyMs: result.latencyMs,
    errorMessage: result.errorMessage ?? null,
  });

  const recent = await storage.getRecentCustomDataHealthPings(source.merchantId, 5 * 60 * 1000);
  const verdict = computeHealthVerdict(recent);

  const previousStatus = (source.lastHealthStatus as HealthStatus) || "unknown";
  await storage.upsertCustomDataSource(source.merchantId, {
    lastHealthCheckAt: new Date(),
    lastHealthStatus: verdict.status,
    lastHealthLatencyMs: result.latencyMs,
    lastHealthError: result.success ? null : (result.errorMessage ?? null),
    // Reset alert dedupe once we recover so the next degradation re-alerts.
    ...(verdict.status === "up" && previousStatus !== "up" ? { healthAlertSentAt: null } : {}),
  });

  // Alert when verdict is "down" and we haven't already alerted for this incident.
  if (verdict.status === "down") {
    const alreadyAlerted = !!source.healthAlertSentAt;
    if (!alreadyAlerted) {
      await sendHealthDownAlert({
        merchantId: source.merchantId,
        source,
        errorRate: verdict.errorRate,
        total: verdict.total,
        lastError: result.errorMessage ?? source.lastHealthError ?? null,
      });
      await storage.upsertCustomDataSource(source.merchantId, { healthAlertSentAt: new Date() });
    }
  }
}

// Public entrypoint called by the scheduler in server/index.ts. Wraps all
// per-merchant errors so one slow/broken endpoint can never stall the others.
let healthJobRunning = false;
export async function runCustomDataHealthMonitor(): Promise<void> {
  if (healthJobRunning) return; // skip overlapping ticks if a previous run is still going
  healthJobRunning = true;
  const startedAt = Date.now();
  try {
    const sources = await storage.getEnabledCustomDataSources();
    if (sources.length === 0) return;
    // Run pings concurrently but with a small cap so we don't spike the event loop.
    const concurrency = 8;
    let cursor = 0;
    const worker = async () => {
      while (cursor < sources.length) {
        const idx = cursor++;
        const src = sources[idx];
        try {
          await checkOneSourceHealth(src);
        } catch (err) {
          console.error(`[health-monitor] error processing source ${src.id}:`, err);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, () => worker()));

    // Hourly housekeeping — drop pings older than 1 hour to keep the table tiny.
    if (new Date().getMinutes() === 0) {
      try {
        const removed = await storage.pruneCustomDataHealthPings(60 * 60 * 1000);
        if (removed > 0) console.log(`[health-monitor] pruned ${removed} stale ping rows`);
      } catch (err) {
        console.error("[health-monitor] prune failed:", err);
      }
    }

    const tookMs = Date.now() - startedAt;
    if (tookMs > 30_000) console.log(`[health-monitor] tick took ${tookMs}ms for ${sources.length} sources`);
  } catch (err) {
    console.error("[health-monitor] tick failed:", err);
  } finally {
    healthJobRunning = false;
  }
}

// Read-side helper used by the dashboard endpoint to render the badge.
export async function getCustomDataHealthSummary(merchantId: string): Promise<{
  status: HealthStatus;
  lastCheckedAt: string | null;
  lastLatencyMs: number | null;
  lastError: string | null;
  totalPings: number;
  successPings: number;
  errorRatePct: number;
  monitorEnabled: boolean;
} | null> {
  const source = await storage.getCustomDataSource(merchantId);
  if (!source) return null;
  const recent = await storage.getRecentCustomDataHealthPings(merchantId, 5 * 60 * 1000);
  const verdict = computeHealthVerdict(recent);
  return {
    status: (source.lastHealthStatus as HealthStatus) || verdict.status,
    lastCheckedAt: source.lastHealthCheckAt ? new Date(source.lastHealthCheckAt).toISOString() : null,
    lastLatencyMs: source.lastHealthLatencyMs ?? null,
    lastError: source.lastHealthError ?? null,
    totalPings: verdict.total,
    successPings: verdict.successCount,
    errorRatePct: Math.round(verdict.errorRate * 100),
    monitorEnabled: source.healthMonitorEnabled !== false,
  };
}
