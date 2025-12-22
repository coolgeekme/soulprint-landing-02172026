-- Fix soulprints table to allow UPSERT by adding a unique constraint on user_id

-- 1. Remove duplicate entries if any (keeping the most recently updated one)
DELETE FROM soulprints a USING (
    SELECT user_id, MAX(updated_at) as max_updated
    FROM soulprints 
    GROUP BY user_id HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id 
AND a.updated_at < b.max_updated;

-- 2. Add unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'soulprints_user_id_key'
    ) THEN
        ALTER TABLE soulprints ADD CONSTRAINT soulprints_user_id_key UNIQUE (user_id);
    END IF;
END $$;
