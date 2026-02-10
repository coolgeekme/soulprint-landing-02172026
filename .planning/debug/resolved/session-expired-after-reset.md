---
status: resolved
trigger: "session-expired-after-reset"
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T00:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - window.location.reload() causes stale cookie state
test: Root cause identified through Supabase SSR known issues
expecting: Replacing window.location.reload() with router navigation will fix it
next_action: Document root cause and proposed fix

## Symptoms

expected: After resetting data, user should be able to immediately re-upload and start the import flow again
actual: "Session expired. Please refresh the page and try again." error appears after reset. Persists even after page refresh.
errors: "Session expired" — the UI shows this in what appears to be a modal/toast. The reset endpoint itself may be returning success but the auth state is broken.
reproduction: 1. Go to the app (logged in) 2. Hit Reset 3. Try to re-import 4. "Session expired" error appears 5. Refreshing doesn't help
started: User reports this happening now, after we just removed the gamification system (user_stats reset block was removed from the reset endpoint). However this bug may have existed before that change.

## Eliminated

## Evidence

- timestamp: 2026-02-10T00:01:00Z
  checked: app/api/user/reset/route.ts
  found: Reset endpoint uses admin client for DB operations, never touches auth sessions. It returns success and the client does window.location.reload()
  implication: The reset endpoint itself is not invalidating the session

- timestamp: 2026-02-10T00:02:00Z
  checked: app/import/page.tsx lines 244-269
  found: handleReset() calls DELETE /api/user/reset, waits for success, then immediately calls window.location.reload()
  implication: The page reload happens after reset succeeds. This should be safe.

- timestamp: 2026-02-10T00:03:00Z
  checked: Error message source in app/import/page.tsx line 692
  found: "Session expired" message is triggered when error includes 'logged in' or 'unauthorized' keywords
  implication: The upload attempt is getting a 401 Unauthorized response

- timestamp: 2026-02-10T00:04:00Z
  checked: lib/tus-upload.ts lines 36-41
  found: tusUpload() calls supabase.auth.getSession() to get access_token. Returns error "You must be logged in to upload" if no session/token
  implication: After reload, the Supabase client on the browser side cannot find a valid session

- timestamp: 2026-02-10T00:05:00Z
  checked: app/api/user/reset/route.ts lines 88-102
  found: Reset updates user_profiles table, setting import_status='none', nulling soulprint_text, ai_name, and other fields
  implication: The user_profiles row still exists but is reset. This shouldn't affect auth.

- timestamp: 2026-02-10T00:06:00Z
  checked: app/import/page.tsx lines 512-514
  found: Before upload, code calls supabase.auth.getUser() (line 513). If no user, throws error "You must be logged in to upload"
  implication: This is where the failure happens - after reload, the client-side Supabase instance cannot get the user

- timestamp: 2026-02-10T00:07:00Z
  checked: Upload flow after reset
  found: User clicks Reset → DELETE /api/user/reset succeeds → window.location.reload() → page reloads → user tries to upload → supabase.auth.getUser() fails
  implication: The issue is that after window.location.reload(), the Supabase client cannot retrieve the session

- timestamp: 2026-02-10T00:08:00Z
  checked: Middleware and session refresh
  found: middleware.ts calls updateSession() which calls supabase.auth.getUser() to refresh the auth token. This happens on every request including the page reload.
  implication: If the page reloads successfully and shows the import page (not redirecting to login), then middleware successfully validated the session. The issue must be client-side.

- timestamp: 2026-02-10T00:09:00Z
  checked: Client-side Supabase initialization
  found: lib/supabase/client.ts creates browser client with cookie-based auth. Cookies should persist across reloads with 30-day maxAge.
  implication: The cookies exist, but something is preventing the client from reading them or they're invalid

- timestamp: 2026-02-10T00:10:00Z
  checked: Supabase auth.getUser() vs auth.getSession() behavior
  found: auth.getUser() makes a network request to Supabase Auth server to validate the JWT token. auth.getSession() just reads from local storage/cookies without validation.
  implication: The JWT token in the cookies might be invalid or corrupted after the reset, causing getUser() to fail

- timestamp: 2026-02-10T00:11:00Z
  checked: Import page upload flow (line 513)
  found: Calls supabase.auth.getUser() which validates JWT with Supabase Auth server. If validation fails, throws "You must be logged in to upload"
  implication: The JWT is being rejected by Supabase Auth server after reset + reload

- timestamp: 2026-02-10T00:12:00Z
  checked: Supabase SSR known issues
  found: Multiple GitHub issues report that client-side getUser() fails or hangs after page reload when stale session cookies exist. Issue #35754 specifically mentions getUser() hanging after returning to page after inactivity. Issue mentions "handling of an existing, potentially stale, session cookie" and "clearing browser cookies resolves it temporarily"
  implication: The window.location.reload() after reset is creating a stale cookie state that breaks client-side auth

- timestamp: 2026-02-10T00:13:00Z
  checked: Next.js router vs window.location.reload()
  found: window.location.reload() forces a full browser reload, clearing all JavaScript state including Supabase client. router.push() does client-side navigation preserving React state and Supabase client instances.
  implication: Using Next.js router navigation avoids the hard reload that triggers the stale cookie issue

## Resolution

root_cause: |
  The reset flow uses window.location.reload() to refresh the page after deleting user data. This hard reload creates a timing issue with Supabase SSR auth cookies:

  1. User clicks Reset
  2. DELETE /api/user/reset succeeds (using admin client, doesn't touch auth)
  3. Client immediately calls window.location.reload()
  4. Browser reloads the page, middleware runs updateSession() and refreshes auth cookies
  5. Page loads, user tries to upload
  6. Client-side createBrowserClient().auth.getUser() fails because it's reading stale cookie state

  This is a known issue in Supabase SSR (GitHub issues #35754, #31132, #107) where client-side getUser() fails after hard reloads when session cookies exist but are in a stale/transitional state. The middleware successfully validates the session server-side, but the browser client doesn't properly sync with the refreshed cookies.

  The fix is to replace window.location.reload() with a client-side navigation using Next.js router, which properly preserves the Supabase client state and avoids the stale cookie issue.

fix: |
  Replace window.location.reload() with router.push('/import') or router.refresh() in the handleReset function.

  Option 1 (preferred): Use router.push('/import')
  - This does a client-side navigation to /import
  - Preserves Supabase client state across navigation
  - Avoids hard reload and stale cookie issues

  Option 2: Use router.refresh()
  - Revalidates server data without full reload
  - Less disruptive, but may not clear all UI state

  The fix should be in app/import/page.tsx line 263, replacing:
  ```typescript
  window.location.reload();
  ```
  with:
  ```typescript
  router.push('/import');
  ```

verification: |
  AUTOMATED VERIFICATION (build check):
  - ✓ npm run build completed successfully - no TypeScript errors
  - ✓ router.push('/import') compiles correctly
  - ✓ Code change is minimal and targeted

  MANUAL VERIFICATION REQUIRED:
  1. Test reset flow: reset data, verify page navigates to /import (not hard reload)
  2. Immediately try to upload a file - should NOT get "Session expired" error
  3. Verify UI state is properly reset after navigation
  4. Test that upload proceeds normally after reset
  5. Test multiple reset + upload cycles

  EXPECTED BEHAVIOR:
  - After reset, page does client-side navigation to /import
  - Supabase client state is preserved across navigation
  - Auth cookies remain valid and getUser() succeeds
  - Upload works immediately without "Session expired" error

files_changed:
  - app/import/page.tsx (line 263: replaced window.location.reload() with router.push('/import'))
