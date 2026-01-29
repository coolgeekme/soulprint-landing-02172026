-- Add embedding status tracking to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS embedding_progress INTEGER DEFAULT 0;

-- Index for finding users with pending embeddings
CREATE INDEX IF NOT EXISTS idx_user_profiles_embedding_status 
ON public.user_profiles(embedding_status) 
WHERE embedding_status IN ('pending', 'processing');

COMMENT ON COLUMN public.user_profiles.embedding_status IS 'Status: pending, processing, complete, error';
COMMENT ON COLUMN public.user_profiles.embedding_progress IS 'Percentage of chunks embedded (0-100)';
