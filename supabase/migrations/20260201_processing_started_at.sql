-- Add processing_started_at column for stuck import detection
-- Tracks when processing started so we can detect imports that take too long

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.processing_started_at IS 'When import processing started (for stuck detection)';

-- Index for finding stuck imports (processing for >20 minutes)
CREATE INDEX IF NOT EXISTS idx_user_profiles_processing_started
ON public.user_profiles(processing_started_at)
WHERE import_status = 'processing';
