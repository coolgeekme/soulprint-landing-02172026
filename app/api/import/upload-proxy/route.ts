/**
 * Proxy upload for mobile devices
 * Accepts the conversations.json blob and uploads to Supabase on the server side
 * This avoids CORS issues with signed URLs on mobile browsers
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow 60s for large uploads

// Increase body size limit for this endpoint
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '250mb', // conversations.json can be large
    },
  },
};

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

    // Get the file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const timestamp = Date.now();
    const path = `${user.id}/${timestamp}-conversations.json`;
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const adminSupabase = getSupabaseAdmin();
    
    // Upload to Supabase Storage
    const { data, error } = await adminSupabase.storage
      .from('imports')
      .upload(path, buffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('[UploadProxy] Storage error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[UploadProxy] Uploaded ${buffer.length} bytes to imports/${path}`);

    return NextResponse.json({
      success: true,
      path: `imports/${path}`,
      size: buffer.length,
    });

  } catch (error) {
    console.error('[UploadProxy] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }, { status: 500 });
  }
}
