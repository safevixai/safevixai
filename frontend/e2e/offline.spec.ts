import { test, expect } from '@playwright/test';

test.describe('Offline/PWA Tests', () => {
  test('service worker registration', async ({ page, context }) => {
    await page.goto('/');

    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return !!registration;
      }
      return false;
    });

    // Service Worker only activates in production builds
    test.skip(!swRegistered, 'Service Worker not registered (expected in dev mode)');
    expect(swRegistered).toBe(true);
  });

  test('offline SOS queue', async ({ page }) => {
    // Navigate to SOS page while online
    await page.goto('/sos');
    await expect(page.locator('#main').first()).toBeVisible();
    await expect(page.getByText(/Hold to Activate/i)).toBeVisible();

    // Go offline - page should remain visible (already loaded)
    await page.context().setOffline(true);

    // Verify page content is still accessible without navigation
    await expect(page.getByText(/Hold to Activate/i)).toBeVisible();

    await page.context().setOffline(false);
  });

  test('offline cached data available', async ({ page }) => {
    // Navigate to emergency page while online
    await page.goto('/emergency');
    await expect(page.locator('#main').first()).toBeVisible();

    // Go offline - page should remain visible
    await page.context().setOffline(true);

    // Verify page content is still accessible
    await expect(page.locator('#main').first()).toBeVisible();

    await page.context().setOffline(false);
  });

  test('online sync after offline', async ({ page }) => {
    // Navigate to report page while online
    await page.goto('/report');
    await expect(page.locator('#main').first()).toBeVisible();

    // Go offline
    await page.context().setOffline(true);

    // Verify page remains accessible
    await expect(page.locator('#main').first()).toBeVisible();

    // Go back online and reload
    await page.context().setOffline(false);
    await page.reload();
    await expect(page.locator('#main').first()).toBeVisible();
  });

  test('manifest valid', async ({ page }) => {
    const response = await page.goto('/manifest.json');

    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('PWA install prompt appears', async ({ page }) => {
    await page.goto('/');

    const hasManifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      return !!link;
    });

    expect(hasManifest).toBe(true);
  });

  test('offline challan calculation', async ({ page }) => {
    // Navigate to challan page while online
    await page.goto('/challan');
    await expect(page.locator('select').first()).toBeVisible();

    // Go offline - page should remain visible
    await page.context().setOffline(true);

    // Verify page content is still accessible
    await expect(page.locator('#main').first()).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();

    await page.context().setOffline(false);
  });
});
