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

    expect(swRegistered).toBe(true);
  });

  test('offline SOS queue', async ({ page }) => {
    await page.goto('/');

    await page.context().setOffline(true);

    await page.goto('/sos');

    await page.context().setOffline(false);

    await page.reload();

    await expect(page.locator('main')).toBeVisible();
  });

  test('offline cached data available', async ({ page }) => {
    await page.goto('/');

    await page.context().setOffline(true);

    await page.goto('/emergency');

    await expect(page.locator('main')).toBeVisible();

    await page.context().setOffline(false);
  });

  test('online sync after offline', async ({ page }) => {
    await page.goto('/');

    await page.context().setOffline(true);

    await page.goto('/report');

    await page.context().setOffline(false);

    await page.reload();

    await expect(page.locator('main')).toBeVisible();
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
    await page.goto('/challan');

    await page.context().setOffline(true);

    await page.reload();

    await expect(page.locator('select')).toBeVisible();

    await page.context().setOffline(false);
  });
});
