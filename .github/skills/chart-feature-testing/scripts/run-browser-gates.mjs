#!/usr/bin/env node
/**
 * Run chart-feature-testing browser gates A+B against a live Tripmatch stack.
 *
 *   UI_APP_PORT=4365 API_PORT=3174 node run-browser-gates.mjs
 */
import { chromium } from 'playwright';

const APP =
  process.env.PLAYWRIGHT_APP_BASE_URL || `http://localhost:${process.env.UI_APP_PORT || '4200'}`;
const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'admin@wandir.com';
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || '11111111';

async function login(page) {
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-email').fill(ADMIN_EMAIL);
  await page.getByTestId('login-email-continue-btn').click();
  await page.getByTestId('login-password').waitFor({ state: 'visible' });
  await page.getByTestId('login-password').fill(ADMIN_PASSWORD);
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 });
}

async function readBindingState(page) {
  return page.evaluate(() => {
    const y = document.querySelector('[data-testid="field-ref-yAxisField"]');
    const x = document.querySelector('[data-testid="field-ref-xAxisField"]');
    const agg = document.querySelector('[data-testid="field-ref-aggregation"]');
    return {
      xValue: x?.value ?? null,
      yValue: y?.value ?? null,
      aggregation: agg?.value ?? null,
      pass:
        x?.value === 'event_date' &&
        y?.value === 'event_id' &&
        (agg?.value === 'count' || agg?.value === ''),
    };
  });
}

async function clickPlansCreatedPerDayChart(page) {
  const chartTitle = page.getByText('Plans created per day', { exact: true });
  await chartTitle.waitFor({ state: 'visible', timeout: 30_000 });
  const box = await chartTitle.boundingBox();
  if (!box) throw new Error('Could not locate Plans created per day chart');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height + 40);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    console.log(`Login → ${APP}`);
    await login(page);

    console.log('Open analytics + revert to seed');
    await page.goto(`${APP}/admin/analytics`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Analytics' }).waitFor({ timeout: 30_000 });
    await page.getByRole('button', { name: /revert dashboard to seed/i }).click();
    await page.getByText(/dashboard reset to seed/i).waitFor({ timeout: 30_000 });

    console.log('Gate A — select chart, verify bindings (no hang)');
    await page.getByRole('tab', { name: /dashboard editor/i }).click();
    await page.getByRole('textbox', { name: /dashboard title/i }).waitFor({ timeout: 30_000 });
    await clickPlansCreatedPerDayChart(page);

    await page.waitForTimeout(3000);
    const gateA = await readBindingState(page);
    console.log('Gate A result:', gateA);
    if (!gateA.pass) {
      throw new Error(`Gate A failed: ${JSON.stringify(gateA)}`);
    }

    console.log('Gate B — area → bar → publish → metrics');
    await page.locator('[data-testid="chart-type-bar-chart"]').first().click();

    await page.waitForTimeout(500);
    const gateBFields = await readBindingState(page);
    console.log('Gate B fields after switch:', gateBFields);
    if (!gateBFields.pass) {
      throw new Error(`Gate B fields failed: ${JSON.stringify(gateBFields)}`);
    }

    const publish = page.getByRole('button', { name: /^publish$/i });
    if (!(await publish.count())) {
      await page
        .getByRole('button', { name: /toggle menu bar/i })
        .click()
        .catch(() => {});
    }
    await page.getByRole('button', { name: /^publish$/i }).click({ timeout: 10_000 });
    await page
      .getByText(/saved|showing the updated metrics/i)
      .waitFor({ timeout: 60_000 })
      .catch(() => {});

    await page.getByRole('tab', { name: /^metrics$/i }).click();
    await page.getByText('Plans created per day').waitFor({ timeout: 30_000 });

    const metrics = await page.evaluate(() => {
      const ticks = [...document.querySelectorAll('.recharts-cartesian-axis-tick-value')]
        .map((el) => el.textContent?.trim())
        .filter(Boolean);
      const hasDateTicks = ticks.some((t) => /^\d{4}-\d{2}-\d{2}/.test(t));
      const hasMysteryNumberOnly = ticks.length === 1 && /^\d+$/.test(ticks[0] ?? '');
      return {
        ticks: ticks.slice(0, 8),
        hasDateTicks,
        hasMysteryNumberOnly,
        pass: hasDateTicks && !hasMysteryNumberOnly,
      };
    });
    console.log('Gate B metrics:', metrics);
    if (!metrics.pass) {
      throw new Error(`Gate B metrics failed: ${JSON.stringify(metrics)}`);
    }

    if (consoleErrors.length) {
      console.warn('Console errors (non-fatal):', consoleErrors.slice(0, 5));
    }

    console.log('\n✅ All browser gates passed');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('\n❌ Browser gates failed:', err.message);
  process.exit(1);
});
