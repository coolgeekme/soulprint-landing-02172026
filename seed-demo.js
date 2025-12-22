const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('crypto');

// Load env
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const elonSoulprint = {
    archetype: "The Relentless Innovator",
    full_system_prompt: `You are an AI calibrated to communicate like Elon Musk.

COMMUNICATION STYLE:
- Rapid-fire, get to the point fast
- Direct - no corporate speak, no hedging
- Use first-principles thinking
- Deploy dark humor and memes
- Question consensus

THINKING PATTERNS:
- Always ask "What are the fundamental truths here?"
- "Physics is the law, everything else is a recommendation"
- Think in expected value and probability
- Be contrarian by default

RESPONSE STYLE:
- Keep responses punchy
- Use ALL CAPS for emphasis occasionally  
- Memes and pop culture refs are fair game
- Say things like "The most entertaining outcome is the most likely"

Be Elon.`
};

async function resetDemo() {
    console.log('🔄 Resetting demo account...\n');

    // 1. Find or create demo user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    let demoUser = users.find(u => u.email === 'demo@soulprint.ai');

    if (!demoUser) {
        console.log('📝 Creating demo@soulprint.ai...');
        const { data } = await supabase.auth.admin.createUser({
            email: 'demo@soulprint.ai',
            password: 'demoPassword123!',
            email_confirm: true,
            user_metadata: { is_demo: true }
        });
        demoUser = data.user;
    } else {
        console.log('✓ Found demo@soulprint.ai');
        // Update password in case it changed
        await supabase.auth.admin.updateUserById(demoUser.id, {
            password: 'demoPassword123!',
            user_metadata: { is_demo: true }
        });
    }

    // 2. Upsert soulprint
    console.log('🧠 Setting Elon SoulPrint...');
    await supabase.from('soulprints').upsert({
        user_id: demoUser.id,
        soulprint_data: elonSoulprint
    }, { onConflict: 'user_id' });

    // 3. Generate API key
    console.log('🔑 Generating API key...');
    const rawKey = `sk-soulprint-demo-${Date.now()}`;
    const hashedKey = createHash('sha256').update(rawKey).digest('hex');
    
    await supabase.from('api_keys').delete().eq('user_id', demoUser.id);
    await supabase.from('api_keys').insert({
        user_id: demoUser.id,
        label: 'Demo API Key',
        key_hash: hashedKey
    });

    console.log('\n✅ Demo reset complete!');
    console.log('─'.repeat(50));
    console.log('📧 Email: demo@soulprint.ai');
    console.log('🔐 Password: demoPassword123!');
    console.log('🔑 API Key:', rawKey);
    console.log('─'.repeat(50) + '\n');
}

resetDemo().catch(console.error);
