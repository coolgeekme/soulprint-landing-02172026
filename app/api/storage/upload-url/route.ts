/**
 * POST /api/storage/upload-url — Generate a signed upload URL for Supabase Storage
 *
 * Uses service role key to bypass RLS. Returns a signed URL + token that
 * the client can upload to without needing any JWT auth headers.
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST() {
  // Verify the user is logged in
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Generate signed upload URL with admin client (bypasses RLS)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const path = `${user.id}/${Date.now()}-conversations.json`;

  const { data, error } = await admin.storage
    .from('imports')
    .createSignedUploadUrl(path);

  if (error) {
    console.error('[StorageUploadUrl] Failed to create signed URL:', error);
    return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    storagePath: `imports/${path}`,
  });
}
