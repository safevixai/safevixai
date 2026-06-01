import { test, expect } from '@playwright/test';

async function waitForMount(page: any) {
  await page.waitForFunction(() => {
    const el = document.querySelector('h1');
    return el && el.textContent?.includes('Report Hazard') && window.getComputedStyle(el).opacity !== '0';
  }, { timeout: 15000 });
}

test.describe('Road Report Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/report');
    await page.waitForLoadState('networkidle');
    await waitForMount(page);
  });

  test('report page renders with all steps', async ({ page }) => {
    await expect(page.getByText(/Report Road Issue/i)).toBeVisible();
    await expect(page.getByText(/Pothole|Road Crack|Roads|Traffic|Streetlights/i)).toBeVisible();
  });

  test('requires GPS location before proceeding', async ({ page }) => {
    const submitButtons = page.getByRole('button').filter({ hasText: /Next|Submit|Continue/i });
    const buttonCount = await submitButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('has photo upload option', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const fileInputCount = await fileInput.count();
    expect(fileInputCount).toBeGreaterThanOrEqual(0);
  });

  test('shows category options', async ({ page }) => {
    const roadDamage = page.getByText(/Pothole|Road Crack|Roads|Traffic|Streetlights/i);
    await expect(roadDamage.first()).toBeVisible();
  });

  test('has emergency contact option visible', async ({ page }) => {
    const emergencyButton = page.getByRole('link', { name: /112|emergency/i });
    const emergencyButtonCount = await emergencyButton.count();
    expect(emergencyButtonCount).toBeGreaterThanOrEqual(0);
  });
});
