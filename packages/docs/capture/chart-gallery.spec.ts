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
  selectWidgetViaLayers,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

/** Chart Gallery widgets map: node-id → doc slug → designer layer label */
const galleryCharts = [
  { nodeId: 'w-pie', slug: 'pie-chart', label: 'Pie Chart' },
  { nodeId: 'w-scatter', slug: 'scatter-chart', label: 'Scatter Chart' },
  { nodeId: 'w-area', slug: 'area-chart', label: 'Area Chart' },
  { nodeId: 'w-combo', slug: 'combo-chart', label: 'Combo Chart' },
  { nodeId: 'w-gauge', slug: 'gauge', label: 'Gauge' },
  { nodeId: 'w-funnel', slug: 'funnel-chart', label: 'Funnel Chart' },
  { nodeId: 'w-radar', slug: 'radar-chart', label: 'Radar Chart' },
  { nodeId: 'w-treemap', slug: 'treemap', label: 'Treemap' },
  { nodeId: 'w-heatmap', slug: 'heatmap', label: 'Heatmap' },
  { nodeId: 'w-waterfall', slug: 'waterfall', label: 'Waterfall Chart' },
  { nodeId: 'w-sankey', slug: 'sankey', label: 'Sankey Diagram' },
  { nodeId: 'w-boxplot', slug: 'box-plot', label: 'Box Plot' },
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

  // Individual chart captures (designer — select via Layers panel for unique prop panels)
  for (const chart of galleryCharts) {
    test(`designer - ${chart.slug}`, async ({ page }) => {
      await switchToDesigner(page);
      await waitForChartsReady(page);
      const galleryTab = page.locator('[data-testid="designer-page-tab-page-gallery"]');
      if (await galleryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await galleryTab.click();
        await waitForChartsReady(page);
      }
      await selectWidgetViaLayers(page, chart.label);
      await captureFullPage(page, 'chart-types', chart.slug, 'default', 'designer');
    });
  }
});
