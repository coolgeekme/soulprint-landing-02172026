-- Create chat_messages table for storing conversation history
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,  -- email-based user_id to match api_keys and soulprints tables
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies using email from auth.jwt()
CREATE POLICY "Users can view their own chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.email() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.email() = user_id);

CREATE POLICY "Users can delete their own chat messages"
  ON public.chat_messages FOR DELETE
  USING (auth.email() = user_id);

-- Allow service role full access (for API)
CREATE POLICY "Service role has full access to chat_messages"
  ON public.chat_messages FOR ALL
  USING (auth.role() = 'service_role');
