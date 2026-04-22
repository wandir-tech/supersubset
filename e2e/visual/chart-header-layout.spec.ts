import { test, expect } from '@playwright/test';

test.describe('Chart Header Layout Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(1200);
  });

  test('line chart header layout remains stable', async ({ page }) => {
    const chartCard = page.locator('[data-ss-node="w-line"]');
    await expect(chartCard).toBeVisible();
    await expect(chartCard).toHaveScreenshot('line-chart-header-layout.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.015,
    });
  });
});
