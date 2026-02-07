---
phase: 02-copy-modify-processors
plan: 01
subsystem: infra
tags: [python, processors, adapters, supabase, docker, httpx, anthropic]

# Dependency graph
requires:
  - phase: 01-dependency-extraction
    provides: Supabase adapter layer (download_conversations, update_user_profile, save_chunks_batch)
provides:
  - 5 processor modules in production soulprint-rlm repo (conversation_chunker, fact_extractor, memory_generator, v2_regenerator, full_pass)
  - Processor imports use adapter layer (not main.py)
  - Dockerfile with build-time import verification
affects: [02-02, 03-wire-new-endpoint, 04-pipeline-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Processors read env vars inside function bodies (not module-level)"
    - "Dockerfile COPY order: requirements → adapters → processors → main"
    - "Build-time import verification (RUN python -c import checks)"

key-files:
  created:
    - /home/drewpullen/clawd/soulprint-rlm/processors/__init__.py
    - /home/drewpullen/clawd/soulprint-rlm/processors/conversation_chunker.py
    - /home/drewpullen/clawd/soulprint-rlm/processors/fact_extractor.py
    - /home/drewpullen/clawd/soulprint-rlm/processors/memory_generator.py
    - /home/drewpullen/clawd/soulprint-rlm/processors/v2_regenerator.py
    - /home/drewpullen/clawd/soulprint-rlm/processors/full_pass.py
  modified:
    - /home/drewpullen/clawd/soulprint-rlm/Dockerfile

key-decisions:
  - "Keep delete_user_chunks in full_pass.py (processor-specific, not adapter layer)"
  - "Remove local save_chunks_batch from full_pass.py (use adapter version with is_recent enrichment)"
  - "Read env vars inside delete_user_chunks function body (enables testing)"

patterns-established:
  - "4 pure processors (chunker, extractor, generator, regenerator) are byte-identical to v1.2 source"
  - "full_pass.py is the orchestrator that imports from both adapters and processors"
  - "Dockerfile verifies all imports succeed at build time (fail fast)"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 02 Plan 01: Copy & Modify Processors Summary

**5 processor modules copied to production repo with adapter imports, Dockerfile build-time verification, and 4 pure modules byte-identical to v1.2 source**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T04:59:20Z
- **Completed:** 2026-02-07T05:02:08Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Copied 4 pure processor modules (conversation_chunker, fact_extractor, memory_generator, v2_regenerator) byte-identical to v1.2 source
- Modified full_pass.py to import from adapters layer instead of main.py
- Removed module-level env vars from full_pass.py (read inside function bodies)
- Updated Dockerfile with build-time import verification (fail fast on broken imports)

## Task Commits

Each task was committed atomically:

1. **Task 1: Copy 4 pure processor modules and create __init__.py** - `c0a79d0` (feat)
2. **Task 2: Modify full_pass.py imports and update Dockerfile** - `b3a496f` (feat)

## Files Created/Modified
- `/home/drewpullen/clawd/soulprint-rlm/processors/__init__.py` - Package marker for processors directory
- `/home/drewpullen/clawd/soulprint-rlm/processors/conversation_chunker.py` - Conversation chunking (estimate_tokens, chunk_conversations)
- `/home/drewpullen/clawd/soulprint-rlm/processors/fact_extractor.py` - Parallel fact extraction (extract_facts_parallel, consolidate_facts, hierarchical_reduce)
- `/home/drewpullen/clawd/soulprint-rlm/processors/memory_generator.py` - MEMORY section generation (generate_memory_section)
- `/home/drewpullen/clawd/soulprint-rlm/processors/v2_regenerator.py` - V2 section regeneration (regenerate_sections_v2, sections_to_soulprint_text)
- `/home/drewpullen/clawd/soulprint-rlm/processors/full_pass.py` - Pipeline orchestrator (run_full_pass_pipeline) with adapter imports
- `/home/drewpullen/clawd/soulprint-rlm/Dockerfile` - Updated with COPY adapters/, processors/, and import verification

## Decisions Made

**1. Keep delete_user_chunks in full_pass.py**
- Rationale: Processor-specific logic for clearing old chunks before pipeline runs. Does NOT belong in adapter layer (per ADAPTER-01 decision). Kept in full_pass.py but modified to read env vars inside function body.

**2. Remove local save_chunks_batch from full_pass.py**
- Rationale: Adapter version from Phase 1 already handles chunk saving with is_recent enrichment. No need for duplicate implementation.

**3. Read env vars inside delete_user_chunks function body**
- Rationale: Removed module-level SUPABASE_URL and SUPABASE_SERVICE_KEY constants. Read env vars inline using os.getenv() inside function body. Enables testing with monkeypatch.setenv() (consistent with ADAPTER-01 pattern).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all imports worked correctly, byte-identical copies verified, Dockerfile updated successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02-02 (Copy/modify tests)**
- All 5 processor modules exist in production repo
- Imports verified (both manually and via Dockerfile RUN checks)
- 4 pure modules byte-identical to v1.2 source
- full_pass.py uses adapter layer correctly

**Blockers:** None

**Concerns:** None - all must_haves satisfied:
- All 5 processor modules exist in production processors/ directory ✓
- full_pass.py imports from adapters (not main) ✓
- full_pass.py has no module-level SUPABASE vars ✓
- delete_user_chunks reads env vars inside function body ✓
- Dockerfile copies adapters/ and processors/ before main.py ✓
- Dockerfile has build-time import verification ✓
- 4 pure modules byte-identical to v1.2 source ✓

---
*Phase: 02-copy-modify-processors*
*Completed: 2026-02-07*

## Self-Check: PASSED

All created files verified to exist:
- processors/__init__.py ✓
- processors/conversation_chunker.py ✓
- processors/fact_extractor.py ✓
- processors/memory_generator.py ✓
- processors/v2_regenerator.py ✓
- processors/full_pass.py ✓
- Dockerfile ✓

All task commits verified:
- c0a79d0 (Task 1) ✓
- b3a496f (Task 2) ✓

