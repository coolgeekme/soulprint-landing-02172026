/**
 * Baseline Comparison CLI
 *
 * Runs BOTH v1 and v2 prompt variants against the same dataset and compares their
 * scores to detect regressions. Exits 0 if v2 doesn't degrade from v1 beyond threshold,
 * 1 if regressions detected.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx scripts/baseline-compare.ts --dataset <name> [--samples N] [--threshold N]
 *
 * Options:
 *   --dataset <name>   Name of an existing Opik dataset (required)
 *   --samples N        Number of samples (default: 20, minimum: 20)
 *   --threshold N      Maximum allowed degradation from v1 to v2 (default: 0.05 = 5%)
 *   --help             Show this help message
 *
 * Required environment variables:
 *   OPIK_API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *
 * Exit codes:
 *   0 - No degradations beyond threshold (PASS)
 *   1 - Degradations detected or validation error (FAIL)
 *
 * Satisfies: VALD-01 (baseline comparison with degradation detection)
 */

import 'dotenv/config';
import { runExperiment } from '@/lib/evaluation/experiments';
import { v1PromptVariant, v2PromptVariant } from '@/lib/evaluation/baseline';
import { validateSampleSize, compareToBaseline } from '@/lib/evaluation/statistical-validation';

function printUsage(): void {
  console.log(`
Baseline Comparison CLI

Runs BOTH v1 and v2 prompt variants against the same dataset and compares their
scores to detect regressions. Exits 0 if v2 doesn't degrade from v1 beyond threshold.

Usage:
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/baseline-compare.ts --dataset <name> [--samples N] [--threshold N]

Options:
  --dataset <name>   Name of an existing Opik dataset (required)
  --samples N        Number of samples (default: 20, minimum: 20)
  --threshold N      Maximum allowed degradation from v1 to v2 (default: 0.05 = 5%)
  --help             Show this help message

Required environment variables:
  OPIK_API_KEY                 Opik API key for experiment tracking
  AWS_ACCESS_KEY_ID            AWS credentials for Bedrock Haiku 4.5
  AWS_SECRET_ACCESS_KEY        AWS credentials for Bedrock Haiku 4.5

Exit codes:
  0 - No degradations beyond threshold (PASS)
  1 - Degradations detected or validation error (FAIL)

Examples:
  # Compare v1 vs v2 with default settings:
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/baseline-compare.ts --dataset chat-eval-2026-02-08

  # Use 50 samples with stricter 3% threshold:
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/baseline-compare.ts --dataset chat-eval-2026-02-08 --samples 50 --threshold 0.03
`);
}

function parseArgs(): {
  datasetName: string;
  samples: number;
  threshold: number;
} {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  // Parse --dataset
  const datasetIdx = args.indexOf('--dataset');
  if (datasetIdx === -1) {
    console.error('Error: --dataset is required');
    printUsage();
    process.exit(1);
  }
  const datasetName = args[datasetIdx + 1];
  if (!datasetName || datasetName.startsWith('--')) {
    console.error('Error: --dataset requires a name argument');
    process.exit(1);
  }

  // Parse --samples (optional, default 20)
  let samples = 20;
  const samplesIdx = args.indexOf('--samples');
  if (samplesIdx !== -1) {
    const samplesStr = args[samplesIdx + 1];
    if (!samplesStr) {
      console.error('Error: --samples requires a numeric argument');
      process.exit(1);
    }
    samples = parseInt(samplesStr, 10);
    if (isNaN(samples) || samples < 1) {
      console.error(`Error: --samples must be a positive number, got "${samplesStr}"`);
      process.exit(1);
    }
  }

  // Parse --threshold (optional, default 0.05)
  let threshold = 0.05;
  const thresholdIdx = args.indexOf('--threshold');
  if (thresholdIdx !== -1) {
    const thresholdStr = args[thresholdIdx + 1];
    if (!thresholdStr) {
      console.error('Error: --threshold requires a numeric argument');
      process.exit(1);
    }
    threshold = parseFloat(thresholdStr);
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      console.error(`Error: --threshold must be between 0 and 1, got "${thresholdStr}"`);
      process.exit(1);
    }
  }

  return { datasetName, samples, threshold };
}

async function main(): Promise<void> {
  const { datasetName, samples, threshold } = parseArgs();

  // Validate sample size >= 20
  if (!validateSampleSize(samples)) {
    console.error(`Error: Minimum sample size is 20 for statistical significance (requested: ${samples})`);
    process.exit(1);
  }

  // Validate required environment variables
  const required = ['OPIK_API_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Error: Missing required environment variables: ${missing.join(', ')}`);
    console.error('Set them in .env.local or pass via environment.');
    process.exit(1);
  }

  console.log(`\n=== BASELINE COMPARISON ===`);
  console.log(`Dataset:   ${datasetName}`);
  console.log(`Samples:   ${samples}`);
  console.log(`Threshold: ${(threshold * 100).toFixed(1)}% max degradation\n`);

  // Run v1 experiment (baseline)
  console.log('Running v1 (baseline)...');
  const v1Result = await runExperiment({
    datasetName,
    variant: v1PromptVariant,
    nbSamples: samples,
    experimentName: `baseline-v1-${new Date().toISOString().split('T')[0]}`,
  });
  console.log('✓ v1 complete\n');

  // Run v2 experiment (current)
  console.log('Running v2 (current)...');
  const v2Result = await runExperiment({
    datasetName,
    variant: v2PromptVariant,
    nbSamples: samples,
    experimentName: `baseline-v2-${new Date().toISOString().split('T')[0]}`,
  });
  console.log('✓ v2 complete\n');

  // Compare v2 to v1
  const comparison = compareToBaseline(v2Result.aggregateScores, v1Result.aggregateScores, threshold);

  // Print side-by-side comparison table
  console.log('=== COMPARISON ===\n');
  console.log('Metric                    V1 Baseline   V2 Current   Delta      Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const allMetrics = new Set([
    ...Object.keys(v1Result.aggregateScores),
    ...Object.keys(v2Result.aggregateScores),
  ]);

  const metricNames = Array.from(allMetrics).sort();
  for (const metric of metricNames) {
    const v1Agg = v1Result.aggregateScores[metric];
    const v2Agg = v2Result.aggregateScores[metric];

    if (!v1Agg || !v2Agg) continue;

    const delta = v2Agg.mean - v1Agg.mean;
    const deltaPercent = (delta / v1Agg.mean) * 100;
    const deltaStr = deltaPercent >= 0 ? `+${deltaPercent.toFixed(1)}%` : `${deltaPercent.toFixed(1)}%`;

    // Determine status
    let status = 'PASS ✓';
    const degradation = (v1Agg.mean - v2Agg.mean) / v1Agg.mean;
    if (degradation > threshold) {
      status = 'FAIL ✗';
    }

    const paddedName = metric.padEnd(25);
    const v1Str = v1Agg.mean.toFixed(2).padStart(12);
    const v2Str = v2Agg.mean.toFixed(2).padStart(12);
    const deltaStrPadded = deltaStr.padStart(10);

    console.log(`${paddedName} ${v1Str}   ${v2Str}   ${deltaStrPadded}  ${status}`);
  }

  console.log('');

  // Print improvements section
  if (comparison.improvements.length > 0) {
    console.log('📈 Improvements:');
    for (const improvement of comparison.improvements) {
      const improvementPercent = (improvement.improvement * 100).toFixed(1);
      console.log(`  - ${improvement.metric}: +${improvementPercent}% (${improvement.baseline.toFixed(2)} → ${improvement.experiment.toFixed(2)})`);
    }
    console.log('');
  }

  // Print degradations section
  if (comparison.degradations.length > 0) {
    console.log('📉 Degradations beyond threshold:');
    for (const degradation of comparison.degradations) {
      const degradationPercent = (degradation.degradation * 100).toFixed(1);
      console.log(`  - ${degradation.metric}: -${degradationPercent}% (${degradation.baseline.toFixed(2)} → ${degradation.experiment.toFixed(2)})`);
    }
    console.log('');
  }

  // Print overall verdict
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (comparison.passed) {
    console.log('OVERALL: PASS ✓');
    console.log(`V2 does not degrade from V1 beyond ${(threshold * 100).toFixed(1)}% threshold`);
    if (comparison.improvements.length > 0) {
      console.log(`${comparison.improvements.length} metric(s) improved`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  } else {
    console.log('OVERALL: FAIL ✗');
    console.log(`${comparison.degradations.length} metric(s) degraded beyond ${(threshold * 100).toFixed(1)}% threshold`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error('\nBaseline comparison failed:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
