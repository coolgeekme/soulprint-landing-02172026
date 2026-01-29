import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[Transcribe] Auth error:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      console.log('[Transcribe] No audio file');
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('[Transcribe] File received:', audioFile.name, audioFile.type, audioFile.size, 'bytes');

    // Determine file extension from MIME type
    let extension = 'webm';
    if (audioFile.type.includes('mp4') || audioFile.type.includes('m4a')) {
      extension = 'mp4';
    } else if (audioFile.type.includes('ogg')) {
      extension = 'ogg';
    } else if (audioFile.type.includes('wav')) {
      extension = 'wav';
    }

    // Send to OpenAI Whisper
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, `audio.${extension}`);
    openaiFormData.append('model', 'whisper-1');

    console.log('[Transcribe] Sending to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Transcribe] OpenAI error:', response.status, error);
      return NextResponse.json({ error: 'Transcription failed', details: error }, { status: 500 });
    }

    const data = await response.json();
    console.log('[Transcribe] Success:', data.text?.slice(0, 50) + '...');
    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error('[Transcribe] Error:', error);
    return NextResponse.json({ error: 'Transcription failed', details: String(error) }, { status: 500 });
  }
}
