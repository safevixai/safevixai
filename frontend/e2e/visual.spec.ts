import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('svai-storage', JSON.stringify({
        state: { isAuthenticated: true, operatorName: 'E2E Test User' },
        version: 0,
      }));
    });
  });

  test('homepage visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.locator('main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      maxDiffPixelRatio: 0.08,
    });
  });

  test('emergency page visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/emergency');

    await expect(page.getByText(/Protocol Terminal/i).first()).toBeVisible();

    await expect(page).toHaveScreenshot('emergency-page.png', {
      maxDiffPixelRatio: 0.15,
    });
  });

  test('chat page visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/assistant');

    await expect(page.locator('main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('chat-page.png', {
      maxDiffPixelRatio: 0.08,
    });
  });

  test('dark mode visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect(page.locator('main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-dark.png', {
      maxDiffPixelRatio: 0.70,
    });
  });

  test('mobile visual', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      maxDiffPixelRatio: 0.08,
    });
  });
});
