import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.locator('#main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      maxDiffPixels: 100,
    });
  });

  test('emergency page visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/emergency');

    await expect(page.getByRole('heading', { name: /Protocol Terminal/i }).first()).toBeVisible();

    await expect(page).toHaveScreenshot('emergency-page.png', {
      maxDiffPixels: 100,
    });
  });

  test('chat page visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/assistant');

    await expect(page.locator('input[type="text"]').first()).toBeVisible();

    await expect(page).toHaveScreenshot('chat-page.png', {
      maxDiffPixels: 100,
    });
  });

  test('dark mode visual', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect(page.locator('#main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-dark.png', {
      maxDiffPixels: 100,
    });
  });

  test('mobile visual', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('#main').first()).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      maxDiffPixels: 100,
    });
  });
});
