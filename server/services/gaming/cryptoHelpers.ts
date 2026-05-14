import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncKey(): Buffer {
  const key = process.env.GAMING_ENC_KEY || process.env.SESSION_SECRET || "chatvice-gaming-fallback-key-32b";
  const hashed = crypto.createHash("sha256").update(key).digest();
  return hashed;
}

export function encryptCredential(plaintext: string): string {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptCredential(ciphertext: string): string {
  if (!ciphertext) return "";
  try {
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    return "";
  }
}

export function maskBankAccount(account: string): string {
  if (!account || account.length < 4) return "****";
  return "*".repeat(account.length - 4) + account.slice(-4);
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "****";
  return phone.slice(0, 3) + "*".repeat(phone.length - 6) + phone.slice(-3);
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "****";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `**@${domain}`;
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const sigBuffer = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
    const expBuffer = Buffer.from(expected, "hex");
    if (sigBuffer.length !== expBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expBuffer);
  } catch {
    return false;
  }
}
