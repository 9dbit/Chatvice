/** Run schedulers on one deployment only during migration. */
export function backgroundJobsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const explicit = env.ENABLE_BACKGROUND_JOBS;
  if (explicit !== undefined) return explicit.trim().toLowerCase() === "true";
  // Existing Replit deployments keep their behavior. Railway requires opt-in
  // after cutover so a preview cannot compete with the old production worker.
  return !env.RAILWAY_PROJECT_ID;
}
