import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        status: 'none',
        totalChunks: 0,
        importJobs: [],
      });
    }

    // Count total memory chunks
    const { count: totalChunks, error: memoryError } = await supabase
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (memoryError) {
      console.error('Error checking memories:', memoryError);
    }

    // Get recent import jobs
    const { data: importJobs, error: jobsError } = await supabase
      .from('import_jobs')
      .select('id, status, created_at, total_chunks, processed_chunks, error')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobsError) {
      console.error('Error fetching import jobs:', jobsError);
    }

    const status = (totalChunks && totalChunks > 0) ? 'ready' : 
                   (importJobs?.some(j => j.status === 'processing') ? 'processing' : 'none');

    return NextResponse.json({ 
      status,
      totalChunks: totalChunks || 0,
      importJobs: importJobs || [],
    });
  } catch (error) {
    console.error('Memory status error:', error);
    return NextResponse.json({ 
      status: 'error',
      totalChunks: 0,
      importJobs: [],
    });
  }
}
