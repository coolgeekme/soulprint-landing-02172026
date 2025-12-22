const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
    console.log('🧹 Cleaning up records with Email IDs (migrating to UUIDs)...');

    // 1. Delete api_keys with email IDs
    const { error: apiError, count: apiCount } = await supabase
        .from('api_keys')
        .delete({ count: 'exact' })
        .ilike('user_id', '%@%'); // Simple check for email-like IDs

    if (apiError) console.log('❌ api_keys cleanup error:', apiError.message);
    else console.log(`✅ Deleted ${apiCount} api_keys with email IDs.`);

    // 2. Delete chat_messages with email IDs
    const { error: chatError, count: chatCount } = await supabase
        .from('chat_messages')
        .delete({ count: 'exact' })
        .ilike('user_id', '%@%');

    if (chatError) console.log('❌ chat_messages cleanup error:', chatError.message);
    else console.log(`✅ Deleted ${chatCount} chat_messages with email IDs.`);
}

cleanup();
