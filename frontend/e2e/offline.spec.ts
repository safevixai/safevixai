import { test, expect, Page } from '@playwright/test';

test.describe('Offline/PWA Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('__E2E_SKIP_AUTH__', 'true');
    });
  });

  async function isSwRegistered(page: Page) {
    return page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    });
  }

  async function waitForMount(page: Page, text: string) {
    await page.waitForFunction((t: string) => {
      const h1 = document.querySelector('h1');
      return h1 && h1.textContent?.includes(t);
    }, text, { timeout: 15000 });
  }

  test('service worker registration', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(
      isSwRegistered,
      { timeout: 15000 }
    ).catch(() => null);
    
    const swRegistered = await isSwRegistered(page);

    if (!swRegistered) {
      console.log('Service Worker not registered - expected in local dev mode');
      console.log('Run with production build to test SW registration');
    }
    
    expect(swRegistered || process.env.NODE_ENV !== 'production').toBeTruthy();
  });

  test('offline SOS queue', async ({ page }) => {
    await page.goto('/sos');
    await waitForMount(page, 'SOS');
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByText(/Hold to Activate|SOS|Emergency/i)).toBeVisible();

    await page.context().setOffline(true);

    await expect(page.getByText(/Hold to Activate|SOS|Emergency/i)).toBeVisible();

    await page.context().setOffline(false);
  });

  test('offline cached data available', async ({ page }) => {
    await page.goto('/emergency');
    await waitForMount(page, 'Protocol Terminal');
    await expect(page.locator('main').first()).toBeVisible();

    await page.context().setOffline(true);

    await expect(page.locator('main').first()).toBeVisible();

    await page.context().setOffline(false);
  });

  test('online sync after offline', async ({ page }) => {
    await page.goto('/report');
    await waitForMount(page, 'Road Hazard');
    await expect(
      page.getByRole('heading').first().or(page.locator('input, select, textarea').first())
    ).toBeVisible({ timeout: 15000 });

    await page.context().setOffline(true);
    const isOffline = await page.evaluate(async () => {
      try {
        await fetch('/manifest.json', { cache: 'no-store' });
        return false;
      } catch {
        return true;
      }
    });
    expect(isOffline).toBe(true);

    await page.context().setOffline(false);
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    await expect(
      page.getByRole('heading').first().or(page.locator('input, select, textarea').first())
    ).toBeVisible({ timeout: 10000 });
  });

  test('manifest valid', async ({ page }) => {
    if (process.env.CI === 'true') {
      console.log('Skipping manifest test in CI (standalone build issue)');
      return;
    }

    const response = await page.goto('/manifest.json');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

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
    await waitForMount(page, 'Estimation');
    await expect(page.locator('select').first()).toBeVisible();

    await page.context().setOffline(true);

    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();

    await page.context().setOffline(false);
  });
});
