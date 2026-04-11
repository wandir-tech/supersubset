/**
 * Comprehensive adapter tests: all chart types through round-trip conversion.
 * Tests puckToCanonical and canonicalToPuck for every widget type.
 */
import { describe, it, expect } from 'vitest';
import type { Data } from '@puckeditor/core';
import type { DashboardDefinition } from '@supersubset/schema';
import { puckToCanonical, canonicalToPuck } from '../src/adapters/puck-canonical';
import {
  PUCK_NAME_TO_WIDGET_TYPE,
  WIDGET_TYPE_TO_PUCK_NAME,
  CHART_BLOCK_NAMES,
} from '../src/blocks/charts';

// ─── Test data for every chart type ──────────────────────────

interface ChartTestCase {
  puckName: string;
  widgetType: string;
  props: Record<string, unknown>;
  expectedFields: Array<{ role: string; fieldRef: string }>;
  configKeys: string[];
}

const CHART_TEST_CASES: ChartTestCase[] = [
  {
    puckName: 'LineChart',
    widgetType: 'line-chart',
    props: {
      id: 'line-1', title: 'Revenue Trend', datasetRef: 'sales',
      xAxisField: 'month', yAxisField: 'revenue', seriesField: 'region',
      aggregation: 'sum', smooth: 'true',
    },
    expectedFields: [{ role: 'x-axis', fieldRef: 'month' }, { role: 'y-axis', fieldRef: 'revenue' }, { role: 'series', fieldRef: 'region' }],
    configKeys: ['smooth'],
  },
  {
    puckName: 'BarChart',
    widgetType: 'bar-chart',
    props: {
      id: 'bar-1', title: 'Sales', datasetRef: 'sales',
      xAxisField: 'category', yAxisField: 'amount', seriesField: '',
      aggregation: 'avg', orientation: 'horizontal', stacked: 'true',
    },
    expectedFields: [{ role: 'x-axis', fieldRef: 'category' }, { role: 'y-axis', fieldRef: 'amount' }],
    configKeys: ['orientation', 'stacked'],
  },
  {
    puckName: 'PieChart',
    widgetType: 'pie-chart',
    props: {
      id: 'pie-1', title: 'Share', datasetRef: 'ds',
      categoryField: 'category', valueField: 'value', aggregation: 'none', variant: 'donut',
    },
    expectedFields: [{ role: 'category', fieldRef: 'category' }, { role: 'value', fieldRef: 'value' }],
    configKeys: ['variant'],
  },
  {
    puckName: 'ScatterChart',
    widgetType: 'scatter-chart',
    props: {
      id: 'scatter-1', title: 'Scatter', datasetRef: 'ds',
      xAxisField: 'x', yAxisField: 'y', sizeField: 'size', colorGroupField: 'group',
    },
    expectedFields: [
      { role: 'x-axis', fieldRef: 'x' }, { role: 'y-axis', fieldRef: 'y' },
      { role: 'size', fieldRef: 'size' }, { role: 'color-group', fieldRef: 'group' },
    ],
    configKeys: [],
  },
  {
    puckName: 'AreaChart',
    widgetType: 'area-chart',
    props: {
      id: 'area-1', title: 'Area', datasetRef: 'ds',
      xAxisField: 'month', yAxisField: 'val', seriesField: '', aggregation: 'sum', stacked: 'true',
    },
    expectedFields: [{ role: 'x-axis', fieldRef: 'month' }, { role: 'y-axis', fieldRef: 'val' }],
    configKeys: ['stacked'],
  },
  {
    puckName: 'ComboChart',
    widgetType: 'combo-chart',
    props: {
      id: 'combo-1', title: 'Combo', datasetRef: 'ds',
      xAxisField: 'month', barField: 'revenue', lineField: 'orders', aggregation: 'none',
    },
    expectedFields: [{ role: 'x-axis', fieldRef: 'month' }, { role: 'bar-y', fieldRef: 'revenue' }, { role: 'line-y', fieldRef: 'orders' }],
    configKeys: [],
  },
  {
    puckName: 'HeatmapChart',
    widgetType: 'heatmap',
    props: {
      id: 'heat-1', title: 'Heatmap', datasetRef: 'ds',
      xAxisField: 'x', yAxisField: 'y', valueField: 'temp',
    },
    expectedFields: [{ role: 'x-axis', fieldRef: 'x' }, { role: 'y-axis', fieldRef: 'y' }, { role: 'value', fieldRef: 'temp' }],
    configKeys: [],
  },
  {
    puckName: 'RadarChart',
    widgetType: 'radar-chart',
    props: {
      id: 'radar-1', title: 'Radar', datasetRef: 'ds',
      categoryField: 'metric', valueField: 'score', seriesField: 'team',
    },
    expectedFields: [{ role: 'category', fieldRef: 'metric' }, { role: 'value', fieldRef: 'score' }, { role: 'series', fieldRef: 'team' }],
    configKeys: [],
  },
  {
    puckName: 'FunnelChart',
    widgetType: 'funnel-chart',
    props: {
      id: 'funnel-1', title: 'Funnel', datasetRef: 'ds',
      categoryField: 'stage', valueField: 'count',
    },
    expectedFields: [{ role: 'category', fieldRef: 'stage' }, { role: 'value', fieldRef: 'count' }],
    configKeys: [],
  },
  {
    puckName: 'TreemapChart',
    widgetType: 'treemap',
    props: {
      id: 'tree-1', title: 'Treemap', datasetRef: 'ds',
      nameField: 'name', valueField: 'size', parentField: 'parent',
    },
    expectedFields: [{ role: 'value', fieldRef: 'size' }, { role: 'name', fieldRef: 'name' }, { role: 'parent', fieldRef: 'parent' }],
    configKeys: [],
  },
  {
    puckName: 'SankeyChart',
    widgetType: 'sankey',
    props: {
      id: 'sankey-1', title: 'Sankey', datasetRef: 'ds',
      sourceField: 'from', targetField: 'to', valueField: 'flow',
    },
    expectedFields: [{ role: 'value', fieldRef: 'flow' }, { role: 'source', fieldRef: 'from' }, { role: 'target', fieldRef: 'to' }],
    configKeys: [],
  },
  {
    puckName: 'WaterfallChart',
    widgetType: 'waterfall',
    props: {
      id: 'waterfall-1', title: 'Waterfall', datasetRef: 'ds',
      categoryField: 'item', valueField: 'amount',
    },
    expectedFields: [{ role: 'category', fieldRef: 'item' }, { role: 'value', fieldRef: 'amount' }],
    configKeys: [],
  },
  {
    puckName: 'BoxPlotChart',
    widgetType: 'box-plot',
    props: {
      id: 'box-1', title: 'Box Plot', datasetRef: 'ds',
      categoryField: 'department', valueField: 'salary',
    },
    expectedFields: [{ role: 'category', fieldRef: 'department' }, { role: 'value', fieldRef: 'salary' }],
    configKeys: [],
  },
  {
    puckName: 'GaugeChart',
    widgetType: 'gauge',
    props: {
      id: 'gauge-1', title: 'Score', datasetRef: 'ds',
      valueField: 'metric', minValue: 0, maxValue: 100,
    },
    expectedFields: [{ role: 'value', fieldRef: 'metric' }],
    configKeys: ['minValue', 'maxValue'],
  },
  {
    puckName: 'Table',
    widgetType: 'table',
    props: {
      id: 'table-1', title: 'Data Table', datasetRef: 'ds',
      pageSize: 50, striped: 'true',
    },
    expectedFields: [],
    configKeys: ['pageSize', 'striped'],
  },
  {
    puckName: 'KPICard',
    widgetType: 'kpi-card',
    props: {
      id: 'kpi-1', title: 'Revenue', datasetRef: 'ds',
      valueField: 'revenue', aggregation: 'sum',
      prefix: '$', suffix: 'M', comparisonField: 'prev_revenue',
    },
    expectedFields: [{ role: 'value', fieldRef: 'revenue' }, { role: 'comparison', fieldRef: 'prev_revenue' }],
    configKeys: ['prefix', 'suffix'],
  },
];

// ─── puckToCanonical — every chart type ──────────────────────

describe('puckToCanonical — all chart types', () => {
  it.each(CHART_TEST_CASES)(
    '$puckName converts to widget type $widgetType',
    ({ puckName, widgetType, props, expectedFields, configKeys }) => {
      const puckData: Data = {
        root: { props: { title: 'Test Dashboard' } },
        content: [{ type: puckName, props }],
      };

      const result = puckToCanonical(puckData);
      const page = result.pages[0];

      expect(page.widgets).toHaveLength(1);
      const widget = page.widgets[0];
      expect(widget.type).toBe(widgetType);
      expect(widget.title).toBe(props.title);

      // Verify field bindings
      if (expectedFields.length > 0) {
        expect(widget.dataBinding).toBeDefined();
        expect(widget.dataBinding!.datasetRef).toBe(props.datasetRef);
        for (const expected of expectedFields) {
          const found = widget.dataBinding!.fields.find((f) => f.role === expected.role);
          expect(found, `Missing field with role '${expected.role}'`).toBeDefined();
          expect(found!.fieldRef).toBe(expected.fieldRef);
        }
      }

      // Verify config keys
      for (const key of configKeys) {
        expect(widget.config[key]).toBeDefined();
      }

      // Verify layout entries exist
      expect(page.layout[`layout-${props.id}`]).toBeDefined();
      expect(page.layout[`layout-${props.id}`].type).toBe('widget');
    }
  );
});

// ─── Round-trip: puck → canonical → puck for all types ───────

describe('Round-trip conversion — all chart types', () => {
  it.each(CHART_TEST_CASES)(
    '$puckName survives puck→canonical→puck round-trip',
    ({ puckName, props, expectedFields }) => {
      const original: Data = {
        root: { props: { title: 'Round-trip Test' } },
        content: [{ type: puckName, props }],
      };

      const canonical = puckToCanonical(original);
      const restored = canonicalToPuck(canonical);

      expect(restored.content).toHaveLength(1);
      expect(restored.content![0].type).toBe(puckName);
      expect(restored.content![0].props.title).toBe(props.title);

      // datasetRef survives round-trip only when there are field bindings
      // (Table has no field bindings, so datasetRef is stored in dataBinding
      // which requires at least one field to be created)
      if (props.datasetRef && expectedFields.length > 0) {
        expect(restored.content![0].props.datasetRef).toBe(props.datasetRef);
      }
    }
  );
});

// ─── Multi-chart dashboards ──────────────────────────────────

describe('Multi-chart dashboard conversion', () => {
  it('handles all 16 charts in a single dashboard', () => {
    const content = CHART_TEST_CASES.map((tc) => ({
      type: tc.puckName,
      props: tc.props,
    }));

    const puckData: Data = {
      root: { props: { title: 'Full Dashboard' } },
      content,
    };

    const result = puckToCanonical(puckData);
    expect(result.pages[0].widgets).toHaveLength(16);
    expect(result.title).toBe('Full Dashboard');

    // Each widget should have a unique layout entry
    const layoutNodeIds = Object.keys(result.pages[0].layout);
    // root + grid-main + 16 widget layout nodes = 18
    expect(layoutNodeIds).toHaveLength(18);
  });

  it('preserves ordering with mixed charts and content', () => {
    const puckData: Data = {
      root: { props: { title: 'Mixed' } },
      content: [
        { type: 'HeaderBlock', props: { id: 'h1', text: 'Section 1', size: 'large', align: 'left' } },
        { type: 'LineChart', props: { id: 'lc1', title: 'Sales', datasetRef: 'ds', xAxisField: 'month', yAxisField: 'val', seriesField: '', aggregation: 'none', smooth: 'false' } },
        { type: 'DividerBlock', props: { id: 'd1', color: '#ccc', thickness: 1, margin: 16 } },
        { type: 'BarChart', props: { id: 'bc1', title: 'Revenue', datasetRef: 'ds', xAxisField: 'cat', yAxisField: 'rev', seriesField: '', aggregation: 'sum', orientation: 'vertical', stacked: 'false' } },
      ],
    };

    const result = puckToCanonical(puckData);
    // 2 widgets (LineChart + BarChart), 2 content blocks (Header + Divider as layout nodes)
    expect(result.pages[0].widgets).toHaveLength(2);
    expect(result.pages[0].widgets[0].type).toBe('line-chart');
    expect(result.pages[0].widgets[1].type).toBe('bar-chart');

    // Layout should have header and divider nodes
    expect(result.pages[0].layout['layout-h1']).toBeDefined();
    expect(result.pages[0].layout['layout-h1'].type).toBe('header');
    expect(result.pages[0].layout['layout-d1']).toBeDefined();
    expect(result.pages[0].layout['layout-d1'].type).toBe('divider');
  });
});

// ─── Edge cases ──────────────────────────────────────────────

describe('Adapter edge cases', () => {
  it('handles empty dashboard', () => {
    const puckData: Data = { root: { props: {} }, content: [] };
    const result = puckToCanonical(puckData);
    expect(result.pages[0].widgets).toHaveLength(0);
    expect(result.pages[0].layout['root']).toBeDefined();
    expect(result.pages[0].layout['grid-main']).toBeDefined();
  });

  it('ignores unknown component types', () => {
    const puckData: Data = {
      root: { props: { title: 'Test' } },
      content: [
        { type: 'UnknownWidget', props: { id: 'u1' } },
        { type: 'LineChart', props: { id: 'lc1', title: 'Line', datasetRef: 'ds', xAxisField: 'x', yAxisField: 'y', seriesField: '', aggregation: 'none', smooth: 'false' } },
      ],
    };

    const result = puckToCanonical(puckData);
    // Only the LineChart should produce a widget
    expect(result.pages[0].widgets).toHaveLength(1);
    expect(result.pages[0].widgets[0].type).toBe('line-chart');
  });

  it('handles charts without datasetRef (no data binding)', () => {
    const puckData: Data = {
      root: { props: { title: 'Test' } },
      content: [
        { type: 'LineChart', props: { id: 'lc1', title: 'Empty', datasetRef: '', xAxisField: '', yAxisField: '', seriesField: '', aggregation: 'none', smooth: 'false' } },
      ],
    };

    const result = puckToCanonical(puckData);
    expect(result.pages[0].widgets).toHaveLength(1);
    expect(result.pages[0].widgets[0].dataBinding).toBeUndefined();
  });

  it('handles aggregation=none (should not set aggregation on fields)', () => {
    const puckData: Data = {
      root: { props: { title: 'Test' } },
      content: [
        { type: 'BarChart', props: { id: 'bar1', title: 'Bar', datasetRef: 'ds', xAxisField: 'cat', yAxisField: 'val', seriesField: '', aggregation: 'none', orientation: 'vertical', stacked: 'false' } },
      ],
    };

    const result = puckToCanonical(puckData);
    const fields = result.pages[0].widgets[0].dataBinding!.fields;
    for (const field of fields) {
      expect(field.aggregation).toBeUndefined();
    }
  });

  it('sets aggregation on fields when not "none"', () => {
    const puckData: Data = {
      root: { props: { title: 'Test' } },
      content: [
        { type: 'BarChart', props: { id: 'bar1', title: 'Bar', datasetRef: 'ds', xAxisField: 'cat', yAxisField: 'val', seriesField: '', aggregation: 'sum', orientation: 'vertical', stacked: 'false' } },
      ],
    };

    const result = puckToCanonical(puckData);
    const fields = result.pages[0].widgets[0].dataBinding!.fields;
    const hasAggregation = fields.some((f) => f.aggregation === 'sum');
    expect(hasAggregation).toBe(true);
  });

  it('canonicalToPuck handles empty pages gracefully', () => {
    const dashboard: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test',
      title: 'Empty',
      pages: [],
    };

    const result = canonicalToPuck(dashboard, { pageIndex: 0 });
    expect(result.content).toHaveLength(0);
    expect(result.root?.props ?? {}).toEqual({});
  });

  it('canonicalToPuck handles missing root node gracefully', () => {
    const dashboard: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test',
      title: 'No Root',
      pages: [{
        id: 'p1',
        title: 'Page',
        layout: {},
        rootNodeId: 'missing',
        widgets: [],
      }],
    };

    const result = canonicalToPuck(dashboard);
    expect(result.content).toHaveLength(0);
  });
});

// ─── Content block adapter tests ─────────────────────────────

describe('Content block adapter', () => {
  it('converts HeaderBlock to header layout node', () => {
    const puckData: Data = {
      root: { props: { title: 'Test' } },
      content: [{ type: 'HeaderBlock', props: { id: 'h1', text: 'Welcome', size: 'large', align: 'center' } }],
    };

    const result = puckToCanonical(puckData);
    expect(result.pages[0].widgets).toHaveLength(0);
    const headerNode = result.pages[0].layout['layout-h1'];
    expect(headerNode).toBeDefined();
    expect(headerNode.type).toBe('header');
    expect(headerNode.meta.text).toBe('Welcome');
    expect(headerNode.meta.headerSize).toBe('large');
  });

  it('converts DividerBlock to divider layout node', () => {
    const puckData: Data = {
      root: { props: { title: 'Test' } },
      content: [{ type: 'DividerBlock', props: { id: 'd1', color: '#ccc', thickness: 2, margin: 16 } }],
    };

    const result = puckToCanonical(puckData);
    const divNode = result.pages[0].layout['layout-d1'];
    expect(divNode).toBeDefined();
    expect(divNode.type).toBe('divider');
    expect(divNode.meta.color).toBe('#ccc');
    expect(divNode.meta.thickness).toBe(2);
  });

  it('converts SpacerBlock to spacer layout node', () => {
    const puckData: Data = {
      root: { props: { title: 'Test' } },
      content: [{ type: 'SpacerBlock', props: { id: 's1', height: 48 } }],
    };

    const result = puckToCanonical(puckData);
    const spacerNode = result.pages[0].layout['layout-s1'];
    expect(spacerNode).toBeDefined();
    expect(spacerNode.type).toBe('spacer');
    expect(spacerNode.meta.height).toBe(48);
  });

  it('converts MarkdownBlock to markdown layout node', () => {
    const puckData: Data = {
      root: { props: { title: 'Test' } },
      content: [{ type: 'MarkdownBlock', props: { id: 'm1', content: '# Hello World' } }],
    };

    const result = puckToCanonical(puckData);
    const mdNode = result.pages[0].layout['layout-m1'];
    expect(mdNode).toBeDefined();
    // MarkdownBlock maps to 'markdown' type
    expect(mdNode.meta.text).toBe('# Hello World');
  });

  it('converts FilterBarBlock to filter-bar widget', () => {
    const puckData: Data = {
      root: { props: { title: 'Test' } },
      content: [{ type: 'FilterBarBlock', props: { id: 'fb1', title: 'Filters', scope: 'global', layout: 'horizontal' } }],
    };

    const result = puckToCanonical(puckData);
    // Filter bar is treated as a widget (control)
    expect(result.pages[0].widgets).toHaveLength(1);
    expect(result.pages[0].widgets[0].type).toBe('filter-bar');
  });
});
