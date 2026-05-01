/**
 * Shared URL utility functions used by both the widget domain enforcement
 * layer and the domain usage aggregation.
 */

/**
 * Extract the lowercase hostname from a URL string.
 * Returns null when the input is falsy or cannot be parsed as a URL.
 */
export function extractHostnameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}
