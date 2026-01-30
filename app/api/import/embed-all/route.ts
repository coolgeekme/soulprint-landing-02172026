/**
 * Batch embed ALL chunks for a user immediately after import
 * Ensures 100% precision from the start - no gradual loading
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min max for Vercel

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const command = new InvokeModelCommand({
    modelId: 'cohere.embed-v4',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      texts: texts.map(t => t.slice(0, 128000)),
      input_type: 'search_document',
      embedding_types: ['float'],
      truncate: 'END',
    }),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embeddings.float;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminSupabase = getSupabaseAdmin();
    const body = await request.json();
    const { batchStart = 0 } = body;

    // Get chunks without embeddings
    const BATCH_SIZE = 50; // Process 50 at a time
    const { data: chunks, error: fetchError } = await adminSupabase
      .from('conversation_chunks')
      .select('id, content')
      .eq('user_id', user.id)
      .is('embedding', null)
      .order('created_at', { ascending: false })
      .range(batchStart, batchStart + BATCH_SIZE - 1);

    if (fetchError) {
      console.error('[EmbedAll] Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!chunks || chunks.length === 0) {
      // All done!
      await adminSupabase
        .from('user_profiles')
        .update({ 
          embedding_status: 'complete',
          embedding_progress: 100,
        })
        .eq('user_id', user.id);

      return NextResponse.json({ 
        done: true, 
        message: 'All chunks embedded!',
        totalProcessed: batchStart,
      });
    }

    console.log(`[EmbedAll] Processing batch of ${chunks.length} chunks starting at ${batchStart}`);

    // Generate embeddings
    const texts = chunks.map(c => c.content);
    const embeddings = await embedBatch(texts);

    // Update chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const { error: updateError } = await adminSupabase
        .from('conversation_chunks')
        .update({ embedding: embeddings[i] })
        .eq('id', chunks[i].id);

      if (updateError) {
        console.error(`[EmbedAll] Update error for chunk ${chunks[i].id}:`, updateError);
      }
    }

    // Get total count for progress
    const { count: totalCount } = await adminSupabase
      .from('conversation_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: remainingCount } = await adminSupabase
      .from('conversation_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('embedding', null);

    const progress = totalCount ? Math.round(((totalCount - (remainingCount || 0)) / totalCount) * 100) : 0;

    // Update progress
    await adminSupabase
      .from('user_profiles')
      .update({ 
        embedding_status: 'processing',
        embedding_progress: progress,
        processed_chunks: (totalCount || 0) - (remainingCount || 0),
      })
      .eq('user_id', user.id);

    return NextResponse.json({ 
      done: false,
      processed: chunks.length,
      progress,
      remaining: remainingCount,
      nextBatch: batchStart + BATCH_SIZE,
    });

  } catch (error) {
    console.error('[EmbedAll] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
