---
phase: 04-security-hardening
plan: 02
subsystem: api-security
tags: [rate-limiting, upstash, redis, security, abuse-prevention]
requires: [04-01]
provides:
  - Per-user rate limiting on critical endpoints
  - Tiered limits (standard/expensive/upload)
  - 429 responses with Retry-After headers
affects: [04-03, 04-04]
tech-stack:
  added:
    - "@upstash/ratelimit": "^2.0.0"
    - "@upstash/redis": "^1.31.0"
  patterns:
    - Sliding window rate limiting
    - Fail-open for availability
    - Lazy initialization for build safety
key-files:
  created:
    - lib/rate-limit.ts
  modified:
    - app/api/chat/route.ts
    - app/api/import/process-server/route.ts
    - app/api/import/chunked-upload/route.ts
decisions:
  - id: tier-limits
    decision: "3 tiers: standard (60/min), expensive (20/min), upload (100/min)"
    rationale: "Different endpoint costs require different limits. Chat/import are AI-intensive (expensive), uploads are bursty but small (upload)."
  - id: fail-open
    decision: "If Redis fails, allow requests through"
    rationale: "Availability over strictness. Auth and RLS still protect. Better to serve users than block on infrastructure failure."
  - id: lazy-init
    decision: "Initialize Redis connection only when first used"
    rationale: "Prevents build failures when Upstash env vars missing in build environment. Rate limiting config checked at runtime."
  - id: per-user-not-ip
    decision: "Rate limit by userId, not IP address"
    rationale: "Users are authenticated. IP-based limiting breaks for users behind NAT/VPN and doesn't stop authenticated abuse."
metrics:
  duration: "3m 45s"
  completed: 2026-02-06
---

# Phase 04 Plan 02: Rate Limiting Summary

**One-liner:** Per-user rate limiting with Upstash Redis and tiered limits (standard: 60/min, expensive: 20/min, upload: 100/min) on chat, import, and upload endpoints

## What Was Built

Added distributed rate limiting to prevent abuse and DoS attacks on expensive AI and import endpoints. Implemented using Upstash Redis with sliding window algorithm and tiered limits based on endpoint cost.

### Rate Limiting Utility (`lib/rate-limit.ts`)

Created a robust rate limiting utility with:

1. **Tiered Limits:**
   - Standard: 60 requests/minute (memory queries, profile reads)
   - Expensive: 20 requests/minute (AI chat, soulprint generation, imports)
   - Upload: 100 requests/minute (chunked uploads - bursty but small payloads)

2. **Fail-Open Design:**
   - If Upstash Redis is down or unreachable, requests pass through
   - Logs errors but doesn't block users
   - Auth and RLS layers still provide protection

3. **Build-Safe:**
   - Lazy initialization of Redis connection
   - Skips rate limiting if env vars not configured
   - No build-time dependencies on external services

4. **Proper HTTP Responses:**
   - Returns 429 Too Many Requests when limited
   - Includes `Retry-After` header with seconds until reset
   - Includes `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers

### API Route Integrations

Integrated rate limiting into the 3 most critical state-changing routes:

1. **`/api/chat` (expensive tier: 20/min)**
   - Protects against AI abuse
   - Rate check after auth, before expensive Bedrock/RLM calls
   - Per-user limit prevents one user from exhausting quotas

2. **`/api/import/process-server` (expensive tier: 20/min)**
   - Protects against repeated import attempts
   - Only applied to normal auth path (internal calls trusted)
   - Prevents abuse of soulprint generation

3. **`/api/import/chunked-upload` (upload tier: 100/min)**
   - Allows burst uploads (100/min for small chunks)
   - Prevents memory exhaustion from rapid uploads
   - Still tight enough to prevent abuse

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Install with --legacy-peer-deps**
- **Found during:** Task 1 (npm install)
- **Issue:** npm peer dependency conflict between Next.js 16 and @edge-csrf@2.5.2 (requires Next 13-15)
- **Fix:** Used `--legacy-peer-deps` flag to bypass peer dependency resolution
- **Files modified:** package.json, package-lock.json
- **Commit:** 704ffad (included in Task 1 commit)

**Note:** Task 1 was actually committed in an earlier session (commit 704ffad, mislabeled as 04-03). This session only completed Task 2, but both tasks are now complete.

## Technical Details

### Rate Limiting Algorithm

Uses Upstash's sliding window algorithm:
- More accurate than fixed windows (no reset spike)
- Distributed across edge locations (global rate limiting)
- Sub-millisecond latency via Redis

### Error Handling

```typescript
try {
  const { success, reset, remaining } = await limiter.limit(userId);
  if (!success) {
    return new Response(/* 429 with headers */);
  }
  return null; // Allow request
} catch (error) {
  console.error('[RateLimit] Check failed, allowing request:', error);
  return null; // Fail-open
}
```

### Integration Pattern

```typescript
// After auth (need userId), before expensive operations
const rateLimited = await checkRateLimit(user.id, 'expensive');
if (rateLimited) return rateLimited;
```

Clean, one-liner integration that doesn't disrupt existing code flow.

## Verification Results

✅ `npm run build` passes without errors
✅ `lib/rate-limit.ts` exports `checkRateLimit` and `limits`
✅ All 3 routes import and call `checkRateLimit`
✅ Chat route uses 'expensive' tier (20 req/min)
✅ Import route uses 'expensive' tier (20 req/min)
✅ Chunked upload uses 'upload' tier (100 req/min)
✅ Rate limit check happens after auth but before processing
✅ 429 responses include Retry-After header

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Install Upstash packages and create rate limiting utility | 704ffad | lib/rate-limit.ts, package.json, package-lock.json |
| 2 | Integrate rate limiting into critical API routes | 2bd328e | app/api/chat/route.ts, app/api/import/process-server/route.ts, app/api/import/chunked-upload/route.ts |

## Self-Check: PASSED

All created files exist:
- ✅ lib/rate-limit.ts

All commits exist:
- ✅ 704ffad
- ✅ 2bd328e

## Success Criteria Met

✅ Rate limit utility handles missing env vars gracefully (returns null, no crash)
✅ Rate limit utility handles Redis failures gracefully (fail-open)
✅ 429 responses include Retry-After header
✅ Chat route uses 'expensive' tier (20 req/min)
✅ Import route uses 'expensive' tier (20 req/min)
✅ Chunked upload uses 'upload' tier (100 req/min)
✅ Existing route behavior unchanged when not rate limited

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Dependencies for future work:**
- Upstash Redis must be configured in production (UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN)
- If Upstash not configured, rate limiting is skipped (still secure via auth/RLS)
- Consider adding rate limit monitoring/alerting in future phases

## Notes

- Commit 704ffad was labeled "04-03" but actually contained Task 1 work for this plan (04-02)
- Execution completed Task 2 integration work
- Both tasks are now complete and verified
- Rate limiting is per-authenticated-user, not per-IP
- Internal server-to-server calls (X-Internal-User-Id header) bypass rate limiting in process-server route
