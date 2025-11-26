// Quick fix for chat system - create soulprint data and test API key
const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('crypto');

const supabaseUrl = 'https://wcgbwzznadrrllfoojap.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjZ2J3enpuYWRycmxsZm9vamFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMTYzNzAsImV4cCI6MjA3OTY5MjM3MH0.WFl5YKVQhJhbL6fjhu8X7U6RkhOM3A8oTIb_lw4cDuw';

const supabase = createClient(supabaseUrl, supabaseKey);

const demoSoulprintData = {
    communication_style: {
        formality: "casual",
        directness: "direct",
        humor: "moderate"
    },
    decision_making: {
        approach: "analytical",
        speed: "balanced",
        collaboration: "high"
    },
    values: ["innovation", "authenticity", "growth"],
    work_style: {
        environment: "collaborative",
        pace: "steady",
        structure: "flexible"
    },
    personality_traits: {
        openness: "high",
        conscientiousness: "moderate",
        extraversion: "balanced",
        agreeableness: "high",
        neuroticism: "low"
    }
};

async function quickFix() {
    console.log('🔧 Quick fixing chat system...');

    try {
        // 1. Create a test API key that will work with the RLS policies
        console.log('1. Creating fallback soulprint with user_id "test"...');

        const { error: spError } = await supabase
            .from('soulprints')
            .upsert({
                user_id: 'test',
                soulprint_data: demoSoulprintData
            }, { onConflict: 'user_id' });

        if (spError) {
            console.log('⚠️ Soulprint error (expected):', spError.message);
        } else {
            console.log('✅ Fallback soulprint created');
        }

        // 2. Try to create a user record with a UUID that matches the RLS policies
        console.log('2. Creating demo user compatibility...');

        // Use a known UUID pattern for demo
        const demoUserId = '00000000-0000-0000-0000-000000000001';

        const { error: demoSpError } = await supabase
            .from('soulprints')
            .upsert({
                user_id: demoUserId,
                soulprint_data: demoSoulprintData
            }, { onConflict: 'user_id' });

        if (demoSpError) {
            console.log('⚠️ Demo soulprint error:', demoSpError.message);
        } else {
            console.log('✅ Demo user soulprint created');
        }

        // 3. Create API key for demo user
        console.log('3. Creating API key...');

        const rawKey = 'sk-soulprint-demo-test-key-123456';
        const hashedKey = createHash('sha256').update(rawKey).digest('hex');

        const { error: apiKeyError } = await supabase
            .from('api_keys')
            .insert({
                user_id: demoUserId,
                label: 'Demo Test Key',
                key_hash: hashedKey
            });

        if (apiKeyError) {
            console.log('⚠️ API key error:', apiKeyError.message);
        } else {
            console.log('✅ Demo API key created');
            console.log('🔑 Test API Key:', rawKey);
        }

        console.log('\n🎯 Next Steps:');
        console.log('1. In browser console, run: localStorage.setItem("soulprint_internal_key", "sk-soulprint-demo-test-key-123456")');
        console.log('2. Refresh the chat page');
        console.log('3. Try sending a message');
        console.log('\nIf still not working, check browser console for errors.');

    } catch (error) {
        console.error('❌ Fix error:', error.message);
    }
}

quickFix();