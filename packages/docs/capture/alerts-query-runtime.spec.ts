import { test, expect } from '@playwright/test';
import {
  assertNoConsoleErrors,
  captureWidget,
  setupConsoleErrorCapture,
  waitForChartsReady,
} from './helpers';

test.describe('Alerts runtime query screenshots', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/?docsScenario=alerts-query-runtime');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  test('viewer - query-backed alerts states', async ({ page }) => {
    await captureWidget(page, 'w-runtime-alerts', 'widgets', 'alerts-query', 'default', 'viewer');

    await page.getByLabel('Region').selectOption('North');
    await expect(page.getByText('Gateway latency spike')).toBeVisible();
    await expect(page.getByText('Fraud review queue elevated')).toBeVisible();
    await captureWidget(page, 'w-runtime-alerts', 'widgets', 'alerts-query', 'filtered', 'viewer');

    await page.getByTestId('alerts-runtime-mode-loading').click();
    await expect(page.getByTestId('alerts-widget-loading-runtime-query-alerts')).toBeVisible();
    await captureWidget(page, 'w-runtime-alerts', 'widgets', 'alerts-query', 'loading', 'viewer');

    await page.getByTestId('alerts-runtime-mode-error').click();
    await expect(page.getByTestId('alerts-widget-error-runtime-query-alerts')).toBeVisible();
    await captureWidget(page, 'w-runtime-alerts', 'widgets', 'alerts-query', 'error', 'viewer');

    await page.getByTestId('alerts-runtime-mode-empty').click();
    await expect(page.getByTestId('alerts-widget-empty-runtime-query-alerts')).toBeVisible();
    await captureWidget(page, 'w-runtime-alerts', 'widgets', 'alerts-query', 'empty', 'viewer');

    await page.getByTestId('alerts-runtime-mode-unavailable').click();
    await expect(page.getByTestId('alerts-widget-unavailable-runtime-query-alerts')).toBeVisible();
    await captureWidget(
      page,
      'w-runtime-alerts',
      'widgets',
      'alerts-query',
      'unavailable',
      'viewer',
    );
  });
});
