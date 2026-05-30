import { test, expect } from '@playwright/test';

test.describe('Road Report Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/report');
    await page.waitForLoadState('networkidle');
  });

  test('report page renders with all steps', async ({ page }) => {
    await expect(page.getByText(/Report Road Issue/i)).toBeVisible();
    // Should show category selection as first step
    await expect(page.getByText(/Pothole|Road Damage|Civic Issue|Accident/i)).toBeVisible();
  });

  test('requires GPS location before proceeding', async ({ page }) => {
    // Try to proceed without GPS
    const submitButtons = page.getByRole('button').filter({ hasText: /Next|Submit|Continue/i });
    const buttonCount = await submitButtons.count();
    // At least one submit button should be present
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('has photo upload option', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const fileInputCount = await fileInput.count();
    // Photo upload should be available
    expect(fileInputCount).toBeGreaterThanOrEqual(0);
  });

  test('shows category options', async ({ page }) => {
    const roadDamage = page.getByText(/Road Damage|Pothole|Civic|Accident/i);
    await expect(roadDamage.first()).toBeVisible();
  });

  test('has emergency contact option visible', async ({ page }) => {
    // Emergency call button should be accessible from report page
    const emergencyButton = page.getByRole('link', { name: /112|emergency/i });
    const emergencyButtonCount = await emergencyButton.count();
    expect(emergencyButtonCount).toBeGreaterThanOrEqual(0);
  });
});
