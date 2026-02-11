import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMemoryContext } from '@/lib/memory/query';
import { extractFacts } from '@/lib/memory/facts';
import { handleAPIError } from '@/lib/api/error-handler';
import { parseRequestBody, memoryQuerySchema } from '@/lib/api/schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('API:MemoryQuery');

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') || undefined;
  const startTime = Date.now();

  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const reqLog = log.child({ correlationId, userId: user.id, method: 'POST', endpoint: '/api/memory/query' });
    reqLog.info('Memory query started');

    // Rate limit check
    const rateLimited = await checkRateLimit(user.id, 'standard');
    if (rateLimited) return rateLimited;

    // Parse and validate request body
    const result = await parseRequestBody(request, memoryQuerySchema);
    if (result instanceof Response) return result;
    const { query, topK, includeFacts } = result;

    // Search memory
    const memoryResult = await getMemoryContext(user.id, query, topK);
    reqLog.debug({ chunksFound: memoryResult.chunks.length, topK, method: memoryResult.method }, 'Memory search completed');

    // Optionally extract facts from retrieved chunks
    let facts = null;
    if (includeFacts && memoryResult.chunks.length > 0) {
      facts = await extractFacts(memoryResult.chunks);
      reqLog.debug({ factsExtracted: facts ? Object.keys(facts).length : 0 }, 'Facts extracted');
    }

    const duration = Date.now() - startTime;
    reqLog.info({ duration, status: 200, chunksReturned: memoryResult.chunks.length }, 'Memory query completed');

    return NextResponse.json({
      chunks: memoryResult.chunks,
      facts,
      query,
      userId: user.id,
      method: memoryResult.method,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    log.error({
      correlationId,
      duration,
      error: error instanceof Error ? { message: error.message, name: error.name } : String(error)
    }, 'Memory query failed');

    return handleAPIError(error, 'API:MemoryQuery', correlationId);
  }
}
