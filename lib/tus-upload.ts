/**
 * Upload file to Supabase Storage via signed URL (no client-side JWT needed)
 *
 * Flow:
 * 1. Server generates signed upload URL (service role, bypasses RLS)
 * 2. Client uploads directly to signed URL via XHR (progress tracking)
 * 3. No JWT auth headers needed — the signed URL IS the auth
 */

export interface TusUploadOptions {
  file: Blob;
  userId: string;
  filename: string;
  onProgress: (percent: number) => void;
}

export interface TusUploadResult {
  success: boolean;
  storagePath?: string;
  error?: string;
}

/**
 * Upload a file to Supabase Storage using a server-generated signed URL.
 * Keeps the same interface as the old TUS upload so the import page doesn't change.
 */
export async function tusUpload(options: TusUploadOptions): Promise<TusUploadResult> {
  const { file, onProgress } = options;

  try {
    // 1. Get signed upload URL from server
    const res = await fetch('/api/storage/upload-url', {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'Failed to prepare upload' };
    }

    const { signedUrl, token, path, storagePath } = await res.json();

    if (!signedUrl || !token) {
      return { success: false, error: 'Server returned invalid upload URL' };
    }

    console.log('[Upload] Got signed URL for path:', path);

    // 2. Upload to signed URL with XHR (for progress tracking)
    await uploadWithProgress(signedUrl, token, file, onProgress);

    console.log('[Upload] Complete:', storagePath);
    return { success: true, storagePath };

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    console.error('[Upload] Failed:', msg);
    return { success: false, error: msg };
  }
}

/** Upload file to Supabase signed URL using XHR for progress events */
function uploadWithProgress(
  signedUrl: string,
  token: string,
  file: Blob,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'));
    });

    // Supabase signed upload URL expects PUT with the token in the URL
    // The signedUrl already contains the token as a query param
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    // Token goes in x-upsert header for signed uploads
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.send(file);
  });
}
