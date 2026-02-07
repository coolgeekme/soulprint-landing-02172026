---
phase: 03-chat-integration-ux
plan: 02
subsystem: import-ux
tags: [import, ux, redirect, memory-status, quick-pass]

requires:
  - 01-02-quick-pass-pipeline
  - 02-01-rlm-full-pass-endpoint
provides:
  - Import page redirects to chat after quick pass
  - Memory status endpoint exposes full_pass_status
affects:
  - 03-03-chat-page-memory-progress

tech-stack:
  added: []
  patterns:
    - Immediate redirect after quick pass completion
    - Full pass status exposed for downstream UX

key-files:
  created: []
  modified:
    - app/api/memory/status/route.ts
    - app/import/page.tsx

decisions:
  - id: IMP-REDIRECT
    text: "Import page redirects to /chat immediately after queue-processing completes (quick pass done)"
    rationale: "queue-processing runs synchronously and returns only after quick pass completes, so import_status is already 'quick_ready' by the time we get success response"
  - id: IMP-NO-EMAIL
    text: "Removed all 'We'll email you when ready' messaging from import flow"
    rationale: "With v1.2's 15-30s quick pass, users go directly to chat. Email notification is obsolete."
  - id: STATUS-FULL-PASS
    text: "Memory status endpoint now exposes fullPassStatus and fullPassError"
    rationale: "Chat page (Plan 03) needs this to show memory progress indicator while full pass runs in background"

metrics:
  duration: 2.9min
  completed: 2026-02-07
---

# Phase 3 Plan 2: Import Page UX Streamline Summary

**One-liner:** Import page now shows "Analyzing your conversations..." loading screen and redirects to chat after quick pass (~15-30s), with memory status endpoint exposing full_pass_status for downstream progress indicators

## What Was Built

### Task 1: Memory Status Endpoint Enhancement
Updated `/api/memory/status` to expose full pass status:
- Added `full_pass_status` and `full_pass_error` to SELECT query
- Exposed `fullPassStatus` and `fullPassError` in JSON response
- Preserved existing status mapping: `import_status='quick_ready'` → `status='ready'`
- Enables chat page (Plan 03-03) to show memory progress indicator

### Task 2: Import Page Redirect Flow
Refactored import page to redirect to chat after quick pass:
- **Success flow change:** After `queue-processing` returns success, immediately redirect to `/chat` (with 800ms pause for UX)
- **Removed email messaging:** Deleted "We'll email you when it's ready!" UI from done step
- **Updated processing text:**
  - Headline: "Creating your SoulPrint" → "Analyzing your conversations..."
  - Progress stages: Updated to reflect analysis ("Reading your conversations...", "Analyzing your personality...", "Building your profile...")
- **Done step transition:** Replaced email wait screen with brief spinner + "Opening your personalized chat..."
- **Kept Mail icon:** Still used in export instructions (step 3: "Check your email" from OpenAI)

## Technical Details

### Why Immediate Redirect Works
The `queue-processing` endpoint calls `process-server` synchronously:
1. Upload → Parse conversations → Quick pass generation → Set `import_status='quick_ready'` → Fire RLM full pass (async) → Return success
2. By the time the client receives the success response, the quick pass is already complete
3. No polling needed — just redirect immediately

### Status Flow
```
import_status: none → processing → quick_ready → complete
                                       ↓
                                   (redirect to /chat)
```

### Memory Status Response
```json
{
  "status": "ready",
  "hasSoulprint": true,
  "fullPassStatus": "processing",  // NEW
  "fullPassError": null,           // NEW
  ...
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

### app/api/memory/status/route.ts
- Line 23: Added `full_pass_status, full_pass_error` to SELECT
- Lines 55-56: Added `fullPassStatus` and `fullPassError` to response

### app/import/page.tsx
- Line 7: Kept Mail import (used in export instructions)
- Lines 437-444: Changed success flow to redirect instead of showing "done" step
- Lines 384-393: Updated progress stage messages
- Lines 785-786: Updated processing headline and subtext
- Lines 813-839: Updated done step to show transition screen

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add full_pass_status to memory status endpoint | 7e34220 | app/api/memory/status/route.ts |
| 2 | Refactor import page to redirect after quick pass | c3e18d1 | app/import/page.tsx |

## Verification Results

✅ `npm run build` passes (compiled successfully in 7.5s)
✅ Memory status endpoint returns `fullPassStatus` field
✅ Import page no longer shows "We'll email you when ready" messaging
✅ Import page redirects to `/chat` after successful processing (line 444)
✅ No references to email notification in import flow (except export instructions)

## Next Phase Readiness

**Blockers:** None

**Ready for:**
- Plan 03-03: Chat page memory progress indicator (can consume fullPassStatus)

**Notes:**
- The full pass continues running in the background after redirect
- Users can start chatting immediately with quick pass sections (SOUL, IDENTITY, USER, AGENTS, TOOLS)
- MEMORY section becomes available when full pass completes (shown via progress indicator in Plan 03-03)

## Self-Check: PASSED

Created files: (none - modifications only)

Commits verified:
- 7e34220 ✓
- c3e18d1 ✓
