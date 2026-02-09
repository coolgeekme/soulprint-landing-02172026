/**
 * Latency Overhead Benchmark Script
 *
 * Measures P97.5 latency of the /api/health endpoint under load (100 concurrent connections)
 * to validate that Opik tracing overhead is below 100ms threshold.
 *
 * Why /api/health instead of /api/chat:
 * - Chat requires authentication, session management, and makes external LLM calls
 * - Health endpoint is the lightest endpoint that still initializes Opik client
 * - Benchmarks measure OVERHEAD of tracing instrumentation, not absolute latency
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx scripts/latency-benchmark.ts [--connections N] [--duration N] [--threshold N]
 *
 * Arguments:
 *   --connections N   Concurrent connections (default: 100)
 *   --duration N      Test duration in seconds (default: 30)
 *   --threshold N     Maximum acceptable P95 latency in ms (default: 100)
 */

import 'dotenv/config';
import * as autocannon from 'autocannon';

interface BenchmarkArgs {
  connections: number;
  duration: number;
  threshold: number;
}

function printUsage() {
  console.log(`
Latency Overhead Benchmark

Measures P97.5 latency of /api/health endpoint under concurrent load.

Usage:
  DOTENV_CONFIG_PATH=.env.local npx tsx scripts/latency-benchmark.ts [options]

Options:
  --connections N   Concurrent connections (default: 100)
  --duration N      Test duration in seconds (default: 30)
  --threshold N     Maximum acceptable P97.5 in ms (default: 100)
  --help           Show this help message

Examples:
  npx tsx scripts/latency-benchmark.ts
  npx tsx scripts/latency-benchmark.ts --connections 50 --duration 20
  npx tsx scripts/latency-benchmark.ts --threshold 150

Note: Requires local dev server running (npm run dev)
`);
}

function parseArgs(): BenchmarkArgs {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const defaults: BenchmarkArgs = {
    connections: 100,
    duration: 30,
    threshold: 100,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--connections' && args[i + 1]) {
      defaults.connections = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--duration' && args[i + 1]) {
      defaults.duration = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--threshold' && args[i + 1]) {
      defaults.threshold = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return defaults;
}

async function checkServerRunning(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    return response.status === 200 || response.status === 503;
  } catch (error) {
    return false;
  }
}

async function runBenchmark(args: BenchmarkArgs): Promise<void> {
  // Check if server is running
  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    console.error('\nError: Local dev server not running. Start with `npm run dev` first.\n');
    process.exit(1);
  }

  console.log('=== LATENCY BENCHMARK ===');
  console.log(`Endpoint: GET http://localhost:3000/api/health`);
  console.log(`Connections: ${args.connections}`);
  console.log(`Duration: ${args.duration}s`);
  console.log(`P97.5 Threshold: ${args.threshold}ms`);
  console.log('\nRunning benchmark...\n');

  // Run autocannon benchmark
  const result = await autocannon({
    url: 'http://localhost:3000/api/health',
    method: 'GET',
    connections: args.connections,
    duration: args.duration,
  });

  // Extract latency metrics
  const p50 = result.latency.p50;
  const p97_5 = result.latency.p97_5; // autocannon uses p97_5 (97.5th percentile) instead of p95
  const p99 = result.latency.p99;
  const avgThroughput = result.requests.average;

  // Print formatted results
  console.log('=== RESULTS ===');
  console.log(`P50:    ${p50}ms`);
  console.log(`P97.5:  ${p97_5}ms`);
  console.log(`P99:    ${p99}ms`);
  console.log(`Avg throughput: ${Math.round(avgThroughput)} req/sec`);
  console.log('');

  // Validate against threshold
  const passed = p97_5 < args.threshold;

  if (passed) {
    console.log(`✓ PASS: P97.5 ${p97_5}ms < ${args.threshold}ms threshold`);
    console.log('');
    process.exit(0);
  } else {
    console.error(`✗ FAIL: P97.5 ${p97_5}ms >= ${args.threshold}ms threshold`);
    console.error('');
    console.error('The P97.5 latency exceeds the acceptable threshold.');
    console.error('This may indicate:');
    console.error('  - Opik tracing overhead is too high');
    console.error('  - Server is under-resourced for concurrent load');
    console.error('  - Network bottleneck or connection pooling issues');
    console.error('');
    process.exit(1);
  }
}

// Main execution
const args = parseArgs();
runBenchmark(args).catch((error) => {
  console.error('Benchmark failed with error:', error);
  process.exit(1);
});
