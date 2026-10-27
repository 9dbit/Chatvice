import { createHmac, timingSafeEqual } from "node:crypto";

const TIME_TOLERANCE_MS = 5 * 60 * 1000;

function sameBytes(actual: Buffer, expected: Buffer): boolean {
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function validTimestamp(value: string, milliseconds: boolean, now: number): boolean {
  if (!/^[0-9]{10,13}$/.test(value)) return false;
  const valueMs = milliseconds ? Number(value) : Number(value) * 1000;
  return Number.isSafeInteger(valueMs) && Math.abs(now - valueMs) <= TIME_TOLERANCE_MS;
}
export function verifyNormalizedInboundSignature(
  raw: Buffer, timestamp: string, signature: string, secret: string, now = Date.now(),
): boolean {
  if (secret.length < 32 || !validTimestamp(timestamp, true, now) || !/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(timestamp + ".").update(raw).digest();
  return sameBytes(Buffer.from(signature, "hex"), expected);
}

/** Resend uses the Svix signing format. Verify raw bytes, NEVER JSON.stringify(req.body). */
export function verifyResendSignature(
  raw: Buffer,
  headers: { id?: string; timestamp?: string; signature?: string },
  secret: string,
  now = Date.now(),
): boolean {
  const { id = "", timestamp = "", signature = "" } = headers;
  if (!/^whsec_[a-zA-Z0-9+/=_-]+$/.test(secret) || !id || id.length > 255 ||
      !validTimestamp(timestamp, false, now) || signature.length > 2048) return false;
  const key = Buffer.from(secret.slice(6).replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (key.length < 16) return false;
  const expected = createHmac("sha256", key)
    .update(id + "." + timestamp + ".").update(raw).digest();
  return signature.split(/\s+/).some(part => {
    if (!part.startsWith("v1,")) return false;
    const value = part.slice(3);
    if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(value)) return false;
    return sameBytes(Buffer.from(value, "base64"), expected);
  });
}
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 400) return null;
  const raw = value.trim();
  const match = raw.match(/<([^<>]+)>$/);
  const addr = (match ? match[1] : raw).trim().toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(addr)) return null;
  return addr.length <= 320 ? addr : null;
}
export function isMailMessageId(value: unknown): value is string {
  return typeof value === "string" && /^<[^<>\r\n]{1,500}>$/.test(value);
}
export function extractReplyHeader(headers: unknown): string | undefined {
  if (!headers || typeof headers !== "object") return;
  const entries = Object.entries(headers as Record<string, unknown>);
  const raw = entries.find(([key]) => key.toLowerCase() === "in-reply-to")?.[1];
  const str = Array.isArray(raw) ? raw[0] : raw;
  return typeof str === "string" ? str.slice(0,512) : undefined;
}
