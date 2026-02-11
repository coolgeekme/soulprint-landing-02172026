---
phase: 03-memory-in-chat
plan: 02
subsystem: memory
tags: [bedrock, titan-embed-v2, pgvector, hnsw, semantic-search, vector-database]

# Dependency graph
requires:
  - phase: 02-vector-infrastructure
    provides: HNSW index with 768-dim embeddings, match_conversation_chunks RPC
provides:
  - Next.js query embedding with Titan Embed v2 (768-dim) matching storage
  - Simplified semantic search via match_conversation_chunks RPC
  - Bedrock fallback path working memory retrieval
affects: [chat-integration, memory-quality, bedrock-fallback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Titan Embed v2 for query embeddings (768-dim, matches storage)
    - Admin client for RPC access (service role key bypasses RLS)
    - Top-K cosine similarity search (no layering complexity)

key-files:
  created: []
  modified:
    - lib/memory/query.ts: embedQuery and getMemoryContext
    - app/api/memory/query/route.ts: API integration

key-decisions:
  - "768 dimensions for queries (matches stored embeddings from Phase 2)"
  - "Removed broken layered search (Macro/Thematic/Micro) - simplified to top-K"
  - "Use getSupabaseAdmin() for RPC calls (service role key required)"
  - "Sequential embedding calls (Titan v2 has no batching API)"

patterns-established:
  - "embedQuery() uses Titan Embed v2 with 768 dims, normalize=true"
  - "searchChunksSemantic() calls match_conversation_chunks RPC via admin client"
  - "getMemoryContext() embeds query, searches semantically, falls back to keyword"

# Metrics
duration: 5min
completed: 2026-02-11
---

# Phase 03 Plan 02: Fix Memory Query with Titan Embed v2 Summary

**Next.js memory queries now use Titan Embed v2 (768-dim) matching stored embeddings, enabling semantic search via match_conversation_chunks RPC for Bedrock fallback path**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-11T17:36:28Z
- **Completed:** 2026-02-11T17:41:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fixed dimension mismatch: queries now use 768-dim Titan Embed v2 (not 1024-dim Cohere v3)
- Removed broken layered search calling non-existent match_conversation_chunks_layered RPC
- Simplified getMemoryContext to top-K semantic search via working match_conversation_chunks RPC
- Bedrock fallback path now gets functional memory retrieval (vectors match storage)

## Task Commits

Each task was committed atomically:

1. **Task 1: Switch embedQuery from Cohere v3 to Titan Embed v2 (768-dim)** - `b2dce44` (feat)
2. **Task 2: Simplify getMemoryContext to use match_conversation_chunks RPC** - `85e0012` (feat)

**Note:** Task 2 changes were included in commit 85e0012 which also contained 03-01 plan execution.

## Files Created/Modified

- `lib/memory/query.ts` - embedQuery() now uses Titan Embed v2 (768-dim), searchChunksSemantic() replaces searchMemoryLayered(), getMemoryContext() simplified to top-K search
- `app/api/memory/query/route.ts` - Updated to use getMemoryContext, returns method field for observability

## Decisions Made

**1. 768 dimensions for query embeddings**
- Rationale: Must match stored embeddings from Phase 2 (Titan Embed v2 generates 768-dim)
- Impact: Fixes dimension mismatch that would cause all similarity searches to fail

**2. Remove layered search (Macro/Thematic/Micro)**
- Rationale: match_conversation_chunks_layered RPC doesn't exist, layer_index column doesn't exist
- Impact: Simplified to top-K cosine similarity across all chunks, no layer filtering complexity

**3. Use getSupabaseAdmin() for RPC calls**
- Rationale: match_conversation_chunks RPC needs service role key to bypass RLS and access user's chunks
- Impact: Ensures RPC can read conversation_chunks regardless of auth context

**4. Sequential embedding calls (no batching)**
- Rationale: Titan Embed v2 has no batch API (unlike Cohere v3's 96-text batches)
- Impact: embedBatch() simplified to loop calling embedQuery() sequentially

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing method field in API response**
- **Found during:** Task 2 (verifying build after getMemoryContext changes)
- **Issue:** app/api/memory/query/route.ts referenced undefined `chunks` variable instead of `memoryResult.chunks`
- **Fix:** Changed `chunks` to `memoryResult.chunks` in logging and response, added `method` field to response
- **Files modified:** app/api/memory/query/route.ts
- **Verification:** Build succeeds, TypeScript errors resolved
- **Committed in:** 85e0012 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix corrected TypeScript error preventing build. No scope creep.

## Issues Encountered

None - plan executed smoothly once linter auto-fixed the API route bug.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready:**
- Query embeddings match storage embeddings (768-dim Titan Embed v2)
- Semantic search functional via match_conversation_chunks RPC
- Bedrock fallback path has working memory retrieval
- Keyword search fallback preserved

**Next steps:**
- Phase 03 Plan 03: Wire memory into chat responses (both RLM and Bedrock paths)
- Verify semantic search quality with real user queries
- Monitor memory retrieval method distribution (semantic vs keyword vs none)

---
*Phase: 03-memory-in-chat*
*Completed: 2026-02-11*

## Self-Check: PASSED

**Files verified:**
- FOUND: /home/drewpullen/clawd/soulprint-landing/lib/memory/query.ts
- FOUND: /home/drewpullen/clawd/soulprint-landing/app/api/memory/query/route.ts

**Commits verified:**
- FOUND: b2dce44 (Task 1: Titan Embed v2)
- FOUND: 85e0012 (Task 2: Simplified semantic search)

**Build verification:**
- Build succeeds with no TypeScript errors
- titan-embed-text-v2 found in embedQuery
- cohere.embed-english-v3 NOT found (confirmed removal)
- dimensions: 768 found (correct vector size)
- searchChunksSemantic exists (new function)
- match_conversation_chunks_layered NOT found (confirmed removal)
- getSupabaseAdmin used for RPC calls (service role access)

All verification criteria met.
