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
  sessionExpiredHandled = true;
  localStorage.removeItem("merchantId");
  localStorage.removeItem("userType");
  window.dispatchEvent(new CustomEvent("session-expired"));
  setTimeout(() => {
    window.location.href = getLoginRedirectUrl();
  }, 2500);
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
      queryFn: getQueryFn({ on401: "redirect" }),
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
