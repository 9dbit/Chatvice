export function isPlanLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (error as Record<string, unknown>).requiresUpgrade === true;
}
