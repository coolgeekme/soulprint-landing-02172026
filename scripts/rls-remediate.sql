-- RLS Remediation Script for SoulPrint
-- Run in Supabase SQL Editor to enable RLS and create policies
-- This script is IDEMPOTENT - safe to run multiple times

-- ============================================
-- user_profiles
-- ============================================
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own profile (for first-time setup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- conversation_chunks
-- ============================================
ALTER TABLE IF EXISTS public.conversation_chunks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversation_chunks' AND policyname = 'Users can view own chunks'
  ) THEN
    CREATE POLICY "Users can view own chunks"
    ON public.conversation_chunks
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversation_chunks' AND policyname = 'Users can insert own chunks'
  ) THEN
    CREATE POLICY "Users can insert own chunks"
    ON public.conversation_chunks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'conversation_chunks' AND policyname = 'Users can delete own chunks'
  ) THEN
    CREATE POLICY "Users can delete own chunks"
    ON public.conversation_chunks
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- chat_messages
-- ============================================
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_messages' AND policyname = 'Users can view own messages'
  ) THEN
    CREATE POLICY "Users can view own messages"
    ON public.chat_messages
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_messages' AND policyname = 'Users can insert own messages'
  ) THEN
    CREATE POLICY "Users can insert own messages"
    ON public.chat_messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- 1. Service role key BYPASSES RLS. API routes using createAdminClient
--    with SUPABASE_SERVICE_ROLE_KEY will still work for server-side operations.
-- 2. Do NOT use auth.jwt()->>'user_metadata' in RLS policies (can be spoofed).
--    Always use auth.uid() which is cryptographically verified.
-- 3. After running, re-run scripts/rls-audit.sql to verify all tables are protected.
-- 4. Index columns used in RLS policies for performance:
--    These tables should already have indexes on user_id.
