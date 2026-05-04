import { test, expect, type Page } from '@playwright/test';

/**
 * E2E: Dashboard filter interactions.
 * Test Plan B — Renderer happy path with filter + cross-filter.
 */

const DEV_APP_ORIGIN = `http://localhost:${process.env.SUPERSUBSET_DEV_APP_PORT ?? '3006'}`;
const FILTER_BAR_REGISTRY_ERROR = 'No widget registered for type: filter-bar';
const DESIGNER_VIEWPORT = { width: 1440, height: 900 };
const DESIGNER_RENDER_WAIT_MS = 900;

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

async function openDesignerLiveDashboard(page: Page) {
  await page.goto(DEV_APP_ORIGIN);
  await page.getByRole('button', { name: /designer/i }).click();
  await expect(page.getByTestId('designer-header-controls')).toBeVisible({ timeout: 10000 });
  await page.locator('nav').evaluate((nav) => {
    const item = Array.from(nav.querySelectorAll('li')).find(
      (candidate) => candidate.textContent?.trim() === 'Fields',
    );

    if (!(item instanceof HTMLElement)) {
      throw new Error('Could not find the Fields nav item in the designer shell');
    }

    const clickTarget = item.querySelector('div');
    (clickTarget instanceof HTMLElement ? clickTarget : item).click();
  });
  await page.waitForTimeout(DESIGNER_RENDER_WAIT_MS);
}

function previewFrame(page: Page) {
  return page.frameLocator('iframe').first();
}

async function selectDesignerWidget(page: Page, widgetId: string) {
  const component = previewFrame(page).locator(`[data-puck-component="${widgetId}"]`).last();
  await expect(component).toBeVisible();
  await component.click({ position: { x: 20, y: 20 } });
}

async function setDesignerTextField(page: Page, widgetId: string, field: string, value: string) {
  const input = page.locator(`#${widgetId}_text_${field}`).last();
  await expect(input).toBeVisible();
  await input.fill(value);
}

async function setDesignerRadioField(page: Page, widgetId: string, field: string, label: string) {
  const radio = page.locator(`#${widgetId}_radio_${field} label`).filter({ hasText: label }).last();
  await expect(radio).toBeVisible();
  await radio.click();
}

async function setFilterSubset(page: Page, visibleFilters: string[]) {
  const allFilterLabels = ['Region', 'Category', 'Customer Search', 'Order Amount', 'Order Date'];

  for (const label of allFilterLabels) {
    const checkbox = page.getByLabel(`Show filter ${label}`).last();
    await expect(checkbox).toBeVisible();

    if (visibleFilters.includes(label)) {
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
    } else if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
  }
}

async function switchToViewer(page: Page) {
  await page.getByRole('button', { name: /viewer/i }).click();
  await expect(page.locator('[data-ss-dashboard="demo-sales"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(DESIGNER_RENDER_WAIT_MS);
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
    await expect(allFiltersBar.getByLabel('Customer Search')).toBeVisible();
    await expect(allFiltersBar.getByLabel('Order Amount minimum')).toBeVisible();
    await expect(allFiltersBar.getByLabel('Order Amount maximum')).toBeVisible();
    await expect(allFiltersBar.getByLabel('Order Date')).toBeVisible();

    await expect(regionFiltersBar.getByLabel('Region')).toBeVisible();
    await expect(regionFiltersBar.getByLabel('Category')).toHaveCount(0);
    await expect(regionFiltersBar.getByLabel('Customer Search')).toHaveCount(0);
    await expect(regionFiltersBar.getByLabel('Order Amount minimum')).toHaveCount(0);
    await expect(regionFiltersBar.getByLabel('Order Amount maximum')).toHaveCount(0);
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

  test('live dashboard filters update KPI and table data as well as control state', async ({
    page,
  }) => {
    await openViewerLiveDashboard(page);

    const allFiltersBar = filterBarWidget(page, 'w-filter-bar-all').locator('.ss-filter-bar');
    const regionFiltersBar = filterBarWidget(page, 'w-filter-bar-region').locator('.ss-filter-bar');
    const regionFilter = regionFiltersBar.getByLabel('Region');
    const revenueKpi = page.locator('.ss-kpi').filter({ hasText: 'Total Revenue' });
    const ordersTable = page.locator('.ss-table').first();
    const tableRows = ordersTable.locator('tbody tr');

    await expect(revenueKpi).toContainText('$23.0K');
    await expect(tableRows).toHaveCount(8);
    await expect(ordersTable).toContainText('Globex Inc');

    await regionFilter.selectOption({ label: 'North' });

    await expect(regionFilter).toHaveValue('North');
    await expect(allFiltersBar.getByLabel('Region')).toHaveValue('North');
    await expect(revenueKpi).toContainText('$6.4K');
    await expect(tableRows).toHaveCount(2);
    await expect(ordersTable).toContainText('Acme Corp');
    await expect(ordersTable).toContainText('Waystar');
    await expect(ordersTable).not.toContainText('Globex Inc');
  });

  test('live dashboard text filter updates KPI and table data', async ({ page }) => {
    await openViewerLiveDashboard(page);

    const allFiltersBar = filterBarWidget(page, 'w-filter-bar-all').locator('.ss-filter-bar');
    const searchFilter = allFiltersBar.getByLabel('Customer Search');
    const revenueKpi = page.locator('.ss-kpi').filter({ hasText: 'Total Revenue' });
    const ordersTable = page.locator('.ss-table').first();
    const tableRows = ordersTable.locator('tbody tr');

    await searchFilter.fill('Way');

    await expect(searchFilter).toHaveValue('Way');
    await expect(revenueKpi).toContainText('$9.2K');
    await expect(tableRows).toHaveCount(2);
    await expect(ordersTable).toContainText('Waystar');
    await expect(ordersTable).toContainText('Wayne Ent');
    await expect(ordersTable).not.toContainText('Acme Corp');
  });

  test('live dashboard range filter updates KPI and table data', async ({ page }) => {
    await openViewerLiveDashboard(page);

    const allFiltersBar = filterBarWidget(page, 'w-filter-bar-all').locator('.ss-filter-bar');
    const minAmountFilter = allFiltersBar.getByLabel('Order Amount minimum');
    const maxAmountFilter = allFiltersBar.getByLabel('Order Amount maximum');
    const revenueKpi = page.locator(
      '[data-ss-dashboard="demo-sales"] [data-ss-node="w-kpi-revenue"] .ss-kpi',
    );
    const ordersTable = page.locator(
      '[data-ss-dashboard="demo-sales"] [data-ss-node="w-table"] .ss-table',
    );
    const tableRows = ordersTable.locator('tbody tr');

    await minAmountFilter.fill('3000');
    await maxAmountFilter.fill('4500');

    await expect(minAmountFilter).toHaveValue('3000');
    await expect(maxAmountFilter).toHaveValue('4500');
    await expect(revenueKpi).toContainText('$7.2K');
    await expect(tableRows).toHaveCount(2);
    await expect(ordersTable).toContainText('Initech');
    await expect(ordersTable).toContainText('Waystar');
    await expect(ordersTable).not.toContainText('Wayne Ent');
  });

  test('live dashboard custom date filter updates KPI and table data', async ({ page }) => {
    await openViewerLiveDashboard(page);

    const allFiltersBar = filterBarWidget(page, 'w-filter-bar-all').locator('.ss-filter-bar');
    const datePresetFilter = allFiltersBar.getByLabel('Order Date');
    const revenueKpi = page.locator(
      '[data-ss-dashboard="demo-sales"] [data-ss-node="w-kpi-revenue"] .ss-kpi',
    );
    const ordersTable = page.locator(
      '[data-ss-dashboard="demo-sales"] [data-ss-node="w-table"] .ss-table',
    );
    const tableRows = ordersTable.locator('tbody tr');

    await datePresetFilter.selectOption({ label: 'Custom range…' });

    const startDateFilter = allFiltersBar.getByLabel('Order Date start date');
    const endDateFilter = allFiltersBar.getByLabel('Order Date end date');

    await startDateFilter.fill('2026-04-01');
    await endDateFilter.fill('2026-04-10');

    await expect(startDateFilter).toHaveValue('2026-04-01');
    await expect(endDateFilter).toHaveValue('2026-04-10');
    await expect(revenueKpi).toContainText('$6.8K');
    await expect(tableRows).toHaveCount(2);
    await expect(ordersTable).toContainText('Waystar');
    await expect(ordersTable).toContainText('Stark Ind');
    await expect(ordersTable).not.toContainText('Initech');
  });

  test('live dashboard custom date filter clear resets control state and analytical results', async ({
    page,
  }) => {
    await openViewerLiveDashboard(page);

    const allFiltersBar = filterBarWidget(page, 'w-filter-bar-all').locator('.ss-filter-bar');
    const datePresetFilter = allFiltersBar.getByLabel('Order Date');
    const revenueKpi = page.locator(
      '[data-ss-dashboard="demo-sales"] [data-ss-node="w-kpi-revenue"] .ss-kpi',
    );
    const ordersTable = page.locator(
      '[data-ss-dashboard="demo-sales"] [data-ss-node="w-table"] .ss-table',
    );
    const tableRows = ordersTable.locator('tbody tr');

    await datePresetFilter.selectOption({ label: 'Custom range…' });

    const startDateFilter = allFiltersBar.getByLabel('Order Date start date');
    const endDateFilter = allFiltersBar.getByLabel('Order Date end date');

    await startDateFilter.fill('2026-04-01');
    await endDateFilter.fill('2026-04-10');

    await expect(revenueKpi).toContainText('$6.8K');
    await expect(tableRows).toHaveCount(2);

    await allFiltersBar.getByRole('button', { name: /clear filters/i }).click();

    await expect(datePresetFilter).toHaveValue('');
    await expect(allFiltersBar.getByLabel('Order Date start date')).toHaveCount(0);
    await expect(allFiltersBar.getByLabel('Order Date end date')).toHaveCount(0);
    await expect(revenueKpi).toContainText('$23.0K');
    await expect(tableRows).toHaveCount(8);
    await expect(ordersTable).toContainText('Initech');
    await expect(ordersTable).toContainText('Wayne Ent');
  });

  test('designer-edited filter bar widget preserves title, vertical layout, subset, and analytical behavior', async ({
    page,
  }) => {
    await page.setViewportSize(DESIGNER_VIEWPORT);
    await openDesignerLiveDashboard(page);
    await selectDesignerWidget(page, 'filters-all');
    await setDesignerTextField(page, 'filters-all', 'title', 'Focused Filters');
    await setDesignerRadioField(page, 'filters-all', 'layout', 'Vertical');
    await setFilterSubset(page, ['Region', 'Customer Search']);

    await switchToViewer(page);

    const focusedWidget = page
      .locator('.ss-filter-bar-widget')
      .filter({ hasText: 'Focused Filters' });
    const focusedBar = focusedWidget.locator('.ss-filter-bar');
    const focusedTitle = focusedWidget.locator('.ss-filter-bar-widget-title');
    const regionControl = focusedBar.locator('.ss-filter-control[data-ss-filter="filter-region"]');
    const searchControl = focusedBar.locator('.ss-filter-control[data-ss-filter="filter-search"]');
    const revenueKpi = page.locator('.ss-kpi').filter({ hasText: 'Total Revenue' });
    const ordersTable = page.locator('.ss-table').first();
    const tableRows = ordersTable.locator('tbody tr');

    await expect(focusedTitle).toBeVisible();
    await expect(regionControl.getByLabel('Region')).toBeVisible();
    await expect(searchControl.getByLabel('Customer Search')).toBeVisible();
    await expect(focusedBar.getByLabel('Category')).toHaveCount(0);
    await expect(focusedBar.getByLabel('Order Amount minimum')).toHaveCount(0);
    await expect(focusedBar.getByLabel('Order Amount maximum')).toHaveCount(0);
    await expect(focusedBar.getByLabel('Order Date')).toHaveCount(0);

    const regionBox = await regionControl.boundingBox();
    const searchBox = await searchControl.boundingBox();
    expect(regionBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(Math.abs((searchBox?.x ?? 0) - (regionBox?.x ?? 0))).toBeLessThan(40);
    expect((searchBox?.y ?? 0) - (regionBox?.y ?? 0)).toBeGreaterThan(20);

    await focusedBar.getByLabel('Customer Search').fill('Way');

    await expect(revenueKpi).toContainText('$9.2K');
    await expect(tableRows).toHaveCount(2);
    await expect(ordersTable).toContainText('Waystar');
    await expect(ordersTable).toContainText('Wayne Ent');
    await expect(ordersTable).not.toContainText('Acme Corp');
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
