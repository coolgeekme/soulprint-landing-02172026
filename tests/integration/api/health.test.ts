import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import { server } from '@/tests/mocks/server';
import { http, HttpResponse } from 'msw';
import * as appHandler from '@/app/api/health/route';

describe('GET /api/health', () => {
  beforeEach(() => {
    // Reset handlers before each test
    server.resetHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('returns healthy when all dependencies OK', async () => {
    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('healthy');
        expect(body.timestamp).toBeDefined();
        expect(body.dependencies).toBeDefined();
        expect(body.dependencies.supabase).toBeDefined();
        expect(body.dependencies.supabase.status).toBe('healthy');
        expect(body.dependencies.rlm).toBeDefined();
        expect(body.dependencies.rlm.status).toBe('healthy');
        expect(body.dependencies.bedrock).toBeDefined();
        expect(body.dependencies.bedrock.status).toBe('healthy');
      },
    });
  });

  it('returns degraded when RLM returns 500', async () => {
    // Override RLM handler to return 500
    server.use(
      http.get('https://soulprint-landing.onrender.com/health', () => {
        return HttpResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      })
    );

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        // Should still return 200 for degraded (not completely down)
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('degraded');
        expect(body.dependencies.rlm.status).toBe('degraded');
        expect(body.dependencies.rlm.message).toContain('500');
      },
    });
  });

  it('returns down when RLM unreachable', async () => {
    // Override RLM handler to throw network error
    server.use(
      http.get('https://soulprint-landing.onrender.com/health', () => {
        return HttpResponse.error();
      })
    );

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        // Should return 503 when overall status is down
        expect(response.status).toBe(503);

        const body = await response.json();
        expect(body.status).toBe('down');
        expect(body.dependencies.rlm.status).toBe('down');
      },
    });
  });

  it('returns degraded when Supabase returns error', async () => {
    // Override Supabase handler to return error response
    server.use(
      http.get('https://test.supabase.co/rest/v1/profiles', () => {
        return HttpResponse.json(
          { message: 'Database error', code: 'PGRST301' },
          { status: 500 }
        );
      })
    );

    await testApiHandler({
      appHandler,
      async test({ fetch }) {
        const response = await fetch({
          method: 'GET',
        });

        // When Supabase returns an error response, it's marked as degraded
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('degraded');
        expect(body.dependencies.supabase.status).toBe('degraded');
      },
    });
  });
});
