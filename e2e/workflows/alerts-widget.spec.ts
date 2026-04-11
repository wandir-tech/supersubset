import { test, expect } from '@playwright/test';

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

    expect(
      consoleErrors.filter((entry) => !entry.includes('favicon')),
    ).toHaveLength(0);
  });
});