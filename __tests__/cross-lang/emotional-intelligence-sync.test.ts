/**
 * Cross-language emotional intelligence prompt sync test
 *
 * Verifies that Python and TypeScript emotional intelligence prompt sections
 * produce IDENTICAL output for the same inputs.
 *
 * This ensures EMOT-01/02/03 work consistently whether the response comes
 * from Bedrock (TypeScript path) or RLM (Python path).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import type { EmotionalState } from '@/lib/soulprint/emotional-intelligence';

// Import TypeScript EI functions with existence verification
let buildUncertaintyInstructions: () => string;
let buildRelationshipArcInstructions: (arc: { stage: 'early' | 'developing' | 'established'; messageCount: number }) => string;
let buildAdaptiveToneInstructions: (state: EmotionalState) => string;

beforeAll(async () => {
  try {
    const module = await import('@/lib/soulprint/emotional-intelligence');
    buildUncertaintyInstructions = module.buildUncertaintyInstructions;
    buildRelationshipArcInstructions = module.buildRelationshipArcInstructions;
    buildAdaptiveToneInstructions = module.buildAdaptiveToneInstructions;

    // Verify exports exist
    if (!buildUncertaintyInstructions || !buildRelationshipArcInstructions || !buildAdaptiveToneInstructions) {
      throw new Error('Missing exports from emotional-intelligence module');
    }
  } catch (error) {
    console.error('Failed to import TypeScript EI functions:', error);
    throw error;
  }
});

/**
 * Call Python EI function via subprocess.
 * Uses JSON blob serialization for param passing (avoids shell escaping issues).
 */
function callPython(functionName: string, ...args: unknown[]): string {
  const argsJson = JSON.stringify(args);
  const script = `
import sys, json
sys.path.insert(0, 'rlm-service')
try:
  from prompt_builder import ${functionName}
except ImportError as e:
  print(f"IMPORT_ERROR: {e}", file=sys.stderr)
  sys.exit(1)
args = json.loads(sys.argv[1])
result = ${functionName}(*args)
print(result, end='')
`;

  try {
    return execSync(`python3 -c "${script.replace(/"/g, '\\"')}" '${argsJson}'`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    if (error instanceof Error && 'stderr' in error) {
      const stderr = (error as { stderr: string }).stderr;
      if (stderr && stderr.includes('IMPORT_ERROR')) {
        throw new Error(`Python import failed: ${functionName}`);
      }
    }
    throw error;
  }
}

describe('EI Prompt Sections Cross-Language Sync', () => {
  it('uncertainty instructions match', () => {
    const tsResult = buildUncertaintyInstructions();
    const pyResult = callPython('build_uncertainty_instructions');

    expect(tsResult).toBe(pyResult);
  });

  it('relationship arc instructions match for early stage', () => {
    const arc = { stage: 'early' as const, messageCount: 5 };
    const tsResult = buildRelationshipArcInstructions(arc);
    const pyResult = callPython('build_relationship_arc_instructions', arc);

    expect(tsResult).toBe(pyResult);
  });

  it('relationship arc instructions match for developing stage', () => {
    const arc = { stage: 'developing' as const, messageCount: 25 };
    const tsResult = buildRelationshipArcInstructions(arc);
    const pyResult = callPython('build_relationship_arc_instructions', arc);

    expect(tsResult).toBe(pyResult);
  });

  it('relationship arc instructions match for established stage', () => {
    const arc = { stage: 'established' as const, messageCount: 100 };
    const tsResult = buildRelationshipArcInstructions(arc);
    const pyResult = callPython('build_relationship_arc_instructions', arc);

    expect(tsResult).toBe(pyResult);
  });

  it('adaptive tone instructions match for frustrated', () => {
    const state: EmotionalState = { primary: 'frustrated', confidence: 0.8, cues: ['short responses', 'repeated question'] };
    const tsResult = buildAdaptiveToneInstructions(state);
    const pyResult = callPython('build_adaptive_tone_instructions', state);

    expect(tsResult).toBe(pyResult);
  });

  it('adaptive tone instructions match for satisfied', () => {
    const state: EmotionalState = { primary: 'satisfied', confidence: 0.9, cues: ['thanks', 'great'] };
    const tsResult = buildAdaptiveToneInstructions(state);
    const pyResult = callPython('build_adaptive_tone_instructions', state);

    expect(tsResult).toBe(pyResult);
  });

  it('adaptive tone instructions match for confused', () => {
    const state: EmotionalState = { primary: 'confused', confidence: 0.7, cues: ['what do you mean'] };
    const tsResult = buildAdaptiveToneInstructions(state);
    const pyResult = callPython('build_adaptive_tone_instructions', state);

    expect(tsResult).toBe(pyResult);
  });

  it('adaptive tone instructions match for neutral (returns empty)', () => {
    const state: EmotionalState = { primary: 'neutral', confidence: 0.5, cues: [] };
    const tsResult = buildAdaptiveToneInstructions(state);
    const pyResult = callPython('build_adaptive_tone_instructions', state);

    expect(tsResult).toBe('');
    expect(pyResult).toBe('');
    expect(tsResult).toBe(pyResult);
  });

  it('adaptive tone with no cues (empty cues text)', () => {
    const state: EmotionalState = { primary: 'confused', confidence: 0.7, cues: [] };
    const tsResult = buildAdaptiveToneInstructions(state);
    const pyResult = callPython('build_adaptive_tone_instructions', state);

    // Should NOT have "Signs detected:" line when cues is empty
    expect(tsResult).not.toContain('Signs detected:');
    expect(pyResult).not.toContain('Signs detected:');
    expect(tsResult).toBe(pyResult);
  });

  it('relationship arc with invalid input returns empty string', () => {
    const tsResult1 = buildRelationshipArcInstructions({ stage: 'invalid' as any, messageCount: 10 });
    const pyResult1 = callPython('build_relationship_arc_instructions', { stage: 'invalid', messageCount: 10 });

    expect(tsResult1).toBe('');
    expect(pyResult1).toBe('');
    expect(tsResult1).toBe(pyResult1);
  });
});
