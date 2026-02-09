---
phase: 01-core-migration
plan: 04
subsystem: api, ui
tags: [vercel, proxy, rlm, polling, progress, supabase, react]

# Dependency graph
requires:
  - phase: 01-core-migration (01-01)
    provides: progress_percent and import_stage columns in user_profiles
  - phase: 01-core-migration (01-03)
    provides: RLM /import-full endpoint for streaming import processing
provides:
  - Vercel thin proxy /api/import/trigger (auth + fire RLM + 202 return)
  - Frontend progress polling via user_profiles (real-time stage updates)
  - End-to-end flow from upload to RLM processing with progress UI
affects: [01-05-e2e-testing, frontend, import-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thin proxy pattern: Vercel does auth only, RLM does heavy processing"
    - "Database polling pattern: Frontend polls user_profiles every 2s for progress_percent and import_stage"
    - "Fire-and-forget with acceptance timeout: 10s timeout to confirm RLM accepted, non-fatal on abort"

key-files:
  created:
    - app/api/import/trigger/route.ts
  modified:
    - app/import/page.tsx

key-decisions:
  - "10s timeout for RLM acceptance confirmation - AbortError treated as non-fatal (RLM may still process)"
  - "Poll every 2 seconds for progress (balanced between responsiveness and server load)"
  - "Check for both quick_ready and complete status to handle different RLM completion states"

patterns-established:
  - "Thin proxy: maxDuration 30s (not 300s), auth + trigger + return 202"
  - "Progress polling: useRef for interval ID, useEffect cleanup on unmount"
  - "Duplicate import guard: 15-minute stuck threshold with retry allowance"

# Metrics
duration: 2min
completed: 2026-02-09
---

# Phase 1 Plan 4: Vercel Thin Proxy + Frontend Progress Polling Summary

**Vercel /api/import/trigger thin proxy with auth+fire+202, frontend polls user_profiles for real RLM progress**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-09T22:38:14Z
- **Completed:** 2026-02-09T22:40:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created /api/import/trigger as minimal auth proxy (maxDuration 30s vs old 300s)
- Replaced fake progress animation with real database polling for RLM progress
- Frontend now shows actual import_stage messages from RLM pipeline
- TypeScript type check passes clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Vercel thin proxy endpoint /api/import/trigger** - `92ac6d8` (feat)
2. **Task 2: Wire frontend to trigger endpoint with progress polling** - `e8ccf85` (feat)

## Files Created/Modified
- `app/api/import/trigger/route.ts` - Thin proxy: auth, rate limit, duplicate guard, fire RLM /import-full, return 202
- `app/import/page.tsx` - Replaced queue-processing with trigger call, added Supabase progress polling every 2s

## Decisions Made
- **10s RLM acceptance timeout:** AbortError is non-fatal since RLM uses fire-and-forget pattern; the job may still process even if the acceptance confirmation times out
- **2-second polling interval:** Balances UI responsiveness with Supabase query load; faster than the old 5-second poll
- **Check both quick_ready and complete:** RLM pipeline may set either status depending on which pass completes; handle both for robustness
- **Reuse existing progressIntervalRef:** The import page already had a useRef for interval tracking; reused it rather than adding new state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed setStage to setProgressStage**
- **Found during:** Task 2 (Frontend wiring)
- **Issue:** Plan code used `setStage()` but the actual state setter is `setProgressStage()`
- **Fix:** Changed `setStage(data.import_stage || 'Processing...')` to `setProgressStage(data.import_stage || 'Processing...')`
- **Files modified:** app/import/page.tsx
- **Verification:** TypeScript compiles clean (npx tsc --noEmit)
- **Committed in:** e8ccf85 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor naming fix, no scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Thin proxy endpoint ready, frontend wired with real progress polling
- End-to-end flow: Upload -> Supabase Storage -> /api/import/trigger -> RLM /import-full -> progress polling -> redirect to /chat
- Ready for Plan 01-05 (end-to-end testing / final wiring)
- Old queue-processing endpoint still exists but is no longer called by frontend (can be removed in cleanup)

## Self-Check: PASSED

---
*Phase: 01-core-migration*
*Completed: 2026-02-09*
