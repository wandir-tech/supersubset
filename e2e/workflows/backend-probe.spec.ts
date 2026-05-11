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

function buildProbePreviewDashboard() {
  return JSON.stringify(
    {
      schemaVersion: '0.2.0',
      id: 'probe-preview-dashboard',
      title: 'Probe Preview Dashboard',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          rootNodeId: 'root',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: ['probe-bar-host'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'probe-bar-host': {
              id: 'probe-bar-host',
              type: 'widget',
              children: [],
              parentId: 'grid-main',
              meta: { widgetRef: 'probe-bar', width: 12, height: 320 },
            },
          },
          widgets: [
            {
              id: 'probe-bar',
              type: 'bar-chart',
              title: 'Probe Revenue by Region',
              dataBinding: {
                datasetRef: 'orders',
                fields: [
                  { role: 'x-axis', fieldRef: 'region' },
                  { role: 'y-axis', fieldRef: 'revenue' },
                ],
              },
              config: { horizontal: true },
            },
          ],
        },
      ],
      defaults: { activePage: 'page-1' },
    },
    null,
    2,
  );
}

const RAW_DISCOVERY_FIXTURE = [
  {
    id: 'orders',
    fields: [
      { id: 'region', dataType: 'string' },
      { id: 'revenue', dataType: 'number' },
    ],
  },
];

async function openProbe(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByTestId('mode-probe').click();
}

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

    await openProbe(page);
    const origin = new URL(page.url()).origin;

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

  test('loads the designer from a live discovery URL with a custom auth header', async ({
    page,
  }) => {
    let headerName = '';
    let headerValue = '';

    await page.route('**/probe-mock-api-custom/supersubset/datasets', async (route) => {
      headerName =
        Object.keys(route.request().headers()).find((key) => key.toLowerCase() === 'x-probe-key') ??
        '';
      headerValue = route.request().headers()['x-probe-key'] ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DISCOVERY_FIXTURE),
      });
    });

    await openProbe(page);
    const origin = new URL(page.url()).origin;

    await page.getByTestId('probe-url-input').fill(`${origin}/probe-mock-api-custom`);
    await page.getByTestId('probe-auth-mode').selectOption('custom');
    await page.getByTestId('probe-header-name').fill('X-Probe-Key');
    await page.getByTestId('probe-header-value').fill('alpha-dev-key');
    await page.getByTestId('probe-connect-button').click();

    await expect(page.getByTestId('probe-metadata-source-summary')).toContainText(
      `${origin}/probe-mock-api-custom`,
    );
    await expect(page.getByTestId('probe-dataset-count')).toHaveText('1 dataset(s) discovered');
    await expect(page.getByText('Supersubset Probe Designer')).toBeVisible();

    expect(headerName).toBe('x-probe-key');
    expect(headerValue).toBe('alpha-dev-key');
  });

  test('logs in with email and password, then reuses the returned token for discovery', async ({
    page,
  }) => {
    let loginBody: Record<string, unknown> | null = null;
    let authorizationHeader = '';

    await page.route('**/probe-login-api/graphql', async (route) => {
      loginBody = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            login: {
              accessToken: 'probe-login-token-12345',
            },
          },
        }),
      });
    });

    await page.route('**/probe-login-api/supersubset/datasets', async (route) => {
      authorizationHeader = route.request().headers()['authorization'] ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DISCOVERY_FIXTURE),
      });
    });

    await openProbe(page);
    const origin = new URL(page.url()).origin;

    await page.getByTestId('probe-url-input').fill(`${origin}/probe-login-api`);
    await page.getByTestId('probe-auth-mode').selectOption('login');
    await page.getByTestId('probe-login-url').fill(`${origin}/probe-login-api/graphql`);
    await page.getByTestId('probe-login-email').fill('dev@example.com');
    await page.getByTestId('probe-login-password').fill('dev-password');
    await page.getByTestId('probe-connect-button').click();

    await expect(page.getByTestId('probe-dataset-count')).toHaveText('1 dataset(s) discovered');
    await expect(page.getByText('Supersubset Probe Designer')).toBeVisible();

    expect(loginBody).toMatchObject({
      query: expect.stringContaining('mutation login'),
      variables: {
        email: 'dev@example.com',
        password: 'dev-password',
      },
    });
    expect(authorizationHeader).toBe('Bearer probe-login-token-12345');
  });

  test('stays on the probe form and shows an error when login fails', async ({ page }) => {
    await page.route('**/probe-login-api-fail/graphql', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'Invalid credentials' }],
        }),
      });
    });

    await openProbe(page);
    const origin = new URL(page.url()).origin;

    await page.getByTestId('probe-url-input').fill(`${origin}/probe-login-api-fail`);
    await page.getByTestId('probe-auth-mode').selectOption('login');
    await page.getByTestId('probe-login-url').fill(`${origin}/probe-login-api-fail/graphql`);
    await page.getByTestId('probe-login-email').fill('dev@example.com');
    await page.getByTestId('probe-login-password').fill('wrong-password');
    await page.getByTestId('probe-connect-button').click();

    await expect(page.getByTestId('probe-error')).toContainText(
      'Login failed: Invalid credentials',
    );
    await expect(page.getByText('Supersubset Probe Designer')).toHaveCount(0);
    await expect(page.getByTestId('probe-connect-button')).toBeVisible();
  });

  test('shows an error when discovery succeeds but returns no datasets', async ({ page }) => {
    await page.route('**/probe-empty-api/supersubset/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ datasets: [] }),
      });
    });

    await openProbe(page);
    const origin = new URL(page.url()).origin;

    await page.getByTestId('probe-url-input').fill(`${origin}/probe-empty-api`);
    await page.getByTestId('probe-connect-button').click();

    await expect(page.getByTestId('probe-error')).toContainText(
      'Metadata loaded successfully, but no datasets were discovered.',
    );
    await expect(page.getByText('Supersubset Probe Designer')).toHaveCount(0);
    await expect(page.getByTestId('probe-connect-button')).toBeVisible();
  });

  test('shows the CORS-style connection message when metadata discovery cannot be fetched', async ({
    page,
  }) => {
    await page.route('**/probe-network-fail/supersubset/datasets', async (route) => {
      await route.abort('failed');
    });

    await openProbe(page);
    const origin = new URL(page.url()).origin;

    await page.getByTestId('probe-url-input').fill(`${origin}/probe-network-fail`);
    await page.getByTestId('probe-connect-button').click();

    await expect(page.getByTestId('probe-error')).toContainText(
      'Connection failed. Check the backend URL and CORS policy, then try again.',
    );
    await expect(page.getByTestId('probe-connect-stage-metadata')).toHaveAttribute(
      'data-status',
      'error',
    );
    await expect(page.getByText('Supersubset Probe Designer')).toHaveCount(0);
  });

  test('accepts raw dataset arrays from direct /datasets and /query endpoints', async ({
    page,
  }) => {
    const importedDashboard = buildProbePreviewDashboard();
    let previewRequestBody: Record<string, unknown> | null = null;

    await page.route('**/probe-direct-api/datasets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(RAW_DISCOVERY_FIXTURE),
      });
    });

    await page.route('**/probe-direct-api/query', async (route) => {
      previewRequestBody = JSON.parse(route.request().postData() ?? '{}') as Record<
        string,
        unknown
      >;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: [
            { fieldId: 'region', label: 'Region', dataType: 'string' },
            { fieldId: 'revenue', label: 'Revenue', dataType: 'number' },
          ],
          rows: [{ region: 'West', revenue: 125000 }],
        }),
      });
    });

    await openProbe(page);
    const origin = new URL(page.url()).origin;

    await page.getByTestId('probe-url-input').fill(`${origin}/probe-direct-api/datasets`);
    await page.getByTestId('probe-query-url-input').fill(`${origin}/probe-direct-api/query`);
    await page.getByTestId('probe-connect-button').click();

    await expect(page.getByTestId('probe-dataset-count')).toHaveText('1 dataset(s) discovered');
    await expect(page.getByText('Supersubset Probe Designer')).toBeVisible();
    await expect(page.getByTestId('probe-preview-status')).toContainText(
      `${origin}/probe-direct-api/query`,
    );

    await page.getByTestId('import-btn').click();
    await expect(page.getByTestId('import-export-dialog')).toBeVisible();
    await page.getByTestId('import-textarea').fill(importedDashboard);
    await page.getByTestId('import-submit-btn').click();

    await expect(page.getByTestId('probe-preview-query-status')).toContainText('Live data');
    await expect(page.getByTestId('probe-preview-query-status')).toContainText('1 row');

    expect(previewRequestBody).toMatchObject({
      datasetId: 'orders',
      fields: [{ fieldId: 'region' }, { fieldId: 'revenue' }],
    });
  });

  test('executes preview queries after connecting with pasted metadata and an explicit query URL', async ({
    page,
  }) => {
    const importedDashboard = buildProbePreviewDashboard();
    let previewRequestBody: Record<string, unknown> | null = null;

    await page.route('**/probe-preview-api/supersubset/query', async (route) => {
      previewRequestBody = JSON.parse(route.request().postData() ?? '{}') as Record<
        string,
        unknown
      >;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          columns: [
            { fieldId: 'region', label: 'Region', dataType: 'string' },
            { fieldId: 'revenue', label: 'Revenue', dataType: 'number' },
          ],
          rows: [
            { region: 'West', revenue: 125000 },
            { region: 'East', revenue: 118000 },
          ],
        }),
      });
    });

    await openProbe(page);
    const origin = new URL(page.url()).origin;

    await page.getByTestId('probe-metadata-mode').selectOption('paste-json');
    await page.getByTestId('probe-metadata-json-input').fill(JSON.stringify(DISCOVERY_FIXTURE));
    await page.getByTestId('probe-query-url-input').fill(`${origin}/probe-preview-api`);
    await page.getByTestId('probe-connect-button').click();

    await expect(page.getByText('Supersubset Probe Designer')).toBeVisible();
    await expect(page.getByTestId('probe-preview-status')).toContainText(
      `${origin}/probe-preview-api`,
    );

    await page.getByTestId('import-btn').click();
    await expect(page.getByTestId('import-export-dialog')).toBeVisible();
    await page.getByTestId('import-textarea').fill(importedDashboard);
    await page.getByTestId('import-submit-btn').click();

    await expect(page.getByTestId('probe-preview-query-status')).toContainText('Live data');
    await expect(page.getByTestId('probe-preview-query-status')).toContainText('2 rows');
    await expect(page.getByTestId('probe-preview-query-status')).toContainText('orders');

    expect(previewRequestBody).toMatchObject({
      datasetId: 'orders',
      fields: [{ fieldId: 'region' }, { fieldId: 'revenue' }],
    });
  });
});
