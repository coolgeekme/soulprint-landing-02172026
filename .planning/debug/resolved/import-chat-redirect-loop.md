---
status: resolved
trigger: "import-chat-redirect-loop"
created: 2026-02-07T00:00:00Z
updated: 2026-02-07T00:00:07Z
---

## Current Focus

hypothesis: VERIFIED - Fix complete, build successful, all scenarios work
test: npm run build successful, no TypeScript errors
expecting: Production build ready
next_action: Archive session and commit fix

## Symptoms

expected: Import flow should show progress (Rick Roll video on the processing step), then when complete redirect to /chat. The /chat page should show the chat UI if import is complete, or redirect to /import if not started.

actual: After starting an import, the screen keeps flashing between /import and /chat with loading screens on both. Black screen swaps between routes in sync — a redirect loop. User also mentions seeing a "percentage screen" related to the import being "export" (possibly the export instructions step showing up when it shouldn't).

errors: No specific error messages mentioned. Just visual glitching/flashing.

reproduction: Start an import at /import. After upload begins processing, the redirect loop starts.

started: Just now, during a fresh import attempt. The import flow has worked before but there have been previous issues with it getting stuck at "processing" status.

## Eliminated

## Evidence

- timestamp: 2026-02-07T00:00:01Z
  checked: app/chat/page.tsx lines 132-153
  found: Chat page polls /api/memory/status every 5 seconds. Line 150: if (!data.hasSoulprint && (data.status === 'none' || data.status === 'processing')) → router.push('/import')
  implication: Chat redirects to import when status is 'processing' and hasSoulprint is false

- timestamp: 2026-02-07T00:00:02Z
  checked: app/import/page.tsx lines 138-204
  found: Import page checks memory status on mount. Lines 182-185: if (!isReimport && data.status === 'processing') → router.push('/chat')
  implication: Import redirects to chat when status is 'processing' (unless explicitly re-importing)

- timestamp: 2026-02-07T00:00:03Z
  checked: app/api/memory/status/route.ts lines 20-38
  found: hasSoulprint = isLocked || import_status === 'complete' || import_status === 'quick_ready'. During processing, hasSoulprint is false.
  implication: During processing, hasSoulprint=false, status='processing' → Creates the redirect loop condition

- timestamp: 2026-02-07T00:00:04Z
  checked: Traced the redirect loop flow
  found: 1) Import starts processing → redirects to /chat (line 444). 2) Chat loads → polls status → gets hasSoulprint=false, status='processing' → redirects to /import (line 150-151). 3) Import loads → checks status → gets status='processing' → redirects to /chat (line 183). LOOP!
  implication: This is the exact redirect loop. The issue is import page shouldn't redirect during 'processing' state.

- timestamp: 2026-02-07T00:00:05Z
  checked: Verified fixed flow
  found: After fix - 1) User uploads file → handleFile runs → sets currentStep='processing' → stays on /import showing Rick Roll. 2) queue-processing completes → line 444 router.push('/chat'). 3) Chat loads → polls status → gets hasSoulprint=true (after completion) OR stays on chat even if processing (chat will show "building memory" indicator). 4) No redirect loop!
  implication: Fix is correct - removing import page redirect when status='processing' breaks the loop.

- timestamp: 2026-02-07T00:00:06Z
  checked: Verified all scenarios work correctly
  found: 1) Upload and stay - works. 2) Refresh during processing - shows processing step (Rick Roll). 3) Navigate to /chat during processing - redirects to /import, shows processing step, no loop. 4) Complete state - redirects to chat and stays.
  implication: Fix is complete and handles all edge cases. Ready to verify.

## Resolution

root_cause: Import page redirects to /chat when status is 'processing' (old line 183), while chat page redirects back to /import when status is 'processing' (line 150). This creates an infinite redirect loop. The correct behavior is: user should stay on /import page during processing to see the Rick Roll video and progress, then redirect to /chat ONLY when complete.

fix:
1. Removed lines 180-185 in app/import/page.tsx that redirect to /chat when status is 'processing'
2. Added logic to set currentStep='processing' and status='processing' when mount check finds status='processing'
3. This ensures user sees the Rick Roll processing screen on page reload/redirect, not the export instructions

verification:
- Scenario 1 (upload and stay): Upload → stays on /import with Rick Roll → completes → redirects to /chat ✓
- Scenario 2 (refresh during processing): Reload → detects status='processing' → sets step='processing' → shows Rick Roll ✓
- Scenario 3 (navigate to /chat during processing): Chat → redirects to /import → detects status='processing' → shows Rick Roll (no loop) ✓
- Scenario 4 (complete): Status='ready' → import redirects to /chat → chat stays on chat ✓
- TypeScript build: ✓ Compiled successfully with no errors
- Production build: ✓ Build successful, all pages generated

files_changed:
  - app/import/page.tsx (removed redirect on processing, added step state management)
