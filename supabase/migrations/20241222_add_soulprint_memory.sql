-- Create table for SoulPrint Memory (Letta-style)
CREATE TABLE IF NOT EXISTS soulprint_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    core_memory JSONB DEFAULT '{"persona": "", "human": ""}'::jsonb, -- Stores 'persona' and 'human' blocks
    archival_memory TEXT DEFAULT '', -- Stores summary of past conversations
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE soulprint_memory ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own memory
CREATE POLICY "Users can view own memory" 
ON soulprint_memory FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can update their own memory
CREATE POLICY "Users can update own memory" 
ON soulprint_memory FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own memory
CREATE POLICY "Users can insert own memory" 
ON soulprint_memory FOR INSERT 
WITH CHECK (auth.uid() = user_id);
