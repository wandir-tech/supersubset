import { test, expect } from '@playwright/test';
import { demoDashboard } from '../../packages/dev-app/src/demo-dashboard';

function buildDashboardWithStackedAlerts() {
  const dashboard = structuredClone(demoDashboard);
  const overviewPage = dashboard.pages.find((page) => page.id === 'page-overview');
  if (!overviewPage) throw new Error('Expected page-overview in demo dashboard');

  dashboard.title = 'Stacked Alerts Dashboard';

  const alertsWidget = overviewPage.widgets.find((widget) => widget.id === 'alerts-overview');
  if (!alertsWidget) throw new Error('Expected alerts-overview widget in demo dashboard');

  alertsWidget.title = 'Stacked Operations Watchlist';
  alertsWidget.config = {
    ...alertsWidget.config,
    layout: 'stack',
    maxItems: 2,
  };

  return JSON.stringify(dashboard, null, 2);
}

test.describe('Alerts widget workflow', () => {
  test('renders in viewer and stays available through the designer canvas', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto('/');

    const viewerAlerts = page.getByTestId('alerts-widget-alerts-overview');
    await expect(viewerAlerts).toBeVisible();
    await expect(viewerAlerts).toContainText('Operations Watchlist');
    await expect(viewerAlerts).toContainText('Revenue ETL delayed in North America');
    await expect(viewerAlerts).toContainText('Checkout retry rate elevated');

    await page.getByRole('button', { name: /designer/i }).click();
    await expect(page.getByTestId('designer-header-controls')).toBeVisible({ timeout: 10000 });

    const canvas = page.frameLocator('iframe').first();
    await expect(canvas.getByText('Operations Watchlist')).toBeVisible();
    await expect(canvas.getByText('Payment retries elevated')).toBeVisible();

    await page.getByRole('button', { name: /viewer/i }).click();
    await expect(viewerAlerts).toBeVisible();
    await expect(viewerAlerts).toContainText('EU fulfillment backlog cleared');

    expect(consoleErrors.filter((entry) => !entry.includes('favicon'))).toHaveLength(0);
  });

  test('imported alerts config applies stacked layout and max item visibility in viewer mode', async ({
    page,
  }) => {
    const stackedDashboard = buildDashboardWithStackedAlerts();

    await page.goto('/');
    await page.getByRole('button', { name: /designer/i }).click();
    await expect(page.getByTestId('designer-header-controls')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('import-btn').click();
    await expect(page.getByTestId('import-export-dialog')).toBeVisible();
    await page.getByTestId('import-textarea').fill(stackedDashboard);
    await page.getByTestId('import-submit-btn').click();
    await expect(page.getByText('Last saved: Stacked Alerts Dashboard')).toBeVisible();

    await page.getByRole('button', { name: /viewer/i }).click();

    const viewerAlerts = page.getByTestId('alerts-widget-alerts-overview');
    const firstAlert = page.getByTestId('alerts-widget-item-alerts-overview-0');
    const secondAlert = page.getByTestId('alerts-widget-item-alerts-overview-1');
    const thirdAlert = page.getByTestId('alerts-widget-item-alerts-overview-2');

    await expect(viewerAlerts).toBeVisible();
    await expect(viewerAlerts).toContainText('Stacked Operations Watchlist');
    await expect(viewerAlerts).toContainText('2 active');
    await expect(firstAlert).toBeVisible();
    await expect(secondAlert).toBeVisible();
    await expect(thirdAlert).toHaveCount(0);
    await expect(viewerAlerts).not.toContainText('EU fulfillment backlog cleared');

    const firstBox = await firstAlert.boundingBox();
    const secondBox = await secondAlert.boundingBox();

    expect(firstBox).not.toBeNull();
    expect(secondBox).not.toBeNull();
    expect(Math.abs((firstBox?.x ?? 0) - (secondBox?.x ?? 0))).toBeLessThan(8);
    expect((secondBox?.y ?? 0) - (firstBox?.y ?? 0)).toBeGreaterThan(20);
  });
});
