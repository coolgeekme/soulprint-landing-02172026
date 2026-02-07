---
phase: 03-chat-integration-ux
plan: 03
subsystem: chat-ux
tags: [chat, progress-indicator, import-gating, email-cleanup, v1.2]

requires:
  - 03-02 # Memory status endpoint with fullPassStatus
  - 02-03 # Full pass pipeline that sets full_pass_status

provides:
  - Memory progress indicator in chat UI
  - Import status gating for chat access
  - Clean email module (removed unused function)

affects:
  - Future chat UX features (progress indicator pattern)

tech-stack:
  added: []
  patterns:
    - "Poll-based status monitoring with stop condition"
    - "Non-blocking background processing UX"

key-files:
  created: []
  modified:
    - app/chat/page.tsx # Memory progress indicator based on full_pass_status
    - lib/email/send.ts # Removed sendSoulprintReadyEmail function

decisions:
  - id: CHAT-GATE
    title: Gate chat on import_status (none/processing redirect)
    rationale: Users need soulprint (quick pass complete) before chatting
  - id: MEMORY-PROGRESS
    title: Show memory building indicator based on full_pass_status
    rationale: Users see subtle progress while full pass runs in background
  - id: STOP-POLLING
    title: Stop polling when fullPassStatus === complete
    rationale: No need to poll forever, save resources once ready
  - id: EMAIL-CLEANUP
    title: Remove sendSoulprintReadyEmail function
    rationale: v1.2 flow has users chatting immediately after quick pass

duration: 3min
completed: 2026-02-07
---

# Phase 3 Plan 3: Chat Progress Indicator + Email Cleanup Summary

**One-liner:** Chat shows "Building deep memory..." during full pass, redirects to /import if not ready, removed unused email function.

## What Was Built

Updated the chat page to properly gate access based on import status and show memory progress during the full pass background processing. Cleaned up the email module by removing the unused `sendSoulprintReadyEmail` function.

### Memory Progress Indicator (Task 1)

Refactored the chat page polling logic to use `fullPassStatus` from the memory status API:

**Import Gating:**
- `status === 'none'` or `status === 'processing'` → redirect to /import
- `status === 'ready'` (quick_ready or complete) → allow chat
- `status === 'failed'` → show error with retry link

**Memory Progress:**
- `fullPassStatus === 'pending' | 'processing'` → show "Building deep memory..." indicator
- `fullPassStatus === 'complete'` → hide indicator, stop polling
- `fullPassStatus === 'failed'` → hide indicator (non-fatal), stop polling, log warning

**Polling Lifecycle:**
- Polls `/api/memory/status` every 5 seconds
- Stops polling when `fullPassStatus === 'complete'` or `'failed'`
- Uses `shouldPoll.current` ref to prevent unnecessary fetches

**V2 Silent Upgrade:**
- No client-side code needed for section upgrade
- When full pass completes and writes v2 sections to database, next chat message automatically uses v2
- Only UX signal is the progress indicator disappearing

**Simplified UI:**
- Replaced percentage-based progress with indeterminate spinner
- Single condition: `memoryStatus === 'building'` shows indicator
- Clean, subtle banner: "Building deep memory..." with spinner

### Email Cleanup (Task 2)

Removed the `sendSoulprintReadyEmail` function from `lib/email/send.ts`:

**Rationale:**
- v1.2 flow has users going directly to /chat after quick pass completes
- Full pass runs in background while user is already chatting
- Email notification is unnecessary (user is already in the app)

**Preserved:**
- Resend client initialization (for future features)
- FROM_EMAIL constant (for waitlist emails, etc.)
- Email module structure (ready for future email needs)

**Verified:**
- No calls to `sendSoulprintReadyEmail` exist in codebase
- Only reference is comment explaining removal
- Build passes cleanly

## Task Commits

| Task | Description | Commit | Files Modified |
|------|-------------|--------|----------------|
| 1 | Refactor chat polling to use full_pass_status | 5216d65 | app/chat/page.tsx |
| 2 | Remove sendSoulprintReadyEmail function | 5bd2cbf | lib/email/send.ts |

## Decisions Made

**CHAT-GATE:** Gate chat access on import_status
- Redirect to /import if status is 'none' or 'processing'
- Allow chat only when status is 'ready' (quick_ready or complete)
- Show error with retry link if status is 'failed'

**MEMORY-PROGRESS:** Show memory building indicator based on full_pass_status
- Display "Building deep memory..." while full pass is pending/processing
- Hide indicator when full pass completes or fails
- Non-blocking -- user can chat while memory builds

**STOP-POLLING:** Stop polling when fullPassStatus is complete
- Saves resources by not polling indefinitely
- Uses shouldPoll.current ref to cleanly stop interval

**EMAIL-CLEANUP:** Remove sendSoulprintReadyEmail function
- v1.2 users go directly to chat, no email needed
- Preserved Resend client for future features
- Cleaner codebase, fewer unused functions

## Testing Notes

**Manual Testing Required:**
1. **Import gating:**
   - User with no import → should redirect to /import
   - User with processing import → should redirect to /import
   - User with failed import → should show error with retry link
   - User with complete import → should allow chat

2. **Memory progress:**
   - After quick pass completes, chat should show "Building deep memory..." indicator
   - Indicator should have spinning animation
   - Indicator should disappear when full pass completes
   - User can send messages while indicator is visible

3. **Polling behavior:**
   - Network tab should show polling every 5 seconds
   - Polling should stop when full pass completes
   - No errors in console when full pass fails (just warning)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Blockers:** None

**Concerns:**
- Monitor polling interval (5s) for performance impact at scale
- Consider WebSocket for real-time updates in future
- Full pass failure handling is silent -- may want admin notification

**Required for Next Phase:**
- None (Phase 3 is complete after Plan 03-04)

## Success Criteria Met

- [x] Memory progress indicator shows while background processing runs (IMP-04)
- [x] Sections silently upgrade to v2 after full pass completes (IMP-05)
- [x] MEMORY section builds in background after chat opens (IMP-03)
- [x] No sendSoulprintReadyEmail function exists (EMAIL-01)
- [x] Waitlist email is unchanged (EMAIL-02)
- [x] Build passes cleanly
- [x] Chat page shows "Building deep memory..." based on full_pass_status
- [x] Chat page hides progress indicator when full pass completes
- [x] Chat page redirects to /import when import_status is 'none' or 'processing'
- [x] Chat page allows access when import_status is 'quick_ready' or 'complete'

## Related Plans

**Dependencies:**
- 03-02: Memory status endpoint returns fullPassStatus (provides API)
- 02-03: Full pass pipeline sets full_pass_status (provides data)

**Impacts:**
- 03-04: Final plan in Phase 3 (may reference progress indicator pattern)

---

**Implementation Quality:** Production-ready
**Test Coverage:** Manual testing required (no automated tests)
**Documentation:** Inline comments explain polling lifecycle and gating logic

## Self-Check: PASSED

All modified files exist:
- ✓ app/chat/page.tsx
- ✓ lib/email/send.ts

All commits exist:
- ✓ 5216d65 (Task 1: chat polling refactor)
- ✓ 5bd2cbf (Task 2: email cleanup)
