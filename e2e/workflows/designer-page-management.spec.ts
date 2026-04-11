import { test, expect } from '@playwright/test';

async function openDesigner(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /designer/i }).click();
  await expect(page.getByTestId('designer-header-controls')).toBeVisible({ timeout: 10000 });
}

test.describe('Designer page management', () => {
  test('avoids outer header overflow at wide desktop widths', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await openDesigner(page);

    const headerMetrics = await page.getByTestId('designer-header-controls').evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));

    expect(headerMetrics.scrollWidth - headerMetrics.clientWidth).toBeLessThan(2);
  });

  test('keeps the canvas usable at medium desktop widths', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 760 });
    await openDesigner(page);

    await expect(page.getByTestId('designer-page-controls')).toBeVisible();
    await expect(page.getByTestId('dev-app-designer-actions')).toBeVisible();
    await expect(page.locator('input[value="Sales Dashboard"]')).toHaveCount(1);

    const headerBox = await page.getByTestId('designer-header-controls').boundingBox();
    const canvasFrame = page.locator('iframe').first();
    await expect(canvasFrame).toBeVisible();
    const canvasBox = await canvasFrame.boundingBox();
    const viewportHeight = page.viewportSize()?.height ?? 0;

    expect(headerBox?.height ?? 0).toBeLessThan(190);
    expect(canvasBox?.width ?? 0).toBeGreaterThan(300);
    expect(canvasBox?.height ?? 0).toBeGreaterThan(220);
    expect(canvasBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(viewportHeight - 120);
  });

  test('adds and renames a page from the header controls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDesigner(page);

    await page.getByTestId('designer-page-add').click();
    await expect(page.getByTestId('designer-page-tab-page-3')).toBeVisible();
    await expect(page.getByTestId('designer-page-title-input')).toHaveValue('Page 3');

    await page.getByTestId('designer-page-title-input').fill('Regional Detail');
    await page.getByTestId('designer-page-title-input').press('Enter');

    await expect(page.getByTestId('designer-page-tab-page-3')).toHaveText('Regional Detail');
  });

  test('deletes the explicitly targeted page without changing the current page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDesigner(page);

    await expect(page.getByTestId('designer-page-title-input')).toHaveValue('Overview');

    await page.getByTestId('designer-page-delete-trigger-page-gallery').click();
    await expect(page.getByTestId('designer-page-delete-prompt')).toContainText('Chart Gallery');
    await page.getByTestId('designer-page-delete-confirm').click();

    await expect(page.locator('[data-testid="designer-page-tab-page-gallery"]')).toHaveCount(0);
    await expect(page.getByTestId('designer-page-title-input')).toHaveValue('Overview');
  });

  test('falls back to the previous page when deleting the active page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openDesigner(page);

    await page.getByTestId('designer-page-tab-page-gallery').click();
    await expect(page.getByTestId('designer-page-title-input')).toHaveValue('Chart Gallery');

    await page.getByTestId('designer-page-delete-trigger-page-gallery').click();
    await expect(page.getByTestId('designer-page-delete-prompt')).toContainText('Chart Gallery');
    await page.getByTestId('designer-page-delete-confirm').click();

    await expect(page.getByTestId('designer-page-title-input')).toHaveValue('Overview');
    await expect(page.locator('[data-testid="designer-page-tab-page-gallery"]')).toHaveCount(0);
  });
});