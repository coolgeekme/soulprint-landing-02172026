import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

console.log('Connecting to:', url);

const supabase = createClient(url, key);

async function main() {
    console.log('Checking buckets...');
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('List buckets error:', error);
        return;
    }

    console.log('Buckets:', buckets.map(b => b.name));

    const hasImports = buckets.find(b => b.name === 'imports');
    if (!hasImports) {
        console.log("Bucket 'imports' NOT found. Creating...");
        const { data, error: createError } = await supabase.storage.createBucket('imports', {
            public: false,
            fileSizeLimit: 5242880000, // 5GB
            allowedMimeTypes: ['application/json', 'application/zip']
        });
        if (createError) console.error('Create bucket error:', createError);
        else console.log('Bucket created!');
    } else {
        console.log("Bucket 'imports' exists.");
    }

    // Test signed URL
    console.log('Testing Signed URL...');
    const testPath = `test-upload-${Date.now()}.json`;
    const { data: sign, error: signError } = await supabase.storage
        .from('imports')
        .createSignedUploadUrl(testPath);

    if (signError) {
        console.error('Sign URL error:', signError);
    } else {
        console.log('Signed URL created:', sign.signedUrl);

        // Test Upload
        console.log('Attempting upload to signed URL...');
        try {
            const res = await fetch(sign.signedUrl, {
                method: 'PUT',
                body: JSON.stringify({ test: true }),
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('Upload status:', res.status, res.statusText);
            const text = await res.text();
            console.log('Response body:', text);
        } catch (e) {
            console.error('Upload fetch error:', e);
        }
    }
}

main();
