/**
 * Chunked upload for very large files (>2GB)
 *
 * Strategy: Each chunk is uploaded directly to Supabase storage as a separate
 * file. When the final chunk arrives, we download all chunks, assemble them,
 * and re-upload as a single file. This keeps server memory usage low (~50MB
 * per chunk instead of holding the entire file).
 *
 * For files <2GB, the client uploads directly to Supabase via XHR (no API route).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { TTLCache } from '@/lib/api/ttl-cache';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:ChunkedUpload');

// Track which chunks have been received (metadata only, not data)
interface UploadSession {
  totalChunks: number;
  receivedChunks: Set<number>;
  userId: string;
  timestamp: number;
}

// Lightweight session tracking (no file data in memory)
const uploadSessions = new TTLCache<UploadSession>(30 * 60 * 1000, 5 * 60 * 1000);

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') || undefined;
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reqLog = log.child({ correlationId, userId: user.id, method: 'POST', endpoint: '/api/import/chunked-upload' });

    // Rate limit check
    const rateLimited = await checkRateLimit(user.id, 'upload');
    if (rateLimited) return rateLimited;

    const chunkIndex = parseInt(req.headers.get('X-Chunk-Index') || '0');
    const totalChunks = parseInt(req.headers.get('X-Total-Chunks') || '1');
    const uploadId = req.headers.get('X-Upload-Id') || `${user.id}-${Date.now()}`;

    reqLog.debug({ chunkIndex: chunkIndex + 1, totalChunks, uploadId }, 'Receiving chunk');

    // Read chunk data (only this chunk in memory, ~50MB max)
    const arrayBuffer = await req.arrayBuffer();
    const chunkBuffer = Buffer.from(arrayBuffer);

    const adminSupabase = getSupabaseAdmin();

    // Upload this chunk directly to Supabase storage as a temporary file
    const chunkPath = `${user.id}/chunks/${uploadId}/chunk-${String(chunkIndex).padStart(5, '0')}`;
    const { error: chunkUploadError } = await adminSupabase.storage
      .from('imports')
      .upload(chunkPath, chunkBuffer, {
        upsert: true,
        contentType: 'application/octet-stream',
      });

    if (chunkUploadError) {
      reqLog.error({ error: chunkUploadError.message, chunkIndex }, 'Failed to upload chunk to storage');
      return NextResponse.json({ error: `Chunk upload failed: ${chunkUploadError.message}` }, { status: 500 });
    }

    // Track session metadata (no file data)
    if (!uploadSessions.has(uploadId)) {
      uploadSessions.set(uploadId, {
        totalChunks,
        receivedChunks: new Set(),
        userId: user.id,
        timestamp: Date.now(),
      });
    }

    const session = uploadSessions.get(uploadId)!;
    session.receivedChunks.add(chunkIndex);

    reqLog.debug({ received: session.receivedChunks.size, total: totalChunks }, 'Chunk stored to Supabase');

    // If all chunks received, assemble them
    if (session.receivedChunks.size === totalChunks) {
      reqLog.info('All chunks received, assembling from storage');

      // Download and assemble chunks one at a time
      const assembledChunks: Buffer[] = [];
      let totalSize = 0;

      for (let i = 0; i < totalChunks; i++) {
        const downloadPath = `${user.id}/chunks/${uploadId}/chunk-${String(i).padStart(5, '0')}`;
        const { data: chunkData, error: downloadError } = await adminSupabase.storage
          .from('imports')
          .download(downloadPath);

        if (downloadError || !chunkData) {
          reqLog.error({ error: downloadError?.message, chunkIndex: i }, 'Failed to download chunk');
          // Clean up
          uploadSessions.delete(uploadId);
          return NextResponse.json({ error: `Assembly failed: could not read chunk ${i}` }, { status: 500 });
        }

        const buf = Buffer.from(await chunkData.arrayBuffer());
        assembledChunks.push(buf);
        totalSize += buf.length;
      }

      const fullFile = Buffer.concat(assembledChunks);
      const fileSizeMB = (fullFile.length / 1024 / 1024).toFixed(1);
      reqLog.info({ sizeMB: fileSizeMB }, 'File assembled');

      // Upload assembled file to final location
      const uploadPath = `${user.id}/${Date.now()}-conversations.json`;
      const { data, error } = await adminSupabase.storage
        .from('imports')
        .upload(uploadPath, fullFile, {
          upsert: true,
          contentType: 'application/json',
        });

      if (error) {
        reqLog.error({ error: error.message }, 'Supabase upload error');
        uploadSessions.delete(uploadId);
        return NextResponse.json({ error: `Storage upload failed: ${error.message}` }, { status: 500 });
      }

      // Clean up chunk files from storage
      const chunkPaths = Array.from({ length: totalChunks }, (_, i) =>
        `${user.id}/chunks/${uploadId}/chunk-${String(i).padStart(5, '0')}`
      );
      adminSupabase.storage.from('imports').remove(chunkPaths).catch(e =>
        reqLog.warn({ error: String(e) }, 'Failed to clean up chunk files')
      );

      // Clean up session
      uploadSessions.delete(uploadId);

      const duration = Date.now() - startTime;
      reqLog.info({ duration, status: 200, path: data.path, size: fullFile.length }, 'Upload complete');

      return NextResponse.json({
        success: true,
        complete: true,
        path: `imports/${data.path}`,
        size: fullFile.length,
      });
    }

    // Chunk received but not complete yet
    return NextResponse.json({
      success: true,
      complete: false,
      received: session.receivedChunks.size,
      total: totalChunks,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    log.error({
      correlationId,
      duration,
      error: err instanceof Error ? { message: err.message, name: err.name } : String(err)
    }, 'Chunked upload failed');

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// Note: Stale upload cleanup is now handled automatically by TTLCache
// Expired entries (>30 min) are removed via background cleanup timer
