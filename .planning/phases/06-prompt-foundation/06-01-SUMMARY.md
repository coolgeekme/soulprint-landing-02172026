---
phase: 06-prompt-foundation
plan: 01
subsystem: prompt-engineering
tags: [tdd, prompt-helpers, markdown, validation, pure-functions]

# Dependency graph
requires:
  - phase: v1.2-import-ux
    provides: QuickPassResult section types (SoulSection, UserSection, etc.)
provides:
  - Pure-function helpers for section validation (cleanSection) and formatting (formatSection)
  - Placeholder filtering logic ("not enough data" removal)
  - Consistent markdown formatting for prompt composition
  - Test coverage for prompt foundation layer
affects: [06-02, 06-03, RLM-prompt-builder, Next.js-prompt-builder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD with RED-GREEN-REFACTOR cycle for critical helpers"
    - "Pure functions for deterministic prompt formatting"
    - "Defensive filtering in formatSection (never trust input)"

key-files:
  created:
    - lib/soulprint/prompt-helpers.ts
    - __tests__/unit/prompt-helpers.test.ts
  modified: []

key-decisions:
  - "Use case-insensitive regex for 'not enough data' matching"
  - "Sort object keys in formatSection for deterministic output"
  - "Defensive filtering: formatSection filters placeholders even if cleanSection wasn't called"

patterns-established:
  - "cleanSection() before formatSection() pattern for two-stage processing"
  - "Title Case labels from snake_case keys (communication_style → Communication Style)"
  - "Markdown format: ## heading, **Bold Label:** value, bullet lists for arrays"

# Metrics
duration: 2min
completed: 2026-02-07
---

# Phase 6 Plan 1: Prompt Helpers Summary

**Pure-function helpers for section validation and markdown formatting with TDD-driven implementation and full test coverage (21 tests pass)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-07T22:19:46Z
- **Completed:** 2026-02-07T22:21:43Z
- **Tasks:** 2 (TDD: RED → GREEN)
- **Files modified:** 2

## Accomplishments
- Created `cleanSection()` helper that filters "not enough data" placeholders (case-insensitive), empty strings, and empty arrays
- Created `formatSection()` helper that produces consistent markdown with **Bold Label:** format and bullet lists
- Achieved 21/21 test cases passing with comprehensive coverage
- Established pure-function pattern for deterministic prompt composition

## Task Commits

Each task was committed atomically following TDD RED-GREEN-REFACTOR:

1. **Task 1: RED — Write failing tests** - `f6159f8` (test)
   - 9 cleanSection tests (placeholder filtering, empty handling, case-insensitive)
   - 12 formatSection tests (markdown formatting, Title Case labels, defensive filtering)
   - All tests fail (module doesn't exist) — RED phase complete

2. **Task 2: GREEN + REFACTOR — Implement helpers** - `5f62740` (feat)
   - Implemented cleanSection() with placeholder regex pattern
   - Implemented formatSection() with sorted keys for determinism
   - All 21 tests pass, no TypeScript errors — GREEN phase complete

## Files Created/Modified
- `lib/soulprint/prompt-helpers.ts` - Section validation and formatting helpers (153 lines)
  - `cleanSection()`: Filters placeholders and empty values, returns null for fully-empty sections
  - `formatSection()`: Converts section objects to markdown with consistent formatting
- `__tests__/unit/prompt-helpers.test.ts` - Comprehensive test suite (210 lines)
  - 9 cleanSection tests covering all edge cases
  - 12 formatSection tests ensuring deterministic output

## Decisions Made

1. **Case-insensitive "not enough data" matching**
   - Rationale: User data may have inconsistent casing ("Not Enough Data", "NOT ENOUGH DATA")
   - Implementation: `/^not enough data$/i` regex pattern
   - Ensures all variations are caught

2. **Sorted keys in formatSection for deterministic output**
   - Rationale: Object.keys() order is not guaranteed in all JS engines
   - Implementation: `Object.keys(data).sort()` before iteration
   - Ensures same input always produces identical output (PROMPT-02 requirement)

3. **Defensive filtering in formatSection**
   - Rationale: Can't assume cleanSection() was called first
   - Implementation: formatSection filters placeholders even if cleanSection wasn't called
   - Prevents "not enough data" from ever appearing in prompts (MEM-02 requirement)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TDD workflow proceeded smoothly, all tests passed on first GREEN implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 06-02 (Next.js Prompt Builder):**
- Pure-function helpers implemented and tested
- Consistent markdown formatting established
- Placeholder filtering logic validated

**Ready for 06-03 (RLM Prompt Builder):**
- Same helpers will be used in Python RLM service
- Format specification documented and tested
- Deterministic output pattern established

**Blockers/Concerns:**
None - foundation layer complete and validated.

---
*Phase: 06-prompt-foundation*
*Completed: 2026-02-07*

## Self-Check: PASSED

All created files exist:
- lib/soulprint/prompt-helpers.ts ✓
- __tests__/unit/prompt-helpers.test.ts ✓

All commits exist:
- f6159f8 (test) ✓
- 5f62740 (feat) ✓
