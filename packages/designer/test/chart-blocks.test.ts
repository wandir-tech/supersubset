/**
 * Comprehensive tests for all chart block field definitions.
 * Ensures every chart type has correct fields, default props, labels, and render functions.
 */
import { describe, it, expect } from 'vitest';
import {
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  AreaChart,
  ComboChart,
  HeatmapChart,
  RadarChart,
  FunnelChart,
  TreemapChart,
  SankeyChart,
  WaterfallChart,
  BoxPlotChart,
  GaugeChart,
  AlertsWidgetBlock,
  Table,
  KPICard,
  CHART_BLOCK_NAMES,
  PUCK_NAME_TO_WIDGET_TYPE,
  WIDGET_TYPE_TO_PUCK_NAME,
} from '../src/blocks/charts';

const ALL_BLOCKS: Record<string, { block: unknown; widgetType: string }> = {
  LineChart: { block: LineChart, widgetType: 'line-chart' },
  BarChart: { block: BarChart, widgetType: 'bar-chart' },
  PieChart: { block: PieChart, widgetType: 'pie-chart' },
  ScatterChart: { block: ScatterChart, widgetType: 'scatter-chart' },
  AreaChart: { block: AreaChart, widgetType: 'area-chart' },
  ComboChart: { block: ComboChart, widgetType: 'combo-chart' },
  HeatmapChart: { block: HeatmapChart, widgetType: 'heatmap' },
  RadarChart: { block: RadarChart, widgetType: 'radar-chart' },
  FunnelChart: { block: FunnelChart, widgetType: 'funnel-chart' },
  TreemapChart: { block: TreemapChart, widgetType: 'treemap' },
  SankeyChart: { block: SankeyChart, widgetType: 'sankey' },
  WaterfallChart: { block: WaterfallChart, widgetType: 'waterfall' },
  BoxPlotChart: { block: BoxPlotChart, widgetType: 'box-plot' },
  GaugeChart: { block: GaugeChart, widgetType: 'gauge' },
  AlertsWidgetBlock: { block: AlertsWidgetBlock, widgetType: 'alerts' },
  Table: { block: Table, widgetType: 'table' },
  KPICard: { block: KPICard, widgetType: 'kpi-card' },
};

// ─── Universal block properties ──────────────────────────────

describe('Chart blocks — universal properties', () => {
  it.each(CHART_BLOCK_NAMES)('%s has a label', (name) => {
    const block = ALL_BLOCKS[name].block as { label?: string };
    expect(block.label).toBeTypeOf('string');
    expect(block.label!.length).toBeGreaterThan(0);
  });

  it.each(CHART_BLOCK_NAMES)('%s has a render function', (name) => {
    const block = ALL_BLOCKS[name].block as { render?: unknown };
    expect(block.render).toBeTypeOf('function');
  });

  it.each(CHART_BLOCK_NAMES)('%s has fields', (name) => {
    const block = ALL_BLOCKS[name].block as { fields?: Record<string, unknown> };
    expect(block.fields).toBeDefined();
    expect(Object.keys(block.fields!).length).toBeGreaterThan(0);
  });

  it.each(CHART_BLOCK_NAMES)('%s has defaultProps', (name) => {
    const block = ALL_BLOCKS[name].block as { defaultProps?: Record<string, unknown> };
    expect(block.defaultProps).toBeDefined();
  });

  it.each(CHART_BLOCK_NAMES)('%s has a title field', (name) => {
    const block = ALL_BLOCKS[name].block as { fields?: Record<string, { type: string }> };
    expect(block.fields!.title).toBeDefined();
    expect(block.fields!.title.type).toBe('text');
  });

  it.each(CHART_BLOCK_NAMES)('%s has a datasetRef field', (name) => {
    const block = ALL_BLOCKS[name].block as { fields?: Record<string, { type: string }> };
    expect(block.fields!.datasetRef).toBeDefined();
    expect(block.fields!.datasetRef.type).toBe('text');
  });

  it.each(CHART_BLOCK_NAMES)('%s defaultProps includes title', (name) => {
    const block = ALL_BLOCKS[name].block as { defaultProps?: Record<string, unknown> };
    expect(block.defaultProps!.title).toBeTypeOf('string');
    expect((block.defaultProps!.title as string).length).toBeGreaterThan(0);
  });

  it.each(CHART_BLOCK_NAMES)('%s render function produces output', (name) => {
    const block = ALL_BLOCKS[name].block as { render: (props: Record<string, unknown>) => unknown; defaultProps?: Record<string, unknown> };
    const result = block.render({ ...block.defaultProps, puck: { isEditing: false } });
    expect(result).toBeDefined();
  });
});

// ─── XY chart specific fields ────────────────────────────────

const XY_CHARTS = ['LineChart', 'BarChart', 'AreaChart'] as const;

describe('XY chart blocks — specific fields', () => {
  it.each(XY_CHARTS)('%s has xAxisField and yAxisField', (name) => {
    const block = ALL_BLOCKS[name].block as { fields?: Record<string, unknown> };
    expect(block.fields!.xAxisField).toBeDefined();
    expect(block.fields!.yAxisField).toBeDefined();
  });

  it.each(XY_CHARTS)('%s has seriesField', (name) => {
    const block = ALL_BLOCKS[name].block as { fields?: Record<string, unknown> };
    expect(block.fields!.seriesField).toBeDefined();
  });

  it.each(XY_CHARTS)('%s has aggregation', (name) => {
    const block = ALL_BLOCKS[name].block as { fields?: Record<string, { type: string; options?: unknown[] }> };
    expect(block.fields!.aggregation).toBeDefined();
    expect(block.fields!.aggregation.type).toBe('select');
    expect(block.fields!.aggregation.options).toBeDefined();
  });
});

// ─── Category-value chart fields ─────────────────────────────

const CATEGORY_VALUE_CHARTS = ['PieChart', 'FunnelChart'] as const;

describe('Category-value chart blocks', () => {
  it.each(CATEGORY_VALUE_CHARTS)('%s has categoryField and valueField', (name) => {
    const block = ALL_BLOCKS[name].block as { fields?: Record<string, unknown> };
    expect(block.fields!.categoryField).toBeDefined();
    expect(block.fields!.valueField).toBeDefined();
  });
});

// ─── Chart-specific unique fields ────────────────────────────

describe('LineChart — specific fields', () => {
  it('has smooth radio field with Yes/No options', () => {
    const fields = LineChart.fields!;
    const smooth = fields.smooth as { type: string; options: Array<{ value: string }> };
    expect(smooth.type).toBe('radio');
    expect(smooth.options).toHaveLength(2);
    expect(smooth.options.map((o) => o.value)).toEqual(['true', 'false']);
  });
});

describe('BarChart — specific fields', () => {
  it('has orientation radio field', () => {
    const fields = BarChart.fields!;
    const orientation = fields.orientation as { type: string; options: Array<{ value: string }> };
    expect(orientation.type).toBe('radio');
    expect(orientation.options.map((o) => o.value)).toEqual(['vertical', 'horizontal']);
  });

  it('has stacked radio field', () => {
    const fields = BarChart.fields!;
    const stacked = fields.stacked as { type: string; options: Array<{ value: string }> };
    expect(stacked.type).toBe('radio');
    expect(stacked.options.map((o) => o.value)).toEqual(['true', 'false']);
  });
});

describe('PieChart — specific fields', () => {
  it('has variant select field with pie/donut/rose options', () => {
    const fields = PieChart.fields!;
    const variant = fields.variant as { type: string; options: Array<{ value: string }> };
    expect(variant.type).toBe('select');
    expect(variant.options.map((o) => o.value)).toEqual(['pie', 'donut', 'rose']);
  });

  it('default variant is pie', () => {
    expect(PieChart.defaultProps!.variant).toBe('pie');
  });
});

describe('ScatterChart — specific fields', () => {
  it('has sizeField and colorGroupField', () => {
    expect(ScatterChart.fields!.sizeField).toBeDefined();
    expect(ScatterChart.fields!.colorGroupField).toBeDefined();
  });
});

describe('ComboChart — specific fields', () => {
  it('has barField and lineField', () => {
    expect(ComboChart.fields!.barField).toBeDefined();
    expect(ComboChart.fields!.lineField).toBeDefined();
  });
});

describe('HeatmapChart — specific fields', () => {
  it('has xAxisField, yAxisField, and valueField', () => {
    expect(HeatmapChart.fields!.xAxisField).toBeDefined();
    expect(HeatmapChart.fields!.yAxisField).toBeDefined();
    expect(HeatmapChart.fields!.valueField).toBeDefined();
  });
});

describe('RadarChart — specific fields', () => {
  it('has categoryField, valueField, seriesField', () => {
    expect(RadarChart.fields!.categoryField).toBeDefined();
    expect(RadarChart.fields!.valueField).toBeDefined();
    expect(RadarChart.fields!.seriesField).toBeDefined();
  });
});

describe('TreemapChart — specific fields', () => {
  it('has nameField, valueField, parentField', () => {
    expect(TreemapChart.fields!.nameField).toBeDefined();
    expect(TreemapChart.fields!.valueField).toBeDefined();
    expect(TreemapChart.fields!.parentField).toBeDefined();
  });
});

describe('SankeyChart — specific fields', () => {
  it('has sourceField, targetField, valueField', () => {
    expect(SankeyChart.fields!.sourceField).toBeDefined();
    expect(SankeyChart.fields!.targetField).toBeDefined();
    expect(SankeyChart.fields!.valueField).toBeDefined();
  });
});

describe('GaugeChart — specific fields', () => {
  it('has valueField, minValue, maxValue', () => {
    expect(GaugeChart.fields!.valueField).toBeDefined();
    expect(GaugeChart.fields!.minValue).toBeDefined();
    expect(GaugeChart.fields!.maxValue).toBeDefined();
  });

  it('defaults to 0-100 range', () => {
    expect(GaugeChart.defaultProps!.minValue).toBe(0);
    expect(GaugeChart.defaultProps!.maxValue).toBe(100);
  });
});

describe('AlertsWidgetBlock — specific fields', () => {
  it('has data-driven alert field bindings', () => {
    expect(AlertsWidgetBlock.fields!.titleField).toBeDefined();
    expect(AlertsWidgetBlock.fields!.messageField).toBeDefined();
    expect(AlertsWidgetBlock.fields!.severityField).toBeDefined();
    expect(AlertsWidgetBlock.fields!.timestampField).toBeDefined();
  });

  it('defaults to stack layout with timestamps enabled', () => {
    expect(AlertsWidgetBlock.defaultProps!.layout).toBe('stack');
    expect(AlertsWidgetBlock.defaultProps!.showTimestamp).toBe('true');
    expect(AlertsWidgetBlock.defaultProps!.defaultSeverity).toBe('info');
  });

  it('supports stack, wrap, and inline layouts', () => {
    const layout = AlertsWidgetBlock.fields!.layout as { type: string; options: Array<{ value: string }> };
    expect(layout.type).toBe('select');
    expect(layout.options.map((option) => option.value)).toEqual(['stack', 'wrap', 'inline']);
  });
});

describe('Table — specific fields', () => {
  it('has pageSize and striped fields', () => {
    expect(Table.fields!.pageSize).toBeDefined();
    expect(Table.fields!.striped).toBeDefined();
  });

  it('defaults to pageSize=25 and striped=true', () => {
    expect(Table.defaultProps!.pageSize).toBe(25);
    expect(Table.defaultProps!.striped).toBe('true');
  });
});

describe('KPICard — specific fields', () => {
  it('has valueField, aggregation, prefix, suffix, comparisonField', () => {
    expect(KPICard.fields!.valueField).toBeDefined();
    expect(KPICard.fields!.aggregation).toBeDefined();
    expect(KPICard.fields!.prefix).toBeDefined();
    expect(KPICard.fields!.suffix).toBeDefined();
    expect(KPICard.fields!.comparisonField).toBeDefined();
  });
});

// ─── Mapping completeness ────────────────────────────────────

describe('Mapping completeness', () => {
  it('every CHART_BLOCK_NAME has a matching PUCK_NAME_TO_WIDGET_TYPE entry', () => {
    for (const name of CHART_BLOCK_NAMES) {
      expect(PUCK_NAME_TO_WIDGET_TYPE[name]).toBeDefined();
    }
  });

  it('every widget type maps back to a puck name', () => {
    for (const widgetType of Object.values(PUCK_NAME_TO_WIDGET_TYPE)) {
      expect(WIDGET_TYPE_TO_PUCK_NAME[widgetType]).toBeDefined();
    }
  });

  it('round-trip mapping PUCK→WIDGET→PUCK is identity', () => {
    for (const name of CHART_BLOCK_NAMES) {
      const widgetType = PUCK_NAME_TO_WIDGET_TYPE[name];
      expect(WIDGET_TYPE_TO_PUCK_NAME[widgetType]).toBe(name);
    }
  });

  it('all widget types are unique', () => {
    const types = Object.values(PUCK_NAME_TO_WIDGET_TYPE);
    expect(new Set(types).size).toBe(types.length);
  });
});
