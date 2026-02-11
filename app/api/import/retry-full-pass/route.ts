/**
 * Thin authentication proxy for full pass retry.
 * Authenticates user, validates full_pass_status, forwards to RLM /retry-full-pass.
 *
 * User can retry a failed full pass without re-uploading their ChatGPT export.
 * Reads storage_path from user_profiles (persisted during original import).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:RetryFullPass');

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max (just for auth + trigger)

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  const adminSupabase = getSupabaseAdmin();
  const correlationId = request.headers.get('x-correlation-id') || undefined;
  const startTime = Date.now();

  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const reqLog = log.child({ correlationId, userId: user.id, endpoint: '/api/import/retry-full-pass' });

    // Rate limit check
    const rateLimited = await checkRateLimit(user.id, 'expensive');
    if (rateLimited) return rateLimited;

    // Fetch user's storage_path, file_type, and full_pass_status from user_profiles
    const { data: profile, error: profileError } = await adminSupabase
      .from('user_profiles')
      .select('storage_path, file_type, full_pass_status')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      reqLog.error({ error: profileError }, 'Failed to fetch user profile');
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Guard: full_pass_status must be 'failed'
    if (profile.full_pass_status !== 'failed') {
      reqLog.warn({ status: profile.full_pass_status }, 'Retry rejected: full pass not in failed state');
      return NextResponse.json(
        {
          error: 'Full pass retry only allowed when status is "failed"',
          currentStatus: profile.full_pass_status,
        },
        { status: 400 }
      );
    }

    // Guard: storage_path must exist
    if (!profile.storage_path) {
      reqLog.error('No storage_path found for user');
      return NextResponse.json(
        { error: 'No storage path found. Original import may not have completed.' },
        { status: 400 }
      );
    }

    reqLog.info({ storagePath: profile.storage_path }, 'Full pass retry started');

    // Fire RLM retry (fire-and-forget, 10s timeout just to confirm acceptance)
    const rlmUrl = process.env.RLM_API_URL || 'https://soulprint-landing.onrender.com';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const rlmResponse = await fetch(`${rlmUrl}/retry-full-pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          storage_path: profile.storage_path,
          file_type: profile.file_type || 'json',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!rlmResponse.ok) {
        const errorText = await rlmResponse.text().catch(() => 'Unknown error');
        reqLog.error({ status: rlmResponse.status, error: errorText }, 'RLM returned error');

        await adminSupabase.from('user_profiles').update({
          full_pass_status: 'failed',
          full_pass_error: `RLM retry error: ${errorText.slice(0, 200)}`,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);

        return NextResponse.json({ error: 'Retry service error' }, { status: 500 });
      }

      reqLog.info('RLM accepted retry job');
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        reqLog.warn('RLM retry submission timed out (non-fatal)');
        // Don't fail - RLM may still process successfully
      } else {
        reqLog.error({ error: String(e) }, 'Failed to call RLM retry');

        await adminSupabase.from('user_profiles').update({
          full_pass_status: 'failed',
          full_pass_error: 'Failed to start retry processing',
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);

        return NextResponse.json({ error: 'Failed to start retry' }, { status: 500 });
      }
    }

    const duration = Date.now() - startTime;
    reqLog.info({ duration, status: 202 }, 'Retry triggered successfully');

    return NextResponse.json({
      success: true,
      status: 'processing',
      message: 'Full pass retry started. Processing on RLM service.',
    }, { status: 202 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to trigger retry';
    const duration = Date.now() - startTime;

    log.error({ correlationId, duration, error: String(error) }, 'Retry trigger failed');

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
