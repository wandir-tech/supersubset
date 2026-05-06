/**
 * Screenshot capture: Layout element & filter focused screenshots.
 *
 * Captures specific layout elements (header, divider, rows, grid) and
 * filter states for dedicated documentation pages.
 */
import { test } from '@playwright/test';
import {
  switchToViewer,
  switchToDesigner,
  openDashboardFiltersPanel,
  waitForChartsReady,
  captureElement,
  captureFullPage,
  screenshotPath,
  selectWidgetViaLayers,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

test.describe('Layout-focused screenshots', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  // ── Header element ────────────────────────────────

  test('viewer — header element', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Capture the header + divider area at the top of the dashboard
    const header = page.locator('[data-ss-node="header-title"]');
    if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await captureElement(header, 'layout', 'header', 'element', 'viewer');
    }
  });

  test('designer — header selected', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await selectWidgetViaLayers(page, 'Header');
    await captureFullPage(page, 'layout', 'header', 'selected', 'designer');
  });

  // ── Divider element ───────────────────────────────

  test('viewer — divider section', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Divider is thin — capture header + divider + start of alerts for context
    // Crop the top portion of the viewer that shows the header/divider area
    await page.screenshot({
      path: screenshotPath('layout', 'divider', 'section', 'viewer'),
      clip: { x: 0, y: 0, width: 1440, height: 250 },
      animations: 'disabled',
    });
  });

  test('designer — divider selected', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await selectWidgetViaLayers(page, 'Divider');
    await captureFullPage(page, 'layout', 'divider', 'selected', 'designer');
  });

  // ── Rows & Columns — KPI row (4+4+4 layout) ──────

  test('viewer — kpi row', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    const kpiRow = page.locator('[data-ss-node="row-kpis"]');
    if (await kpiRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kpiRow.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await captureElement(kpiRow, 'layout', 'rows-columns', 'kpi-row', 'viewer');
    }
  });

  test('viewer — chart row (8+4 layout)', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    const chartRow = page.locator('[data-ss-node="row-charts"]');
    if (await chartRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chartRow.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await captureElement(chartRow, 'layout', 'rows-columns', 'chart-row', 'viewer');
    }
  });

  // ── Grid — full dashboard structure ───────────────

  test('viewer — grid layout', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Capture the full viewer showing the grid layout with all rows
    await captureFullPage(page, 'layout', 'grid', 'full', 'viewer');
  });

  test('designer — grid layout', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    // Capture the canvas showing the grid structure
    await captureFullPage(page, 'layout', 'grid', 'full', 'designer');
  });

  // ── Tabs — page navigation ───────────────────────

  test('viewer — tabs navigation wide', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Capture the page navigation tabs plus a section of content below
    await page.screenshot({
      path: screenshotPath('layout', 'tabs', 'page-nav', 'viewer'),
      clip: { x: 0, y: 0, width: 1440, height: 300 },
      animations: 'disabled',
    });
  });
});

test.describe('Filter-specific screenshots', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  // ── Select filter — different states ──────────────

  test('viewer — select filter with region selected', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Select a region to show the select filter in active state
    const regionSelect = page.locator('select[name="filter-region"]');
    if (await regionSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regionSelect.selectOption('North');
      await waitForChartsReady(page);
    }
    // Capture just the filter bar area with active selection
    const filterBar = page.locator('.ss-filter-bar').first();
    if (await filterBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await captureElement(filterBar, 'filters', 'select-filter', 'region-north', 'viewer');
    }
  });

  test('viewer — select filter with category selected', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Select a category
    const catSelect = page.locator('select[name="filter-category"]');
    if (await catSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await catSelect.selectOption({ index: 1 }); // Pick first non-empty option
      await waitForChartsReady(page);
    }
    const filterBar = page.locator('.ss-filter-bar').first();
    if (await filterBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await captureElement(filterBar, 'filters', 'select-filter', 'category-active', 'viewer');
    }
  });

  test('viewer — multiple filters active', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Apply both region and category filters
    const regionSelect = page.locator('select[name="filter-region"]');
    if (await regionSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regionSelect.selectOption('East');
      await page.waitForTimeout(500);
    }
    const catSelect = page.locator('select[name="filter-category"]');
    if (await catSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await catSelect.selectOption({ index: 2 });
      await waitForChartsReady(page);
    }
    await captureFullPage(page, 'filters', 'filter-scope', 'multiple-active', 'viewer');
  });

  // ── Date filter ───────────────────────────────────

  test('viewer — date filter bar', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Capture the filter bar showing the date filter
    const filterBar = page.locator('.ss-filter-bar').first();
    if (await filterBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await captureElement(filterBar, 'filters', 'date-filter', 'bar', 'viewer');
    }
  });

  // ── Designer filter builder — different filter selected ──

  test('designer — filter builder region selected', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await openDashboardFiltersPanel(page);
    // Click the first filter (Region) to expand it
    const regionItem = page.locator('[data-testid="filter-item-filter-region"]');
    if (await regionItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await regionItem.click();
      await page.waitForTimeout(300);
    }
    await captureFullPage(page, 'filters', 'filter-builder', 'region-selected', 'designer');
  });

  test('designer — filter builder date selected', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await openDashboardFiltersPanel(page);
    // Click the date filter to expand it
    const dateItem = page.locator('[data-testid="filter-item-filter-date"]');
    if (await dateItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateItem.click();
      await page.waitForTimeout(300);
    }
    await captureFullPage(page, 'filters', 'filter-builder', 'date-selected', 'designer');
  });

  // ── Cross-filter — bar chart clicked ──────────────

  test('viewer — cross-filter bar click', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Click on the bar chart to trigger cross-filtering
    const barChart = page.locator('[data-ss-node="w-bar"]');
    if (await barChart.isVisible({ timeout: 3000 }).catch(() => false)) {
      await barChart.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      // Click roughly in the middle of the bar chart
      const box = await barChart.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.4);
        await page.waitForTimeout(800);
      }
    }
    await captureFullPage(page, 'filters', 'cross-filter', 'bar-clicked', 'viewer');
  });
});
