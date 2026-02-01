# Codebase Concerns

**Analysis Date:** 2026-02-01

## Critical Security Issues

### Exposed Secrets in Version Control

**Issue:** `.env.local` file contains plaintext credentials committed to repository
- **Files:** `.env.local`
- **Exposed secrets:**
  - AWS access keys: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  - Database tokens: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - API keys: `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `TAVILY_API_KEY`, `GEMINI_API_KEY`
  - OAuth tokens: `GMAIL_REFRESH_TOKEN`
  - Third-party credentials: `ASSEMBLYAI_API_KEY`, `KIE_API_KEY`, `SLACK_BOT_TOKEN`
- **Impact:** Anyone with repository access can access all external services, databases, and user data
- **Recommendations:**
  1. Immediately rotate ALL exposed keys and credentials
  2. Remove `.env.local` from git history (use `git filter-branch` or BFG Repo-Cleaner)
  3. Add `.env.local` to `.gitignore`
  4. Use Vercel environment variables or GitHub Secrets exclusively
  5. Audit logs for any unauthorized access using these credentials

### Hardcoded Admin Emails

**Issue:** Admin authorization relies on hardcoded email addresses
- **Files:** `app/api/admin/reset-user/route.ts` (lines 12-15)
- **Code:**
  ```typescript
  const ADMIN_EMAILS = [
    'drew@archeforge.com',
    'drewspatterson@gmail.com',
  ];
  ```
- **Risk:** Admin emails exposed in codebase; anyone with repository access knows who admins are
- **Recommendations:**
  1. Move to database-backed role system with proper authorization middleware
  2. Use environment variables for authorized user IDs instead of emails
  3. Implement proper RBAC (Role-Based Access Control)

### Service-to-Service Authentication Issues

**Issue:** Bearer token authentication using SUPABASE_SERVICE_ROLE_KEY
- **Files:** `app/api/import/upload/route.ts` (line 76)
- **Code:**
  ```typescript
  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  ```
- **Risk:** Service role key transmitted over network; if intercepted, provides full database access
- **Recommendation:** Use internal service-to-service auth or avoid transmitting secrets in request bodies; prefer environment-based auth

## Tech Debt

### Excessive API Endpoint Proliferation

**Issue:** 58 API endpoints across `/app/api/` with unclear organization
- **Files:** `app/api/` directory (58 route files)
- **Examples:**
  - Multiple import endpoints: `upload`, `quick`, `process`, `process-background`, `process-server`
  - Multiple embedding endpoints: `embed-all`, `embed-background`
  - Duplicate/overlapping admin endpoints: `reset-user` supports GET, POST, DELETE
- **Impact:** Difficult to maintain; unclear which endpoint to use; risk of logic duplication
- **Fix approach:**
  1. Consolidate overlapping import endpoints into single `/api/import` handler
  2. Combine embedding logic into `/api/embeddings` with operation type parameter
  3. Create `/api/admin` middleware wrapper to handle all admin operations
  4. Document endpoint contract and deprecate unused endpoints

### Missing Error Handling Standardization

**Issue:** Inconsistent error handling across routes
- **Files:** Multiple routes (`app/api/**/*.ts`)
- **Patterns observed:**
  - Some routes throw errors, others return null silently
  - Inconsistent HTTP status codes (some use 500 for all errors)
  - Logging is verbose but inconsistent (`[Chat]`, `[Import]`, etc. prefixes)
  - Some errors silently fall back without informing user: `app/api/chat/route.ts` lines 217-234
- **Impact:** Frontend cannot reliably distinguish error types; debugging is harder
- **Fix approach:**
  1. Create standardized error response format
  2. Use consistent HTTP status codes per error type
  3. Build error middleware wrapper for API routes
  4. Implement error boundary in frontend for user-facing messages

### Type Safety Gaps

**Issue:** Widespread use of `any` type and missing type definitions
- **Files:** Multiple files including:
  - `app/api/admin/reset-user/route.ts` (line 56): `Record<string, any>`
  - `app/api/gamification/xp/route.ts`: disabled `@typescript-eslint/no-explicit-any`
  - `app/api/import/create-soulprint/route.ts`: multiple `any` types in functions
  - `app/api/import/process-background/route.ts`: cast results as `any`
- **Impact:** No compile-time type checking; harder to refactor; easier to introduce bugs
- **Fix approach:**
  1. Create proper type definitions for all API request/response payloads
  2. Create shared types for Supabase row types (`User`, `Profile`, `Chunk`, etc.)
  3. Replace `any` with specific types; only allow where absolutely necessary
  4. Enable strict TypeScript checking in `tsconfig.json`

## Performance Bottlenecks

### Synchronous Embedding Processing During Import

**Issue:** Large embedding operations block request handling
- **Files:** `app/api/import/embed-all/route.ts`, `lib/import/embedder.ts`
- **Problem:**
  - Bedrock embedding calls not paginated efficiently
  - 50-chunk batches may cause timeouts on Vercel (5min max)
  - No queue system for large imports (>500 chunks)
- **Impact:** Imports fail for users with large conversation histories; poor user experience
- **Improvement path:**
  1. Use queue system (Bull/BullMQ) for background embedding jobs
  2. Implement streaming responses for long-running imports
  3. Add progress polling endpoint so UI can show real-time status
  4. Batch embeddings into smaller chunks (20-30 per request)

### Vector Search Performance

**Issue:** Multiple vector searches executed sequentially per chat message
- **Files:** `lib/memory/query.ts` (lines 282-318)
- **Code:** Calls `searchMemoryLayered()` 4 times in sequence for MACRO, THEMATIC, MICRO layers
- **Impact:** ~200-400ms latency added to every chat message when memory context needed
- **Improvement path:**
  1. Cache query embeddings (don't re-embed per search)
  2. Parallelize layer searches using `Promise.all()`
  3. Implement connection pooling for Bedrock client
  4. Add Redis caching layer for frequently accessed chunks

### Unoptimized Database Queries

**Issue:** N+1 queries and inefficient patterns
- **Files:** `app/api/admin/reset-user/route.ts` (lines 160-174)
- **Pattern:** Separate count queries for total chunks, embedded chunks - should use single query with aggregation
- **Impact:** Multiple database round trips; slower admin operations
- **Fix:** Use database aggregations; batch related queries

## Fragile Areas

### Fallback Chain Fragility in Chat Route

**Issue:** Complex fallback chain with multiple failure modes
- **Files:** `app/api/chat/route.ts` (lines 237-357)
- **Chain:** RLM → Bedrock → No response
- **Fragility:**
  - RLM timeout (60s) could hang user request
  - Bedrock fallback could fail silently in production
  - No circuit breaker - keeps trying failed services
  - Web search (Perplexity → Tavily) adds another layer of cascading failures
- **Safe modification:**
  1. Add request timeout at route level (30s max)
  2. Implement circuit breaker for external services
  3. Add monitoring/alerting for fallback usage
  4. Test failure modes explicitly

### Import Process State Machine Complexity

**Issue:** Multiple import endpoints without clear coordination
- **Files:**
  - `app/api/import/upload/route.ts` (initiates two-phase)
  - `app/api/import/quick/route.ts` (phase 1)
  - `app/api/import/embed-all/route.ts` (phase 2)
  - `app/api/import/process/route.ts` (unified alternative)
- **Risk:** Unclear which flow is active; potential for partial imports; duplicate data
- **Test coverage gap:** No integration tests for full import flow
- **Safe modification:**
  1. Document which import path is canonical (appears to be `/api/import/process`)
  2. Deprecate other endpoints explicitly
  3. Add state validation to prevent double-imports
  4. Add transactional guarantees to import operations

### Memory Vector Search with Fallback

**Issue:** Silent fallback from vector search to keyword search
- **Files:** `lib/memory/query.ts` (lines 329-334)
- **Code:**
  ```typescript
  } catch (error) {
    console.log('[RLM] Vector search failed:', error);
    // Fallback
    chunks = await keywordSearch(userId, query, 5);
  }
  ```
- **Risk:**
  - RPC function may be missing silently (code 42883)
  - Fallback gives different quality results
  - User sees inconsistent memory quality without knowing
- **Safe modification:**
  1. Add explicit monitoring for RPC errors
  2. Alert when fallback is triggered
  3. Make fallback logic explicit and testable
  4. Cache RPC availability check

## Test Coverage Gaps

### No Integration Tests for Import Flow

**Issue:** Critical import pipeline untested end-to-end
- **Files:** `app/api/import/**/*`
- **What's not tested:**
  - Full import with file upload → chunking → embedding → soulprint generation
  - Two-phase import (quick + background embeddings)
  - Failure recovery during import
  - Chunk deduplication and overlap
- **Risk:** Regressions could leave users with incomplete imports silently
- **Priority:** High - import is core user journey

### No Tests for Chat with Memory Retrieval

**Issue:** Chat with memory context is untested
- **Files:** `app/api/chat/route.ts`, `lib/memory/query.ts`
- **What's not tested:**
  - Memory search quality
  - Fallback from RLM to Bedrock
  - Web search integration
  - History concatenation and token limits
- **Risk:** Changes to memory retrieval could break chat quality without detection
- **Priority:** High - affects every chat interaction

### No Admin Endpoint Tests

**Issue:** Admin operations untested
- **Files:** `app/api/admin/**/*`
- **What's not tested:**
  - User reset/deletion cascade
  - Admin authorization checks
  - Metric calculations
  - Health checks
- **Risk:** Admin operations could corrupt data
- **Priority:** Medium

## Dependencies at Risk

### OpenAI Fallback for Soulprint Generation

**Issue:** If OpenAI fails, generates generic fallback soulprint
- **Files:** `app/api/import/process/route.ts` (lines 272-280), `app/api/import/create-soulprint/route.ts`
- **Risk:**
  - Users may not realize their soulprint is generic
  - No indication to user that generation failed
  - Repeated failures accumulate poor quality profiles
- **Mitigation:** Currently has fallback, but no user notification
- **Recommendation:**
  1. Add flag to profile indicating soulprint quality
  2. Alert user if generation failed
  3. Offer re-import option
  4. Monitor OpenAI API reliability

### Bedrock AWS Region Hardcoded

**Issue:** All Bedrock calls use `us-east-1` with no failover
- **Files:** Multiple files using `process.env.AWS_REGION || 'us-east-1'`
- **Risk:** Regional outage causes complete service failure
- **Improvement:** Add multi-region failover or region configuration

## Scaling Limits

### Chunk Size and Token Limits

**Issue:** Chunk truncation at fixed boundaries may lose context
- **Files:**
  - `lib/import/embedder.ts` (line 39): 128000 char truncation
  - `lib/memory/query.ts` (lines 360-361): Layer-specific truncation (2000 for MACRO, 1000 for standard)
- **Risk:** Important information at end of large chunks is discarded
- **Capacity:** No clear guidance on max conversation size per user
- **Improvement:**
  1. Implement sliding window chunking
  2. Add metrics on chunk loss
  3. Document maximum supported conversation size

### Vector Database Scalability

**Issue:** No indexing strategy documented for large user bases
- **Impact:** Vector searches will slow as chunks accumulate
- **Improvement path:**
  1. Add database indices on (`user_id`, `embedding`)
  2. Implement partitioning by user
  3. Consider dedicated vector DB (Pinecone, Weaviate) for scale

## Missing Critical Features

### No Backup/Export for User Data

**Issue:** User conversations are stored but no export mechanism
- **Files:** `app/api/import/process/route.ts` (lines 168-202) - only stores compressed raw JSON internally
- **Risk:** User data lock-in; GDPR compliance gaps
- **Recommendation:**
  1. Implement user data export endpoint (conversations, chunks, profile)
  2. Add periodic backup mechanism
  3. Document data retention policy

### No Rate Limiting

**Issue:** No per-user rate limits on API endpoints
- **Files:** All API routes lack rate limiting
- **Risk:** Abuse of embedding/chat endpoints; cost overruns
- **Recommendation:**
  1. Add middleware for rate limiting by user ID
  2. Configure thresholds per operation type
  3. Return 429 status with retry info

### No Request Validation Schema

**Issue:** Request bodies validated inline, not with schema library
- **Files:** All API routes manually validate request body properties
- **Risk:** Easy to miss edge cases; vulnerability to malformed data
- **Recommendation:**
  1. Implement Zod or similar schema validation
  2. Create reusable schemas for common payload types
  3. Add request logging for debugging

## Data Integrity Concerns

### No Transactional Guarantees for Multi-Step Operations

**Issue:** Import process spans multiple API calls without transactions
- **Files:** `app/api/import/upload/route.ts`, `app/api/import/quick/route.ts`, `app/api/import/embed-all/route.ts`
- **Scenario:** If embedding fails partway through, user is left with incomplete data
- **Impact:** Database inconsistency; user confusion
- **Fix approach:**
  1. Move to single unified import endpoint with transaction-like semantics
  2. Use queue system with idempotent operations
  3. Add import status tracking with detailed error info

### Chat Message Storage Unpredictable

**Issue:** Not clear how chat history is persisted
- **Files:** `app/api/chat/messages/route.ts` not found in listing; unclear where messages saved
- **Impact:** Potential data loss; unclear retention policy
- **Recommendation:**
  1. Explicitly document chat persistence strategy
  2. Add endpoint to persist messages incrementally
  3. Add archival/cleanup policy

---

*Concerns audit: 2026-02-01*
