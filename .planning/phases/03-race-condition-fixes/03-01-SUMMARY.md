---
phase: 03-race-condition-fixes
plan: 01
subsystem: api
tags: [race-condition, import, duplicate-detection, 409-conflict, supabase]

# Dependency graph
requires:
  - phase: 02-memory-resource-cleanup
    provides: standardized error handling patterns, timeout handling
provides:
  - duplicate import guard preventing concurrent imports per user
  - 409 Conflict response for active imports < 15 min
  - stuck import detection and retry for imports >= 15 min
  - processing_started_at timestamp tracking on import jobs
  - client-side 409 handling with user-friendly messaging
affects: [03-race-condition-fixes, import-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Duplicate detection guard: query-before-upsert with time-based threshold"
    - "HTTP 409 Conflict for business-logic duplicate rejection"

key-files:
  created: []
  modified:
    - app/api/import/queue-processing/route.ts
    - app/import/page.tsx

key-decisions:
  - "15-minute threshold distinguishes fresh vs stuck imports"
  - "409 Conflict is the correct HTTP status for duplicate resource creation"
  - "Fallback to Date.now() when processing_started_at is null (first-time edge case)"

patterns-established:
  - "Duplicate detection: query existing state before mutation, use time threshold to distinguish fresh vs stuck"
  - "Client 409 handling: parse structured error body, show user-friendly message, return early before generic handler"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 3 Plan 1: Duplicate Import Detection Summary

**Duplicate import guard with 15-min stuck threshold on queue-processing route and 409 handling on import page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T16:17:14Z
- **Completed:** 2026-02-06T16:19:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added duplicate import detection guard that queries user_profiles before setting processing status
- Fresh imports (< 15 min) are rejected with 409 Conflict containing elapsed time
- Stuck imports (>= 15 min) are logged as warnings and allowed to retry
- Import page now handles 409 specifically with user-friendly elapsed time message

## Task Commits

Each task was committed atomically:

1. **Task 1: Add duplicate import guard to queue-processing route** - `65fa178` (feat)
2. **Task 2: Handle 409 duplicate rejection on import page** - `782ae5a` (feat)

## Files Created/Modified
- `app/api/import/queue-processing/route.ts` - Added duplicate guard before upsert, added processing_started_at tracking
- `app/import/page.tsx` - Added 409-specific handler before generic error handler

## Decisions Made
- 15-minute threshold for stuck detection: matches the existing stuck detection logic already present in the import page's initial status check
- Fallback to `Date.now()` when `processing_started_at` is null: handles edge case where column doesn't exist yet for a user, treating it as "just started"
- HTTP 409 Conflict: semantically correct status code for "resource already being created"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Duplicate import detection is in place for the queue-processing route
- The `processing_started_at` column must exist on the `user_profiles` table in Supabase (if not already present, the upsert will simply include it)
- Ready for remaining race condition fixes (03-02, 03-03)

## Self-Check: PASSED

---
*Phase: 03-race-condition-fixes*
*Completed: 2026-02-06*
