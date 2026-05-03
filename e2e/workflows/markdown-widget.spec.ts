import { expect, test } from '@playwright/test';

test.describe('Markdown widget workflow', () => {
  test('renders formatted copy and safe external links on the gallery page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Chart Gallery' }).click();

    const markdownWidget = page.locator(
      '[data-ss-dashboard="demo-sales"] [data-ss-node="w-markdown"] .ss-markdown',
    );

    await expect(markdownWidget).toBeVisible();
    await expect(markdownWidget.locator('strong')).toContainText('all 17 widget types');

    const cookbookLink = markdownWidget.getByRole('link', { name: 'chart cookbook' });

    await expect(cookbookLink).toBeVisible();
    await expect(cookbookLink).toHaveAttribute('href', 'https://example.com/chart-cookbook');
    await expect(cookbookLink).toHaveAttribute('target', '_blank');
    await expect(cookbookLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
