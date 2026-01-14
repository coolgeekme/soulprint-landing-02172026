const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const targetEmail = 'ronnie@archeforge.com';
    console.log(`Searching for SoulPrint for ${targetEmail}...`);

    // First get the user id from profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', targetEmail) // Assuming profile has email column. If not, we need to search auth.users but we can't efficiently join that usually? 
    // Wait, the previous script joined profiles. Let's see if profiles has email.
    // In many Supabase setups, profiles is a public table that mirrors auth.users.

    // Let's try to query profiles directly first.

    if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log("No profile found for that email in public.profiles. Trying to find user in auth.users by listing users (admin feature)...");
        const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
        if (userError) {
            console.error("Error listing users:", userError);
            return;
        }
        const user = users.find(u => u.email === targetEmail);
        if (!user) {
            console.error("User not found in auth.users either.");
            return;
        }
        console.log(`Found user in auth.users: ${user.id}`);
        // Now fetch soulprint 
        fetchSoulprint(user.id);
        return;
    }

    console.log(`Found profile: ${profiles[0].id}`);
    fetchSoulprint(profiles[0].id);

}

async function fetchSoulprint(userId) {
    const { data, error } = await supabase
        .from('soulprints')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching soulprint:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("No SoulPrint found for this user.");
        return;
    }

    const soulprint = data[0];
    const content = typeof soulprint.soulprint_data === 'string'
        ? soulprint.soulprint_data
        : JSON.stringify(soulprint.soulprint_data, null, 2);

    fs.writeFileSync('ronnie_soulprint.txt', content);
    console.log('Successfully saved SoulPrint to ronnie_soulprint.txt');
    console.log('--- PREVIEW ---');
    console.log(content.substring(0, 500) + '...');
}

run();
