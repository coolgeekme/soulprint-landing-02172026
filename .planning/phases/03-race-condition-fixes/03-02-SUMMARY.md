---
phase: 3
plan: 2
subsystem: chat-reliability
tags: [retry, exponential-backoff, error-ui, fetch, resilience]
dependency-graph:
  requires: [01-01]
  provides: [fetchWithRetry-utility, save-error-indicator]
  affects: [03-03]
tech-stack:
  added: []
  patterns: [exponential-backoff-with-jitter, abort-signal-composition]
key-files:
  created: [lib/retry.ts]
  modified: [app/chat/page.tsx]
decisions:
  - id: D-0302-1
    summary: "Use AbortSignal.any for composing caller + timeout signals with feature detection fallback"
metrics:
  duration: 1m 59s
  completed: 2026-02-06
---

# Phase 3 Plan 2: Message Save Retry with Error Indicator Summary

**BUG-03 fix:** fetchWithRetry utility with exponential backoff + visible error banner in chat UI when message persistence fails.

## One-liner

Reusable fetchWithRetry with 2^n backoff + jitter, wired into chat saveMessage with dismissable red error banner on failure.

## What Was Done

### Task 1: Create reusable fetchWithRetry utility
- Created `lib/retry.ts` exporting `fetchWithRetry(url, options?, config?)`
- Default 3 attempts, 1000ms base delay
- Backoff: `2^attempt * baseDelayMs + random(0-1000)` jitter
- Does NOT retry on AbortError (re-throws immediately)
- Does NOT retry on HTTP 4xx (returns response as-is)
- Retries on HTTP 5xx and network errors (TypeError)
- 10s timeout per attempt via AbortSignal.timeout(10000)
- Composes caller signal + timeout via AbortSignal.any with feature detection fallback
- Logs each retry attempt with delay info
- Throws `Failed after N attempts` when exhausted

### Task 2: Wire retry into chat saveMessage with error indicator
- Imported `fetchWithRetry` into `app/chat/page.tsx`
- Added `saveError` state (`string | null`)
- Replaced raw `fetch` in `saveMessage` with `fetchWithRetry`
- On non-ok response after retries: sets user-visible error message
- On catch (all retries exhausted): sets different error message
- On success: clears any previous saveError
- Added fixed-position dismissable red error banner between chat and memory indicator
- Banner appears at bottom of screen with backdrop blur, red theme matching existing error UI

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create fetchWithRetry utility | bb94132 | lib/retry.ts |
| 2 | Wire retry into saveMessage + error banner | 7cdf70d | app/chat/page.tsx |

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0302-1 | AbortSignal.any with feature detection fallback | Composes caller signal + timeout when available; degrades gracefully in older runtimes |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npm run build` succeeds with no errors
- `npx vitest run` -- all 48 existing tests pass (4 test files)
- `lib/retry.ts` exports fetchWithRetry with correct retry logic
- `app/chat/page.tsx` uses fetchWithRetry in saveMessage function
- Error banner renders conditionally when saveError is set

## Next Phase Readiness

No blockers. The `fetchWithRetry` utility in `lib/retry.ts` is reusable and can be adopted by other API calls (e.g., RLM queries, memory status polling) in future plans.

## Self-Check: PASSED
