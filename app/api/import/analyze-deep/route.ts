/**
 * RLM Deep Soulprint Analysis
 * Calls RLM service to analyze ALL conversations and generate rich soulprint
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min for deep analysis

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rlmUrl = process.env.RLM_SERVICE_URL;
    if (!rlmUrl) {
      console.log('[AnalyzeDeep] RLM_SERVICE_URL not configured, skipping deep analysis');
      return NextResponse.json({ 
        success: false, 
        skipped: true,
        reason: 'RLM service not configured',
      });
    }

    console.log(`[AnalyzeDeep] Starting deep analysis for user ${user.id}`);

    // Call RLM service /analyze endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 280000); // 4.5 min timeout

    try {
      const response = await fetch(`${rlmUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AnalyzeDeep] RLM service error: ${response.status}`, errorText);
        return NextResponse.json({ 
          success: false, 
          error: `RLM service returned ${response.status}`,
          details: errorText,
        }, { status: 502 });
      }

      const result = await response.json();
      console.log(`[AnalyzeDeep] Complete for user ${user.id}`, {
        latency_ms: result.latency_ms,
        analyzed: result.insights?.total_analyzed,
      });

      return NextResponse.json({
        success: true,
        personality: result.personality,
        insights: result.insights,
        latency_ms: result.latency_ms,
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[AnalyzeDeep] Request timed out');
        return NextResponse.json({ 
          success: false, 
          error: 'Analysis timed out',
        }, { status: 504 });
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('[AnalyzeDeep] Error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
