---
phase: 06-prompt-foundation
plan: 03
subsystem: personalization
status: complete
tags: [rlm, prompt-engineering, cross-language, testing, consistency]

requires:
  - "06-01 (Prompt Helpers)"
  - "lib/soulprint/prompt-helpers.ts formatSection reference implementation"

provides:
  - "RLM prompt builder with consistent formatting"
  - "Cross-language prompt consistency verification"
  - "Automated hash comparison test preventing future drift"

affects:
  - "06-04 (Schema Sync) - RLM now ready for schema integration"
  - "06-05 (Personalized Greeting) - Consistent prompts for greeting generation"
  - "Phase 7 deployment - RLM primary path ready for production"

tech-stack:
  added: []
  patterns:
    - "Cross-language consistency testing via subprocess"
    - "Standalone helper modules for test isolation"
    - "Hash-based format verification"

key-files:
  created:
    - "rlm-service/prompt_helpers.py"
    - "__tests__/cross-lang/prompt-hash.test.ts"
  modified:
    - "rlm-service/main.py"

decisions:
  - decision: "Extract helpers to standalone prompt_helpers.py module"
    rationale: "Allows tests to import without httpx/FastAPI dependencies"
    impact: "Clean separation, easier testing"
  - decision: "Use temp file approach for Python subprocess calls"
    rationale: "Avoids shell escaping issues with complex JSON data"
    impact: "More reliable cross-language testing"
  - decision: "9 test cases covering edge cases"
    rationale: "Comprehensive coverage: strings, arrays, mixed, placeholders, empty, complex"
    impact: "High confidence in cross-language consistency"

metrics:
  duration: "3.6 minutes"
  completed: "2026-02-07"

related:
  research: ".planning/research/PROMPT-ARCHITECTURE.md"
  depends_on: ["06-01"]
  unlocks: ["06-04", "06-05"]
---

# Phase 6 Plan 3: RLM Prompt Consistency Summary

**One-liner:** Enhanced RLM prompt builder to match Next.js formatting exactly, verified by automated hash comparison test

## What Was Built

Enhanced the RLM service's `build_rlm_system_prompt()` function to use clean_section/format_section helpers that produce output **identical** to the TypeScript versions in Next.js. This ensures users get the same personality experience regardless of which code path handles their chat request (RLM primary path or Next.js Bedrock fallback).

Created automated cross-language test that verifies Python and TypeScript produce character-for-character identical output for the same inputs.

## Implementation Details

### 1. Python Helper Functions (prompt_helpers.py)

Created standalone module with:
- `clean_section(data)` - Filters "not enough data" from strings AND arrays
- `format_section(section_name, data)` - Produces markdown with **Bold:** labels and bullet lists

**Key formatting rules matched:**
- Sorted keys for deterministic output
- Title Case conversion: `user_name` → `User Name`
- String format: `**Label:** value`
- Array format: `**Label:**\n- item1\n- item2`
- Defensive filtering: removes placeholders even if cleanSection wasn't called
- Returns empty string if no valid data remains

### 2. Enhanced build_rlm_system_prompt()

**Added to base prompt:**
```python
## IMPORTANT BEHAVIORAL RULES

NEVER use these phrases or anything similar:
- "Great question!"
- "I'd be happy to help!"
- "That's a great point!"
- ... (10 banned phrases total)

When conversation context or memories are provided below...
reference them naturally as if recalling something from a
previous conversation — "Like we talked about..." not
"According to the retrieved context..."
```

**Refactored section formatting:**
- Replaced 60+ lines of inline formatting with clean_section + format_section calls
- Section names now match Next.js: "Communication Style & Personality", "Your AI Identity", "About This Person", "How You Operate", "Your Capabilities"
- Preserved ai_name exclusion from identity section
- Maintained soulprint_text fallback, conversation_context, web_search_context blocks

### 3. Automated Cross-Language Test

Created `__tests__/cross-lang/prompt-hash.test.ts` with:
- 9 test cases covering: strings, arrays, mixed, placeholders, empty sections, complex nested data
- Subprocess approach calling Python via temp files (avoids shell escaping issues)
- Character-by-character comparison + hash verification
- Tests both formatSection and cleanSection consistency

**All tests pass** ✅

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add helpers and enhance prompt builder | 8e6fba2 | rlm-service/main.py, rlm-service/prompt_helpers.py |
| 2 | Create cross-language hash test | 0c69f78 | __tests__/cross-lang/prompt-hash.test.ts, rlm-service/prompt_helpers.py, rlm-service/main.py |

## Verification Results

✅ Python syntax check: `python3 -m py_compile rlm-service/main.py` - no errors
✅ Cross-language test: 9/9 tests pass
✅ Anti-generic phrases: Found at line 223
✅ Memory context instructions: Present in base prompt
✅ ai_name exclusion: Preserved at line 304
✅ Function signature: Unchanged (5 parameters)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extracted helpers to standalone module**
- **Found during:** Task 2 test execution
- **Issue:** Python tests failed with `ModuleNotFoundError: No module named 'httpx'` because importing from main.py requires FastAPI dependencies
- **Fix:** Created `rlm-service/prompt_helpers.py` standalone module with no dependencies, updated main.py to import from it
- **Files modified:** rlm-service/prompt_helpers.py (new), rlm-service/main.py
- **Commit:** 0c69f78

## Next Phase Readiness

**Ready for Phase 6 Plan 4 (Schema Sync):** ✅
- RLM prompt builder now uses consistent formatting
- Ready to integrate with full pass v2 schema
- Test infrastructure in place to verify future changes

**Ready for Phase 6 Plan 5 (Personalized Greeting):** ✅
- BEHAVIORAL RULES block will prevent generic greetings
- Consistent personality experience for greeting generation

**Ready for Phase 7 (Production Deployment):** ✅
- RLM primary path delivers same quality as Next.js fallback
- Automated tests prevent future drift

## Blockers/Concerns

None.

## Key Learnings

1. **Cross-language consistency is testable** - Subprocess approach works well for verifying Python/TypeScript output matches
2. **Dependency isolation matters** - Extracting helpers to standalone module made testing trivial
3. **Hash comparison adds confidence** - Character match + hash match gives high certainty
4. **Temp files > shell escaping** - More reliable than trying to escape JSON in bash command strings

## Must-Haves Satisfied

✅ build_rlm_system_prompt() produces identical section formatting as Next.js buildSystemPrompt()
✅ RLM filters 'not enough data' from all value types (strings AND arrays)
✅ RLM system prompt includes same anti-generic banned phrases as Next.js
✅ RLM system prompt includes same memory context instructions as Next.js
✅ RLM skips ai_name key in IDENTITY section (preserved from prototype)
✅ Automated hash comparison test confirms Python format_section and TypeScript formatSection produce identical output

## Self-Check: PASSED

**Files created:**
- FOUND: rlm-service/prompt_helpers.py
- FOUND: __tests__/cross-lang/prompt-hash.test.ts

**Commits:**
- FOUND: 8e6fba2
- FOUND: 0c69f78
