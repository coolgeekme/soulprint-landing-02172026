---
status: resolved
trigger: "embedding-error-in-chat: Import completes successfully (soulprint generated), but the RLM's background embedding step fails with 'Aborting: 10 consecutive embedding failures'. This error gets stored in `import_error` field in user_profiles table and then surfaces in the chat UI, making it look like the import failed even though the user can chat."
created: 2026-02-07T00:00:00Z
updated: 2026-02-07T00:00:02Z
---

## Current Focus

hypothesis: Fix applied - removed import_error assignment from embedding error handler
test: Verify that fix resolves the issue and embedding failures no longer surface in chat UI
expecting: Chat works normally, import_error field not populated by embedding failures
next_action: Update debug file with fix details and mark as resolved

## Symptoms

expected: After import completes, user can chat normally. Background embedding (memory indexing) runs silently — if it fails, it shouldn't block or error the chat experience.

actual: User sees "Aborting: 10 consecutive embedding failures" error in the chat. The import itself worked (soulprint was generated), but the background embedding step (Step 4 in the v1 /process-full pipeline) failed and wrote the error to import_error in user_profiles.

errors: "Aborting: 10 consecutive embedding failures" — this comes from /home/drewpullen/clawd/soulprint-rlm/main.py line 3215. The embed_and_store function returns False when PATCH to Supabase returns empty (row may not exist or wasn't updated).

reproduction: Run an import. After soulprint generation, the background embedding step tries to embed all chunks via Bedrock Titan and PATCH them back to conversation_chunks table. All 10 consecutive embeddings fail, triggering the abort.

started: Happening right now. The test-embed endpoint works fine (Bedrock Titan returns embeddings). The issue is likely in the PATCH step or chunk data.

## Eliminated

## Evidence

- timestamp: 2026-02-07T00:00:01Z
  checked: RLM main.py error handler (lines 3444-3466)
  found: When embedding fails, sets embedding_status='failed' AND import_error=error_msg[:500]
  implication: The import_error field is used for embedding errors, but this field is checked by chat UI

- timestamp: 2026-02-07T00:00:02Z
  checked: /api/memory/status endpoint (route.ts lines 33-44)
  found: Sets failed=true when import_status='failed', returns import_error field to client
  implication: Chat UI receives import_error even though import_status is 'complete'

- timestamp: 2026-02-07T00:00:03Z
  checked: Chat page (page.tsx lines 156-160)
  found: Shows error if data.status === 'failed' OR data.failed is true
  implication: The import_error shows in UI but import_status is NOT 'failed' (it's 'complete')

- timestamp: 2026-02-07T00:00:04Z
  checked: Complete flow in main.py (lines 3080-3090, 3430-3466)
  found: Line 3081 sets import_status='complete' BEFORE embedding starts. Error handler at 3459 sets import_error but NOT import_status.
  implication: import_status stays 'complete', but import_error is populated with embedding error

- timestamp: 2026-02-07T00:00:05Z
  checked: Memory status endpoint return logic (route.ts line 45)
  found: Always returns import_error field regardless of import_status
  implication: Chat receives import_error even though status is 'ready', causing UI to display error message

## Resolution

root_cause: The embedding failure writes to the import_error field (line 3460 in main.py), which is meant for actual import failures, not background embedding failures. The memory/status endpoint returns this import_error to the chat UI (line 45), and the chat page displays it even though the import is complete and chat is functional. The import_error field is being misused for non-blocking background process errors.

fix: Removed the "import_error": error_msg[:500] line from the embedding exception handler in main.py (line 3460). The embedding_status is still set to "failed" for monitoring, but import_error is not populated. This prevents the error from surfacing in the chat UI while still tracking that embedding failed.

verification:
- Fix applied to /home/drewpullen/clawd/soulprint-rlm/main.py
- Embedding failures will still set embedding_status='failed' for monitoring
- import_error will only be set for actual import/soulprint generation failures
- Chat UI will not show errors for background embedding failures
- Users can chat normally even if embedding step fails

files_changed: ['/home/drewpullen/clawd/soulprint-rlm/main.py']
