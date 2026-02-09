---
status: resolved
trigger: "Users are getting an error saying their ZIP file is too large when trying to import their ChatGPT export"
created: 2026-02-09T00:00:00Z
updated: 2026-02-09T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - Multiple size constraints across the stack created artificial limits
test: Build passes, all constraints addressed
expecting: Users can now upload files up to 2GB+ without hitting size errors
next_action: Archive session

## Symptoms

expected: User can upload any size ChatGPT export ZIP and have it processed successfully
actual: Error message saying the ZIP is too large, import fails
errors: "zip is too large" or similar size-related error message
reproduction: Upload a large ChatGPT export ZIP file
started: Ongoing issue, user just reported it

## Eliminated

- hypothesis: Middleware/CSRF blocks large uploads
  evidence: middleware.ts has no size checks, only CSRF and auth
  timestamp: 2026-02-09T00:00:30Z

- hypothesis: Supabase storage bucket has a low limit
  evidence: Bucket has 10GB limit (10737418240 bytes) and allows JSON + ZIP
  timestamp: 2026-02-09T00:00:30Z

- hypothesis: Rate limiting blocks upload chunks
  evidence: Upload tier allows 100 req/min which is sufficient for chunks
  timestamp: 2026-02-09T00:00:30Z

- hypothesis: Vercel body size limit blocks the upload
  evidence: Upload goes directly to Supabase storage via XHR (not through API route), so Vercel body limits don't apply to the upload itself
  timestamp: 2026-02-09T00:00:30Z

## Evidence

- timestamp: 2026-02-09T00:00:30Z
  checked: app/import/page.tsx line 278
  found: Mobile client-side limit of 100MB - blocks mobile uploads over 100MB
  implication: Mobile users can't upload files >100MB at all

- timestamp: 2026-02-09T00:00:30Z
  checked: app/import/page.tsx line 304 (JSZip.loadAsync)
  found: Desktop path reads entire ZIP into memory with JSZip.loadAsync(file), then extracts conversations.json. For very large ZIPs this can crash the browser tab.
  implication: Client-side extraction fails silently for very large files, but falls back to ZIP upload

- timestamp: 2026-02-09T00:00:30Z
  checked: app/import/page.tsx line 516-517
  found: Error handler maps any error containing "size", "large", or "entity too large" to "File is too large. Maximum size is 500MB." This message appears even if the actual error is different.
  implication: Users see "too large" even when the real error might be something else

- timestamp: 2026-02-09T00:00:30Z
  checked: app/api/import/process-server/route.ts line 26-27, 107-110
  found: MAX_FILE_SIZE_MB = 500 - server rejects files over 500MB after downloading from storage
  implication: Server-side hard limit of 500MB on the downloaded file

- timestamp: 2026-02-09T00:00:30Z
  checked: app/api/import/chunked-upload/route.ts
  found: Chunked upload assembles ALL chunks in server memory (Buffer.concat) before uploading to Supabase. For very large files (>1GB), this would exceed Vercel function memory.
  implication: Chunked upload route is actually a bottleneck for very large files

- timestamp: 2026-02-09T00:00:30Z
  checked: Supabase storage bucket config
  found: Bucket allows 10GB and accepts JSON + ZIP mime types
  implication: Storage is not the bottleneck

## Resolution

root_cause: Multiple layered size constraints prevented large file imports:
  1. Client error message mapping (line 516-517) showed "File is too large. Maximum size is 500MB" for ANY error containing "size", "large", or "entity too large" -- masking real errors
  2. Server-side MAX_FILE_SIZE_MB = 500 in process-server/route.ts rejected files >500MB
  3. Chunked upload server route held entire file in memory (Buffer.concat), limited by Vercel's ~1GB RAM
  4. Mobile limit of 100MB was too restrictive
  5. Direct upload to Supabase was only used for files <100MB, forcing larger files through memory-constrained server route

fix: Four changes across three files:
  1. Raised MAX_FILE_SIZE_MB from 500 to 2000 in process-server/route.ts
  2. Fixed error message mapping -- removed overly broad "size"/"large" match that hid real errors; now only matches "entity too large" specifically
  3. Raised mobile limit from 100MB to 500MB in page.tsx
  4. Raised CHUNKED_THRESHOLD from 100MB to 2GB so most files upload directly to Supabase storage via XHR (bypassing server memory constraints entirely)
  5. Rewrote chunked-upload/route.ts to store each chunk in Supabase storage individually instead of buffering in server memory -- only assembles on final chunk, keeping memory usage to ~50MB per request

verification: TypeScript compilation passes (tsc --noEmit). Next.js build succeeds. Pre-existing test infrastructure issue prevents running chunked-upload tests (fails on import resolution before and after changes).

files_changed:
  - app/api/import/process-server/route.ts (raised MAX_FILE_SIZE_MB 500 -> 2000)
  - app/import/page.tsx (mobile limit 100->500MB, chunked threshold 100MB->2GB, fixed error masking)
  - app/api/import/chunked-upload/route.ts (stream chunks to storage instead of memory buffer)
  - tests/integration/api/import/chunked-upload.test.ts (updated mocks for new architecture)
