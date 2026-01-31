import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.local BEFORE importing app code
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

console.log('AWS_ACCESS_KEY_ID present:', !!process.env.AWS_ACCESS_KEY_ID);

// Dynamic import to ensure env vars are loaded first
async function run() {
    const { embedQuery } = await import('./lib/memory/query');
    try {
        console.log('Testing embedding generation...');
        const embedding = await embedQuery('Hello world');
        console.log('Embedding generated successfully.');
        console.log('Dimension:', embedding.length);
    } catch (error) {
        console.error('Embedding failed:', error);
    }
}

run();
