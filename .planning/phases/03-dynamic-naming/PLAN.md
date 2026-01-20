# SoulPrint Dynamic Naming System

## Overview
This plan implements a dynamic naming system for SoulPrint companions, ensuring the AI knows its own name and responds correctly when asked. Names update in real-time when users change them, and auto-generated names are derived from the user's SoulPrint profile when no name is provided.

---

## Problem Statement (From User Feedback)
When a user asks "What's your name?", the AI currently responds with generic text like "I'm your AI companion!" instead of the actual SoulPrint name (e.g., "Sadie"). This breaks immersion and identity persistence.

**Required Behaviors:**
1. AI must know and respond with its assigned name
2. Names must update when users rename their SoulPrint
3. Auto-generate meaningful names from SoulPrint profile when user skips naming
4. The name should feel like an "alter ego" - a real, human-like name

---

## Implementation Plan

### Phase 1: Name Injection into System Prompt
**Files:** `lib/soulprint/generator.ts`, `lib/soulprint/soul-engine.ts`

**Current State:**
```typescript
// generator.ts line ~252
const userName = parsedData.name ? parsedData.name : "this person";
let prompt = `You are ${userName}'s personal AI companion...`
```

**Problem:** The name is treated as the user's name, not the AI companion's name.

**Solution:**
Add a dedicated `companion_name` field and inject it into the system prompt with explicit identity instructions.

```typescript
// New approach in constructDynamicSystemPrompt()
const companionName = parsedData.name || "SoulPrint";
let prompt = `Your name is ${companionName}. When someone asks your name, say "${companionName}".

You are ${companionName}, the personal AI companion for this user...`
```

---

### Phase 2: Real-Time Name Propagation
**Files:** `app/actions/soulprint-management.ts`, `app/dashboard/chat/chat-client.tsx`

**Current State:**
- `updateSoulPrintName()` updates the database but doesn't invalidate cached prompts
- `chat-client.tsx` loads name once at init

**Solution:**
1. Add cache invalidation in `updateSoulPrintName()`
2. Subscribe to soulprint changes in chat client
3. Re-construct system prompt when name changes

---

### Phase 3: Auto-Generated Name Logic
**Files:** `lib/soulprint/name-generator.ts` (NEW), `lib/soulprint/generator.ts`

**Algorithm:** Generate a meaningful name based on SoulPrint profile:

```typescript
// name-generator.ts (NEW FILE)

interface NameGenConfig {
  archetype: string;
  voice_vectors: VoiceVectors;
  identity_signature: string;
}

/**
 * Generates a human name that embodies the SoulPrint's essence
 * 
 * METHODOLOGY:
 * 1. Map archetype keywords to name "families"
 * 2. Use voice_vectors to select name "style" (short/punchy vs flowing)
 * 3. Optional: LLM call for creative naming
 * 
 * NAME FAMILIES (Based on Psychology/Etymology):
 * - Strategic/Analytical: Atlas, Nova, Sage, Quinn, Raven
 * - Warm/Empathetic: Maya, Luna, Aria, Eden, River
 * - Bold/Direct: Ace, Rex, Max, Blake, Storm
 * - Creative/Chaotic: Phoenix, Echo, Juno, Indie, Rebel
 * - Grounded/Stable: Oak, Stone, Bear, Terra, Anchor
 */

const NAME_FAMILIES = {
  strategic: ["Atlas", "Nova", "Sage", "Quinn", "Raven", "Orion", "Vega"],
  empathetic: ["Maya", "Luna", "Aria", "Eden", "River", "Iris", "Willow"],
  bold: ["Ace", "Rex", "Max", "Blake", "Storm", "Blaze", "Titan"],
  creative: ["Phoenix", "Echo", "Juno", "Indie", "Rebel", "Zephyr", "Pixel"],
  grounded: ["Oak", "Stone", "Bear", "Terra", "Anchor", "Ridge", "Cedar"],
  balanced: ["Alex", "Jordan", "Casey", "Morgan", "Drew", "Riley", "Sage"]
};

export function generateCompanionName(soulprint: NameGenConfig): string {
  const archetype = soulprint.archetype.toLowerCase();
  const warmth = soulprint.voice_vectors.tone_warmth;
  const speed = soulprint.voice_vectors.cadence_speed;
  
  // Determine family based on archetype keywords
  let family = 'balanced';
  if (/strateg|architect|analytic|logic/.test(archetype)) family = 'strategic';
  else if (/warm|empath|heal|nurtur|support/.test(archetype)) family = 'empathetic';
  else if (/bold|direct|ace|warrior|alpha/.test(archetype)) family = 'bold';
  else if (/creat|chaos|rebel|vision|innovat/.test(archetype)) family = 'creative';
  else if (/ground|stable|anchor|rock|steady/.test(archetype)) family = 'grounded';
  
  // Adjust for warmth override
  if (warmth === 'warm/empathetic' && family === 'bold') family = 'balanced';
  if (warmth === 'cold/analytical' && family === 'empathetic') family = 'strategic';
  
  const names = NAME_FAMILIES[family];
  
  // Use speed to pick short vs long names
  if (speed === 'rapid') {
    // Prefer short names (4 letters or less)
    const shortNames = names.filter(n => n.length <= 4);
    if (shortNames.length > 0) {
      return shortNames[Math.floor(Math.random() * shortNames.length)];
    }
  }
  
  // Random selection from family
  return names[Math.floor(Math.random() * names.length)];
}

// Optional: LLM-powered creative naming
export async function generateCreativeName(soulprint: SoulPrintData): Promise<string> {
  const prompt = `Given this personality profile:
Archetype: ${soulprint.archetype}
Identity: ${soulprint.identity_signature}
Tone: ${soulprint.voice_vectors.tone_warmth}
Speed: ${soulprint.voice_vectors.cadence_speed}

Generate ONE short, memorable human name (first name only, 3-8 letters) that embodies this personality. 
The name should feel like a real person, not a brand or AI name.
Respond with ONLY the name, nothing else.`;

  // Call LLM
  const response = await chatCompletion([{ role: 'user', content: prompt }]);
  return response.trim().split(' ')[0]; // Take first word only
}
```

---

### Phase 4: Chat Response Integration
**Files:** `lib/soulprint/soul-engine.ts`

**Enhancement:**
Add explicit name identity to system prompt construction:

```typescript
// soul-engine.ts - constructSystemPrompt()
async constructSystemPrompt(recentMessages: ChatMessage[]): Promise<string> {
  // Get current name from soulprint (may have been updated)
  const companionName = this.soulprint.name || "SoulPrint";
  
  let prompt = constructDynamicSystemPrompt(this.soulprint);
  
  // Inject explicit name identity (CRITICAL for "what's your name?" handling)
  const nameIdentity = `
## YOUR IDENTITY
Your name is ${companionName}. You ARE ${companionName}.
- When asked "what's your name?", respond: "I'm ${companionName}" or similar
- When asked who you are, incorporate your name naturally
- Sign messages with your name when appropriate
- Never say "I'm your AI companion" - say "I'm ${companionName}"
`;
  
  prompt = nameIdentity + prompt;
  
  // ... rest of method
}
```

---

### Phase 5: Database Schema Enhancement
**Files:** `supabase/migrations/xxx_add_companion_name.sql`

**Optional enhancement:** Store `companion_name` as top-level column for faster queries:

```sql
ALTER TABLE soulprints ADD COLUMN companion_name TEXT;

-- Backfill from soulprint_data JSON
UPDATE soulprints 
SET companion_name = soulprint_data->>'name'
WHERE soulprint_data->>'name' IS NOT NULL;

-- Index for faster lookups
CREATE INDEX idx_soulprints_companion_name ON soulprints(companion_name);
```

---

## Implementation Order

| Priority | Task | File(s) | Effort |
|----------|------|---------|--------|
| **P0** | Inject name identity into system prompt | `generator.ts` | 30 min |
| **P0** | Update SoulEngine to prepend name | `soul-engine.ts` | 30 min |
| **P1** | Create name generator utility | `name-generator.ts` (NEW) | 1 hr |
| **P1** | Auto-generate name on SoulPrint creation | `generator.ts` | 30 min |
| **P2** | Real-time name subscription in chat | `chat-client.tsx` | 1 hr |
| **P3** | Database schema optimization | Migration | 30 min |

---

## Testing Checklist

- [ ] Ask "What's your name?" → Should respond with actual name
- [ ] Ask "Who are you?" → Should incorporate name naturally
- [ ] Rename SoulPrint → Next message should use new name
- [ ] Skip naming during creation → Auto-name should be generated
- [ ] Auto-name matches personality profile
- [ ] Export includes correct name in header

---

## Files to Modify

1. **`lib/soulprint/generator.ts`**
   - Update `constructDynamicSystemPrompt()` to inject name identity
   - Add name generation on SoulPrint creation

2. **`lib/soulprint/soul-engine.ts`**
   - Prepend name identity block to all system prompts

3. **`lib/soulprint/name-generator.ts`** (NEW)
   - Name generation algorithm
   - Name family mappings

4. **`app/questionnaire/complete/page.tsx`**
   - Handle "skip naming" → auto-generate

5. **`app/actions/soulprint-management.ts`**
   - Ensure name updates propagate correctly

6. **`app/dashboard/chat/chat-client.tsx`**
   - Subscribe to name changes (optional real-time)

---

## Name Generation Philosophy

The auto-generated name should:
1. **Feel human** - Not "AI-47" or "SoulBot"
2. **Match personality** - Strategic archetype gets "Atlas", warm gets "Maya"
3. **Be memorable** - Short, pronounceable, distinctive
4. **Be gender-neutral** (by default) - User can change if desired
5. **Reference mythology/nature** - Adds depth without being pretentious

**Name Sources:**
- Greek/Roman mythology (Atlas, Phoenix, Luna)
- Nature elements (River, Storm, Oak)
- Cosmic references (Nova, Orion, Vega)
- Classic short names (Ace, Max, Quinn)

---

## Related Exports

When exporting chat history, the name should appear in the header:
```
SoulPrint Chat Export
Date: 1/20/2026
SoulPrint: [CompanionName] (e.g., "Sadie", "Atlas", "Nova")
```

Currently shows archetype ("Inquisitive Communicator"). Should show the actual name.
