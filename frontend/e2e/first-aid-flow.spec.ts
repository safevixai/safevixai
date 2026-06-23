// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { test, expect } from '@playwright/test';

async function waitForMount(page: any) {
  await page.waitForFunction(() => {
    const el = document.querySelector('h1');
    return el && el.textContent?.includes('First Aid');
  }, { timeout: 15000 });
}

test.describe('First aid page flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('__E2E_SKIP_AUTH__', 'true');
    });
    await page.goto('/first-aid');
    await waitForMount(page);
  });

  test('renders first aid guide cards', async ({ page }) => {
    await expect(
      page.getByText(/First Aid HUD|Emergency Guide|First Aid/i).first()
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByPlaceholder(/Search emergency protocol/i)).toBeVisible();
    await expect(page.getByText(/Start Guide/i).first()).toBeVisible();
  });

  test('clicking a card shows modal with details', async ({ page }) => {
    await expect(
      page.getByText(/First Aid HUD|Emergency Guide|First Aid/i).first()
    ).toBeVisible({ timeout: 15000 });

    const startButton = page.getByText(/Start Guide/i).first();
    await startButton.click();

    await expect(
      page.getByText(/Live Protocol|Instructions|Sequential Actions/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('search filters protocol list', async ({ page }) => {
    await expect(
      page.getByText(/First Aid HUD|Emergency Guide|First Aid/i).first()
    ).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByPlaceholder(/Search emergency protocol/i);
    await searchInput.fill('cpr');

    await expect(page.getByText(/CPR|Cardiopulmonary/i).first()).toBeVisible();
  });

  test('emergency mode toggle works', async ({ page }) => {
    await expect(
      page.getByText(/First Aid HUD|Emergency Guide|First Aid/i).first()
    ).toBeVisible({ timeout: 15000 });

    const modeButton = page.getByText(/Normal Mode|Emergency Active/i).first();
    await expect(modeButton).toBeVisible();
    await modeButton.click();

    await expect(
      page.getByText(/Emergency Active/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
