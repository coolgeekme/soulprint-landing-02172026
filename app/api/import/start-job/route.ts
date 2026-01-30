/**
 * Start import job - uploads file and queues for background processing
 * User can close browser after upload completes
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min for large uploads

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { storagePath, filename, fileSize } = await request.json();
    
    if (!storagePath) {
      return NextResponse.json({ error: 'storagePath required' }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();
    
    // Create import job record
    const { data: job, error: jobError } = await adminSupabase
      .from('import_jobs')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        filename: filename || 'export.zip',
        file_size: fileSize || 0,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (jobError) {
      console.error('[StartJob] Failed to create job:', jobError);
      return NextResponse.json({ error: 'Failed to create import job' }, { status: 500 });
    }
    
    console.log(`[StartJob] Created job ${job.id} for user ${user.id}`);
    
    // Update user profile to show import in progress
    await adminSupabase.from('user_profiles').upsert({
      user_id: user.id,
      import_status: 'uploading',
      current_job_id: job.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    
    // Trigger background processing (fire and forget)
    // This will continue even if user closes browser
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.soulprintengine.ai'}/api/import/process-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(err => console.error('[StartJob] Failed to trigger processing:', err));
    
    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Import started! You can close this page - we\'ll process in the background.',
    });
    
  } catch (error) {
    console.error('[StartJob] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to start import' 
    }, { status: 500 });
  }
}
