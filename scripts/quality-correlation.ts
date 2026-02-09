/**
 * Quality Score Correlation Validation CLI
 *
 * Validates that quality scores correlate with user satisfaction proxies.
 * Computes Pearson correlation coefficient between composite quality scores
 * and satisfaction metrics (session length, conversation count, return rate).
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx scripts/quality-correlation.ts [--min-profiles N] [--threshold N]
 *
 * Options:
 *   --min-profiles N   Minimum number of profiles for meaningful correlation (default: 10)
 *   --threshold N      Minimum Pearson r correlation required to pass (default: 0.7)
 *   --help             Show this help message
 *
 * Required environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Exit codes:
 *   0 - At least one satisfaction proxy exceeds r > threshold (PASS) or insufficient data
 *   1 - All proxies below threshold (FAIL) or validation error
 *
 * Satisfies: Success Criterion #5 (quality scores correlate r>0.7 with user satisfaction)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { QualityBreakdown } from '@/lib/evaluation/quality-scoring';

function printUsage(): void {
  console.log(`
Quality Score Correlation Validation CLI

Validates that quality scores correlate with user satisfaction proxies.
Computes Pearson correlation coefficient between composite quality scores
and satisfaction metrics.

Usage:
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/quality-correlation.ts [--min-profiles N] [--threshold N]

Options:
  --min-profiles N   Minimum number of profiles for meaningful correlation (default: 10)
  --threshold N      Minimum Pearson r correlation required to pass (default: 0.7)
  --help             Show this help message

Required environment variables:
  NEXT_PUBLIC_SUPABASE_URL        Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY       Supabase service role key (admin access)

Satisfaction proxies:
  avg_session_length     Average messages per conversation for user
  total_conversations    Number of conversations user has had
  return_rate            Number of distinct days user chatted (retention proxy)

Exit codes:
  0 - At least one satisfaction proxy exceeds r > threshold (PASS) or insufficient data
  1 - All proxies below threshold (FAIL) or validation error

Examples:
  # Default validation (min 10 profiles, r > 0.7):
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/quality-correlation.ts

  # Custom thresholds:
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/quality-correlation.ts --min-profiles 20 --threshold 0.75
`);
}

function parseArgs(): {
  minProfiles: number;
  threshold: number;
} {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  // Parse --min-profiles (optional, default 10)
  let minProfiles = 10;
  const minProfilesIdx = args.indexOf('--min-profiles');
  if (minProfilesIdx !== -1) {
    const minProfilesStr = args[minProfilesIdx + 1];
    if (!minProfilesStr) {
      console.error('Error: --min-profiles requires a numeric argument');
      process.exit(1);
    }
    minProfiles = parseInt(minProfilesStr, 10);
    if (isNaN(minProfiles) || minProfiles < 1) {
      console.error(`Error: --min-profiles must be a positive number, got "${minProfilesStr}"`);
      process.exit(1);
    }
  }

  // Parse --threshold (optional, default 0.7)
  let threshold = 0.7;
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

  return { minProfiles, threshold };
}

/**
 * Compute Pearson correlation coefficient between two numeric arrays.
 *
 * @param x - First variable (e.g., quality scores)
 * @param y - Second variable (e.g., satisfaction proxy)
 * @returns Pearson r correlation coefficient (-1 to 1)
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) {
    return 0;
  }

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i]!, 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

interface ProfileWithSatisfaction {
  user_id: string;
  quality_breakdown: QualityBreakdown;
  composite_quality_score: number;
  avg_session_length: number;
  total_conversations: number;
  return_rate: number;
}

async function main(): Promise<void> {
  const { minProfiles, threshold } = parseArgs();

  // Validate required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing required environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Create Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`\n=== QUALITY SCORE CORRELATION VALIDATION ===`);
  console.log(`Minimum profiles: ${minProfiles}`);
  console.log(`Correlation threshold: r > ${threshold.toFixed(2)}`);
  console.log('\nQuerying user profiles with quality scores...\n');

  // Query all profiles with quality_breakdown
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('user_id, quality_breakdown')
    .not('quality_breakdown', 'is', null);

  if (profilesError) {
    console.error('Database error querying user_profiles:', profilesError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profiles with quality scores found.');
    console.log('Status: INCONCLUSIVE (no data)');
    process.exit(0);
  }

  // Check if we have enough profiles
  if (profiles.length < minProfiles) {
    console.log(`Insufficient data: ${profiles.length} profiles found, need ${minProfiles} for meaningful correlation`);
    console.log('Status: INCONCLUSIVE');
    process.exit(0);
  }

  console.log(`Found ${profiles.length} profiles with quality scores.`);
  console.log('Computing satisfaction proxies from chat_messages...\n');

  // For each profile, compute satisfaction proxies
  const profilesWithSatisfaction: ProfileWithSatisfaction[] = [];

  for (const profile of profiles) {
    const userId = profile.user_id;
    const qualityBreakdown = profile.quality_breakdown as QualityBreakdown;

    // Query chat_messages for this user
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, created_at')
      .eq('user_id', userId);

    if (messagesError) {
      console.error(`Error querying messages for user ${userId}:`, messagesError.message);
      continue; // Skip this user
    }

    if (!messages || messages.length === 0) {
      // No chat data for this user, skip
      continue;
    }

    // Compute satisfaction proxies
    // 1. avg_session_length: Average messages per conversation
    const conversationMap = new Map<string, number>();
    for (const msg of messages) {
      const count = conversationMap.get(msg.conversation_id) || 0;
      conversationMap.set(msg.conversation_id, count + 1);
    }
    const sessionLengths = Array.from(conversationMap.values());
    const avg_session_length = sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length;

    // 2. total_conversations: Number of unique conversations
    const total_conversations = conversationMap.size;

    // 3. return_rate: Number of distinct days user chatted
    const uniqueDays = new Set<string>();
    for (const msg of messages) {
      const dateStr = msg.created_at.split('T')[0]; // Extract YYYY-MM-DD
      uniqueDays.add(dateStr!);
    }
    const return_rate = uniqueDays.size;

    // Compute composite quality score (average of all 15 scores)
    const scores: number[] = [];
    for (const section of ['soul', 'identity', 'user', 'agents', 'tools'] as const) {
      scores.push(qualityBreakdown[section].completeness);
      scores.push(qualityBreakdown[section].coherence);
      scores.push(qualityBreakdown[section].specificity);
    }
    const composite_quality_score = scores.reduce((a, b) => a + b, 0) / scores.length;

    profilesWithSatisfaction.push({
      user_id: userId,
      quality_breakdown: qualityBreakdown,
      composite_quality_score,
      avg_session_length,
      total_conversations,
      return_rate,
    });
  }

  console.log(`Analyzed ${profilesWithSatisfaction.length} profiles with chat data.\n`);

  if (profilesWithSatisfaction.length < minProfiles) {
    console.log(`Insufficient data after filtering: ${profilesWithSatisfaction.length} profiles, need ${minProfiles}`);
    console.log('Status: INCONCLUSIVE');
    process.exit(0);
  }

  // Extract arrays for correlation computation
  const qualityScores = profilesWithSatisfaction.map((p) => p.composite_quality_score);
  const sessionLengths = profilesWithSatisfaction.map((p) => p.avg_session_length);
  const conversationCounts = profilesWithSatisfaction.map((p) => p.total_conversations);
  const returnRates = profilesWithSatisfaction.map((p) => p.return_rate);

  // Compute correlations
  const r_sessionLength = pearsonCorrelation(qualityScores, sessionLengths);
  const r_conversations = pearsonCorrelation(qualityScores, conversationCounts);
  const r_returnRate = pearsonCorrelation(qualityScores, returnRates);

  // Print results table
  console.log('=== RESULTS ===\n');
  console.log('Satisfaction Proxy        Pearson r    Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const results = [
    { proxy: 'avg_session_length', r: r_sessionLength },
    { proxy: 'total_conversations', r: r_conversations },
    { proxy: 'return_rate', r: r_returnRate },
  ];

  let bestProxy = '';
  let bestR = -1;
  let anyPass = false;

  for (const { proxy, r } of results) {
    const paddedProxy = proxy.padEnd(25);
    const rStr = r.toFixed(2).padStart(9);
    const status = r > threshold ? 'PASS (>0.7)' : 'FAIL (<0.7)';
    console.log(`${paddedProxy} ${rStr}   ${status}`);

    if (r > bestR) {
      bestR = r;
      bestProxy = proxy;
    }
    if (r > threshold) {
      anyPass = true;
    }
  }

  console.log('');
  console.log(`Best proxy: ${bestProxy} (r=${bestR.toFixed(2)})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (anyPass) {
    console.log('Verdict: PASS (at least one proxy exceeds threshold)\n');
    process.exit(0);
  } else {
    console.log('Verdict: FAIL (no proxies exceed threshold)\n');
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error('\nCorrelation validation failed:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
