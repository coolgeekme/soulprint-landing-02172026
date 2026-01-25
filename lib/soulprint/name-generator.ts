/**
 * SoulPrint Name Generator
 * 
 * Generates meaningful, human-like names for AI companions based on their 
 * SoulPrint profile. Names are derived from archetype, voice vectors, and 
 * identity signature to create a personalized "alter ego" name.
 * 
 * Philosophy:
 * - Names should feel like real people, not AI/robots
 * - Match the personality profile's energy
 * - Short, memorable, pronounceable
 * - Draw from mythology, nature, and classic names
 */

import type { SoulPrintData, VoiceVectors } from './types';
import { chatCompletion, ChatMessage } from '@/lib/llm/local-client';

/**
 * Name families mapped to personality archetypes
 * Curated from mythology, nature, and cross-cultural favorites
 */
const NAME_FAMILIES = {
    // Strategic, analytical, architect types
    strategic: [
        "Atlas", "Nova", "Sage", "Quinn", "Raven", 
        "Orion", "Vega", "Cipher", "Clio", "Kira"
    ],
    
    // Warm, empathetic, nurturing types
    empathetic: [
        "Maya", "Luna", "Aria", "Eden", "River",
        "Iris", "Willow", "Ember", "Seren", "Lyra"
    ],
    
    // Bold, direct, action-oriented types
    bold: [
        "Ace", "Rex", "Max", "Blake", "Storm",
        "Blaze", "Titan", "Knox", "Jett", "Zane"
    ],
    
    // Creative, chaotic, visionary types
    creative: [
        "Phoenix", "Echo", "Juno", "Indie", "Rebel",
        "Zephyr", "Pixel", "Flux", "Nyx", "Cosmo"
    ],
    
    // Grounded, stable, reliable types
    grounded: [
        "Oak", "Stone", "Bear", "Terra", "Anchor",
        "Ridge", "Cedar", "Clay", "Heath", "Dale"
    ],
    
    // Balanced, versatile, adaptable types
    balanced: [
        "Alex", "Jordan", "Casey", "Morgan", "Drew",
        "Riley", "Sage", "Avery", "Parker", "Rowan"
    ]
} as const;

type NameFamily = keyof typeof NAME_FAMILIES;

/**
 * Archetype keyword mappings
 */
const ARCHETYPE_KEYWORDS: Record<NameFamily, RegExp> = {
    strategic: /strateg|architect|analytic|logic|system|engineer|calcul|method/i,
    empathetic: /warm|empath|heal|nurtur|support|compas|care|listen|gentle/i,
    bold: /bold|direct|ace|warrior|alpha|domin|power|force|drive|aggress/i,
    creative: /creat|chaos|rebel|vision|innovat|art|dream|imagin|wild|free/i,
    grounded: /ground|stable|anchor|rock|steady|calm|peace|balanc|center/i,
    balanced: /neutral|adapt|flex|versat|blend|hybrid|middle|moderate/i
};

/**
 * Determines the name family based on SoulPrint archetype and voice
 */
function determineNameFamily(soulprint: SoulPrintData): NameFamily {
    const archetype = (soulprint.archetype || '').toLowerCase();
    const signature = (soulprint.identity_signature || '').toLowerCase();
    const combined = `${archetype} ${signature}`;
    const warmth = soulprint.voice_vectors?.tone_warmth;
    
    // Check each family's keywords
    for (const [family, regex] of Object.entries(ARCHETYPE_KEYWORDS) as [NameFamily, RegExp][]) {
        if (regex.test(combined)) {
            // Apply warmth modifiers
            if (warmth === 'warm/empathetic' && family === 'bold') {
                return 'balanced';
            }
            if (warmth === 'cold/analytical' && family === 'empathetic') {
                return 'strategic';
            }
            return family;
        }
    }
    
    // Default based on warmth
    if (warmth === 'warm/empathetic') return 'empathetic';
    if (warmth === 'cold/analytical') return 'strategic';
    
    return 'balanced';
}

/**
 * Selects a name based on cadence preference
 * Rapid speakers get shorter names, deliberate speakers get longer ones
 */
function selectByLength(names: readonly string[], cadence: VoiceVectors['cadence_speed']): string {
    if (cadence === 'rapid') {
        // Prefer short names (4 letters or less)
        const shortNames = names.filter(n => n.length <= 4);
        if (shortNames.length > 0) {
            return shortNames[Math.floor(Math.random() * shortNames.length)];
        }
    } else if (cadence === 'deliberate') {
        // Prefer longer names (5+ letters)
        const longNames = names.filter(n => n.length >= 5);
        if (longNames.length > 0) {
            return longNames[Math.floor(Math.random() * longNames.length)];
        }
    }
    
    // Random from full list
    return names[Math.floor(Math.random() * names.length)];
}

/**
 * Generates a companion name from SoulPrint profile
 * Uses deterministic logic based on profile characteristics
 * 
 * @param soulprint - The SoulPrint data
 * @returns A human-like companion name
 */
export function generateCompanionName(soulprint: SoulPrintData): string {
    if (!soulprint) return 'Nova'; // Fallback default
    
    const family = determineNameFamily(soulprint);
    const names = NAME_FAMILIES[family];
    const cadence = soulprint.voice_vectors?.cadence_speed || 'moderate';
    
    return selectByLength(names, cadence);
}

/**
 * Generates a companion name using LLM for more creative/unique names
 * Use sparingly - adds latency
 * 
 * @param soulprint - The SoulPrint data
 * @returns A creatively generated name
 */
export async function generateCreativeName(soulprint: SoulPrintData): Promise<string> {
    const prompt = `You are a naming expert. Generate ONE perfect name for an AI companion with this personality:

Archetype: ${soulprint.archetype}
Identity: ${soulprint.identity_signature}
Tone: ${soulprint.voice_vectors?.tone_warmth || 'neutral'}
Speed: ${soulprint.voice_vectors?.cadence_speed || 'moderate'}

Requirements:
- Human first name only (not "AI" or brand-sounding)
- 3-8 letters, easy to pronounce
- Should FEEL like the personality
- Gender-neutral preferred
- Can draw from mythology, nature, or classic names

Respond with ONLY the name. No explanation.`;

    try {
        const messages: ChatMessage[] = [
            { role: 'user', content: prompt }
        ];
        const response = await chatCompletion(messages);
        const name = response.trim().split(/\s+/)[0]; // Take first word
        
        // Validate: 2-12 chars, alpha only
        if (/^[A-Za-z]{2,12}$/.test(name)) {
            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }
    } catch (e) {
        console.error('[NameGenerator] LLM naming failed:', e);
    }
    
    // Fallback to deterministic
    return generateCompanionName(soulprint);
}

/**
 * Validates a user-provided name
 */
export function validateCompanionName(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Name is required' };
    }
    
    const trimmed = name.trim();
    
    if (trimmed.length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters' };
    }
    
    if (trimmed.length > 30) {
        return { valid: false, error: 'Name must be 30 characters or less' };
    }
    
    // Allow letters, spaces, hyphens, apostrophes
    if (!/^[A-Za-z][A-Za-z\s\-']*$/.test(trimmed)) {
        return { valid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
    }
    
    return { valid: true };
}

/**
 * Gets a display-ready name, generating one if missing
 */
export function getDisplayName(soulprint: SoulPrintData): string {
    if (soulprint.name && soulprint.name.trim()) {
        return soulprint.name.trim();
    }
    
    // Fallback to archetype-based generation
    return generateCompanionName(soulprint);
}
