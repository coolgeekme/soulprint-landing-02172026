---
phase: 02-prompt-template-system
plan: 03
subsystem: evaluation
tags: [opik, evaluation, prompt-engineering, a-b-testing, llm-as-judge]

# Dependency graph
requires:
  - phase: 02-01
    provides: PromptBuilder class with v1-technical and v2-natural-voice versions
  - phase: 01-02
    provides: Experiment runner framework with runExperiment and PromptVariant interface
provides:
  - v2-natural-voice prompt variant integrated into evaluation framework
  - A/B comparison capability between v1-technical and v2-natural-voice
  - Updated experiment runner CLI supporting v2 variant
affects: [02-prompt-template-system, evaluation-workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PromptVariant interface for pluggable prompt strategies in evaluation"
    - "ChatEvalItem to PromptParams mapping pattern for v2 builder integration"

key-files:
  created: []
  modified:
    - lib/evaluation/baseline.ts
    - scripts/run-experiment.ts

key-decisions:
  - "v2 builder uses simplified PromptParams (no dailyMemory/memoryContext) for style comparison, not runtime feature comparison"
  - "recordBaseline() accepts optional variant parameter (non-breaking change, defaults to v1)"
  - "v1 baseline remains frozen (not refactored to use PromptBuilder) for historical accuracy"

patterns-established:
  - "ChatEvalItem structured sections (soul, identity, user, agents, tools) JSON.stringify into PromptBuilder *_md fields"
  - "VARIANTS map in CLI scripts for variant registry and name-based selection"

# Metrics
duration: 2min
completed: 2026-02-09
---

# Phase 2 Plan 3: Wire v2 Prompt Variant to Evaluation Summary

**v2-natural-voice prompt variant wired into evaluation framework for A/B comparison against v1-baseline using Opik experiments**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-02-09T03:30:27Z
- **Completed:** 2026-02-09T03:32:41Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added v2-natural-voice prompt variant to evaluation baseline with buildV2SystemPrompt function
- Integrated v2 variant into experiment runner CLI for command-line A/B testing
- Made recordBaseline() accept optional variant parameter for future flexibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Add v2 prompt variant to evaluation baseline** - `cc2db1c` (feat)
2. **Task 2: Add v2 variant to experiment runner CLI** - `98f4a4e` (feat)

## Files Created/Modified
- `lib/evaluation/baseline.ts` - Added buildV2SystemPrompt() and v2PromptVariant, updated recordBaseline() to accept optional variant
- `scripts/run-experiment.ts` - Added v2-natural-voice to VARIANTS map, updated help text and examples

## Decisions Made

**1. Simplified PromptParams for v2 eval builder**
- v2's buildV2SystemPrompt() intentionally omits runtime features (dailyMemory, memoryContext, webSearch)
- Rationale: We're measuring prompt STYLE differences (markdown headers vs flowing prose), not runtime feature differences
- Both v1 and v2 use the same static ChatEvalItem context for fair comparison

**2. Non-breaking recordBaseline() enhancement**
- Added optional `variant?: PromptVariant` parameter with default to v1PromptVariant
- Rationale: Allows future recording of v2 baselines without breaking existing callers
- Existing scripts continue to work without changes

**3. Kept v1 baseline frozen**
- v1 prompt builder remains inline, not refactored to use PromptBuilder
- Rationale: Baseline is a historical snapshot of production behavior from Phase 1; refactoring would break the comparison reference point

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready for Phase 2 completion:**
- v2-natural-voice variant is now measurable against v1-baseline
- Developers can run: `npx tsx scripts/run-experiment.ts --dataset <name> --variant v2-natural-voice`
- Phase 2 success criterion "personality adherence maintained within 2% of baseline" is now verifiable
- All 3 Phase 2 plans complete (PromptBuilder class → Python sync → evaluation integration)

**Blockers:** None

**Next steps:**
- Run experiment comparing v1 vs v2 on the same dataset
- Verify personality adherence scores are within 2% threshold
- If v2 passes, deploy to production with PROMPT_VERSION=v2-natural-voice

## Self-Check: PASSED

All modified files exist:
- lib/evaluation/baseline.ts
- scripts/run-experiment.ts

All commits exist:
- cc2db1c
- 98f4a4e

---
*Phase: 02-prompt-template-system*
*Completed: 2026-02-09*
