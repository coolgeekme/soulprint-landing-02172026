import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from '@/app/api/import/complete/route';

// Mock modules
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => null),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(() => ({ success: true })),
}));

const createMockAdminClient = () => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { user_id: 'test-user-id', archetype: 'Test Archetype' },
          error: null,
        })),
      })),
    })),
  })),
  auth: {
    admin: {
      getUserById: vi.fn(() => ({
        data: {
          user: {
            email: 'test@example.com',
            user_metadata: { display_name: 'Test User' },
          },
        },
        error: null,
      })),
    },
  },
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => createMockAdminClient()),
}));

describe('POST /api/import/complete', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when user profile not found', async () => {
    // Override Supabase mock to return error
    const { createClient } = await import('@supabase/supabase-js');
    const mockClient = createMockAdminClient();
    mockClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: 'Profile not found' },
          })),
        })),
      })),
    }));
    vi.mocked(createClient).mockReturnValueOnce(mockClient as any);

    const request = new Request('http://localhost/api/import/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'missing-user-id' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Profile not found');
  });

  it('validates request body with Zod', async () => {
    const request = new Request('http://localhost/api/import/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Missing user_id
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toBeDefined();
  });

  it('sends email notification on completion', async () => {
    const request = new Request('http://localhost/api/import/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'test-user-id',
        chunks_embedded: 100,
        processing_time: 15.5,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.email_sent).toBe(true);

    // Verify sendEmail was called
    const { sendEmail } = await import('@/lib/email');
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('SoulPrint is Ready'),
        html: expect.stringContaining('Test User'),
      })
    );
  });

  it('handles missing user email gracefully', async () => {
    // Override auth mock to return user without email
    const { createClient } = await import('@supabase/supabase-js');
    const mockClient = createMockAdminClient();
    mockClient.auth.admin.getUserById = vi.fn(() => ({
      data: {
        user: {
          email: null,
          user_metadata: {},
        },
      },
      error: null,
    }));
    vi.mocked(createClient).mockReturnValueOnce(mockClient as any);

    const request = new Request('http://localhost/api/import/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'no-email-user-id' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.email_sent).toBe(false);

    // Email should NOT have been called
    const { sendEmail } = await import('@/lib/email');
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it('accepts progressive availability params', async () => {
    const request = new Request('http://localhost/api/import/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'test-user-id',
        soulprint_ready: true,
        memory_building: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);

    // Email should contain memory building note when memory_building is true
    const { sendEmail } = await import('@/lib/email');
    const emailCall = vi.mocked(sendEmail).mock.calls[0][0];
    expect(emailCall.html).toContain('Memory is still building');
  });

  it('handles auth user fetch failure', async () => {
    // Override auth mock to return error
    const { createClient } = await import('@supabase/supabase-js');
    const mockClient = createMockAdminClient();
    mockClient.auth.admin.getUserById = vi.fn(() => ({
      data: null,
      error: { message: 'Auth user not found' },
    }));
    vi.mocked(createClient).mockReturnValueOnce(mockClient as any);

    const request = new Request('http://localhost/api/import/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test-user-id' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.email_sent).toBe(false); // No email sent because auth failed

    const { sendEmail } = await import('@/lib/email');
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it('handles invalid JSON in request body', async () => {
    const request = new Request('http://localhost/api/import/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('Invalid JSON');
  });

  it('includes display name in email when available', async () => {
    const request = new Request('http://localhost/api/import/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test-user-id' }),
    });

    await POST(request);

    const { sendEmail } = await import('@/lib/email');
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Hey Test User'),
      })
    );
  });

  it('defaults to "there" when no display name', async () => {
    // Override auth mock to return user without display_name
    const { createClient } = await import('@supabase/supabase-js');
    const mockClient = createMockAdminClient();
    mockClient.auth.admin.getUserById = vi.fn(() => ({
      data: {
        user: {
          email: 'test@example.com',
          user_metadata: {},
        },
      },
      error: null,
    }));
    vi.mocked(createClient).mockReturnValueOnce(mockClient as any);

    const request = new Request('http://localhost/api/import/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'test-user-id' }),
    });

    await POST(request);

    const { sendEmail } = await import('@/lib/email');
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Hey there'),
      })
    );
  });
});
