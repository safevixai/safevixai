import { test, expect } from '@playwright/test';

async function waitForMount(page: any, text?: string) {
  await page.waitForFunction((t: string | undefined) => {
    const h1 = document.querySelector('h1');
    return h1 && h1.textContent?.includes(t ?? 'SafeVixAI');
  }, text ?? 'SafeVixAI', { timeout: 15000 });
}

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await waitForMount(page);
  });

  test('login page renders correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'SafeVixAI' })).toBeVisible();
    await expect(page.getByText('Operator Authentication')).toBeVisible();
    await expect(page.getByPlaceholder('operator@safevixai.app')).toBeVisible();
    await expect(page.getByText('Enter Command Center')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.getByText('Enter Command Center').click();
    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    const emailInput = page.getByPlaceholder('operator@safevixai.app');
    await emailInput.fill('not-an-email');
    await emailInput.blur();
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    await page.getByLabel('Show password').click();
    await expect(page.locator('input[type="text"]')).toBeVisible();

    await page.getByLabel('Hide password').click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({ status: 401, body: JSON.stringify({ detail: 'Invalid credentials' }) });
    });
    await page.getByPlaceholder('operator@safevixai.app').fill('test@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByText('Enter Command Center').click();

    await expect(page.getByText(/failed|invalid|error|required/i)).toBeVisible({ timeout: 10000 });
  });

  test('has working password field with autocomplete', async ({ page }) => {
    const passwordField = page.locator('input[autocomplete="current-password"]');
    await expect(passwordField).toBeVisible();
    await expect(passwordField).toHaveAttribute('type', 'password');
  });

  test('page has proper security indicators', async ({ page }) => {
    await expect(page.getByText('Sentinel Online')).toBeVisible();
    await expect(page.getByText('JWT Secured')).toBeVisible();
    await expect(page.getByText('Secure')).toBeVisible();
  });
});
