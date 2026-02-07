---
phase: 05-gradual-cutover
plan: 01
subsystem: api
tags: [nextjs, traffic-routing, feature-flags, deployment]

# Dependency graph
requires:
  - phase: 04-pipeline-integration
    provides: RLM /process-full-v2 endpoint and pipeline hardening
provides:
  - Traffic routing logic with V2_ROLLOUT_PERCENT environment variable
  - Percentage-based split between v1 and v2 pipelines
  - Routing decision logging for observability
affects: [05-gradual-cutover, deployment, monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [percentage-based-feature-flags, environment-variable-configuration]

key-files:
  created: []
  modified: [app/api/import/process-server/route.ts]

key-decisions:
  - "V2_ROLLOUT_PERCENT defaults to 0 (safe default, all traffic to v1)"
  - "Routing decision made per-request using Math.random() for natural distribution"
  - "Routing logged with endpoint, percentage, and userId for monitoring"

patterns-established:
  - "Environment variable percentage routing: Read env var, clamp 0-100, use Math.random() for distribution"
  - "Structured logging for traffic routing decisions"

# Metrics
duration: 1min
completed: 2026-02-07
---

# Phase 05 Plan 01: Gradual Cutover Summary

**Traffic routing between v1 (/process-full) and v2 (/process-full-v2) pipelines controlled by V2_ROLLOUT_PERCENT environment variable (0-100)**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-07T11:30:24Z
- **Completed:** 2026-02-07T11:31:50Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- V2_ROLLOUT_PERCENT environment variable controls traffic split (default 0% = all v1)
- Percentage-based routing with safe value clamping (0-100 range)
- Routing decision logged for every request with endpoint, percentage, and userId
- Build passes with no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add V2_ROLLOUT_PERCENT traffic routing to process-server route** - `919f413` (feat)

## Files Created/Modified
- `app/api/import/process-server/route.ts` - Added V2_ROLLOUT_PERCENT routing logic before RLM call

## Decisions Made
- **Default to 0%**: V2_ROLLOUT_PERCENT defaults to 0, sending 100% traffic to v1 (/process-full). This is the safe default for deployment.
- **Per-request randomization**: Each request uses Math.random() to decide routing, providing natural traffic distribution.
- **Value clamping**: Invalid values (NaN, negative, >100) are safely clamped to 0-100 range.
- **Structured logging**: Every request logs routing decision with endpoint name, percentage, and userId for monitoring.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

Ready for deployment with V2_ROLLOUT_PERCENT=0 (safe default). Traffic routing is in place and can be gradually increased:
- V2_ROLLOUT_PERCENT=0: All traffic to v1 (current state)
- V2_ROLLOUT_PERCENT=10: 10% to v2, 90% to v1 (first test)
- V2_ROLLOUT_PERCENT=50: 50/50 split (confidence check)
- V2_ROLLOUT_PERCENT=100: All traffic to v2 (full cutover)

Logs will show routing decisions for monitoring during gradual rollout.

**Blockers/Concerns:**
- None - routing logic complete and tested (build passes)

---
*Phase: 05-gradual-cutover*
*Completed: 2026-02-07*

## Self-Check: PASSED

All files and commits verified.
