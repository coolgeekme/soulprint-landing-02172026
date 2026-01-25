-- Remove the unique constraint on soulprints.user_id to allow multiple soulprints per user
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'soulprints_user_id_key'
    ) THEN
        ALTER TABLE soulprints DROP CONSTRAINT soulprints_user_id_key;
    END IF;
END $$;
