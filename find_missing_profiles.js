// find_missing_profiles.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key && value) env[key] = value;
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function findMissing() {
    console.log('🔍 Checking for users missing profiles...\n');

    // Get all auth users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('❌ Auth error:', authError.message);
        return;
    }

    // Get all profiles
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id');
    if (profileError) {
        console.error('❌ Profile error:', profileError.message);
        return;
    }

    const profileIds = new Set(profiles.map(p => p.id));
    const missing = users.filter(u => !profileIds.has(u.id));

    console.log(`Found ${users.length} total users.`);
    console.log(`Found ${profiles.length} total profiles.`);
    console.log(`Missing profiles: ${missing.length}`);

    missing.forEach(u => {
        console.log(`- ${u.email} (${u.id})`);
    });
}

findMissing();
