/**
 * Direct ZIP upload endpoint for ChatGPT exports
 * Uses FormData for streaming large files
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large files

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Please upload a ZIP file' }, { status: 400 });
    }

    console.log(`[Import Upload] Processing ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) for user ${user.id}`);
    
    const adminSupabase = getSupabaseAdmin();

    // Create import job
    const { data: importJob, error: jobError } = await adminSupabase
      .from('import_jobs')
      .insert({
        user_id: user.id,
        status: 'pending',
        source_email: user.email,
        source_type: 'direct_upload',
      })
      .select()
      .single();

    if (jobError || !importJob) {
      console.error('[Import Upload] Failed to create job:', jobError);
      return NextResponse.json({ 
        error: 'Failed to create import job' 
      }, { status: 500 });
    }

    console.log(`[Import Upload] Created job ${importJob.id}`);

    // Read file as buffer and convert to base64 for processing
    const arrayBuffer = await file.arrayBuffer();
    const zipBase64 = Buffer.from(arrayBuffer).toString('base64');

    // Trigger processing (fire and forget for faster response)
    const processUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/import/process`;
    
    fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        importJobId: importJob.id,
        userId: user.id,
        zipBase64,
      }),
    }).catch(e => console.error('[Import Upload] Process trigger error:', e));

    return NextResponse.json({ 
      success: true,
      jobId: importJob.id,
      message: 'Import started! Your memory is being built.'
    });

  } catch (error) {
    console.error('[Import Upload] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
