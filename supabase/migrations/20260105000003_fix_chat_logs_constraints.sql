-- Fix Chat Logs Session ID Constraint
-- The previous schema had session_id as NOT NULL, but the code doesn't always provide it.
-- This migration makes it NULLABLE to prevent insertion errors.

DO $$ 
BEGIN 
    -- 1. Make session_id nullable in chat_logs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_logs' AND column_name = 'session_id') THEN 
        ALTER TABLE public.chat_logs ALTER COLUMN session_id DROP NOT NULL; 
    END IF;

    -- 2. Add an index for faster history retrieval
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_logs_user_id') THEN
        CREATE INDEX idx_chat_logs_user_id ON public.chat_logs(user_id);
    END IF;

    -- 3. Ensure we have a default session_id if needed in the future (optional)
    -- For now, just dropping NOT NULL is the safest fix for robustness.

END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
