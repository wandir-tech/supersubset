import { test, expect } from '@playwright/test';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:4321';

const pages = [
  '/chart-types/line-chart/',
  '/chart-types/bar-chart/',
  '/chart-types/pie-chart/',
  '/chart-types/scatter-chart/',
  '/widgets/alerts/',
  '/widgets/kpi-card/',
  '/widgets/table/',
  '/widgets/markdown/',
  '/filters/select-filter/',
  '/filters/date-filter/',
  '/filters/cross-filtering/',
  '/filters/filter-scope/',
  '/layout/grid/',
  '/layout/header/',
  '/layout/rows-columns/',
  '/layout/tabs/',
  '/layout/divider/',
  '/interactions/click-actions/',
  '/interactions/drill-down/',
  '/pages/multi-page/',
  '/pages/navigation/',
  '/import-export/code-view/',
  '/import-export/import/',
  '/import-export/json-export/',
  '/getting-started/first-dashboard/',
  '/getting-started/',  // introduction
];

for (const path of pages) {
  test(`QA: ${path}`, async ({ page }) => {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    // Check for placeholder text
    const placeholderText = await page.locator('text=Screenshots will be captured').count();
    const pendingText = await page.locator('text=Screenshot pending').count();
    expect(placeholderText).toBe(0);
    expect(pendingText).toBe(0);
    
    // Check all images loaded (no broken images)
    // Images use loading="lazy", so scroll each into view first
    const images = await page.locator('img').all();
    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src && !src.includes('favicon') && !src.includes('data:')) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate((el: HTMLImageElement) =>
          el.complete ? Promise.resolve() : new Promise(r => { el.onload = r; el.onerror = r; })
        );
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        expect(naturalWidth, `Image broken: ${src}`).toBeGreaterThan(0);
      }
    }
    
    // Save screenshot for visual review
    const slug = path.replace(/\//g, '_').replace(/^_|_$/g, '');
    await page.screenshot({ 
      path: `qa-screenshots/${slug}.png`, 
      fullPage: true 
    });
  });
}
