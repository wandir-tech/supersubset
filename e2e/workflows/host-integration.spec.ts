import { test, expect } from '@playwright/test';
import { defaultDashboard } from '../../examples/vite-sqlite/src/dashboard';

const SQLITE_STORAGE_KEY = 'supersubset:vite-sqlite-dashboard';
const NEXTJS_EXAMPLE_ORIGIN = `http://localhost:${process.env.SUPERSUBSET_EXAMPLE_NEXTJS_PORT ?? '3001'}`;
const VITE_SQLITE_EXAMPLE_ORIGIN = `http://localhost:${process.env.SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT ?? '3002'}`;

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
  test('[host-integration.EMBEDDING_CONTRACT.1] Next.js runtime host stays runtime-only and uses host-owned theming', async ({
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

    await page.goto(NEXTJS_EXAMPLE_ORIGIN);

    await expect(page.getByText('Next.js Runtime Host')).toBeVisible();
    await expect(page.getByText('Supersubset inside a storefront operations shell.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Designer' })).toHaveCount(0);

    const renderer = page.locator('[data-ss-dashboard="nextjs-ecommerce-dashboard"]');
    const shell = page.locator('main');
    const warmRendererBackground = await renderer.evaluate(
      (element) => window.getComputedStyle(element).backgroundColor,
    );
    const warmShellBackground = await shell.evaluate(
      (element) => window.getComputedStyle(element).backgroundImage,
    );

    await page.getByRole('button', { name: /Switch to cool theme/i }).click();
    await expect(page.getByRole('button', { name: /Switch to warm theme/i })).toBeVisible();

    const coolRendererBackground = await renderer.evaluate(
      (element) => window.getComputedStyle(element).backgroundColor,
    );
    const coolShellBackground = await shell.evaluate(
      (element) => window.getComputedStyle(element).backgroundImage,
    );

    expect(coolRendererBackground).not.toBe(warmRendererBackground);
    expect(coolShellBackground).not.toBe(warmShellBackground);

    expect(requestUrls.some((url) => /superset|lightdash|rill/i.test(url))).toBe(false);
    expect(consoleErrors.filter((text) => !text.includes('favicon'))).toHaveLength(0);
  });

  test('[host-integration.HOST_OWNERSHIP.1] Vite host persists imported schema through host-owned localStorage and reload', async ({
    page,
  }) => {
    const requestUrls: string[] = [];
    const consoleErrors: string[] = [];
    const importedDashboard = buildImportedHostDashboard();

    page.on('request', (request) => requestUrls.push(request.url()));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(VITE_SQLITE_EXAMPLE_ORIGIN);

    await expect(page.getByText('Vite + SQLite host example')).toBeVisible();
    await expect(page.getByText('Query log')).toBeVisible();
    await page.waitForFunction(() => {
      const pre = document.querySelector('.query-panel pre');
      return !!pre && !pre.textContent?.includes('Waiting for SQLite runtime');
    });

    const initialQueryLog = await page.locator('.query-panel pre').innerText();
    await page.getByLabel('Region').selectOption({ label: 'APAC' });
    await page.waitForFunction((previousLog) => {
      const pre = document.querySelector('.query-panel pre');
      return !!pre && pre.textContent !== previousLog && pre.textContent?.includes('["APAC"]');
    }, initialQueryLog);
    await expect(page.locator('.query-panel pre')).toContainText('SELECT');
    await expect(page.locator('.query-panel pre')).toContainText('FROM orders');

    await page.getByRole('button', { name: 'Designer' }).click();
    await expect(page.getByTestId('sqlite-code-toggle')).toBeVisible();

    await page.getByTestId('import-btn').click();
    await expect(page.getByTestId('import-export-dialog')).toBeVisible();
    await page.getByTestId('import-textarea').fill(importedDashboard);
    await page.getByTestId('import-submit-btn').click();

    await page.waitForFunction(
      (storageKey) =>
        window.localStorage.getItem(storageKey)?.includes('Persisted Host Dashboard') ?? false,
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

  test('[interface-behavior.EMPTY_STATES.2] Vite host resolves field-backed Region options through the host QueryAdapter', async ({
    page,
  }) => {
    // Updated for ADR-011: with `LogicalQuery.distinct` plus `SqlQueryAdapter`
    // (or any QueryAdapter implementing `execute`), field-backed options now
    // resolve through the host instead of rendering the legacy unavailable
    // placeholder. The Vite + SQLite example provides a QueryAdapter, so the
    // Region filter populates with distinct values from the live dataset.
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(VITE_SQLITE_EXAMPLE_ORIGIN);

    await expect(page.getByText('Vite + SQLite host example')).toBeVisible();
    await page.getByRole('button', { name: 'Designer' }).click();
    await expect(page.getByTestId('designer-filters-toggle')).toBeVisible();

    await page.getByTestId('designer-filters-toggle').click();
    await expect(page.getByTestId('filter-builder-panel')).toBeVisible();
    await page.getByTestId('filter-option-source-kind-filter-region').selectOption('field');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('slide-over-panel')).toHaveCount(0);

    await page.getByRole('button', { name: 'Viewer' }).click();

    const regionFilter = page.getByLabel('Region');
    await expect(regionFilter).toHaveAttribute('data-ss-filter-options-state', 'ready');
    await expect(regionFilter).toBeEnabled();
    // Placeholder + at least one resolved value from the host dataset.
    await expect(regionFilter.locator('option')).not.toHaveText([
      'Field-backed options require host support',
    ]);
    const optionCount = await regionFilter.locator('option').count();
    expect(optionCount).toBeGreaterThan(1);

    expect(consoleErrors.filter((text) => !text.includes('favicon'))).toHaveLength(0);
  });
});
