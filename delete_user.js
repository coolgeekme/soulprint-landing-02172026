// Delete a user completely from Supabase (auth + profile + soulprint + api_keys)
// Usage: node delete_user.js <email>

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function deleteUser(email) {
    if (!email) {
        console.log('Usage: node delete_user.js <email>');
        console.log('Example: node delete_user.js kidquick360@gmail.com');
        return;
    }

    console.log(`\n🗑️  Deleting user: ${email}\n`);
    console.log('='.repeat(50));

    try {
        // 1. Find the user
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error('Error listing users:', listError.message);
            return;
        }

        const user = users.users.find(u => u.email === email);
        if (!user) {
            console.log(`❌ User ${email} not found in auth.users`);
            return;
        }

        console.log(`Found user: ${user.id}`);

        // 2. Delete API keys
        const { error: apiKeyError } = await supabase
            .from('api_keys')
            .delete()
            .eq('user_id', user.id);
        console.log(apiKeyError ? `⚠️  API keys: ${apiKeyError.message}` : '✅ API keys deleted');

        // 3. Delete soulprints
        const { error: soulprintError } = await supabase
            .from('soulprints')
            .delete()
            .eq('user_id', user.id);
        console.log(soulprintError ? `⚠️  Soulprints: ${soulprintError.message}` : '✅ Soulprints deleted');

        // 4. Delete profile
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);
        console.log(profileError ? `⚠️  Profile: ${profileError.message}` : '✅ Profile deleted');

        // 5. Delete from auth.users (this is the main delete)
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
        if (authError) {
            console.error('❌ Auth delete error:', authError.message);
        } else {
            console.log('✅ Auth user deleted');
        }

        console.log('\n' + '='.repeat(50));
        console.log(`🎉 User ${email} completely deleted!`);
        console.log('You can now sign up again with this email.\n');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Get email from command line
const email = process.argv[2];
deleteUser(email);
