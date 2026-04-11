/**
 * Per-chart property tests (Phase 2.A.2–2.A.17).
 *
 * Strategy: Mock BaseChart to capture the ECharts `option` object, then assert
 * that each per-chart config property produces the expected effect on the option.
 * For HTML widgets (Table, KPI), we render directly and inspect DOM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import type { WidgetProps } from '@supersubset/runtime';

// ─── Mock BaseChart to capture ECharts option ────────────────

let capturedOption: Record<string, unknown> | null = null;

vi.mock('../src/base/BaseChart', () => ({
  BaseChart: ({ option }: { option: Record<string, unknown> }) => {
    capturedOption = option;
    return React.createElement('div', { 'data-testid': 'base-chart' });
  },
  echarts: {
    use: vi.fn(),
  },
}));

vi.mock('@supersubset/runtime', () => ({}));

// ─── Imports (after mocks) ───────────────────────────────────

import { LineChartWidget } from '../src/charts/LineChartWidget';
import { BarChartWidget } from '../src/charts/BarChartWidget';
import { PieChartWidget } from '../src/charts/PieChartWidget';
import { AreaChartWidget } from '../src/charts/AreaChartWidget';
import { ScatterChartWidget } from '../src/charts/ScatterChartWidget';
import { ComboChartWidget } from '../src/charts/ComboChartWidget';
import { HeatmapWidget } from '../src/charts/HeatmapWidget';
import { RadarChartWidget } from '../src/charts/RadarChartWidget';
import { FunnelChartWidget } from '../src/charts/FunnelChartWidget';
import { TreemapWidget } from '../src/charts/TreemapWidget';
import { SankeyWidget } from '../src/charts/SankeyWidget';
import { WaterfallWidget } from '../src/charts/WaterfallWidget';
import { BoxPlotWidget } from '../src/charts/BoxPlotWidget';
import { GaugeWidget } from '../src/charts/GaugeWidget';
import { TableWidget } from '../src/charts/TableWidget';
import { KPICardWidget } from '../src/charts/KPICardWidget';

// ─── Helpers ─────────────────────────────────────────────────

function makeProps(overrides: Partial<WidgetProps>): WidgetProps {
  return {
    widgetId: 'test-w',
    widgetType: 'test',
    config: {},
    data: [],
    ...overrides,
  };
}

const sampleTimeData = [
  { month: 'Jan', revenue: 100, orders: 50 },
  { month: 'Feb', revenue: 200, orders: 80 },
  { month: 'Mar', revenue: 150, orders: 60 },
];

const sampleCategoryData = [
  { category: 'A', sales: 100, target: 120 },
  { category: 'B', sales: 200, target: 180 },
  { category: 'C', sales: 150, target: 160 },
];

const samplePieData = [
  { name: 'Alpha', value: 40 },
  { name: 'Beta', value: 35 },
  { name: 'Gamma', value: 25 },
];

const sampleScatterData = [
  { x: 10, y: 20, size: 5, group: 'A' },
  { x: 30, y: 40, size: 10, group: 'B' },
  { x: 50, y: 10, size: 3, group: 'A' },
];

const sampleHeatmapData = [
  { day: 'Mon', hour: '9am', val: 10 },
  { day: 'Mon', hour: '10am', val: 20 },
  { day: 'Tue', hour: '9am', val: 30 },
];

const sampleRadarData = [
  { name: 'Product A', speed: 80, quality: 90, price: 70 },
  { name: 'Product B', speed: 60, quality: 70, price: 85 },
];

const sampleFunnelData = [
  { stage: 'Visit', value: 1000 },
  { stage: 'Signup', value: 600 },
  { stage: 'Purchase', value: 200 },
];

const sampleTreemapData = [
  { name: 'A', value: 100 },
  { name: 'B', value: 80 },
  { name: 'C', value: 60 },
];

const sampleSankeyData = [
  { source: 'A', target: 'B', value: 10 },
  { source: 'A', target: 'C', value: 20 },
  { source: 'B', target: 'C', value: 5 },
];

const sampleWaterfallData = [
  { name: 'Q1', value: 100 },
  { name: 'Q2', value: 50 },
  { name: 'Q3', value: -30 },
  { name: 'Total', value: 120 },
];

const sampleBoxData = [
  { cat: 'A', val: 10 }, { cat: 'A', val: 20 }, { cat: 'A', val: 30 }, { cat: 'A', val: 40 },
  { cat: 'B', val: 15 }, { cat: 'B', val: 25 }, { cat: 'B', val: 35 }, { cat: 'B', val: 45 },
];

function getOption(): Record<string, unknown> {
  expect(capturedOption).not.toBeNull();
  return capturedOption!;
}

function getSeries(idx = 0): Record<string, unknown> {
  const opt = getOption();
  const series = opt.series as Array<Record<string, unknown>>;
  return series[idx];
}

function getAllSeries(): Array<Record<string, unknown>> {
  const opt = getOption();
  return opt.series as Array<Record<string, unknown>>;
}

// ─── LINE CHART ──────────────────────────────────────────────

describe('LineChartWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('smooth=true produces smooth series', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], smooth: true },
      data: sampleTimeData,
    })} />);
    expect(getSeries().smooth).toBe(true);
  });

  it('smooth=false produces non-smooth series', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], smooth: false },
      data: sampleTimeData,
    })} />);
    expect(getSeries().smooth).toBe(false);
  });

  it('showMarkers=false hides symbols', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], showMarkers: false },
      data: sampleTimeData,
    })} />);
    expect(getSeries().showSymbol).toBe(false);
  });

  it('showMarkers=true (default) shows symbols', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'] },
      data: sampleTimeData,
    })} />);
    expect(getSeries().showSymbol).toBe(true);
  });

  it('markerSize sets symbolSize', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], markerSize: 8 },
      data: sampleTimeData,
    })} />);
    expect(getSeries().symbolSize).toBe(8);
  });

  it('step=start produces step interpolation', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], step: 'start' },
      data: sampleTimeData,
    })} />);
    expect(getSeries().step).toBe('start');
  });

  it('step=middle produces step interpolation', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], step: 'middle' },
      data: sampleTimeData,
    })} />);
    expect(getSeries().step).toBe('middle');
  });

  it('connectNulls=true is passed to series', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], connectNulls: true },
      data: sampleTimeData,
    })} />);
    expect(getSeries().connectNulls).toBe(true);
  });

  it('connectNulls defaults to false', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'] },
      data: sampleTimeData,
    })} />);
    expect(getSeries().connectNulls).toBe(false);
  });

  it('area=true produces areaStyle', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], area: true },
      data: sampleTimeData,
    })} />);
    expect(getSeries().areaStyle).toEqual({});
  });

  it('area=false does not produce areaStyle', () => {
    render(<LineChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'] },
      data: sampleTimeData,
    })} />);
    expect(getSeries().areaStyle).toBeUndefined();
  });
});

// ─── BAR CHART ───────────────────────────────────────────────

describe('BarChartWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('barWidth sets bar width on series', () => {
    render(<BarChartWidget {...makeProps({
      config: { xField: 'category', yFields: ['sales'], barWidth: '40%' },
      data: sampleCategoryData,
    })} />);
    expect(getSeries().barWidth).toBe('40%');
  });

  it('barGap sets gap between bars', () => {
    render(<BarChartWidget {...makeProps({
      config: { xField: 'category', yFields: ['sales'], barGap: '10%' },
      data: sampleCategoryData,
    })} />);
    expect(getSeries().barGap).toBe('10%');
  });

  it('borderRadius sets itemStyle.borderRadius', () => {
    render(<BarChartWidget {...makeProps({
      config: { xField: 'category', yFields: ['sales'], borderRadius: 6 },
      data: sampleCategoryData,
    })} />);
    expect((getSeries().itemStyle as Record<string, unknown>)?.borderRadius).toBe(6);
  });

  it('borderRadius=0 does not set itemStyle', () => {
    render(<BarChartWidget {...makeProps({
      config: { xField: 'category', yFields: ['sales'], borderRadius: 0 },
      data: sampleCategoryData,
    })} />);
    expect(getSeries().itemStyle).toBeUndefined();
  });

  it('barMinHeight sets bar minimum height', () => {
    render(<BarChartWidget {...makeProps({
      config: { xField: 'category', yFields: ['sales'], barMinHeight: 5 },
      data: sampleCategoryData,
    })} />);
    expect(getSeries().barMinHeight).toBe(5);
  });

  it('horizontal=true swaps axes', () => {
    render(<BarChartWidget {...makeProps({
      config: { xField: 'category', yFields: ['sales'], horizontal: true },
      data: sampleCategoryData,
    })} />);
    const opt = getOption();
    // x-axis should be value type, y-axis should be category
    expect((opt.xAxis as Record<string, unknown>).type).toBe('value');
    expect((opt.yAxis as Record<string, unknown>).type).toBe('category');
  });

  it('stacked=true sets stack on series', () => {
    render(<BarChartWidget {...makeProps({
      config: { xField: 'category', yFields: ['sales', 'target'], stacked: true },
      data: sampleCategoryData,
    })} />);
    expect(getSeries(0).stack).toBe('total');
    expect(getSeries(1).stack).toBe('total');
  });
});

// ─── PIE CHART ───────────────────────────────────────────────

describe('PieChartWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('donut=true with no explicit innerRadius uses 40%', () => {
    render(<PieChartWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', donut: true },
      data: samplePieData,
    })} />);
    expect(getSeries().radius).toEqual(['40%', '70%']);
  });

  it('donut=false with no explicit innerRadius uses 0%', () => {
    render(<PieChartWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value' },
      data: samplePieData,
    })} />);
    expect(getSeries().radius).toEqual(['0%', '70%']);
  });

  it('explicit innerRadius overrides donut default', () => {
    render(<PieChartWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', donut: true, innerRadius: 60 },
      data: samplePieData,
    })} />);
    expect(getSeries().radius).toEqual(['60%', '70%']);
  });

  it('outerRadius sets outer radius', () => {
    render(<PieChartWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', outerRadius: 85 },
      data: samplePieData,
    })} />);
    expect(getSeries().radius).toEqual(['0%', '85%']);
  });

  it('labelPosition=inside sets label inside', () => {
    render(<PieChartWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', labelPosition: 'inside' },
      data: samplePieData,
    })} />);
    const label = getSeries().label as Record<string, unknown>;
    expect(label.show).toBe(true);
    expect(label.position).toBe('inside');
  });

  it('labelPosition=none hides labels', () => {
    render(<PieChartWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', labelPosition: 'none' },
      data: samplePieData,
    })} />);
    const label = getSeries().label as Record<string, unknown>;
    expect(label.show).toBe(false);
  });

  it('padAngle sets pad angle', () => {
    render(<PieChartWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', padAngle: 5 },
      data: samplePieData,
    })} />);
    expect(getSeries().padAngle).toBe(5);
  });

  it('padAngle=0 does not set padAngle', () => {
    render(<PieChartWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', padAngle: 0 },
      data: samplePieData,
    })} />);
    expect(getSeries().padAngle).toBeUndefined();
  });

  it('roseType=radius produces rose chart', () => {
    render(<PieChartWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', roseType: 'radius' },
      data: samplePieData,
    })} />);
    expect(getSeries().roseType).toBe('radius');
  });
});

// ─── AREA CHART ──────────────────────────────────────────────

describe('AreaChartWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('areaOpacity sets areaStyle opacity', () => {
    render(<AreaChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], areaOpacity: 0.3 },
      data: sampleTimeData,
    })} />);
    const style = getSeries().areaStyle as Record<string, unknown>;
    expect(style.opacity).toBe(0.3);
  });

  it('default areaOpacity is 0.7', () => {
    render(<AreaChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'] },
      data: sampleTimeData,
    })} />);
    const style = getSeries().areaStyle as Record<string, unknown>;
    expect(style.opacity).toBe(0.7);
  });

  it('showMarkers=false hides symbols', () => {
    render(<AreaChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], showMarkers: false },
      data: sampleTimeData,
    })} />);
    expect(getSeries().showSymbol).toBe(false);
  });

  it('step=end produces step interpolation', () => {
    render(<AreaChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], step: 'end' },
      data: sampleTimeData,
    })} />);
    expect(getSeries().step).toBe('end');
  });

  it('connectNulls=true is passed to series', () => {
    render(<AreaChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], connectNulls: true },
      data: sampleTimeData,
    })} />);
    expect(getSeries().connectNulls).toBe(true);
  });

  it('stacked=false removes stack', () => {
    render(<AreaChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'], stacked: false },
      data: sampleTimeData,
    })} />);
    expect(getSeries().stack).toBeUndefined();
  });

  it('stacked defaults to true', () => {
    render(<AreaChartWidget {...makeProps({
      config: { xField: 'month', yFields: ['revenue'] },
      data: sampleTimeData,
    })} />);
    expect(getSeries().stack).toBe('total');
  });
});

// ─── SCATTER CHART ───────────────────────────────────────────

describe('ScatterChartWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('symbolSize sets symbol size for single series', () => {
    render(<ScatterChartWidget {...makeProps({
      config: { xField: 'x', yField: 'y', symbolSize: 15 },
      data: sampleScatterData,
    })} />);
    expect(getSeries().symbolSize).toBe(15);
  });

  it('default symbolSize is 10', () => {
    render(<ScatterChartWidget {...makeProps({
      config: { xField: 'x', yField: 'y' },
      data: sampleScatterData,
    })} />);
    expect(getSeries().symbolSize).toBe(10);
  });

  it('opacity sets itemStyle opacity', () => {
    render(<ScatterChartWidget {...makeProps({
      config: { xField: 'x', yField: 'y', opacity: 0.4 },
      data: sampleScatterData,
    })} />);
    const style = getSeries().itemStyle as Record<string, unknown>;
    expect(style.opacity).toBe(0.4);
  });

  it('sizeField overrides symbolSize with a function', () => {
    render(<ScatterChartWidget {...makeProps({
      config: { xField: 'x', yField: 'y', sizeField: 'size', symbolSize: 20 },
      data: sampleScatterData,
    })} />);
    // When sizeField is set, symbolSize should be a function, not the static value
    expect(typeof getSeries().symbolSize).toBe('function');
  });

  it('colorField groups data into multiple series', () => {
    render(<ScatterChartWidget {...makeProps({
      config: { xField: 'x', yField: 'y', colorField: 'group' },
      data: sampleScatterData,
    })} />);
    const series = getAllSeries();
    expect(series.length).toBe(2); // 'A' and 'B'
    expect(series[0].name).toBe('A');
    expect(series[1].name).toBe('B');
  });
});

// ─── COMBO CHART ─────────────────────────────────────────────

describe('ComboChartWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  const comboData = [
    { month: 'Jan', bar: 100, line: 50 },
    { month: 'Feb', bar: 150, line: 80 },
  ];

  it('lineSmooth=false produces non-smooth lines', () => {
    render(<ComboChartWidget {...makeProps({
      config: { xField: 'month', barFields: ['bar'], lineFields: ['line'], lineSmooth: false },
      data: comboData,
    })} />);
    // Line series is at index 1
    const lineSeries = getAllSeries().find(s => s.type === 'line');
    expect(lineSeries?.smooth).toBe(false);
  });

  it('lineSmooth defaults to true', () => {
    render(<ComboChartWidget {...makeProps({
      config: { xField: 'month', barFields: ['bar'], lineFields: ['line'] },
      data: comboData,
    })} />);
    const lineSeries = getAllSeries().find(s => s.type === 'line');
    expect(lineSeries?.smooth).toBe(true);
  });

  it('barBorderRadius sets itemStyle on bar series', () => {
    render(<ComboChartWidget {...makeProps({
      config: { xField: 'month', barFields: ['bar'], lineFields: ['line'], barBorderRadius: 4 },
      data: comboData,
    })} />);
    const barSeries = getAllSeries().find(s => s.type === 'bar');
    expect((barSeries?.itemStyle as Record<string, unknown>)?.borderRadius).toBe(4);
  });
});

// ─── HEATMAP ─────────────────────────────────────────────────

describe('HeatmapWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('cellBorderWidth sets itemStyle borderWidth', () => {
    render(<HeatmapWidget {...makeProps({
      config: { xField: 'day', yField: 'hour', valueField: 'val', cellBorderWidth: 3 },
      data: sampleHeatmapData,
    })} />);
    const style = getSeries().itemStyle as Record<string, unknown>;
    expect(style.borderWidth).toBe(3);
  });

  it('cellBorderColor sets itemStyle borderColor', () => {
    render(<HeatmapWidget {...makeProps({
      config: { xField: 'day', yField: 'hour', valueField: 'val', cellBorderColor: '#000' },
      data: sampleHeatmapData,
    })} />);
    const style = getSeries().itemStyle as Record<string, unknown>;
    expect(style.borderColor).toBe('#000');
  });

  it('defaults produce borderWidth=1, borderColor=#fff', () => {
    render(<HeatmapWidget {...makeProps({
      config: { xField: 'day', yField: 'hour', valueField: 'val' },
      data: sampleHeatmapData,
    })} />);
    const style = getSeries().itemStyle as Record<string, unknown>;
    expect(style.borderWidth).toBe(1);
    expect(style.borderColor).toBe('#fff');
  });
});

// ─── RADAR CHART ─────────────────────────────────────────────

describe('RadarChartWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('shape=circle sets radar shape', () => {
    render(<RadarChartWidget {...makeProps({
      config: { valueFields: ['speed', 'quality', 'price'], nameField: 'name', shape: 'circle' },
      data: sampleRadarData,
    })} />);
    const opt = getOption();
    expect((opt.radar as Record<string, unknown>).shape).toBe('circle');
  });

  it('shape defaults to polygon', () => {
    render(<RadarChartWidget {...makeProps({
      config: { valueFields: ['speed', 'quality', 'price'], nameField: 'name' },
      data: sampleRadarData,
    })} />);
    const opt = getOption();
    expect((opt.radar as Record<string, unknown>).shape).toBe('polygon');
  });

  it('areaFill=true adds areaStyle to series data', () => {
    render(<RadarChartWidget {...makeProps({
      config: { valueFields: ['speed', 'quality', 'price'], nameField: 'name', areaFill: true },
      data: sampleRadarData,
    })} />);
    const seriesData = getSeries().data as Array<Record<string, unknown>>;
    expect(seriesData[0].areaStyle).toBeDefined();
    expect((seriesData[0].areaStyle as Record<string, unknown>).opacity).toBe(0.3);
  });

  it('areaFill=false removes areaStyle from series data', () => {
    render(<RadarChartWidget {...makeProps({
      config: { valueFields: ['speed', 'quality', 'price'], nameField: 'name', areaFill: false },
      data: sampleRadarData,
    })} />);
    const seriesData = getSeries().data as Array<Record<string, unknown>>;
    expect(seriesData[0].areaStyle).toBeUndefined();
  });
});

// ─── FUNNEL CHART ────────────────────────────────────────────

describe('FunnelChartWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('sort=ascending sets sort direction', () => {
    render(<FunnelChartWidget {...makeProps({
      config: { nameField: 'stage', valueField: 'value', sort: 'ascending' },
      data: sampleFunnelData,
    })} />);
    expect(getSeries().sort).toBe('ascending');
  });

  it('funnelAlign=left sets alignment', () => {
    render(<FunnelChartWidget {...makeProps({
      config: { nameField: 'stage', valueField: 'value', funnelAlign: 'left' },
      data: sampleFunnelData,
    })} />);
    expect(getSeries().funnelAlign).toBe('left');
  });

  it('gap sets spacing between funnel sections', () => {
    render(<FunnelChartWidget {...makeProps({
      config: { nameField: 'stage', valueField: 'value', gap: 5 },
      data: sampleFunnelData,
    })} />);
    expect(getSeries().gap).toBe(5);
  });

  it('labelPosition=outside moves labels outside', () => {
    render(<FunnelChartWidget {...makeProps({
      config: { nameField: 'stage', valueField: 'value', labelPosition: 'outside' },
      data: sampleFunnelData,
    })} />);
    const label = getSeries().label as Record<string, unknown>;
    expect(label.position).toBe('outside');
  });

  it('defaults: sort=descending, funnelAlign=center, gap=0, labelPosition=inside', () => {
    render(<FunnelChartWidget {...makeProps({
      config: { nameField: 'stage', valueField: 'value' },
      data: sampleFunnelData,
    })} />);
    expect(getSeries().sort).toBe('descending');
    expect(getSeries().funnelAlign).toBe('center');
    expect(getSeries().gap).toBe(0);
    expect((getSeries().label as Record<string, unknown>).position).toBe('inside');
  });
});

// ─── TREEMAP ─────────────────────────────────────────────────

describe('TreemapWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('showUpperLabel=true enables upper labels', () => {
    render(<TreemapWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', showUpperLabel: true },
      data: sampleTreemapData,
    })} />);
    const upper = getSeries().upperLabel as Record<string, unknown>;
    expect(upper.show).toBe(true);
  });

  it('showUpperLabel defaults to false', () => {
    render(<TreemapWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value' },
      data: sampleTreemapData,
    })} />);
    const upper = getSeries().upperLabel as Record<string, unknown>;
    expect(upper.show).toBe(false);
  });

  it('maxDepth limits tree depth', () => {
    render(<TreemapWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', maxDepth: 2 },
      data: sampleTreemapData,
    })} />);
    expect(getSeries().leafDepth).toBe(2);
  });

  it('maxDepth=0 means unlimited (leafDepth undefined)', () => {
    render(<TreemapWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', maxDepth: 0 },
      data: sampleTreemapData,
    })} />);
    expect(getSeries().leafDepth).toBeUndefined();
  });

  it('borderWidth sets itemStyle borderWidth', () => {
    render(<TreemapWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', borderWidth: 3 },
      data: sampleTreemapData,
    })} />);
    const style = getSeries().itemStyle as Record<string, unknown>;
    expect(style.borderWidth).toBe(3);
  });
});

// ─── SANKEY ──────────────────────────────────────────────────

describe('SankeyWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('nodeWidth sets node width', () => {
    render(<SankeyWidget {...makeProps({
      config: { sourceField: 'source', targetField: 'target', valueField: 'value', nodeWidth: 30 },
      data: sampleSankeyData,
    })} />);
    expect(getSeries().nodeWidth).toBe(30);
  });

  it('nodeGap sets node gap', () => {
    render(<SankeyWidget {...makeProps({
      config: { sourceField: 'source', targetField: 'target', valueField: 'value', nodeGap: 15 },
      data: sampleSankeyData,
    })} />);
    expect(getSeries().nodeGap).toBe(15);
  });

  it('orient=vertical sets vertical orientation', () => {
    render(<SankeyWidget {...makeProps({
      config: { sourceField: 'source', targetField: 'target', valueField: 'value', orient: 'vertical' },
      data: sampleSankeyData,
    })} />);
    expect(getSeries().orient).toBe('vertical');
  });

  it('defaults: nodeWidth=20, nodeGap=8, orient=horizontal', () => {
    render(<SankeyWidget {...makeProps({
      config: { sourceField: 'source', targetField: 'target', valueField: 'value' },
      data: sampleSankeyData,
    })} />);
    expect(getSeries().nodeWidth).toBe(20);
    expect(getSeries().nodeGap).toBe(8);
    expect(getSeries().orient).toBe('horizontal');
  });
});

// ─── WATERFALL ───────────────────────────────────────────────

describe('WaterfallWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('increaseColor sets color of increase bars', () => {
    render(<WaterfallWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', increaseColor: '#00ff00' },
      data: sampleWaterfallData,
    })} />);
    const increase = getAllSeries().find(s => s.name === 'Increase');
    expect((increase?.itemStyle as Record<string, unknown>).color).toBe('#00ff00');
  });

  it('decreaseColor sets color of decrease bars', () => {
    render(<WaterfallWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', decreaseColor: '#ff0000' },
      data: sampleWaterfallData,
    })} />);
    const decrease = getAllSeries().find(s => s.name === 'Decrease');
    expect((decrease?.itemStyle as Record<string, unknown>).color).toBe('#ff0000');
  });

  it('totalColor colors total bar items', () => {
    render(<WaterfallWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value', totalLabel: 'Total', totalColor: '#0000ff' },
      data: sampleWaterfallData,
    })} />);
    const increase = getAllSeries().find(s => s.name === 'Increase');
    // Total item should have custom itemStyle with totalColor
    const data = increase?.data as Array<unknown>;
    const totalItem = data[3] as Record<string, unknown>; // 'Total' is last
    expect((totalItem.itemStyle as Record<string, unknown>).color).toBe('#0000ff');
  });

  it('defaults: green increase, red decrease, blue total', () => {
    render(<WaterfallWidget {...makeProps({
      config: { nameField: 'name', valueField: 'value' },
      data: sampleWaterfallData,
    })} />);
    const increase = getAllSeries().find(s => s.name === 'Increase');
    const decrease = getAllSeries().find(s => s.name === 'Decrease');
    expect((increase?.itemStyle as Record<string, unknown>).color).toBe('#52c41a');
    expect((decrease?.itemStyle as Record<string, unknown>).color).toBe('#f5222d');
  });
});

// ─── BOX PLOT ────────────────────────────────────────────────

describe('BoxPlotWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('boxWidth sets box width range', () => {
    render(<BoxPlotWidget {...makeProps({
      config: { categoryField: 'cat', valueField: 'val', boxWidth: '30' },
      data: sampleBoxData,
    })} />);
    expect(getSeries().boxWidth).toEqual(['30', '30']);
  });

  it('default boxWidth is undefined', () => {
    render(<BoxPlotWidget {...makeProps({
      config: { categoryField: 'cat', valueField: 'val' },
      data: sampleBoxData,
    })} />);
    expect(getSeries().boxWidth).toBeUndefined();
  });

  it('computes correct box stats from raw data', () => {
    render(<BoxPlotWidget {...makeProps({
      config: { categoryField: 'cat', valueField: 'val' },
      data: sampleBoxData,
    })} />);
    const data = getSeries().data as number[][];
    // Category 'A': [10, 20, 30, 40] => min=10, Q1=17.5, median=25, Q3=32.5, max=40
    expect(data[0][0]).toBe(10);  // min
    expect(data[0][4]).toBe(40);  // max
    expect(data[0][2]).toBe(25);  // median
  });
});

// ─── GAUGE ───────────────────────────────────────────────────

describe('GaugeWidget — per-chart properties', () => {
  beforeEach(() => { capturedOption = null; });

  it('startAngle sets start angle', () => {
    render(<GaugeWidget {...makeProps({
      config: { valueField: 'val', startAngle: 180 },
      data: [{ val: 50 }],
    })} />);
    expect(getSeries().startAngle).toBe(180);
  });

  it('endAngle sets end angle', () => {
    render(<GaugeWidget {...makeProps({
      config: { valueField: 'val', endAngle: 0 },
      data: [{ val: 50 }],
    })} />);
    expect(getSeries().endAngle).toBe(0);
  });

  it('splitCount sets split number', () => {
    render(<GaugeWidget {...makeProps({
      config: { valueField: 'val', splitCount: 5 },
      data: [{ val: 50 }],
    })} />);
    expect(getSeries().splitNumber).toBe(5);
  });

  it('progressMode=true enables progress', () => {
    render(<GaugeWidget {...makeProps({
      config: { valueField: 'val', progressMode: true },
      data: [{ val: 50 }],
    })} />);
    const progress = getSeries().progress as Record<string, unknown>;
    expect(progress.show).toBe(true);
  });

  it('roundCap=true with progressMode enables round cap', () => {
    render(<GaugeWidget {...makeProps({
      config: { valueField: 'val', progressMode: true, roundCap: true },
      data: [{ val: 50 }],
    })} />);
    const progress = getSeries().progress as Record<string, unknown>;
    expect(progress.roundCap).toBe(true);
  });

  it('minValue/maxValue sets gauge range', () => {
    render(<GaugeWidget {...makeProps({
      config: { valueField: 'val', minValue: 10, maxValue: 200 },
      data: [{ val: 50 }],
    })} />);
    expect(getSeries().min).toBe(10);
    expect(getSeries().max).toBe(200);
  });

  it('min/max also work (backward compat)', () => {
    render(<GaugeWidget {...makeProps({
      config: { valueField: 'val', min: 5, max: 500 },
      data: [{ val: 50 }],
    })} />);
    expect(getSeries().min).toBe(5);
    expect(getSeries().max).toBe(500);
  });

  it('defaults: startAngle=225, endAngle=-45, splitNumber=10', () => {
    render(<GaugeWidget {...makeProps({
      config: { valueField: 'val' },
      data: [{ val: 50 }],
    })} />);
    expect(getSeries().startAngle).toBe(225);
    expect(getSeries().endAngle).toBe(-45);
    expect(getSeries().splitNumber).toBe(10);
  });
});

// ─── TABLE ───────────────────────────────────────────────────

describe('TableWidget — per-chart properties', () => {
  const tableData = [
    { name: 'Alice', score: 95, grade: 'A' },
    { name: 'Bob', score: 82, grade: 'B' },
    { name: 'Carol', score: 78, grade: 'C' },
  ];
  const tableCols = [
    { fieldId: 'name', label: 'Name', dataType: 'string' as const },
    { fieldId: 'score', label: 'Score', dataType: 'number' as const },
    { fieldId: 'grade', label: 'Grade', dataType: 'string' as const },
  ];

  it('showRowNumbers=true renders row number column', () => {
    const { container } = render(
      <TableWidget {...makeProps({
        config: { showRowNumbers: true },
        data: tableData,
        columns: tableCols,
      })} />
    );
    const headerCells = container.querySelectorAll('th');
    expect(headerCells[0].textContent).toBe('#');
    expect(headerCells.length).toBe(4); // # + 3 columns
  });

  it('showRowNumbers=false (default) omits row number column', () => {
    const { container } = render(
      <TableWidget {...makeProps({
        config: {},
        data: tableData,
        columns: tableCols,
      })} />
    );
    const headerCells = container.querySelectorAll('th');
    expect(headerCells.length).toBe(3);
    expect(headerCells[0].textContent).toBe('Name');
  });

  it('showTotals=true renders totals row for numeric columns', () => {
    const { container } = render(
      <TableWidget {...makeProps({
        config: { showTotals: true },
        data: tableData,
        columns: tableCols,
      })} />
    );
    const rows = container.querySelectorAll('tr');
    const lastRow = rows[rows.length - 1];
    const cells = lastRow.querySelectorAll('td');
    // Score total = 95 + 82 + 78 = 255
    expect(cells[1].textContent).toBe('255');
    // Grade (string) should be empty
    expect(cells[2].textContent).toBe('');
  });

  it('headerAlign=center centers header text', () => {
    const { container } = render(
      <TableWidget {...makeProps({
        config: { headerAlign: 'center' },
        data: tableData,
        columns: tableCols,
      })} />
    );
    const th = container.querySelector('th');
    expect(th?.style.textAlign).toBe('center');
  });

  it('cellAlign=right aligns cell text right', () => {
    const { container } = render(
      <TableWidget {...makeProps({
        config: { cellAlign: 'right' },
        data: tableData,
        columns: tableCols,
      })} />
    );
    const td = container.querySelector('tbody td');
    expect(td?.style.textAlign).toBe('right');
  });
});

// ─── KPI CARD ────────────────────────────────────────────────

describe('KPICardWidget — per-chart properties', () => {
  it('fontSize=lg renders large font', () => {
    const { container } = render(
      <KPICardWidget {...makeProps({
        config: { valueField: 'val', fontSize: 'lg' },
        data: [{ val: 42 }],
      })} />
    );
    const valueEl = container.querySelector('.ss-kpi')?.children[1] as HTMLElement;
    expect(valueEl.style.fontSize).toBe('48px');
  });

  it('fontSize=sm renders small font', () => {
    const { container } = render(
      <KPICardWidget {...makeProps({
        config: { valueField: 'val', fontSize: 'sm' },
        data: [{ val: 42 }],
      })} />
    );
    const valueEl = container.querySelector('.ss-kpi')?.children[1] as HTMLElement;
    expect(valueEl.style.fontSize).toBe('24px');
  });

  it('default fontSize is md (32px)', () => {
    const { container } = render(
      <KPICardWidget {...makeProps({
        config: { valueField: 'val' },
        data: [{ val: 42 }],
      })} />
    );
    const valueEl = container.querySelector('.ss-kpi')?.children[1] as HTMLElement;
    expect(valueEl.style.fontSize).toBe('32px');
  });

  it('subtitleField renders subtitle text', () => {
    const { container } = render(
      <KPICardWidget {...makeProps({
        title: 'Revenue',
        config: { valueField: 'val', subtitleField: 'note' },
        data: [{ val: 1000, note: 'YoY growth' }],
      })} />
    );
    expect(container.textContent).toContain('YoY growth');
  });

  it('trendDirection=down-good reverses color polarity', () => {
    const { container } = render(
      <KPICardWidget {...makeProps({
        config: {
          valueField: 'current',
          comparisonField: 'previous',
          trendDirection: 'down-good',
        },
        data: [{ current: 120, previous: 100 }],
      })} />
    );
    // Up delta with down-good should be RED (#f5222d)
    const deltaEl = container.querySelector('.ss-kpi')?.lastChild as HTMLElement;
    expect(deltaEl.style.color).toBe('rgb(245, 34, 45)'); // #f5222d
  });

  it('trendDirection=up-good (default) shows green for up', () => {
    const { container } = render(
      <KPICardWidget {...makeProps({
        config: {
          valueField: 'current',
          comparisonField: 'previous',
        },
        data: [{ current: 120, previous: 100 }],
      })} />
    );
    const deltaEl = container.querySelector('.ss-kpi')?.lastChild as HTMLElement;
    expect(deltaEl.style.color).toBe('rgb(82, 196, 26)'); // #52c41a
  });
});

// ═══════════════════════════════════════════════════════════════
// Title rendering — all ECharts widgets should include title
// when a non-empty title prop is provided
// ═══════════════════════════════════════════════════════════════

describe('Title rendering', () => {
  const titleTestCases: Array<{
    name: string;
    Component: React.ComponentType<WidgetProps>;
    props: Partial<WidgetProps>;
  }> = [
    {
      name: 'LineChartWidget',
      Component: LineChartWidget,
      props: {
        title: 'My Line Chart',
        config: { xField: 'month', yFields: ['revenue'] },
        data: sampleTimeData,
      },
    },
    {
      name: 'BarChartWidget',
      Component: BarChartWidget,
      props: {
        title: 'My Bar Chart',
        config: { xField: 'category', yFields: ['sales'] },
        data: sampleCategoryData,
      },
    },
    {
      name: 'AreaChartWidget',
      Component: AreaChartWidget,
      props: {
        title: 'My Area Chart',
        config: { xField: 'month', yFields: ['revenue'] },
        data: sampleTimeData,
      },
    },
    {
      name: 'PieChartWidget',
      Component: PieChartWidget,
      props: {
        title: 'My Pie Chart',
        config: {},
        data: samplePieData,
      },
    },
    {
      name: 'ScatterChartWidget',
      Component: ScatterChartWidget,
      props: {
        title: 'My Scatter Chart',
        config: { xField: 'x', yField: 'y' },
        data: sampleScatterData,
      },
    },
    {
      name: 'ComboChartWidget',
      Component: ComboChartWidget,
      props: {
        title: 'My Combo Chart',
        config: { xField: 'month', barFields: ['revenue'], lineFields: ['orders'] },
        data: sampleTimeData,
      },
    },
    {
      name: 'HeatmapWidget',
      Component: HeatmapWidget,
      props: {
        title: 'My Heatmap',
        config: { xField: 'day', yField: 'hour', valueField: 'val' },
        data: sampleHeatmapData,
      },
    },
    {
      name: 'RadarChartWidget',
      Component: RadarChartWidget,
      props: {
        title: 'My Radar',
        config: { indicators: ['metric1', 'metric2', 'metric3'] },
        data: sampleRadarData,
      },
    },
    {
      name: 'FunnelChartWidget',
      Component: FunnelChartWidget,
      props: {
        title: 'My Funnel',
        config: {},
        data: samplePieData,
      },
    },
    {
      name: 'TreemapWidget',
      Component: TreemapWidget,
      props: {
        title: 'My Treemap',
        config: {},
        data: [
          { name: 'A', value: 100, parent: '' },
          { name: 'B', value: 80, parent: '' },
        ],
      },
    },
    {
      name: 'SankeyWidget',
      Component: SankeyWidget,
      props: {
        title: 'My Sankey',
        config: { sourceField: 'from', targetField: 'to', valueField: 'amount' },
        data: [
          { from: 'A', to: 'B', amount: 100 },
          { from: 'B', to: 'C', amount: 60 },
        ],
      },
    },
    {
      name: 'WaterfallWidget',
      Component: WaterfallWidget,
      props: {
        title: 'My Waterfall',
        config: { categoryField: 'category', valueField: 'value' },
        data: [
          { category: 'Start', value: 100 },
          { category: 'Add', value: 50 },
          { category: 'Sub', value: -30 },
        ],
      },
    },
    {
      name: 'GaugeWidget',
      Component: GaugeWidget,
      props: {
        title: 'My Gauge',
        config: { valueField: 'pct' },
        data: [{ pct: 75 }],
      },
    },
    {
      name: 'BoxPlotWidget',
      Component: BoxPlotWidget,
      props: {
        title: 'My Box Plot',
        config: { categoryField: 'cat', valueField: 'val' },
        data: sampleBoxData,
      },
    },
  ];

  titleTestCases.forEach(({ name, Component, props }) => {
    it(`${name} includes title in ECharts option`, () => {
      capturedOption = null;
      render(<Component {...makeProps(props)} />);
      expect(capturedOption).not.toBeNull();
      const titleOpt = capturedOption!.title as { text: string } | undefined;
      expect(titleOpt).toBeDefined();
      expect(titleOpt!.text).toBe(props.title);
    });
  });

  it('LineChartWidget omits title when not provided', () => {
    capturedOption = null;
    render(
      <LineChartWidget
        {...makeProps({
          config: { xField: 'month', yFields: ['revenue'] },
          data: sampleTimeData,
        })}
      />
    );
    expect(capturedOption).not.toBeNull();
    expect(capturedOption!.title).toBeUndefined();
  });
});
