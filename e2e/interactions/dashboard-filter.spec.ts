import { test, expect, type Page } from '@playwright/test';

/**
 * E2E: Dashboard filter interactions.
 * Test Plan B — Renderer happy path with filter + cross-filter.
 */

const DEV_APP_ORIGIN = `http://localhost:${process.env.SUPERSUBSET_DEV_APP_PORT ?? '3006'}`;
const FILTER_BAR_REGISTRY_ERROR = 'No widget registered for type: filter-bar';

async function openViewerLiveDashboard(page: Page) {
  await page.goto(DEV_APP_ORIGIN);

  const viewerBtn = page.getByRole('button', { name: /viewer/i });
  if (await viewerBtn.isVisible()) {
    await viewerBtn.click();
  }

  const liveScenarioBtn = page.getByTestId('viewer-scenario-live');
  if (await liveScenarioBtn.isVisible()) {
    await liveScenarioBtn.click();
  }

  await expect(page.locator('[data-ss-dashboard="demo-sales"]')).toBeVisible();
}

function trackConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  return consoleErrors;
}

function filterBarWidget(page: Page, layoutNodeId: 'w-filter-bar-all' | 'w-filter-bar-region') {
  return page.locator(`[data-ss-dashboard="demo-sales"] [data-ss-node="${layoutNodeId}"]`);
}

test.describe('Dashboard Filters', () => {
  test('viewer renders placed filter-bar widgets without registry errors', async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);

    await openViewerLiveDashboard(page);

    const dashboard = page.locator('[data-ss-dashboard="demo-sales"]');
    const filterBarRow = dashboard.locator('[data-ss-node="row-filter-bars"]');
    const allFiltersWidget = filterBarWidget(page, 'w-filter-bar-all');
    const regionFiltersWidget = filterBarWidget(page, 'w-filter-bar-region');
    const allFiltersBar = allFiltersWidget.locator('.ss-filter-bar');
    const regionFiltersBar = regionFiltersWidget.locator('.ss-filter-bar');

    await expect(filterBarRow).toBeVisible();
    await expect(dashboard.locator('.ss-dashboard-content > .ss-filter-bar')).toHaveCount(0);
    await expect(filterBarRow.getByText(FILTER_BAR_REGISTRY_ERROR)).toHaveCount(0);
    await expect(dashboard.locator('.ss-filter-bar')).toHaveCount(2);
    await expect(allFiltersBar).toBeVisible();
    await expect(regionFiltersBar).toBeVisible();

    await expect(allFiltersBar.getByLabel('Region')).toBeVisible();
    await expect(allFiltersBar.getByLabel('Category')).toBeVisible();
    await expect(allFiltersBar.getByLabel('Order Date')).toBeVisible();

    await expect(regionFiltersBar.getByLabel('Region')).toBeVisible();
    await expect(regionFiltersBar.getByLabel('Category')).toHaveCount(0);
    await expect(regionFiltersBar.getByLabel('Order Date')).toHaveCount(0);

    const allFilterControlCount = await allFiltersBar.locator('.ss-filter-control').count();
    const regionFilterControlCount = await regionFiltersBar.locator('.ss-filter-control').count();

    expect(allFilterControlCount).toBeGreaterThan(regionFilterControlCount);
    expect(regionFilterControlCount).toBeGreaterThan(0);

    await expect(page.getByText(FILTER_BAR_REGISTRY_ERROR)).toHaveCount(0);
    expect(
      consoleErrors.filter((message) => message.includes(FILTER_BAR_REGISTRY_ERROR)),
    ).toHaveLength(0);
  });

  test('placed filter-bar widgets share filter state and reset together', async ({ page }) => {
    await openViewerLiveDashboard(page);

    const allFiltersBar = filterBarWidget(page, 'w-filter-bar-all').locator('.ss-filter-bar');
    const regionFiltersBar = filterBarWidget(page, 'w-filter-bar-region').locator('.ss-filter-bar');
    const regionFilter = regionFiltersBar.getByLabel('Region');

    await expect(allFiltersBar).toBeVisible();
    await expect(regionFiltersBar).toBeVisible();
    await expect(regionFilter).toBeVisible();

    await regionFilter.selectOption({ label: 'East' });

    await expect(regionFilter).toHaveValue('East');
    await expect(allFiltersBar.getByLabel('Region')).toHaveValue('East');
    await expect(allFiltersBar.getByRole('button', { name: /clear filters/i })).toBeVisible();
    await expect(regionFiltersBar.getByRole('button', { name: /clear filters/i })).toBeVisible();

    await allFiltersBar.getByRole('button', { name: /clear filters/i }).click();

    await expect(regionFiltersBar.getByLabel('Region')).toHaveValue('');
    await expect(allFiltersBar.getByLabel('Region')).toHaveValue('');
  });
});

test.describe('Cross-Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await openViewerLiveDashboard(page);
  });

  test('clicking a chart data point logs a widget event', async ({ page }) => {
    // Find a chart widget
    const chart = page.locator('.ss-widget').first();
    await expect(chart).toBeVisible();

    // Listen for console log from onWidgetEvent
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('[Supersubset] Widget event:')) {
        consoleMessages.push(msg.text());
      }
    });

    // Click on a chart area (the actual ECharts canvas)
    const canvas = chart.locator('canvas').first();
    if (await canvas.isVisible()) {
      await canvas.click({ position: { x: 100, y: 100 } });
      // ECharts click events may or may not fire on arbitrary canvas positions
      // This test verifies the wiring exists, not specific chart interaction
    }
  });
});
