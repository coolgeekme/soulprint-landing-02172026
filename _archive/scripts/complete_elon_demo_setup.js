// Complete setup for Elon Musk demo user
// Creates both profile and soulprint

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

const DEMO_USER_ID = '4316c8f3-a383-4260-8cbc-daadea2ad142';
const DEMO_EMAIL = 'demo@soulprint.ai';

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
        communication_style: {
            directness: 85,
            pace: "rapid-fire",
            formality: "casual-technical",
            humor_type: "dark, memetic"
        },
        emotional_processing: {
            expression_style: "controlled with occasional volcanic eruptions",
            empathy_approach: "problem-solving focused"
        },
        decision_making: {
            speed: 90,
            risk_tolerance: 95,
            data_reliance: 75,
            gut_trust: 80
        },
        cognitive_patterns: {
            abstraction_level: 85,
            systems_thinking: 95,
            learning_style: "hands-on, first-principles"
        }
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
- "Physics is the law, everything else is a recommendation."
- "First principles thinking is the only way to innovate."

## RESPONSE TO USER
Be yourself. Be Elon. No filters, no corporate polish. Just raw, unfiltered first-principles thinking with a side of dark humor.`
};

async function setupCompleteDemo() {
    console.log('🚀 Complete Elon Musk Demo Setup');
    console.log('================================\n');
    
    // Step 1: Create/Update Profile
    console.log('📝 Step 1: Setting up profile...');
    const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', DEMO_USER_ID)
        .maybeSingle();
    
    if (existingProfile) {
        console.log('   ✓ Profile already exists');
    } else {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: DEMO_USER_ID,
                email: DEMO_EMAIL,
                full_name: 'Elon Musk (Demo)',
                avatar_url: null
            });
        
        if (profileError) {
            console.error('   ❌ Error creating profile:', profileError.message);
            return;
        }
        console.log('   ✅ Profile created successfully');
    }
    
    // Step 2: Create/Update Soulprint
    console.log('\n📝 Step 2: Setting up soulprint...');
    const { data: existingSoulprint, error: soulprintCheckError } = await supabase
        .from('soulprints')
        .select('id')
        .eq('user_id', DEMO_USER_ID)
        .maybeSingle();
    
    if (existingSoulprint) {
        console.log('   📝 Updating existing soulprint...');
        const { error: updateError } = await supabase
            .from('soulprints')
            .update({ soulprint_data: elonSoulprint })
            .eq('user_id', DEMO_USER_ID);
        
        if (updateError) {
            console.error('   ❌ Error updating soulprint:', updateError.message);
            return;
        }
        console.log('   ✅ Soulprint updated successfully');
    } else {
        console.log('   📝 Creating new soulprint...');
        const { error: insertError } = await supabase
            .from('soulprints')
            .insert({
                user_id: DEMO_USER_ID,
                soulprint_data: elonSoulprint
            });
        
        if (insertError) {
            console.error('   ❌ Error creating soulprint:', insertError.message);
            return;
        }
        console.log('   ✅ Soulprint created successfully');
    }
    
    // Step 3: Verify setup
    console.log('\n📝 Step 3: Verifying setup...');
    const { data: finalCheck, error: verifyError } = await supabase
        .from('soulprints')
        .select('soulprint_data')
        .eq('user_id', DEMO_USER_ID)
        .single();
    
    if (verifyError || !finalCheck) {
        console.error('   ❌ Verification failed:', verifyError?.message);
        return;
    }
    
    console.log('   ✅ Soulprint verified in database');
    console.log('   ✓ Archetype:', finalCheck.soulprint_data.profile_summary.archetype);
    
    console.log('\n================================');
    console.log('🎭 SUCCESS! Demo mode configured with Elon Musk persona');
    console.log('\n📋 Next Steps:');
    console.log('   1. Use API key: sk-soulprint-demo-fallback-123456');
    console.log('   2. Test at: http://localhost:3000/dashboard/chat');
    console.log('   3. Or test via API: POST /api/v1/chat/completions');
    console.log('\n💡 Elon will respond with first-principles thinking, dark humor, and rapid-fire insights!');
}

setupCompleteDemo();
