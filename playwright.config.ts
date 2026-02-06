import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * - Runs tests in tests/e2e directory
 * - Auto-starts Next.js dev server via webServer
 * - Uses chromium only for smoke testing
 * - 30s timeout per test (matches project constraints)
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 1 : 0,

  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot only on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers (chromium only for now)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Allow reusing existing server to avoid port conflicts
    timeout: 120 * 1000, // 2 minutes for Next.js dev server to start
  },

  // Test timeout (30s per test)
  timeout: 30 * 1000,
});
