-- Store raw conversation data for future re-chunking
-- This preserves the original import so we can adjust chunk sizes without re-upload

CREATE TABLE IF NOT EXISTS public.raw_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  title text,
  messages jsonb NOT NULL, -- Array of {role, content, timestamp}
  message_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL, -- Original conversation date
  imported_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, conversation_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_raw_conversations_user_id ON public.raw_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_conversations_created ON public.raw_conversations(user_id, created_at DESC);

-- RLS
ALTER TABLE public.raw_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.raw_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.raw_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.raw_conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.raw_conversations FOR ALL
  USING (auth.role() = 'service_role');
