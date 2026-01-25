-- Memory Syntheses Table (RLM Cache)
-- Caches the results of recursive LLM memory exploration
-- 24-hour TTL to balance freshness vs cost

CREATE TABLE IF NOT EXISTS public.memory_syntheses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Cache key: hash of the exploration query
    query_hash TEXT NOT NULL,

    -- The synthesized context (2K token max)
    synthesis TEXT NOT NULL,

    -- Metadata about the exploration
    sources TEXT[],              -- Timestamps/IDs of source messages used
    depth_reached INTEGER,       -- How many levels RLM explored (1-7)
    tokens_used INTEGER,         -- For cost tracking

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- Fast lookup by user + query hash
CREATE INDEX IF NOT EXISTS idx_memory_syntheses_lookup
    ON memory_syntheses(user_id, query_hash);

-- For cleanup job to delete expired entries
CREATE INDEX IF NOT EXISTS idx_memory_syntheses_expires
    ON memory_syntheses(expires_at);

-- RLS
ALTER TABLE public.memory_syntheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own syntheses"
    ON public.memory_syntheses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access syntheses"
    ON public.memory_syntheses FOR ALL
    USING (auth.role() = 'service_role');

-- Unified History Function
-- Returns ALL user history (native chat_logs + imported_chats) for RLM exploration
CREATE OR REPLACE FUNCTION get_full_chat_history(
    p_user_id UUID,
    p_limit INT DEFAULT 1000
)
RETURNS TABLE(
    source TEXT,
    role TEXT,
    content TEXT,
    created_at TIMESTAMPTZ
) AS $$
    -- Native SoulPrint chats
    SELECT
        'native'::TEXT AS source,
        chat_logs.role,
        chat_logs.content,
        chat_logs.created_at
    FROM chat_logs
    WHERE chat_logs.user_id = p_user_id

    UNION ALL

    -- Imported chats (GPT, Claude, etc.)
    SELECT
        imported_chats.source,
        imported_chats.role,
        imported_chats.content,
        COALESCE(imported_chats.original_timestamp, imported_chats.imported_at) AS created_at
    FROM imported_chats
    WHERE imported_chats.user_id = p_user_id

    ORDER BY created_at DESC
    LIMIT p_limit;
$$ LANGUAGE sql;

-- Get user's total message count across all sources
CREATE OR REPLACE FUNCTION get_user_message_stats(p_user_id UUID)
RETURNS TABLE(
    native_count BIGINT,
    imported_count BIGINT,
    total_count BIGINT
) AS $$
    SELECT
        (SELECT COUNT(*) FROM chat_logs WHERE user_id = p_user_id) AS native_count,
        (SELECT COUNT(*) FROM imported_chats WHERE user_id = p_user_id) AS imported_count,
        (SELECT COUNT(*) FROM chat_logs WHERE user_id = p_user_id) +
        (SELECT COUNT(*) FROM imported_chats WHERE user_id = p_user_id) AS total_count;
$$ LANGUAGE sql;

-- Cleanup function for expired syntheses (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_syntheses()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM memory_syntheses
    WHERE expires_at < now();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
