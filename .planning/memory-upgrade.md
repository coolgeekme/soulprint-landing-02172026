# Memory System Upgrade Plan

## Goal
Replace traditional RAG with RLM for intelligent memory retrieval, and use Defy-style DNA as the base personality.

## Current Architecture

### Chat Flow (as of 2026-01-26)
```
1. User sends message
2. API validates auth + API key
3. SoulEngine.constructSystemPrompt():
   a. Load base DNA (SOULPRINT_CORE_DNA_PROMPT)
   b. Add user's SoulPrint personalization
   c. Call retrieveUnifiedContext() for memory (current RAG)
   d. Inject memories into prompt
4. Stream response from Bedrock
5. Save to chat_logs with embeddings
```

### Current Memory Retrieval (RAG)
```
retrieveUnifiedContext():
  1. Generate embedding for query
  2. Vector search: match_chat_logs (native)
  3. Vector search: match_imported_chats (imported GPT history)
  4. Combine results, sort by similarity
  5. Return top K as MemoryResult[]
```

### Files Involved
- `/lib/soulprint/generator.ts` - SOULPRINT_CORE_DNA_PROMPT, constructDynamicSystemPrompt()
- `/lib/soulprint/soul-engine.ts` - SoulEngine class, orchestrates everything
- `/lib/soulprint/memory/retrieval.ts` - retrieveUnifiedContext(), RAG logic
- `/app/api/llm/chat/route.ts` - Main chat API endpoint

---

## Upgrade Plan

### Phase 1: Defy DNA (Base Personality)
**Goal:** Add Defy-style DNA as an option, toggleable via config.

**Changes:**
- [x] Create `/lib/soulprint/defy-core-dna.ts`
- [ ] Add `DNA_STYLE` env var or config option
- [ ] Modify `constructDynamicSystemPrompt()` to use selected DNA
- [ ] Test with both DNA styles
- [ ] Commit

### Phase 2: RLM Service Setup
**Goal:** Get RLM memory service running and accessible.

**Changes:**
- [x] Clone RLM repo to `/lib/rlm-core`
- [x] Create `/services/rlm-memory/` FastAPI service
- [x] Create `/lib/rlm/client.ts` TypeScript client
- [ ] Test RLM service standalone
- [ ] Commit

### Phase 3: RLM Integration (with Fallback)
**Goal:** Wire RLM into chat flow, with graceful fallback to RAG.

**Changes:**
- [ ] Add `USE_RLM_MEMORY` env var
- [ ] Create `retrieveContextRLM()` in retrieval.ts
- [ ] Modify SoulEngine to try RLM first, fallback to RAG
- [ ] Add proper error handling
- [ ] Test both paths
- [ ] Commit

### Phase 4: History → SoulPrint Extraction
**Goal:** Use RLM to analyze imported GPT history and build SoulPrint.

**Changes:**
- [ ] Create RLM prompt for personality extraction
- [ ] Add `/api/import/analyze-rlm` endpoint
- [ ] Wire into import flow
- [ ] Test with real GPT export
- [ ] Commit

---

## Rollback Plan
Each phase is behind a feature flag:
- `DNA_STYLE=defy|classic` (default: classic)
- `USE_RLM_MEMORY=true|false` (default: false)
- `USE_RLM_IMPORT=true|false` (default: false)

If anything breaks, flip the flag back.

---

## Testing Checklist
- [ ] Chat works with classic DNA + RAG (baseline)
- [ ] Chat works with Defy DNA + RAG
- [ ] RLM service starts and responds to /health
- [ ] RLM service returns valid memory results
- [ ] Chat works with Defy DNA + RLM
- [ ] Fallback to RAG when RLM is down
- [ ] GPT import → RLM analysis → SoulPrint generation

---

## Status
- **Phase 1:** In Progress
- **Phase 2:** Files created, not tested
- **Phase 3:** Not started
- **Phase 4:** Not started
