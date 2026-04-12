/**
 * Screenshot capture: Property panels for all widget types in designer mode.
 *
 * Selects each widget type in the Puck canvas and captures the right sidebar
 * property panel showing configuration options.
 *
 * Also captures additional context screenshots:
 * - Layers panel view
 * - Filter bar area
 * - Getting-started workflow steps
 * - Layout configuration
 */
import { test } from '@playwright/test';
import {
  switchToDesigner,
  switchToViewer,
  navigateToPage,
  waitForChartsReady,
  captureFullPage,
  captureWidget,
  capturePropertyPanel,
  selectWidgetViaLayers,
  screenshotPath,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

/** Map: layer label → { category, slug } for Overview page widgets */
const overviewWidgets = [
  { label: 'Line Chart', category: 'chart-types', slug: 'line-chart' },
  { label: 'Bar Chart', category: 'chart-types', slug: 'bar-chart' },
  { label: 'KPI Card', category: 'widgets', slug: 'kpi-card' },
  { label: 'Alerts', category: 'widgets', slug: 'alerts' },
  { label: 'Table', category: 'widgets', slug: 'table' },
];

/** Map: layer label → { category, slug } for Gallery page widgets */
const galleryWidgets = [
  { label: 'Pie Chart', category: 'chart-types', slug: 'pie-chart' },
  { label: 'Scatter Chart', category: 'chart-types', slug: 'scatter-chart' },
  { label: 'Area Chart', category: 'chart-types', slug: 'area-chart' },
  { label: 'Combo Chart', category: 'chart-types', slug: 'combo-chart' },
  { label: 'Gauge', category: 'chart-types', slug: 'gauge' },
  { label: 'Funnel Chart', category: 'chart-types', slug: 'funnel-chart' },
  { label: 'Radar Chart', category: 'chart-types', slug: 'radar-chart' },
  { label: 'Treemap', category: 'chart-types', slug: 'treemap' },
  { label: 'Heatmap', category: 'chart-types', slug: 'heatmap' },
  { label: 'Waterfall Chart', category: 'chart-types', slug: 'waterfall' },
  { label: 'Sankey Diagram', category: 'chart-types', slug: 'sankey' },
  { label: 'Box Plot', category: 'chart-types', slug: 'box-plot' },
  { label: 'Markdown', category: 'widgets', slug: 'markdown' },
];

test.describe('Property panel captures — Overview page', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
    await switchToDesigner(page);
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  for (const widget of overviewWidgets) {
    test(`property panel — ${widget.slug}`, async ({ page }) => {
      const selected = await selectWidgetViaLayers(page, widget.label);
      if (!selected) {
        console.warn(`Could not select ${widget.label} via layers`);
      }
      await capturePropertyPanel(page, widget.category, widget.slug, 'props');
    });
  }

  // Designer layers panel overview
  test('layers panel overview', async ({ page }) => {
    await page.getByText('Layers').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: screenshotPath('getting-started', 'first-dashboard', 'layers', 'designer'),
      clip: { x: 0, y: 130, width: 370, height: 500 },
      animations: 'disabled',
    });
  });

  // Component palette (left sidebar in Components tab)
  test('component palette', async ({ page }) => {
    await page.screenshot({
      path: screenshotPath('getting-started', 'first-dashboard', 'component-palette', 'designer'),
      clip: { x: 0, y: 130, width: 370, height: 700 },
      animations: 'disabled',
    });
  });

  // Designer toolbar (top bar with pages, Export, Import)
  test('designer toolbar', async ({ page }) => {
    await page.screenshot({
      path: screenshotPath('getting-started', 'first-dashboard', 'toolbar', 'designer'),
      clip: { x: 0, y: 60, width: 1440, height: 70 },
      animations: 'disabled',
    });
  });

  // Header block in layers
  test('property panel — header', async ({ page }) => {
    const selected = await selectWidgetViaLayers(page, 'Header');
    if (!selected) console.warn('Could not select Header');
    await capturePropertyPanel(page, 'layout', 'header', 'props');
  });

  // Divider block
  test('property panel — divider', async ({ page }) => {
    const selected = await selectWidgetViaLayers(page, 'Divider');
    if (!selected) console.warn('Could not select Divider');
    await capturePropertyPanel(page, 'layout', 'divider', 'props');
  });
});

test.describe('Property panel captures — Gallery page', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
    await switchToDesigner(page);
    await waitForChartsReady(page);
    // Navigate to Gallery page tab
    const galleryTab = page.locator('[data-testid="designer-page-tab-page-gallery"]');
    if (await galleryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await galleryTab.click();
      await waitForChartsReady(page);
    }
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  for (const widget of galleryWidgets) {
    test(`property panel — ${widget.slug}`, async ({ page }) => {
      const selected = await selectWidgetViaLayers(page, widget.label);
      if (!selected) {
        console.warn(`Could not select ${widget.label} via layers`);
      }
      await capturePropertyPanel(page, widget.category, widget.slug, 'props');
    });
  }
});

test.describe('Additional context captures', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  // Layout: grid/rows visible in designer
  test('layout — grid overview', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    // Capture the canvas area showing the grid layout
    await page.screenshot({
      path: screenshotPath('layout', 'grid', 'overview', 'designer'),
      clip: { x: 350, y: 130, width: 750, height: 500 },
      animations: 'disabled',
    });
  });

  // Layout: rows/columns visible in viewer
  test('layout — rows-columns viewer', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureFullPage(page, 'layout', 'rows-columns', 'overview', 'viewer');
  });

  // Filter bar area
  test('filter bar — viewer', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    const filterBar = page.locator('.ss-filter-bar');
    if (await filterBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBar.screenshot({
        path: screenshotPath('filters', 'filter-bar', 'active', 'viewer'),
        animations: 'disabled',
      });
    }
  });

  // Interactions panel in designer
  test('interactions panel — designer', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    const interactionsToggle = page.locator('[data-testid="interactions-toggle"]');
    if (await interactionsToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await interactionsToggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: screenshotPath('interactions', 'click-actions', 'panel', 'designer'),
        animations: 'disabled',
      });
    }
  });

  // Getting started — first dashboard: viewer overview
  test('first dashboard — viewer overview', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    await captureFullPage(page, 'getting-started', 'first-dashboard', 'viewer-overview', 'viewer');
  });

  // Getting started — first dashboard: designer overview
  test('first dashboard — designer overview', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureFullPage(page, 'getting-started', 'first-dashboard', 'designer-overview', 'designer');
  });

  // Pages: show page tabs in designer
  test('pages — page tabs designer', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await page.screenshot({
      path: screenshotPath('pages', 'navigation', 'page-tabs', 'designer'),
      clip: { x: 330, y: 60, width: 400, height: 70 },
      animations: 'disabled',
    });
  });

  // Import panel
  test('import panel — designer', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    const importBtn = page.getByText('Import').first();
    if (await importBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await importBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: screenshotPath('import-export', 'import', 'dialog', 'designer'),
        animations: 'disabled',
      });
      // Close the import dialog
      await page.keyboard.press('Escape');
    }
  });

  // Export panel
  test('export panel — designer', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    const exportBtn = page.getByText('Export').first();
    if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: screenshotPath('import-export', 'json-export', 'dialog', 'designer'),
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
    }
  });

  // Code view toggle
  test('code view — designer', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    const codeToggle = page.locator('[data-testid="code-toggle"]');
    if (await codeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await codeToggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: screenshotPath('import-export', 'code-view', 'schema', 'designer'),
        animations: 'disabled',
      });
    }
  });

  // Tabs layout - capture from viewer showing tab-like navigation
  test('layout — tabs viewer', async ({ page }) => {
    await switchToViewer(page);
    await waitForChartsReady(page);
    // Capture the page tabs at the top which act as layout tabs
    await page.screenshot({
      path: screenshotPath('layout', 'tabs', 'viewer-tabs', 'viewer'),
      clip: { x: 0, y: 0, width: 1440, height: 120 },
      animations: 'disabled',
    });
  });
});
