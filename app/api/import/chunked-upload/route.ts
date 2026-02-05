import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Store chunks in memory temporarily (for assembly)
// In production, you'd want Redis or temp file storage
const chunkStore = new Map<string, { chunks: Buffer[]; totalChunks: number; receivedChunks: number }>();

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chunkIndex = parseInt(req.headers.get('X-Chunk-Index') || '0');
    const totalChunks = parseInt(req.headers.get('X-Total-Chunks') || '1');
    const totalSize = parseInt(req.headers.get('X-Total-Size') || '0');
    const uploadId = req.headers.get('X-Upload-Id') || `${user.id}-${Date.now()}`;

    console.log(`[ChunkedUpload API] Receiving chunk ${chunkIndex + 1}/${totalChunks} for upload ${uploadId}`);

    // Read chunk data
    const arrayBuffer = await req.arrayBuffer();
    const chunkBuffer = Buffer.from(arrayBuffer);

    // Initialize or get upload session
    if (!chunkStore.has(uploadId)) {
      chunkStore.set(uploadId, {
        chunks: new Array(totalChunks).fill(null),
        totalChunks,
        receivedChunks: 0,
      });
    }

    const session = chunkStore.get(uploadId)!;
    session.chunks[chunkIndex] = chunkBuffer;
    session.receivedChunks++;

    console.log(`[ChunkedUpload API] Stored chunk ${chunkIndex + 1}, received ${session.receivedChunks}/${totalChunks}`);

    // If all chunks received, assemble and upload to Supabase
    if (session.receivedChunks === totalChunks) {
      console.log('[ChunkedUpload API] All chunks received, assembling...');

      // Combine all chunks
      const fullFile = Buffer.concat(session.chunks);
      console.log(`[ChunkedUpload API] Assembled file: ${(fullFile.length / 1024 / 1024).toFixed(1)}MB`);

      // Clean up chunk store
      chunkStore.delete(uploadId);

      // Upload to Supabase storage
      const timestamp = Date.now();
      const uploadPath = `${user.id}/${timestamp}-conversations.json`;

      const { data, error } = await supabase.storage
        .from('imports')
        .upload(uploadPath, fullFile, {
          upsert: true,
          contentType: 'application/json',
        });

      if (error) {
        console.error('[ChunkedUpload API] Supabase upload error:', error);
        return NextResponse.json({ error: `Storage upload failed: ${error.message}` }, { status: 500 });
      }

      console.log('[ChunkedUpload API] Upload complete:', data);

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
      received: session.receivedChunks,
      total: totalChunks,
    });
  } catch (err) {
    console.error('[ChunkedUpload API] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// Clean up stale uploads (call periodically or on app start)
export function cleanupStaleUploads(maxAgeMs = 30 * 60 * 1000) {
  // In a real implementation, track timestamps and clean up old uploads
  // For now, this is a placeholder
}
