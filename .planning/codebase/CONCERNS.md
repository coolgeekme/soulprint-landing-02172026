# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**In-Memory Chunk Store with No Cleanup**
- Issue: `app/api/import/chunked-upload/route.ts` uses a JavaScript Map to store file chunks in memory during multi-chunk uploads. No automatic cleanup mechanism exists for stale or abandoned uploads.
- Files: `app/api/import/chunked-upload/route.ts` (line 6, `chunkStore`)
- Impact:
  - If a user uploads a 500MB file but the browser crashes mid-upload, those chunks remain in memory until the API server restarts
  - On Vercel's serverless, this could accumulate across multiple function invocations if the same process handles multiple requests
  - Potential memory exhaustion with many concurrent large uploads
- Fix approach:
  - Track upload timestamps in the Map and implement a cleanup function that removes uploads older than 30 minutes
  - Call cleanup on every POST request or via a scheduled task
  - Consider using Redis for distributed deployments instead of in-memory Map

**Loose Type Safety with `any` Types**
- Issue: Multiple API routes use `any` for complex data structures that should be properly typed
- Files:
  - `app/api/import/process-server/route.ts` (lines 109, 205: `rawConversations: any[]`, `nodes: Object.values(conv.mapping) as any[]`)
  - `app/import/page.tsx` (lines 63, 74: `storeChunksInDB`, `storeRawInDB` functions)
- Impact:
  - Missed validation opportunities for malformed ChatGPT exports
  - IDE cannot catch type mismatches when processing conversation data
  - Harder to debug issues with unexpected data shapes
- Fix approach:
  - Create proper TypeScript interfaces for ChatGPT export format (Conversation, Message, Mapping structure)
  - Replace `any` with specific types and add runtime validation
  - Add comprehensive type guards in data validation functions

**Push Notification System Disabled But Not Removed**
- Issue: Web Push notification code exists but is disabled pending database schema update
- Files: `app/api/import/complete/route.ts` (lines 163-176, commented out push notification code; line 164 TODO comment)
- Impact:
  - Accumulated technical debt - code that should either work or be removed entirely
  - Confusion about whether push notifications are a feature being worked on
  - If schema is added later, the commented code may not work as expected
- Fix approach:
  - Add `push_subscription` column to `user_profiles` table in Supabase
  - Uncomment and test push notification flow
  - OR move commented code to a separate branch/PR if deprioritized

**Unimplemented Voice Upload Features**
- Issue: Two placeholder TODOs exist for incomplete voice/pillar functionality
- Files:
  - `app/pillars/page.tsx` (line 190: "TODO: Save to API")
  - `app/voice/page.tsx` (line 173: "TODO: Implement upload to Cloudinary/API")
- Impact:
  - Users can record voice but data is not persisted
  - Pillar questionnaire responses are not saved to backend
  - Feature appears functional but silently fails to store data
- Fix approach:
  - Implement proper API endpoints for voice and pillar storage
  - Add error handling and validation
  - Add tests to catch silent failures

## Known Bugs

**Stuck Import Detection Logic**
- Symptoms: Imports processing for >15 minutes trigger a stuck detection allowing retry, but the original background job may still be running
- Files: `app/import/page.tsx` (lines 152-168, stuck detection); `app/api/import/process-server/route.ts` (line 74, `processing_started_at` timestamp)
- Trigger: User waits >15 minutes for import, gets error, retries, now running two parallel import jobs
- Workaround: Manually delete all user data and start fresh via `/import?reimport=true`
- Fix approach:
  - Add a `processing_job_id` field to track which job is currently active
  - Cancel previous job before starting new one via RLM
  - Return more granular status codes from process-server to distinguish "truly stuck" from "slow network"

**Silent Message Save Failures in Chat**
- Symptoms: User sends chat messages but they don't appear in history on refresh
- Files: `app/chat/page.tsx` (lines 164-177, `saveMessage` function has no retry logic)
- Trigger: Network interruption during message save, or API endpoint returning 5xx error
- Workaround: User re-sends the message
- Fix approach:
  - Add retry logic with exponential backoff to `saveMessage`
  - Queue failed messages in IndexedDB and retry on next successful request
  - Show visual indicator when message save fails

**Memory Status Poll Race Condition**
- Symptoms: Memory progress indicator shows incorrect percentage or jumps back after reaching 100%
- Files: `app/chat/page.tsx` (lines 112-162, memory status polling with 5s interval)
- Trigger: Multiple overlapping fetch requests for memory status can arrive out of order
- Workaround: Page refresh forces recomputation of correct state
- Fix approach:
  - Add sequence number or timestamp to status responses
  - Only update state if new response is newer than current
  - Cancel in-flight requests when unmounting component

## Security Considerations

**Sensitive User Data in Storage Without Encryption**
- Risk: Raw ChatGPT export JSON stored gzip-compressed in Supabase Storage. Supabase provides transport encryption but not at-rest encryption per user.
- Files: `app/api/import/process-server/route.ts` (lines 166-194, raw export storage)
- Current mitigation: RLS policies restrict bucket access to authenticated users, but admin users or database breaches expose data
- Recommendations:
  - Implement client-side encryption before uploading (encrypt in browser, send encrypted blob)
  - Add application-level encryption key management (e.g., Vault, HashiCorp)
  - Set Supabase Storage buckets to private with time-limited signed URLs
  - Consider automatic deletion of raw exports after N days once soulprint is generated

**AWS Bedrock Credentials Exposed in Client-Side Code**
- Risk: `app/api/chat/route.ts` initializes BedrockRuntimeClient with hardcoded region, but credentials are environment-only. If AWS key ever leaked, attacker could make expensive LLM calls.
- Files: `app/api/chat/route.ts` (lines 16-22, BedrockRuntimeClient initialization)
- Current mitigation: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are environment variables (not in code), API is server-side only
- Recommendations:
  - Use AWS IAM role-based auth if on AWS Lambda/EC2 instead of static credentials
  - Implement usage quotas and cost limits in AWS
  - Add request signing with timestamp to prevent replay attacks
  - Monitor CloudWatch for unauthorized API calls

**RLM Service URL Hardcoded with No Fallback**
- Risk: RLM URL is stored as environment variable but if misconfigured, silently fails to process imports
- Files: `app/api/import/process-server/route.ts` (line 299, RLM_API_URL fallback); `app/api/chat/route.ts` (line 116, no fallback)
- Current mitigation: Fallback to 'https://soulprint-landing.onrender.com' in process-server, but chat route has no fallback
- Recommendations:
  - Validate RLM_SERVICE_URL at startup with a health check
  - Add explicit error when service is unconfigured
  - Cache RLM health status and fail fast if known to be down

**No CSRF Protection on State-Changing API Endpoints**
- Risk: Endpoints like `/api/import/queue-processing`, `/api/user/reset`, `/api/profile/ai-name` change user data but only check authentication
- Files: `app/api/import/queue-processing/route.ts`, `app/api/user/reset/route.ts`, `app/api/profile/ai-name/route.ts`
- Current mitigation: Only accessible via authenticated requests, but no CSRF token validation
- Recommendations:
  - Implement CSRF token validation using `next-csrf` or similar middleware
  - Use SameSite=Strict cookies for auth tokens
  - Verify Origin header on state-changing requests

## Performance Bottlenecks

**Large JSON Parsing in Browser During Import**
- Problem: For desktop imports, the browser extracts conversations.json from ZIP using JSZip and parses entire JSON in memory before upload
- Files: `app/import/page.tsx` (lines 238-267, desktop extraction flow)
- Cause: Attempting to minimize upload size by extracting from ZIP before sending, but this forces full parse into memory
- Impact: Browser may become unresponsive for 30+ seconds on large exports (500MB+ files)
- Improvement path:
  - Stream JSON parsing using a JSON parser library (e.g., `ndjson` or streaming parser)
  - OR upload ZIP as-is (server extracts) and avoid client-side memory spike
  - Consider Service Worker to move parsing off main thread

**Synchronous File Chunk Uploading**
- Problem: `lib/chunked-upload.ts` uploads chunks sequentially (for loop with await on each chunk)
- Files: `lib/chunked-upload.ts` (lines 34-88, synchronous chunk loop)
- Cause: Conservative approach to avoid overwhelming network, but means 10x50MB file takes at least 10x round-trip time
- Impact: Large file uploads slow (each 50MB chunk has 200-500ms latency, so 1000MB = ~40-100 seconds just for chunk submissions)
- Improvement path:
  - Implement concurrent chunk uploading (3-5 chunks in parallel)
  - Add adaptive concurrency based on network speed
  - Keep sequential upload as fallback for poor connections

**5-Second Memory Status Poll Interval**
- Problem: Chat page polls `/api/memory/status` every 5 seconds during import processing
- Files: `app/chat/page.tsx` (lines 159-162, `checkMemoryStatus` with 5s interval)
- Cause: Conservative interval to avoid overwhelming database, but means up to 5s delay in showing progress
- Impact: Poor UX for user watching progress bar jump in 5-second increments
- Improvement path:
  - Switch to Server-Sent Events (SSE) for real-time status pushed from server
  - OR use WebSocket connection for live progress updates
  - Fallback to polling with exponential backoff if not processing

**No Pagination on Chat History Load**
- Problem: `app/chat/page.tsx` loads last 100 messages on every chat page load without pagination support
- Files: `app/chat/page.tsx` (lines 76, `/api/chat/messages?limit=100`)
- Cause: Assumes message history remains small and loadable in one request
- Impact: For users with thousands of messages, single query becomes slow and eats RAM
- Improvement path:
  - Implement cursor-based pagination loading only most recent N messages
  - Add "load older" button to fetch earlier messages on demand
  - Cache message page segments in IndexedDB

**RLM Timeout Delay on Circuit Breaker**
- Problem: When RLM is unavailable, system falls back to Bedrock but only after 60-second timeout attempt
- Files: `app/api/chat/route.ts` (line 137, `AbortSignal.timeout(60000)`)
- Cause: Trying to give RLM a fair chance, but blocks chat response for up to 60s
- Impact: During RLM outages, chat responses are delayed 60 seconds before fallback triggers
- Improvement path:
  - Use circuit breaker library to fast-fail after 2-3 consecutive failures
  - Reduce timeout to 10-15 seconds on subsequent failures
  - Record RLM latency histogram and detect when it's degraded

## Fragile Areas

**Import Processing Pipeline with Multiple Failure Points**
- Files:
  - `app/import/page.tsx` - Client-side file handling and upload
  - `app/api/import/chunked-upload/route.ts` - Chunk assembly
  - `app/api/import/queue-processing/route.ts` - Job queuing
  - `app/api/import/process-server/route.ts` - Main processing
  - RLM service - External dependency
- Why fragile:
  - Each step can fail independently (upload timeout, storage failure, RLM crash)
  - Error messages are sometimes opaque ("Processing failed")
  - No idempotency - retrying a partial import may create duplicates
  - Mobile upload path (full ZIP) handled differently than desktop (extracted JSON)
- Safe modification:
  - Add detailed logging at each stage with request IDs
  - Implement idempotency keys to prevent duplicate processing on retry
  - Test both desktop and mobile paths for same import
  - Add integration tests with synthetic large files (100MB, 500MB)

**Async Soulprint Generation with Placeholder State**
- Files: `app/api/import/process-server/route.ts` (lines 239-246, placeholder soulprint)
- Why fragile:
  - Soulprint marked as "Analyzing..." initially, then should update asynchronously
  - If RLM doesn't complete, soulprint stays in placeholder state
  - No timeout or notification when async soulprint generation stalls
  - Chat page cannot distinguish between "still generating" and "failed"
- Safe modification:
  - Add explicit `soulprint_status` field tracking ("pending", "generated", "failed")
  - Set max timeout for soulprint generation (e.g., 30 minutes)
  - Fall back to basic soulprint if RLM takes too long
  - Add monitoring alert if soulprint generation fails for user

**State Management in Chat Component**
- Files: `app/chat/page.tsx` (lines 40-42, ref-based message queue)
- Why fragile:
  - Message queue stored in refs, not state, so React doesn't track updates
  - Multiple overlapping async operations (save, AI response, learning, naming)
  - No explicit cancellation of in-flight requests on unmount
  - Race condition possible if user sends two messages quickly while AI responds
- Safe modification:
  - Audit message queue operations for race conditions
  - Add cleanup on component unmount to cancel pending requests
  - Consider using a state machine library (e.g., XState) to model chat flow
  - Add unit tests for quick message sends during AI response

**Voice Recording State Not Persisted**
- Files: `app/voice/page.tsx` (line 173, unimplemented upload)
- Why fragile:
  - Recorded voice is stored in local component state
  - No persistence to localStorage or IndexedDB
  - User can record, then lose data on page refresh
  - No error handling if upload fails (not yet implemented)
- Safe modification:
  - Implement voice upload to Cloudinary endpoint
  - Store recording in IndexedDB with timestamp
  - Add retry logic if upload fails
  - Show confirmation toast when voice is successfully saved

## Scaling Limits

**Chunked Upload Memory Map Limited to Single Process**
- Current capacity: Can hold multiple uploads, but total size limited by Node.js process memory (~1.5GB typical on Vercel)
- Limit: If 10 concurrent users each uploading 500MB files with 50MB chunks, memory could spike to 5GB
- Scaling path:
  - Migrate chunk storage to Redis (allows cross-process sharing)
  - Or switch to Supabase storage direct upload with server-side assembly

**Database Query N+1 on Chat History**
- Current capacity: Loading 100 messages works fine, but no pagination support
- Limit: With thousands of messages per user, single query becomes slow (>1s)
- Scaling path:
  - Add cursor-based pagination
  - Add database index on (user_id, created_at DESC)
  - Consider denormalizing message count per conversation

**RLM Service as Single Point of Failure**
- Current capacity: RLM processes one import at a time (assumed)
- Limit: During peak usage (morning), import queue could grow to hours
- Scaling path:
  - Add load balancing across multiple RLM instances
  - Implement job queue (Bull, RQ) with worker processes
  - Monitor queue depth and add alerts if backlog exceeds threshold

**Polling for Memory Status with O(n) Database Queries**
- Current capacity: 5-second polling interval works with <100 concurrent users
- Limit: At 1000 concurrent users, memory status endpoint could receive 200 QPS
- Scaling path:
  - Switch to Server-Sent Events for real-time updates
  - Cache status in memory with TTL, only refresh from DB every 10 seconds
  - Add database index on (user_id) for memory status queries

## Dependencies at Risk

**AWS SDK Version Pinning**
- Risk: `@aws-sdk/client-bedrock-runtime` (Bedrock client) is version-pinned in package.json. AWS SDK updates could break compatibility.
- Impact: Missing security patches if AWS SDK has vulnerability
- Migration plan:
  - Schedule quarterly AWS SDK updates
  - Test in staging environment before deploying
  - Consider using SDK v3 managed module loading to auto-update

**Supabase SDK Auth Flow Coupling**
- Risk: Code tightly coupled to Supabase auth (cookie-based, JWT tokens). Switching providers would require rewrite.
- Files: `app/middleware.ts`, `app/actions/auth.ts`, all `createClient()` calls
- Impact: High switching cost if Supabase pricing increases or service degrades
- Migration plan:
  - Abstract auth into interface (`lib/auth/interface.ts`)
  - Create adapter implementations for Supabase and NextAuth
  - Test both implementations in parallel before switching

**JSZip for Large File Extraction**
- Risk: JSZip loads entire ZIP into memory before extracting. No support for streaming extraction.
- Files: `app/import/page.tsx` (line 240), `app/api/import/process-server/route.ts` (line 120)
- Impact: Browser crashes on mobile for 500MB+ exports; server memory spike for same
- Migration plan:
  - Replace with streaming ZIP library (e.g., `yauzl` on server-side)
  - For client-side, upload ZIP as-is and let server extract
  - Test with 1GB+ files before deploying

**Vercel Timeout Hard Limit**
- Risk: Import processing depends on `maxDuration = 300` (5 minutes). Vercel may not increase this limit.
- Files: `app/api/import/process-server/route.ts` (line 16), `app/api/import/queue-processing/route.ts` (line 18)
- Impact: Imports taking >5 minutes are forcibly terminated, marked as failed
- Migration plan:
  - Profile actual import times with real data
  - If consistently >5 minutes, switch to async background job service (AWS SQS, BullMQ)
  - Or self-host on AWS Lambda with longer timeout (15 min)

## Missing Critical Features

**No Import Resume / Partial Success**
- Problem: If import fails partway through (e.g., after 500k messages processed), no way to resume or salvage progress
- Blocks: Users cannot recover from failed imports without re-uploading entire file
- Fix approach:
  - Store checkpoints during import (e.g., "processed up to message X")
  - Implement resume logic that skips already-processed messages
  - Return partial results instead of all-or-nothing failure

**No Rate Limiting on API Endpoints**
- Problem: No explicit rate limiting on chat, memory, or import endpoints
- Blocks: Abusive users could spam requests and affect service for others
- Fix approach:
  - Implement IP-based rate limiting (e.g., `ratelimit` package)
  - Add per-user rate limits (user_id-based)
  - Return 429 status with Retry-After header

**No Data Export / Portability**
- Problem: Users cannot export their chat history, soulprint, or raw data
- Blocks: No compliance with data portability regulations (GDPR, CCPA)
- Fix approach:
  - Add `/api/user/export` endpoint that generates JSON/CSV of all user data
  - Include raw ChatGPT export, chat history, and derived soulprint
  - Offer downloadable archive format

**No A/B Testing Framework**
- Problem: Feature flags exist but no systematic A/B testing setup
- Blocks: Cannot safely test new chat models, import strategies, or UI changes
- Fix approach:
  - Implement feature flag library (e.g., LaunchDarkly, Unleash)
  - Add variants for RLM vs Bedrock, different chunking strategies
  - Track metrics per variant (completion rate, chat quality, latency)

## Test Coverage Gaps

**Import Flow Not Tested End-to-End**
- What's not tested: Actual file upload → processing → soulprint generation → chat access flow
- Files: `app/api/import/*`, `app/import/page.tsx`
- Risk: Critical user journey could break without detection
- Priority: High
- Suggested tests:
  - Synthetic ChatGPT export generation (50, 500, 5000 conversations)
  - Upload via browser and API
  - Verify soulprint generated, status updates, chat accessible
  - Test both desktop and mobile upload paths

**Chunked Upload Not Tested with Real Large Files**
- What's not tested: Actual behavior with 100MB+ files; chunk assembly correctness; cleanup of abandoned uploads
- Files: `app/api/import/chunked-upload/route.ts`
- Risk: Memory leaks, corrupted files, or missing chunks undetected until production
- Priority: High
- Suggested tests:
  - Generate 200MB test file and upload via chunked API
  - Verify final assembled file matches original (checksum)
  - Test abandonment (upload first 3 chunks, then stop) and verify cleanup

**Memory Leaks Not Monitored**
- What's not tested: Long-running chat sessions don't accumulate memory; refs don't leak
- Files: `app/chat/page.tsx`, all refs and intervals
- Risk: App becomes sluggish after hours of chatting
- Priority: Medium
- Suggested tests:
  - Send 1000 chat messages in sequence
  - Monitor memory usage over time
  - Verify cleanup on component unmount

**Error Scenarios Not Tested**
- What's not tested: What happens when RLM is down, Bedrock rate-limited, storage upload fails, etc.
- Files: All API routes with external dependencies
- Risk: Silent failures or cryptic error messages to users
- Priority: High
- Suggested tests:
  - Mock RLM service returning errors
  - Test chat API fallback to Bedrock
  - Verify import error messages are user-friendly

**Voice Upload Not Tested**
- What's not tested: Voice recording, upload to Cloudinary, error handling
- Files: `app/api/voice/upload/route.ts`, `app/voice/page.tsx`
- Risk: Voice feature completely broken without detection
- Priority: Medium
- Suggested tests:
  - Record test audio and upload via API
  - Verify stored in Cloudinary
  - Test upload failure scenarios

---

*Concerns audit: 2026-02-06*
