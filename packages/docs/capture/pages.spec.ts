/**
 * Screenshot capture: Multi-page navigation & page management.
 */
import { test } from '@playwright/test';
import {
  switchToViewer,
  switchToDesigner,
  navigateToPage,
  waitForChartsReady,
  captureFullPage,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

test.describe('Pages & Navigation screenshots', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  // ── Viewer: Overview page (page 1) ────────────────
  test('viewer - overview page', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureFullPage(page, 'pages', 'multi-page', 'page1', 'viewer');
  });

  // ── Viewer: Chart Gallery page (page 2) ───────────
  test('viewer - chart gallery page', async ({ page }) => {
    await switchToViewer(page);
    await navigateToPage(page, 'Chart Gallery');
    await waitForChartsReady(page);
    await captureFullPage(page, 'pages', 'multi-page', 'page2', 'viewer');
  });

  // ── Designer: page management controls ────────────
  test('designer - page tabs', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureFullPage(page, 'pages', 'page-management', 'default', 'designer');
  });

  // ── Viewer: "One dashboard, two pages" scenario ───
  test('viewer - pages scenario overview', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);

    // Switch to the "One dashboard, two pages" scenario
    const scenarioBtn = page.locator('[data-testid="viewer-scenario-pages"]');
    if (await scenarioBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scenarioBtn.click();
      await waitForChartsReady(page);
    }
    await captureFullPage(page, 'pages', 'pages-scenario', 'page1', 'viewer');
  });

  test('viewer - pages scenario page 2', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);

    const scenarioBtn = page.locator('[data-testid="viewer-scenario-pages"]');
    if (await scenarioBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scenarioBtn.click();
      await waitForChartsReady(page);
    }

    // Navigate to second page
    await navigateToPage(page, 'Detail');
    await waitForChartsReady(page);
    await captureFullPage(page, 'pages', 'pages-scenario', 'page2', 'viewer');
  });

  // ── Viewer: "Two separate dashboards" scenario ────
  test('viewer - dashboards scenario', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);

    const scenarioBtn = page.locator('[data-testid="viewer-scenario-dashboards"]');
    if (await scenarioBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scenarioBtn.click();
      await waitForChartsReady(page);
    }
    await captureFullPage(page, 'pages', 'dashboards-scenario', 'default', 'viewer');
  });
});
