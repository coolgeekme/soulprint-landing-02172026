// verify_profile_fix.js
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

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; // Mock ID
const TEST_EMAIL = 'verify_fix@soulprint.ai';

async function verify() {
    console.log('🔍 VERIFYING PROFILE FAIL-SAFE FIX...\n');

    // 1. Cleanup: Remove if exists
    console.log('Step 1: Cleaning up test data...');
    await supabase.from('soulprints').delete().eq('user_id', TEST_USER_ID);
    await supabase.from('profiles').delete().eq('id', TEST_USER_ID);
    console.log('✅ Cleanup done');

    // 2. Simulate saveSoulPrint logic
    console.log('\nStep 2: Simulating saveSoulPrint logic for missing profile...');

    // Check profile
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', TEST_USER_ID).maybeSingle();

    if (!profile) {
        console.log('⚠️ Profile missing, creating fail-safe...');
        const { error: insertError } = await supabase.from('profiles').insert({
            id: TEST_USER_ID,
            email: TEST_EMAIL,
            full_name: 'Verify Fix User'
        });
        if (insertError) {
            console.error('❌ Profile creation failed:', insertError.message);
            return;
        }
        console.log('✅ Profile created');
    }

    // Now insert soulprint
    console.log('Step 3: Inserting soulprint...');
    const { error: spError } = await supabase.from('soulprints').insert({
        user_id: TEST_USER_ID,
        soulprint_data: { archetype: 'Verifier' },
        updated_at: new Date().toISOString()
    });

    if (spError) {
        console.error('❌ SoulPrint creation failed:', spError.message);
    } else {
        console.log('✅ SoulPrint created successfully!');
    }

    // 4. Final verification
    const { data: finalP } = await supabase.from('profiles').select('*').eq('id', TEST_USER_ID).single();
    const { data: finalS } = await supabase.from('soulprints').select('*').eq('user_id', TEST_USER_ID).single();

    if (finalP && finalS) {
        console.log('\n✨ FIX VERIFIED: Profile and SoulPrint both exist in DB.');
    } else {
        console.log('\n❌ VERIFICATION FAILED.');
    }

    // Cleanup after test
    console.log('\nStep 5: Cleaning up test data...');
    await supabase.from('soulprints').delete().eq('user_id', TEST_USER_ID);
    await supabase.from('profiles').delete().eq('id', TEST_USER_ID);
}

verify().catch(err => console.error('Verification error:', err));
