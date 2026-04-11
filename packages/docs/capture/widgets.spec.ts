/**
 * Screenshot capture: Non-chart widgets — KPI Card, Table, Alerts, Markdown.
 */
import { test } from '@playwright/test';
import {
  switchToViewer,
  switchToDesigner,
  navigateToPage,
  waitForChartsReady,
  captureWidget,
  captureFullPage,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

test.describe('Widget screenshots', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  // ── KPI Cards ─────────────────────────────────────
  test('viewer - kpi-revenue', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-kpi-revenue', 'widgets', 'kpi-card', 'revenue', 'viewer');
  });

  test('viewer - kpi-orders', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-kpi-orders', 'widgets', 'kpi-card', 'orders', 'viewer');
  });

  test('viewer - kpi-aov', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-kpi-aov', 'widgets', 'kpi-card', 'aov', 'viewer');
  });

  // ── Table ─────────────────────────────────────────
  test('viewer - table', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-table', 'widgets', 'table', 'default', 'viewer');
  });

  test('designer - table', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-table', 'widgets', 'table', 'default', 'designer');
  });

  // ── Alerts ────────────────────────────────────────
  test('viewer - alerts', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-alerts', 'widgets', 'alerts', 'default', 'viewer');
  });

  test('designer - alerts', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-alerts', 'widgets', 'alerts', 'default', 'designer');
  });

  // ── Markdown (on Chart Gallery page) ──────────────
  test('viewer - markdown', async ({ page }) => {
    await switchToViewer(page);
    await navigateToPage(page, 'Chart Gallery');
    await waitForChartsReady(page);
    await captureWidget(page, 'w-markdown', 'widgets', 'markdown', 'default', 'viewer');
  });

  test('designer - markdown', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    const galleryTab = page.locator('[data-testid="designer-page-tab-page-gallery"]');
    if (await galleryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await galleryTab.click();
      await waitForChartsReady(page);
    }
    await captureWidget(page, 'w-markdown', 'widgets', 'markdown', 'default', 'designer');
  });
});
