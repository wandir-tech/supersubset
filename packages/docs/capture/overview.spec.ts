/**
 * Screenshot capture: Overview page & Getting Started.
 *
 * Captures the Sales Dashboard overview in viewer, designer, and preview modes.
 */
import { test } from '@playwright/test';
import {
  switchToViewer,
  switchToDesigner,
  waitForChartsReady,
  captureFullPage,
  captureWidget,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

test.describe('Overview page screenshots', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  // Full-page captures
  test('viewer - overview default', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureFullPage(page, 'getting-started', 'overview', 'default', 'viewer');
  });

  test('designer - overview default', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureFullPage(page, 'getting-started', 'overview', 'default', 'designer');
  });

  // Individual overview widgets (viewer)
  test('viewer - line chart widget', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-line', 'chart-types', 'line-chart', 'default', 'viewer');
  });

  test('viewer - bar chart widget', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-bar', 'chart-types', 'bar-chart', 'default', 'viewer');
  });

  test('viewer - alerts widget', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-alerts', 'widgets', 'alerts', 'default', 'viewer');
  });

  test('viewer - kpi-revenue widget', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-kpi-revenue', 'widgets', 'kpi-card', 'default', 'viewer');
  });

  test('viewer - table widget', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-table', 'widgets', 'table', 'default', 'viewer');
  });

  // Individual overview widgets (designer)
  test('designer - line chart widget', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-line', 'chart-types', 'line-chart', 'default', 'designer');
  });

  test('designer - bar chart widget', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-bar', 'chart-types', 'bar-chart', 'default', 'designer');
  });

  test('designer - alerts widget', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-alerts', 'widgets', 'alerts', 'default', 'designer');
  });

  test('designer - kpi-card widget', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-kpi-revenue', 'widgets', 'kpi-card', 'default', 'designer');
  });

  test('designer - table widget', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureWidget(page, 'w-table', 'widgets', 'table', 'default', 'designer');
  });
});
