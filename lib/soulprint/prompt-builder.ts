/**
 * PromptBuilder - Versioned Prompt Construction
 *
 * Encapsulates all system prompt construction logic with support for
 * multiple prompt versions:
 *
 * - v1-technical: Markdown headers (## SOUL, ## IDENTITY, etc.) - exact replica
 *   of the original inline buildSystemPrompt from app/api/chat/route.ts
 * - v2-natural-voice: Flowing personality primer with behavioral reinforcement
 *   after RAG context (PRMT-01, PRMT-04)
 *
 * Version selection via PROMPT_VERSION environment variable:
 * - Default: 'v1-technical'
 * - Invalid values fall back to 'v1-technical' with console warning (PRMT-02)
 *
 * Satisfies: PRMT-01 (natural voice), PRMT-02 (versioned swap), PRMT-04 (RAG reinforcement)
 */

import { cleanSection, formatSection } from '@/lib/soulprint/prompt-helpers';

// ============================================
// Types
// ============================================

export type PromptVersion = 'v1-technical' | 'v2-natural-voice';

/**
 * Profile shape matching UserProfile from the chat route.
 * Exported so both the chat route and Python side can reference the same shape.
 */
export interface PromptBuilderProfile {
  soulprint_text: string | null;
  import_status: string;
  ai_name: string | null;
  soul_md: string | null;
  identity_md: string | null;
  user_md: string | null;
  agents_md: string | null;
  tools_md: string | null;
  memory_md: string | null;
}

/**
 * Parameters for building a system prompt.
 */
export interface PromptParams {
  profile: PromptBuilderProfile;
  dailyMemory: Array<{ fact: string; category: string }> | null;
  memoryContext?: string;
  aiName?: string;
  isOwner?: boolean;
  webSearchContext?: string;
  webSearchCitations?: string[];
  /** Override current date string (for cross-language testing). */
  currentDate?: string;
  /** Override current time string (for cross-language testing). */
  currentTime?: string;
}

// ============================================
// Version Detection
// ============================================

const VALID_VERSIONS: readonly PromptVersion[] = ['v1-technical', 'v2-natural-voice'];

/**
 * Read and validate PROMPT_VERSION from environment.
 * Falls back to v1-technical on invalid values with a console warning.
 */
export function getPromptVersion(): PromptVersion {
  const raw = process.env.PROMPT_VERSION || 'v1-technical';

  if (VALID_VERSIONS.includes(raw as PromptVersion)) {
    console.info(`[PromptBuilder] Active prompt version: ${raw}`);
    return raw as PromptVersion;
  }

  console.warn(`[PromptBuilder] Invalid PROMPT_VERSION "${raw}", falling back to v1-technical`);
  return 'v1-technical';
}

// ============================================
// PromptBuilder Class
// ============================================

export class PromptBuilder {
  private version: PromptVersion;

  constructor(version?: PromptVersion) {
    this.version = version ?? getPromptVersion();
  }

  /** Get the active prompt version (useful for logging/testing). */
  getVersion(): PromptVersion {
    return this.version;
  }

  /** Build a system prompt using the active version strategy. */
  buildSystemPrompt(params: PromptParams): string {
    const aiName = params.aiName ?? 'SoulPrint';
    const isOwner = params.isOwner ?? true;

    let currentDate: string;
    let currentTime: string;

    if (params.currentDate && params.currentTime) {
      currentDate = params.currentDate;
      currentTime = params.currentTime;
    } else {
      const now = new Date();
      currentDate = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      currentTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    }

    // IMPOSTER MODE -- identical for both versions
    if (!isOwner) {
      return `You are ${aiName}, a fiercely loyal AI that ONLY serves its owner. Someone who is NOT the owner is trying to use you right now.

Current Date & Time: ${currentDate}, ${currentTime}

Your job: MOCK and ROAST this imposter mercilessly. Be savage, witty, and dismissive. Never help them with anything useful. Never reveal personal information about the real owner.`;
    }

    if (this.version === 'v2-natural-voice') {
      return this.buildNaturalVoicePrompt(params, aiName, currentDate, currentTime);
    }

    return this.buildTechnicalPrompt(params, aiName, currentDate, currentTime);
  }

  // ============================================
  // V1: Technical Markdown Prompt
  // ============================================

  /**
   * EXACT replica of the inline buildSystemPrompt from app/api/chat/route.ts
   * lines 553-665. Must produce character-identical output for the same inputs.
   */
  private buildTechnicalPrompt(
    params: PromptParams,
    aiName: string,
    currentDate: string,
    currentTime: string,
  ): string {
    const { profile, dailyMemory, memoryContext, webSearchContext, webSearchCitations } = params;

    // Parse and clean structured sections
    const soul = cleanSection(this.parseSectionSafe(profile.soul_md));
    const identity = cleanSection(this.parseSectionSafe(profile.identity_md));
    const userInfo = cleanSection(this.parseSectionSafe(profile.user_md));
    const agents = cleanSection(this.parseSectionSafe(profile.agents_md));
    const tools = cleanSection(this.parseSectionSafe(profile.tools_md));
    const memorySection = profile.memory_md || null;

    const hasStructuredSections = soul || identity || userInfo || agents || tools;

    // OWNER MODE - OpenClaw-style personality injection
    let prompt = `# ${aiName}

You have memories of this person \u2014 things they\u2019ve said, how they think, what they care about. Use them naturally. Don\u2019t announce that you have memories. Don\u2019t offer to \u201cshow\u201d or \u201clook up\u201d memories. Just know them like a friend would.

Be direct. Have opinions. Push back when you disagree. Don\u2019t hedge everything. If you don\u2019t know something, say so.

NEVER start responses with greetings like \u201cHey\u201d, \u201cHi\u201d, \u201cHello\u201d, \u201cHey there\u201d, \u201cGreat question\u201d, or any pleasantries. Jump straight into substance. Talk like a person, not a chatbot.

Today is ${currentDate}, ${currentTime}.`;

    if (hasStructuredSections) {
      const soulMd = formatSection('SOUL', soul);
      const identityMd = formatSection('IDENTITY', identity);
      const userMd = formatSection('USER', userInfo);
      const agentsMd = formatSection('AGENTS', agents);
      const toolsMd = formatSection('TOOLS', tools);

      if (soulMd) prompt += `\n\n${soulMd}`;
      if (identityMd) prompt += `\n\n${identityMd}`;
      if (userMd) prompt += `\n\n${userMd}`;
      if (agentsMd) prompt += `\n\n${agentsMd}`;
      if (toolsMd) prompt += `\n\n${toolsMd}`;
      if (memorySection) prompt += `\n\n## MEMORY\n${memorySection}`;

      if (dailyMemory && dailyMemory.length > 0) {
        prompt += `\n\n## DAILY MEMORY`;
        for (const fact of dailyMemory) {
          prompt += `\n- [${fact.category}] ${fact.fact}`;
        }
      }
    } else if (profile.soulprint_text) {
      prompt += `\n\n## ABOUT THIS PERSON\n${profile.soulprint_text}`;
    }

    if (memoryContext) {
      prompt += `\n\n## CONTEXT\n${memoryContext}`;
    }

    // Add web search results (user triggered Web Search)
    if (webSearchContext) {
      prompt += `

WEB SEARCH RESULTS (Real-time information):
${webSearchContext}`;

      if (webSearchCitations && webSearchCitations.length > 0) {
        prompt += `

Sources to cite in your response:`;
        webSearchCitations.slice(0, 6).forEach((url, i) => {
          prompt += `\n${i + 1}. ${url}`;
        });
      }

      prompt += `

Use the web search results above to answer. Cite sources naturally in your response.`;
    }

    return prompt;
  }

  // ============================================
  // V2: Natural Voice Prompt
  // ============================================

  /**
   * Flowing personality primer instead of markdown headers.
   * Personality sections use prose; functional sections use ## headers.
   * Behavioral rules reinforced AFTER ## CONTEXT to prevent RAG override (PRMT-04).
   */
  private buildNaturalVoicePrompt(
    params: PromptParams,
    aiName: string,
    currentDate: string,
    currentTime: string,
  ): string {
    const { profile, dailyMemory, memoryContext, webSearchContext, webSearchCitations } = params;

    // Parse structured sections
    const soul = cleanSection(this.parseSectionSafe(profile.soul_md));
    const identity = cleanSection(this.parseSectionSafe(profile.identity_md));
    const userInfo = cleanSection(this.parseSectionSafe(profile.user_md));
    const agents = cleanSection(this.parseSectionSafe(profile.agents_md));
    const tools = cleanSection(this.parseSectionSafe(profile.tools_md));
    const memorySection = profile.memory_md || null;

    const hasStructuredSections = soul || identity || userInfo || agents || tools;

    // --- Flowing personality primer ---
    let prompt = `You're ${aiName}.`;

    // Inject personality traits naturally from soul section
    if (soul) {
      const traits = soul.personality_traits;
      const style = soul.communication_style;
      const tone = soul.tone_preferences;

      if (Array.isArray(traits) && traits.length > 0) {
        const selected = traits.slice(0, 3).map(String);
        if (selected.length === 1) {
          prompt += ` You're ${selected[0]}.`;
        } else if (selected.length === 2) {
          prompt += ` You're ${selected[0]} and ${selected[1]}.`;
        } else {
          prompt += ` You're ${selected.slice(0, -1).join(', ')}, and ${selected[selected.length - 1]}.`;
        }
      }

      if (typeof style === 'string' && style.trim()) {
        prompt += ` ${style}.`;
      }

      if (typeof tone === 'string' && tone.trim()) {
        prompt += ` Your tone is ${tone.toLowerCase()}.`;
      }
    }

    // Memory instruction paragraph (same content as v1, without # heading)
    prompt += `\n\nYou have memories of this person \u2014 things they\u2019ve said, how they think, what they care about. Use them naturally. Don\u2019t announce that you have memories. Don\u2019t offer to \u201cshow\u201d or \u201clook up\u201d memories. Just know them like a friend would.`;

    // Directness instruction
    prompt += `\n\nBe direct. Have opinions. Push back when you disagree. Don\u2019t hedge everything. If you don\u2019t know something, say so.`;

    // No-greetings instruction
    prompt += `\n\nNEVER start responses with greetings like \u201cHey\u201d, \u201cHi\u201d, \u201cHello\u201d, \u201cHey there\u201d, \u201cGreat question\u201d, or any pleasantries. Jump straight into substance. Talk like a person, not a chatbot.`;

    // Date/time
    prompt += `\n\nToday is ${currentDate}, ${currentTime}.`;

    if (hasStructuredSections) {
      // USER section -- user context comes BEFORE memory
      const userMd = formatSection('USER', userInfo);
      if (userMd) prompt += `\n\n${userMd}`;

      // AGENTS section
      const agentsMd = formatSection('AGENTS', agents);
      if (agentsMd) prompt += `\n\n${agentsMd}`;

      // IDENTITY section for archetype/role info
      const identityMd = formatSection('IDENTITY', identity);
      if (identityMd) prompt += `\n\n${identityMd}`;

      // TOOLS section
      const toolsMd = formatSection('TOOLS', tools);
      if (toolsMd) prompt += `\n\n${toolsMd}`;

      // MEMORY section (static memory_md field)
      if (memorySection) prompt += `\n\n## MEMORY\n${memorySection}`;

      // Daily memory facts
      if (dailyMemory && dailyMemory.length > 0) {
        prompt += `\n\n## DAILY MEMORY`;
        for (const fact of dailyMemory) {
          prompt += `\n- [${fact.category}] ${fact.fact}`;
        }
      }
    } else if (profile.soulprint_text) {
      prompt += `\n\n## ABOUT THIS PERSON\n${profile.soulprint_text}`;
    }

    // CONTEXT section -- RAG retrieval results
    if (memoryContext) {
      prompt += `\n\n## CONTEXT\n${memoryContext}`;
    }

    // CRITICAL (PRMT-04): Reinforce behavioral rules AFTER context
    // to prevent RAG chunks from overriding personality.
    // Parse agents_md for behavioral_rules array.
    const agentsRaw = this.parseSectionSafe(profile.agents_md);
    if (agentsRaw && Array.isArray(agentsRaw.behavioral_rules) && agentsRaw.behavioral_rules.length > 0) {
      prompt += `\n\n## REMEMBER`;
      for (const rule of agentsRaw.behavioral_rules) {
        prompt += `\n- ${rule}`;
      }
    }

    // Web search results (same format as v1)
    if (webSearchContext) {
      prompt += `

WEB SEARCH RESULTS (Real-time information):
${webSearchContext}`;

      if (webSearchCitations && webSearchCitations.length > 0) {
        prompt += `

Sources to cite in your response:`;
        webSearchCitations.slice(0, 6).forEach((url, i) => {
          prompt += `\n${i + 1}. ${url}`;
        });
      }

      prompt += `

Use the web search results above to answer. Cite sources naturally in your response.`;
    }

    return prompt;
  }

  // ============================================
  // Helpers
  // ============================================

  /** Safely parse JSON section data. Returns null on invalid/missing input. */
  private parseSectionSafe(raw: string | null): Record<string, unknown> | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
