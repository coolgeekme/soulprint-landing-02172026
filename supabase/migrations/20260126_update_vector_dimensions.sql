-- Update vector dimensions to 1024 for Titan V2 compatibility
-- Titan V2 supports: 256, 384, 512, 1024 dimensions
-- Using 1024 for best quality balance

-- 1. Drop existing RPC functions that use old dimensions
DROP FUNCTION IF EXISTS public.match_imported_chats(vector(768), float, int, uuid);
DROP FUNCTION IF EXISTS public.match_chat_logs(vector(768), float, int, uuid);

-- 2. Update imported_chats embedding column to 1024 dimensions
-- First, null out existing embeddings (they were wrong dimension anyway)
UPDATE public.imported_chats SET embedding = NULL;

-- Alter column type
ALTER TABLE public.imported_chats
ALTER COLUMN embedding TYPE vector(1024);

-- 3. Update chat_logs embedding column to 1024 dimensions
UPDATE public.chat_logs SET embedding = NULL WHERE embedding IS NOT NULL;

ALTER TABLE public.chat_logs
ALTER COLUMN embedding TYPE vector(1024);

-- 4. Recreate match_imported_chats function with 1024 dimensions
CREATE OR REPLACE FUNCTION public.match_imported_chats(
    query_embedding vector(1024),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    match_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    source text,
    role text,
    conversation_title text,
    original_timestamp timestamptz,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ic.id,
        ic.content,
        ic.source,
        ic.role,
        ic.conversation_title,
        ic.original_timestamp,
        1 - (ic.embedding <=> query_embedding) as similarity
    FROM public.imported_chats ic
    WHERE ic.user_id = match_user_id
      AND ic.embedding IS NOT NULL
      AND 1 - (ic.embedding <=> query_embedding) > match_threshold
    ORDER BY ic.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5. Recreate match_chat_logs function with 1024 dimensions
CREATE OR REPLACE FUNCTION public.match_chat_logs(
    query_embedding vector(1024),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    match_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    role text,
    created_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cl.id,
        cl.content,
        cl.role,
        cl.created_at,
        1 - (cl.embedding <=> query_embedding) as similarity
    FROM public.chat_logs cl
    WHERE cl.user_id = match_user_id
      AND cl.embedding IS NOT NULL
      AND 1 - (cl.embedding <=> query_embedding) > match_threshold
    ORDER BY cl.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.match_imported_chats(vector(1024), float, int, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_chat_logs(vector(1024), float, int, uuid) TO authenticated;
