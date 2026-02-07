/**
 * Tests for prompt-helpers.ts
 * TDD: These tests should FAIL initially, then PASS after implementation
 */

import { describe, it, expect } from 'vitest';
import { cleanSection, formatSection } from '@/lib/soulprint/prompt-helpers';

describe('cleanSection', () => {
  it('removes "not enough data" strings from object', () => {
    const input = {
      name: 'Drew',
      location: 'not enough data',
      occupation: 'Engineer',
    };
    const result = cleanSection(input);
    expect(result).toEqual({
      name: 'Drew',
      occupation: 'Engineer',
    });
  });

  it('removes empty arrays from object', () => {
    const input = {
      interests: [],
      relationships: ['friend named Alex'],
      name: 'Drew',
    };
    const result = cleanSection(input);
    expect(result).toEqual({
      relationships: ['friend named Alex'],
      name: 'Drew',
    });
  });

  it('returns null when all values are placeholder/empty', () => {
    const input = {
      name: 'not enough data',
      location: 'not enough data',
      interests: [],
    };
    const result = cleanSection(input);
    expect(result).toBeNull();
  });

  it('preserves valid arrays and strings', () => {
    const input = {
      personality_traits: ['curious', 'direct'],
      communication_style: 'Casual and concise',
    };
    const result = cleanSection(input);
    expect(result).toEqual(input);
  });

  it('handles case-insensitive "Not Enough Data" / "NOT ENOUGH DATA"', () => {
    const input = {
      name: 'Not Enough Data',
      location: 'NOT ENOUGH DATA',
    };
    const result = cleanSection(input);
    expect(result).toBeNull();
  });

  it('filters empty strings and whitespace-only strings', () => {
    const input = {
      name: 'Drew',
      location: '',
      occupation: '   ',
    };
    const result = cleanSection(input);
    expect(result).toEqual({
      name: 'Drew',
    });
  });

  it('filters arrays containing only "not enough data" items', () => {
    const input = {
      traits: ['not enough data'],
      name: 'Drew',
    };
    const result = cleanSection(input);
    expect(result).toEqual({
      name: 'Drew',
    });
  });

  it('returns null for null input', () => {
    const result = cleanSection(null);
    expect(result).toBeNull();
  });

  it('filters arrays with mixed "not enough data" and valid items', () => {
    const input = {
      interests: ['AI', 'not enough data', 'crypto'],
      name: 'Drew',
    };
    const result = cleanSection(input);
    expect(result).toEqual({
      interests: ['AI', 'crypto'],
      name: 'Drew',
    });
  });
});

describe('formatSection', () => {
  it('formats string values with bold labels', () => {
    const input = {
      communication_style: 'Direct and casual',
    };
    const result = formatSection('Communication Style & Personality', input);
    expect(result).toContain('**Communication Style:** Direct and casual');
  });

  it('formats arrays as bullet lists', () => {
    const input = {
      interests: ['AI', 'crypto', 'privacy'],
    };
    const result = formatSection('About This Person', input);
    expect(result).toContain('**Interests:**');
    expect(result).toContain('- AI');
    expect(result).toContain('- crypto');
    expect(result).toContain('- privacy');
  });

  it('converts underscore_keys to Title Case labels', () => {
    const input = {
      tone_preferences: 'Casual',
    };
    const result = formatSection('Test Section', input);
    expect(result).toContain('**Tone Preferences:**');
  });

  it('includes section heading', () => {
    const input = {
      communication_style: 'Direct',
    };
    const result = formatSection('Communication Style & Personality', input);
    expect(result).toMatch(/^## Communication Style & Personality/);
  });

  it('never includes "not enough data" in output', () => {
    const input = {
      name: 'not enough data',
      occupation: 'Engineer',
    };
    const result = formatSection('Test', input);
    expect(result).not.toContain('not enough data');
    expect(result).toContain('Engineer');
  });

  it('returns empty string for null input', () => {
    const result = formatSection('Test', null);
    expect(result).toBe('');
  });

  it('returns empty string for empty object input', () => {
    const result = formatSection('Test', {});
    expect(result).toBe('');
  });

  it('handles multi-word snake_case keys correctly', () => {
    const input = {
      personality_traits: ['curious'],
      behavioral_rules: ['be direct'],
    };
    const result = formatSection('Test Section', input);
    expect(result).toContain('**Personality Traits:**');
    expect(result).toContain('**Behavioral Rules:**');
  });

  it('produces deterministic output (same input = same output)', () => {
    const input = {
      communication_style: 'Direct',
      personality_traits: ['curious', 'analytical'],
    };
    const result1 = formatSection('Test', input);
    const result2 = formatSection('Test', input);
    expect(result1).toBe(result2);
  });

  it('filters "not enough data" from arrays defensively', () => {
    const input = {
      traits: ['curious', 'not enough data', 'direct'],
    };
    const result = formatSection('Test', input);
    expect(result).not.toContain('not enough data');
    expect(result).toContain('- curious');
    expect(result).toContain('- direct');
  });

  it('skips empty arrays', () => {
    const input = {
      name: 'Drew',
      interests: [],
    };
    const result = formatSection('Test', input);
    expect(result).toContain('**Name:**');
    expect(result).not.toContain('**Interests:**');
  });

  it('skips whitespace-only strings', () => {
    const input = {
      name: 'Drew',
      location: '   ',
    };
    const result = formatSection('Test', input);
    expect(result).toContain('**Name:**');
    expect(result).not.toContain('**Location:**');
  });
});
