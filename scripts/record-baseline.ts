/**
 * Record V1 Baseline Metrics
 *
 * Records baseline metrics for the current v1 prompt system by running an
 * experiment against an Opik dataset. The baseline serves as the comparison
 * point for all future prompt improvements.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx scripts/record-baseline.ts --dataset <name> [--samples N]
 *
 * Options:
 *   --dataset <name>   Name of an existing Opik dataset (required)
 *   --samples N        Number of dataset items to evaluate (default: all)
 *   --help             Show this help message
 *
 * Required environment variables:
 *   OPIK_API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

import 'dotenv/config';
import { recordBaseline } from '@/lib/evaluation/baseline';

function printUsage(): void {
  console.log(`
Record V1 Baseline Metrics

Records baseline metrics for the current v1 prompt system by running an
experiment against an Opik dataset. The baseline serves as the comparison
point for all future prompt improvements.

Usage:
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/record-baseline.ts --dataset <name> [--samples N]

Options:
  --dataset <name>   Name of an existing Opik dataset (required)
  --samples N        Number of dataset items to evaluate (default: all)
  --help             Show this help message

Required environment variables:
  OPIK_API_KEY                 Opik API key for experiment tracking
  AWS_ACCESS_KEY_ID            AWS credentials for Bedrock Haiku 4.5
  AWS_SECRET_ACCESS_KEY        AWS credentials for Bedrock Haiku 4.5

Example:
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/record-baseline.ts --dataset chat-eval-2026-02-08 --samples 20
`);
}

function parseArgs(): { datasetName: string; samples?: number } {
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

  // Parse --samples (optional)
  let samples: number | undefined;
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

  return { datasetName, samples };
}

async function main(): Promise<void> {
  const { datasetName, samples } = parseArgs();

  // Validate required environment variables
  const required = ['OPIK_API_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Error: Missing required environment variables: ${missing.join(', ')}`);
    console.error('Set them in .env.local or pass via environment.');
    process.exit(1);
  }

  console.log('\nRecording v1 baseline metrics...');
  console.log('This may take several minutes depending on dataset size...\n');

  const result = await recordBaseline({
    datasetName,
    nbSamples: samples,
  });

  console.log(`\nBaseline version: ${result.version}`);
  console.log('Baseline recording complete.');
}

main().catch((error: unknown) => {
  console.error('\nBaseline recording failed:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
