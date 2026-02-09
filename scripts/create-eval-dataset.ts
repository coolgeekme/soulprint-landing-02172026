/**
 * Create Evaluation Dataset
 *
 * Extracts anonymized chat message pairs from the production chat_messages table,
 * enriches them with soulprint context, and uploads to an Opik dataset for
 * offline evaluation experiments.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx scripts/create-eval-dataset.ts [--limit N]
 *
 * Options:
 *   --limit N   Maximum number of message pairs to include (default: 100, min: 20)
 *   --help      Show this help message
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPIK_API_KEY
 */

import 'dotenv/config';
import { createEvaluationDataset } from '@/lib/evaluation/datasets';

function printUsage(): void {
  console.log(`
Create Evaluation Dataset

Extracts anonymized chat message pairs from production data and uploads
them to an Opik dataset for offline evaluation experiments.

Usage:
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/create-eval-dataset.ts [--limit N]

Options:
  --limit N   Maximum number of message pairs to include (default: 100, min: 20)
  --help      Show this help message

Required environment variables:
  NEXT_PUBLIC_SUPABASE_URL     Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    Supabase service role key (bypasses RLS)
  OPIK_API_KEY                 Opik API key for dataset creation
`);
}

function parseArgs(): { limit: number } {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  let limit = 100;
  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1) {
    const limitStr = args[limitIdx + 1];
    if (!limitStr) {
      console.error('Error: --limit requires a numeric argument');
      printUsage();
      process.exit(1);
    }
    limit = parseInt(limitStr, 10);
    if (isNaN(limit)) {
      console.error(`Error: --limit must be a number, got "${limitStr}"`);
      process.exit(1);
    }
  }

  if (limit < 20) {
    console.error(`Error: --limit must be at least 20 for meaningful evaluation, got ${limit}`);
    process.exit(1);
  }

  return { limit };
}

async function main(): Promise<void> {
  const { limit } = parseArgs();

  // Validate required environment variables
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPIK_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Error: Missing required environment variables: ${missing.join(', ')}`);
    console.error('Set them in .env.local or pass via environment.');
    process.exit(1);
  }

  console.log(`Creating evaluation dataset with limit=${limit}...`);

  const result = await createEvaluationDataset(limit);

  console.log(`\nDataset "${result.datasetName}" created with ${result.itemCount} items.`);
  console.log('Use this dataset name when running experiments:');
  console.log(`  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/run-experiment.ts --dataset ${result.datasetName} --variant v1`);
}

main().catch((error: unknown) => {
  console.error('\nFailed to create evaluation dataset:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
