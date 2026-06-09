import { test, expect } from '@playwright/test';

test.describe('Signup Flow', () => {
  let consoleErrors: string[] = [];
  let pageErrors: string[] = [];

  async function waitForMount(page: any) {
    await page.waitForFunction(() => {
      const h1 = document.querySelector('h1');
      return h1 && h1.textContent?.includes('SafeVixAI');
    }, { timeout: 15000 });
    await page.waitForFunction(() => {
      return !document.querySelector('[aria-busy="true"]');
    }, { timeout: 15000 });
  }

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('requestfailed', request => {
      consoleErrors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
    page.on('response', response => {
      if (response.status() >= 400) {
        consoleErrors.push(`Response error: ${response.url()} status ${response.status()}`);
      }
    });
    await page.addInitScript(() => {
      localStorage.setItem('__E2E_SKIP_AUTH__', 'true');
    });
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await waitForMount(page);
  });

  test.afterEach(async () => {
    if (consoleErrors.length > 0) {
      console.log('SIGNUP CONSOLE ERRORS:', consoleErrors.join('\n'));
    }
    if (pageErrors.length > 0) {
      console.log('SIGNUP PAGE ERRORS:', pageErrors.join('\n'));
    }
  });

  test('renders signup page with all elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'SafeVixAI' }).first()).toBeVisible();
    await expect(page.getByText('Create Operator Account').first()).toBeVisible();
    await expect(page.getByText('Sentinel Online').first()).toBeVisible();
    await expect(page.getByText('Encrypted', { exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Your full name').first()).toBeVisible();
    await expect(page.getByPlaceholder('operator@safevixai.app').first()).toBeVisible();
    await expect(page.getByPlaceholder('Min 8 characters').first()).toBeVisible();
    await expect(page.getByPlaceholder('Re-enter access key').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Account/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible();
  });

  test('shows validation errors for empty form', async ({ page }) => {
    await page.getByRole('button', { name: /Create Account/i }).click();
    await expect(page.getByText('Full Name is required')).toBeVisible({ timeout: 5000 });
  });

  test('shows password mismatch error', async ({ page }) => {
    await page.getByPlaceholder('Your full name').fill('Test User');
    await page.getByPlaceholder('operator@safevixai.app').fill('test@example.com');
    await page.getByPlaceholder('Min 8 characters').fill('password123');
    await page.getByPlaceholder('Re-enter access key').fill('different456');
    await page.getByRole('button', { name: /Create Account/i }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible({ timeout: 5000 });
  });

  test('password show/hide toggle works', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('Min 8 characters');
    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveValue('secret123');

    await page.getByLabel('Show password').first().click();
    await expect(passwordInput).toHaveAttribute('type', 'text', { timeout: 5000 });
    await expect(passwordInput).toHaveValue('secret123');

    await page.getByLabel('Hide password').first().click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveValue('secret123');
  });

  test('has link to login page', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Sign In' }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login');
  });
});
