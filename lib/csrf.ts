/**
 * Client-side CSRF token utility
 *
 * The @edge-csrf/nextjs middleware sets X-CSRF-Token on every GET response.
 * This module fetches and caches the token for use in state-changing requests.
 */

let cachedToken: string | null = null;

/**
 * Fetches the CSRF token from the server
 *
 * Makes a lightweight GET request to read the X-CSRF-Token header.
 * The token is cached in memory to avoid repeated network requests.
 *
 * @returns The CSRF token string, or empty string if unavailable
 */
export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  try {
    // Fetch from any page — middleware adds X-CSRF-Token to all GET responses
    const res = await fetch('/api/health/supabase', { method: 'GET' });
    const token = res.headers.get('X-CSRF-Token');

    if (token) {
      cachedToken = token;
      return token;
    }

    // Fallback: return empty string (middleware may be disabled in dev)
    console.warn('[CSRF] Could not obtain CSRF token from response headers');
    return '';
  } catch (error) {
    console.error('[CSRF] Error fetching CSRF token:', error);
    return '';
  }
}

/**
 * Clears the cached CSRF token
 *
 * Useful after logout or when the token expires.
 * Next call to getCsrfToken() will fetch a fresh token.
 */
export function clearCsrfToken(): void {
  cachedToken = null;
}

/**
 * Fetch wrapper that automatically adds CSRF token to state-changing requests
 *
 * For POST/PUT/DELETE/PATCH requests, adds X-CSRF-Token header.
 * For GET/HEAD/OPTIONS, passes through without modification.
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @returns Fetch response
 */
export async function csrfFetch(url: string, options?: RequestInit): Promise<Response> {
  const method = (options?.method || 'GET').toUpperCase();

  // Only state-changing methods need CSRF token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = await getCsrfToken();
    const headers = new Headers(options?.headers);

    if (token) {
      headers.set('X-CSRF-Token', token);
    }

    return fetch(url, { ...options, headers });
  }

  return fetch(url, options);
}
