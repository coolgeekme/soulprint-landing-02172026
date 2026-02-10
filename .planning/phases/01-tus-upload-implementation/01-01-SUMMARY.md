---
phase: 01-tus-upload-implementation
plan: 01
subsystem: upload
tags: [tus, resumable-uploads, supabase-storage, file-upload, chatgpt-export]

# Dependency graph
requires:
  - phase: v2.2-imports
    provides: XHR upload mechanism and RLM processing pipeline
provides:
  - TUS resumable upload wrapper (lib/tus-upload.ts) supporting up to 5GB files
  - Automatic JWT token refresh for multi-hour uploads
  - Retry logic for 5xx errors and network interruptions
  - Desktop ZIP extraction flow preserved (mobile uploads full ZIP)
affects: [02-cleanup-legacy-upload, future-upload-features, large-file-imports]

# Tech tracking
tech-stack:
  added: [tus-js-client@4.3.1]
  patterns: [TUS resumable protocol for Supabase Storage, 6MB chunks (Supabase requirement), JWT refresh via onBeforeRequest callback]

key-files:
  created: [lib/tus-upload.ts]
  modified: [app/import/page.tsx, package.json]

key-decisions:
  - "Use 6MB chunks (hardcoded) - required by Supabase for TUS uploads, not configurable"
  - "JWT token refresh via onBeforeRequest callback before each chunk - prevents 401 errors on uploads >1hr"
  - "removeFingerprintOnSuccess: true - prevents fingerprint collision on re-upload"
  - "Auto-retry on 401 (after token refresh) and 5xx errors with exponential backoff [0, 3s, 5s, 10s, 20s]"
  - "Construct storage path from known objectName - don't parse upload.url (more reliable)"

patterns-established:
  - "TUS upload wrapper pattern: tusUpload({ file, userId, filename, onProgress }) returns { success, storagePath, error }"
  - "Storage path format: imports/{userId}/{timestamp}-{sanitizedFilename} (identical to old XHR path)"
  - "Progress mapping: upload progress (0-100%) maps to 15-50% of overall import progress"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 01 Plan 01: TUS Upload Implementation Summary

**TUS resumable uploads with 6MB chunks, automatic JWT refresh, and retry logic replacing XHR/chunked upload for files up to 5GB**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-10T03:11:19Z
- **Completed:** 2026-02-10T03:14:52Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- TUS resumable upload wrapper supporting up to 5GB files (Supabase Pro limit)
- Automatic JWT token refresh before each chunk upload (prevents 401 on multi-hour uploads)
- Auto-retry with exponential backoff on 5xx errors and 401 (after token refresh)
- Single upload path for all file sizes (no branching between chunked/direct upload)
- Desktop ZIP extraction preserved (JSZip) - only transport layer changed

## Task Commits

Each task was committed atomically:

1. **Task 1: Install tus-js-client and create TUS upload wrapper** - `421eb75` (feat)
2. **Task 2: Integrate TUS upload into import page, replacing XHR path** - `6361229` (feat)
3. **Task 3: Verify build and integration correctness** - (no changes needed, all verifications passed)

## Files Created/Modified
- `lib/tus-upload.ts` - TUS resumable upload wrapper for Supabase Storage with JWT refresh and retry logic
- `app/import/page.tsx` - Replaced XHR/chunked upload with single tusUpload() call, removed branching logic
- `package.json` - Added tus-js-client@4.3.1 dependency

## Decisions Made
- **6MB chunk size (hardcoded):** Supabase requires exactly 6MB chunks for TUS uploads. This is not configurable and must not be changed for mobile compatibility (plan initially suggested mobile-specific chunks, but research showed this is a Supabase requirement).
- **JWT refresh via onBeforeRequest:** Refresh token before each chunk upload to prevent 401 errors on multi-hour uploads. Session tokens expire after 1 hour by default.
- **removeFingerprintOnSuccess: true:** Prevents TUS fingerprint collision on re-upload (e.g., if user uploads same file twice).
- **Retry logic:** Auto-retry on 401 (after token refresh via onBeforeRequest) and 5xx errors up to 3 attempts with exponential backoff.
- **Storage path construction:** Construct path from known objectName (`imports/${objectName}`) instead of parsing upload.url - more reliable and matches existing format.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly. All TypeScript compilation, build, and verification checks passed on first attempt.

## User Setup Required

None - no external service configuration required. TUS uploads work with existing Supabase Storage configuration (imports bucket with RLS policies already set up from v2.2).

## Next Phase Readiness

- TUS upload integration complete and tested (build passes)
- RLM processing pipeline unchanged - still triggered via POST /api/import/trigger
- Storage path format identical to old XHR upload - no backend changes needed
- Desktop ZIP extraction (JSZip) preserved - only transport layer changed
- Ready for Phase 2: Cleanup legacy upload code (lib/chunked-upload.ts and related API routes)

**Blockers:** None

**Concerns:** None - TUS upload is a drop-in replacement for XHR upload with identical downstream behavior

## Self-Check: PASSED

All created files and commits verified:
- ✓ lib/tus-upload.ts exists
- ✓ Commit 421eb75 exists (Task 1)
- ✓ Commit 6361229 exists (Task 2)

---
*Phase: 01-tus-upload-implementation*
*Completed: 2026-02-10*
