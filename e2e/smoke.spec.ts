import { test, expect } from '@playwright/test';

test.describe('Dev App Smoke Test', () => {
  test('loads the dev app', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Supersubset/);
  });
});
