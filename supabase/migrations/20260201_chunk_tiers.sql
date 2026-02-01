-- Add chunk_tier column for multi-tier chunking
-- micro (200 chars) - precise facts, names, dates
-- medium (2000 chars) - conversation context
-- macro (5000 chars) - themes, relationships

ALTER TABLE public.conversation_chunks
ADD COLUMN IF NOT EXISTS chunk_tier TEXT DEFAULT 'medium';

-- Index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_conversation_chunks_tier
ON public.conversation_chunks(user_id, chunk_tier);

COMMENT ON COLUMN public.conversation_chunks.chunk_tier IS 'Chunk size tier: micro (200), medium (2000), macro (5000)';

-- Function for tier-aware vector search
CREATE OR REPLACE FUNCTION match_conversation_chunks_by_tier(
  query_embedding vector(768),
  match_user_id uuid,
  match_tier text,
  match_count int DEFAULT 10,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  conversation_id text,
  title text,
  content text,
  chunk_tier text,
  message_count int,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.user_id,
    cc.conversation_id,
    cc.title,
    cc.content,
    cc.chunk_tier,
    cc.message_count,
    cc.created_at,
    1 - (cc.embedding <=> query_embedding) as similarity
  FROM conversation_chunks cc
  WHERE cc.user_id = match_user_id
    AND cc.chunk_tier = match_tier
    AND cc.embedding IS NOT NULL
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
