-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload config';

-- Verify api_keys table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'api_keys';
