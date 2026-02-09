---
phase: 01-evaluation-foundation
plan: 02
subsystem: testing
tags: [opik, evaluation, experiments, baseline, bedrock, haiku-4.5, cli-scripts, prompt-variants]

# Dependency graph
requires:
  - phase: 01-01
    provides: ChatEvalItem type, createEvaluationDataset function, three custom judges
provides:
  - runExperiment function for offline prompt variant evaluation with aggregate scoring
  - recordBaseline function for capturing v1 prompt system metrics
  - v1PromptVariant with buildV1SystemPrompt replicating production chat route logic
  - Three CLI scripts for developer workflow (create dataset, run experiment, record baseline)
affects:
  - 02-prompt-template-system (v2 variants will use runExperiment for A/B comparison against v1 baseline)
  - 03-personality-engine (new judges or prompt variants may extend experiment runner)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PromptVariant interface: name + buildSystemPrompt for pluggable prompt strategies"
    - "Opik evaluate() integration with custom BaseMetric judges and aggregate computation"
    - "V1 prompt builder copied inline from chat route to freeze baseline snapshot"
    - "CLI scripts with dotenv/config, --help, arg parsing, env validation"

key-files:
  created:
    - lib/evaluation/experiments.ts
    - lib/evaluation/baseline.ts
    - scripts/create-eval-dataset.ts
    - scripts/run-experiment.ts
    - scripts/record-baseline.ts
  modified: []

key-decisions:
  - "Copied v1 buildSystemPrompt inline in baseline.ts rather than extracting shared helper from chat route -- Phase 2 will refactor the chat route entirely, so sharing now creates coupling Phase 2 immediately undoes"
  - "Used Array.from(buckets.entries()) for Map iteration instead of for...of to avoid downlevelIteration requirement with ES2017 target"
  - "Exported buildV1SystemPrompt and v1PromptVariant from baseline.ts for reuse by run-experiment.ts"
  - "CLI scripts use DOTENV_CONFIG_PATH=.env.local with import dotenv/config for environment loading"

patterns-established:
  - "PromptVariant pattern: { name, buildSystemPrompt(item) => string } for pluggable prompt strategies"
  - "CLI script pattern: printUsage, parseArgs, env validation, main with try/catch, process.exit"
  - "Experiment result aggregation: mean/min/max/count per metric from testResults"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 1 Plan 2: Experiment Runner and CLI Scripts Summary

**Opik experiment runner with v1 baseline recording and three CLI scripts for developer evaluation workflow (create-dataset, run-experiment, record-baseline)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-09T02:36:33Z
- **Completed:** 2026-02-09T02:42:00Z
- **Tasks:** 2/2
- **Files created:** 5

## Accomplishments
- runExperiment function evaluates prompt variants against Opik datasets using all three judges (personality consistency, factuality, tone matching) and returns per-metric aggregate scores
- recordBaseline function captures v1 prompt system metrics with a prompt builder that replicates production buildSystemPrompt from app/api/chat/route.ts
- Three ergonomic CLI scripts with --help, argument validation, environment variable checks, and formatted output tables

## Task Commits

Each task was committed atomically:

1. **Task 1: Create experiment runner and baseline recording** - `20a189a` (feat)
2. **Task 2: Create CLI scripts for dataset creation, experiments, and baseline** - `4a613c2` (feat)

## Files Created/Modified
- `lib/evaluation/experiments.ts` - runExperiment function with Opik evaluate() integration and aggregate score computation
- `lib/evaluation/baseline.ts` - recordBaseline with v1 prompt builder, buildV1SystemPrompt, v1PromptVariant export
- `scripts/create-eval-dataset.ts` - CLI to create Opik dataset from production chat data
- `scripts/run-experiment.ts` - CLI to run offline experiment with prompt variant against dataset
- `scripts/record-baseline.ts` - CLI to record v1 baseline metrics

## Decisions Made
- Copied v1 buildSystemPrompt inline in baseline.ts rather than extracting a shared helper from the chat route. The chat route's buildSystemPrompt is a private function with runtime parameters not available in offline eval. Phase 2 will refactor the chat route entirely, making a shared helper short-lived coupling.
- Used Array.from(Map.entries()) for Map iteration to stay compatible with ES2017 target without downlevelIteration (same pattern as Plan 01-01's Array.from(new Set())).
- Exported both buildV1SystemPrompt and v1PromptVariant from baseline.ts so run-experiment.ts can reference v1 by name in its variant mapping.
- All CLI scripts use `DOTENV_CONFIG_PATH=.env.local` with `import 'dotenv/config'` for consistent env loading.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Map iteration requires downlevelIteration with ES2017 target**
- **Found during:** Task 1 (experiments.ts aggregate computation)
- **Issue:** `for (const [key, values] of map)` on a Map requires `--downlevelIteration` or ES2015+ target
- **Fix:** Changed to `Array.from(buckets.entries())` with indexed access, consistent with Plan 01-01's established pattern
- **Files modified:** lib/evaluation/experiments.ts
- **Verification:** `npx tsc --noEmit --skipLibCheck` passes with no errors in evaluation files
- **Committed in:** 20a189a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Same ES2017 target limitation encountered in Plan 01-01. Consistent fix pattern applied. No scope creep.

## Issues Encountered
None beyond the Map iteration deviation documented above.

## User Setup Required

**External services require manual configuration.** The CLI scripts require:
- `OPIK_API_KEY` - Opik API key for dataset creation and experiment tracking
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - AWS credentials for Bedrock Haiku 4.5
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` - Supabase credentials (for dataset creation)

These should already be configured in `.env.local` from prior setup.

## Next Phase Readiness
- Complete evaluation pipeline is runnable: create-dataset -> record-baseline -> compare variants
- EVAL-03 (experiment runner) and EVAL-04 (baseline metrics) requirements satisfied
- Phase 1 Evaluation Foundation is complete with all 2 plans done
- Phase 2 (Prompt Template System) can add v2 prompt variants to VARIANTS map in run-experiment.ts
- No blockers for next phase

## Self-Check: PASSED

---
*Phase: 01-evaluation-foundation*
*Completed: 2026-02-08*
