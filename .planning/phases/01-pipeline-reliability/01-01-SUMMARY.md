---
phase: 01-pipeline-reliability
plan: 01
type: execution-summary
completed: 2026-02-11
duration_minutes: 3
subsystem: rlm-service/processors
tags: [error-handling, reliability, retry-logic, pipeline]
dependency_graph:
  requires: []
  provides:
    - error-propagation-chunk-saves
    - retry-with-backoff-fact-extraction
    - memory-validation-retry
    - timeout-db-update
  affects:
    - full_pass_pipeline
    - trigger_full_pass
    - conversation_chunks_quality
tech_stack:
  added: []
  patterns:
    - exponential-backoff-with-jitter
    - validation-before-save
    - fail-loud-not-silent
key_files:
  created: []
  modified:
    - rlm-service/processors/full_pass.py
    - rlm-service/processors/fact_extractor.py
    - rlm-service/processors/memory_generator.py
    - rlm-service/processors/streaming_import.py
decisions:
  - decision: Remove outer try/except from save_chunks_batch() and delete_user_chunks()
    rationale: Let errors propagate to trigger_full_pass() which already has proper error handling and DB updates
    alternatives: Add try/except in each function to update DB
    chosen: Error propagation (simpler, single point of failure handling)
  - decision: Reduced fact extraction concurrency from 10 to 5
    rationale: Avoid API rate limits that were causing ~$8-10 import costs
    alternatives: Keep 10 with more aggressive rate limit handling
    chosen: Conservative concurrency (prevents rate limits entirely)
  - decision: Retry memory generation up to 2 times on placeholder content
    rationale: LLM can produce placeholder content intermittently, retry gives high-quality results
    alternatives: Accept first response, increase max_tokens
    chosen: 2 retries (balances quality vs latency)
metrics:
  duration_actual: 3 min
  duration_estimated: 15 min
  tasks_completed: 2
  commits: 2
  files_modified: 4
  deviations: 1
---

# Phase 1 Plan 1: Pipeline Reliability - Error Propagation Summary

**One-liner:** Chunk saves raise on HTTP errors, fact extraction retries 3x with exponential backoff (concurrency 5), memory generation validates and retries on placeholder content.

## Overview

Made the RLM full pass pipeline fail loudly instead of silently swallowing errors. Fixed three categories of silent failure: chunk saves returning success even when HTTP POST fails, fact extraction silently returning empty facts on API errors with no retry, and memory generation falling back to placeholder content without retrying.

**Problem:** Users ended up with empty conversation_chunks, missing facts, and "No data yet." memory sections when full pass silently failed.

**Solution:** Error propagation, retry logic with exponential backoff, and validation before accepting generated content.

## Tasks Completed

### Task 1: Make chunk saves and fact extraction fail loudly with retry, fix timeout DB update

**Commit:** `03769c5`

**Changes:**
- **full_pass.py (PIPE-01):**
  - `save_chunks_batch()` raises RuntimeError on HTTP errors (removed outer try/except)
  - `delete_user_chunks()` raises on failures (removed best-effort handling)
  - Errors propagate naturally through `run_full_pass_pipeline()` to `trigger_full_pass()`

- **streaming_import.py (PIPE-04):**
  - `trigger_full_pass()` TimeoutError handler now updates database with `full_pass_status='failed'`
  - Previously only printed log, leaving user_profiles in "processing" state indefinitely

- **fact_extractor.py (PIPE-02):**
  - Added `_extract_with_retry()` wrapper with 3 retries and exponential backoff (1s, 2.5s, 5s with jitter)
  - `extract_facts_from_chunk()` re-raises `RateLimitError` and `APIError` for retry wrapper
  - `extract_facts_parallel()` concurrency reduced from 10 to 5 (prevents rate limit costs)
  - Added `import random` and `import anthropic` for retry logic

**Verification:**
- ✓ `save_chunks_batch()` raises RuntimeError on non-200/201 status
- ✓ `delete_user_chunks()` raises RuntimeError on non-200/204 status
- ✓ `trigger_full_pass()` TimeoutError handler updates DB
- ✓ `_extract_with_retry()` exists with exponential backoff formula
- ✓ `extract_facts_parallel()` default concurrency is 5

### Task 2: Validate MEMORY section before save and retry on failure

**Commit:** `e9ce4dd`

**Changes:**
- **memory_generator.py (PIPE-03):**
  - Added `_is_placeholder_memory()` validation function that detects:
    - 2+ placeholder signals ("Memory generation failed", "No data yet.")
    - Suspiciously short content (<200 chars)
    - Lack of real content (fewer than 3 substantial lines)
  - `generate_memory_section()` retry loop (max_retries=2):
    - Validates each response before accepting
    - Retries on placeholder content or empty responses
    - Only falls back after exhausting all retries
  - `_fallback_memory()` prepends `[FALLBACK]` prefix for identification

**Verification:**
- ✓ `_is_placeholder_memory()` function exists with multi-signal validation
- ✓ `generate_memory_section()` has `max_retries: int = 2` parameter
- ✓ Fallback memory starts with `[FALLBACK]` prefix
- ✓ Retry logic logs "placeholder content detected, retrying..."

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Remove hardcoded concurrency=10 in full_pass.py**
- **Found during:** Task 1 verification
- **Issue:** `full_pass.py` line 189 called `extract_facts_parallel(chunks, client, concurrency=10)`, overriding the new default of 5
- **Fix:** Removed `concurrency=10` parameter so it uses the function default
- **Files modified:** rlm-service/processors/full_pass.py
- **Commit:** 03769c5 (included in Task 1 commit)
- **Rationale:** Without this fix, the concurrency reduction would have been ineffective

## Impact

### Reliability Improvements

1. **Chunk saves:** HTTP errors now propagate and trigger full_pass_status='failed' in DB
2. **Fact extraction:** API rate limits/errors retry 3x before giving up (concurrency reduced to prevent rate limits)
3. **Memory generation:** Placeholder content triggers retry instead of being saved as final result
4. **Timeout handling:** 30-minute timeouts now update DB correctly (user sees failure instead of infinite "processing")

### User Experience

**Before:**
- Import stuck at 14% indefinitely (timeout didn't update DB)
- Empty conversation_chunks table (chunk save silently failed)
- "No data yet." in all MEMORY sections (placeholder content accepted)
- $8-10 fact extraction costs from rate limit retries

**After:**
- Import fails explicitly with error message visible in UI
- Chunk save failures visible in logs and propagate to DB
- MEMORY sections have real content or clearly marked [FALLBACK]
- Reduced cost from lower concurrency (5 vs 10)

### Error Propagation Flow

```
save_chunks_batch() HTTP error
  ↓ raise RuntimeError
run_full_pass_pipeline()
  ↓ propagates (no try/except)
trigger_full_pass()
  ↓ catch Exception
update user_profiles.full_pass_status='failed'
  ↓
User sees error in /chat UI
```

## Self-Check: PASSED

**Files created:**
- ✓ FOUND: .planning/phases/01-pipeline-reliability/01-01-SUMMARY.md

**Files modified:**
- ✓ FOUND: rlm-service/processors/full_pass.py (chunk save error propagation)
- ✓ FOUND: rlm-service/processors/fact_extractor.py (retry with backoff)
- ✓ FOUND: rlm-service/processors/memory_generator.py (validation + retry)
- ✓ FOUND: rlm-service/processors/streaming_import.py (timeout DB update)

**Commits:**
- ✓ FOUND: 03769c5 (Task 1 - chunk saves, fact extraction, timeout)
- ✓ FOUND: e9ce4dd (Task 2 - memory validation)

**Must-haves verification:**
- ✓ Chunk save failures raise exceptions (RuntimeError on non-200/201)
- ✓ Fact extraction retries 3x with exponential backoff (2^attempt + jitter)
- ✓ Fact extraction concurrency is 5 (not 10)
- ✓ MEMORY section validated before save (_is_placeholder_memory)
- ✓ MEMORY generation retries up to 2 times
- ✓ Full pass timeout updates full_pass_status='failed' in database

## Next Phase Readiness

**Ready for:** Phase 1 Plan 2 (if exists) or Phase 2

**Blockers:** None

**Follow-up:**
- Monitor user imports to verify reduced cost from concurrency=5
- Check [FALLBACK] prefix frequency in production memory_md
- Validate that timeout DB updates appear in failed imports
