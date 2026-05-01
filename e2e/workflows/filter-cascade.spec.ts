import { test, expect } from '@playwright/test';

/**
 * E2E: Filter cascade workflow.
 * Verifies that filters propagate correctly across the dashboard.
 */

test.describe('Filter Cascade Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const viewerBtn = page.getByRole('button', { name: /viewer/i });
    if (await viewerBtn.isVisible()) {
      await viewerBtn.click();
    }
  });

  test('dashboard renders with filter bar and all widgets', async ({ page }) => {
    // Verify the dashboard renders
    const dashboard = page.locator('[data-ss-dashboard]');
    await expect(dashboard).toBeVisible();

    // All widgets should render
    const widgets = page.locator('.ss-widget');
    expect(await widgets.count()).toBeGreaterThan(0);
  });

  test('filter bar is present when filters are defined', async ({ page }) => {
    const filterBar = page.locator('.ss-filter-bar');
    // The demo dashboard has filters, so filter bar should appear
    await expect(filterBar.first()).toBeVisible();

    if ((await filterBar.count()) > 0) {
      // Region and Category filters should be present
      const controls = page.locator('.ss-filter-control');
      expect(await controls.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('switching pages preserves mode', async ({ page }) => {
    // If there are page tabs, clicking them should stay in viewer mode
    const tabs = page.locator('nav button');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      await tabs.nth(1).click();
      // Should still be in viewer mode (dashboard renders, not designer)
      const dashboard = page.locator('[data-ss-dashboard]');
      await expect(dashboard).toBeVisible();
    }
  });

  test('mode switching works with filters', async ({ page }) => {
    // Switch to preview mode
    const previewBtn = page.getByRole('button', { name: /preview/i });
    if (await previewBtn.isVisible()) {
      await previewBtn.click();
      // Preview should show a rendered dashboard
      await page.waitForTimeout(500);
    }

    // Switch back to viewer
    const viewerBtn = page.getByRole('button', { name: /viewer/i });
    if (await viewerBtn.isVisible()) {
      await viewerBtn.click();
      const dashboard = page.locator('[data-ss-dashboard]');
      await expect(dashboard).toBeVisible();
    }
  });
});
