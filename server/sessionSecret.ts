/**
 * Refuse a predictable or absent session signing key in production.
 * Preserve the existing development fallback and cookie behavior.
 * This function never prints, rotates or returns secret metadata to logs.
 */
export function getSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.SESSION_SECRET;
  if (env.NODE_ENV === "production") {
    if (typeof value !== "string" || value.length < 32 || /\s/.test(value)) {
      throw new Error("SESSION_SECRET is missing or invalid for production");
    }
    return value;
  }
  return value || "chatvice-secret-key-change-in-production";
}
