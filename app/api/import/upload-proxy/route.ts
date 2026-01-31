/**
 * Proxy upload for mobile devices
 * Accepts the conversations.json blob and uploads to Supabase on the server side
 * This avoids CORS issues with signed URLs on mobile browsers
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

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
    // Preserve extension
    const ext = file.name.endsWith('.zip') ? 'zip' : 'json';
    const contentType = ext === 'zip' ? 'application/zip' : 'application/json';
    const path = `${user.id}/${timestamp}-upload.${ext}`;

    console.log(`[UploadProxy] Processing ${ext} file: ${file.name} (${file.size} bytes)`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const adminSupabase = getSupabaseAdmin();

    // Upload to Supabase Storage
    const { data, error } = await adminSupabase.storage
      .from('imports')
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[UploadProxy] Storage error:', error);
      return NextResponse.json({ error: `Storage error: ${error.message}` }, { status: 500 });
    }

    console.log(`[UploadProxy] Uploaded to imports/${path}`);

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
