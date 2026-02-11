/**
 * Daily Trends Cron Job
 *
 * Runs daily at 6 AM UTC via Vercel cron.
 * Fetches Google Trends and upserts into Supabase `daily_trends` table.
 * This gives cross-instance persistence — the in-memory cache in
 * google-trends.ts handles per-instance fast lookups.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { fetchDailyTrends } from '@/lib/search/google-trends';

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export async function GET(req: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const topics = await fetchDailyTrends('US');

    if (topics.length === 0) {
      return NextResponse.json({ message: 'No trends fetched', count: 0 });
    }

    // Upsert into daily_trends (date is PK)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('daily_trends')
      .upsert(
        {
          date: today,
          topics: JSON.stringify(topics),
          fetched_at: new Date().toISOString(),
          geo: 'US',
        },
        { onConflict: 'date' }
      );

    if (error) {
      console.error('[DailyTrends Cron] Supabase upsert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[DailyTrends Cron] Stored ${topics.length} trends for ${today}`);
    return NextResponse.json({ message: 'Trends updated', count: topics.length, date: today });
  } catch (error) {
    console.error('[DailyTrends Cron] Failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}
