---
phase: 05-observability
plan: 02
subsystem: monitoring
tags: [health-checks, observability, load-balancer, pino, timeouts]
requires: [05-01]
provides:
  - "Public /api/health endpoint for load balancers and monitoring tools"
  - "Per-dependency health status with timeout protection"
  - "Degraded state detection for non-critical failures"
  - "Admin health endpoint with structured Pino logging"
affects: [deployment, monitoring, operations]
tech-stack:
  added: []
  patterns:
    - "Public unauthenticated health checks for load balancers"
    - "Per-dependency health status (healthy/degraded/down)"
    - "5-second timeouts on all dependency checks"
    - "Config-only Bedrock check (no AWS API calls)"
    - "HTTP 503 for down status, 200 for healthy/degraded"
    - "AbortSignal.timeout() for modern timeout handling"
key-files:
  created:
    - app/api/health/route.ts
  modified:
    - app/api/admin/health/route.ts
decisions: []
metrics:
  duration: "2m 40s"
  completed: "2026-02-06"
---

# Phase 5 Plan 2: Public Health Endpoint Summary

**One-liner:** Public /api/health endpoint with per-dependency status checks (Supabase, RLM, Bedrock) and degraded state detection, plus admin health endpoint migrated to structured Pino logging.

## What Was Built

Created a public health check endpoint that monitors application dependencies without requiring authentication. This enables load balancers, monitoring tools, and orchestration systems to assess application health. Also migrated the existing admin health endpoint to use structured Pino logging.

### Public Health Endpoint (`/api/health`)

**Route:** `GET /api/health`
**Authentication:** None (public)
**Rate Limiting:** None (must always respond for load balancers)

**Dependency Checks:**

1. **Supabase**
   - Test: `SELECT id FROM profiles LIMIT 1`
   - Timeout: 5 seconds via `AbortSignal.timeout(5000)`
   - Returns: healthy/degraded/down based on connection and query success

2. **RLM Service**
   - Test: `GET {RLM_SERVICE_URL}/health`
   - Timeout: 5 seconds via `AbortSignal.timeout(5000)`
   - Returns: healthy if 200, degraded if non-200 response, down if timeout/connection error

3. **Bedrock (AWS)**
   - Test: Config-only check (no actual AWS API calls)
   - Checks: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BEDROCK_MODEL_ID` env vars
   - Returns: healthy if all present, down if any missing

**Response Format:**
```json
{
  "status": "healthy|degraded|down",
  "timestamp": "2026-02-06T12:22:45.123Z",
  "dependencies": {
    "supabase": {
      "status": "healthy",
      "latency_ms": 23,
      "message": "Connected"
    },
    "rlm": {
      "status": "healthy",
      "latency_ms": 145,
      "message": "Responding"
    },
    "bedrock": {
      "status": "healthy",
      "latency_ms": 0,
      "message": "Configured"
    }
  }
}
```

**Overall Status Logic:**
- `down` if any dependency is down → HTTP 503
- `degraded` if any dependency is degraded → HTTP 200
- `healthy` if all dependencies are healthy → HTTP 200

**Structured Logging:**
- Uses Pino via `createLogger('Health')`
- Logs every health check with duration and overall status
- Logs errors with context for debugging

### Admin Health Endpoint Updates (`/api/admin/health`)

**Migrated to Structured Logging:**
- Replaced `console.error` with `log.error()`
- Added request lifecycle logging:
  - After auth: `log.info({ userId }, 'Admin health check requested')`
  - After completion: `log.info({ duration, overall_status }, 'Admin health check completed')`
  - On error: `log.error({ error, duration }, 'Admin health check failed')`

**Modernized Timeouts:**
- RLM fetch: Changed from manual `AbortController` with 10s timeout to `AbortSignal.timeout(5000)`
- Supabase query: Added `AbortSignal.timeout(5000)` (previously no timeout)

**Kept Existing Functionality:**
- Admin auth check (ADMIN_EMAILS)
- Circuit breaker status reporting
- Perplexity API health check

## Technical Decisions

**Why Config-Only Bedrock Check?**
Health checks run frequently (every few seconds by load balancers). Making actual AWS API calls would:
- Incur costs
- Create latency
- Risk rate limiting
- Add unnecessary complexity

Config-only check verifies credentials are present, which is sufficient for health monitoring.

**Why No Authentication on Public Endpoint?**
Load balancers and monitoring tools need a fast, simple endpoint to check application health. Adding authentication would:
- Require credential management in monitoring tools
- Add latency (auth check overhead)
- Risk false negatives (auth system down but app healthy)
- Violate standard health check patterns

**Why No Rate Limiting on Public Endpoint?**
Health checks must ALWAYS respond, even under load. Rate limiting could cause:
- False positives (healthy app reports as down)
- Load balancer removing healthy instances
- Cascade failures during traffic spikes

**Why 5-Second Timeouts?**
Balances two concerns:
- Fast enough to prevent cascading failures (load balancer won't wait forever)
- Slow enough to accommodate cold starts and network latency

5 seconds is industry standard for health check timeouts.

**Why Degraded vs Down?**
- **Down:** Critical failure requiring immediate action (load balancer removes instance)
- **Degraded:** Partial failure but app still functional (alert but keep serving traffic)

Example: RLM service slow but responding = degraded (keep serving, but investigate). RLM service unreachable = down if critical to chat flow.

## Task Commits

### Task 1: Create Public Health Endpoint
**Commit:** `7789e60`
**Files:** `app/api/health/route.ts` (created)

Created public `/api/health` endpoint with:
- Three dependency checks (Supabase, RLM, Bedrock)
- 5-second timeouts on all checks
- Config-only Bedrock check
- Overall status computation
- HTTP 503 for down status
- Structured Pino logging

### Task 2: Migrate Admin Health to Structured Logging
**Commit:** `a33b27e`
**Files:** `app/api/admin/health/route.ts` (modified)

Updated admin health endpoint:
- Imported `createLogger` from `@/lib/logger`
- Replaced `console.error` with structured logging
- Added request lifecycle logging with duration
- Modernized RLM fetch to `AbortSignal.timeout(5000)`
- Added timeout to Supabase query

## Verification Results

**Build:** ✅ `npm run build` succeeded
**Tests:** ✅ `npm test` passed (48/48 tests)
**Console Statements:** ✅ Zero console.* calls in health endpoints
**Public Endpoint:** ✅ `/api/health` exists and has no auth check
**Timeouts:** ✅ All dependency checks use `AbortSignal.timeout(5000)`
**Logging:** ✅ Both endpoints use `createLogger` from Pino

## Deviations from Plan

None - plan executed exactly as written.

## Dependency Graph

**Depends on:**
- Plan 05-01: Centralized Pino logger configuration

**Enables:**
- Load balancer health checks
- Monitoring tool integration
- Automated alerting on dependency failures
- Operations dashboards with per-dependency status

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Recommendations:**
1. Configure load balancer to use `/api/health` endpoint
2. Set up monitoring alerts for degraded/down status
3. Consider adding health check dashboard in admin UI
4. Document health check response format for operations team

## Integration Points

**Load Balancers:**
- Path: `/api/health`
- Expected: HTTP 200 for healthy/degraded, HTTP 503 for down
- Frequency: Every 10-30 seconds (configurable)

**Monitoring Tools:**
- Path: `/api/health`
- Parse: `status` field for overall health
- Alert: On `down` status or prolonged `degraded` status
- Metrics: Track `latency_ms` for each dependency

**Admin Dashboard:**
- Path: `/api/admin/health` (requires admin auth)
- Additional: Circuit breaker status, Perplexity health
- Use: Detailed debugging and system status

## Self-Check: PASSED

All files verified:
- ✅ app/api/health/route.ts exists
- ✅ app/api/admin/health/route.ts modified

All commits verified:
- ✅ 7789e60 exists in git log
- ✅ a33b27e exists in git log
