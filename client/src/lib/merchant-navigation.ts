export type MerchantMenuConfig = { id: string; enabled: boolean; group: string };

/** Old or malformed platform settings must not duplicate or crash navigation. */
export function parseMerchantMenuConfig(raw: string | undefined): MerchantMenuConfig[] | null {
  if (!raw) return null;
  try {
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) return null;
    const seen = new Set<string>();
    const result: MerchantMenuConfig[] = [];
    for (const item of entries) {
      if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.enabled !== "boolean" || seen.has(item.id)) continue;
      seen.add(item.id);
      result.push({ id: item.id, enabled: item.enabled, group: ["main", "widgetSetting", "messageSetting", "management"].includes(item.group) ? item.group : "main" });
    }
    return result.length ? result : null;
  } catch { return null; }
}

export function isMerchantRouteActive(location: string, url: string) {
  return location === url || (url !== "/dashboard" && location.startsWith(`${url}/`));
}
