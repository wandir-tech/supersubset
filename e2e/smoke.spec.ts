import { test, expect } from '@playwright/test';

test.describe('Dev App Smoke Test', () => {
  test('[host-integration.LIBRARY_FIRST.1] loads the dev app', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Supersubset/);
  });
});
