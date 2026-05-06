import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { STATIC_PAGES } from "../sitemap";

const APP_TSX_PATH = path.resolve(__dirname, "..", "..", "client", "src", "App.tsx");

const ALLOWED_DYNAMIC_ROUTES_FOR_SITEMAP = new Set<string>([
  "/vs/:competitor",
  "/blog/:slug",
  "/docs/:slug",
]);

export function extractRoutePaths(source: string): string[] {
  const paths = new Set<string>();
  const regex = /<Route\s+[^>]*path=("([^"]+)"|\{`([^`]+)`\}|\{"([^"]+)"\})/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    const value = match[2] ?? match[3] ?? match[4];
    if (value) paths.add(value);
  }
  return Array.from(paths);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dynamicRouteToRegex(routePath: string): RegExp {
  const escaped = routePath
    .split("/")
    .map((segment) => {
      if (segment.endsWith("*") && segment.startsWith(":")) return ".*";
      if (segment.startsWith(":")) return "[^/]+";
      return escapeRegex(segment);
    })
    .join("/");
  return new RegExp("^" + escaped + "$");
}

export function routeMatches(sitemapPath: string, routePaths: string[]): boolean {
  if (routePaths.includes(sitemapPath)) return true;
  for (const routePath of routePaths) {
    if (!routePath.includes(":")) continue;
    if (!ALLOWED_DYNAMIC_ROUTES_FOR_SITEMAP.has(routePath)) continue;
    if (dynamicRouteToRegex(routePath).test(sitemapPath)) return true;
  }
  return false;
}

const SOURCE = fs.readFileSync(APP_TSX_PATH, "utf8");
const ROUTE_PATHS = extractRoutePaths(SOURCE);

describe("sitemap STATIC_PAGES vs registered routes", () => {
  it("extracts routes from App.tsx", () => {
    expect(ROUTE_PATHS.length).toBeGreaterThan(20);
    expect(ROUTE_PATHS).toContain("/");
    expect(ROUTE_PATHS).toContain("/pricing");
  });

  it.each(STATIC_PAGES.map((p) => p.url))(
    "sitemap entry %s resolves to a registered frontend route",
    (url) => {
      expect(
        routeMatches(url, ROUTE_PATHS),
        `Sitemap URL "${url}" has no matching <Route path="..."> in client/src/App.tsx. ` +
          `If the page was renamed or removed, update STATIC_PAGES in server/sitemap.ts. ` +
          `(Catch-all routes like "/:slug" do NOT count as a match — every static sitemap URL must ` +
          `have its own explicit route, or live under an allow-listed dynamic route: ` +
          `${[...ALLOWED_DYNAMIC_ROUTES_FOR_SITEMAP].join(", ")}.)`,
      ).toBe(true);
    },
  );

  it("does not contain the catch-all wildcard route as a sitemap entry", () => {
    const wildcardOnlyMatch = STATIC_PAGES.find((p) => p.url === "/:slug");
    expect(wildcardOnlyMatch).toBeUndefined();
  });
});

describe("routeMatches strictness (regression for catch-all false positive)", () => {
  it("does NOT consider a single-segment sitemap URL valid solely because /:slug exists", () => {
    const routesWithOnlyCatchAll = ["/", "/:slug"];
    expect(routeMatches("/chatbot-jakarta", routesWithOnlyCatchAll)).toBe(false);
  });

  it("requires the explicit route to be present", () => {
    const routes = ["/", "/:slug", "/chatbot-jakarta"];
    expect(routeMatches("/chatbot-jakarta", routes)).toBe(true);
  });

  it("allows the explicitly allow-listed /vs/:competitor pattern", () => {
    const routes = ["/", "/vs/:competitor"];
    expect(routeMatches("/vs/livechat", routes)).toBe(true);
  });

  it("rejects unrelated single-segment URLs even when arbitrary :param routes exist", () => {
    const routes = ["/", "/store/:merchantId"];
    expect(routeMatches("/random-page", routes)).toBe(false);
  });
});
