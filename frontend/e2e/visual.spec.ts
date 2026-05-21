import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.locator('#main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('emergency page visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/emergency');

    await expect(page.getByRole('heading', { name: /Protocol Terminal/i }).first()).toBeVisible();

    await expect(page).toHaveScreenshot('emergency-page.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('chat page visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/assistant');

    // Wait for chat interface to load
    await expect(page.locator('#main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('chat-page.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('dark mode visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect(page.locator('#main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-dark.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('mobile visual', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('#main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
