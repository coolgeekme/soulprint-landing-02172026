-- Add organization columns to soulprints table
ALTER TABLE soulprints 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS archetype TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add index for status for faster filtering
CREATE INDEX IF NOT EXISTS soulprints_status_idx ON soulprints(status);
