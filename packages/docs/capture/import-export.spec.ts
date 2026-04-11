/**
 * Screenshot capture: Import/Export & Code View panels.
 */
import { test } from '@playwright/test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  switchToDesigner,
  waitForChartsReady,
  captureFullPage,
  setupConsoleErrorCapture,
  assertNoConsoleErrors,
} from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Import/Export screenshots', () => {
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    consoleErrors = setupConsoleErrorCapture(page);
    await page.goto('/');
    await waitForChartsReady(page);
  });

  test.afterEach(() => {
    assertNoConsoleErrors(consoleErrors);
  });

  // ── Code View panel ───────────────────────────────
  test('designer - code view panel', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);

    const codeBtn = page.locator('[data-testid="code-toggle"]');
    if (await codeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await codeBtn.click();
      await page.waitForTimeout(500);
    }
    await captureFullPage(page, 'import-export', 'code-view', 'default', 'designer');
  });

  // ── Designer with code view closed ────────────────
  test('designer - default (no panels)', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);
    await captureFullPage(page, 'import-export', 'designer', 'default', 'designer');
  });

  // ── Import/Export buttons area ────────────────────
  test('designer - import export area', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);

    // Capture the designer actions toolbar that contains Import/Export
    const actionsBar = page.locator('[data-testid="dev-app-designer-actions"]');
    if (await actionsBar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await actionsBar.screenshot({
        path: path.resolve(__dirname, '../src/assets/screenshots/import-export/import-export-toolbar-default-designer.png'),
        animations: 'disabled',
      });
    }
    await captureFullPage(page, 'import-export', 'import-export', 'default', 'designer');
  });

  // ── Interactions panel ────────────────────────────
  test('designer - interactions panel', async ({ page }) => {
    await switchToDesigner(page);
    await waitForChartsReady(page);

    const interactionsBtn = page.locator('[data-testid="interactions-toggle"]');
    if (await interactionsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await interactionsBtn.click();
      await page.waitForTimeout(500);
    }
    await captureFullPage(page, 'interactions', 'interaction-editor', 'default', 'designer');
  });
});
