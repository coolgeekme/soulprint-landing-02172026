/**
 * Citation Formatter - Domain extraction and citation metadata for display
 *
 * Features:
 * - Extract clean domain names from URLs
 * - Format citations with metadata for frontend rendering
 * - Handles edge cases (invalid URLs, missing titles)
 */

export interface CitationMetadata {
  url: string;
  domain: string;
  title?: string;
}

/**
 * Extract clean domain name from URL
 * - Removes "www." prefix
 * - Keeps subdomains (e.g., "blog.example.com" → "blog.example.com")
 * - Returns original URL as fallback if parsing fails
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // Remove "www." prefix for cleaner display
    return hostname.replace(/^www\./, '');
  } catch {
    // If URL parsing fails, return the original URL
    // This is a graceful fallback for malformed URLs
    return url;
  }
}

/**
 * Format citations with metadata for frontend display
 *
 * @param citations - Array of citation URLs (already validated)
 * @param titles - Optional array of titles (from search API like Tavily)
 * @returns Array of CitationMetadata objects
 */
export function formatCitationsForDisplay(
  citations: string[],
  titles?: string[]
): CitationMetadata[] {
  return citations.map((url, i) => ({
    url,
    domain: extractDomain(url),
    title: titles?.[i],
  }));
}
