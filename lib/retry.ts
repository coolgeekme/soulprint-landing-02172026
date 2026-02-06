export interface RetryConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
}

/**
 * Fetch with exponential backoff retry.
 *
 * Retries on network errors (TypeError) and HTTP 5xx responses.
 * Does NOT retry on AbortError or HTTP 4xx (client errors).
 *
 * Backoff: 2^attempt * baseDelayMs + random jitter (0-1000ms)
 * Each attempt has a 10s timeout via AbortSignal.timeout.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config?: RetryConfig
): Promise<Response> {
  const maxAttempts = config?.maxAttempts ?? 3;
  const baseDelayMs = config?.baseDelayMs ?? 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Build signal: combine caller signal with 10s timeout when possible
      const callerSignal = options?.signal;
      let signal: AbortSignal;

      if (typeof AbortSignal.any === 'function' && callerSignal) {
        signal = AbortSignal.any([callerSignal, AbortSignal.timeout(10000)]);
      } else if (callerSignal) {
        // AbortSignal.any not available but caller provided signal -- use caller signal only
        signal = callerSignal;
      } else {
        signal = AbortSignal.timeout(10000);
      }

      const response = await fetch(url, { ...options, signal });

      // Do NOT retry on 4xx (client error) -- return as-is
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Retry on 5xx (server error)
      if (response.status >= 500) {
        if (attempt === maxAttempts) {
          return response;
        }
        const delay = Math.pow(2, attempt) * baseDelayMs + Math.random() * 1000;
        console.log(`[Retry] Attempt ${attempt}/${maxAttempts} for ${url} after ${Math.round(delay)}ms`);
        await sleep(delay);
        continue;
      }

      // Success (2xx, 3xx)
      return response;
    } catch (err: unknown) {
      // Never retry AbortError (user-initiated cancellation)
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }

      // Retry on network errors (TypeError from fetch) and timeout errors
      if (attempt === maxAttempts) {
        throw new Error(`Failed after ${maxAttempts} attempts`);
      }

      const delay = Math.pow(2, attempt) * baseDelayMs + Math.random() * 1000;
      console.log(`[Retry] Attempt ${attempt}/${maxAttempts} for ${url} after ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }

  // Should not be reached, but satisfies TypeScript
  throw new Error(`Failed after ${maxAttempts} attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
