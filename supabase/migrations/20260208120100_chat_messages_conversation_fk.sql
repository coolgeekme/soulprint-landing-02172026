-- Add conversation_id foreign key to chat_messages table
-- Purpose: Link messages to conversations for multi-conversation support
-- This is Phase 8 migration 2 of 3 - adds nullable FK column with NOT VALID constraint

-- ============================================
-- 1. ADD CONVERSATION_ID COLUMN
-- ============================================

-- Add nullable conversation_id column to allow gradual backfill
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- ============================================
-- 2. ADD FOREIGN KEY CONSTRAINT
-- ============================================

-- Add FK constraint with NOT VALID for zero-downtime migration
-- NOT VALID means constraint is not checked against existing rows (all currently NULL)
-- This avoids a full table scan and long lock during constraint creation
ALTER TABLE public.chat_messages
ADD CONSTRAINT fk_chat_messages_conversation
FOREIGN KEY (conversation_id)
REFERENCES public.conversations(id)
ON DELETE CASCADE
NOT VALID;

-- Note: Constraint will be validated in migration 3 after backfill

-- ============================================
-- 3. INDEXES FOR QUERY PERFORMANCE
-- ============================================

-- Single-column index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
ON public.chat_messages(conversation_id);

-- Composite index for common query pattern (conversation messages ordered by time)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
ON public.chat_messages(conversation_id, created_at DESC);
