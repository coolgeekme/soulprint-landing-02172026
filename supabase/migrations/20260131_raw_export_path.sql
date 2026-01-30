-- Add raw_export_path column to user_profiles
-- Stores the Supabase Storage path to the original conversations.json backup

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS raw_export_path TEXT;

COMMENT ON COLUMN public.user_profiles.raw_export_path IS 'Supabase Storage path to original conversations.json backup';
