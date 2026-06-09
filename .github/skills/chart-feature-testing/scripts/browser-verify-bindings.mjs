#!/usr/bin/env node
/**
 * Browser-side assertions for chart-feature-testing (paste into DevTools console
 * or run via Chrome DevTools MCP evaluate_script on /admin/analytics Dashboard Editor).
 *
 * Usage (MCP):
 *   evaluate_script with the function body of readChartBindingState below after
 *   selecting the "Plans created per day" chart (click the 6/12 canvas slot).
 */
export function readChartBindingState() {
  const y = document.querySelector('[data-testid="field-ref-yAxisField"]');
  const x = document.querySelector('[data-testid="field-ref-xAxisField"]');
  const agg = document.querySelector('[data-testid="field-ref-aggregation"]');
  return {
    xValue: x?.value ?? null,
    xLabel: x ? x.options?.[x.selectedIndex]?.text : null,
    yValue: y?.value ?? null,
    yLabel: y ? y.options?.[y.selectedIndex]?.text : null,
    aggregation: agg?.value ?? null,
    pass:
      x?.value === 'event_date' &&
      y?.value === 'event_id' &&
      (agg?.value === 'count' || agg?.value === ''),
  };
}

export function readMetricsChartAxisLabels() {
  const titles = [...document.querySelectorAll('h6')].map((el) => el.textContent?.trim());
  const ticks = [
    ...document.querySelectorAll('.recharts-xAxis tick text, .recharts-cartesian-axis-tick-value'),
  ]
    .map((el) => el.textContent?.trim())
    .filter(Boolean);
  const hasDateTicks = ticks.some((t) => /^\d{4}-\d{2}-\d{2}/.test(t));
  const hasMysteryNumberOnly = ticks.length === 1 && /^\d+$/.test(ticks[0] ?? '');
  return {
    titles,
    ticks,
    hasDateTicks,
    hasMysteryNumberOnly,
    pass: hasDateTicks && !hasMysteryNumberOnly,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Import readChartBindingState / readMetricsChartAxisLabels in browser context.');
}
