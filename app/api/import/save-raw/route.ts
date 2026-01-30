/**
 * Save raw conversations for future re-chunking
 * Called during import to preserve original data
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

interface RawConversationInput {
  id: string;
  title: string;
  messages: Array<{ role: string; content: string; timestamp?: string }>;
  messageCount: number;
  createdAt: string;
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
    const { conversations, batchIndex, totalBatches } = body;

    if (!conversations || !Array.isArray(conversations)) {
      return NextResponse.json({ error: 'Conversations array required' }, { status: 400 });
    }

    console.log(`[SaveRaw] User ${user.id} - batch ${batchIndex + 1}/${totalBatches} (${conversations.length} conversations)`);

    // Upsert raw conversations (allows re-import)
    const batch = conversations.map((convo: RawConversationInput) => ({
      user_id: user.id,
      conversation_id: convo.id,
      title: convo.title || 'Untitled',
      messages: convo.messages,
      message_count: convo.messageCount || convo.messages.length,
      created_at: convo.createdAt || new Date().toISOString(),
    }));

    const { error: insertError } = await adminSupabase
      .from('raw_conversations')
      .upsert(batch, { 
        onConflict: 'user_id,conversation_id',
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error('[SaveRaw] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      batchIndex,
      totalBatches,
      saved: conversations.length,
    });

  } catch (error) {
    console.error('[SaveRaw] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
