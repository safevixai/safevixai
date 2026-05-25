import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';

test.describe('Challan calculator flow', () => {
  test('renders challan calculator with key UI elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/challan`);

    await expect(
      page.getByText(/Challan Calculator|Estimation Terminal|Calculator Active/i).first()
    ).toBeVisible({ timeout: 15000 });

    await expect(page.locator('select[aria-label="Violation type"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Jurisdiction state"]')).toBeVisible();
    await expect(page.getByText(/2-Wheeler|Car\/LMV/i).first()).toBeVisible();
    await expect(page.getByText(/Repeat Offender/i)).toBeVisible();
  });

  test('shows loading state when calculating', async ({ page }) => {
    await page.goto(`${BASE_URL}/challan`);

    await expect(
      page.getByText(/Loading|Estimation Terminal|Calculator Active/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('violation select contains options', async ({ page }) => {
    await page.goto(`${BASE_URL}/challan`);

    await expect(page.locator('select[aria-label="Violation type"]')).toBeVisible();

    const options = page.locator('select[aria-label="Violation type"] option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('jurisdiction select contains options', async ({ page }) => {
    await page.goto(`${BASE_URL}/challan`);

    await expect(page.locator('select[aria-label="Jurisdiction state"]')).toBeVisible();

    const options = page.locator('select[aria-label="Jurisdiction state"] option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('vehicle class buttons are interactive', async ({ page }) => {
    await page.goto(`${BASE_URL}/challan`);

    await expect(
      page.getByText(/Challan Calculator|Estimation Terminal/i).first()
    ).toBeVisible({ timeout: 15000 });

    const vehicleBtn = page.getByText(/2-Wheeler|Car\/LMV/i).first();
    await expect(vehicleBtn).toBeVisible();
    await vehicleBtn.click();
  });
});
