/**
 * Chatvice subdomain edge proxy.
 *
 * This Worker is opt-in and MUST NOT be routed to a production hostname until
 * the origin, browser sessions, WebSockets, and payment callbacks have passed
 * staging checks. No Cloudflare DNS or routing configuration is shipped here.
 */
export function makeOriginRequest(request, env) {
  const incoming = new URL(request.url);
  const allowed = new Set(
    String(env?.ALLOWED_HOSTS || "chat.chatvice.app")
      .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
  );
  if (!allowed.has(incoming.hostname) || !incoming.hostname.endsWith(".chatvice.app")) {
    return { status: 421, error: "Hostname not configured" };
  }
  if (incoming.protocol !== "https:") {
    return { status: 400, error: "HTTPS required" };
  }

  let origin;
  try {
    origin = new URL(env?.UPSTREAM_ORIGIN || "");
  } catch {
    return { status: 503, error: "Upstream not configured" };
  }
  if (
    origin.protocol !== "https:" || origin.username || origin.password ||
    origin.search || origin.hash || origin.pathname !== "/"
  ) {
    return { status: 503, error: "Upstream not configured" };
  }
  // Hostname and path are intentionally NOT taken from the client's headers.
  // Keep the original query string, HTTP method, body stream, and cookies.
  const target = new URL(incoming.pathname + incoming.search, origin);
  const outgoing = new Request(target, request);
  outgoing.headers.delete("host");
  outgoing.headers.delete("forwarded");
  outgoing.headers.delete("x-original-host");
  outgoing.headers.set("x-forwarded-host", incoming.hostname);
  outgoing.headers.set("x-forwarded-proto", "https");
  return { request: outgoing };
}

export async function handleEdgeRequest(request, env, fetchOrigin = fetch) {
  const planned = makeOriginRequest(request, env);
  if (!planned.request) {
    return new Response(planned.error, {
      status: planned.status,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  try {
    // Returning the upstream response verbatim preserves streaming, cookies,
    // Location headers, CORS and WebSocket upgrades. Never cache payment/auth.
    return await fetchOrigin(planned.request, { cf: { cacheEverything: false } });
  } catch {
    // Do not expose internal hostnames, tokens, user IDs or request bodies.
    return new Response("Temporarily unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export default {
  async fetch(request, env) {
    return handleEdgeRequest(request, env);
  },
};
