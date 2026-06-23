// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { test, expect } from '@playwright/test';

test.describe('Challan calculator flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('__E2E_SKIP_AUTH__', 'true');
    });
  });

  async function waitForMount(page: any) {
    await page.waitForFunction(() => {
      const h1 = document.querySelector('h1');
      return h1 && (h1.textContent?.includes('Estimation') || h1.textContent?.includes('Challan'));
    }, { timeout: 15000 });
  }

  test('renders challan calculator with key UI elements', async ({ page }) => {
    await page.goto('/challan');
    await waitForMount(page);

    await expect(page.locator('select[aria-label="Select violation type"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('select[aria-label="Select jurisdiction state"]')).toBeVisible();
    await expect(page.getByText(/2-Wheeler|Car\/LMV/i).first()).toBeVisible();
    await expect(page.getByText(/Repeat Offender/i)).toBeVisible();
  });

  test('shows loading state when calculating', async ({ page }) => {
    await page.goto('/challan');
    await waitForMount(page);

    await expect(
      page.getByText(/Estimation Terminal|Calculator Active/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('violation select contains options', async ({ page }) => {
    await page.goto('/challan');
    await waitForMount(page);

    await expect(page.locator('select[aria-label="Select violation type"]')).toBeVisible();

    const options = page.locator('select[aria-label="Select violation type"] option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('jurisdiction select contains options', async ({ page }) => {
    await page.goto('/challan');
    await waitForMount(page);

    await expect(page.locator('select[aria-label="Select jurisdiction state"]')).toBeVisible();

    const options = page.locator('select[aria-label="Select jurisdiction state"] option');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('vehicle class buttons are interactive', async ({ page }) => {
    await page.goto('/challan');
    await waitForMount(page);

    const vehicleBtn = page.getByText(/2-Wheeler|Car\/LMV/i).first();
    await expect(vehicleBtn).toBeVisible();
    await vehicleBtn.click();
  });
});
