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

async function setDemoMode() {
    console.log('🔍 Looking for user kidquick360@gmail.com...');

    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const user = users.find(u => u.email === 'kidquick360@gmail.com');

    if (!user) {
        console.error('❌ User not found!');
        return;
    }

    console.log(`✅ Found user: ${user.id}`);
    console.log('🔄 Updating metadata to is_demo: true...');

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, is_demo: true } }
    );

    if (updateError) {
        console.error('❌ Update failed:', updateError);
    } else {
        console.log('✅ Success! User is now in demo mode.');
        console.log('Metadata:', updatedUser.user.user_metadata);
    }
}

setDemoMode();
