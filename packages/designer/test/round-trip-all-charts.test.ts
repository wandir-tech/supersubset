/**
 * Comprehensive round-trip integration tests for ALL chart types.
 *
 * For each chart type the test flow is:
 *   1. Build a Puck Data payload with field-ref props set
 *   2. Convert to canonical DashboardDefinition (puckToCanonical)
 *   3. Verify dataBinding is populated correctly
 *   4. Convert back to Puck Data (canonicalToPuck)
 *   5. Verify all field-ref props are restored
 *
 * This catches any field-ref that doesn't survive the round-trip, which
 * is the root cause of "dropdowns not pre-populated".
 */
import { describe, it, expect } from 'vitest';
import type { Data } from '@puckeditor/core';
import type { DashboardDefinition, WidgetDefinition } from '@supersubset/schema';
import { puckToCanonical, canonicalToPuck } from '../src/adapters/puck-canonical';

// ─── Helpers ─────────────────────────────────────────────────

/** Builds minimal Puck Data for a single component. */
function makePuckData(type: string, props: Record<string, unknown>): Data {
  return {
    root: { props: { title: 'Round-trip Test' } },
    content: [
      { type, props: { id: `widget-${type.toLowerCase()}`, title: `Test ${type}`, ...props } },
    ],
  };
}

/** Builds a minimal canonical dashboard wrapper for a single widget. */
function makeCanonical(widget: WidgetDefinition): DashboardDefinition {
  return {
    schemaVersion: '0.2.0',
    id: 'test',
    title: 'Round-trip Test',
    pages: [
      {
        id: 'page-1',
        title: 'Page 1',
        rootNodeId: 'root',
        layout: {
          root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
          'grid-main': {
            id: 'grid-main',
            type: 'grid',
            children: [`layout-${widget.id}`],
            parentId: 'root',
            meta: { columns: 12 },
          },
          [`layout-${widget.id}`]: {
            id: `layout-${widget.id}`,
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: widget.id, width: 12 },
          },
        },
        widgets: [widget],
      },
    ],
  };
}

// ─── Round-trip per chart type ───────────────────────────────

describe('round-trip: Puck → Canonical → Puck (every chart type)', () => {
  it('LineChart: xAxisField, yAxisField, seriesField', () => {
    const puck = makePuckData('LineChart', {
      datasetRef: 'ds',
      xAxisField: 'month',
      yAxisField: 'revenue',
      seriesField: 'region',
      aggregation: 'sum',
      smooth: 'true',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('line-chart');
    expect(w.dataBinding?.datasetRef).toBe('ds');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'x-axis', fieldRef: 'month' }),
        expect.objectContaining({ role: 'y-axis', fieldRef: 'revenue', aggregation: 'sum' }),
        expect.objectContaining({ role: 'series', fieldRef: 'region' }),
      ]),
    );

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.xAxisField).toBe('month');
    expect(rp.yAxisField).toBe('revenue');
    expect(rp.seriesField).toBe('region');
    expect(rp.datasetRef).toBe('ds');
    expect(rp.aggregation).toBe('sum');
    expect(rp.smooth).toBe('true');
  });

  it('BarChart: xAxisField, yAxisField, orientation, stacked', () => {
    const puck = makePuckData('BarChart', {
      datasetRef: 'ds',
      xAxisField: 'category',
      yAxisField: 'amount',
      seriesField: '',
      aggregation: 'none',
      orientation: 'horizontal',
      stacked: 'true',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('bar-chart');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'x-axis', fieldRef: 'category' }),
        expect.objectContaining({ role: 'y-axis', fieldRef: 'amount' }),
      ]),
    );
    expect(w.config.horizontal).toBe(true);
    expect(w.config.stacked).toBe(true);

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.xAxisField).toBe('category');
    expect(rp.yAxisField).toBe('amount');
    expect(rp.orientation).toBe('horizontal');
    expect(rp.stacked).toBe('true');
  });

  it('PieChart: categoryField, valueField, variant', () => {
    const puck = makePuckData('PieChart', {
      datasetRef: 'ds',
      categoryField: 'region',
      valueField: 'sales',
      aggregation: 'sum',
      variant: 'donut',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('pie-chart');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'category', fieldRef: 'region' }),
        expect.objectContaining({ role: 'value', fieldRef: 'sales' }),
      ]),
    );

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.categoryField).toBe('region');
    expect(rp.valueField).toBe('sales');
    expect(rp.variant).toBe('donut');
  });

  it('ScatterChart: xAxisField, yAxisField, sizeField, colorGroupField', () => {
    const puck = makePuckData('ScatterChart', {
      datasetRef: 'ds',
      xAxisField: 'quantity',
      yAxisField: 'price',
      sizeField: 'profit',
      colorGroupField: 'region',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('scatter-chart');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'x-axis', fieldRef: 'quantity' }),
        expect.objectContaining({ role: 'y-axis', fieldRef: 'price' }),
        expect.objectContaining({ role: 'size', fieldRef: 'profit' }),
        expect.objectContaining({ role: 'color-group', fieldRef: 'region' }),
      ]),
    );

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.xAxisField).toBe('quantity');
    expect(rp.yAxisField).toBe('price');
    expect(rp.sizeField).toBe('profit');
    expect(rp.colorGroupField).toBe('region');
  });

  it('AreaChart: xAxisField, yAxisField, stacked', () => {
    const puck = makePuckData('AreaChart', {
      datasetRef: 'ds',
      xAxisField: 'date',
      yAxisField: 'views',
      seriesField: 'channel',
      aggregation: 'none',
      stacked: 'true',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('area-chart');

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.xAxisField).toBe('date');
    expect(rp.yAxisField).toBe('views');
    expect(rp.seriesField).toBe('channel');
    expect(rp.stacked).toBe('true');
  });

  it('ComboChart: xAxisField, barField, lineField', () => {
    const puck = makePuckData('ComboChart', {
      datasetRef: 'ds',
      xAxisField: 'month',
      barField: 'revenue',
      lineField: 'margin',
      aggregation: 'none',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('combo-chart');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'x-axis', fieldRef: 'month' }),
        expect.objectContaining({ role: 'bar-y', fieldRef: 'revenue' }),
        expect.objectContaining({ role: 'line-y', fieldRef: 'margin' }),
      ]),
    );

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.xAxisField).toBe('month');
    expect(rp.barField).toBe('revenue');
    expect(rp.lineField).toBe('margin');
  });

  it('HeatmapChart: xAxisField, yAxisField, valueField', () => {
    const puck = makePuckData('HeatmapChart', {
      datasetRef: 'ds',
      xAxisField: 'hour',
      yAxisField: 'day',
      valueField: 'count',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('heatmap');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'x-axis', fieldRef: 'hour' }),
        expect.objectContaining({ role: 'y-axis', fieldRef: 'day' }),
        expect.objectContaining({ role: 'value', fieldRef: 'count' }),
      ]),
    );

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.xAxisField).toBe('hour');
    expect(rp.yAxisField).toBe('day');
    expect(rp.valueField).toBe('count');
  });

  it('RadarChart: categoryField, valueField', () => {
    const puck = makePuckData('RadarChart', {
      datasetRef: 'ds',
      categoryField: 'kpi',
      valueField: 'score',
      seriesField: 'product',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('radar-chart');

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.categoryField).toBe('kpi');
    expect(rp.valueField).toBe('score');
    expect(rp.seriesField).toBe('product');
  });

  it('FunnelChart: categoryField, valueField, sort', () => {
    const puck = makePuckData('FunnelChart', {
      datasetRef: 'ds',
      categoryField: 'stage',
      valueField: 'count',
      aggregation: 'none',
      sort: 'descending',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('funnel-chart');

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.categoryField).toBe('stage');
    expect(rp.valueField).toBe('count');
    expect(rp.sort).toBe('descending');
  });

  it('TreemapChart: nameField, valueField, parentField', () => {
    const puck = makePuckData('TreemapChart', {
      datasetRef: 'ds',
      nameField: 'category',
      valueField: 'amount',
      parentField: 'group',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('treemap');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'name', fieldRef: 'category' }),
        expect.objectContaining({ role: 'value', fieldRef: 'amount' }),
        expect.objectContaining({ role: 'parent', fieldRef: 'group' }),
      ]),
    );

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.nameField).toBe('category');
    expect(rp.valueField).toBe('amount');
    expect(rp.parentField).toBe('group');
  });

  it('SankeyChart: sourceField, targetField, valueField', () => {
    const puck = makePuckData('SankeyChart', {
      datasetRef: 'ds',
      sourceField: 'from',
      targetField: 'to',
      valueField: 'flow',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('sankey');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'source', fieldRef: 'from' }),
        expect.objectContaining({ role: 'target', fieldRef: 'to' }),
        expect.objectContaining({ role: 'value', fieldRef: 'flow' }),
      ]),
    );

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.sourceField).toBe('from');
    expect(rp.targetField).toBe('to');
    expect(rp.valueField).toBe('flow');
  });

  it('WaterfallChart: categoryField, valueField, totalLabel', () => {
    const puck = makePuckData('WaterfallChart', {
      datasetRef: 'ds',
      categoryField: 'item',
      valueField: 'amount',
      totalLabel: 'Net',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('waterfall');

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.categoryField).toBe('item');
    expect(rp.valueField).toBe('amount');
    expect(rp.totalLabel).toBe('Net');
  });

  it('BoxPlotChart: categoryField, valueField', () => {
    const puck = makePuckData('BoxPlotChart', {
      datasetRef: 'ds',
      categoryField: 'region',
      valueField: 'order_amount',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('box-plot');

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.categoryField).toBe('region');
    expect(rp.valueField).toBe('order_amount');
  });

  it('GaugeChart: valueField, minValue, maxValue', () => {
    const puck = makePuckData('GaugeChart', {
      datasetRef: 'ds',
      valueField: 'completion',
      minValue: 0,
      maxValue: 100,
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('gauge');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'value', fieldRef: 'completion' })]),
    );

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.valueField).toBe('completion');
    expect(rp.minValue).toBe(0);
    expect(rp.maxValue).toBe(100);
  });

  it('KPICard: valueField, comparisonField, prefix', () => {
    const puck = makePuckData('KPICard', {
      datasetRef: 'ds',
      valueField: 'revenue',
      aggregation: 'sum',
      comparisonField: 'prev_revenue',
      prefix: '$',
      suffix: '',
      subtitleField: 'period',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('kpi-card');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'value', fieldRef: 'revenue' }),
        expect.objectContaining({ role: 'comparison', fieldRef: 'prev_revenue' }),
      ]),
    );
    expect(w.config.prefix).toBe('$');

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.valueField).toBe('revenue');
    expect(rp.comparisonField).toBe('prev_revenue');
    expect(rp.prefix).toBe('$');
    expect(rp.subtitleField).toBe('period');
  });

  it('AlertsWidgetBlock: titleField, messageField, severityField, timestampField', () => {
    const puck = makePuckData('AlertsWidgetBlock', {
      datasetRef: 'ds-alerts',
      titleField: 'alert_title',
      messageField: 'alert_body',
      severityField: 'level',
      timestampField: 'created_at',
      layout: 'wrap',
      maxItems: 5,
      defaultSeverity: 'warning',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('alerts');
    expect(w.dataBinding?.datasetRef).toBe('ds-alerts');
    expect(w.dataBinding?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'alert-title', fieldRef: 'alert_title' }),
        expect.objectContaining({ role: 'alert-message', fieldRef: 'alert_body' }),
        expect.objectContaining({ role: 'alert-severity', fieldRef: 'level' }),
        expect.objectContaining({ role: 'alert-timestamp', fieldRef: 'created_at' }),
      ]),
    );

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.datasetRef).toBe('ds-alerts');
    expect(rp.titleField).toBe('alert_title');
    expect(rp.messageField).toBe('alert_body');
    expect(rp.severityField).toBe('level');
    expect(rp.timestampField).toBe('created_at');
    expect(rp.layout).toBe('wrap');
    expect(rp.maxItems).toBe(5);
    expect(rp.defaultSeverity).toBe('warning');
  });

  it('Table: datasetRef only (no field bindings)', () => {
    const puck = makePuckData('Table', {
      datasetRef: 'ds',
      pageSize: 25,
      striped: 'true',
    });

    const canonical = puckToCanonical(puck);
    const w = canonical.pages[0].widgets[0];
    expect(w.type).toBe('table');

    const restored = canonicalToPuck(canonical);
    const rp = restored.content![0].props;
    expect(rp.datasetRef).toBe('ds');
    expect(rp.pageSize).toBe(25);
    expect(rp.striped).toBe('true');
  });
});

// ─── Canonical → Puck: dataBinding populates Puck props ─────

describe('canonicalToPuck: dataBinding correctly populates field-ref Puck props', () => {
  it('line-chart with dataBinding', () => {
    const dash = makeCanonical({
      id: 'line-1',
      type: 'line-chart',
      title: 'Revenue Trend',
      config: { smooth: 'true' },
      dataBinding: {
        datasetRef: 'sales',
        fields: [
          { role: 'x-axis', fieldRef: 'month' },
          { role: 'y-axis', fieldRef: 'revenue', aggregation: 'sum' },
          { role: 'series', fieldRef: 'region' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.datasetRef).toBe('sales');
    expect(rp.xAxisField).toBe('month');
    expect(rp.yAxisField).toBe('revenue');
    expect(rp.seriesField).toBe('region');
    expect(rp.aggregation).toBe('sum');
    expect(rp.smooth).toBe('true');
  });

  it('bar-chart with dataBinding', () => {
    const dash = makeCanonical({
      id: 'bar-1',
      type: 'bar-chart',
      title: 'Sales',
      config: { orientation: 'horizontal', stacked: 'true' },
      dataBinding: {
        datasetRef: 'ds',
        fields: [
          { role: 'x-axis', fieldRef: 'category' },
          { role: 'y-axis', fieldRef: 'amount' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.xAxisField).toBe('category');
    expect(rp.yAxisField).toBe('amount');
    expect(rp.orientation).toBe('horizontal');
  });

  it('pie-chart with dataBinding', () => {
    const dash = makeCanonical({
      id: 'pie-1',
      type: 'pie-chart',
      title: 'Share',
      config: { variant: 'donut' },
      dataBinding: {
        datasetRef: 'ds',
        fields: [
          { role: 'category', fieldRef: 'region' },
          { role: 'value', fieldRef: 'sales' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.categoryField).toBe('region');
    expect(rp.valueField).toBe('sales');
    expect(rp.variant).toBe('donut');
  });

  it('scatter-chart with size + colorGroup', () => {
    const dash = makeCanonical({
      id: 'scatter-1',
      type: 'scatter-chart',
      title: 'Scatter',
      config: {},
      dataBinding: {
        datasetRef: 'ds',
        fields: [
          { role: 'x-axis', fieldRef: 'x' },
          { role: 'y-axis', fieldRef: 'y' },
          { role: 'size', fieldRef: 's' },
          { role: 'color-group', fieldRef: 'c' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.xAxisField).toBe('x');
    expect(rp.yAxisField).toBe('y');
    expect(rp.sizeField).toBe('s');
    expect(rp.colorGroupField).toBe('c');
  });

  it('combo-chart with bar-y + line-y', () => {
    const dash = makeCanonical({
      id: 'combo-1',
      type: 'combo-chart',
      title: 'Combo',
      config: {},
      dataBinding: {
        datasetRef: 'ds',
        fields: [
          { role: 'x-axis', fieldRef: 'month' },
          { role: 'bar-y', fieldRef: 'revenue' },
          { role: 'line-y', fieldRef: 'margin' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.xAxisField).toBe('month');
    expect(rp.barField).toBe('revenue');
    expect(rp.lineField).toBe('margin');
  });

  it('heatmap with x/y/value', () => {
    const dash = makeCanonical({
      id: 'heat-1',
      type: 'heatmap',
      title: 'Heat',
      config: {},
      dataBinding: {
        datasetRef: 'ds',
        fields: [
          { role: 'x-axis', fieldRef: 'hour' },
          { role: 'y-axis', fieldRef: 'day' },
          { role: 'value', fieldRef: 'count' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.xAxisField).toBe('hour');
    expect(rp.yAxisField).toBe('day');
    expect(rp.valueField).toBe('count');
  });

  it('treemap with name + value + parent', () => {
    const dash = makeCanonical({
      id: 'tree-1',
      type: 'treemap',
      title: 'Tree',
      config: {},
      dataBinding: {
        datasetRef: 'ds',
        fields: [
          { role: 'name', fieldRef: 'category' },
          { role: 'value', fieldRef: 'amount' },
          { role: 'parent', fieldRef: 'group' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.nameField).toBe('category');
    expect(rp.valueField).toBe('amount');
    expect(rp.parentField).toBe('group');
  });

  it('sankey with source + target + value', () => {
    const dash = makeCanonical({
      id: 'sankey-1',
      type: 'sankey',
      title: 'Flow',
      config: {},
      dataBinding: {
        datasetRef: 'ds',
        fields: [
          { role: 'source', fieldRef: 'from' },
          { role: 'target', fieldRef: 'to' },
          { role: 'value', fieldRef: 'flow' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.sourceField).toBe('from');
    expect(rp.targetField).toBe('to');
    expect(rp.valueField).toBe('flow');
  });

  it('kpi-card with value + comparison + subtitle', () => {
    const dash = makeCanonical({
      id: 'kpi-1',
      type: 'kpi-card',
      title: 'KPI',
      config: { prefix: '$', subtitleField: 'period' },
      dataBinding: {
        datasetRef: 'ds',
        fields: [
          { role: 'value', fieldRef: 'revenue' },
          { role: 'comparison', fieldRef: 'prev' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.valueField).toBe('revenue');
    expect(rp.comparisonField).toBe('prev');
    expect(rp.prefix).toBe('$');
    expect(rp.subtitleField).toBe('period');
  });

  it('alerts with all 4 field bindings', () => {
    const dash = makeCanonical({
      id: 'alerts-1',
      type: 'alerts',
      title: 'Alerts',
      config: {
        titleField: 'alert_title',
        messageField: 'body',
        severityField: 'level',
        timestampField: 'created',
        layout: 'stack',
        maxItems: 3,
      },
      dataBinding: {
        datasetRef: 'ds-alerts',
        fields: [
          { role: 'alert-title', fieldRef: 'alert_title' },
          { role: 'alert-message', fieldRef: 'body' },
          { role: 'alert-severity', fieldRef: 'level' },
          { role: 'alert-timestamp', fieldRef: 'created' },
        ],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.datasetRef).toBe('ds-alerts');
    expect(rp.titleField).toBe('alert_title');
    expect(rp.messageField).toBe('body');
    expect(rp.severityField).toBe('level');
    expect(rp.timestampField).toBe('created');
    expect(rp.layout).toBe('stack');
  });

  it('gauge with value field', () => {
    const dash = makeCanonical({
      id: 'gauge-1',
      type: 'gauge',
      title: 'Gauge',
      config: { minValue: 0, maxValue: 100 },
      dataBinding: {
        datasetRef: 'ds',
        fields: [{ role: 'value', fieldRef: 'completion' }],
      },
    });

    const puck = canonicalToPuck(dash);
    const rp = puck.content![0].props;
    expect(rp.valueField).toBe('completion');
    expect(rp.minValue).toBe(0);
    expect(rp.maxValue).toBe(100);
  });
});

// ─── Demo dashboard round-trip (inline fixtures) ────────────

describe('demo dashboard fixtures produce populated Puck props', () => {
  /**
   * Multi-widget dashboard fixture simulating the dev-app demo-dashboard
   * with a mix of chart types using proper dataBinding.
   */
  const demoDashboard: DashboardDefinition = {
    schemaVersion: '0.2.0',
    id: 'demo-sales',
    title: 'Sales Dashboard',
    pages: [
      {
        id: 'page-overview',
        title: 'Overview',
        rootNodeId: 'root',
        layout: {
          root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
          'grid-main': {
            id: 'grid-main',
            type: 'grid',
            parentId: 'root',
            meta: { columns: 12 },
            children: [
              'layout-alerts-1',
              'layout-kpi-1',
              'layout-kpi-2',
              'layout-line-1',
              'layout-bar-1',
              'layout-pie-1',
              'layout-scatter-1',
              'layout-combo-1',
              'layout-sankey-1',
              'layout-treemap-1',
              'layout-heatmap-1',
              'layout-gauge-1',
            ],
          },
          'layout-alerts-1': {
            id: 'layout-alerts-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'alerts-1', width: 12 },
          },
          'layout-kpi-1': {
            id: 'layout-kpi-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'kpi-1', width: 4 },
          },
          'layout-kpi-2': {
            id: 'layout-kpi-2',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'kpi-2', width: 4 },
          },
          'layout-line-1': {
            id: 'layout-line-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'line-1', width: 8 },
          },
          'layout-bar-1': {
            id: 'layout-bar-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'bar-1', width: 4 },
          },
          'layout-pie-1': {
            id: 'layout-pie-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'pie-1', width: 6 },
          },
          'layout-scatter-1': {
            id: 'layout-scatter-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'scatter-1', width: 6 },
          },
          'layout-combo-1': {
            id: 'layout-combo-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'combo-1', width: 6 },
          },
          'layout-sankey-1': {
            id: 'layout-sankey-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'sankey-1', width: 6 },
          },
          'layout-treemap-1': {
            id: 'layout-treemap-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'treemap-1', width: 6 },
          },
          'layout-heatmap-1': {
            id: 'layout-heatmap-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'heatmap-1', width: 6 },
          },
          'layout-gauge-1': {
            id: 'layout-gauge-1',
            type: 'widget',
            children: [],
            parentId: 'grid-main',
            meta: { widgetRef: 'gauge-1', width: 4 },
          },
        },
        widgets: [
          {
            id: 'alerts-1',
            type: 'alerts',
            title: 'Ops Alerts',
            config: {
              titleField: 'alert_title',
              messageField: 'alert_body',
              severityField: 'level',
              timestampField: 'created_at',
              layout: 'wrap',
              maxItems: 3,
            },
            dataBinding: {
              datasetRef: 'ds-alerts',
              fields: [
                { role: 'alert-title', fieldRef: 'alert_title' },
                { role: 'alert-message', fieldRef: 'alert_body' },
                { role: 'alert-severity', fieldRef: 'level' },
                { role: 'alert-timestamp', fieldRef: 'created_at' },
              ],
            },
          },
          {
            id: 'kpi-1',
            type: 'kpi-card',
            title: 'Revenue',
            config: { prefix: '$' },
            dataBinding: {
              datasetRef: 'ds',
              fields: [
                { role: 'value', fieldRef: 'revenue' },
                { role: 'comparison', fieldRef: 'prev' },
              ],
            },
          },
          {
            id: 'kpi-2',
            type: 'kpi-card',
            title: 'Orders',
            config: {},
            dataBinding: { datasetRef: 'ds', fields: [{ role: 'value', fieldRef: 'orders' }] },
          },
          {
            id: 'line-1',
            type: 'line-chart',
            title: 'Revenue Trend',
            config: { smooth: 'true' },
            dataBinding: {
              datasetRef: 'ds',
              fields: [
                { role: 'x-axis', fieldRef: 'month' },
                { role: 'y-axis', fieldRef: 'revenue' },
              ],
            },
          },
          {
            id: 'bar-1',
            type: 'bar-chart',
            title: 'Region Sales',
            config: { orientation: 'horizontal' },
            dataBinding: {
              datasetRef: 'ds',
              fields: [
                { role: 'x-axis', fieldRef: 'region' },
                { role: 'y-axis', fieldRef: 'revenue' },
              ],
            },
          },
          {
            id: 'pie-1',
            type: 'pie-chart',
            title: 'Region Share',
            config: { variant: 'donut' },
            dataBinding: {
              datasetRef: 'ds',
              fields: [
                { role: 'category', fieldRef: 'region' },
                { role: 'value', fieldRef: 'revenue' },
              ],
            },
          },
          {
            id: 'scatter-1',
            type: 'scatter-chart',
            title: 'Scatter',
            config: {},
            dataBinding: {
              datasetRef: 'ds',
              fields: [
                { role: 'x-axis', fieldRef: 'qty' },
                { role: 'y-axis', fieldRef: 'amt' },
                { role: 'size', fieldRef: 'profit' },
              ],
            },
          },
          {
            id: 'combo-1',
            type: 'combo-chart',
            title: 'Rev vs Margin',
            config: {},
            dataBinding: {
              datasetRef: 'ds',
              fields: [
                { role: 'x-axis', fieldRef: 'month' },
                { role: 'bar-y', fieldRef: 'revenue' },
                { role: 'line-y', fieldRef: 'margin' },
              ],
            },
          },
          {
            id: 'sankey-1',
            type: 'sankey',
            title: 'Traffic Flow',
            config: {},
            dataBinding: {
              datasetRef: 'ds',
              fields: [
                { role: 'source', fieldRef: 'src' },
                { role: 'target', fieldRef: 'dst' },
                { role: 'value', fieldRef: 'visits' },
              ],
            },
          },
          {
            id: 'treemap-1',
            type: 'treemap',
            title: 'Expenses',
            config: {},
            dataBinding: {
              datasetRef: 'ds',
              fields: [
                { role: 'name', fieldRef: 'cat' },
                { role: 'value', fieldRef: 'amt' },
              ],
            },
          },
          {
            id: 'heatmap-1',
            type: 'heatmap',
            title: 'Sales Grid',
            config: {},
            dataBinding: {
              datasetRef: 'ds',
              fields: [
                { role: 'x-axis', fieldRef: 'hour' },
                { role: 'y-axis', fieldRef: 'day' },
                { role: 'value', fieldRef: 'sales' },
              ],
            },
          },
          {
            id: 'gauge-1',
            type: 'gauge',
            title: 'Achievement',
            config: { minValue: 0, maxValue: 100 },
            dataBinding: { datasetRef: 'ds', fields: [{ role: 'value', fieldRef: 'pct' }] },
          },
        ],
      },
    ],
  };

  it('all widgets have field-ref props populated after canonicalToPuck', () => {
    const puck = canonicalToPuck(demoDashboard, 0);
    const content = puck.content!;

    const findByType = (type: string) => content.find((c) => c.type === type);

    // Alerts
    const alerts = findByType('AlertsWidgetBlock');
    expect(alerts).toBeDefined();
    expect(alerts!.props.datasetRef).toBe('ds-alerts');
    expect(alerts!.props.titleField).toBe('alert_title');
    expect(alerts!.props.messageField).toBe('alert_body');
    expect(alerts!.props.severityField).toBe('level');
    expect(alerts!.props.timestampField).toBe('created_at');

    // KPIs
    const kpis = content.filter((c) => c.type === 'KPICard');
    expect(kpis).toHaveLength(2);
    for (const k of kpis) {
      expect(k.props.valueField).toBeTruthy();
      expect(k.props.datasetRef).toBe('ds');
    }
    expect(kpis[0].props.comparisonField).toBe('prev');

    // Line chart
    const line = findByType('LineChart');
    expect(line).toBeDefined();
    expect(line!.props.xAxisField).toBe('month');
    expect(line!.props.yAxisField).toBe('revenue');
    expect(line!.props.smooth).toBe('true');

    // Bar chart
    const bar = findByType('BarChart');
    expect(bar).toBeDefined();
    expect(bar!.props.xAxisField).toBe('region');
    expect(bar!.props.yAxisField).toBe('revenue');

    // Pie chart
    const pie = findByType('PieChart');
    expect(pie).toBeDefined();
    expect(pie!.props.categoryField).toBe('region');
    expect(pie!.props.valueField).toBe('revenue');

    // Scatter chart
    const scatter = findByType('ScatterChart');
    expect(scatter).toBeDefined();
    expect(scatter!.props.xAxisField).toBe('qty');
    expect(scatter!.props.yAxisField).toBe('amt');
    expect(scatter!.props.sizeField).toBe('profit');

    // Combo chart
    const combo = findByType('ComboChart');
    expect(combo).toBeDefined();
    expect(combo!.props.xAxisField).toBe('month');
    expect(combo!.props.barField).toBe('revenue');
    expect(combo!.props.lineField).toBe('margin');

    // Sankey
    const sankey = findByType('SankeyChart');
    expect(sankey).toBeDefined();
    expect(sankey!.props.sourceField).toBe('src');
    expect(sankey!.props.targetField).toBe('dst');
    expect(sankey!.props.valueField).toBe('visits');

    // Treemap
    const treemap = findByType('TreemapChart');
    expect(treemap).toBeDefined();
    expect(treemap!.props.nameField).toBe('cat');
    expect(treemap!.props.valueField).toBe('amt');

    // Heatmap
    const heatmap = findByType('HeatmapChart');
    expect(heatmap).toBeDefined();
    expect(heatmap!.props.xAxisField).toBe('hour');
    expect(heatmap!.props.yAxisField).toBe('day');
    expect(heatmap!.props.valueField).toBe('sales');

    // Gauge
    const gauge = findByType('GaugeChart');
    expect(gauge).toBeDefined();
    expect(gauge!.props.valueField).toBe('pct');
    expect(gauge!.props.minValue).toBe(0);
    expect(gauge!.props.maxValue).toBe(100);
  });
});

// ─── Export→Import round-trip ────────────────────────────────

describe('export→import round-trip: canonical → JSON → canonical → Puck', () => {
  it('JSON serialization preserves all dataBinding fields', () => {
    const original: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'export-test',
      title: 'Export Test',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          rootNodeId: 'root',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: ['layout-combo-1', 'layout-kpi-1'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'layout-combo-1': {
              id: 'layout-combo-1',
              type: 'widget',
              children: [],
              parentId: 'grid-main',
              meta: { widgetRef: 'combo-1', width: 8 },
            },
            'layout-kpi-1': {
              id: 'layout-kpi-1',
              type: 'widget',
              children: [],
              parentId: 'grid-main',
              meta: { widgetRef: 'kpi-1', width: 4 },
            },
          },
          widgets: [
            {
              id: 'combo-1',
              type: 'combo-chart',
              title: 'Rev vs Margin',
              config: {},
              dataBinding: {
                datasetRef: 'ds',
                fields: [
                  { role: 'x-axis', fieldRef: 'month' },
                  { role: 'bar-y', fieldRef: 'revenue' },
                  { role: 'line-y', fieldRef: 'margin' },
                ],
              },
            },
            {
              id: 'kpi-1',
              type: 'kpi-card',
              title: 'Revenue',
              config: { prefix: '$' },
              dataBinding: {
                datasetRef: 'ds',
                fields: [
                  { role: 'value', fieldRef: 'revenue' },
                  { role: 'comparison', fieldRef: 'prev_revenue' },
                ],
              },
            },
          ],
        },
      ],
    };

    // Simulate export
    const json = JSON.stringify(original);

    // Simulate import
    const imported: DashboardDefinition = JSON.parse(json);

    // Convert to Puck
    const puck = canonicalToPuck(imported);
    const combo = puck.content!.find((c) => c.type === 'ComboChart');
    const kpi = puck.content!.find((c) => c.type === 'KPICard');

    expect(combo).toBeDefined();
    expect(combo!.props.xAxisField).toBe('month');
    expect(combo!.props.barField).toBe('revenue');
    expect(combo!.props.lineField).toBe('margin');

    expect(kpi).toBeDefined();
    expect(kpi!.props.valueField).toBe('revenue');
    expect(kpi!.props.comparisonField).toBe('prev_revenue');
    expect(kpi!.props.prefix).toBe('$');
  });

  it('full cycle: Puck → canonical → JSON → parse → Puck', () => {
    const original = makePuckData('SankeyChart', {
      datasetRef: 'ds',
      sourceField: 'from_node',
      targetField: 'to_node',
      valueField: 'weight',
    });

    const canonical = puckToCanonical(original);
    const json = JSON.stringify(canonical);
    const imported: DashboardDefinition = JSON.parse(json);
    const restored = canonicalToPuck(imported);

    const rp = restored.content![0].props;
    expect(rp.sourceField).toBe('from_node');
    expect(rp.targetField).toBe('to_node');
    expect(rp.valueField).toBe('weight');
    expect(rp.datasetRef).toBe('ds');
  });
});
