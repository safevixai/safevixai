import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';

test.describe('Municipality guide flow', () => {
  test('renders guide page with search and filters', async ({ page }) => {
    await page.goto(`${BASE_URL}/guide`);

    await expect(
      page.getByText(/Municipality Guide|Civic Hub/i).first()
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByPlaceholder(/Search municipality/i)).toBeVisible();
    await expect(page.getByText(/Find Nearby/i)).toBeVisible();
    await expect(page.getByText(/Filter/i).first()).toBeVisible();
  });

  test('search input accepts text', async ({ page }) => {
    await page.goto(`${BASE_URL}/guide`);

    await expect(
      page.getByText(/Municipality Guide|Civic Hub/i).first()
    ).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByPlaceholder(/Search municipality/i);
    await searchInput.fill('Chennai');
    await expect(searchInput).toHaveValue('Chennai');
  });

  test('filter toggle shows state chips and type pills', async ({ page }) => {
    await page.goto(`${BASE_URL}/guide`);

    await expect(
      page.getByText(/Municipality Guide|Civic Hub/i).first()
    ).toBeVisible({ timeout: 15000 });

    await page.getByText(/Filter/i).first().click();

    await expect(page.getByText(/State|Type/i).first()).toBeVisible();
    await expect(page.getByText(/All|Corporation|Municipality/i).first()).toBeVisible();
  });

  test('guide information section renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/guide`);

    await expect(
      page.getByText(/Municipality Guide|Civic Hub/i).first()
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText(/How to Use This Guide/i)).toBeVisible();
    await expect(page.getByText(/Search|Find Nearby|View Details/i).first()).toBeVisible();
  });
});
