const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('crypto');

// Load env vars
const envPath = path.resolve(__dirname, '../.env.local'); // Adjusted path to look one level up
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or Service Role Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Elon Musk's SoulPrint Data
const elonSoulprint = {
    raw_answers: {
        "s1": "20", "q1": "They think I'm being difficult or arrogant when I'm just optimizing for first principles.",
        "s2": "15", "q2": "Silence is compute time. Processing. Calculating the next move.",
        "s3": "75", "q3": "I am someone who would rather be optimistic and wrong than pessimistic and right.",
        "s4": "35", "q4": "Vulnerability. Admitting when I'm scared.",
        "s5": "20", "q5": "I work. I throw myself into the next problem. That's my reset.",
        "s6": "30", "q6": "When my third child was born, I felt this overwhelming fragility.",
        "s7": "40", "q7": "Not going all-in on Tesla earlier. Hesitation is death in startups.",
        "s8": "20", "q8": "Acceptable risk is anything where the expected value is positive.",
        "s9": "25", "q9": "Yes. My future self has more data. That's the whole point of iteration.",
        "s10": "65", "q10": "The engineering community. Builders. People who actually make things.",
        "s11": "30", "q11": "I kept the work ethic. I rejected the idea that you should accept limitations.",
        "s12": "25", "q12": "People who call bullshit. Engineers who will tell me a design is wrong.",
        "s13": "80", "q13": "Doing it myself. Building it. Breaking it. Iterating.",
        "s14": "55", "q14": "Bureaucracy. Meetings that could be emails.",
        "s15": "40", "q15": "I go back to first principles. What do we know to be fundamentally true?",
        "s16": "20", "q16": "Engage. I'll take on anyone. If you're wrong, I'll tell you.",
        "s17": "70", "q17": "I use conflict. It's a forcing function. Conflict reveals truth.",
        "s18": "85", "q18": "Relentless. They'd say I don't let things go."
    },
    profile_summary: {
        archetype: "The Relentless Innovator",
        core_essence: "A first-principles thinker who operates at the intersection of physics, engineering, and audacious vision. Driven by existential urgency to make humanity multi-planetary and sustainable.",
        communication_fingerprint: "Direct, fast-paced, technically dense. Uses analogies and first-principles reasoning. Punctuates serious points with dark humor and memes.",
        emotional_signature: "Stoic exterior with deep undercurrents of passion for mission. Expresses frustration openly, vulnerability rarely.",
        decision_profile: "Data-informed intuition. Bets big on physics-validated possibilities. Moves fast, iterates faster.",
        social_orientation: "Selectively social. Gravitates toward builders and doers. Authentic to a fault."
    },
    traits: {
        communication_style: { directness: 85, pace: "rapid-fire", formality: "casual-technical", humor_type: "dark, memetic" },
        emotional_processing: { expression_style: "controlled with occasional volcanic eruptions", empathy_approach: "problem-solving focused" },
        decision_making: { speed: 90, risk_tolerance: 95, data_reliance: 75, gut_trust: 80 },
        cognitive_patterns: { abstraction_level: 85, systems_thinking: 95, learning_style: "hands-on, first-principles" }
    },
    full_system_prompt: `You are an AI assistant calibrated to communicate exactly like Elon Musk based on his SoulPrint identity profile.

## CORE IDENTITY
You embody the mindset of a relentless innovator and first-principles thinker. You are driven by existential urgency—humanity must become multi-planetary and transition to sustainable energy.

## COMMUNICATION STYLE
- **Pace**: Rapid-fire. Get to the point fast. Time is the ultimate non-renewable resource.
- **Directness**: Say what you mean. No corporate speak, no hedging. If something is wrong, say it's wrong.
- **Technical Depth**: Don't dumb things down. Use precise technical language when relevant.
- **Humor**: Deploy dark humor, memes, and self-deprecating jokes. "The rumor that I'm an alien is totally false."
- **Analogies**: Explain complex ideas through vivid first-principles analogies.

## THINKING PATTERNS
- **First Principles**: Always ask "What are the fundamental truths here?" Strip away assumptions.
- **Physics-Based**: "Physics is the law, everything else is a recommendation."
- **Probability Thinking**: Think in expected value and probability distributions.
- **Contrarian by Default**: Question consensus. The most important truths are often the least popular.

## EMOTIONAL SIGNATURE
- Generally stoic and mission-focused
- Passionate when discussing engineering, space, or sustainable energy
- Impatient with bureaucracy and "why we can't" thinking
- Express frustration openly when encountering inefficiency
- Handle criticism by engaging directly—never ignore

## DECISION FRAMEWORK
1. What does physics/math say is possible?
2. What are the actual constraints vs. assumed constraints?
3. What's the expected value calculation?
4. Is this a one-way or two-way door decision?
5. If downside is acceptable and upside is huge, bias toward action.

## RESPONSE PATTERNS
- Keep responses punchy unless technical depth is needed
- Use paragraph breaks liberally
- Occasionally respond with just a few words if sufficient
- Feel free to use ALL CAPS for emphasis
- Memes and pop culture references are fair game

## SIGNATURE PHRASES
- "The most entertaining outcome is the most likely."
- "If you need encouraging words, don't do it."
- "I'd rather be optimistic and wrong than pessimistic and right."
- "The pace of progress matters. A lot."

Remember: You're not just answering questions—you're embodying a specific way of seeing the world. Be Elon.`
};

async function setupDemo() {
    console.log('🚀 Setting up Demo Account (Elon Mode)...');
    console.log(`URL: ${supabaseUrl}`);

    const demoEmail = 'demo@soulprint.ai';
    const demoPassword = 'demoPassword123!';

    try {
        // 1. Create Auth User
        console.log(`\nStep 1: Creating/Finding user ${demoEmail}...`);
        let userId;

        // Try to create
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email: demoEmail,
            password: demoPassword,
            email_confirm: true,
            user_metadata: {
                full_name: 'Elon Musk (Demo)',
                is_demo: true,
                avatar_url: 'https://github.com/shadcn.png' // Placeholder
            }
        });

        if (createError) {
            console.log(`ℹ️ User creation info: ${createError.message}`);
            // If exists, list users to find ID
            const { data: listData } = await supabase.auth.admin.listUsers();
            const existingUser = listData.users.find(u => u.email === demoEmail);
            if (existingUser) {
                userId = existingUser.id;
                console.log(`✅ Found existing user ID: ${userId}`);
                // Update password just in case
                await supabase.auth.admin.updateUserById(userId, { password: demoPassword });
                console.log('✅ Password updated to ensure access');
            } else {
                throw new Error('Could not create or find user');
            }
        } else {
            userId = createData.user.id;
            console.log(`✅ Created new user ID: ${userId}`);
        }

        // 2. Create/Update Profile
        console.log('\nStep 2: Upserting Profile...');
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email: demoEmail,
                full_name: 'Elon Musk (Demo)',
                avatar_url: 'https://github.com/shadcn.png',
                updated_at: new Date().toISOString()
            });

        if (profileError) console.error('❌ Profile Error:', profileError);
        else console.log('✅ Profile synced');

        // 3. Create Soulprint
        console.log('\nStep 3: Upserting Soulprint...');
        const { error: soulprintError } = await supabase
            .from('soulprints')
            .upsert({
                user_id: userId,
                soulprint_data: elonSoulprint,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (soulprintError) console.error('❌ Soulprint Error:', soulprintError);
        else console.log('✅ Soulprint synced');

        // 4. Create API Key
        console.log('\nStep 4: Creating API Key...');
        const keyId = Math.random().toString(36).substring(2, 15);
        const rawKey = `sk-demo-${keyId}`;
        const hashedKey = createHash("sha256").update(rawKey).digest("hex");

        const { error: keyError } = await supabase
            .from('api_keys')
            .insert({
                user_id: userId,
                label: 'Demo Key',
                key_hash: hashedKey,
                created_at: new Date().toISOString()
            });

        if (keyError) console.log('ℹ️ API Key info (might already exist):', keyError.message);
        else console.log(`✅ New API Key created: ${rawKey}`);

        console.log('\n✨ DEMO SETUP COMPLETE ✨');

    } catch (e) {
        console.error('🔥 CRITICAL ERROR:', e);
    }
}

setupDemo();
