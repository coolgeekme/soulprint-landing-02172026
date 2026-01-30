/**
 * Process import job in background
 * Called by start-job, runs independently of user session
 */

import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  const adminSupabase = getSupabaseAdmin();
  let jobId: string | null = null;
  
  try {
    const { jobId: id } = await request.json();
    jobId = id;
    
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    // Get job details
    const { data: job, error: jobError } = await adminSupabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      console.error('[ProcessJob] Job not found:', jobId);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    if (job.status !== 'pending') {
      console.log(`[ProcessJob] Job ${jobId} already ${job.status}`);
      return NextResponse.json({ status: job.status });
    }
    
    // Update status to processing
    await adminSupabase.from('import_jobs').update({ 
      status: 'processing',
      started_at: new Date().toISOString(),
    }).eq('id', jobId);
    
    await adminSupabase.from('user_profiles').update({
      import_status: 'processing',
    }).eq('user_id', job.user_id);
    
    console.log(`[ProcessJob] Starting job ${jobId} for user ${job.user_id}`);
    
    // Download from storage
    const pathParts = job.storage_path.split('/');
    const bucket = pathParts[0];
    const filePath = pathParts.slice(1).join('/');
    
    console.log(`[ProcessJob] Downloading from ${bucket}/${filePath}...`);
    
    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from(bucket)
      .download(filePath);
    
    if (downloadError || !fileData) {
      throw new Error(`Download failed: ${downloadError?.message || 'No data'}`);
    }
    
    const arrayBuffer = await fileData.arrayBuffer();
    const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(1);
    console.log(`[ProcessJob] Downloaded ${sizeMB}MB`);
    
    // Parse ZIP
    const zip = await JSZip.loadAsync(arrayBuffer);
    const conversationsFile = zip.file('conversations.json');
    
    if (!conversationsFile) {
      throw new Error('conversations.json not found in ZIP');
    }
    
    const conversationsJson = await conversationsFile.async('string');
    const rawConversations = JSON.parse(conversationsJson);
    
    console.log(`[ProcessJob] Parsed ${rawConversations.length} conversations`);
    
    // Clean up storage
    adminSupabase.storage.from(bucket).remove([filePath]).catch(() => {});
    
    // Parse conversations
    const conversations = rawConversations.map((conv: any) => {
      const messages: Array<{role: string; content: string}> = [];
      
      if (conv.mapping) {
        const nodes = Object.values(conv.mapping) as any[];
        for (const node of nodes) {
          if (node?.message?.content?.parts?.[0]) {
            const role = node.message.author?.role || 'user';
            const content = node.message.content.parts[0];
            if (typeof content === 'string' && content.trim()) {
              messages.push({ role, content });
            }
          }
        }
      }
      
      return {
        id: conv.id || conv.conversation_id || Math.random().toString(36),
        title: conv.title || 'Untitled',
        messages,
        createdAt: conv.create_time ? new Date(conv.create_time * 1000).toISOString() : new Date().toISOString(),
      };
    }).filter((c: any) => c.messages.length > 0);
    
    const totalMessages = conversations.reduce((sum: number, c: any) => sum + c.messages.length, 0);
    
    // Update job progress
    await adminSupabase.from('import_jobs').update({
      total_conversations: conversations.length,
      total_messages: totalMessages,
    }).eq('id', jobId);
    
    // Call RLM for soulprint
    const rlmUrl = process.env.RLM_SERVICE_URL;
    let soulprint: any = null;
    let archetype = 'Unique Individual';
    
    if (rlmUrl) {
      console.log(`[ProcessJob] Calling RLM...`);
      
      const rlmConversations = conversations.slice(0, 500).map((c: any) => ({
        title: c.title,
        messages: c.messages.slice(0, 25).map((m: any) => ({
          role: m.role,
          content: m.content.slice(0, 400),
        })),
        message_count: c.messages.length,
      }));
      
      try {
        const rlmResponse = await fetch(`${rlmUrl}/create-soulprint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: job.user_id,
            conversations: rlmConversations,
            stats: { totalConversations: conversations.length, totalMessages },
          }),
        });
        
        if (rlmResponse.ok) {
          const rlmData = await rlmResponse.json();
          soulprint = rlmData.soulprint;
          archetype = rlmData.archetype || 'Unique Individual';
          console.log(`[ProcessJob] RLM soulprint created: ${archetype}`);
        }
      } catch (rlmError) {
        console.warn('[ProcessJob] RLM failed:', rlmError);
      }
    }
    
    // Fallback soulprint
    if (!soulprint) {
      soulprint = {
        archetype: 'The Explorer',
        soulprint_text: `You've had ${totalMessages} messages across ${conversations.length} conversations.`,
      };
    }
    
    // Save to user profile
    await adminSupabase.from('user_profiles').upsert({
      user_id: job.user_id,
      soulprint: soulprint,
      soulprint_text: soulprint.soulprint_text || '',
      archetype,
      import_status: 'complete',
      total_conversations: conversations.length,
      total_messages: totalMessages,
      soulprint_generated_at: new Date().toISOString(),
      soulprint_locked: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    
    // Mark job complete
    await adminSupabase.from('import_jobs').update({
      status: 'completed',
      archetype,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    
    console.log(`[ProcessJob] Job ${jobId} complete!`);
    
    return NextResponse.json({
      success: true,
      archetype,
      conversations: conversations.length,
      messages: totalMessages,
    });
    
  } catch (error) {
    console.error('[ProcessJob] Error:', error);
    
    if (jobId) {
      await adminSupabase.from('import_jobs').update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
    }
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Processing failed' 
    }, { status: 500 });
  }
}
