import { test, expect } from '@playwright/test';
import { defaultDashboard } from '../../examples/vite-sqlite/src/dashboard';

const SQLITE_STORAGE_KEY = 'supersubset:vite-sqlite-dashboard';

function buildImportedHostDashboard() {
  const dashboard = structuredClone(defaultDashboard);
  dashboard.title = 'Persisted Host Dashboard';
  dashboard.pages[0].widgets = dashboard.pages[0].widgets.map((widget) =>
    widget.id === 'chart-category-sales'
      ? { ...widget, title: 'Imported Category Revenue' }
      : widget,
  );
  return JSON.stringify(dashboard, null, 2);
}

test.describe('Host Integration Workflow', () => {
  test('Next.js runtime host stays runtime-only and uses host-owned theming', async ({ page }) => {
    const requestUrls: string[] = [];
    const consoleErrors: string[] = [];

    page.on('request', (request) => requestUrls.push(request.url()));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3001');

    await expect(page.getByText('Next.js Runtime Host')).toBeVisible();
    await expect(page.getByText('Supersubset inside a storefront operations shell.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Designer' })).toHaveCount(0);

    await page.getByRole('button', { name: /Switch to cool theme/i }).click();
    await expect(page.getByRole('button', { name: /Switch to warm theme/i })).toBeVisible();

    expect(requestUrls.some((url) => /superset|lightdash|rill/i.test(url))).toBe(false);
    expect(consoleErrors.filter((text) => !text.includes('favicon'))).toHaveLength(0);
  });

  test('Vite host persists imported schema through host-owned localStorage and reload', async ({ page }) => {
    const requestUrls: string[] = [];
    const consoleErrors: string[] = [];
    const importedDashboard = buildImportedHostDashboard();

    page.on('request', (request) => requestUrls.push(request.url()));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3002');

    await expect(page.getByText('Vite + SQLite host example')).toBeVisible();
    await expect(page.getByText('Query log')).toBeVisible();
    await page.waitForFunction(() => {
      const pre = document.querySelector('.query-panel pre');
      return !!pre && !pre.textContent?.includes('Waiting for SQLite runtime');
    });

    const initialQueryLog = await page.locator('.query-panel pre').innerText();
    await page.getByLabel('Region').selectOption({ label: 'APAC' });
    await page.waitForFunction(
      (previousLog) => {
        const pre = document.querySelector('.query-panel pre');
        return !!pre && pre.textContent !== previousLog && pre.textContent?.includes('["APAC"]');
      },
      initialQueryLog,
    );

    await page.getByRole('button', { name: 'Designer' }).click();
    await expect(page.getByTestId('sqlite-code-toggle')).toBeVisible();

    await page.getByTestId('import-btn').click();
    await expect(page.getByTestId('import-export-dialog')).toBeVisible();
    await page.getByTestId('import-textarea').fill(importedDashboard);
    await page.getByTestId('import-submit-btn').click();

    await page.waitForFunction(
      (storageKey) => window.localStorage.getItem(storageKey)?.includes('Persisted Host Dashboard') ?? false,
      SQLITE_STORAGE_KEY,
    );

    await page.getByTestId('sqlite-code-toggle').click();
    await expect(page.getByTestId('code-view-panel')).toContainText('Persisted Host Dashboard');
    await expect(page.getByTestId('code-view-panel')).toContainText('Imported Category Revenue');

    await page.reload();
    await expect(page.getByText('Vite + SQLite host example')).toBeVisible();
    await page.getByRole('button', { name: 'Designer' }).click();
    await expect(page.getByTestId('sqlite-code-toggle')).toBeVisible();
    await page.getByTestId('sqlite-code-toggle').click();
    await expect(page.getByTestId('code-view-panel')).toContainText('Persisted Host Dashboard');

    expect(requestUrls.some((url) => /superset|lightdash|rill/i.test(url))).toBe(false);
    expect(consoleErrors.filter((text) => !text.includes('favicon'))).toHaveLength(0);
  });
});