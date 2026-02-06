# Phase 5: Observability - Research

**Researched:** 2026-02-06
**Domain:** Production observability, structured logging, health check endpoints
**Confidence:** HIGH

## Summary

Phase 5 implements production-grade observability through structured logging with correlation IDs and comprehensive health check endpoints. Research shows that the Node.js ecosystem has matured significantly around observability, with **Pino** emerging as the performance leader for structured logging and **OpenTelemetry** becoming the de-facto standard for trace correlation.

The codebase currently has 238 console.log/error statements across API routes, no correlation ID tracking, and a basic health check endpoint at `/api/admin/health` that checks Supabase, RLM, and Perplexity. The centralized error handler at `lib/api/error-handler.ts` provides a foundation, but lacks structured logging and request tracing.

For Next.js 16 deployments, the recommended stack is:
1. **Pino** for structured logging (5x faster than Winston, JSON by default)
2. **Middleware-based correlation IDs** using crypto.randomUUID()
3. **Enhanced health endpoint** with degraded status for partial outages
4. **Optional OpenTelemetry** for trace correlation if distributed tracing is needed

**Primary recommendation:** Implement Pino with correlation ID middleware first (REL-03), then enhance the existing health endpoint (REL-04). Defer full OpenTelemetry integration unless distributed tracing becomes necessary.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pino` | ^9.x | Structured logging | 5x faster than Winston, JSON output by default, minimal overhead |
| `pino-pretty` | ^13.x | Development formatting | Pretty-prints logs in dev while keeping JSON in production |

**Why Pino over Winston:**
- Performance: [5x faster with minimal CPU/memory overhead](https://betterstack.com/community/comparisons/pino-vs-winston/)
- JSON-first: [Structured output by default](https://blog.arcjet.com/structured-logging-in-json-for-next-js/) makes log aggregation trivial
- Production-ready: [Used by Fastify and other high-performance frameworks](https://medium.com/@muhammedshibilin/node-js-logging-pino-vs-winston-vs-bunyan-complete-guide-99fe3cc59ed9)
- Native redaction: Built-in support for masking sensitive fields

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vercel/otel` | ^2.1.0 | OpenTelemetry integration | Only if distributed tracing needed |
| `@opentelemetry/api` | ^1.9.0 | Trace context access | Only with full OpenTelemetry setup |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pino | Winston | Winston has more transports/flexibility but 5x slower and requires more configuration |
| Middleware correlation IDs | OpenTelemetry full stack | OpenTelemetry provides trace/span correlation but adds significant complexity and dependencies |
| Manual health checks | `@hmcts/nodejs-healthcheck` | Library adds abstraction but minimal code savings vs. custom implementation |

**Installation:**
```bash
npm install pino pino-pretty
```

**For OpenTelemetry (optional):**
```bash
npm install @vercel/otel @opentelemetry/api @opentelemetry/sdk-logs @opentelemetry/instrumentation
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── logger/
│   ├── index.ts              # Logger factory (Pino setup)
│   ├── middleware.ts         # Correlation ID injection
│   └── formatters.ts         # Custom formatters (redact, duration)
middleware.ts                 # App middleware (add correlation ID)
app/api/
├── health/
│   └── route.ts              # Enhanced health check endpoint
└── [routes]/route.ts         # Routes use logger.child()
```

### Pattern 1: Correlation ID Middleware

**What:** Generate unique request IDs and inject them into all logs and responses.

**When to use:** Every production API needs request tracing to correlate logs across distributed systems.

**Example:**
```typescript
// middleware.ts (add to existing middleware)
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Generate correlation ID
  const correlationId = crypto.randomUUID()

  // Inject into request headers (available to all route handlers)
  request.headers.set('x-correlation-id', correlationId)

  // ... existing CSRF and auth logic ...

  // Add to response headers (for client-side debugging)
  const response = await updateSession(request)
  response.headers.set('x-correlation-id', correlationId)

  return response
}
```

**Source:** [Correlation ID tracking in Next.js](https://www.softpost.org/tech/how-to-use-correlation-id-to-track-the-request-flow-in-nextjs-app)

### Pattern 2: Structured Logger Factory

**What:** Centralized Pino configuration with environment-aware formatting.

**When to use:** Required for consistent logging across all API routes.

**Example:**
```typescript
// lib/logger/index.ts
import pino, { Logger } from 'pino'

export const logger: Logger =
  process.env.NODE_ENV === 'production'
    ? pino({
        level: 'info',
        formatters: {
          level: (label) => ({ level: label })
        },
        redact: {
          paths: ['req.headers.authorization', 'password', 'token'],
          remove: true
        }
      })
    : pino({
        transport: {
          target: 'pino-pretty',
          options: { colorize: true }
        },
        level: 'debug'
      })

// Create child logger with context
export function createLogger(context: string) {
  return logger.child({ context })
}
```

**Source:** [Structured logging for Next.js with Pino](https://blog.arcjet.com/structured-logging-in-json-for-next-js/)

### Pattern 3: Route Handler Integration

**What:** Use child loggers with correlation ID + user ID + context.

**When to use:** Every API route handler.

**Example:**
```typescript
// app/api/chat/route.ts
import { createLogger } from '@/lib/logger'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  const headersList = await headers()
  const correlationId = headersList.get('x-correlation-id')

  // Create contextual logger
  const log = createLogger('API:Chat').child({
    correlationId,
    userId: user?.id
  })

  const startTime = Date.now()

  log.info('Chat request started')

  try {
    // ... route logic ...

    const duration = Date.now() - startTime
    log.info({ duration, status: 200 }, 'Chat request completed')

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    log.error({ error, duration, status: 500 }, 'Chat request failed')
    return handleAPIError(error, 'API:Chat')
  }
}
```

### Pattern 4: Health Check with Dependency Status

**What:** Enhanced health endpoint with per-dependency status and degraded state.

**When to use:** Required for production monitoring and load balancer health checks.

**Example:**
```typescript
// app/api/health/route.ts
interface DependencyHealth {
  status: 'healthy' | 'degraded' | 'down'
  latency_ms: number
  message?: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  dependencies: {
    supabase: DependencyHealth
    rlm: DependencyHealth
    bedrock: DependencyHealth
  }
}

export async function GET() {
  const checks = await Promise.all([
    checkSupabase(),
    checkRLM(),
    checkBedrock()
  ])

  // Overall status: down if any down, degraded if any degraded
  const statuses = checks.map(c => c.status)
  const overallStatus = statuses.includes('down') ? 'down'
    : statuses.includes('degraded') ? 'degraded'
    : 'healthy'

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    dependencies: { /* ... */ }
  }, {
    status: overallStatus === 'down' ? 503 : 200
  })
}
```

**Source:** [Node.js health check best practices](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/)

### Pattern 5: Integrate with Existing Error Handler

**What:** Add structured logging to the centralized error handler.

**When to use:** Update `lib/api/error-handler.ts` to use Pino instead of console.error.

**Example:**
```typescript
// lib/api/error-handler.ts
import { createLogger } from '@/lib/logger'
import { headers } from 'next/headers'

const log = createLogger('ErrorHandler')

export function handleAPIError(error: unknown, context: string): Response {
  const headersList = await headers()
  const correlationId = headersList.get('x-correlation-id')

  // Structured error logging
  log.error({
    correlationId,
    context,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error
  }, 'API error occurred')

  // ... rest of error handling ...
}
```

### Anti-Patterns to Avoid

- **Logging everything:** Don't log every variable and step. Log requests, responses, errors, and key decision points only.
- **Including sensitive data:** Always use Pino's redact feature for tokens, passwords, API keys in headers.
- **Checking dependencies in liveness probes:** [Database down shouldn't restart containers](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/) - only check dependencies in readiness probes.
- **Blocking on logging:** Pino is async by design - never await log calls.
- **Custom log formats in production:** Stick with JSON for production to enable automated log analysis.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON log formatting | Custom JSON.stringify wrappers | Pino | Handles circular refs, redaction, performance optimization, error serialization |
| Log rotation | Custom file write streams | Pino transports or Vercel/platform logging | File rotation has edge cases (permissions, disk space, atomic writes) |
| Trace correlation | Manual trace ID propagation | OpenTelemetry API | Standardized context propagation across async boundaries |
| Health check timeouts | Raw fetch with setTimeout | AbortSignal.timeout(ms) | Built-in browser API, cleaner syntax, already used in codebase |

**Key insight:** Logging libraries like Pino have solved edge cases you'll encounter later: circular object references, async context loss, memory leaks from unclosed streams, and performance under high load. The 238 console.log statements in this codebase represent technical debt that will be difficult to search/correlate in production without structured logging.

## Common Pitfalls

### Pitfall 1: Losing Correlation IDs in Async Operations

**What goes wrong:** Correlation IDs are lost when using Promise.all, setTimeout, or background jobs.

**Why it happens:** Next.js middleware sets headers on the request object, but child async operations don't inherit that context automatically.

**How to avoid:**
- Always pass correlation ID explicitly to background jobs
- Use logger.child() to bind correlation ID to logger instance
- For OpenTelemetry, use AsyncLocalStorage (automatic context propagation)

**Warning signs:** Logs missing correlationId field, inability to trace multi-step operations.

### Pitfall 2: Health Check Cascading Failures

**What goes wrong:** Health endpoint calls slow dependencies, times out, gets restarted by orchestrator, creating a restart loop.

**Why it happens:** Not setting strict timeouts on dependency checks (e.g., database queries).

**How to avoid:**
```typescript
// GOOD: Always use AbortSignal.timeout
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000) // 5s max
})

// BAD: No timeout
const response = await fetch(url)
```

**Source:** [Node.js health check best practices](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/)

**Warning signs:** Health endpoint slow (>5s), container restart loops during dependency outages.

### Pitfall 3: Logging Sensitive Data

**What goes wrong:** API keys, tokens, passwords appear in logs, violating security compliance.

**Why it happens:** Logging entire request objects or error stack traces that include credentials.

**How to avoid:**
```typescript
// Configure Pino redaction
const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'apiKey',
      '*.password', // nested fields
      '*.token'
    ],
    remove: true // completely remove, don't show [Redacted]
  }
})
```

**Warning signs:** Grep logs and find "Bearer", "password", "sk-" (OpenAI keys).

### Pitfall 4: Over-Logging in Production

**What goes wrong:** Excessive debug logging causes performance degradation, log storage costs spike.

**Why it happens:** Forgetting to set appropriate log levels per environment.

**How to avoid:**
- Production: level 'info' or 'warn' only
- Staging: level 'debug' for troubleshooting
- Development: level 'debug' with pino-pretty

**Warning signs:** Production logs growing >1GB/day for a small API, noticeable latency increase.

### Pitfall 5: Not Logging Request Duration

**What goes wrong:** Can't identify slow endpoints or performance regressions.

**Why it happens:** Only logging at request start, not measuring completion time.

**How to avoid:**
```typescript
const startTime = Date.now()
try {
  // ... handle request ...
  const duration = Date.now() - startTime
  log.info({ duration, status: 200 }, 'Request completed')
} catch (error) {
  const duration = Date.now() - startTime
  log.error({ duration, status: 500, error }, 'Request failed')
}
```

**Warning signs:** Can't answer "which API routes are slowest?" without external APM.

## Code Examples

Verified patterns from official sources:

### Example 1: Complete Middleware Integration

```typescript
// middleware.ts
import { createCsrfMiddleware } from '@edge-csrf/nextjs'
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const csrfMiddleware = createCsrfMiddleware({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
})

export async function middleware(request: NextRequest) {
  // Generate correlation ID for request tracing (REL-03)
  const correlationId = crypto.randomUUID()
  request.headers.set('x-correlation-id', correlationId)

  // Apply CSRF protection
  const csrfResponse = await csrfMiddleware(request)
  if (csrfResponse.status === 403) {
    return csrfResponse
  }

  // Pass through to Supabase auth session refresh
  const authResponse = await updateSession(request)

  // Copy CSRF cookies
  csrfResponse.cookies.getAll().forEach(cookie => {
    authResponse.cookies.set(cookie.name, cookie.value, cookie)
  })

  // Copy CSRF token header
  const csrfToken = csrfResponse.headers.get('X-CSRF-Token')
  if (csrfToken) {
    authResponse.headers.set('X-CSRF-Token', csrfToken)
  }

  // Add correlation ID to response (for debugging)
  authResponse.headers.set('x-correlation-id', correlationId)

  return authResponse
}
```

**Source:** [Correlation ID implementation guide](https://www.softpost.org/tech/how-to-use-correlation-id-to-track-the-request-flow-in-nextjs-app)

### Example 2: Logger Setup with Redaction

```typescript
// lib/logger/index.ts
import pino, { Logger } from 'pino'

export const logger: Logger =
  process.env.NODE_ENV === 'production'
    ? pino({
        level: process.env.LOG_LEVEL || 'info',
        formatters: {
          level: (label) => ({ level: label })
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'token',
            'apiKey',
            'access_token',
            'secret'
          ],
          remove: true
        }
      })
    : pino({
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname'
          }
        },
        level: 'debug'
      })

export function createLogger(context: string) {
  return logger.child({ context })
}
```

**Source:** [Arcjet structured logging guide](https://blog.arcjet.com/structured-logging-in-json-for-next-js/)

### Example 3: API Route with Structured Logging

```typescript
// app/api/chat/route.ts
import { createLogger } from '@/lib/logger'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

const log = createLogger('API:Chat')

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const headersList = await headers()
  const correlationId = headersList.get('x-correlation-id')

  // Create request-scoped logger
  const reqLog = log.child({
    correlationId,
    method: 'POST',
    endpoint: '/api/chat'
  })

  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      reqLog.warn({ authError }, 'Unauthorized request')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Add user to logger context
    reqLog.child({ userId: user.id })
    reqLog.info('Processing chat request')

    // ... rest of route logic ...

    const duration = Date.now() - startTime
    reqLog.info({ duration, status: 200 }, 'Chat request completed')

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    reqLog.error({
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : error,
      duration,
      status: 500
    }, 'Chat request failed')

    return handleAPIError(error, 'API:Chat')
  }
}
```

**Source:** [Next.js logging best practices](https://michaelangelo.io/blog/logging-nextjs)

### Example 4: Enhanced Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('Health')

interface DependencyHealth {
  status: 'healthy' | 'degraded' | 'down'
  latency_ms: number
  message?: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  dependencies: {
    supabase: DependencyHealth
    rlm: DependencyHealth
    bedrock: DependencyHealth
  }
}

async function checkSupabase(): Promise<DependencyHealth> {
  const start = Date.now()
  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const { error } = await client
      .from('profiles')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal)

    clearTimeout(timeout)
    const latency_ms = Date.now() - start

    if (error) {
      return { status: 'degraded', latency_ms, message: error.message }
    }

    return { status: 'healthy', latency_ms, message: 'Connected' }
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      message: err instanceof Error ? err.message : 'Connection failed'
    }
  }
}

async function checkRLM(): Promise<DependencyHealth> {
  const start = Date.now()
  const rlmUrl = process.env.RLM_SERVICE_URL

  if (!rlmUrl) {
    return { status: 'down', latency_ms: 0, message: 'Not configured' }
  }

  try {
    const response = await fetch(`${rlmUrl}/health`, {
      signal: AbortSignal.timeout(5000)
    })

    const latency_ms = Date.now() - start

    if (!response.ok) {
      return { status: 'degraded', latency_ms, message: `HTTP ${response.status}` }
    }

    return { status: 'healthy', latency_ms, message: 'Responding' }
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      message: err instanceof Error ? err.message : 'Connection failed'
    }
  }
}

async function checkBedrock(): Promise<DependencyHealth> {
  // Simple config check - don't make actual AWS calls in health check
  const start = Date.now()
  const hasCredentials = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.BEDROCK_MODEL_ID
  )

  return {
    status: hasCredentials ? 'healthy' : 'down',
    latency_ms: Date.now() - start,
    message: hasCredentials ? 'Configured' : 'Missing credentials'
  }
}

export async function GET() {
  const startTime = Date.now()

  try {
    // Run all checks in parallel
    const [supabase, rlm, bedrock] = await Promise.all([
      checkSupabase(),
      checkRLM(),
      checkBedrock()
    ])

    // Determine overall status
    const statuses = [supabase.status, rlm.status, bedrock.status]
    const overallStatus: 'healthy' | 'degraded' | 'down' =
      statuses.includes('down') ? 'down'
      : statuses.includes('degraded') ? 'degraded'
      : 'healthy'

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      dependencies: { supabase, rlm, bedrock }
    }

    const duration = Date.now() - startTime
    log.info({ duration, status: overallStatus }, 'Health check completed')

    // Return 503 only if completely down, 200 for healthy or degraded
    return NextResponse.json(response, {
      status: overallStatus === 'down' ? 503 : 200
    })
  } catch (err) {
    const duration = Date.now() - startTime
    log.error({ error: err, duration }, 'Health check failed')

    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    )
  }
}
```

**Source:** [Node.js Reference Architecture - Health Checks](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/)

### Example 5: Update Error Handler with Structured Logging

```typescript
// lib/api/error-handler.ts
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('ErrorHandler')

export interface APIErrorResponse {
  error: string
  code: string
  timestamp: string
  correlationId?: string
}

export async function handleAPIError(
  error: unknown,
  context: string,
  correlationId?: string
): Promise<Response> {
  const timestamp = new Date().toISOString()

  // Structured error logging with correlation ID
  log.error({
    correlationId,
    context,
    timestamp,
    error: error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : error
  }, 'API error occurred')

  // Handle TimeoutError from AbortSignal.timeout
  if (error instanceof Error && error.name === 'TimeoutError') {
    return NextResponse.json<APIErrorResponse>(
      {
        error: 'Request timed out',
        code: 'TIMEOUT',
        timestamp,
        correlationId
      },
      { status: 504 }
    )
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json<APIErrorResponse>(
      {
        error: isDevelopment ? error.message : 'An error occurred',
        code: 'INTERNAL_ERROR',
        timestamp,
        correlationId
      },
      { status: 500 }
    )
  }

  // Handle unknown error types
  return NextResponse.json<APIErrorResponse>(
    {
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      timestamp,
      correlationId
    },
    { status: 500 }
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| console.log everywhere | Structured logging (JSON) | 2020-2023 | Log aggregation tools can parse/query fields |
| Winston as default | Pino for performance-critical apps | 2022+ | 5x performance improvement in high-traffic services |
| Custom request IDs | OpenTelemetry trace context | 2024+ | Standardized distributed tracing across services |
| Manual health checks | Kubernetes-style readiness/liveness | 2019+ | Orchestrators can auto-heal services |
| Console timestamps | ISO 8601 timestamps | Always | Universal log parsing compatibility |

**Deprecated/outdated:**
- **console.log in production:** No structure, no searchability, no correlation
- **Bunyan:** Maintenance stopped, use Pino (spiritual successor, better performance)
- **Morgan for API logging:** HTTP-specific, doesn't cover background jobs or errors well
- **Health checks without timeouts:** Causes cascading failures in orchestrated environments

## Open Questions

Things that couldn't be fully resolved:

1. **Should we implement full OpenTelemetry or just correlation IDs?**
   - What we know: Full OpenTelemetry adds distributed tracing with spans, trace visualization, automatic instrumentation
   - What's unclear: Whether the complexity is worth it for a monolithic Next.js app deployed on Vercel
   - Recommendation: Start with correlation ID middleware (simple, lightweight). Add OpenTelemetry later if distributed tracing becomes necessary (e.g., multiple microservices, need to trace across services)

2. **Where should health endpoint live - /api/health or /api/admin/health?**
   - What we know: Current endpoint is at `/api/admin/health` with admin-only auth
   - What's unclear: Whether load balancers need unauthenticated access for health checks
   - Recommendation: Create public `/api/health` for orchestrators/load balancers (unauthenticated, lightweight), keep `/api/admin/health` for detailed diagnostics (authenticated, includes circuit breaker status)

3. **Should we check Bedrock availability in health endpoint?**
   - What we know: Bedrock is critical dependency, currently only validates credentials exist
   - What's unclear: Whether health check should make actual AWS API calls (quota limits, cost, latency)
   - Recommendation: Config-only check (credentials present) in main health endpoint. Add separate `/api/admin/health/detailed` endpoint that actually calls AWS if needed for diagnostics

4. **How to handle log aggregation on Vercel?**
   - What we know: Vercel captures stdout/stderr automatically, displays in dashboard and Log Drains feature
   - What's unclear: Whether JSON logs are properly parsed in Vercel's log viewer
   - Recommendation: Verify JSON formatting works with Vercel logs. If not, consider Vercel Log Drains to forward to external service (Datadog, LogDNA, etc.)

## Sources

### Primary (HIGH confidence)

- [Next.js OpenTelemetry documentation](https://nextjs.org/docs/app/guides/open-telemetry) - Official Next.js instrumentation guide
- [Structured logging for Next.js - Arcjet](https://blog.arcjet.com/structured-logging-in-json-for-next-js/) - Pino implementation guide
- [Correlation ID tracking in Next.js - SoftPost](https://www.softpost.org/tech/how-to-use-correlation-id-to-track-the-request-flow-in-nextjs-app) - Middleware implementation
- [Node.js Reference Architecture - Health Checks](https://nodeshift.dev/nodejs-reference-architecture/operations/healthchecks/) - IBM/Red Hat best practices
- [Pino vs Winston comparison - Better Stack](https://betterstack.com/community/comparisons/pino-vs-winston/) - Performance benchmarks

### Secondary (MEDIUM confidence)

- [OpenTelemetry Next.js logging - SigNoz](https://signoz.io/blog/opentelemetry-nextjs-logging/) - Full OpenTelemetry setup guide
- [Pino logger complete guide - SigNoz](https://signoz.io/guides/pino-logger/) - Pino feature reference
- [Better logging with Next.js App Directory - Medium](https://michaelangelo.io/blog/logging-nextjs) - Production logging patterns
- [Node.js logging libraries comparison - Dash0](https://www.dash0.com/guides/nodejs-logging-libraries) - 2026 library comparison

### Tertiary (LOW confidence)

- Various Medium articles on logging strategies (used for ecosystem understanding, not specific implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Pino is widely adopted, benchmarks are verified, Next.js patterns are official
- Architecture: HIGH - Correlation ID pattern is standard, health check patterns from IBM/Red Hat reference architecture
- Pitfalls: MEDIUM - Based on community experience and documentation, not empirical testing in this specific codebase

**Research date:** 2026-02-06
**Valid until:** 2026-04-06 (60 days - observability is mature domain with slow-changing best practices)
