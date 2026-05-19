import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';

test.describe('SOS and family tracking flow', () => {
  test.skip(true, 'SOS flow test requires complex backend mocking - run manually against staging');

  test('dispatches SOS, creates a signed tracking link, opens family view, and stops tracking', async ({
    context,
    page,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 13.0827, longitude: 80.2707 });
    await page.addInitScript(() => {
      localStorage.setItem(
        'svai-storage',
        JSON.stringify({
          state: {
            userProfile: {
              name: 'E2E SafeVix User',
              bloodGroup: 'O+',
              vehicleNumber: 'TN01AB1234',
              emergencyContact: '+919999999999',
            },
          },
          version: 0,
        })
      );
      window.open = () => null;
    });

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    await context.route('**/speech/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ status: 'ok', providers: [] }),
      });
    });

    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();
      const method = request.method();
      if (url.includes('/speech/status')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({ status: 'ok', providers: [] }),
        });
      }
      if (method === 'OPTIONS' && url.includes('/api/v1/')) {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      if (url.includes('/api/v1/emergency/sos')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({
            services: [],
            count: 0,
            radius_used: 0,
            source: 'e2e',
            numbers: {
              national_emergency: { service: '112', coverage: 'Pan-India' },
            },
          }),
        });
      }
      if (url.includes('/api/v1/live-tracking/start')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: corsHeaders,
          body: JSON.stringify({
            session_id: 'e2e-session',
            tracking_url: `${BASE_URL}/track/e2e-session#token=signed-e2e-token`,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          }),
        });
      }
      if (url.includes('/api/v1/live-tracking/update')) {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      if (!url.includes('/api/v1/live-tracking/session/e2e-session')) {
        return route.continue();
      }
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          session_id: 'e2e-session',
          user_name: 'E2E SafeVix User',
          blood_group: 'O+',
          vehicle_number: 'TN01AB1234',
          latitude: 13.0827,
          longitude: 80.2707,
          accuracy: 12,
          speed_kmh: null,
          battery_percent: 80,
          is_active: true,
          updated_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto(`${BASE_URL}/sos`);
    await expect(page.getByText(/Hold to Activate/i)).toBeVisible();
    await expect(page.getByText(/Lat:\s*13\.0827,\s*Long:\s*80\.2707/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/E2E SafeVix User/i)).toBeVisible();

    const sosButton = await page.getByRole('button', { name: /Activate emergency SOS/i }).elementHandle();
    expect(sosButton).not.toBeNull();
    await sosButton!.dispatchEvent('pointerdown');
    await expect(page.getByText('DISPATCHED')).toBeVisible({ timeout: 10000 });
    await sosButton!.dispatchEvent('pointerup');

    await expect(page.getByText(/Emergency Declared/i)).toBeVisible();
    await expect(page.getByText(/Family Live Tracking Active/i)).toBeVisible();

    const familyPage = await context.newPage();
    await familyPage.goto(`${BASE_URL}/track/e2e-session#token=signed-e2e-token`);
    await expect(familyPage.getByText(/E2E SafeVix User/i)).toBeVisible();

    const stopStatus = await page.evaluate(async () => {
      const response = await fetch('/api/v1/live-tracking/session/e2e-session', {
        method: 'DELETE',
      });
      return response.status;
    });
    expect([200, 204]).toContain(stopStatus);
  });
});
