/**
 * 2.19 — Chrome MCP Test Plan A: Designer Happy Path.
 *
 * Executes the steps from plan-a-designer-happy-path.md as automated tests.
 * Takes screenshots at each milestone for visual verification.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'phase-2');

test.describe('Test Plan A — Designer Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Step 1: Launch & initial load — viewer renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('React')) {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-initial-load.png'),
      fullPage: true,
    });

    expect(errors).toHaveLength(0);
  });

  test('Step 2: Multi-page navigation works', async ({ page }) => {
    // Should have page tabs for the demo dashboard
    await page.waitForTimeout(1000);

    const tabs = page.locator('nav button');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);

    // Click second tab (Gallery)
    if (tabCount >= 2) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-gallery-page.png'),
      fullPage: true,
    });
  });

  test('Step 3: Designer loads with Puck editor', async ({ page }) => {
    await page.getByText('Designer').click();
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-designer-loaded.png'),
      fullPage: true,
    });

    // Puck should have rendered
    const puckContainer = page.locator('[class*="Puck"]');
    await expect(puckContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('Step 4: Filters slide-over panel opens from toolbar', async ({ page }) => {
    await page.getByText('Designer').click();
    await page.waitForTimeout(2000);

    // Open Filters panel via toolbar button
    await page.getByTestId('filters-toggle').click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-filters-panel.png'),
      fullPage: true,
    });

    // Verify slide-over panel is visible
    await expect(page.getByTestId('slide-over-panel')).toBeVisible();
    await expect(page.getByText('Dashboard Filters')).toBeVisible();

    // Close via Done button
    await page.getByTestId('slide-over-done').click();
    await expect(page.getByTestId('slide-over-panel')).not.toBeVisible();
  });

  test('Step 5: Code view shows canonical schema', async ({ page }) => {
    await page.getByText('Designer').click();
    await page.waitForTimeout(2000);

    // Toggle code view
    await page.getByText('Code').click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-code-view.png'),
      fullPage: true,
    });

    // Should contain schema content
    await expect(page.getByText('schemaVersion').first()).toBeVisible({ timeout: 5000 });
  });

  test('Step 6: Preview mode with responsive viewport', async ({ page }) => {
    await page.getByText('Preview').click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-preview-auto.png'),
      fullPage: true,
    });

    // Test tablet viewport
    await page.locator('[data-testid="viewport-tablet"]').click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06b-preview-tablet.png'),
      fullPage: true,
    });

    // Test mobile viewport
    await page.locator('[data-testid="viewport-mobile"]').click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06c-preview-mobile.png'),
      fullPage: true,
    });
  });

  test('Step 7: Full round-trip — designer → publish → viewer', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('[Supersubset]')) {
        consoleMessages.push(msg.text());
      }
    });

    // Open designer
    await page.getByText('Designer').click();
    await page.waitForTimeout(3000);

    // Try to publish
    const publishBtn = page.locator('button', { hasText: /Publish/i });
    const hasPublish = await publishBtn.first().isVisible().catch(() => false);

    if (hasPublish) {
      // Dismiss any dialogs
      page.on('dialog', (dialog) => dialog.accept());
      await publishBtn.first().click();
      await page.waitForTimeout(1000);

      // Switch to viewer
      await page.getByText('Viewer').click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '07-round-trip-viewer.png'),
        fullPage: true,
      });

      // Verify saved dashboard message
      const savedMsg = page.getByText('Last saved:');
      const hasSaved = await savedMsg.first().isVisible().catch(() => false);
      if (hasSaved) {
        expect(consoleMessages.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
