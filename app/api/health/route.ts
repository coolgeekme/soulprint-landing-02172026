import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const log = createLogger('Health');

interface DependencyHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  message?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  dependencies: {
    supabase: DependencyHealth;
    rlm: DependencyHealth;
    bedrock: DependencyHealth;
  };
}

async function checkSupabase(): Promise<DependencyHealth> {
  const start = Date.now();
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Simple query to test connection with timeout
    const { data, error } = await adminClient
      .from('profiles')
      .select('id')
      .limit(1)
      .abortSignal(AbortSignal.timeout(5000));

    const latency_ms = Date.now() - start;

    if (error) {
      return {
        status: 'degraded',
        latency_ms,
        message: error.message,
      };
    }

    return {
      status: 'healthy',
      latency_ms,
      message: 'Connected',
    };
  } catch (err) {
    const latency_ms = Date.now() - start;

    // Check for timeout specifically
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        status: 'down',
        latency_ms,
        message: 'Connection timeout',
      };
    }

    return {
      status: 'down',
      latency_ms,
      message: 'Connection failed',
    };
  }
}

async function checkRLM(): Promise<DependencyHealth> {
  const start = Date.now();
  const rlmUrl = process.env.RLM_SERVICE_URL;

  if (!rlmUrl) {
    return {
      status: 'down',
      latency_ms: 0,
      message: 'Not configured',
    };
  }

  try {
    const response = await fetch(`${rlmUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    const latency_ms = Date.now() - start;

    if (!response.ok) {
      return {
        status: 'degraded',
        latency_ms,
        message: `HTTP ${response.status}`,
      };
    }

    return {
      status: 'healthy',
      latency_ms,
      message: 'Responding',
    };
  } catch (err) {
    const latency_ms = Date.now() - start;

    // Check for timeout
    if (err instanceof Error && err.name === 'TimeoutError') {
      return {
        status: 'down',
        latency_ms,
        message: 'Request timeout',
      };
    }

    return {
      status: 'down',
      latency_ms,
      message: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

async function checkBedrock(): Promise<DependencyHealth> {
  // Config-only check - no actual AWS API calls
  const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
  const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
  const hasModelId = !!process.env.BEDROCK_MODEL_ID;

  if (hasAccessKey && hasSecretKey && hasModelId) {
    return {
      status: 'healthy',
      latency_ms: 0,
      message: 'Configured',
    };
  }

  const missing: string[] = [];
  if (!hasAccessKey) missing.push('AWS_ACCESS_KEY_ID');
  if (!hasSecretKey) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!hasModelId) missing.push('BEDROCK_MODEL_ID');

  return {
    status: 'down',
    latency_ms: 0,
    message: `Missing credentials: ${missing.join(', ')}`,
  };
}

export async function GET() {
  const start = Date.now();

  try {
    // Run all health checks in parallel
    const [supabase, rlm, bedrock] = await Promise.all([
      checkSupabase(),
      checkRLM(),
      checkBedrock(),
    ]);

    // Determine overall status
    const statuses = [supabase.status, rlm.status, bedrock.status];
    let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

    if (statuses.includes('down')) {
      overallStatus = 'down';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    const duration = Date.now() - start;

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      dependencies: {
        supabase,
        rlm,
        bedrock,
      },
    };

    // Log health check result
    log.info(
      { duration, status: overallStatus },
      'Health check completed'
    );

    // Return 503 if overall status is down, otherwise 200
    const httpStatus = overallStatus === 'down' ? 503 : 200;
    return NextResponse.json(response, { status: httpStatus });
  } catch (err) {
    const duration = Date.now() - start;
    log.error({ error: err, duration }, 'Health check failed');

    return NextResponse.json(
      {
        status: 'down',
        timestamp: new Date().toISOString(),
        message: 'Health check error',
      },
      { status: 500 }
    );
  }
}
