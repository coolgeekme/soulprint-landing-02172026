/**
 * Quality Scoring Orchestrator
 *
 * Coordinates quality judge execution across all soulprint sections,
 * normalizes scores to 0-100 integer range, and provides utility functions
 * for quality threshold checks.
 *
 * Phase 4: Quality Scoring - Orchestration layer for comprehensive scoring
 */

import {
  CompletenessJudge,
  CoherenceJudge,
  SpecificityJudge,
} from './quality-judges';

// ============================================
// Type Definitions
// ============================================

export interface SectionQualityScores {
  completeness: number; // 0-100
  coherence: number;    // 0-100
  specificity: number;  // 0-100
}

export interface QualityBreakdown {
  soul: SectionQualityScores;
  identity: SectionQualityScores;
  user: SectionQualityScores;
  agents: SectionQualityScores;
  tools: SectionQualityScores;
}

export type SectionType = 'soul' | 'identity' | 'user' | 'agents' | 'tools';

export interface SoulprintProfile {
  soul_md: string | null;
  identity_md: string | null;
  user_md: string | null;
  agents_md: string | null;
  tools_md: string | null;
}

export interface LowQualitySection {
  section: SectionType;
  metric: 'completeness' | 'coherence' | 'specificity';
  score: number;
}

// ============================================
// Section Scoring
// ============================================

/**
 * Score a single soulprint section on all three quality dimensions.
 *
 * Runs all three judges in parallel and normalizes their 0.0-1.0 scores
 * to 0-100 integer range for storage in the database.
 *
 * @param sectionType - The section being scored (soul, identity, user, agents, tools)
 * @param content - The markdown content of the section
 * @returns Scores for completeness, coherence, and specificity (0-100)
 */
export async function scoreSoulprintSection(
  sectionType: SectionType,
  content: string
): Promise<SectionQualityScores> {
  const sectionName = sectionType.toUpperCase();

  // Instantiate all three judges
  const completenessJudge = new CompletenessJudge();
  const coherenceJudge = new CoherenceJudge();
  const specificityJudge = new SpecificityJudge();

  // Run all three judges in parallel
  const [completenessResult, coherenceResult, specificityResult] = await Promise.all([
    completenessJudge.score({
      section_name: sectionName,
      section_content: content,
      section_type: sectionType,
    }),
    coherenceJudge.score({
      section_name: sectionName,
      section_content: content,
      section_type: sectionType,
    }),
    specificityJudge.score({
      section_name: sectionName,
      section_content: content,
      section_type: sectionType,
    }),
  ]);

  // Normalize 0.0-1.0 scores to 0-100 integers
  const normalize = (value: number): number => {
    return Math.round(Math.min(100, Math.max(0, value * 100)));
  };

  return {
    completeness: normalize(completenessResult.value),
    coherence: normalize(coherenceResult.value),
    specificity: normalize(specificityResult.value),
  };
}

// ============================================
// Full Profile Scoring
// ============================================

/**
 * Calculate quality breakdown for all five soulprint sections.
 *
 * Scores all 5 sections in parallel. Each section scores 3 dimensions in parallel
 * internally, so this is effectively 15 parallel LLM calls.
 *
 * For null/empty sections, returns zero scores (0, 0, 0) for all dimensions.
 *
 * @param profile - User profile with all five section markdown fields
 * @returns Complete quality breakdown for all sections
 */
export async function calculateQualityBreakdown(
  profile: SoulprintProfile
): Promise<QualityBreakdown> {
  // Score all sections in parallel
  const [soul, identity, user, agents, tools] = await Promise.all([
    profile.soul_md && profile.soul_md.trim()
      ? scoreSoulprintSection('soul', profile.soul_md)
      : { completeness: 0, coherence: 0, specificity: 0 },

    profile.identity_md && profile.identity_md.trim()
      ? scoreSoulprintSection('identity', profile.identity_md)
      : { completeness: 0, coherence: 0, specificity: 0 },

    profile.user_md && profile.user_md.trim()
      ? scoreSoulprintSection('user', profile.user_md)
      : { completeness: 0, coherence: 0, specificity: 0 },

    profile.agents_md && profile.agents_md.trim()
      ? scoreSoulprintSection('agents', profile.agents_md)
      : { completeness: 0, coherence: 0, specificity: 0 },

    profile.tools_md && profile.tools_md.trim()
      ? scoreSoulprintSection('tools', profile.tools_md)
      : { completeness: 0, coherence: 0, specificity: 0 },
  ]);

  return {
    soul,
    identity,
    user,
    agents,
    tools,
  };
}

// ============================================
// Threshold Utilities
// ============================================

/**
 * Check if any quality metric in any section falls below the threshold.
 *
 * @param breakdown - Complete quality breakdown for all sections
 * @param threshold - Minimum acceptable score (default: 60)
 * @returns True if any metric is below threshold
 */
export function hasLowQualityScores(
  breakdown: QualityBreakdown,
  threshold = 60
): boolean {
  const sections: SectionType[] = ['soul', 'identity', 'user', 'agents', 'tools'];
  const metrics: Array<'completeness' | 'coherence' | 'specificity'> = [
    'completeness',
    'coherence',
    'specificity',
  ];

  for (const section of sections) {
    for (const metric of metrics) {
      if (breakdown[section][metric] < threshold) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all sections and metrics that fall below the quality threshold.
 *
 * Useful for logging, refinement targeting, and debugging.
 *
 * @param breakdown - Complete quality breakdown for all sections
 * @param threshold - Minimum acceptable score (default: 60)
 * @returns Array of low-quality section/metric combinations
 */
export function getLowQualitySections(
  breakdown: QualityBreakdown,
  threshold = 60
): LowQualitySection[] {
  const sections: SectionType[] = ['soul', 'identity', 'user', 'agents', 'tools'];
  const metrics: Array<'completeness' | 'coherence' | 'specificity'> = [
    'completeness',
    'coherence',
    'specificity',
  ];

  const lowQuality: LowQualitySection[] = [];

  for (const section of sections) {
    for (const metric of metrics) {
      const score = breakdown[section][metric];
      if (score < threshold) {
        lowQuality.push({ section, metric, score });
      }
    }
  }

  return lowQuality;
}
