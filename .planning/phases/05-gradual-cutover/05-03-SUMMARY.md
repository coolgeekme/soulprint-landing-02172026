---
phase: 05-gradual-cutover
plan: 03
subsystem: deployment
tags: [runbook, sql-queries, monitoring, cutover-strategy, production]

# Dependency graph
requires:
  - phase: 05-01
    provides: "V2_ROLLOUT_PERCENT traffic routing logic in Next.js"
  - phase: 05-02
    provides: "RFC 8594 deprecation headers on v1 /process-full"
provides:
  - "Stage-by-stage cutover runbook (10% → 50% → 100% → deprecate)"
  - "Production validation SQL queries for monitoring success rates"
  - "Emergency rollback procedure with exact commands"
  - "Human-timeline deployment tooling for safe migration"
affects: [deployment, monitoring, production-migration]

# Tech tracking
tech-stack:
  added: []
  patterns: ["staged-rollout", "validation-gates", "emergency-rollback", "sql-monitoring"]

key-files:
  created:
    - ".planning/phases/05-gradual-cutover/CUTOVER-RUNBOOK.md"
    - ".planning/phases/05-gradual-cutover/validation-queries.sql"
  modified: []

key-decisions:
  - "Cutover follows 4 stages: 10% (24h) → 50% (48h) → 100% (7+ days) → deprecate v1 (7+ days)"
  - "Each stage has explicit validation gates (95% success rate, zero stuck imports)"
  - "Emergency rollback via V2_ROLLOUT_PERCENT=0 (no code deploy needed)"
  - "Six SQL validation queries cover success rate, stuck imports, performance, errors, timeline"

patterns-established:
  - "Staged rollout pattern: Start small (10%), validate 24h, increase gradually, explicit gates at each stage"
  - "Validation query pattern: Run after stage change, interpret results against gate criteria, document baseline"
  - "Emergency rollback pattern: Environment variable toggle, verify in logs, wait for in-flight jobs, investigate root cause"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 05 Plan 03: Cutover Runbook Summary

**Complete cutover tooling with stage-by-stage runbook (10% → 50% → 100% → deprecate), six SQL validation queries, and emergency rollback procedure — ready for human-timeline production migration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T11:30:00Z (approximate, continuation from checkpoint)
- **Completed:** 2026-02-07T11:32:00Z (approximate)
- **Tasks:** 2 (1 automated + 1 human checkpoint approved)
- **Files created:** 2

## Accomplishments
- Stage-by-stage cutover runbook covering all 4 rollout stages with explicit validation gates
- Six production SQL validation queries (success rate, stuck imports, performance histogram, error patterns, v1/v2 comparison, timeline)
- Emergency rollback procedure with exact commands and decision criteria table
- Human checkpoint approved: Tooling verified and ready for production deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Create validation SQL queries and cutover runbook** - `b8e4588` (docs)
2. **Task 2: Human verification of cutover tooling** - Checkpoint approved by user

## Files Created/Modified

**Created:**
- `.planning/phases/05-gradual-cutover/CUTOVER-RUNBOOK.md` - Complete cutover procedure with 4 stages, prerequisites, monitoring tools reference
- `.planning/phases/05-gradual-cutover/validation-queries.sql` - Six SQL queries for production monitoring with interpretation guidance

## Decisions Made

**Staged rollout timeline:**
- Stage 1: 10% for 24 hours (canary)
- Stage 2: 50% for 48 hours (broader validation)
- Stage 3: 100% for 7+ days (full cutover, stability monitoring)
- Stage 4: Deprecate v1 after 7+ days at 100% with zero v1 traffic

**Validation gate criteria:**
- Success rate >= 95% (Query 1)
- Zero stuck imports or all resolved within 2 hours (Query 2)
- No systemic errors (Query 4)
- Zero user complaints
- Stable resource usage in Render logs

**Emergency rollback triggers:**
- Success rate < 95%: Immediate rollback
- >10 stuck imports in 1 hour: Immediate rollback
- User complaints about failed imports: Rollback within 1 hour
- Any data corruption: Immediate rollback + incident investigation

**Query design:**
- Query 1: Overall success rate (run after every stage change)
- Query 2: Stuck imports (run if Query 1 shows issues)
- Query 3: Performance histogram (run daily during stages)
- Query 4: Error patterns (run if success rate drops)
- Query 5: V1 vs V2 comparison (commented out, requires pipeline_version column)
- Query 6: Recent timeline (run after stage change to verify traffic flow)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

This plan creates **human-timeline tooling** for production deployment. The remaining work happens over 3-4 weeks:

**DEPLOY-03:** Push soulprint-rlm to production
- `cd /home/drewpullen/clawd/soulprint-rlm && git push origin main`
- Verify Render deployment succeeds
- Confirm /health returns processors_available: true

**CUT-01:** Set V2_ROLLOUT_PERCENT in Vercel
- Start at 0% (all traffic to v1)
- Increase to 10% → 50% → 100% following runbook stages

**CUT-02:** Monitor validation queries
- Paste queries from validation-queries.sql into Supabase SQL Editor
- Run at intervals specified in runbook (hourly at 10%, every 12h at 50%, daily at 100%)
- Check gate criteria before proceeding to next stage

**CUT-03:** Deprecate v1 endpoint
- After 7+ days at 100% with zero v1 traffic
- Wait 7 more days with deprecation headers active
- Remove /process-full endpoint from main.py

## Next Phase Readiness

**Phase 5 complete - all automation plans shipped.**

Remaining work is human-timeline (cannot be automated):
1. Production RLM deployment (DEPLOY-03)
2. Gradual traffic increase over days/weeks (CUT-01, CUT-02)
3. V1 deprecation after 14+ days at 100% (CUT-03)

**Ready for production deployment:**
- ✅ V2_ROLLOUT_PERCENT routing logic deployed in Next.js
- ✅ RFC 8594 deprecation headers implemented on v1 endpoint
- ✅ Cutover runbook with explicit validation gates
- ✅ SQL validation queries ready to paste into Supabase
- ✅ Emergency rollback procedure documented
- ✅ All 4 phases (1-4) complete: adapter layer, processor modules, v2 endpoint, pipeline integration

**Blockers/Concerns:**
- None - all automation complete, tooling verified by user

**Timeline estimate:**
- Minimum 3 weeks: 24h at 10%, 48h at 50%, 7 days at 100%, 7 days deprecation
- Realistic 4-6 weeks: Account for weekend monitoring gaps, investigation time if issues arise

**Milestone v1.3 status:**
- All 5 phases complete (10/10 plans executed)
- Production deployment pending (human action)
- Full pass pipeline ready to process user imports

---
*Phase: 05-gradual-cutover*
*Completed: 2026-02-07*

## Self-Check: PASSED

All files and commits verified:
- ✅ Created file exists: .planning/phases/05-gradual-cutover/CUTOVER-RUNBOOK.md
- ✅ Created file exists: .planning/phases/05-gradual-cutover/validation-queries.sql
- ✅ Commit exists: b8e4588
