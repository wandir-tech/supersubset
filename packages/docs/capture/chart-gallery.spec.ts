/**
 * Screenshot capture: Chart Gallery page — all chart types.
 *
 * Navigates to the "Chart Gallery" page and captures each chart type
 * in both viewer and designer mode.
 */
import { test } from '@playwright/test';
import {
  switchToViewer,
  switchToDesigner,
  navigateToPage,
  waitForChartsReady,
  captureFullPage,
  captureWidget,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

/** Chart Gallery widgets map: node-id → doc slug */
const galleryCharts = [
  { nodeId: 'w-pie', slug: 'pie-chart' },
  { nodeId: 'w-scatter', slug: 'scatter-chart' },
  { nodeId: 'w-area', slug: 'area-chart' },
  { nodeId: 'w-combo', slug: 'combo-chart' },
  { nodeId: 'w-gauge', slug: 'gauge' },
  { nodeId: 'w-funnel', slug: 'funnel-chart' },
  { nodeId: 'w-radar', slug: 'radar-chart' },
  { nodeId: 'w-treemap', slug: 'treemap' },
  { nodeId: 'w-heatmap', slug: 'heatmap' },
  { nodeId: 'w-waterfall', slug: 'waterfall' },
  { nodeId: 'w-sankey', slug: 'sankey' },
  { nodeId: 'w-boxplot', slug: 'box-plot' },
];

test.describe('Chart Gallery screenshots', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  // Full gallery page
  test('viewer - full gallery page', async ({ page }) => {
    await switchToViewer(page);
    await navigateToPage(page, 'Chart Gallery');
    await waitForChartsReady(page);
    await captureFullPage(page, 'chart-types', 'gallery', 'default', 'viewer');
  });

  test('designer - full gallery page', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    // In designer, navigate to gallery page tab
    const galleryTab = page.locator('[data-testid="designer-page-tab-page-gallery"]');
    if (await galleryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await galleryTab.click();
      await waitForChartsReady(page);
    }
    await captureFullPage(page, 'chart-types', 'gallery', 'default', 'designer');
  });

  // Individual chart captures (viewer)
  for (const chart of galleryCharts) {
    test(`viewer - ${chart.slug}`, async ({ page }) => {
      await switchToViewer(page);
      await navigateToPage(page, 'Chart Gallery');
      await waitForChartsReady(page);
      await captureWidget(page, chart.nodeId, 'chart-types', chart.slug, 'default', 'viewer');
    });
  }

  // Individual chart captures (designer — gallery page)
  for (const chart of galleryCharts) {
    test(`designer - ${chart.slug}`, async ({ page }) => {
      await switchToDesigner(page);
      await waitForChartsReady(page);
      const galleryTab = page.locator('[data-testid="designer-page-tab-page-gallery"]');
      if (await galleryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await galleryTab.click();
        await waitForChartsReady(page);
      }
      await captureWidget(page, chart.nodeId, 'chart-types', chart.slug, 'default', 'designer');
    });
  }
});
