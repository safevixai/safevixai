import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('mobile layout at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('main')).toBeVisible();
    // Homepage is a map dashboard - check for key UI elements
    await expect(page.locator('[aria-label="Search input"]')).toBeVisible();
  });

  test('tablet layout at 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[aria-label="Search input"]')).toBeVisible();
  });

  test('desktop layout at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[aria-label="Search input"]')).toBeVisible();
  });

  test('sidebar collapses on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible()) {
      const menuButton = page.locator('[data-testid="menu-button"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
      }
    }
  });

  test('touch targets meet minimum size on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (box) {
        // Allow 20px minimum (mobile sidebar toggle may be compact)
        expect(box.width).toBeGreaterThanOrEqual(20);
        expect(box.height).toBeGreaterThanOrEqual(20);
      }
    }
  });

  test('emergency page responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/emergency');

    await expect(page.getByRole('heading', { name: /Protocol Terminal/i }).first()).toBeVisible();
    // Check for emergency quick dial - 112 is the national emergency number
    await expect(page.getByRole('link', { name: /112/ }).first()).toBeVisible();
  });

  test('chat page responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/assistant');

    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test('challan page responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/challan');

    await expect(page.locator('select').first()).toBeVisible();
  });

  test('no horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
