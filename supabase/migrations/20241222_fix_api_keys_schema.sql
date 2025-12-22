-- Fix api_keys table schema and reload cache

-- 1. Ensure label column exists
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS label TEXT DEFAULT 'Default Key';

-- 2. Ensure user_id is TEXT (to support emails)
ALTER TABLE public.api_keys ALTER COLUMN user_id TYPE TEXT;

-- 3. Reload PostgREST schema cache to recognize the changes
NOTIFY pgrst, 'reload config';
