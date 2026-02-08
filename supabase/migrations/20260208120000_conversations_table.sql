-- Create conversations table for multi-conversation support
-- Purpose: Enable users to organize chat messages into separate conversations
-- This is Phase 8 migration 1 of 3 - creates the parent table before adding FK references

-- ============================================
-- 1. CREATE CONVERSATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Chat History',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. INDEXES
-- ============================================

-- Composite index for fast user lookups ordered by recency
CREATE INDEX IF NOT EXISTS idx_conversations_user_created
ON public.conversations(user_id, created_at DESC);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations (e.g., rename title)
CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access (for API routes)
CREATE POLICY "Service role full access to conversations"
  ON public.conversations FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================

-- Reuse the update_updated_at function (defined in 20260205_soulprint_tables.sql)
-- Create or replace to ensure it exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on conversation updates
CREATE TRIGGER conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
