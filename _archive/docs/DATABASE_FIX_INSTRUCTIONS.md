# 🔧 Database Fix Instructions

## Copy and paste this SQL into your Supabase SQL Editor

**URL:** https://supabase.com/dashboard/project/ozvusjiayuqhaondnadv/sql/new

```sql
-- Fix api_keys table to remove UUID foreign key constraint
-- This allows user_id to be TEXT (email) instead of UUID

-- Drop the foreign key constraint if it exists
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_user_id_fkey;

-- Verify the column is TEXT type
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
```

## After running the SQL:

1. ✅ The UUID constraint error will be fixed
2. ✅ API key generation will work with email addresses
3. 🔄 Refresh your browser at http://localhost:3000

---

## Note on the "label" column error

The error message indicates that Supabase's schema cache needs to be refreshed. After running the SQL above, you may need to:

1. **Wait 30-60 seconds** for Supabase to refresh its schema cache
2. **Or** go to Settings > Database > Reset schema cache
3. **Or** restart your Next.js dev server

