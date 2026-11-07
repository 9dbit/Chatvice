/** Canonical deployment URL for generated links and callback destinations. */
export function getConfiguredAppUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!env.APP_URL) {
    if (env.RAILWAY_PROJECT_ID) throw new Error("APP_URL is required on Railway");
    return undefined;
  }
  let url: URL;
  try { url = new URL(env.APP_URL); } catch {
    throw new Error("APP_URL must be a valid HTTP(S) URL");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("APP_URL must be an HTTP(S) URL without credentials");
  }
  return url.origin;
}
