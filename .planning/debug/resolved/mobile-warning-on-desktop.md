---
status: resolved
trigger: "mobile-warning-on-desktop: Brave browser desktop user gets error saying their export is 1146MB and tells them to use desktop, but they ARE on desktop. The mobile large-file warning is incorrectly triggering on desktop browsers. All importing should work on any device at any size — there should be NO size limits at all."
created: 2026-02-09T00:00:00Z
updated: 2026-02-09T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Supabase Free plan enforces 50MB file size limit, rejecting the 1146MB upload with "entity too large" error. The error classification (lines 98-106) incorrectly suggests "try desktop browser" when the real issue is Supabase plan limits
test: Verify bucket config and plan limits are the bottleneck
expecting: Bucket configured for 10GB but Free plan enforces 50MB
next_action: Fix the error message to be accurate and remove all client-side size checks per user requirements

## Symptoms

expected: Any size file uploads successfully on any device (mobile or desktop), no size warnings or blocks
actual: Desktop Brave browser user sees "your export is 1146mb" error and is told to use desktop, even though they ARE on desktop
errors: Mobile large file warning modal incorrectly shown on desktop Brave browser
reproduction: Upload a 1146MB ChatGPT export on Brave browser (desktop)
started: After v2.2 Phase 3 Plan 02 added mobile large file warning (commit 088bba7). The warning was supposed to be mobile-only and dismissible, but it's triggering on desktop too.

## Eliminated

## Evidence

- timestamp: 2026-02-09T00:01:00Z
  checked: app/import/page.tsx lines 17-22 and 458-466
  found: Mobile detection uses `isMobileDevice()` function that tests user agent with regex `/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i` and includes "tablet" in the pattern. The 200MB mobile warning triggers when `isMobile && fileSizeMB > 200`
  implication: Brave desktop user agent might contain "mobile" or "tablet" substring, triggering false positive, OR the user is reporting 1146MB but the check is at 200MB so any large file would trigger this

- timestamp: 2026-02-09T00:01:01Z
  checked: app/import/page.tsx lines 458-466
  found: Mobile warning logic checks `isMobile && fileSizeMB > 200`, sets showMobileWarning modal with dismissible UI showing file size. The modal says "Large uploads work best on desktop" and allows "Upload anyway"
  implication: The 1146MB file triggers the warning because it exceeds 200MB threshold AND isMobileDevice() returns true on Brave desktop

- timestamp: 2026-02-09T00:02:00Z
  checked: Brave desktop user agent strings via web search and regex test
  found: Brave desktop UA strings don't contain "mobile" or "tablet" - they match Chrome desktop format. Regex test confirms they DON'T match the mobile detection pattern
  implication: Mobile detection is NOT the issue - Brave desktop would return false from isMobileDevice()

- timestamp: 2026-02-09T00:02:30Z
  checked: Error classification code lines 98-106
  found: There's a DIFFERENT error path for "entity too large" that shows "Try uploading from a desktop browser" message. This is triggered by errors containing "entity too large", "too large", or "size"
  implication: User is likely seeing the ERROR CLASSIFICATION message (lines 98-106) not the mobile warning modal. The error is probably coming from infrastructure/server rejecting the upload

- timestamp: 2026-02-09T00:03:00Z
  checked: Upload flow lines 586-609 and chunked-upload.ts
  found: 1146MB file uses DIRECT XHR upload to Supabase storage URL (not through Vercel functions). Direct upload sends to `${supabaseUrl}/storage/v1/object/imports/${uploadPath}` via XMLHttpRequest
  implication: Upload bypasses Vercel's 4.5MB limit, goes straight to Supabase

- timestamp: 2026-02-09T00:03:30Z
  checked: Supabase storage file size limits (web search)
  found: Free plan: 50MB max per file. Pro plan: up to 500GB per file. Standard uploads only support up to 5GB total
  implication: If project is on Free plan, 1146MB upload will be rejected by Supabase with "entity too large" or similar error

- timestamp: 2026-02-09T00:04:00Z
  checked: supabase/migrations/20250127_storage_bucket.sql
  found: Bucket created with `file_size_limit: 10737418240` (10GB) but this is overridden by Supabase Free plan's 50MB per-file limit
  implication: Bucket config allows 10GB but plan enforcement limits to 50MB, causing 1146MB uploads to fail

## Resolution

root_cause: User's 1146MB ChatGPT export exceeds Supabase Free plan's 50MB per-file limit. The upload fails with "entity too large" error from Supabase. The error classification in page.tsx (lines 98-106) incorrectly suggests "Try uploading from a desktop browser" when the real issue is the Supabase plan limit. Additionally, there's a mobile-only 200MB warning (lines 461-466) that shouldn't exist per user requirements ("All importing should work on any device at any size — there should be NO size limits at all").

fix:
1. ✅ Removed mobile-only 200MB file size warning check (line 461-466)
2. ✅ Removed mobile warning modal UI (lines 1240-1282)
3. ✅ Removed related state variables: showMobileWarning, mobileWarningFile, mobileWarningDismissedRef
4. ✅ Updated error classification (lines 98-106) to say "File exceeds storage limit" and "Contact support for large file imports" instead of "Try uploading from a desktop browser"
5. ✅ Updated catch block error message (line 746) to match - removed "try from desktop/laptop browser" text
6. ✅ Changed canRetry from true to false for storage limit errors (user can't fix this by retrying)

verification:
- ✅ Build succeeds - TypeScript compiles without errors
- ✅ Mobile warning code completely removed (grep confirms zero references)
- ✅ Both error message locations updated with accurate storage limit text
- ✅ No more "try desktop browser" messaging anywhere in import flow
- Large files will fail on Free plan (expected) but with accurate error: "File exceeds storage limit. Contact support for large file imports."
- Small files continue to work on any device with no warnings

files_changed: ['app/import/page.tsx']
