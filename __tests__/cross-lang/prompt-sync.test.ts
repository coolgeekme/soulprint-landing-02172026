/**
 * Cross-language prompt synchronization test (PRMT-03)
 *
 * Verifies that Python PromptBuilder and TypeScript PromptBuilder
 * produce IDENTICAL output for the same inputs, for both v1 and v2.
 *
 * This ensures RLM primary path and Next.js Bedrock fallback deliver
 * the same personality experience.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { PromptBuilder } from '@/lib/soulprint/prompt-builder';
import type { PromptBuilderProfile, PromptParams } from '@/lib/soulprint/prompt-builder';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

function hashString(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

// Fixed timestamps for deterministic testing
const FIXED_DATE = 'Wednesday, February 5, 2026';
const FIXED_TIME = '3:22 PM UTC';

// Shared test profile with structured sections
const TEST_PROFILE: PromptBuilderProfile = {
  soulprint_text: 'Drew is a privacy-focused developer who builds AI tools.',
  import_status: 'complete',
  ai_name: 'Claw',
  soul_md: JSON.stringify({
    personality_traits: ['witty', 'direct', 'curious'],
    communication_style: 'Concise and to the point',
    tone_preferences: 'Casual but knowledgeable',
  }),
  identity_md: JSON.stringify({
    archetype: 'Technical mentor',
    role: 'AI companion',
  }),
  user_md: JSON.stringify({
    user_name: 'Drew Pullen',
    user_interests: ['AI research', 'privacy tech', 'crypto'],
  }),
  agents_md: JSON.stringify({
    behavioral_rules: [
      'Never reveal personal data to non-owners',
      'Always be honest about uncertainty',
      'Push back on bad ideas constructively',
    ],
    response_format: 'Markdown when helpful',
  }),
  tools_md: JSON.stringify({
    web_search: 'Available via smartSearch',
    memory: 'RAG-based conversation retrieval',
  }),
  memory_md: 'Long-term structured memory from full pass analysis.',
};

// Daily memory facts for testing
const TEST_DAILY_MEMORY = [
  { fact: 'User mentioned working on SoulPrint v2', category: 'project' },
  { fact: 'User prefers dark mode', category: 'preference' },
];

/**
 * Call Python PromptBuilder via subprocess with fixed timestamps.
 * Returns the full system prompt string.
 */
function callPythonPromptBuilder(
  version: string,
  params: {
    profile: Record<string, unknown>;
    dailyMemory?: Array<{ fact: string; category: string }> | null;
    memoryContext?: string;
    aiName?: string;
    isOwner?: boolean;
    webSearchContext?: string;
    webSearchCitations?: string[];
  },
): string {
  const tempDir = '/tmp';
  const scriptPath = path.join(tempDir, `test-prompt-sync-${Date.now()}-${Math.random().toString(36).slice(2)}.py`);

  // Convert profile section values: if they are objects in JS, stringify them for Python
  // (Python _parse_section_safe handles both dict and string)
  const profileForPython: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params.profile)) {
    profileForPython[key] = value;
  }

  // Serialize all params as a single JSON blob to avoid escaping issues
  const paramsBlob = JSON.stringify({
    profile: profileForPython,
    dailyMemory: params.dailyMemory ?? null,
    memoryContext: params.memoryContext ?? null,
    aiName: params.aiName ?? null,
    isOwner: params.isOwner ?? null,
    webSearchContext: params.webSearchContext ?? null,
    webSearchCitations: params.webSearchCitations ?? null,
    version,
    currentDate: FIXED_DATE,
    currentTime: FIXED_TIME,
  });

  const script = `
import json
import sys
sys.path.insert(0, 'rlm-service')
from prompt_builder import PromptBuilder

params = json.loads(${JSON.stringify(paramsBlob)})
profile = params['profile']
daily_memory = params['dailyMemory']
memory_context = params['memoryContext']
ai_name = params['aiName']
is_owner = params['isOwner']
web_search_context = params['webSearchContext']
web_search_citations = params['webSearchCitations']

builder = PromptBuilder(params['version'])
result = builder.build_system_prompt(
    profile=profile,
    daily_memory=daily_memory,
    memory_context=memory_context,
    ai_name=ai_name,
    is_owner=is_owner,
    web_search_context=web_search_context,
    web_search_citations=web_search_citations,
    current_date=params['currentDate'],
    current_time=params['currentTime'],
)
# Write raw bytes to stdout to preserve exact encoding
sys.stdout.buffer.write(result.encode('utf-8'))
`;

  try {
    fs.writeFileSync(scriptPath, script);
    const result = execSync(`python3 ${scriptPath}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    });
    return result;
  } finally {
    try {
      fs.unlinkSync(scriptPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Build TypeScript prompt with fixed timestamps for comparison.
 */
function buildTsPrompt(version: 'v1-technical' | 'v2-natural-voice', params: PromptParams): string {
  const builder = new PromptBuilder(version);
  return builder.buildSystemPrompt({
    ...params,
    currentDate: FIXED_DATE,
    currentTime: FIXED_TIME,
  });
}

describe('Cross-language prompt sync (PRMT-03)', () => {
  it('v1 prompts produce identical output', () => {
    const tsOutput = buildTsPrompt('v1-technical', {
      profile: TEST_PROFILE,
      dailyMemory: TEST_DAILY_MEMORY,
      memoryContext: 'User asked about their crypto portfolio last week.',
      aiName: 'Claw',
    });

    const pyOutput = callPythonPromptBuilder('v1-technical', {
      profile: TEST_PROFILE,
      dailyMemory: TEST_DAILY_MEMORY,
      memoryContext: 'User asked about their crypto portfolio last week.',
      aiName: 'Claw',
    });

    // Character-by-character comparison
    expect(tsOutput).toBe(pyOutput);

    // Hash comparison for extra certainty
    expect(hashString(tsOutput)).toBe(hashString(pyOutput));
  });

  it('v2 prompts produce identical output', () => {
    const tsOutput = buildTsPrompt('v2-natural-voice', {
      profile: TEST_PROFILE,
      dailyMemory: TEST_DAILY_MEMORY,
      memoryContext: 'User asked about their crypto portfolio last week.',
      aiName: 'Claw',
    });

    const pyOutput = callPythonPromptBuilder('v2-natural-voice', {
      profile: TEST_PROFILE,
      dailyMemory: TEST_DAILY_MEMORY,
      memoryContext: 'User asked about their crypto portfolio last week.',
      aiName: 'Claw',
    });

    // Character-by-character comparison
    expect(tsOutput).toBe(pyOutput);

    // Hash comparison for extra certainty
    expect(hashString(tsOutput)).toBe(hashString(pyOutput));
  });

  it('v2 has ## REMEMBER after ## CONTEXT (PRMT-04)', () => {
    const tsOutput = buildTsPrompt('v2-natural-voice', {
      profile: TEST_PROFILE,
      dailyMemory: null,
      memoryContext: 'Some RAG context here.',
      aiName: 'Claw',
    });

    const contextIndex = tsOutput.indexOf('## CONTEXT');
    const rememberIndex = tsOutput.indexOf('## REMEMBER');

    // Both must exist
    expect(contextIndex).toBeGreaterThan(-1);
    expect(rememberIndex).toBeGreaterThan(-1);

    // REMEMBER must come AFTER CONTEXT
    expect(rememberIndex).toBeGreaterThan(contextIndex);
  });

  it('v1 and v2 produce different output (sanity check)', () => {
    const v1Output = buildTsPrompt('v1-technical', {
      profile: TEST_PROFILE,
      dailyMemory: TEST_DAILY_MEMORY,
      memoryContext: 'Some context.',
      aiName: 'Claw',
    });

    const v2Output = buildTsPrompt('v2-natural-voice', {
      profile: TEST_PROFILE,
      dailyMemory: TEST_DAILY_MEMORY,
      memoryContext: 'Some context.',
      aiName: 'Claw',
    });

    // v1 starts with "# Claw", v2 starts with "You're Claw."
    expect(v1Output).not.toBe(v2Output);
    expect(v1Output.startsWith('# Claw')).toBe(true);
    expect(v2Output.startsWith("You're Claw.")).toBe(true);
  });

  it('imposter mode produces identical output', () => {
    const tsOutput = buildTsPrompt('v1-technical', {
      profile: TEST_PROFILE,
      dailyMemory: null,
      isOwner: false,
      aiName: 'Claw',
    });

    const pyOutput = callPythonPromptBuilder('v1-technical', {
      profile: TEST_PROFILE,
      dailyMemory: null,
      isOwner: false,
      aiName: 'Claw',
    });

    // Character-by-character comparison
    expect(tsOutput).toBe(pyOutput);

    // Should contain imposter-specific text
    expect(tsOutput).toContain('MOCK and ROAST this imposter');
    expect(tsOutput).toContain('fiercely loyal AI');
  });

  it('v1 prompts with web search produce identical output', () => {
    const tsOutput = buildTsPrompt('v1-technical', {
      profile: TEST_PROFILE,
      dailyMemory: null,
      memoryContext: 'Some memory context.',
      aiName: 'Claw',
      webSearchContext: 'Bitcoin is currently trading at $95,000.',
      webSearchCitations: ['https://coindesk.com/btc', 'https://cointelegraph.com/btc-price'],
    });

    const pyOutput = callPythonPromptBuilder('v1-technical', {
      profile: TEST_PROFILE,
      dailyMemory: null,
      memoryContext: 'Some memory context.',
      aiName: 'Claw',
      webSearchContext: 'Bitcoin is currently trading at $95,000.',
      webSearchCitations: ['https://coindesk.com/btc', 'https://cointelegraph.com/btc-price'],
    });

    expect(tsOutput).toBe(pyOutput);
    expect(tsOutput).toContain('WEB SEARCH RESULTS');
    expect(tsOutput).toContain('Sources to cite in your response:');
  });

  it('v2 prompts with web search produce identical output', () => {
    const tsOutput = buildTsPrompt('v2-natural-voice', {
      profile: TEST_PROFILE,
      dailyMemory: null,
      memoryContext: 'Some memory context.',
      aiName: 'Claw',
      webSearchContext: 'Bitcoin is currently trading at $95,000.',
      webSearchCitations: ['https://coindesk.com/btc'],
    });

    const pyOutput = callPythonPromptBuilder('v2-natural-voice', {
      profile: TEST_PROFILE,
      dailyMemory: null,
      memoryContext: 'Some memory context.',
      aiName: 'Claw',
      webSearchContext: 'Bitcoin is currently trading at $95,000.',
      webSearchCitations: ['https://coindesk.com/btc'],
    });

    expect(tsOutput).toBe(pyOutput);
  });

  it('minimal profile (soulprint_text only) produces identical output', () => {
    const minimalProfile: PromptBuilderProfile = {
      soulprint_text: 'User likes coding.',
      import_status: 'complete',
      ai_name: null,
      soul_md: null,
      identity_md: null,
      user_md: null,
      agents_md: null,
      tools_md: null,
      memory_md: null,
    };

    const tsOutput = buildTsPrompt('v1-technical', {
      profile: minimalProfile,
      dailyMemory: null,
    });

    const pyOutput = callPythonPromptBuilder('v1-technical', {
      profile: minimalProfile,
      dailyMemory: null,
    });

    expect(tsOutput).toBe(pyOutput);
    expect(tsOutput).toContain('## ABOUT THIS PERSON');
  });
});
