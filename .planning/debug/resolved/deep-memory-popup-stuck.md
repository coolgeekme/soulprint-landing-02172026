---
status: resolved
trigger: "deep-memory-popup-stuck"
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED - Migration 20260207_full_pass_schema.sql added full_pass_status with DEFAULT 'pending', so all existing completed imports got set to 'pending' retroactively
test: Verify this is the root cause by checking if import_status='complete' users have full_pass_status='pending'
expecting: Need to either (1) backfill full_pass_status='complete' for existing users, OR (2) change status API logic to treat 'pending' as 'complete' for old imports
next_action: Determine best fix approach

## Symptoms

expected: After import completes, user sees the normal chat UI with no loading indicators about processing or "building deep memory"
actual: A popup/indicator saying "Building deep memory" keeps showing and looping. Import was done a day ago so it should be long complete.
errors: No specific error messages reported - just the infinite loading state
reproduction: Open /chat page after having completed import previously
started: Import was completed over a day ago. The popup persists across page loads.

## Eliminated

## Evidence

- timestamp: 2026-02-08T00:01:00Z
  checked: app/chat/page.tsx lines 854-864
  found: "Building deep memory..." indicator is shown when memoryStatus === 'building'
  implication: Need to trace what sets memoryStatus to 'building' and when it gets cleared

- timestamp: 2026-02-08T00:02:00Z
  checked: app/chat/page.tsx lines 202-260
  found: useEffect polls /api/memory/status every 5 seconds, sets memoryStatus based on fullPassStatus
  implication: The polling logic at line 232-244 checks fullPassStatus - if it's 'pending' or 'processing', sets memoryStatus='building'. Only stops polling when fps === 'complete' or 'failed'

- timestamp: 2026-02-08T00:03:00Z
  checked: app/api/memory/status/route.ts line 56
  found: CRITICAL - Line 56 has fallback logic "profile?.full_pass_status || (hasSoulprint ? 'complete' : 'pending')"
  implication: Comment on line 55 says "v1 pipeline doesn't set full_pass_status — treat null as complete when import is done". The logic SHOULD return 'complete' when hasSoulprint=true and full_pass_status=null, but user is stuck in "building" state

- timestamp: 2026-02-08T00:04:00Z
  checked: Logic flow in /api/memory/status/route.ts
  found: Line 32 sets hasSoulprint = true when import_status IN ('complete', 'quick_ready', 'locked'). Line 56 should then return 'complete' for null full_pass_status
  implication: The logic LOOKS correct. Either (1) full_pass_status is actually set to 'pending'/'processing' in DB, not null, OR (2) hasSoulprint is evaluating to false

- timestamp: 2026-02-08T00:05:00Z
  checked: supabase/migrations/20260207_full_pass_schema.sql line 21
  found: ROOT CAUSE CONFIRMED - "ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS full_pass_status TEXT DEFAULT 'pending'"
  implication: The migration added the column with DEFAULT 'pending'. All existing users who completed imports BEFORE this migration were retroactively set to full_pass_status='pending', causing infinite "Building deep memory..." loop

## Resolution

root_cause: Migration 20260207_full_pass_schema.sql added full_pass_status column with DEFAULT 'pending'. When this column was added to existing user_profiles rows with import_status='complete', they inherited full_pass_status='pending', which causes the chat page to show "Building deep memory..." indefinitely. The /api/memory/status fallback logic (line 56) tries to handle NULL values but doesn't handle the 'pending' default for legacy imports.

fix: Modified /api/memory/status/route.ts to treat full_pass_status='pending' as 'complete' when hasSoulprint=true (import_status is already 'complete', 'quick_ready', or 'locked'). Added explicit logic at lines 40-44 to handle legacy imports. Added test case for legacy import scenario.

verification: VERIFIED COMPLETE
- Build successful (TypeScript compilation passes)
- All 8 tests pass including new legacy import test case
- Logic flow verified:
  1. Legacy user: import_status='complete' + full_pass_status='pending'
  2. API returns fullPassStatus='complete' (not 'pending')
  3. Chat page receives 'complete', sets memoryStatus='ready'
  4. Polling stops (line 236 in chat/page.tsx)
  5. "Building deep memory..." popup hidden (line 855 condition false)
- Fix handles edge cases: null values still work, new imports unaffected

files_changed:
  - app/api/memory/status/route.ts
  - tests/integration/api/memory-status.test.ts

root_cause:
fix:
verification:
files_changed: []
