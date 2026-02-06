import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import { server } from '@/tests/mocks/server';
import { http, HttpResponse } from 'msw';
import * as appHandler from '@/app/api/chat/messages/route';

// Mock the supabase/server module
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      })),
    },
  })),
}));

describe('GET /api/chat/messages', () => {
  beforeEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('returns 401 when not authenticated', async () => {
    // Mock auth to return no user
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

        expect(response.status).toBe(401);

        const body = await response.json();
        expect(body.error).toBe('Unauthorized');
      },
    });
  });

  it('returns messages array for authenticated user', async () => {
    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.messages).toBeInstanceOf(Array);
        expect(body.messages.length).toBeGreaterThan(0);
        expect(body.messages[0]).toHaveProperty('id');
        expect(body.messages[0]).toHaveProperty('role');
        expect(body.messages[0]).toHaveProperty('content');
        expect(body.messages[0]).toHaveProperty('created_at');
        expect(body.hasMore).toBeDefined();
      },
    });
  });

  it('returns empty array when user has no messages', async () => {
    // Override handler to return empty array
    server.use(
      http.get('https://test.supabase.co/rest/v1/chat_messages', () => {
        return HttpResponse.json([]);
      })
    );

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.messages).toEqual([]);
        expect(body.hasMore).toBe(false);
      },
    });
  });
});

describe('POST /api/chat/messages', () => {
  beforeEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('returns 401 when not authenticated', async () => {
    // Mock auth to return no user
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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: 'Hello' }),
        });

        expect(response.status).toBe(401);

        const body = await response.json();
        expect(body.error).toBe('Unauthorized');
      },
    });
  });

  it('validates message body with Zod', async () => {
    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        // Send invalid body (empty content)
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: '' }),
        });

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.code).toBe('VALIDATION_ERROR');
        expect(body.error).toContain('Content is required');
      },
    });
  });

  it('validates role must be user or assistant', async () => {
    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'system', content: 'Hello' }),
        });

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.code).toBe('VALIDATION_ERROR');
        expect(body.error).toContain('Role must be');
      },
    });
  });

  it('saves valid message', async () => {
    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: 'Hello, world!' }),
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.message).toBeDefined();
        expect(body.message.role).toBe('user');
        expect(body.message.content).toBe('Hello, world!');
        expect(body.message.id).toBeDefined();
      },
    });
  });

  it('handles invalid JSON', async () => {
    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json',
        });

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.code).toBe('INVALID_JSON');
        expect(body.error).toContain('Invalid JSON');
      },
    });
  });
});
