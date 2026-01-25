-- GPT/Claude History Import Tables
-- Allows users to upload their ChatGPT/Claude conversation exports
-- for instant deep memory without waiting months of native chat

-- Table: imported_chats
-- Stores individual messages from imported conversation histories
CREATE TABLE IF NOT EXISTS public.imported_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Source tracking
    source TEXT NOT NULL CHECK (source IN ('chatgpt', 'claude', 'other')),
    original_id TEXT,                    -- ID from the source system
    conversation_title TEXT,             -- Title of the conversation in GPT/Claude

    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,

    -- Vector embedding for semantic search (768 dim to match local Titan embeddings)
    embedding vector(768),

    -- Timestamps
    original_timestamp TIMESTAMPTZ,      -- When it happened in GPT/Claude
    imported_at TIMESTAMPTZ DEFAULT now(),

    -- Flexible metadata storage
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_imported_chats_user
    ON imported_chats(user_id);

CREATE INDEX IF NOT EXISTS idx_imported_chats_timestamp
    ON imported_chats(user_id, original_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_imported_chats_source
    ON imported_chats(source);

-- Vector similarity search index (IVFFlat for cosine similarity)
CREATE INDEX IF NOT EXISTS idx_imported_chats_embedding
    ON imported_chats USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Row Level Security
ALTER TABLE public.imported_chats ENABLE ROW LEVEL SECURITY;

-- Users can only view their own imported chats
CREATE POLICY "Users view own imports"
    ON public.imported_chats FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own imports
CREATE POLICY "Users insert own imports"
    ON public.imported_chats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own imports
CREATE POLICY "Users delete own imports"
    ON public.imported_chats FOR DELETE
    USING (auth.uid() = user_id);

-- Service role has full access (for background jobs)
CREATE POLICY "Service role full access imports"
    ON public.imported_chats FOR ALL
    USING (auth.role() = 'service_role');

-- RPC: Search imported chats by vector similarity
CREATE OR REPLACE FUNCTION match_imported_chats(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    match_user_id uuid
)
RETURNS TABLE (
    id uuid,
    content text,
    source text,
    conversation_title text,
    original_timestamp timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        imported_chats.id,
        imported_chats.content,
        imported_chats.source,
        imported_chats.conversation_title,
        imported_chats.original_timestamp,
        1 - (imported_chats.embedding <=> query_embedding) AS similarity
    FROM imported_chats
    WHERE 1 - (imported_chats.embedding <=> query_embedding) > match_threshold
    AND imported_chats.user_id = match_user_id
    ORDER BY imported_chats.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Track import jobs for progress reporting
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_messages INT DEFAULT 0,
    processed_messages INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- RLS for import_jobs
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own import jobs"
    ON public.import_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own import jobs"
    ON public.import_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own import jobs"
    ON public.import_jobs FOR UPDATE
    USING (auth.uid() = user_id);
