# Phase 3: Race Condition Fixes - Research

**Researched:** 2026-02-06
**Domain:** Async operations, race conditions, cancellation patterns, retry logic
**Confidence:** HIGH

## Summary

Race conditions in asynchronous JavaScript/React applications occur when multiple async operations compete to modify the same state, and their completion order is unpredictable. This phase addresses three critical race conditions in the SoulPrint application:

1. **Duplicate import processing** - Starting a new import while one is running creates duplicate jobs and database conflicts
2. **Failed message saves** - Network errors during chat message persistence are not retried, resulting in lost history
3. **Out-of-order polling responses** - Memory status polling can show stale data when slow responses arrive after newer ones

The standard approach uses **AbortController** for cancellation, **exponential backoff** for retries, and **sequence tracking** (request IDs or timestamps) for ordering guarantees. All three patterns are well-established in the React/Next.js ecosystem with HIGH confidence from official documentation.

**Primary recommendation:** Use native browser APIs (AbortController, AbortSignal.timeout) for cancellation, implement exponential backoff with jitter for retries, and add sequence numbers to polling requests to detect out-of-order responses.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| AbortController | Native | Request cancellation | Built into browsers and Node.js 15+, no dependencies required |
| AbortSignal.timeout() | Native | Timeout-based cancellation | Modern API (Node 17.3+, all modern browsers), cleaner than manual controller |
| fetch API | Native | HTTP requests with AbortSignal | Standard browser/Node API with first-class cancellation support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| exponential-backoff | 3.x | Retry with backoff | If hand-rolling retry logic becomes complex; includes jitter and max attempts |
| use-debounce | 10.x | Debounce rapid calls | If polling needs debouncing (not required for this phase) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native AbortController | axios with CancelToken | axios adds 15KB+ and its cancellation API is deprecated in favor of AbortController |
| Hand-rolled retry | exponential-backoff library | Library handles edge cases (jitter, max delay cap) but adds dependency; hand-rolled is simpler for basic retry |
| Sequence numbers | Timestamps | Timestamps work but sequence numbers are more explicit and don't depend on clock sync |

**Installation:**
```bash
# No installation needed - use native APIs
# Optional: If implementing complex retry logic
npm install exponential-backoff
```

## Architecture Patterns

### Pattern 1: Request Cancellation with AbortController
**What:** Cancel in-flight requests when they become stale (new request starts, component unmounts, timeout occurs)
**When to use:** Any async operation that can be superseded by a newer one (import processing, polling, search)
**Example:**
```typescript
// Source: React official docs + MDN AbortController
// In React useEffect
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/memory/status', { signal: controller.signal })
    .then(res => res.json())
    .then(data => setState(data))
    .catch(err => {
      // AbortError is expected when cleanup runs
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      handleError(err);
    });

  // Cleanup: abort when unmounting or effect re-runs
  return () => controller.abort();
}, [dependencies]);

// With timeout (Node 17.3+, modern browsers)
fetch('/api/endpoint', {
  signal: AbortSignal.timeout(15000) // 15s timeout
});
```

### Pattern 2: Duplicate Import Detection and Cancellation
**What:** Prevent concurrent import jobs for the same user by checking DB state before starting new job
**When to use:** Any long-running operation that shouldn't run concurrently (import, processing, generation)
**Example:**
```typescript
// Source: Database transaction pattern + AbortController
export async function POST(request: Request) {
  const { user } = await authenticate(request);

  // 1. Check for existing processing job
  const { data: profile } = await db
    .from('user_profiles')
    .select('import_status')
    .eq('user_id', user.id)
    .single();

  if (profile?.import_status === 'processing') {
    // Cancel the old job (if possible) or reject new job
    return NextResponse.json({
      error: 'Import already in progress. Please wait for it to complete.'
    }, { status: 409 }); // 409 Conflict
  }

  // 2. Atomically mark as processing
  await db.from('user_profiles').upsert({
    user_id: user.id,
    import_status: 'processing',
    processing_started_at: new Date().toISOString(),
  });

  // 3. Start job with timeout/cancellation
  const controller = new AbortController();
  try {
    await processImport(user.id, { signal: controller.signal });
  } catch (err) {
    // Handle cancellation
  }
}
```

### Pattern 3: Exponential Backoff Retry
**What:** Retry failed operations with exponentially increasing delays (1s, 2s, 4s, 8s...)
**When to use:** Network errors, transient failures, rate limiting
**Example:**
```typescript
// Source: Advanced Web Machinery + exponential-backoff library docs
async function saveWithRetry(data: any, maxAttempts = 3) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000), // 10s timeout per attempt
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json(); // Success

    } catch (err) {
      attempt++;

      // Don't retry AbortError (timeout/cancellation)
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }

      if (attempt >= maxAttempts) {
        throw new Error(`Failed after ${maxAttempts} attempts: ${err}`);
      }

      // Exponential backoff with jitter: 2^attempt * 1000ms ± random
      const baseDelay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      const jitter = Math.random() * 1000; // 0-1s random
      const delay = baseDelay + jitter;

      console.log(`Retry ${attempt}/${maxAttempts} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Pattern 4: Sequence Tracking for Polling
**What:** Track request order to ignore out-of-order responses
**When to use:** Polling, rapid sequential requests where only the latest matters
**Example:**
```typescript
// Source: Race condition handling patterns from React community
// In React component
const latestRequestIdRef = useRef(0);

useEffect(() => {
  const requestId = ++latestRequestIdRef.current;
  const controller = new AbortController();

  fetch('/api/memory/status', { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      // Ignore if a newer request was made
      if (requestId !== latestRequestIdRef.current) {
        console.log(`Ignoring stale response (${requestId} != ${latestRequestIdRef.current})`);
        return;
      }
      setState(data);
    })
    .catch(err => {
      if (err.name === 'AbortError') return; // Cancelled, expected
      console.error('Poll failed:', err);
    });

  return () => controller.abort();
}, [pollTrigger]);

// Alternative: Server-side sequence numbers
// Server returns: { data: {...}, sequence: 123 }
// Client tracks: lastSeenSequence and ignores sequence <= lastSeenSequence
```

### Anti-Patterns to Avoid
- **Fire-and-forget on Vercel:** Don't start async operations without awaiting them in Vercel serverless functions (function terminates when response is sent, killing pending promises)
- **Retry without backoff:** Hammering failed endpoints worsens server load; always use exponential backoff
- **Missing AbortError handling:** Treating cancellation as a real error clutters logs and confuses users
- **Boolean cancellation flags:** `let cancelled = false` is error-prone; use AbortController/AbortSignal for standard cancellation
- **Polling without cleanup:** Unmounted components continue polling, wasting resources and causing memory leaks

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request cancellation | `let cancelled = false` + manual checks | AbortController + AbortSignal | Native API handles edge cases (request in-flight, multiple cancellations, cleanup). Hand-rolled flags are error-prone. |
| Retry with backoff | Custom delay calculation | exponential-backoff library OR simple 2^attempt formula | Libraries handle jitter, max delay caps, max attempts. Simple formula (2^attempt * 1000) is fine for basic cases. |
| Timeout handling | `setTimeout` + `Promise.race` | AbortSignal.timeout(ms) | Modern API (Node 17.3+) is cleaner, integrates with fetch, no race conditions from manual cleanup |
| Duplicate prevention | Manual locks with booleans | Database status check + atomic upsert | Database is source of truth; in-memory locks don't work across serverless instances |

**Key insight:** Native browser/Node APIs (AbortController, AbortSignal.timeout, fetch) are mature and handle edge cases better than hand-rolled solutions. The ecosystem has converged on these patterns.

## Common Pitfalls

### Pitfall 1: Forgetting to Handle AbortError
**What goes wrong:** Cancellation triggers error handlers, flooding logs with false errors or showing error UI to users
**Why it happens:** AbortError is a normal DOMException thrown when fetch is aborted, not an actual failure
**How to avoid:** Always check `err.name === 'AbortError'` and return early without logging or showing errors
**Warning signs:** Console logs showing "AbortError" repeatedly during normal operations

### Pitfall 2: Not Cleaning Up AbortController in useEffect
**What goes wrong:** Fetch continues running after component unmounts, updating state on unmounted component (React warning, memory leak)
**Why it happens:** Missing cleanup function in useEffect that calls controller.abort()
**How to avoid:** ALWAYS return cleanup function from useEffect that aborts the controller
**Warning signs:** React warning "Can't perform state update on unmounted component", memory grows over time

### Pitfall 3: Reusing AbortController Across Multiple Requests
**What goes wrong:** Aborting cancels ALL requests associated with that controller, not just the intended one
**Why it happens:** Trying to save memory by reusing controller instances
**How to avoid:** Create a new AbortController for each request or request group; they're lightweight
**Warning signs:** Multiple requests being cancelled when only one should be

### Pitfall 4: Retry Loop Without Exit Condition
**What goes wrong:** Failed requests retry forever, blocking the UI or consuming resources
**Why it happens:** Missing maxAttempts check or error types that should abort (auth errors, 400s)
**How to avoid:** Always set maxAttempts (3-5 typical), don't retry client errors (4xx), immediately fail on AbortError
**Warning signs:** Network tab shows hundreds of failed requests, app becomes unresponsive

### Pitfall 5: Polling Without Sequence Tracking Creates Time-of-Check-to-Time-of-Use Issues
**What goes wrong:** Slow poll response #1 arrives after fast poll response #2, overwriting newer data with stale data
**Why it happens:** Network latency varies; later requests can complete before earlier ones
**How to avoid:** Use request IDs or sequence numbers to detect out-of-order responses and ignore them
**Warning signs:** UI shows data "jumping back" to old values, progress bars go backwards

### Pitfall 6: Using setInterval for Polling Without .unref()
**What goes wrong:** Serverless function doesn't exit even after response is sent, hitting timeout limits
**Why it happens:** Node's event loop waits for all timers to complete before exiting; setInterval keeps it alive
**How to avoid:** Call `.unref()` on timer immediately: `setInterval(...).unref()`
**Warning signs:** Vercel function logs show "Function timed out" after work is done

## Code Examples

### Cancel Import on New Import Request
```typescript
// In app/api/import/queue-processing/route.ts
// Source: Current codebase pattern + database transaction pattern

export async function POST(request: Request) {
  const { user } = await authenticate();

  // Check for duplicate import
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('import_status, processing_started_at')
    .eq('user_id', user.id)
    .single();

  // If already processing, check if stuck (>15 min) or actually running
  if (profile?.import_status === 'processing') {
    const startedAt = new Date(profile.processing_started_at).getTime();
    const elapsed = (Date.now() - startedAt) / 1000 / 60; // minutes

    if (elapsed < 15) {
      // Still fresh - reject duplicate
      return NextResponse.json({
        error: 'Import already in progress',
        status: 'processing',
        elapsedMinutes: Math.round(elapsed)
      }, { status: 409 });
    }

    // Stuck import - allow retry (old job is dead)
    console.log(`[Import] Stuck import detected (${elapsed}min), allowing retry`);
  }

  // Mark as processing atomically
  await supabase.from('user_profiles').upsert({
    user_id: user.id,
    import_status: 'processing',
    processing_started_at: new Date().toISOString(),
  });

  // Start processing with timeout
  const result = await fetch('/api/import/process-server', {
    method: 'POST',
    body: JSON.stringify({ userId: user.id, ... }),
    signal: AbortSignal.timeout(290000), // 290s (< 300s maxDuration)
  });

  return NextResponse.json(result);
}
```

### Message Save with Exponential Backoff
```typescript
// In app/chat/page.tsx
// Source: exponential-backoff pattern + current saveMessage function

async function saveMessageWithRetry(
  role: string,
  content: string,
  maxAttempts: number = 3
): Promise<void> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
        signal: AbortSignal.timeout(10000), // 10s per attempt
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Success
      console.log('[Chat] Message saved');
      return;

    } catch (error) {
      attempt++;

      // Don't retry timeouts/cancellations
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Chat] Message save timed out');
        throw error;
      }

      if (attempt >= maxAttempts) {
        console.error(`[Chat] Message save failed after ${maxAttempts} attempts`);
        throw new Error(`Failed to save message after ${maxAttempts} attempts`);
      }

      // Exponential backoff: 2s, 4s, 8s with jitter
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.log(`[Chat] Retry ${attempt}/${maxAttempts} after ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// UI: Show error indicator on failure
const [saveError, setSaveError] = useState<string | null>(null);

try {
  await saveMessageWithRetry('user', content);
  setSaveError(null);
} catch (err) {
  setSaveError('Failed to save message. Your conversation may not be saved.');
  // Show retry button in UI
}
```

### Polling with Sequence Tracking
```typescript
// In app/chat/page.tsx
// Source: React race condition patterns + current polling code

useEffect(() => {
  let isCancelled = false;
  let sequenceNumber = 0;

  const checkMemoryStatus = async () => {
    // Increment sequence before request
    const currentSeq = ++sequenceNumber;

    try {
      const res = await fetch('/api/memory/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      // Ignore if cancelled or out-of-order
      if (isCancelled) {
        console.log(`[Memory] Ignoring cancelled response (seq ${currentSeq})`);
        return;
      }

      if (currentSeq !== sequenceNumber) {
        console.log(`[Memory] Ignoring stale response (seq ${currentSeq} != ${sequenceNumber})`);
        return;
      }

      // This is the latest response - update state
      setMemoryStatus(data.status);
      setMemoryProgress(data.embeddingProgress || 0);

    } catch (err) {
      if (!isCancelled) {
        console.error('[Memory] Status check failed:', err);
      }
    }
  };

  // Initial check
  checkMemoryStatus();

  // Poll every 5s
  const interval = setInterval(checkMemoryStatus, 5000);
  interval.unref(); // Don't block serverless exit

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}, []);
```

### AbortController for All Fetch Calls
```typescript
// Pattern for any fetch call that should be cancellable
// Source: MDN AbortController docs + React patterns

// In React component
function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        const res = await fetch('/api/endpoint', {
          signal: controller.signal
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Expected cancellation
        }
        console.error('Fetch failed:', err);
      }
    }

    fetchData();

    return () => controller.abort();
  }, []);

  return <div>{data?.value}</div>;
}

// In API route (Next.js)
export async function GET(request: Request) {
  const controller = new AbortController();

  // Cleanup on request close (client disconnected)
  request.signal.addEventListener('abort', () => {
    controller.abort();
    console.log('[API] Client disconnected, aborting');
  });

  try {
    const result = await externalAPI({ signal: controller.signal });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Cancelled' }, { status: 499 });
    }
    throw err;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| axios.CancelToken | AbortController | 2020-2021 | axios deprecated CancelToken in favor of AbortController; native API is now standard |
| setTimeout + Promise.race for timeout | AbortSignal.timeout() | Node 17.3 (2022) | Cleaner API, no manual cleanup, works with fetch signal parameter |
| Manual boolean flags (`let cancelled = false`) | AbortController with signal | 2019-2020 | Native API handles edge cases (multiple aborts, request in-flight), integrates with fetch |
| Immediate retry | Exponential backoff with jitter | Always best practice | Prevents thundering herd, reduces server load during outages |
| Trusting request order | Sequence numbers or timestamps | Always needed for async | Network doesn't guarantee order; must detect out-of-order responses |

**Deprecated/outdated:**
- `axios.CancelToken`: Deprecated in axios v0.22.0 (2021), use AbortController instead
- `isCancel()` helper: No longer needed, check `err.name === 'AbortError'` directly
- Manual timeout with `Promise.race([fetch(), timeout()])`: Use `AbortSignal.timeout()` instead (Node 17.3+, modern browsers)
- Retry without jitter: Always add random jitter (0-1s) to backoff delay to prevent thundering herd

## Open Questions

1. **Circuit breaker for message saves?**
   - What we know: RLM service uses circuit breaker pattern (lib/rlm/health.ts)
   - What's unclear: Should message saves also use circuit breaker if API is failing repeatedly?
   - Recommendation: Start with exponential backoff (simpler). Add circuit breaker if save failures are common in production.

2. **Should import cancellation be active or passive?**
   - What we know: Current code rejects new import if one is running (passive)
   - What's unclear: Should we actively cancel the old job (kill process, update DB) or just reject?
   - Recommendation: Passive rejection is safer (no risk of corrupting in-progress job). Document that users must wait for stuck imports to time out (15 min).

3. **Sequence tracking: client or server-side?**
   - What we know: Client-side request IDs work for polling
   - What's unclear: Would server-side sequence numbers (returned in response) be better?
   - Recommendation: Client-side is sufficient (simpler, no DB changes). Server-side would help with debugging but adds complexity.

## Sources

### Primary (HIGH confidence)
- AbortController API: MDN Web Docs (official browser/Node.js API documentation)
- React useEffect cleanup: React official documentation
- AbortSignal.timeout(): Node.js official docs (v17.3+)
- Next.js fetch API: Vercel official documentation

### Secondary (MEDIUM confidence)
- [Using AbortController to deal with race conditions in React](https://wanago.io/2022/04/11/abort-controller-race-conditions-react/)
- [Fixing Race Conditions in React with useEffect](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect)
- [Retrying API Calls with Exponential Backoff in JavaScript](https://bpaulino.com/entries/retrying-api-calls-with-exponential-backoff)
- [exponential-backoff npm package](https://www.npmjs.com/package/exponential-backoff)
- [Handling API request race conditions in React](https://sebastienlorber.com/handling-api-request-race-conditions-in-react)

### Tertiary (LOW confidence)
- Next.js GitHub discussions on route cancellation (mixed patterns, no official guidance)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native APIs (AbortController, AbortSignal.timeout) are well-documented and stable
- Architecture: HIGH - Patterns verified in React official docs, MDN, and widespread community use
- Pitfalls: HIGH - Drawn from current codebase issues and documented React/Next.js gotchas

**Research date:** 2026-02-06
**Valid until:** 60 days (stable APIs, unlikely to change)
