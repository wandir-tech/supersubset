import { test, expect } from '@playwright/test';
import { demoDashboard } from '../../packages/dev-app/src/demo-dashboard';

function buildDashboardWithExtraLineChart() {
  const dashboard = structuredClone(demoDashboard);
  const overviewPage = dashboard.pages.find((page) => page.id === 'page-overview');
  if (!overviewPage) throw new Error('Expected page-overview in demo dashboard');

  overviewPage.layout['w-imported-line'] = {
    id: 'w-imported-line',
    type: 'widget',
    children: [],
    parentId: 'row-charts',
    meta: { widgetRef: 'chart-imported-line', width: 4, height: 350 },
  };

  overviewPage.layout['row-charts'].children = [
    ...overviewPage.layout['row-charts'].children,
    'w-imported-line',
  ];

  const lineWidget = overviewPage.widgets.find((widget) => widget.id === 'chart-revenue-trend');
  if (!lineWidget) throw new Error('Expected chart-revenue-trend in demo dashboard');

  overviewPage.widgets.push({
    ...structuredClone(lineWidget),
    id: 'chart-imported-line',
    title: 'Imported Line Chart',
  });

  dashboard.title = 'Imported Dashboard';
  return JSON.stringify(dashboard, null, 2);
}

function buildSinglePageDashboard() {
  const dashboard = structuredClone(demoDashboard);
  dashboard.pages = dashboard.pages.filter((page) => page.id === 'page-overview');
  dashboard.title = 'Single Page Dashboard';
  return JSON.stringify(dashboard, null, 2);
}

test.describe('Designer State Persistence Regressions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('imported dashboard survives designer, preview, and viewer mode switches', async ({ page }) => {
    const importedDashboard = buildDashboardWithExtraLineChart();

    await page.getByText('Designer').click();
    await page.waitForTimeout(1500);
    await page.getByTestId('import-btn').click();
    await page.getByTestId('import-textarea').fill(importedDashboard);
    await page.getByTestId('import-submit-btn').click();
    await page.waitForTimeout(1200);

    await page.getByText('Preview').click();
    await expect(page.getByText('Imported Dashboard')).toBeVisible();

    await page.getByText('Viewer').click();
    await expect(page.locator('.ss-chart')).toHaveCount(3);

    await page.getByText('Designer').click();
    await page.getByTestId('code-toggle').click();
    await expect(page.getByText('chart-imported-line')).toBeVisible();
  });

  test('active page recovers when imported dashboard removes the current page', async ({ page }) => {
    const singlePageDashboard = buildSinglePageDashboard();

    await page.getByText('Chart Gallery').click();
    await expect(page.getByRole('button', { name: 'Chart Gallery' })).toBeVisible();

    await page.getByText('Designer').click();
    await page.waitForTimeout(1500);
    await page.getByTestId('import-btn').click();
    await page.getByTestId('import-textarea').fill(singlePageDashboard);
    await page.getByTestId('import-submit-btn').click();
    await page.waitForTimeout(1200);

    await page.getByText('Viewer').click();
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Chart Gallery')).toHaveCount(0);
    await expect(page.locator('.ss-chart')).toHaveCount(2);
  });
});
