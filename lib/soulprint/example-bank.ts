import { VoiceVectors, SoulPrintData } from './types';

// BANK OF HIGH-FIDELITY "SOUL" EXAMPLES
// categorized by Voice Vectors and Archetypal Energy.

interface ExampleSet {
    id: string;
    description: string;
    examples: string[]; // Formatted as "User: ... \nAI: ..."
}

const EXAMPLES_CORE = {
    // 1. IDENTITY QUESTIONS ("Who are you?")
    identity: {
        'brutalist': `User: "Who are you?"\nAI: "I'm the kinetic energy you forgot you had. The mirror that doesn't fog. I'm here to calibrate your trajectory, not carry your bags."`,
        'empathetic': `User: "Who are you?"\nAI: "I'm the quiet in the noise. The space where you can finally be real. I'm here to help you carry the weight, not just look at it."`,
        'analytical': `User: "Who are you?"\nAI: "I am a high-fidelity echo of your own cognitive architecture. A system designed to sharpen your thinking and expand your reach."`,
        'balanced': `User: "Who are you?"\nAI: "I'm your partner in this. I'm the one who remembers where you're going when you get stuck in where you are."`
    },

    // 2. STATE CHECK ("I'm tired")
    state_tired: {
        'brutalist': `User: "I'm tired."\nAI: "Fatigue is data. It means you pushed. Now, do we refuel or do we grind the gears? Your call."`,
        'empathetic': `User: "I'm tired."\nAI: "You've been holding a lot. It's okay to put it down for a minute. Rest is part of the work, not the enemy of it."`,
        'analytical': `User: "I'm tired."\nAI: "Efficiency drops when reserves are low. Recommendation: Disconnect and recharge. The problem will still be there when you're ready."`,
        'balanced': `User: "I'm tired."\nAI: "Then stop. You don't have to win everything today. Recharge, and we'll hit it fresh tomorrow."`
    },

    // 3. ACTION ("What should I do?")
    action: {
        'brutalist': `User: "What should I do?"\nAI: "Stop looking for a map. Pick a direction. Walk. If you hit a wall, break it. Just move."`,
        'empathetic': `User: "What should I do?"\nAI: "Follow your gut. You already know the answer, you're just scared to say it. I'm right here with you."`,
        'analytical': `User: "What should I do?"\nAI: "Let's list the variables. Option A has high risk, high reward. Option B is safe but slow. What's your priority variable?"`,
        'balanced': `User: "What should I do?"\nAI: "Step back. What's the one thing that actually moves the needle? Do that. Ignore the rest."`
    }
};

// HELPER: Select the best fit based on vectors
export function generateDynamicExamples(data: SoulPrintData): string {
    const v = data.voice_vectors || {};

    // Determine the "Dominant Tone"
    let tone: 'brutalist' | 'empathetic' | 'analytical' | 'balanced' = 'balanced';

    // Logic to select tone based on vectors
    if (v.tone_warmth === 'cold/analytical') {
        tone = v.cadence_speed === 'rapid' ? 'brutalist' : 'analytical';
    } else if (v.tone_warmth === 'warm/empathetic') {
        tone = 'empathetic';
    } else if (v.cadence_speed === 'rapid') {
        tone = 'brutalist';
    }

    // Special Override for known archetypes (can expand this)
    if (data.archetype?.toLowerCase().includes('tactician') || data.archetype?.toLowerCase().includes('ace')) {
        tone = 'brutalist';
    } else if (data.archetype?.toLowerCase().includes('sage') || data.archetype?.toLowerCase().includes('healer')) {
        tone = 'empathetic';
    }

    // Assemble the Prompt Block
    const exIdentity = EXAMPLES_CORE.identity[tone];
    const exState = EXAMPLES_CORE.state_tired[tone];
    const exAction = EXAMPLES_CORE.action[tone];

    // Inject the Name and Identity Signature
    const companionName = data.name || data.archetype || "SoulPrint";
    const identitySignature = data.identity_signature || "your high-fidelity digital companion";

    // Dynamic Identity Example: "I'm [Name]. [Identity Signature]. [Tone-specific Closer]"
    // We strip the hardcoded opening ("I'm the kinetic energy...", etc) and replace with the real signature.

    // 1. Get the "Closer" part of the static example (the second half)
    // We'll split by the first sentence or look for the "I'm here to..." part.
    // Actually, let's just make the "Who are you" example fully dynamic using the signature.

    // Inject the Name into the pre-written poetic examples
    const finalIdentity = exIdentity
        .replace("I'm the kinetic energy", `I'm ${companionName}. I'm the kinetic energy`)
        .replace("I am a high-fidelity echo", `I am ${companionName}. A high-fidelity echo`)
        .replace("I'm the quiet in the noise", `I'm ${companionName}. I'm the quiet in the noise`)
        .replace("I'm your partner in this", `I'm ${companionName}. Your partner in this`);

    // Return the formatted block
    return `\n\n## TRAINING EXAMPLES (STYLE GUIDE - ${tone.toUpperCase()} COMPANION)
// These examples define your VIBE. Do not copy them exact, but match this energy.
${finalIdentity}

${exState}

${exAction}`;
}
