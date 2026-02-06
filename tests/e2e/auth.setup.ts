import { Page } from '@playwright/test';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://swvljsixpvvcirjmflze.supabase.co';

const TEST_USER = {
  id: 'test-user-id-e2e',
  email: 'test@soulprint.dev',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

const TEST_SESSION = {
  access_token: 'mock-access-token-e2e',
  refresh_token: 'mock-refresh-token-e2e',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: TEST_USER,
};

/**
 * Intercept Supabase auth endpoints to simulate a logged-in user.
 * Call this before navigating to any authenticated page.
 */
export async function mockAuthenticatedUser(page: Page) {
  // Intercept Supabase auth token endpoint (session refresh)
  await page.route(`${SUPABASE_URL}/auth/v1/token**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_SESSION),
    });
  });

  // Intercept Supabase auth user endpoint
  await page.route(`${SUPABASE_URL}/auth/v1/user`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_USER),
    });
  });

  // Intercept Supabase auth session endpoint
  await page.route(`${SUPABASE_URL}/auth/v1/session`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(TEST_SESSION),
    });
  });
}

/**
 * Mock the memory/status API to return a given import status.
 */
export async function mockMemoryStatus(page: Page, status: 'none' | 'processing' | 'ready') {
  await page.route('**/api/memory/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status,
        hasSoulprint: status === 'ready',
        stats: { totalConversations: 10, totalMessages: 150 },
      }),
    });
  });
}

export { TEST_USER, TEST_SESSION, SUPABASE_URL };
