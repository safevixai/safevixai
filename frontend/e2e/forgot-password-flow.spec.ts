import { test, expect, type Page } from '@playwright/test';

let consoleErrors: string[] = [];
let pageErrors: string[] = [];

async function waitForMount(page: Page) {
  await page.waitForFunction(() => {
    const h1 = document.querySelector('h1');
    return h1 && h1.textContent?.includes('SafeVixAI');
  }, { timeout: 15000 });
  await page.waitForFunction(() => {
    return !document.querySelector('[aria-busy="true"]');
  }, { timeout: 15000 });
}

test.describe('Forgot Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));
    await page.addInitScript(() => {
      localStorage.setItem('__E2E_SKIP_AUTH__', 'true');
    });
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    await waitForMount(page);
  });

  test.afterEach(async () => {
    if (consoleErrors.length > 0) {
      console.log('FORGOT PWD CONSOLE ERRORS:', consoleErrors.join('\n'));
    }
    if (pageErrors.length > 0) {
      console.log('FORGOT PWD PAGE ERRORS:', pageErrors.join('\n'));
    }
  });

  test('renders forgot password page with all elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'SafeVixAI' })).toBeVisible();
    await expect(page.getByText('Password Recovery')).toBeVisible();
    await expect(page.getByText(/enter your operator email/i)).toBeVisible();
    await expect(page.getByPlaceholder('operator@safevixai.app')).toBeVisible();
    await expect(page.getByText('Send Reset Link')).toBeVisible();
    await expect(page.getByText('Back to Login')).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    const emailInput = page.getByPlaceholder('operator@safevixai.app');
    await emailInput.fill('not-an-email');
    await emailInput.blur();
    await expect(page.getByText('Invalid email address')).toBeVisible({ timeout: 5000 });
  });

  test('shows validation error for empty email', async ({ page }) => {
    await page.getByText('Send Reset Link').click();
    await expect(page.getByText(/Email is required|required/i)).toBeVisible({ timeout: 5000 });
  });

  test('has back to login link', async ({ page }) => {
    await page.getByText('Back to Login').click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
