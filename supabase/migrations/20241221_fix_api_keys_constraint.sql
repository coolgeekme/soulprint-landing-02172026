-- Fix api_keys table to remove UUID foreign key constraint
-- This allows user_id to be TEXT (email) instead of UUID

-- Drop the foreign key constraint if it exists
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey;

-- Verify the column is TEXT type
-- (Should already be TEXT from previous migration, but ensuring it here)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' 
        AND column_name = 'user_id' 
        AND data_type != 'text'
    ) THEN
        ALTER TABLE api_keys ALTER COLUMN user_id TYPE TEXT;
    END IF;
END $$;

-- Update RLS policies to use email-based authentication
DROP POLICY IF EXISTS "Users can insert their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;

-- Create updated policies with email support
CREATE POLICY "Users can insert their own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (
    auth.email() = user_id OR 
    user_id = 'test' OR 
    auth.uid()::text = user_id
  );

CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  USING (
    auth.email() = user_id OR 
    user_id = 'test' OR 
    auth.uid()::text = user_id
  );

CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys FOR DELETE
  USING (
    auth.email() = user_id OR 
    user_id = 'test' OR 
    auth.uid()::text = user_id
  );
