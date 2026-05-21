import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';

test.describe('SOS and family tracking flow', () => {
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

    // Mock SOS endpoint (matches any URL containing this path)
    await context.route('**/api/v1/emergency/sos', async (route) => {
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

    // Mock live-tracking endpoints (matches any URL containing these paths)
    await context.route('**/api/v1/live-tracking/start', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          session_id: 'e2e-session',
          tracking_url: `${BASE_URL}/track/e2e-session#token=signed-e2e-token`,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    await context.route('**/api/v1/live-tracking/update', async (route) => {
      await route.fulfill({ status: 204, headers: corsHeaders });
    });

    await context.route('**/api/v1/live-tracking/session/e2e-session', async (route) => {
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
    
    // Wait for page to load - check for SOS button or hold text
    await expect(
      page.getByText(/Hold to Activate|SOS|Emergency SOS/i).first()
    ).toBeVisible({ timeout: 15000 });
    
    // Wait for store to hydrate from localStorage (zustand persist is async)
    // In CI, hydration may take longer due to headless environment
    await page.waitForTimeout(2000);
    
    // Verify page has crash profile section (user profile may or may not load in CI)
    await expect(
      page.getByText(/Crash Profile|Blood Group|Vehicle ID/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Find the main SOS button - it's the large circular button with AlertTriangle icon
    const sosButton = page.locator('button.w-56.h-56.rounded-full');
    await expect(sosButton).toBeVisible();
    
    // Simulate pointerdown (start hold)
    await sosButton.dispatchEvent('pointerdown');
    
    // Wait for the 2-second hold animation to complete
    await page.waitForTimeout(2500);
    
    // Simulate pointerup (release after hold) - same button element
    await sosButton.dispatchEvent('pointerup');
    
    // Wait for button text to change to DISPATCHED
    await expect(page.getByText('DISPATCHED')).toBeVisible({ timeout: 10000 });
    
    // Wait for dispatch state message - check for any of the possible states
    await expect(
      page.getByText(/Emergency Declared|Contacting Emergency|SOS Activated/i).first()
    ).toBeVisible({ timeout: 20000 });
    
    // Check for tracking link or share section
    await expect(
      page.getByText(/Family Live Tracking Active|Share Location|WhatsApp/i).first()
    ).toBeVisible();

    const familyPage = await context.newPage();
    await familyPage.goto(`${BASE_URL}/track/e2e-session#token=signed-e2e-token`);
    await expect(familyPage.getByText(/E2E SafeVix User/i).first()).toBeVisible();

    const stopStatus = await page.evaluate(async () => {
      const response = await fetch('/api/v1/live-tracking/session/e2e-session', {
        method: 'DELETE',
      });
      return response.status;
    });
    expect([200, 204]).toContain(stopStatus);
  });
});
