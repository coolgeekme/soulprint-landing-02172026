import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy initialization - only create Redis connection when first used
// This prevents errors during build if env vars are missing
let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    });
  }
  return redis;
}

// Tiered rate limits for different endpoint types
export const limits = {
  // Standard operations (memory queries, profile reads)
  standard: () => new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(60, "60 s"),  // 60 req/min
    prefix: "rl:standard",
  }),

  // Expensive operations (AI chat, soulprint generation, import)
  expensive: () => new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(20, "60 s"),  // 20 req/min
    prefix: "rl:expensive",
  }),

  // Upload operations (chunked upload - bursty but limited)
  upload: () => new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(100, "60 s"),  // 100 req/min (chunks are small, frequent)
    prefix: "rl:upload",
  }),
};

// Cache the Ratelimit instances (they're stateless, just config)
let _standard: Ratelimit | null = null;
let _expensive: Ratelimit | null = null;
let _upload: Ratelimit | null = null;

function getLimit(tier: 'standard' | 'expensive' | 'upload'): Ratelimit {
  switch (tier) {
    case 'standard':
      if (!_standard) _standard = limits.standard();
      return _standard;
    case 'expensive':
      if (!_expensive) _expensive = limits.expensive();
      return _expensive;
    case 'upload':
      if (!_upload) _upload = limits.upload();
      return _upload;
  }
}

/**
 * Check rate limit for a user. Returns a Response if rate limited, null if OK.
 *
 * Usage:
 *   const rateLimited = await checkRateLimit(userId, 'expensive');
 *   if (rateLimited) return rateLimited;
 */
export async function checkRateLimit(
  userId: string,
  tier: 'standard' | 'expensive' | 'upload' = 'standard'
): Promise<Response | null> {
  // Skip rate limiting if Upstash is not configured (dev/test)
  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
    return null;
  }

  try {
    const limiter = getLimit(tier);
    const { success, reset, remaining } = await limiter.limit(userId);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    return null; // Not rate limited
  } catch (error) {
    // If rate limiting fails (Redis down), allow the request through
    // Security: fail-open for availability, other layers still protect
    console.error('[RateLimit] Check failed, allowing request:', error);
    return null;
  }
}
