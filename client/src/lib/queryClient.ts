import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { isChatSubdomain, chatRoutes } from "./chat-routes";

function getLoginRedirectUrl(): string {
  if (isChatSubdomain()) {
    return chatRoutes.login();
  }
  return "/login";
}

let sessionExpiredHandled = false;

export function handleSessionExpired() {
  if (sessionExpiredHandled) return;
  // Only treat as a real session expiry if the user actually had a logged-in
  // session. Otherwise a 401 from a background query on a public page would
  // incorrectly trigger a "session expired" notification + redirect.
  const wasLoggedIn =
    typeof window !== "undefined" &&
    (localStorage.getItem("userType") ||
      localStorage.getItem("merchantId") ||
      localStorage.getItem("adminId") ||
      localStorage.getItem("supervisorUserId"));
  if (!wasLoggedIn) return;

  sessionExpiredHandled = true;
  queryClient.clear();
  localStorage.removeItem("merchantId");
  localStorage.removeItem("userType");
  window.dispatchEvent(new CustomEvent("session-expired"));
  // Give the user time to read the friendly notice (and to click "Login
  // kembali") before auto-redirecting. They can also navigate manually.
  setTimeout(() => {
    sessionExpiredHandled = false;
    window.location.href = getLoginRedirectUrl();
  }, 6000);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Sesi berakhir. Silakan login kembali.");
    }
    const text = (await res.text()) || res.statusText;
    const err = new Error(`${res.status}: ${text}`) as Error & Record<string, unknown>;
    try {
      const body = JSON.parse(text);
      if (body && typeof body === "object") {
        if (body.error || body.message) {
          err.message = (body.error || body.message) as string;
        }
        if (body.requiresUpgrade) err.requiresUpgrade = true;
        if (body.limit !== undefined) err.limit = body.limit;
        if (body.code) err.code = body.code;
      }
    } catch {
      // body is not JSON – leave error as-is
    }
    throw err;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      handleSessionExpired();
      throw new Error("Sesi berakhir. Silakan login kembali.");
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default to "returnNull" so a 401 from any background query does NOT
      // immediately log the user out. Auth-protected pages have their own
      // route guards (via /api/auth/me) that redirect to login when needed.
      // This prevents spurious logouts caused by race conditions, optional
      // endpoints, or queries firing on public pages.
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
