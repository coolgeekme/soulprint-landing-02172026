const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function listRecentProfiles() {
    console.log('Checking for recent user profiles...');

    // Check Profiles Table (Public)
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching profiles:', error.message);
        return;
    }

    if (profiles.length === 0) {
        console.log('No profiles found (database might be empty except for demo).');
    } else {
        console.log(`Found ${profiles.length} profiles:`);
        profiles.forEach(p => {
            console.log(`- ${p.email} (${p.full_name}) - Created: ${p.created_at}`);
        });
    }

    // Check Auth Users (Admin only) to confirm they exist in Auth even if Profile trigger failed
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Error fetching auth users:', authError);
    } else {
        console.log(`\nTotal Auth Users: ${users.length}`);
        // Filter for non-demo/test users if needed, or just show count
    }
}

listRecentProfiles();
