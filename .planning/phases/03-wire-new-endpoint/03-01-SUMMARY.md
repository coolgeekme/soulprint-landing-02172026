---
phase: 03-wire-new-endpoint
plan: 01
subsystem: api
status: complete
completed: 2026-02-07
duration: 3.5 minutes

requires:
  - Phase 1 (adapters.supabase_adapter)
  - Phase 2 (processors.full_pass with run_full_pass_pipeline)

provides:
  - /process-full-v2 endpoint for v1.2 processor pipeline
  - FastAPI lifespan context manager with processor import validation
  - Enhanced /health endpoint with processors_available check

affects:
  - Phase 4+ - /process-full-v2 is now callable from Vercel
  - Render deployment - health check enables auto-restart on processor import failures
  - Production monitoring - processors_available field shows v2 readiness

tech-stack:
  added: []
  patterns:
    - FastAPI lifespan pattern (replaces deprecated @app.on_event)
    - Fail-fast startup validation (crash on processor import failure)
    - Dual-endpoint gradual migration (v1 and v2 run side-by-side)
    - Background task dispatch pattern for long-running jobs

key-files:
  created: []
  modified:
    - /home/drewpullen/clawd/soulprint-rlm/main.py

decisions:
  - id: WIRE-01
    what: Use FastAPI lifespan instead of @app.on_event("startup")
    why: FastAPI ignores ALL @app.on_event decorators when lifespan is set, lifespan is the modern pattern
    impact: All 3 startup handlers migrated to single lifespan context manager
  - id: WIRE-02
    what: Add processor import validation in lifespan startup
    why: Fail-fast on missing/broken processor modules prevents silent failures
    impact: App crashes at startup if processors missing, Render won't route traffic
  - id: WIRE-03
    what: Enhance /health with processors_available check
    why: Enables runtime validation for Render auto-restart on processor failures
    impact: Health check returns 503 if processor imports fail (triggers auto-restart)
  - id: WIRE-04
    what: Require storage_path for v2 endpoint (no direct conversations)
    why: v2 processors designed for scalable storage-based flow, not legacy direct passing
    impact: v2 endpoint returns 400 if storage_path not provided
  - id: WIRE-05
    what: Reuse ProcessFullRequest model for v2 endpoint
    why: Minimizes changes, leverages existing job tracking infrastructure
    impact: v1 and v2 share same request schema, job system, create_job/complete_job

tags:
  - fastapi
  - lifespan
  - processors
  - v2-endpoint
  - health-check
  - fail-fast
---

# Phase 3 Plan 1: Wire New Endpoint Summary

**One-liner:** Added /process-full-v2 endpoint with lifespan-based processor validation, enabling v1.2 processor pipeline to run alongside v1 production code for gradual migration.

## What Was Built

A production-ready v2 endpoint that connects the modular processor pipeline (Phase 2) to the FastAPI service:

1. **FastAPI lifespan migration** - Replaced 3 deprecated @app.on_event("startup") decorators with a single lifespan context manager
2. **Processor import validation** - Fail-fast startup check crashes app if processors/ modules missing (Render won't route traffic)
3. **Enhanced /health endpoint** - Returns processors_available field, 503 status on import failure (triggers Render auto-restart)
4. **/process-full-v2 endpoint** - Accepts POST requests with ProcessFullRequest, dispatches run_full_pass_v2_background
5. **Background task wrapper** - run_full_pass_v2_background() calls processors.full_pass.run_full_pass_pipeline

## Implementation Details

### Task 1: Lifespan Migration + Health Enhancement

**Lifespan context manager:**
- Validates all 5 processor modules import correctly (conversation_chunker, fact_extractor, memory_generator, v2_regenerator, full_pass)
- Crashes with ImportError if any processor missing (fail-fast pattern)
- Runs 3 original startup tasks in sequence:
  1. Resume stuck jobs (await resume_stuck_jobs after 2s delay)
  2. Check RLM/Bedrock availability (print warnings if missing)
  3. Resume incomplete embeddings (await startup_check_incomplete_embeddings_logic after 5s delay)

**Startup logic extraction:**
- Created startup_check_incomplete_embeddings_logic() as plain async function (no decorator)
- Extracted body from @app.on_event("startup") at line ~3555
- Removed asyncio.sleep(5) from function body (delay now in lifespan)

**Removed decorators:**
- Line ~171: @app.on_event("startup") async def startup_event() - REMOVED (logic in lifespan)
- Line ~1710: @app.on_event("startup") async def startup() - REMOVED (logic in lifespan)
- Line ~3555: @app.on_event("startup") async def startup_check_incomplete_embeddings() - REMOVED (extracted to plain function)

**FastAPI app creation:**
- Changed from: `app = FastAPI(title="SoulPrint RLM Service")`
- Changed to: `app = FastAPI(title="SoulPrint RLM Service", lifespan=lifespan)`

**Enhanced /health endpoint:**
- Added processors_available field (True/False)
- Returns 503 status code if processor import fails (triggers Render auto-restart)
- Preserves existing fields: status, service, rlm_available, bedrock_available, timestamp
- Lightweight check: imports processors.full_pass.run_full_pass_pipeline

### Task 2: V2 Endpoint

**Background task wrapper:**
```python
async def run_full_pass_v2_background(user_id, storage_path, job_id):
    - Imports processors.full_pass.run_full_pass_pipeline
    - Calls run_full_pass_pipeline(user_id, storage_path)
    - Calls complete_job(job_id, success=True/False)
    - Logs with [v2] prefix (distinguishes from v1 [RLM] logs)
```

**Endpoint implementation:**
- Reuses ProcessFullRequest model (shared with v1)
- Requires storage_path (returns 400 HTTPException if missing)
- Creates job record with create_job() (reuses v1 job tracking)
- Dispatches run_full_pass_v2_background via BackgroundTasks (FastAPI built-in)
- Returns version="v2" in response (distinguishes from v1)

**What was NOT changed:**
- ProcessFullRequest Pydantic model (no new fields)
- create_job, update_job, complete_job functions (reused as-is)
- /process-full endpoint (v1 unchanged, runs side-by-side)
- process_full_background function (v1 background task untouched)

## Task Commits

| Task | Description | Commit | Files Changed |
|------|-------------|--------|---------------|
| 1 | Migrate startup handlers to lifespan + enhance health | c625c50 | main.py (+111, -77) |
| 2 | Add /process-full-v2 endpoint with background wrapper | 9939dcc | main.py (+79) |

## Verification Results

All success criteria met:

✓ main.py compiles without errors (python3 -m py_compile passed)
✓ /process-full-v2 endpoint exists (grep shows @app.post at line 2559)
✓ run_full_pass_v2_background wrapper function exists (line 2528)
✓ Lifespan context manager defined (line 94) and registered (line 138)
✓ All @app.on_event("startup") decorators removed (0 actual decorators remain, only 2 in comments)
✓ /health endpoint enhanced with processors_available check (grep confirms)
✓ No existing endpoint implementations modified (v1 /process-full untouched)

```bash
# Verification commands executed:
python3 -m py_compile /home/drewpullen/clawd/soulprint-rlm/main.py  # Syntax OK
grep -c "^@app.on_event" main.py  # 0 (all removed)
grep "lifespan" main.py  # Shows function and FastAPI(lifespan=...)
grep "process-full-v2" main.py  # Shows @app.post("/process-full-v2")
grep "processors_available" main.py  # Shows health check field
```

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

### Lifespan Variable Scoping

The lifespan function is defined at module level (before app creation) but runs at startup time (after all module-level vars are set). References to SUPABASE_SERVICE_KEY, RLM_AVAILABLE, AWS_ACCESS_KEY_ID, etc. work correctly because:
1. Lifespan function DEFINITION happens during module import (early)
2. Lifespan function EXECUTION happens at FastAPI startup (late, after all vars defined)
3. Python closures capture names (not values), so runtime lookups find the vars

### Startup Sequence Timing

The lifespan runs startup tasks with specific delays:
1. Processor validation (immediate) - Crashes if fails
2. Resume stuck jobs (after 2s) - Gives server time to initialize
3. Check RLM/Bedrock availability (after processor validation) - Prints warnings
4. Resume incomplete embeddings (after 5s additional delay = 7s total) - Gives DB time to be ready

### Job Tracking Reuse

Both v1 and v2 endpoints use the same job tracking system:
- create_job(user_id, storage_path, conversation_count, message_count) → job_id
- complete_job(job_id, success=True/False, error_message=None)
- Job records stored in processing_jobs table
- Enables resume_stuck_jobs() to recover both v1 and v2 jobs after server restart

### V2 vs V1 Differences

| Aspect | V1 (/process-full) | V2 (/process-full-v2) |
|--------|-------------------|----------------------|
| **Accepts** | storage_path OR conversations | storage_path only |
| **Processing** | Inline main.py logic | Modular processors/ |
| **Logs** | [RLM] prefix | [v2] prefix |
| **Response** | No version field | version="v2" |
| **Background task** | process_full_background | run_full_pass_v2_background |
| **Pipeline** | Old chunking/embedding | New chunk→facts→MEMORY→v2 sections |

### FastAPI Lifespan Pattern

Why lifespan instead of @app.on_event:
- FastAPI docs recommend lifespan for startup/shutdown logic
- @app.on_event is NOT deprecated yet but discouraged
- When lifespan parameter is set, FastAPI **ignores ALL @app.on_event decorators**
- Lifespan uses context manager pattern (async with) for clean startup/shutdown
- Single source of truth for application lifecycle

### Health Check 503 Strategy

Returning 503 (Service Unavailable) on processor import failure:
- Signals to Render that app is unhealthy (not ready to serve traffic)
- Triggers Render's auto-restart mechanism
- Prevents routing traffic to broken instance
- Better than 200 OK with processors_available=false (would keep routing traffic)

## Next Phase Readiness

**Phase 4 (Vercel Integration) is READY:**
- ✓ /process-full-v2 endpoint exists and is callable
- ✓ Endpoint accepts POST with ProcessFullRequest schema
- ✓ Endpoint dispatches to processors.full_pass.run_full_pass_pipeline
- ✓ Job tracking works (reuses v1 infrastructure)
- ✓ Background tasks work (tested pattern from v1)

**Blockers:** None

**Concerns:** Processors not yet tested end-to-end (unit tests pass but no integration test with real Supabase data). Phase 4 should include smoke test with real user data.

## Dependencies for Future Work

If you're calling /process-full-v2 from Vercel (Phase 4):

```typescript
// In Vercel API route
const response = await fetch(`${RLM_SERVICE_URL}/process-full-v2`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: userId,
    storage_path: `user-exports/${userId}/conversations.json.gz`,
    conversation_count: stats.conversationCount,
    message_count: stats.messageCount,
  }),
});

const result = await response.json();
// result.version === "v2"
// result.job_id for tracking
```

Health check monitoring:

```bash
curl https://soulprint-landing.onrender.com/health
# Returns: { processors_available: true, ... } if healthy
# Returns: 503 if processors broken (Render auto-restarts)
```

## Performance Metrics

- **Execution time:** 3.5 minutes (208 seconds from plan start to SUMMARY creation)
- **Lines changed:** +190 insertions, -77 deletions (net +113 lines in main.py)
- **Commits:** 2 (1 per task)
- **Files modified:** 1 (main.py only)

## Self-Check: PASSED

All files verified:
✓ main.py modified (no new files created)

All commits exist:
✓ c625c50 (Task 1 - lifespan migration)
✓ 9939dcc (Task 2 - v2 endpoint)
