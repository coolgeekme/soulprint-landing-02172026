import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log('Checking "imports" bucket configuration...');

    // Get current bucket
    const { data: bucket, error } = await supabase.storage.getBucket('imports');

    if (error) {
        console.error('Error getting bucket:', error.message);
        return;
    }

    console.log('Current configuration:', bucket);

    // Update bucket to allow 5GB (5 * 1024 * 1024 * 1024 bytes)
    // and ensure allowed_mime_types includes zip/json
    const limitBytes = 5 * 1024 * 1024 * 1024; // 5GB

    console.log(`Updating limit to ${limitBytes} bytes (5GB)...`);

    const { data: updated, error: updateError } = await supabase.storage.updateBucket('imports', {
        file_size_limit: limitBytes,
        allowed_mime_types: ['application/json', 'application/zip', 'application/x-zip-compressed']
    });

    if (updateError) {
        console.error('Error updating bucket:', updateError.message);
        return;
    }

    console.log('Bucket updated successfully!');
    console.log('New configuration:', updated);
}

main();
