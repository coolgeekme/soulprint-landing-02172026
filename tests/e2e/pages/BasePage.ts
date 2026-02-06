import { Page } from '@playwright/test';

/**
 * BasePage - Minimal Page Object Model base class
 *
 * Provides common utilities for page navigation and waiting.
 * Future page objects (ImportPage, ChatPage) can extend this.
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a path relative to baseURL
   */
  async goto(path: string) {
    await this.page.goto(path);
  }

  /**
   * Wait for page to load (networkidle or domcontentloaded)
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }
}
