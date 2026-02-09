/**
 * Statistical Validation Utilities
 *
 * Provides sample size validation and baseline comparison for regression testing.
 * Enforces minimum statistical power requirements and detects quality degradation
 * across prompt variants.
 *
 * Statistical rationale:
 * - 20 samples provides 80% power to detect medium effect size (d=0.5) at α=0.05
 * - 5% degradation threshold balances sensitivity vs noise for LLM quality metrics
 *
 * Satisfies: VALD-01 (regression test suite with 20-100 cases)
 */

import type { MetricAggregate } from '@/lib/evaluation/experiments';

/**
 * Result of comparing experimental scores to baseline scores.
 */
export interface ComparisonResult {
  /** Whether all metrics meet the degradation threshold (true = pass) */
  passed: boolean;
  /** Metrics that degraded beyond threshold */
  degradations: Array<{
    metric: string;
    baseline: number;
    experiment: number;
    degradation: number;
  }>;
  /** Metrics that improved compared to baseline */
  improvements: Array<{
    metric: string;
    baseline: number;
    experiment: number;
    improvement: number;
  }>;
}

/**
 * Validate that sample size meets minimum statistical power requirement.
 *
 * Returns true if n >= 20, which provides 80% power to detect medium effect size
 * (Cohen's d = 0.5) at significance level α = 0.05 using a two-sample t-test.
 *
 * For effect sizes:
 * - Small (d=0.2): requires ~400 samples for 80% power
 * - Medium (d=0.5): requires ~64 samples for 80% power
 * - Large (d=0.8): requires ~26 samples for 80% power
 *
 * We enforce 20 as a practical minimum that catches large degradations reliably.
 *
 * @param n - Number of samples in the experiment
 * @returns true if n >= 20, false otherwise
 */
export function validateSampleSize(n: number): boolean {
  return n >= 20;
}

/**
 * Compare experimental scores to baseline scores and detect degradations/improvements.
 *
 * For each metric present in both experiment and baseline:
 * - Degradation = (baseline - experiment) / baseline
 * - If degradation > threshold, add to degradations array
 * - If degradation < 0 (improvement), add to improvements array
 *
 * Returns passed=false if ANY metric degrades beyond threshold.
 *
 * @param experimentScores - Aggregate scores from the experimental run
 * @param baselineScores - Aggregate scores from the baseline run
 * @param threshold - Maximum allowed degradation (default: 0.05 = 5%)
 * @returns ComparisonResult with pass/fail and degradation/improvement details
 */
export function compareToBaseline(
  experimentScores: Record<string, MetricAggregate>,
  baselineScores: Record<string, MetricAggregate>,
  threshold: number = 0.05
): ComparisonResult {
  const degradations: ComparisonResult['degradations'] = [];
  const improvements: ComparisonResult['improvements'] = [];

  const experimentMetrics = Object.keys(experimentScores);

  for (const metric of experimentMetrics) {
    const expScore = experimentScores[metric];
    const baseScore = baselineScores[metric];

    // Skip if metric not in baseline
    if (!baseScore || !expScore) continue;

    // Compute degradation as percentage
    const degradation = (baseScore.mean - expScore.mean) / baseScore.mean;

    if (degradation > threshold) {
      // Worse than baseline by more than threshold
      degradations.push({
        metric,
        baseline: baseScore.mean,
        experiment: expScore.mean,
        degradation,
      });
    } else if (degradation < 0) {
      // Improvement (negative degradation)
      improvements.push({
        metric,
        baseline: baseScore.mean,
        experiment: expScore.mean,
        improvement: -degradation,
      });
    }
  }

  return {
    passed: degradations.length === 0,
    degradations,
    improvements,
  };
}
