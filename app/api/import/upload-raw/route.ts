/**
 * Upload raw conversations.json to Supabase Storage
 * Stores the original export for future re-processing
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminSupabase = getSupabaseAdmin();
    
    // Get the raw JSON from request body
    const body = await request.json();
    const { conversationsJson } = body;

    if (!conversationsJson) {
      return NextResponse.json({ error: 'conversationsJson required' }, { status: 400 });
    }

    // Generate storage path with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storagePath = `${user.id}/conversations-${timestamp}.json`;

    console.log(`[UploadRaw] Uploading to user-exports/${storagePath} (${conversationsJson.length} chars)`);

    // Upload to Supabase Storage
    const { error: uploadError } = await adminSupabase.storage
      .from('user-exports')
      .upload(storagePath, conversationsJson, {
        contentType: 'application/json',
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('[UploadRaw] Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    console.log(`[UploadRaw] Success! Path: ${storagePath}`);

    return NextResponse.json({ 
      success: true,
      storagePath,
    });

  } catch (error) {
    console.error('[UploadRaw] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
