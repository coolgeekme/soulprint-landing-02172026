---
phase: 02-full-pass-pipeline
plan: 01
subsystem: rlm-service
tags: [background-processing, fastapi, supabase, database-migration, async]
requires: [01-02-quick-pass-pipeline]
provides: [full-pass-endpoint-skeleton, full-pass-schema, storage-download-helper]
affects: [02-02-full-pass-processing, 02-03-quick-pass-v2-regen]
tech-stack:
  added: []
  patterns: [background-tasks, best-effort-status-updates, fire-and-forget]
key-files:
  created:
    - supabase/migrations/20260207_full_pass_schema.sql
  modified:
    - rlm-service/main.py
    - rlm-service/Dockerfile
decisions:
  - id: 02-01-background-tasks
    choice: Use FastAPI BackgroundTasks for async dispatch
    rationale: Cleaner than asyncio.create_task, properly managed lifecycle
  - id: 02-01-best-effort-status
    choice: Status updates to Supabase are best-effort (log errors, don't throw)
    rationale: Full pass processing should continue even if status updates fail
  - id: 02-01-stub-completion
    choice: Stub marks status as 'complete' after 1s sleep
    rationale: Plan 02-02 will replace with real processing logic
metrics:
  duration: 2min
  completed: 2026-02-07
---

# Phase 2 Plan 1: Full Pass Endpoint Skeleton Summary

**One-liner:** Created /process-full endpoint skeleton with background task dispatch and database schema for MEMORY section tracking

## What Was Built

Created the foundational infrastructure for the full pass pipeline:

1. **Database Migration (20260207_full_pass_schema.sql)**
   - Added `memory_md` column for curated durable facts (MEMORY section)
   - Added `full_pass_status` column (pending/processing/complete/failed) with check constraint
   - Added timing columns: `full_pass_started_at`, `full_pass_completed_at`
   - Added `full_pass_error` column for failure tracking
   - User-executed migration with important deployment sequencing note

2. **RLM Service /process-full Endpoint**
   - `ProcessFullRequest` Pydantic model with user_id, storage_path, conversation/message counts
   - POST /process-full endpoint that returns 202 Accepted immediately
   - Background task dispatch using FastAPI BackgroundTasks
   - Status updates via Supabase REST API (best-effort)
   - Stub processing (1s sleep) - real logic comes in Plan 02-02

3. **Helper Functions**
   - `update_user_profile(user_id, updates)`: PATCH user_profiles via Supabase REST API
   - `download_conversations(storage_path)`: Download + decompress conversations.json from Supabase Storage
   - Both handle errors gracefully without throwing

4. **Dockerfile Update**
   - Changed from `COPY main.py .` to `COPY . .` to support multi-file service structure
   - Prepares for processors/ directory in Plan 02-02

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create database migration for full pass columns | 9d10107 | supabase/migrations/20260207_full_pass_schema.sql |
| 2 | Create /process-full endpoint with background task dispatch | 7df3e98 | rlm-service/main.py, rlm-service/Dockerfile |

## Verification Results

All verification criteria met:

1. SQL migration file contains all 5 columns (memory_md, full_pass_status, full_pass_started_at, full_pass_completed_at, full_pass_error) with check constraint
2. /process-full endpoint parses ProcessFullRequest and returns 202 Accepted
3. Background task updates full_pass_status to 'processing' on start (with full_pass_started_at and clears full_pass_error)
4. Background task updates full_pass_status to 'failed' with error message on exception (and calls alert_failure)
5. download_conversations helper correctly constructs Supabase Storage URL and handles gzip decompression
6. Python syntax is valid (ast.parse succeeds)
7. Dockerfile copies entire directory with `COPY . .`

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

**Decision 02-01-background-tasks: Use FastAPI BackgroundTasks for async dispatch**
- **Context:** Plan suggested using either BackgroundTasks or asyncio.create_task
- **Choice:** Implemented using FastAPI BackgroundTasks parameter
- **Rationale:** Cleaner lifecycle management, automatic cleanup, better integration with FastAPI
- **Impact:** More reliable background task execution, easier testing

**Decision 02-01-best-effort-status: Status updates are best-effort**
- **Context:** Full pass processing needs to update user_profiles.full_pass_status
- **Choice:** Log errors on status update failures but don't throw exceptions
- **Rationale:** Processing should continue even if status updates fail (user can retry import)
- **Impact:** More resilient to transient Supabase API issues

**Decision 02-01-stub-completion: Stub marks status as 'complete' after 1s sleep**
- **Context:** run_full_pass needs a placeholder implementation
- **Choice:** Update status to 'complete' after brief sleep (no real processing)
- **Rationale:** Allows testing of status flow before Plan 02-02 adds real logic
- **Impact:** Full pipeline is testable end-to-end (with stub processing)

## Integration Points

### Upstream Dependencies
- **Plan 01-02 (Quick Pass Pipeline):** Fire-and-forget POST to /process-full already wired in app/api/import/process-server/route.ts
- **Supabase user_profiles table:** Must exist with user_id column for status updates

### Downstream Impact
- **Plan 02-02 (Full Pass Processing):** Will replace run_full_pass stub with real MEMORY extraction logic
- **Plan 02-03 (Quick Pass v2 Regen):** Will use memory_md column for regenerating 5 quick pass sections

## Next Phase Readiness

**Blockers:** Migration must be executed before deploying Plans 02-02/02-03

**Required Action:**
1. Open Supabase SQL Editor
2. Run `supabase/migrations/20260207_full_pass_schema.sql`
3. Verify columns exist before deploying RLM service changes

If migration is not executed, full pass processing will fail silently (status updates will log errors but processing will continue).

**Ready for:** Plan 02-02 can proceed immediately after migration is executed. The /process-full endpoint skeleton is fully functional and ready to receive real processing logic.

## Self-Check: PASSED

All claimed files verified to exist:
- supabase/migrations/20260207_full_pass_schema.sql ✓

All claimed commits verified to exist:
- 9d10107 ✓
- 7df3e98 ✓
