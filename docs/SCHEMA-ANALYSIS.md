# SoulPrint Schema Analysis
*Generated 2026-01-29*

## Status: Schema is Complete ✅

All required columns exist in migrations. Issue was migrations not applied to production.

## Migrations to Apply

Run in Supabase SQL Editor:

```sql
-- 1. user_profiles columns
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS soulprint_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS embedding_progress INTEGER DEFAULT 0;

-- 2. conversation_chunks embedding column + index
ALTER TABLE public.conversation_chunks 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_conversation_chunks_embedding 
ON public.conversation_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 3. Vector search RPC
CREATE OR REPLACE FUNCTION match_conversation_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid, title text, content text,
  created_at timestamptz, similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT cc.id, cc.title, cc.content, cc.created_at,
    1 - (cc.embedding <=> query_embedding) as similarity
  FROM public.conversation_chunks cc
  WHERE cc.user_id = match_user_id
    AND cc.embedding IS NOT NULL
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 4. learned_facts table
CREATE TABLE IF NOT EXISTS public.learned_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact text NOT NULL,
  category text NOT NULL CHECK (category IN ('preferences', 'relationships', 'milestones', 'beliefs', 'decisions', 'events')),
  confidence float DEFAULT 0.8,
  source_type text DEFAULT 'chat',
  embedding vector(1536),
  status text DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'archived')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learned_facts_user_id ON public.learned_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_learned_facts_embedding 
ON public.learned_facts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.learned_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.learned_facts FOR ALL USING (auth.role() = 'service_role');

-- 5. Learned facts search RPC
CREATE OR REPLACE FUNCTION match_learned_facts(
  query_embedding vector(1536), match_user_id uuid,
  match_count int DEFAULT 5, match_threshold float DEFAULT 0.5
) RETURNS TABLE (id uuid, fact text, category text, confidence float, created_at timestamptz, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT lf.id, lf.fact, lf.category, lf.confidence, lf.created_at,
    1 - (lf.embedding <=> query_embedding) as similarity
  FROM public.learned_facts lf
  WHERE lf.user_id = match_user_id AND lf.status = 'active' AND lf.embedding IS NOT NULL
    AND 1 - (lf.embedding <=> query_embedding) > match_threshold
  ORDER BY lf.embedding <=> query_embedding LIMIT match_count;
$$;
```

## Minor Code Fixes (P1)

### 1. Set locked_at when locking
In `app/api/embeddings/process/route.ts`:
```typescript
await supabase.from('user_profiles').update({
  soulprint_locked: true,
  locked_at: new Date().toISOString(), // ADD THIS
})
```

### 2. Race condition protection
Add 'importing' status to prevent cron from running while chunks are being written.

## Data Flow Summary

1. **Import**: Browser parses ZIP → POST /api/import/save-soulprint → conversation_chunks (no embeddings)
2. **Embedding**: Cron every 5min → OpenAI embeddings → UPDATE chunks
3. **Chat**: embed query → vector search chunks + facts → Claude response → extract new facts
4. **Synthesis**: Cron every 6hrs → update soulprint_text from learned_facts

## Dead Code (Can Remove)
- `lib/import/embedder.ts` (old Titan 1024-dim system)
- `app/api/import/process/route.ts`
- `app/api/import/upload/route.ts`
- `scripts/generate-embeddings.ts`
