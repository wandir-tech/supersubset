import { expect, test } from '@playwright/test';

test.describe('Probe metadata onboarding', () => {
  test('opens the designer from pasted metadata JSON', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('mode-probe').click();
    await page.getByTestId('probe-metadata-mode').selectOption('paste-json');
    await page.getByTestId('probe-metadata-json-input').fill(
      JSON.stringify({
        datasets: [
          {
            id: 'orders',
            label: 'Orders',
            fields: [
              { id: 'region', dataType: 'string' },
              { id: 'revenue', dataType: 'number' },
              { id: 'order_date', dataType: 'date' },
            ],
          },
        ],
      }),
    );

    await page.getByTestId('probe-connect-button').click();

    await expect(page.getByTestId('probe-dataset-count')).toHaveText('1 dataset(s) discovered');
    await expect(page.getByTestId('probe-preview-status')).toContainText('Preview: disabled');
    await expect(page.getByText('Supersubset Probe Designer')).toBeVisible();
  });
});
