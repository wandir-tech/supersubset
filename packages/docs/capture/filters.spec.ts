/**
 * Screenshot capture: Filters — filter bar, select filter, date filter, cross-filter.
 */
import { test } from '@playwright/test';
import {
  switchToViewer,
  switchToDesigner,
  waitForChartsReady,
  captureFullPage,
  captureElement,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

test.describe('Filter screenshots', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  // ── Filter bar (default state) ────────────────────
  test('viewer - filter bar default', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);

    const filterBar = page.locator('.ss-filter-bar');
    if (await filterBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await captureElement(filterBar, 'filters', 'filter-bar', 'default', 'viewer');
    } else {
      await captureFullPage(page, 'filters', 'filter-bar', 'default', 'viewer');
    }
  });

  // ── Select filter — active state ──────────────────
  test('viewer - select filter active', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);

    // Select "North" in the region filter
    const regionFilter = page.locator('select[name="filter-region"]');
    if (await regionFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regionFilter.selectOption('North');
      await waitForChartsReady(page);
    }
    await captureFullPage(page, 'filters', 'select-filter', 'active', 'viewer');
  });

  // ── Select filter — default state ─────────────────
  test('viewer - select filter default', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureFullPage(page, 'filters', 'select-filter', 'default', 'viewer');
  });

  // ── Filter bar after "Clear filters" ──────────────
  test('viewer - filter bar after clear', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);

    // Apply a filter first
    const regionFilter = page.locator('select[name="filter-region"]');
    if (await regionFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regionFilter.selectOption('East');
      await waitForChartsReady(page);
    }

    // Clear
    const clearBtn = page.locator('.ss-filter-reset');
    if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearBtn.click();
      await waitForChartsReady(page);
    }
    await captureFullPage(page, 'filters', 'filter-bar', 'cleared', 'viewer');
  });

  // ── Designer filter builder panel ─────────────────
  test('designer - filter builder panel', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);

    // Open the filters slide-over
    const filtersBtn = page.locator('[data-testid="filters-toggle"]');
    if (await filtersBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filtersBtn.click();
      await page.waitForTimeout(500);
    }
    await captureFullPage(page, 'filters', 'filter-builder', 'default', 'designer');
  });

  // ── Cross-filtering (viewer overview) ────────────
  test('viewer - cross-filter overview', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Just capture the overview — cross-filtering is shown via filter state
    await captureFullPage(page, 'filters', 'cross-filter', 'default', 'viewer');
  });
});
