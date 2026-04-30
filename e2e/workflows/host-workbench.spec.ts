import { expect, test } from '@playwright/test';

const NEXTJS_WORKBENCH_ORIGIN = `http://localhost:${process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT ?? '3001'}`;

test.describe('Next.js Real Host Workbench', () => {
  test('logs in, loads datasets, publishes a dashboard, and re-queries in viewer mode', async ({
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
    await expect(page.getByTestId('workbench-query-log')).toContainText('chart-monthly-revenue');

    const initialQueryLog = await page.getByTestId('workbench-query-log').innerText();
    await page.getByLabel('Region').selectOption({ label: 'APAC' });
    await page.waitForFunction((previousLog) => {
      const node = document.querySelector('[data-testid="workbench-query-log"]');
      return !!node && node.textContent !== previousLog && node.textContent?.includes('APAC');
    }, initialQueryLog);

    await page.reload();
    await expect(page.getByTestId('workbench-shell')).toBeVisible();
    await expect(page.getByTestId('workbench-query-log')).toContainText('chart-monthly-revenue');

    expect(requestUrls.some((url) => url.includes('/api/graphql'))).toBe(true);
    expect(requestUrls.some((url) => url.includes('/api/analytics/supersubset/datasets'))).toBe(
      true,
    );
    expect(requestUrls.some((url) => url.includes('/api/analytics/supersubset/query'))).toBe(true);
    expect(consoleErrors.filter((text) => !text.includes('favicon'))).toHaveLength(0);
  });
});
