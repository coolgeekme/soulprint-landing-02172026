import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleAPIError } from '@/lib/api/error-handler';
import { parseRequestBody, memoryDeleteSchema } from '@/lib/api/schemas';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const result = await parseRequestBody(request, memoryDeleteSchema);
    if (result instanceof Response) return result;
    const { memoryId, memoryIds } = result;

    // Support single deletion or bulk deletion
    const idsToDelete = memoryIds || (memoryId ? [memoryId] : []);

    // Delete the chunks (with user_id check for security)
    const { error, count } = await supabase
      .from('conversation_chunks')
      .delete()
      .eq('user_id', user.id)
      .in('id', idsToDelete);

    if (error) {
      console.error('Error deleting memories:', error);
      return NextResponse.json({ error: 'Failed to delete memories' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: count || idsToDelete.length,
    });
  } catch (error) {
    return handleAPIError(error, 'API:MemoryDelete');
  }
}
