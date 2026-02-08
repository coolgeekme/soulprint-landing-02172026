import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import { server } from '@/tests/mocks/server';
import { http, HttpResponse } from 'msw';
import * as appHandler from '@/app/api/memory/status/route';

// Mock the supabase/server module
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              user_id: 'test-user-id',
              import_status: 'complete',
              import_error: null,
              processing_started_at: '2024-01-01T00:00:00Z',
              total_conversations: 10,
              total_messages: 50,
              soulprint_generated_at: '2024-01-01T00:00:00Z',
              soulprint_locked: false,
              locked_at: null,
              embedding_status: 'complete',
              embedding_progress: 100,
              total_chunks: 100,
              processed_chunks: 100,
              memory_status: 'ready',
            },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

describe('GET /api/memory/status', () => {
  beforeEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('returns status "none" when no profile', async () => {
    // Mock to return PGRST116 error (not found)
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn(() => ({
          data: { user: { id: 'no-profile-user', email: 'test@example.com' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            })),
          })),
        })),
      })),
    } as any);

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('none');
        expect(body.hasSoulprint).toBe(false);
        expect(body.stats).toBeNull();
      },
    });
  });

  it('returns status "ready" when import complete', async () => {
    // Use default mock which returns complete status
    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('ready');
        expect(body.hasSoulprint).toBe(true);
        expect(body.stats).toBeDefined();
        expect(body.stats.totalConversations).toBe(10);
        expect(body.stats.totalMessages).toBe(50);
      },
    });
  });

  it('returns status "processing" when importing', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn(() => ({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                user_id: 'test-user-id',
                import_status: 'processing',
                import_error: null,
                processing_started_at: new Date().toISOString(),
                total_conversations: 0,
                total_messages: 0,
                soulprint_generated_at: null,
                soulprint_locked: false,
                locked_at: null,
                embedding_status: null,
                embedding_progress: 0,
                total_chunks: 0,
                processed_chunks: 0,
                memory_status: 'building',
              },
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('processing');
        expect(body.hasSoulprint).toBe(false);
        expect(body.stats).toBeDefined();
      },
    });
  });

  it('returns status "failed" when import failed', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn(() => ({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                user_id: 'test-user-id',
                import_status: 'failed',
                import_error: 'Something went wrong',
                processing_started_at: '2024-01-01T00:00:00Z',
                total_conversations: 0,
                total_messages: 0,
                soulprint_generated_at: null,
                soulprint_locked: false,
                locked_at: null,
                embedding_status: null,
                embedding_progress: 0,
                total_chunks: 0,
                processed_chunks: 0,
                memory_status: null,
              },
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('failed');
        expect(body.failed).toBe(true);
        expect(body.import_error).toBe('Something went wrong');
      },
    });
  });

  it('returns status "ready" when locked', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn(() => ({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                user_id: 'test-user-id',
                import_status: 'complete',
                import_error: null,
                processing_started_at: '2024-01-01T00:00:00Z',
                total_conversations: 10,
                total_messages: 50,
                soulprint_generated_at: '2024-01-01T00:00:00Z',
                soulprint_locked: true,
                locked_at: '2024-01-02T00:00:00Z',
                embedding_status: 'complete',
                embedding_progress: 100,
                total_chunks: 100,
                processed_chunks: 100,
                memory_status: 'ready',
              },
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('ready');
        expect(body.locked).toBe(true);
        expect(body.hasSoulprint).toBe(true);
        expect(body.stats.lockedAt).toBe('2024-01-02T00:00:00Z');
      },
    });
  });

  it('returns stats when profile exists', async () => {
    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.stats).toBeDefined();
        expect(body.stats.totalConversations).toBeDefined();
        expect(body.stats.totalMessages).toBeDefined();
        expect(body.stats.generatedAt).toBeDefined();
      },
    });
  });

  it('returns none status when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn(() => ({
          data: { user: null },
          error: { message: 'Not authenticated' },
        })),
      },
    } as any);

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('none');
        expect(body.hasSoulprint).toBe(false);
        expect(body.stats).toBeNull();
      },
    });
  });

  it('treats full_pass_status="pending" as "complete" for legacy imports', async () => {
    // Legacy scenario: User completed import before full_pass_status column was added
    // Migration added column with DEFAULT 'pending', causing infinite "Building deep memory..." loop
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn(() => ({
          data: { user: { id: 'legacy-user-id', email: 'legacy@example.com' } },
          error: null,
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                user_id: 'legacy-user-id',
                import_status: 'complete',
                import_error: null,
                processing_started_at: '2024-01-01T00:00:00Z',
                total_conversations: 10,
                total_messages: 50,
                soulprint_generated_at: '2024-01-01T00:00:00Z',
                soulprint_locked: false,
                locked_at: null,
                embedding_status: 'complete',
                embedding_progress: 100,
                total_chunks: 100,
                processed_chunks: 100,
                memory_status: 'ready',
                full_pass_status: 'pending', // Legacy: set by migration DEFAULT
                full_pass_error: null,
              },
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('ready');
        expect(body.hasSoulprint).toBe(true);
        // Key assertion: fullPassStatus should be 'complete', not 'pending'
        expect(body.fullPassStatus).toBe('complete');
      },
    });
  });
});
