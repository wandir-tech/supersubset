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

  async function openPagesWorkbook(page: import('@playwright/test').Page) {
    const pagesScenarioButton = page.getByTestId('viewer-scenario-pages');
    await expect(pagesScenarioButton).toBeVisible();
    await pagesScenarioButton.click();
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
  }

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

  test('page demo shows shared filters on both pages and preserves selected values', async ({
    page,
  }) => {
    await openPagesWorkbook(page);

    const overviewFilterBar = page.locator('.ss-filter-bar');
    await expect(overviewFilterBar).toHaveCount(1);

    const overviewRegionFilter = overviewFilterBar.getByLabel('Region');
    const overviewCategoryFilter = overviewFilterBar.getByLabel('Category');

    await expect(overviewRegionFilter).toBeVisible();
    await expect(overviewCategoryFilter).toBeVisible();

    await overviewRegionFilter.selectOption({ label: 'East' });
    await expect(overviewRegionFilter).toHaveValue('East');

    await page.getByRole('button', { name: 'Region Detail' }).click();

    const detailFilterBar = page.locator('.ss-filter-bar');
    await expect(detailFilterBar).toHaveCount(1);
    await expect(detailFilterBar.getByLabel('Region')).toHaveValue('East');
    await expect(detailFilterBar.getByLabel('Category')).toBeVisible();

    await page.getByRole('button', { name: 'Overview' }).click();
    await expect(page.locator('.ss-filter-bar').getByLabel('Region')).toHaveValue('East');
  });

  test('page-scoped category filter changes overview widgets without leaking into detail widgets', async ({
    page,
  }) => {
    await openPagesWorkbook(page);

    const overviewFilterBar = page.locator('.ss-filter-bar');
    const categoryFilter = overviewFilterBar.getByLabel('Category');
    const revenueKpi = page.locator('.ss-kpi').filter({ hasText: 'Revenue' });

    await categoryFilter.selectOption({ label: 'Electronics' });

    await expect(categoryFilter).toHaveValue('Electronics');
    await expect(revenueKpi).toContainText('$8.4K');

    await page.getByRole('button', { name: 'Region Detail' }).click();

    const detailFilterBar = page.locator('.ss-filter-bar');
    const detailTable = page.locator('.ss-table').first();
    const detailRows = detailTable.locator('tbody tr');

    await expect(detailFilterBar.getByLabel('Category')).toHaveValue('Electronics');
    await expect(detailRows).toHaveCount(8);
    await expect(detailTable).toContainText('Globex Inc');
    await expect(detailTable).toContainText('Waystar');

    await page.getByRole('button', { name: 'Overview' }).click();

    await expect(page.locator('.ss-filter-bar').getByLabel('Category')).toHaveValue('Electronics');
    await expect(page.locator('.ss-kpi').filter({ hasText: 'Revenue' })).toContainText('$8.4K');
  });
});
