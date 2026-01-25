# Recursive Memory System - Implementation Plan

## Current State vs Target State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT SYSTEM (Replace)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Message                                                              │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────┐     ┌───────────────┐     ┌─────────────┐                │
│   │  Generate   │────▶│ Vector Search │────▶│  Top 5 Hits │                │
│   │  Embedding  │     │  (Supabase)   │     │  (Limited)  │                │
│   └─────────────┘     └───────────────┘     └──────┬──────┘                │
│                                                     │                       │
│                                                     ▼                       │
│                                            ┌───────────────┐                │
│                                            │ Inject to L3  │                │
│                                            │ (Raw Messages)│                │
│                                            └───────┬───────┘                │
│                                                    │                        │
│                                                    ▼                        │
│                                            ┌───────────────┐                │
│                                            │   Companion   │                │
│                                            │   Responds    │                │
│                                            └───────────────┘                │
│                                                                             │
│   PROBLEMS: Misses context, no synthesis, keyword-only, no arcs            │
└─────────────────────────────────────────────────────────────────────────────┘

                                    │
                                    │ REPLACE WITH
                                    ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│                           TARGET SYSTEM (RLM)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Message                                                              │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────┐              │
│   │                    SOUL ENGINE (Next.js)                 │              │
│   │  ┌─────────────┐                                        │              │
│   │  │ Pull FULL   │◀──── Supabase: chat_logs               │              │
│   │  │ History     │◀──── Supabase: imported_chats (NEW)    │              │
│   │  │ (500+ msgs) │                                        │              │
│   │  └──────┬──────┘                                        │              │
│   └─────────┼───────────────────────────────────────────────┘              │
│             │                                                               │
│             ▼                                                               │
│   ┌─────────────────────────────────────────────────────────┐              │
│   │           PYTHON MICROSERVICE (FastAPI)                  │              │
│   │  ┌─────────────────────────────────────────────────┐    │              │
│   │  │              recursive-llm Engine                │    │              │
│   │  │                                                  │    │              │
│   │  │   Level 1: Scan overview                        │    │              │
│   │  │      │                                          │    │              │
│   │  │      ▼                                          │    │              │
│   │  │   Level 2: Identify relevant chunks             │    │              │
│   │  │      │                                          │    │              │
│   │  │      ▼                                          │    │              │
│   │  │   Level 3: Deep dive into specifics             │    │              │
│   │  │      │                                          │    │              │
│   │  │      ▼                                          │    │              │
│   │  │   Level 4: Cross-reference patterns             │    │              │
│   │  │      │                                          │    │              │
│   │  │      ▼                                          │    │              │
│   │  │   Level 5: Synthesize understanding             │    │              │
│   │  │                                                  │    │              │
│   │  └─────────────────────────────────────────────────┘    │              │
│   │                         │                                │              │
│   │                         │ Uses Claude Sonnet on Bedrock  │              │
│   └─────────────────────────┼────────────────────────────────┘              │
│                             │                                               │
│                             ▼                                               │
│                    ┌────────────────┐                                       │
│                    │   SYNTHESIS    │                                       │
│                    │ "User dealing  │                                       │
│                    │  with custody  │                                       │
│                    │  since March,  │                                       │
│                    │  feeling more  │                                       │
│                    │  resolved..."  │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                    ┌────────────────┐                                       │
│                    │ Cache Synthesis│───▶ memory_syntheses table            │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                    ┌────────────────┐                                       │
│                    │  Inject to L3  │                                       │
│                    │ (Rich Context) │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                    ┌────────────────┐                                       │
│                    │   Companion    │───▶ Genuine Understanding             │
│                    │   Responds     │                                       │
│                    └────────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMPLEMENTATION PHASES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: DATABASE SETUP                                                    │
│  ══════════════════════                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ get_full_chat_   │  │ memory_syntheses │  │ imported_chats   │          │
│  │ history() func   │  │ table            │  │ table (GPT)      │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 ▼                                           │
│  PHASE 2: AWS BEDROCK SETUP                                                 │
│  ══════════════════════════                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Enable Claude    │  │ Enable Titan     │  │ IAM Role with    │          │
│  │ 3.5 Sonnet       │  │ Embeddings v2    │  │ InvokeModel      │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 ▼                                           │
│  PHASE 3: PYTHON MICROSERVICE                                               │
│  ════════════════════════════                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Clone            │  │ FastAPI wrapper  │  │ Docker + Deploy  │          │
│  │ ysz/recursive-llm│  │ /explore endpoint│  │ to ECS/Lambda    │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 ▼                                           │
│  PHASE 4: GPT HISTORY IMPORT (NEW FEATURE)                                  │
│  ═════════════════════════════════════════                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Upload UI for    │  │ Parser for       │  │ Bulk insert to   │          │
│  │ conversations.json│ │ ChatGPT format   │  │ imported_chats   │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 ▼                                           │
│  PHASE 5: SOUL ENGINE INTEGRATION                                           │
│  ════════════════════════════════                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ exploreMemoryRLM │  │ Update L3 system │  │ Fallback chain   │          │
│  │ function         │  │ prompt builder   │  │ implementation   │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 ▼                                           │
│  PHASE 6: TESTING & MONITORING                                              │
│  ═══════════════════════════════                                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Unit + E2E tests │  │ CloudWatch       │  │ Cost alerts      │          │
│  │                  │  │ dashboard        │  │ ($50/day)        │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## GPT History Injection Feature

### What It Does
Allows users to upload their ChatGPT conversation export (`conversations.json`) to instantly populate their memory with months/years of conversation history.

### ChatGPT Export Format
```json
[
  {
    "title": "Python Help",
    "create_time": 1704067200,
    "update_time": 1704153600,
    "mapping": {
      "uuid-1": {
        "message": {
          "author": { "role": "user" },
          "content": { "parts": ["How do I..."] },
          "create_time": 1704067200
        }
      },
      "uuid-2": {
        "message": {
          "author": { "role": "assistant" },
          "content": { "parts": ["Here's how..."] },
          "create_time": 1704067210
        }
      }
    }
  }
]
```

### User Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     GPT IMPORT USER FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User goes to ChatGPT settings                              │
│     │                                                          │
│     ▼                                                          │
│  2. Exports data (Settings > Data Controls > Export)           │
│     │                                                          │
│     ▼                                                          │
│  3. Downloads conversations.json                               │
│     │                                                          │
│     ▼                                                          │
│  4. Uploads to SoulPrint Dashboard                             │
│     │                                                          │
│     ▼                                                          │
│  5. Backend parses & imports                                   │
│     │                                                          │
│     │  ┌────────────────────────────────────┐                  │
│     │  │ Progress: Importing 2,847 messages │                  │
│     │  │ ████████████░░░░░░░░ 62%          │                  │
│     │  └────────────────────────────────────┘                  │
│     ▼                                                          │
│  6. Memory instantly populated                                 │
│     │                                                          │
│     ▼                                                          │
│  7. Companion now "knows" user from day 1                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema for All Chat Data

### Current: `chat_logs` (Native SoulPrint chats)
```sql
-- Already exists
CREATE TABLE public.chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### New: `imported_chats` (GPT & other imports)
```sql
CREATE TABLE public.imported_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('chatgpt', 'claude', 'other')),
    original_id TEXT,                    -- ID from source system
    conversation_title TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    embedding vector(768),               -- For vector search
    original_timestamp TIMESTAMPTZ,      -- When it happened in source
    imported_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB                       -- Any extra data from source
);

-- Indexes for performance
CREATE INDEX idx_imported_chats_user ON imported_chats(user_id);
CREATE INDEX idx_imported_chats_timestamp ON imported_chats(user_id, original_timestamp DESC);
CREATE INDEX idx_imported_chats_source ON imported_chats(source);

-- Vector index for semantic search
CREATE INDEX idx_imported_chats_embedding ON imported_chats
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### New: `memory_syntheses` (Cache for RLM results)
```sql
CREATE TABLE public.memory_syntheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query_hash TEXT NOT NULL,            -- Hash of the query for lookup
    synthesis TEXT NOT NULL,             -- The synthesized context
    sources TEXT[],                      -- Array of source timestamps/ids
    depth_reached INTEGER,               -- How deep RLM went
    tokens_used INTEGER,                 -- For cost tracking
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_memory_syntheses_lookup ON memory_syntheses(user_id, query_hash);
```

### Unified Query Function
```sql
-- Get ALL history (native + imported) for RLM exploration
CREATE OR REPLACE FUNCTION get_full_chat_history(
    p_user_id UUID,
    p_limit INT DEFAULT 500
)
RETURNS TABLE(
    source TEXT,
    role TEXT,
    content TEXT,
    created_at TIMESTAMPTZ
) AS $$
    -- Native SoulPrint chats
    SELECT
        'native'::TEXT as source,
        role,
        content,
        created_at
    FROM chat_logs
    WHERE user_id = p_user_id

    UNION ALL

    -- Imported chats (GPT, Claude, etc.)
    SELECT
        source,
        role,
        content,
        COALESCE(original_timestamp, imported_at) as created_at
    FROM imported_chats
    WHERE user_id = p_user_id

    ORDER BY created_at DESC
    LIMIT p_limit;
$$ LANGUAGE sql;
```

---

## Time to 1 Million Context Tokens

### Token Math

| Source | Avg Tokens/Message | Calculation |
|--------|-------------------|-------------|
| User message | ~50 tokens | Short inputs |
| Assistant response | ~150 tokens | Longer outputs |
| Combined exchange | ~200 tokens | Per round-trip |

### Scenarios

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TIME TO 1,000,000 TOKENS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO 1: Native Chat Only (No Import)                                  │
│  ─────────────────────────────────────────                                 │
│  • 200 tokens per exchange                                                 │
│  • 1,000,000 ÷ 200 = 5,000 exchanges needed                               │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ Messages/Day │ Days to 1M  │ Time           │ User Type   │            │
│  ├──────────────┼─────────────┼────────────────┼─────────────┤            │
│  │ 5            │ 1,000 days  │ 2.7 years      │ Casual      │            │
│  │ 10           │ 500 days    │ 1.4 years      │ Regular     │            │
│  │ 25           │ 200 days    │ 6.5 months     │ Active      │            │
│  │ 50           │ 100 days    │ 3.3 months     │ Power User  │            │
│  │ 100          │ 50 days     │ 7 weeks        │ Heavy User  │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                             │
│  SCENARIO 2: With GPT History Import ⚡ INSTANT BOOST                       │
│  ─────────────────────────────────────────────────────────────             │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ GPT Usage      │ Conversations │ Messages │ Tokens        │            │
│  ├────────────────┼───────────────┼──────────┼───────────────┤            │
│  │ Light (1 yr)   │ ~100          │ ~2,000   │ ~400K         │            │
│  │ Moderate (2 yr)│ ~500          │ ~10,000  │ ~2M ✓         │            │
│  │ Heavy (2+ yr)  │ ~2,000        │ ~50,000  │ ~10M ✓        │            │
│  │ Power User     │ ~5,000+       │ ~150,000 │ ~30M ✓        │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                             │
│  ⚡ A moderate GPT user hits 1M tokens INSTANTLY on import                 │
│                                                                             │
│  SCENARIO 3: Combined (Import + Native)                                    │
│  ──────────────────────────────────────                                    │
│                                                                             │
│  Import 500K tokens from GPT + chat 25 msgs/day                            │
│  → Remaining 500K ÷ (25 × 200) = 100 days                                  │
│  → Total: ~3 months to deep contextual understanding                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why GPT Import is Critical

```
Without Import:                    With Import:
────────────────                   ────────────────
Day 1: 0 tokens                    Day 1: 2,000,000 tokens ✓
       Companion knows nothing            Companion knows you

Week 1: 1,400 tokens              Week 1: 2,010,000 tokens
        Still learning                    Refining understanding

Month 1: 6,000 tokens             Month 1: 2,050,000 tokens
         Basic patterns                   Deep patterns + history

Month 3: 18,000 tokens            Month 3: 2,150,000 tokens
         Getting somewhere               Years of context synthesized
```

---

## Implementation Priority Order

```
┌─────┬─────────────────────────────────┬──────────────────────────────────┐
│  #  │ Task                            │ Why This Order                   │
├─────┼─────────────────────────────────┼──────────────────────────────────┤
│  1  │ Database migrations             │ Foundation for everything else   │
│     │ • imported_chats table          │                                  │
│     │ • memory_syntheses table        │                                  │
│     │ • get_full_chat_history()       │                                  │
├─────┼─────────────────────────────────┼──────────────────────────────────┤
│  2  │ GPT Import Feature              │ Instant value for users          │
│     │ • Upload UI component           │ Gets them to 1M tokens fast      │
│     │ • Parser for conversations.json │                                  │
│     │ • Bulk insert with embeddings   │                                  │
├─────┼─────────────────────────────────┼──────────────────────────────────┤
│  3  │ AWS Bedrock Setup               │ Required for RLM microservice    │
│     │ • Enable Claude Sonnet          │                                  │
│     │ • Enable Titan Embeddings       │                                  │
│     │ • IAM permissions               │                                  │
├─────┼─────────────────────────────────┼──────────────────────────────────┤
│  4  │ Python Microservice             │ The brain of RLM                 │
│     │ • Clone recursive-llm           │                                  │
│     │ • FastAPI /explore endpoint     │                                  │
│     │ • Docker + deploy               │                                  │
├─────┼─────────────────────────────────┼──────────────────────────────────┤
│  5  │ Soul Engine Integration         │ Wire it all together             │
│     │ • exploreMemoryRLM()            │                                  │
│     │ • Update prompt builder         │                                  │
│     │ • Fallback chain                │                                  │
├─────┼─────────────────────────────────┼──────────────────────────────────┤
│  6  │ Testing & Monitoring            │ Ensure quality + cost control    │
│     │ • E2E tests                     │                                  │
│     │ • CloudWatch dashboard          │                                  │
│     │ • Cost alerts                   │                                  │
└─────┴─────────────────────────────────┴──────────────────────────────────┘
```

---

## Files to Create/Modify

### New Files
- `supabase/migrations/20260125_add_imported_chats.sql`
- `supabase/migrations/20260125_add_memory_syntheses.sql`
- `lib/soulprint/memory/rlm-client.ts` - RLM microservice client
- `lib/soulprint/import/gpt-parser.ts` - ChatGPT JSON parser
- `app/api/import/gpt/route.ts` - Upload endpoint
- `app/dashboard/import/page.tsx` - Import UI
- `components/dashboard/gpt-import-wizard.tsx` - Upload wizard

### Modified Files
- `lib/soulprint/memory/retrieval.ts` - Add RLM exploration
- `lib/soulprint/soul-engine.ts` - Use unified history
- `app/dashboard/chat/chat-client.tsx` - Show import prompt for new users

---

## Fallback Strategy

```
┌───────────────────────────────────────────────────────────────┐
│                    FALLBACK CHAIN                             │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  TRY: RLM Exploration                                        │
│       │                                                       │
│       ├─── SUCCESS ──▶ Return synthesis                      │
│       │                                                       │
│       └─── FAIL (timeout/error)                              │
│            │                                                  │
│            ▼                                                  │
│  TRY: Cached Synthesis (memory_syntheses)                    │
│       │                                                       │
│       ├─── HIT ──▶ Return cached synthesis                   │
│       │                                                       │
│       └─── MISS                                              │
│            │                                                  │
│            ▼                                                  │
│  TRY: Vector Search (current system)                         │
│       │                                                       │
│       ├─── SUCCESS ──▶ Return top 5 matches                  │
│       │                                                       │
│       └─── FAIL                                              │
│            │                                                  │
│            ▼                                                  │
│  FINAL: Respond with L1 + L2 only (no memory)                │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Cost Estimate

| Scenario | Users | Messages/Day | Monthly Cost |
|----------|-------|--------------|--------------|
| Launch | 40 | 400 | ~$650 |
| Growth | 100 | 1,000 | ~$1,600 |
| Scale | 500 | 5,000 | ~$8,000 |

Zero usage = $0 (Bedrock is pay-per-token)
