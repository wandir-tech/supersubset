import { expect, test } from '@playwright/test';

const DISCOVERY_FIXTURE = {
  protocolVersion: 'v1',
  capabilities: {
    supportedAggregations: ['sum', 'avg', 'count', 'min', 'max', 'none'],
    supportedFilterOperators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in'],
    supportedSourceTypes: ['table', 'view', 'model', 'query', 'file'],
    supportsMetadataDiscovery: true,
    supportsQueryExecution: true,
  },
  datasets: [
    {
      id: 'orders',
      label: 'Orders',
      fields: [
        { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
        {
          id: 'revenue',
          label: 'Revenue',
          dataType: 'number',
          role: 'measure',
          defaultAggregation: 'sum',
        },
        { id: 'ordered_at', label: 'Ordered At', dataType: 'date', role: 'time' },
      ],
    },
  ],
};

test.describe('Backend probe live discovery', () => {
  test('loads the designer from a live discovery URL with bearer auth', async ({ page }) => {
    let authorizationHeader = '';

    await page.route('**/probe-mock-api/supersubset/datasets', async (route) => {
      authorizationHeader = route.request().headers()['authorization'] ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DISCOVERY_FIXTURE),
      });
    });

    await page.goto('/');
    const origin = new URL(page.url()).origin;

    await page.getByTestId('mode-probe').click();
    await page.getByTestId('probe-url-input').fill(`${origin}/probe-mock-api`);
    await page.getByTestId('probe-auth-mode').selectOption('bearer');
    await page.getByTestId('probe-jwt-input').fill('dev-probe-token');
    await page.getByTestId('probe-connect-button').click();

    await expect(page.getByTestId('probe-metadata-source-summary')).toContainText(
      `${origin}/probe-mock-api`,
    );
    await expect(page.getByTestId('probe-dataset-count')).toHaveText('1 dataset(s) discovered');
    await expect(page.getByTestId('probe-preview-status')).toContainText(
      `Preview: ${origin}/probe-mock-api`,
    );
    await expect(page.getByText('Supersubset Probe Designer')).toBeVisible();
    expect(authorizationHeader).toBe('Bearer dev-probe-token');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export JSON' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('backend-probe-dashboard.json');
  });
});
