// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { test, expect } from '@playwright/test';

test.describe('Municipality guide flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('__E2E_SKIP_AUTH__', 'true');
    });
  });

  async function waitForMount(page: any) {
    await page.waitForFunction(() => {
      const h1 = document.querySelector('h1');
      return h1 && (h1.textContent?.includes('Municipality') || h1.textContent?.includes('Civic'));
    }, { timeout: 15000 });
    await page.waitForFunction(() => {
      return !document.querySelector('.animate-spin') && !document.body.textContent?.includes('Loading municipalities');
    }, { timeout: 15000 });
  }

  test('renders guide page with search and filters', async ({ page }) => {
    await page.goto('/guide');
    await waitForMount(page);

    await expect(page.getByPlaceholder(/Search municipality/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Find Nearby' })).toBeVisible();
    await expect(page.getByText(/Filter/i).first()).toBeVisible();
  });

  test('search input accepts text', async ({ page }) => {
    await page.goto('/guide');
    await waitForMount(page);

    const searchInput = page.getByPlaceholder(/Search municipality/i);
    await searchInput.fill('Chennai');
    await expect(searchInput).toHaveValue('Chennai');
  });

  test('filter toggle shows state chips and type pills', async ({ page }) => {
    await page.goto('/guide');
    await waitForMount(page);

    await page.getByText(/Filter/i).first().click();

    await expect(page.getByText(/State|Type/i).first()).toBeVisible();
    await expect(page.getByText(/All|Corporation|Municipality/i).first()).toBeVisible();
  });

  test('guide information section renders', async ({ page }) => {
    await page.goto('/guide');
    await waitForMount(page);

    await expect(page.getByText(/How to Use This Guide/i)).toBeVisible();
    await expect(page.getByText(/Search|Find Nearby|View Details/i).first()).toBeVisible();
  });
});
