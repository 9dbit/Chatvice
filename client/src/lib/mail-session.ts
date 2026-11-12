/** Isolated Mail uses its own cookie. Never route an expired Mail session through main Chatvice auth. */
export const MAIL_SESSION_EXPIRED_EVENT = "chatvice-mail:session-expired";

export function notifyMailSessionExpired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MAIL_SESSION_EXPIRED_EVENT));
  }
}

export async function mailFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(input, { credentials: "same-origin", cache: "no-store", ...init });
  if (response.status === 401) notifyMailSessionExpired();
  return response;
}

/** Mail-only API helper: preserves the original response for JSON consumers and handles revoked sessions. */
export async function mailApiRequest(method: string, url: string, data?: unknown): Promise<Response> {
  const response = await mailFetch(url, {
    method,
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const fallback = response.status === 401
      ? "Your session has expired. Please sign in again."
      : response.status === 403
        ? "You do not have permission for this action."
        : "Mail is unavailable. Please try again.";
    throw new Error(typeof problem?.error === "string" ? problem.error.slice(0, 200) : fallback);
  }
  return response;
}
