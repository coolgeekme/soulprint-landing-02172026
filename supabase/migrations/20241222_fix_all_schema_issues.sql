-- 1. Fix api_keys table (Add missing label column)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'label') THEN 
        ALTER TABLE public.api_keys ADD COLUMN label TEXT; 
    END IF; 
END $$;

-- 2. Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,  -- email-based user_id to match api_keys and soulprints tables
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(user_id, created_at DESC);

-- Enable RLS for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.chat_messages;

-- Re-create RLS policies for chat_messages
CREATE POLICY "Users can view their own chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.email() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.email() = user_id);

CREATE POLICY "Users can delete their own chat messages"
  ON public.chat_messages FOR DELETE
  USING (auth.email() = user_id);

-- 3. Fix soulprints table (Add unique constraint on user_id)
-- First, remove duplicates if any exist (keeping the most recent one)
DELETE FROM public.soulprints a USING (
      SELECT MIN(ctid) as ctid, user_id
      FROM public.soulprints 
      GROUP BY user_id HAVING COUNT(*) > 1
      ) b
      WHERE a.user_id = b.user_id 
      AND a.ctid <> b.ctid;

-- Then add the unique constraint
ALTER TABLE public.soulprints DROP CONSTRAINT IF EXISTS soulprints_user_id_key;
ALTER TABLE public.soulprints ADD CONSTRAINT soulprints_user_id_key UNIQUE (user_id);

-- 4. Refresh schema cache
NOTIFY pgrst, 'reload config';
