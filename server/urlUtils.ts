/**
 * Shared URL utility functions used by both the widget domain enforcement
 * layer and the domain usage aggregation.
 */

/**
 * Extract the lowercase hostname from a full URL string.
 * Returns null if the input is falsy, not a valid URL, or an IP address.
 */
export function extractHostnameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}
