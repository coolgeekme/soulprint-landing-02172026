-- Upgrade embeddings from 1536 to 3072 dimensions
-- Using text-embedding-3-large for higher accuracy pinpoint memory

-- First, drop existing indexes (they reference the old dimension)
DROP INDEX IF EXISTS idx_conversation_chunks_embedding;
DROP INDEX IF EXISTS idx_learned_facts_embedding;

-- Drop existing functions (they reference vector(1536))
DROP FUNCTION IF EXISTS match_conversation_chunks(vector(1536), uuid, int, float);
DROP FUNCTION IF EXISTS match_learned_facts(vector(1536), uuid, int, float);

-- Clear existing embeddings (need to regenerate with new model)
UPDATE public.conversation_chunks SET embedding = NULL;
UPDATE public.learned_facts SET embedding = NULL;

-- Alter columns to 3072 dimensions
ALTER TABLE public.conversation_chunks 
ALTER COLUMN embedding TYPE vector(3072);

ALTER TABLE public.learned_facts 
ALTER COLUMN embedding TYPE vector(3072);

-- Recreate indexes for 3072 dimensions
CREATE INDEX idx_conversation_chunks_embedding 
ON public.conversation_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_learned_facts_embedding 
ON public.learned_facts 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Recreate vector similarity search function for conversation_chunks
CREATE OR REPLACE FUNCTION match_conversation_chunks(
  query_embedding vector(3072),
  match_user_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    cc.id,
    cc.title,
    cc.content,
    cc.created_at,
    1 - (cc.embedding <=> query_embedding) as similarity
  FROM public.conversation_chunks cc
  WHERE cc.user_id = match_user_id
    AND cc.embedding IS NOT NULL
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Recreate vector similarity search function for learned_facts
CREATE OR REPLACE FUNCTION match_learned_facts(
  query_embedding vector(3072),
  match_user_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  fact text,
  category text,
  confidence float,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    lf.id,
    lf.fact,
    lf.category,
    lf.confidence,
    lf.created_at,
    1 - (lf.embedding <=> query_embedding) as similarity
  FROM public.learned_facts lf
  WHERE lf.user_id = match_user_id
    AND lf.status = 'active'
    AND lf.embedding IS NOT NULL
    AND 1 - (lf.embedding <=> query_embedding) > match_threshold
  ORDER BY lf.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Reset embedding status for all users (need to regenerate)
UPDATE public.user_profiles SET embedding_status = 'pending' WHERE embedding_status = 'complete';

COMMENT ON COLUMN public.conversation_chunks.embedding IS 'OpenAI text-embedding-3-large (3072 dims) for pinpoint memory';
COMMENT ON COLUMN public.learned_facts.embedding IS 'OpenAI text-embedding-3-large (3072 dims) for pinpoint memory';
