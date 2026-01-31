-- Update imports bucket to allow JSON files (for extracted conversations.json)
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/zip', 'application/x-zip-compressed', 'application/json']
WHERE id = 'imports';
