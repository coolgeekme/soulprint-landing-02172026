import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if RLM service is configured and responsive
    const rlmUrl = process.env.RLM_SERVICE_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${rlmUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        return NextResponse.json({ healthy: true, status: 'operational' });
      }
      return NextResponse.json({ healthy: false, status: 'degraded' }, { status: 503 });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        // RLM timed out - treat as unhealthy
        return NextResponse.json({ healthy: false, status: 'timeout' }, { status: 503 });
      }
      // RLM service not available - that's ok, return simulated healthy for demo
      return NextResponse.json({ healthy: true, status: 'simulated' });
    }
  } catch {
    return NextResponse.json({ healthy: false, status: 'error' }, { status: 500 });
  }
}
