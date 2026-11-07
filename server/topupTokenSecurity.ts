/**
 * Top-up signing must not fall back to a predictable development key.
 * When the configured key is absent or weak, top-up token endpoints fail closed.
 */
export function getTopupJwtSecret(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const secret = env.JWT_SECRET;
  if (typeof secret !== "string" || secret.length < 32 || /\s/.test(secret)) {
    return null;
  }
  return secret;
}
