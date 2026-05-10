import { expect, test } from '@playwright/test';
import type { DashboardDefinition } from '@supersubset/schema';
import { workbenchStarterDashboard } from '../../examples/nextjs-ecommerce/lib/workbench-dashboard';
import { WORKBENCH_DATASET_ID } from '../../examples/nextjs-ecommerce/lib/workbench-shared';

const NEXTJS_WORKBENCH_ORIGIN = `http://localhost:${process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT ?? '3001'}`;

function buildStructuredAlertsWorkbenchDashboard() {
  const dashboard = structuredClone(workbenchStarterDashboard) as DashboardDefinition;
  const overviewPage = dashboard.pages.find((page) => page.id === 'overview');
  if (!overviewPage) {
    throw new Error('Expected overview page in workbench starter dashboard');
  }

  dashboard.title = 'Northstar Structured Alerts Workbench';

  overviewPage.layout['grid-main'] = {
    ...overviewPage.layout['grid-main'],
    children: ['header-title', 'divider', 'row-filter-bars', 'row-alerts'],
  };

  for (const nodeId of [
    'row-kpis',
    'w-kpi-revenue',
    'w-kpi-shipments',
    'w-kpi-on-time',
    'row-charts',
    'w-line',
    'w-bar',
    'row-table',
    'w-table',
  ]) {
    delete overviewPage.layout[nodeId];
  }

  overviewPage.widgets = overviewPage.widgets.filter(
    (widget) => widget.id === 'filters-all' || widget.id === 'alerts-watchlist',
  );

  const alertsWidget = overviewPage.widgets.find((widget) => widget.id === 'alerts-watchlist');
  if (!alertsWidget) {
    throw new Error('Expected alerts-watchlist widget in workbench starter dashboard');
  }

  alertsWidget.title = 'Regional Revenue Threshold';
  alertsWidget.dataBinding = {
    datasetRef: WORKBENCH_DATASET_ID,
    fields: [],
  };
  alertsWidget.config = {
    datasetRef: WORKBENCH_DATASET_ID,
    titleField: 'alert_title',
    messageField: 'alert_message',
    severityField: 'severity',
    layout: 'stack',
    maxItems: 1,
    showTimestamp: false,
    alertRule: {
      mode: 'structured',
      metricFieldRef: 'revenue',
      aggregation: 'sum',
      operator: 'gte',
      threshold: 100000,
      alert: {
        title: 'Regional revenue threshold breached',
        message: 'Revenue exceeded $100k for the current filter scope.',
        severity: 'warning',
      },
    },
  };

  return JSON.stringify(dashboard, null, 2);
}

function buildFieldBackedFilterWorkbenchDashboard() {
  const dashboard = structuredClone(workbenchStarterDashboard) as DashboardDefinition;
  const regionFilter = dashboard.filters?.find((filter) => filter.id === 'filter-region');
  if (!regionFilter) {
    throw new Error('Expected filter-region in workbench starter dashboard');
  }

  dashboard.title = 'Northstar Field-backed Filters Workbench';
  regionFilter.optionSource = {
    kind: 'field',
    strategy: 'search',
    minSearchChars: 2,
  };

  return JSON.stringify(dashboard, null, 2);
}

test.describe('Next.js Real Host Workbench', () => {
  test('logs in, loads datasets, and re-queries a query-backed alerts tile in viewer mode', async ({
    page,
  }) => {
    const requestUrls: string[] = [];
    const consoleErrors: string[] = [];

    page.on('request', (request) => requestUrls.push(request.url()));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${NEXTJS_WORKBENCH_ORIGIN}/workbench`);

    await expect(page.getByTestId('workbench-login-form')).toBeVisible();
    await page.getByTestId('workbench-login-submit').click();

    await expect(page.getByTestId('workbench-shell')).toBeVisible();
    await expect(page.getByTestId('workbench-dataset-status')).toContainText('1 dataset(s)');

    await page.getByTestId('workbench-code-toggle').click();
    await expect(page.getByTestId('code-view-panel')).toContainText(
      'Northstar Logistics Control Tower',
    );

    await page.getByTestId('workbench-mode-viewer').click();
    const alertsWidget = page.getByTestId('alerts-widget-alerts-watchlist');
    await expect(alertsWidget).toBeVisible();
    await expect(alertsWidget).toContainText('Shipment Watchlist');
    await expect(alertsWidget).toContainText('North America: Atlas Air on CHI');
    await expect(page.getByTestId('workbench-query-log')).toContainText('"fieldId": "alert_title"');

    const initialQueryLog = await page.getByTestId('workbench-query-log').innerText();
    await page.getByLabel('Region').selectOption({ label: 'APAC' });
    await page.waitForFunction((previousLog) => {
      const node = document.querySelector('[data-testid="workbench-query-log"]');
      return !!node && node.textContent !== previousLog && node.textContent?.includes('APAC');
    }, initialQueryLog);
    await expect(alertsWidget).toContainText('APAC: Meridian Cargo on SIN');
    await expect(alertsWidget).not.toContainText('North America: Atlas Air on CHI');

    await page.reload();
    await expect(page.getByTestId('workbench-shell')).toBeVisible();
    await page.getByTestId('workbench-mode-viewer').click();
    await expect(page.getByTestId('workbench-query-log')).toContainText('"fieldId": "alert_title"');
    await expect(page.getByTestId('alerts-widget-alerts-watchlist')).toBeVisible();

    expect(requestUrls.some((url) => url.includes('/api/graphql'))).toBe(true);
    expect(requestUrls.some((url) => url.includes('/api/analytics/supersubset/datasets'))).toBe(
      true,
    );
    expect(requestUrls.some((url) => url.includes('/api/analytics/supersubset/query'))).toBe(true);
    expect(consoleErrors.filter((text) => !text.includes('favicon'))).toHaveLength(0);
  });

  test('imports a structured alert-rule dashboard and executes it through the real host query adapter', async ({
    page,
  }) => {
    const structuredDashboard = buildStructuredAlertsWorkbenchDashboard();
    const requestUrls: string[] = [];
    const consoleErrors: string[] = [];

    page.on('request', (request) => requestUrls.push(request.url()));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${NEXTJS_WORKBENCH_ORIGIN}/workbench`);

    await expect(page.getByTestId('workbench-login-form')).toBeVisible();
    await page.getByTestId('workbench-login-submit').click();

    await expect(page.getByTestId('workbench-shell')).toBeVisible();
    await expect(page.getByTestId('workbench-dataset-status')).toContainText('1 dataset(s)');

    await page.getByTestId('import-btn').click();
    await expect(page.getByTestId('import-export-dialog')).toBeVisible();
    await page.getByTestId('import-textarea').fill(structuredDashboard);
    await page.getByTestId('import-submit-btn').click();
    await expect(page.getByTestId('import-export-dialog')).toHaveCount(0);

    await page.getByTestId('workbench-code-toggle').click();
    await expect(page.getByTestId('code-view-panel')).toContainText(
      'Northstar Structured Alerts Workbench',
    );
    await expect(page.getByTestId('code-view-content')).toContainText('"alertRule"');
    await expect(page.getByTestId('code-view-content')).toContainText(
      'Regional revenue threshold breached',
    );

    const designerCanvas = page.frameLocator('iframe').first();
    await expect(
      designerCanvas.getByText('Regional Revenue Threshold', { exact: true }),
    ).toBeVisible();

    await page.getByTestId('workbench-mode-viewer').click();

    const alertsWidget = page.getByTestId('alerts-widget-alerts-watchlist');
    const structuredAlert = page.getByTestId('alerts-widget-item-alerts-watchlist-0');
    await expect(alertsWidget).toBeVisible();
    await expect(alertsWidget).toContainText('Regional Revenue Threshold');
    await expect(page.getByTestId('workbench-query-log')).toContainText('"fieldId": "revenue"', {
      timeout: 15000,
    });
    await expect(page.getByTestId('workbench-query-log')).toContainText('"aggregation": "sum"');
    await expect(page.getByTestId('workbench-query-log')).not.toContainText(
      '"fieldId": "alert_title"',
    );
    await expect(structuredAlert).toContainText('Regional revenue threshold breached');
    await expect(structuredAlert).toContainText(
      'Revenue exceeded $100k for the current filter scope.',
    );

    const initialQueryLog = await page.getByTestId('workbench-query-log').innerText();
    await page.getByLabel('Region').selectOption({ label: 'Europe' });
    await page.waitForFunction((previousLog) => {
      const node = document.querySelector('[data-testid="workbench-query-log"]');
      return !!node && node.textContent !== previousLog && node.textContent?.includes('Europe');
    }, initialQueryLog);
    await expect(page.getByTestId('alerts-widget-empty-alerts-watchlist')).toBeVisible();
    await expect(alertsWidget).not.toContainText('Regional revenue threshold breached');

    const europeQueryLog = await page.getByTestId('workbench-query-log').innerText();
    await page.getByLabel('Region').selectOption({ label: 'North America' });
    await page.waitForFunction((previousLog) => {
      const node = document.querySelector('[data-testid="workbench-query-log"]');
      return (
        !!node && node.textContent !== previousLog && node.textContent?.includes('North America')
      );
    }, europeQueryLog);
    await expect(structuredAlert).toContainText('Regional revenue threshold breached');
    await expect(page.getByTestId('workbench-query-log')).toContainText('"operator": "eq"');

    expect(requestUrls.some((url) => url.includes('/api/graphql'))).toBe(true);
    expect(requestUrls.some((url) => url.includes('/api/analytics/supersubset/datasets'))).toBe(
      true,
    );
    expect(requestUrls.some((url) => url.includes('/api/analytics/supersubset/query'))).toBe(true);
    expect(consoleErrors.filter((text) => !text.includes('favicon'))).toHaveLength(0);
  });

  test('imports a field-backed filter dashboard and shows the explicit unavailable state in viewer mode', async ({
    page,
  }) => {
    const fieldBackedDashboard = buildFieldBackedFilterWorkbenchDashboard();
    const requestUrls: string[] = [];
    const consoleErrors: string[] = [];

    page.on('request', (request) => requestUrls.push(request.url()));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${NEXTJS_WORKBENCH_ORIGIN}/workbench`);

    await expect(page.getByTestId('workbench-login-form')).toBeVisible();
    await page.getByTestId('workbench-login-submit').click();

    await expect(page.getByTestId('workbench-shell')).toBeVisible();
    await expect(page.getByTestId('workbench-dataset-status')).toContainText('1 dataset(s)');

    await page.getByTestId('import-btn').click();
    await expect(page.getByTestId('import-export-dialog')).toBeVisible();
    await page.getByTestId('import-textarea').fill(fieldBackedDashboard);
    await page.getByTestId('import-submit-btn').click();
    await expect(page.getByTestId('import-export-dialog')).toHaveCount(0);

    await page.getByTestId('workbench-code-toggle').click();
    await expect(page.getByTestId('code-view-panel')).toContainText(
      'Northstar Field-backed Filters Workbench',
    );
    await expect(page.getByTestId('code-view-content')).toContainText('"kind": "field"');

    await page.getByTestId('workbench-mode-viewer').click();

    const regionFilter = page.getByLabel('Region');
    const carrierFilter = page.getByLabel('Carrier');

    await expect(regionFilter).toBeDisabled();
    await expect(regionFilter.locator('option')).toHaveText([
      'Field-backed options require host support',
    ]);
    await expect(carrierFilter).toBeEnabled();
    await expect(carrierFilter.locator('option')).toContainText(['All', 'Atlas Air']);

    expect(requestUrls.some((url) => url.includes('/api/graphql'))).toBe(true);
    expect(requestUrls.some((url) => url.includes('/api/analytics/supersubset/datasets'))).toBe(
      true,
    );
    expect(consoleErrors.filter((text) => !text.includes('favicon'))).toHaveLength(0);
  });
});
