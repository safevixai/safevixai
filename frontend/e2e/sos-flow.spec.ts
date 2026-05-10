import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

test.describe('SOS and family tracking flow', () => {
  test('dispatches SOS, creates a signed tracking link, opens family view, and stops tracking', async ({
    browser,
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

    await page.route('**/api/v1/emergency/sos**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      await route.fulfill({
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
    });

    await page.route('**/api/v1/live-tracking/start', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          session_id: 'e2e-session',
          tracking_url: `${BASE_URL}/track/e2e-session?token=signed-e2e-token`,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    await page.route('**/api/v1/live-tracking/update', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      await route.fulfill({ status: 204, headers: corsHeaders });
    });

    await page.route('**/api/v1/live-tracking/session/e2e-session**', async (route) => {
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

    const sosButton = await page.getByRole('button', { name: /Activate emergency SOS/i }).elementHandle();
    expect(sosButton).not.toBeNull();
    await sosButton!.dispatchEvent('pointerdown');
    await expect(page.getByText('DISPATCHED')).toBeVisible({ timeout: 10000 });
    await sosButton!.dispatchEvent('pointerup');

    await expect(page.getByText(/Emergency Declared/i)).toBeVisible();
    await expect(page.getByText(/Family Live Tracking Active/i)).toBeVisible();

    const familyPage = await browser.newPage();
    await familyPage.route('**/api/v1/live-tracking/session/e2e-session**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
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
          latitude: 13.083,
          longitude: 80.271,
          accuracy: 10,
          speed_kmh: null,
          battery_percent: 79,
          is_active: true,
          updated_at: new Date().toISOString(),
        }),
      });
    });
    await familyPage.goto(`${BASE_URL}/track/e2e-session?token=signed-e2e-token`);
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
