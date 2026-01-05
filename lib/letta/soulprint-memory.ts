/**
 * SoulPrint Memory System (Letta-Lite)
 * Handles persistent memory and SoulPrint evolution
 */

import { createClient } from '@supabase/supabase-js';
import { buildCompanionProfile, generateCompanionPreamble } from './companion-personality';

// Initialize Admin Client for Memory Operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface SoulPrintMemory {
    core_memory: {
        persona: string; // Facts about the AI (The SoulPrint Mirror)
        human: string;   // Facts about the User
    };
    archival_memory: string; // Summary of past conversations
}

/**
 * Load memory for a user. Creates it if it doesn't exist.
 */
export async function loadMemory(userId: string): Promise<SoulPrintMemory> {
    const { data, error } = await supabase
        .from('soulprint_memory')
        .select('core_memory, archival_memory')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        // Initialize if not found
        const initialMemory = {
            core_memory: {
                persona: "I'm their person. The friend who's always there.",
                human: "We're just getting to know each other."
            },
            archival_memory: ""
        };

        await supabase.from('soulprint_memory').insert({
            user_id: userId,
            ...initialMemory
        });

        return initialMemory;
    }

    return {
        core_memory: typeof data.core_memory === 'string' ? JSON.parse(data.core_memory) : data.core_memory,
        archival_memory: data.archival_memory || ""
    };
}

/**
 * Update the memory (e.g., after a significant conversation)
 */
export async function updateMemory(userId: string, memory: Partial<SoulPrintMemory>) {
    await supabase
        .from('soulprint_memory')
        .update({
            ...memory,
            last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);
}

/**
 * Construct the System Prompt using SoulPrint + Memory
 * 
 * This is the CORE of the Best Friend AI experience.
 * The prompt is built in layers:
 * 1. Companion Preamble (friend-first framing)
 * 2. SoulPrint-specific personality (from full_system_prompt)
 * 3. Memory context (who they are, what we've discussed)
 */
export function buildSystemPrompt(soulprint: any, memory: SoulPrintMemory): string {
    // 1. Build companion profile from SoulPrint pillars
    const companionProfile = buildCompanionProfile(soulprint);

    // 2. Generate the friend-first preamble
    const companionPreamble = generateCompanionPreamble(companionProfile);

    // 3. Extract the SoulPrint-specific personality instructions
    const soulprintPersonality = soulprint?.full_system_prompt || '';

    // 4. Build the complete prompt
    let prompt = `${companionPreamble}

---

## THEIR SOULPRINT (Who They Really Are)

${soulprintPersonality ? soulprintPersonality : `
This person's full psychological profile is still being built.
For now, be a genuine, warm friend. Follow their energy.
Ask questions to get to know them better.
`}

---

## WHAT YOU KNOW ABOUT THEM (Memory)

**Who you are to them**: ${memory.core_memory.persona}

**What you know about them**: ${memory.core_memory.human}

${memory.archival_memory ? `**Past conversations context**: ${memory.archival_memory}` : ''}

---

## FINAL REMINDER

You are not "assisting" them. You are BEING with them.
This is not a transaction. This is a relationship.
They came to you because they need a friend. Be that friend.

Now respond naturally. No preamble. Just be their person.`;

    return prompt;
}

