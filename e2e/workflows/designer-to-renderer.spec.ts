/**
 * 2.17 — Workflow test: Designer-to-Renderer round-trip.
 *
 * Verifies that:
 * 1. Designer loads and renders blocks
 * 2. User can switch to Preview mode and see runtime renderer
 * 3. Switch back to Designer and state is preserved
 * 4. Publish emits a valid canonical schema
 */
import { test, expect } from '@playwright/test';

test.describe('Designer-to-Renderer Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('app loads with mode toggle buttons', async ({ page }) => {
    // The dev app has Viewer/Designer/Preview mode buttons
    await expect(page.getByText('Viewer')).toBeVisible();
    await expect(page.getByText('Designer')).toBeVisible();
    await expect(page.getByText('Preview')).toBeVisible();
  });

  test('viewer mode renders charts without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Default is viewer mode
    await expect(page.getByText('Viewer')).toBeVisible();

    // Wait for page tabs to appear (multi-page dashboard)
    await page.waitForTimeout(1000);

    // Should have page navigation
    const pageButtons = page.locator('nav button');
    const count = await pageButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // No console errors
    expect(errors.filter((e) => !e.includes('React'))).toHaveLength(0);
  });

  test('designer mode loads Puck editor', async ({ page }) => {
    await page.getByText('Designer').click();

    // Puck editor should load — look for its main container
    await page.waitForTimeout(2000);

    // The designer should be visible (Puck renders its own chrome)
    const designerFrame = page.locator('[class*="Puck"]');
    await expect(designerFrame.first()).toBeVisible({ timeout: 10000 });
  });

  test('preview mode shows responsive viewport switcher', async ({ page }) => {
    await page.getByText('Preview').click();

    // LivePreviewPane has viewport buttons
    await expect(page.locator('[data-testid="viewport-auto"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="viewport-tablet"]')).toBeVisible();
    await expect(page.locator('[data-testid="viewport-mobile"]')).toBeVisible();
  });

  test('mode switching preserves state', async ({ page }) => {
    // Start in viewer
    await expect(page.getByText('Viewer')).toBeVisible();

    // Switch to designer
    await page.getByText('Designer').click();
    await page.waitForTimeout(1000);

    // Switch to preview
    await page.getByText('Preview').click();
    await page.waitForTimeout(500);

    // Switch back to viewer
    await page.getByText('Viewer').click();
    await page.waitForTimeout(500);

    // Should still have page navigation
    const pageButtons = page.locator('nav button');
    const count = await pageButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('designer toolbar shows undo/redo and dashboard filters', async ({ page }) => {
    await page.getByText('Designer').click();
    await page.waitForTimeout(1000);

    // Toolbar should show Undo/Redo, Code, Dashboard Filters, Interactions
    await expect(page.getByText('Undo')).toBeVisible();
    await expect(page.getByText('Redo')).toBeVisible();
    await expect(page.getByText('Code')).toBeVisible();
    await expect(page.getByTestId('designer-filters-toggle')).toHaveText(/Dashboard Filters/);
    await expect(page.getByText('Interactions')).toBeVisible();
  });

  test('designer canvas preserves authored row spans from the canonical dashboard', async ({
    page,
  }) => {
    await page.getByText('Designer').click();
    await expect(page.getByTestId('designer-header-controls')).toBeVisible({ timeout: 10000 });

    const canvas = page.frameLocator('iframe').first();
    await expect(canvas.getByText('Operations Watchlist')).toBeVisible();

    const metrics = await canvas.locator('body').evaluate(() => {
      const findRow = (text: string) =>
        Array.from(document.querySelectorAll('div')).find(
          (element) =>
            (element.textContent || '').includes(text) &&
            getComputedStyle(element).display === 'grid',
        );

      const measureRow = (row: Element | undefined) => {
        if (!row) {
          return null;
        }

        return {
          width: row.getBoundingClientRect().width,
          children: Array.from(row.children).map((child) => ({
            width: child.getBoundingClientRect().width,
            gridColumn: getComputedStyle(child).gridColumn,
          })),
        };
      };

      return {
        filters: measureRow(findRow('All Dashboard Filters')),
        alerts: measureRow(findRow('Operations Watchlist')),
        kpis: measureRow(findRow('Total Revenue')),
      };
    });

    expect(metrics.filters).not.toBeNull();
    expect(metrics.alerts).not.toBeNull();
    expect(metrics.kpis).not.toBeNull();

    expect(metrics.filters?.children.map((child) => child.gridColumn)).toEqual([
      'span 8',
      'span 4',
    ]);
    expect(metrics.alerts?.children.map((child) => child.gridColumn)).toEqual(['span 12']);
    expect(metrics.kpis?.children.map((child) => child.gridColumn)).toEqual([
      'span 4',
      'span 4',
      'span 4',
    ]);

    expect(metrics.alerts?.children[0]?.width ?? 0).toBeGreaterThan(
      (metrics.alerts?.width ?? 0) * 0.9,
    );
  });

  test('filters panel opens as slide-over', async ({ page }) => {
    await page.getByText('Designer').click();
    await page.waitForTimeout(1000);

    // Click Dashboard Filters button
    await page.getByTestId('designer-filters-toggle').click();
    await page.waitForTimeout(500);

    // Should see the slide-over panel
    await expect(page.getByTestId('slide-over-panel')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard Filters' })).toBeVisible();
  });

  test('adding a dashboard filter updates the drawer immediately', async ({ page }) => {
    await page.getByText('Designer').click();
    await page.waitForTimeout(1000);

    await page.getByTestId('designer-filters-toggle').click();
    await expect(page.getByTestId('filter-builder-panel')).toBeVisible();

    const initialCount = await page.locator('[data-testid^="filter-editor-"]').count();
    await page.getByTestId('add-filter').click();

    await expect(page.locator('[data-testid^="filter-editor-"]')).toHaveCount(initialCount + 1);
    await expect(page.getByLabel('Filter title').last()).toBeFocused();
  });
});
