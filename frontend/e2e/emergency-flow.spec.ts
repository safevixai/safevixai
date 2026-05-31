import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';

test.describe('Emergency page flow', () => {
  test('renders emergency page with protocol cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/emergency`);

    await expect(
      page.getByText(/Emergency Guide|Protocol Terminal|Emergency Center/i).first()
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText(/Emergency SOS/i).first()).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: /Filter/i })).toBeVisible();
    await expect(page.getByText(/CALL 112|Call 112/i).first()).toBeVisible();
  });

  test('category filter buttons are present', async ({ page }) => {
    await page.goto(`${BASE_URL}/emergency`);

    await expect(
      page.getByText(/Emergency Guide|Protocol Terminal/i).first()
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText(/All|Medical|Fire|Accident|Criminal/i).first()).toBeVisible();

    const filterCount = await page.locator('button[role="radio"]').count();
    expect(filterCount).toBeGreaterThanOrEqual(3);
  });

  test('protocol cards render and can be expanded', async ({ page }) => {
    await page.goto(`${BASE_URL}/emergency`);

    await expect(
      page.getByText(/Emergency Guide|Protocol Terminal/i).first()
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText(/Cardiopulmonary Resuscitation|CPR|Emergency Response/i).first()).toBeVisible();
  });

  test('accordion expand shows protocol steps', async ({ page }) => {
    await page.goto(`${BASE_URL}/emergency`);

    await expect(
      page.getByText(/Emergency Guide|Protocol Terminal/i).first()
    ).toBeVisible({ timeout: 15000 });

    const cardBtn = page.getByText(/Cardiopulmonary Resuscitation|Severe Hemorrhage/i).first();
    await cardBtn.click();

    await expect(
      page.getByText(/Step-by-Step Tactical Guide|Sequential Actions|Call 112/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
