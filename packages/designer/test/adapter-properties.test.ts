/**
 * Adapter round-trip tests for per-chart config properties.
 *
 * Verifies that every per-chart configKey survives puck→canonical→puck.
 */
import { describe, it, expect } from 'vitest';
import type { Data } from '@puckeditor/core';
import { puckToCanonical, canonicalToPuck } from '../src/adapters/puck-canonical';

// ─── Helpers ─────────────────────────────────────────────────

interface PropTest {
  /** Puck block name (e.g. 'LineChart') */
  block: string;
  /** Per-chart props to set on the block */
  perChartProps: Record<string, unknown>;
  /** Base props needed to make a valid block */
  baseProps?: Record<string, unknown>;
}

const BASE_XY = {
  id: 'test-1', title: 'Test', datasetRef: 'ds',
  xAxisField: 'x', yAxisField: 'y', seriesField: '', aggregation: 'none',
};

const BASE_CAT_VAL = {
  id: 'test-1', title: 'Test', datasetRef: 'ds',
  categoryField: 'cat', valueField: 'val',
};

function roundTrip(block: string, props: Record<string, unknown>) {
  const puckData: Data = {
    root: { props: { title: 'RT' } },
    content: [{ type: block, props }],
  };
  const canonical = puckToCanonical(puckData);
  const restored = canonicalToPuck(canonical);
  return restored.content![0].props as Record<string, unknown>;
}

// ─── Line Chart ──────────────────────────────────────────────

describe('Adapter round-trip — Line per-chart props', () => {
  const base = { ...BASE_XY, smooth: 'true' };

  it('showMarkers survives', () => {
    const p = roundTrip('LineChart', { ...base, showMarkers: 'false' });
    expect(p.showMarkers).toBe('false');
  });

  it('markerSize survives', () => {
    const p = roundTrip('LineChart', { ...base, markerSize: '12' });
    expect(p.markerSize).toBe('12');
  });

  it('step survives', () => {
    const p = roundTrip('LineChart', { ...base, step: 'start' });
    expect(p.step).toBe('start');
  });

  it('connectNulls survives', () => {
    const p = roundTrip('LineChart', { ...base, connectNulls: 'true' });
    expect(p.connectNulls).toBe('true');
  });
});

// ─── Bar Chart ───────────────────────────────────────────────

describe('Adapter round-trip — Bar per-chart props', () => {
  const base = { ...BASE_XY, orientation: 'vertical', stacked: 'false' };

  it('barWidth survives', () => {
    const p = roundTrip('BarChart', { ...base, barWidth: '40%' });
    expect(p.barWidth).toBe('40%');
  });

  it('barGap survives', () => {
    const p = roundTrip('BarChart', { ...base, barGap: '10%' });
    expect(p.barGap).toBe('10%');
  });

  it('borderRadius survives', () => {
    const p = roundTrip('BarChart', { ...base, borderRadius: '6' });
    expect(p.borderRadius).toBe('6');
  });

  it('barMinHeight survives', () => {
    const p = roundTrip('BarChart', { ...base, barMinHeight: '5' });
    expect(p.barMinHeight).toBe('5');
  });
});

// ─── Pie Chart ───────────────────────────────────────────────

describe('Adapter round-trip — Pie per-chart props', () => {
  const base = { ...BASE_CAT_VAL, variant: 'pie' };

  it('innerRadius survives', () => {
    const p = roundTrip('PieChart', { ...base, innerRadius: '50' });
    expect(p.innerRadius).toBe('50');
  });

  it('outerRadius survives', () => {
    const p = roundTrip('PieChart', { ...base, outerRadius: '85' });
    expect(p.outerRadius).toBe('85');
  });

  it('labelPosition survives', () => {
    const p = roundTrip('PieChart', { ...base, labelPosition: 'inside' });
    expect(p.labelPosition).toBe('inside');
  });

  it('padAngle survives', () => {
    const p = roundTrip('PieChart', { ...base, padAngle: '5' });
    expect(p.padAngle).toBe('5');
  });
});

// ─── Area Chart ──────────────────────────────────────────────

describe('Adapter round-trip — Area per-chart props', () => {
  const base = { ...BASE_XY, stacked: 'true' };

  it('areaOpacity survives', () => {
    const p = roundTrip('AreaChart', { ...base, areaOpacity: '0.3' });
    expect(p.areaOpacity).toBe('0.3');
  });
});

// ─── Scatter Chart ───────────────────────────────────────────

describe('Adapter round-trip — Scatter per-chart props', () => {
  const base = { ...BASE_XY };

  it('symbolSize survives', () => {
    const p = roundTrip('ScatterChart', { ...base, symbolSize: '20' });
    expect(p.symbolSize).toBe('20');
  });

  it('opacity survives', () => {
    const p = roundTrip('ScatterChart', { ...base, opacity: '0.5' });
    expect(p.opacity).toBe('0.5');
  });
});

// ─── Combo Chart ─────────────────────────────────────────────

describe('Adapter round-trip — Combo per-chart props', () => {
  const base = {
    id: 'test-1', title: 'Test', datasetRef: 'ds',
    xAxisField: 'x', barField: 'b', lineField: 'l', aggregation: 'none',
  };

  it('lineSmooth survives', () => {
    const p = roundTrip('ComboChart', { ...base, lineSmooth: 'false' });
    expect(p.lineSmooth).toBe('false');
  });

  it('barBorderRadius survives', () => {
    const p = roundTrip('ComboChart', { ...base, barBorderRadius: '4' });
    expect(p.barBorderRadius).toBe('4');
  });
});

// ─── Heatmap ─────────────────────────────────────────────────

describe('Adapter round-trip — Heatmap per-chart props', () => {
  const base = {
    id: 'test-1', title: 'Test', datasetRef: 'ds',
    xAxisField: 'x', yAxisField: 'y', valueField: 'v',
  };

  it('cellBorderWidth survives', () => {
    const p = roundTrip('HeatmapChart', { ...base, cellBorderWidth: '3' });
    expect(p.cellBorderWidth).toBe('3');
  });

  it('cellBorderColor survives', () => {
    const p = roundTrip('HeatmapChart', { ...base, cellBorderColor: '#000' });
    expect(p.cellBorderColor).toBe('#000');
  });
});

// ─── Radar ───────────────────────────────────────────────────

describe('Adapter round-trip — Radar per-chart props', () => {
  const base = { ...BASE_CAT_VAL, seriesField: '' };

  it('shape survives', () => {
    const p = roundTrip('RadarChart', { ...base, shape: 'circle' });
    expect(p.shape).toBe('circle');
  });

  it('areaFill survives', () => {
    const p = roundTrip('RadarChart', { ...base, areaFill: 'false' });
    expect(p.areaFill).toBe('false');
  });
});

// ─── Funnel ──────────────────────────────────────────────────

describe('Adapter round-trip — Funnel per-chart props', () => {
  const base = { ...BASE_CAT_VAL };

  it('sort survives', () => {
    const p = roundTrip('FunnelChart', { ...base, sort: 'ascending' });
    expect(p.sort).toBe('ascending');
  });

  it('funnelAlign survives', () => {
    const p = roundTrip('FunnelChart', { ...base, funnelAlign: 'left' });
    expect(p.funnelAlign).toBe('left');
  });

  it('gap survives', () => {
    const p = roundTrip('FunnelChart', { ...base, gap: '5' });
    expect(p.gap).toBe('5');
  });
});

// ─── Treemap ─────────────────────────────────────────────────

describe('Adapter round-trip — Treemap per-chart props', () => {
  const base = {
    id: 'test-1', title: 'Test', datasetRef: 'ds',
    nameField: 'name', valueField: 'value', parentField: '',
  };

  it('showUpperLabel survives', () => {
    const p = roundTrip('TreemapChart', { ...base, showUpperLabel: 'true' });
    expect(p.showUpperLabel).toBe('true');
  });

  it('maxDepth survives', () => {
    const p = roundTrip('TreemapChart', { ...base, maxDepth: '2' });
    expect(p.maxDepth).toBe('2');
  });

  it('borderWidth survives', () => {
    const p = roundTrip('TreemapChart', { ...base, borderWidth: '3' });
    expect(p.borderWidth).toBe('3');
  });
});

// ─── Sankey ──────────────────────────────────────────────────

describe('Adapter round-trip — Sankey per-chart props', () => {
  const base = {
    id: 'test-1', title: 'Test', datasetRef: 'ds',
    sourceField: 'from', targetField: 'to', valueField: 'flow',
  };

  it('nodeWidth survives', () => {
    const p = roundTrip('SankeyChart', { ...base, nodeWidth: '30' });
    expect(p.nodeWidth).toBe('30');
  });

  it('nodeGap survives', () => {
    const p = roundTrip('SankeyChart', { ...base, nodeGap: '15' });
    expect(p.nodeGap).toBe('15');
  });

  it('orient survives', () => {
    const p = roundTrip('SankeyChart', { ...base, orient: 'vertical' });
    expect(p.orient).toBe('vertical');
  });
});

// ─── Waterfall ───────────────────────────────────────────────

describe('Adapter round-trip — Waterfall per-chart props', () => {
  const base = { ...BASE_CAT_VAL };

  it('totalLabel survives', () => {
    const p = roundTrip('WaterfallChart', { ...base, totalLabel: 'Net' });
    expect(p.totalLabel).toBe('Net');
  });

  it('increaseColor survives', () => {
    const p = roundTrip('WaterfallChart', { ...base, increaseColor: '#00ff00' });
    expect(p.increaseColor).toBe('#00ff00');
  });

  it('decreaseColor survives', () => {
    const p = roundTrip('WaterfallChart', { ...base, decreaseColor: '#ff0000' });
    expect(p.decreaseColor).toBe('#ff0000');
  });

  it('totalColor survives', () => {
    const p = roundTrip('WaterfallChart', { ...base, totalColor: '#0000ff' });
    expect(p.totalColor).toBe('#0000ff');
  });
});

// ─── BoxPlot ─────────────────────────────────────────────────

describe('Adapter round-trip — BoxPlot per-chart props', () => {
  const base = { ...BASE_CAT_VAL };

  it('boxWidth survives', () => {
    const p = roundTrip('BoxPlotChart', { ...base, boxWidth: '30' });
    expect(p.boxWidth).toBe('30');
  });
});

// ─── Gauge ───────────────────────────────────────────────────

describe('Adapter round-trip — Gauge per-chart props', () => {
  const base = {
    id: 'test-1', title: 'Test', datasetRef: 'ds',
    valueField: 'metric', minValue: 0, maxValue: 100,
  };

  it('startAngle survives', () => {
    const p = roundTrip('GaugeChart', { ...base, startAngle: '180' });
    expect(p.startAngle).toBe('180');
  });

  it('endAngle survives', () => {
    const p = roundTrip('GaugeChart', { ...base, endAngle: '0' });
    expect(p.endAngle).toBe('0');
  });

  it('splitCount survives', () => {
    const p = roundTrip('GaugeChart', { ...base, splitCount: '5' });
    expect(p.splitCount).toBe('5');
  });

  it('progressMode survives', () => {
    const p = roundTrip('GaugeChart', { ...base, progressMode: 'true' });
    expect(p.progressMode).toBe('true');
  });

  it('roundCap survives', () => {
    const p = roundTrip('GaugeChart', { ...base, roundCap: 'true' });
    expect(p.roundCap).toBe('true');
  });
});

// ─── Table ───────────────────────────────────────────────────

describe('Adapter round-trip — Table per-chart props', () => {
  const base = { id: 'test-1', title: 'Test', datasetRef: 'ds', pageSize: 50, striped: 'true' };

  it('showRowNumbers survives', () => {
    const p = roundTrip('Table', { ...base, showRowNumbers: 'true' });
    expect(p.showRowNumbers).toBe('true');
  });

  it('showTotals survives', () => {
    const p = roundTrip('Table', { ...base, showTotals: 'true' });
    expect(p.showTotals).toBe('true');
  });

  it('headerAlign survives', () => {
    const p = roundTrip('Table', { ...base, headerAlign: 'center' });
    expect(p.headerAlign).toBe('center');
  });

  it('cellAlign survives', () => {
    const p = roundTrip('Table', { ...base, cellAlign: 'right' });
    expect(p.cellAlign).toBe('right');
  });
});

// ─── KPI ─────────────────────────────────────────────────────

describe('Adapter round-trip — KPI per-chart props', () => {
  const base = {
    id: 'test-1', title: 'Test', datasetRef: 'ds',
    valueField: 'revenue', aggregation: 'sum',
    prefix: '$', suffix: 'M', comparisonField: 'prev',
  };

  it('subtitleField survives', () => {
    const p = roundTrip('KPICard', { ...base, subtitleField: 'note' });
    expect(p.subtitleField).toBe('note');
  });

  it('fontSize survives', () => {
    const p = roundTrip('KPICard', { ...base, fontSize: 'lg' });
    expect(p.fontSize).toBe('lg');
  });

  it('trendDirection survives', () => {
    const p = roundTrip('KPICard', { ...base, trendDirection: 'down-good' });
    expect(p.trendDirection).toBe('down-good');
  });

  it('conditionalColor survives', () => {
    const p = roundTrip('KPICard', { ...base, conditionalColor: 'true' });
    expect(p.conditionalColor).toBe('true');
  });
});
