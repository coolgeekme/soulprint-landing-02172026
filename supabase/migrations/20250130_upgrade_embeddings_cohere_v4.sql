-- Upgrade embeddings for Cohere Embed v4 on AWS Bedrock
-- 1536 dimensions, enterprise-grade accuracy, 128K context

-- Drop existing indexes and functions
DROP INDEX IF EXISTS idx_conversation_chunks_embedding;
DROP INDEX IF EXISTS idx_learned_facts_embedding;
DROP FUNCTION IF EXISTS match_conversation_chunks(vector, uuid, int, float);
DROP FUNCTION IF EXISTS match_learned_facts(vector, uuid, int, float);

-- Ensure columns are 1536 dimensions for Cohere v4
ALTER TABLE public.conversation_chunks 
ALTER COLUMN embedding TYPE vector(1536);

ALTER TABLE public.learned_facts 
ALTER COLUMN embedding TYPE vector(1536);

-- Recreate indexes
CREATE INDEX idx_conversation_chunks_embedding 
ON public.conversation_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_learned_facts_embedding 
ON public.learned_facts 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Vector similarity search for conversation_chunks
CREATE OR REPLACE FUNCTION match_conversation_chunks(
  query_embedding vector(1536),
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

-- Vector similarity search for learned_facts
CREATE OR REPLACE FUNCTION match_learned_facts(
  query_embedding vector(1536),
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

-- Reset embedding status for re-generation
UPDATE public.user_profiles SET embedding_status = 'pending' WHERE embedding_status = 'complete';

COMMENT ON COLUMN public.conversation_chunks.embedding IS 'Cohere Embed v4 on Bedrock (1536 dims) - enterprise accuracy, 128K context';
COMMENT ON COLUMN public.learned_facts.embedding IS 'Cohere Embed v4 on Bedrock (1536 dims) - enterprise accuracy, 128K context';
