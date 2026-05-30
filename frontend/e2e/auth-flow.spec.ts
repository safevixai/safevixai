import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('login page renders correctly', async ({ page }) => {
    await expect(page.getByText('SafeVixAI')).toBeVisible();
    await expect(page.getByText('Operator Authentication')).toBeVisible();
    await expect(page.getByPlaceholder('operator@safevixai.app')).toBeVisible();
    await expect(page.getByText('ENTER COMMAND CENTER')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.getByText('ENTER COMMAND CENTER').click();
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

    // Click show password
    await page.getByLabel('Show password').click();
    await expect(page.locator('input[type="text"]')).toBeVisible();

    // Click hide password
    await page.getByLabel('Hide password').click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('operator@safevixai.app').fill('test@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByText('ENTER COMMAND CENTER').click();

    // Should show an error — either API error or validation
    await page.waitForTimeout(2000);
    const errorVisible = await page.getByText(/failed|invalid|error|required/i).isVisible().catch(() => false);
    expect(errorVisible).toBe(true);
  });

  test('has working password field with autocomplete', async ({ page }) => {
    const passwordField = page.locator('input[autocomplete="current-password"]');
    await expect(passwordField).toBeVisible();
    await expect(passwordField).toHaveAttribute('type', 'password');
  });

  test('page has proper security indicators', async ({ page }) => {
    await expect(page.getByText('SENTINEL ONLINE')).toBeVisible();
    await expect(page.getByText('JWT SECURED')).toBeVisible();
    await expect(page.getByText('Secure')).toBeVisible();
  });
});
