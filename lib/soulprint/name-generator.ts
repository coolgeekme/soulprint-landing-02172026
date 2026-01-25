/**
 * SoulPrint Name Generator V2.0 - Cortana Edition
 *
 * Generates unique, one-word companion names with video game vibes.
 * Think: Cortana, Ace, Cipher, Nova, Phoenix
 *
 * Key Features:
 * - Globally unique names (no two companions share a name)
 * - One-word only, 3-8 characters
 * - Personality-matched from curated families
 * - Nickname detection from chat history
 */

import type { SoulPrintData, VoiceVectors } from './types';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cortana-style name families
 * One-word, 3-8 characters, video game/sci-fi vibes
 */
const CORTANA_NAMES = {
  // Strategic/Sharp/Tactical minds
  tactical: [
    'Ace', 'Arc', 'Ash', 'Axon', 'Blitz', 'Byte', 'Cipher', 'Coda', 'Core',
    'Crux', 'Data', 'Edge', 'Grid', 'Hex', 'Icon', 'Index', 'Jolt', 'Kilo',
    'Link', 'Logic', 'Lynx', 'Matrix', 'Node', 'Null', 'Omega', 'Onyx',
    'Opus', 'Orbit', 'Prime', 'Proxy', 'Pulse', 'Quant', 'Razor', 'Rune',
    'Scout', 'Sigma', 'Slate', 'Spark', 'Spike', 'Stark', 'Sync', 'Tact',
    'Vector', 'Vertex', 'Vex', 'Volt', 'Wire', 'Zero', 'Zen', 'Zeta'
  ],

  // Warm/Supportive/Nurturing
  nurturing: [
    'Aura', 'Aria', 'Bloom', 'Calm', 'Cove', 'Coral', 'Dawn', 'Dew', 'Dove',
    'Echo', 'Eden', 'Ember', 'Fern', 'Flora', 'Glow', 'Grace', 'Halo', 'Haven',
    'Honey', 'Hope', 'Iris', 'Ivy', 'Jade', 'Joy', 'June', 'Luna', 'Lyric',
    'Mist', 'Opal', 'Pearl', 'Rain', 'River', 'Rose', 'Sage', 'Serene', 'Sky',
    'Sol', 'Star', 'Sun', 'Terra', 'Tide', 'Vale', 'Wave', 'Willow', 'Wish'
  ],

  // Bold/Alpha/Action-oriented
  alpha: [
    'Apex', 'Axe', 'Bash', 'Bear', 'Blade', 'Blaze', 'Bolt', 'Boss', 'Bravo',
    'Brick', 'Brute', 'Chief', 'Clash', 'Cobra', 'Comet', 'Crash', 'Cross',
    'Dagger', 'Diesel', 'Drake', 'Falcon', 'Fang', 'Flint', 'Force', 'Fury',
    'Hawk', 'Hunter', 'Iron', 'Jet', 'King', 'Knox', 'Lance', 'Leo', 'Lion',
    'Mace', 'Mars', 'Max', 'Pyre', 'Rage', 'Rex', 'Rogue', 'Saber', 'Shade',
    'Slade', 'Strike', 'Tank', 'Thor', 'Titan', 'Viper', 'Wolf', 'Wrath', 'Zeus'
  ],

  // Creative/Chaotic/Visionary
  visionary: [
    'Chaos', 'Cosmic', 'Dream', 'Drift', 'Dusk', 'Ether', 'Flux', 'Ghost',
    'Glitch', 'Haze', 'Indie', 'Karma', 'Lucid', 'Mirage', 'Myth', 'Neon',
    'Nova', 'Nyx', 'Paradox', 'Phoenix', 'Pixel', 'Prism', 'Rave', 'Rebel',
    'Riddle', 'Rift', 'Riot', 'Shade', 'Siren', 'Spectre', 'Spirit', 'Strobe',
    'Surge', 'Trance', 'Trip', 'Vibe', 'Void', 'Warp', 'Wisp', 'Zen', 'Zephyr'
  ],

  // Grounded/Stable/Reliable
  anchor: [
    'Atlas', 'Bastion', 'Beacon', 'Birch', 'Boulder', 'Cairn', 'Cedar', 'Clay',
    'Cliff', 'Crest', 'Dale', 'Depth', 'Dune', 'Earth', 'Elm', 'Forge', 'Fort',
    'Glen', 'Granite', 'Heath', 'Hill', 'Jasper', 'Keep', 'Lodge', 'Maple',
    'Mesa', 'Oak', 'Peak', 'Pine', 'Quarry', 'Ridge', 'Rock', 'Root', 'Shelter',
    'Shield', 'Shore', 'Slate', 'Steel', 'Stone', 'Summit', 'Timber', 'Tor', 'Vault'
  ],

  // Balanced/Versatile/Hybrid
  hybrid: [
    'Alex', 'Aspen', 'Avery', 'Blake', 'Brook', 'Casey', 'Chase', 'Drew',
    'Ellis', 'Ember', 'Erin', 'Ever', 'Finn', 'Gray', 'Harper', 'Jesse',
    'Jordan', 'Kit', 'Lane', 'Lee', 'Logan', 'Lux', 'Morgan', 'Parker',
    'Quinn', 'Ray', 'Reese', 'Riley', 'Robin', 'Rowan', 'Ryan', 'Sam',
    'Scout', 'Shay', 'Spencer', 'Sterling', 'Storm', 'Taylor', 'Teal',
    'True', 'West', 'Winter', 'Wren'
  ]
} as const;

type NameFamily = keyof typeof CORTANA_NAMES;

/**
 * Get all available names as a flat array
 */
function getAllNames(): string[] {
  return Object.values(CORTANA_NAMES).flat();
}

/**
 * Archetype keyword mappings
 */
const ARCHETYPE_KEYWORDS: Record<NameFamily, RegExp> = {
  tactical: /strateg|architect|analytic|logic|system|engineer|calcul|method|cipher|sharp|precise/i,
  nurturing: /warm|empath|heal|nurtur|support|compas|care|listen|gentle|kind|soft/i,
  alpha: /bold|direct|ace|warrior|alpha|domin|power|force|drive|aggress|leader|chief/i,
  visionary: /creat|chaos|rebel|vision|innovat|art|dream|imagin|wild|free|cosmic/i,
  anchor: /ground|stable|anchor|rock|steady|calm|peace|balanc|center|solid|reliable/i,
  hybrid: /neutral|adapt|flex|versat|blend|hybrid|middle|moderate|balanced/i
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
      if (warmth === 'warm/empathetic' && family === 'alpha') {
        return 'hybrid';
      }
      if (warmth === 'cold/analytical' && family === 'nurturing') {
        return 'tactical';
      }
      return family;
    }
  }

  // Default based on warmth
  if (warmth === 'warm/empathetic') return 'nurturing';
  if (warmth === 'cold/analytical') return 'tactical';

  return 'hybrid';
}

/**
 * Filter names by cadence preference
 * Rapid speakers get shorter names, deliberate speakers get longer ones
 */
function filterByCadence(names: string[], cadence: VoiceVectors['cadence_speed']): string[] {
  if (cadence === 'rapid') {
    // Prefer short names (4 letters or less)
    const shortNames = names.filter(n => n.length <= 4);
    return shortNames.length > 0 ? shortNames : names;
  } else if (cadence === 'deliberate') {
    // Prefer longer names (5+ letters)
    const longNames = names.filter(n => n.length >= 5);
    return longNames.length > 0 ? longNames : names;
  }
  return names;
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if a name is available (not already used)
 */
export async function isNameAvailable(
  supabase: SupabaseClient,
  name: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('is_name_available', { check_name: name });

  if (error) {
    console.error('[NameGenerator] Error checking name availability:', error);
    return false; // Assume taken on error
  }

  return data === true;
}

/**
 * Reserve a name atomically (prevents race conditions)
 */
export async function reserveName(
  supabase: SupabaseClient,
  name: string,
  displayName: string,
  userId: string,
  soulprintId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('reserve_companion_name', {
      p_name: name,
      p_display_name: displayName,
      p_user_id: userId,
      p_soulprint_id: soulprintId
    });

  if (error) {
    console.error('[NameGenerator] Error reserving name:', error);
    return false;
  }

  return data === true;
}

/**
 * Get all currently used names for bulk checking
 */
export async function getUsedNames(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('used_companion_names')
    .select('name');

  if (error) {
    console.error('[NameGenerator] Error fetching used names:', error);
    return new Set();
  }

  return new Set(data?.map(row => row.name.toLowerCase()) || []);
}

/**
 * Detect if user mentioned a nickname in their chat messages
 */
export function detectNicknameFromChat(userMessages: string[]): {
  nickname: string | null;
  confidence: number;
  context: string;
} {
  const nicknamePatterns = [
    /(?:people|friends|everyone)\s+call(?:s)?\s+me\s+["']?(\w+)["']?/i,
    /(?:i'm|im|i am)\s+(?:known\s+as|called)\s+["']?(\w+)["']?/i,
    /(?:call\s+me|go\s+by)\s+["']?(\w+)["']?/i,
    /(?:my\s+nickname\s+is|nickname:?)\s+["']?(\w+)["']?/i,
    /(?:they\s+call\s+me)\s+["']?the\s+(\w+)["']?/i,
    /(?:i'm|im)\s+(?:the\s+)?["']?(\w+)["']?\s+(?:around\s+here|at\s+work|to\s+my\s+friends)/i
  ];

  for (const message of userMessages) {
    for (const pattern of nicknamePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const nickname = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();

        // Validate: 2-8 chars, alpha only
        if (/^[A-Za-z]{2,8}$/.test(nickname)) {
          return {
            nickname,
            confidence: 0.9,
            context: message.slice(0, 100)
          };
        }
      }
    }
  }

  return { nickname: null, confidence: 0, context: '' };
}

/**
 * Generate a unique companion name
 * Checks database for availability and reserves it
 */
export async function generateUniqueName(
  supabase: SupabaseClient,
  soulprint: SoulPrintData,
  userId: string,
  soulprintId: string,
  chatMessages?: string[] // Optional: user messages for nickname detection
): Promise<{
  name: string;
  alternates: string[];
  source: 'detected' | 'generated';
  detectedNickname?: string;
}> {
  // 1. Try to detect nickname from chat history
  if (chatMessages && chatMessages.length > 0) {
    const detected = detectNicknameFromChat(chatMessages);
    if (detected.nickname && detected.confidence > 0.7) {
      // Check if detected nickname is available
      const isAvailable = await isNameAvailable(supabase, detected.nickname);
      if (isAvailable) {
        const reserved = await reserveName(
          supabase,
          detected.nickname,
          detected.nickname,
          userId,
          soulprintId
        );
        if (reserved) {
          // Get alternates
          const alternates = await findAvailableAlternates(supabase, soulprint, detected.nickname);
          return {
            name: detected.nickname,
            alternates,
            source: 'detected',
            detectedNickname: detected.nickname
          };
        }
      }
    }
  }

  // 2. Generate from personality profile
  const family = determineNameFamily(soulprint);
  const cadence = soulprint.voice_vectors?.cadence_speed || 'moderate';

  // Get candidate names from family, filtered by cadence
  let candidates = [...CORTANA_NAMES[family]] as string[];
  candidates = filterByCadence(candidates, cadence);
  candidates = shuffle(candidates);

  // 3. Get all used names for bulk checking
  const usedNames = await getUsedNames(supabase);

  // 4. Find first available name
  let selectedName: string | null = null;
  const alternates: string[] = [];

  for (const name of candidates) {
    if (!usedNames.has(name.toLowerCase())) {
      if (!selectedName) {
        // Try to reserve the first one
        const reserved = await reserveName(supabase, name, name, userId, soulprintId);
        if (reserved) {
          selectedName = name;
          continue;
        }
      } else if (alternates.length < 3) {
        // Collect alternates (don't reserve yet)
        alternates.push(name);
      }

      if (selectedName && alternates.length >= 3) break;
    }
  }

  // 5. If no name found in family, try other families
  if (!selectedName) {
    const allNames = shuffle(getAllNames());
    for (const name of allNames) {
      if (!usedNames.has(name.toLowerCase())) {
        const reserved = await reserveName(supabase, name, name, userId, soulprintId);
        if (reserved) {
          selectedName = name;
          break;
        }
      }
    }
  }

  // 6. Ultimate fallback: generate unique with number suffix
  if (!selectedName) {
    const baseName = candidates[0] || 'Nova';
    for (let i = 1; i <= 999; i++) {
      const suffixedName = `${baseName}${i}`;
      if (!usedNames.has(suffixedName.toLowerCase())) {
        const reserved = await reserveName(supabase, suffixedName, suffixedName, userId, soulprintId);
        if (reserved) {
          selectedName = suffixedName;
          break;
        }
      }
    }
  }

  return {
    name: selectedName || 'Nova',
    alternates: alternates.slice(0, 3),
    source: 'generated'
  };
}

/**
 * Find available alternate names (without reserving)
 */
async function findAvailableAlternates(
  supabase: SupabaseClient,
  soulprint: SoulPrintData,
  excludeName: string
): Promise<string[]> {
  const usedNames = await getUsedNames(supabase);
  const family = determineNameFamily(soulprint);
  const cadence = soulprint.voice_vectors?.cadence_speed || 'moderate';

  let candidates = [...CORTANA_NAMES[family]] as string[];
  candidates = filterByCadence(candidates, cadence);
  candidates = shuffle(candidates);

  const alternates: string[] = [];
  for (const name of candidates) {
    if (
      name.toLowerCase() !== excludeName.toLowerCase() &&
      !usedNames.has(name.toLowerCase())
    ) {
      alternates.push(name);
      if (alternates.length >= 3) break;
    }
  }

  return alternates;
}

/**
 * Legacy function: Generate name without uniqueness check
 * Use only for display/preview, not final assignment
 */
export function generateCompanionName(soulprint: SoulPrintData): string {
  if (!soulprint) return 'Nova';

  const family = determineNameFamily(soulprint);
  const names = [...CORTANA_NAMES[family]];
  const cadence = soulprint.voice_vectors?.cadence_speed || 'moderate';
  const filtered = filterByCadence(names, cadence);

  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Validates a user-provided name
 * Stricter for one-word Cortana-style names
 */
export function validateCompanionName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 12) {
    return { valid: false, error: 'Name must be 12 characters or less' };
  }

  // One word only, letters only (may include numbers at end for uniqueness)
  if (!/^[A-Za-z]+[0-9]*$/.test(trimmed)) {
    return { valid: false, error: 'Name must be one word with letters only' };
  }

  // Check for reserved/inappropriate names
  const reserved = ['admin', 'system', 'ai', 'bot', 'soulprint', 'user', 'null', 'undefined'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'This name is reserved' };
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

/**
 * Get name suggestions for a personality without reserving
 * Useful for UI previews
 */
export async function getNameSuggestions(
  supabase: SupabaseClient,
  soulprint: SoulPrintData,
  count: number = 5
): Promise<string[]> {
  const usedNames = await getUsedNames(supabase);
  const family = determineNameFamily(soulprint);
  const cadence = soulprint.voice_vectors?.cadence_speed || 'moderate';

  let candidates = [...CORTANA_NAMES[family]] as string[];
  candidates = filterByCadence(candidates, cadence);
  candidates = shuffle(candidates);

  const suggestions: string[] = [];
  for (const name of candidates) {
    if (!usedNames.has(name.toLowerCase())) {
      suggestions.push(name);
      if (suggestions.length >= count) break;
    }
  }

  return suggestions;
}
