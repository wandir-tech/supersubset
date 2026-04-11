/**
 * Per-chart property mapping tests for ChartPreview.
 *
 * Verifies that every per-chart Puck prop is correctly mapped through
 * buildWidgetConfig into the widget config object.
 *
 * Uses the same mock pattern as chart-preview.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// ─── Mock chart widgets ──────────────────────────────────────

const mockChartWidget = vi.fn((props: Record<string, unknown>) =>
  React.createElement('div', {
    'data-testid': `chart-${props.widgetType}`,
  })
);

vi.mock('@supersubset/charts-echarts', () => ({
  LineChartWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'line-chart' }),
  BarChartWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'bar-chart' }),
  PieChartWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'pie-chart' }),
  ScatterChartWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'scatter-chart' }),
  AreaChartWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'area-chart' }),
  ComboChartWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'combo-chart' }),
  HeatmapWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'heatmap' }),
  RadarChartWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'radar-chart' }),
  FunnelChartWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'funnel-chart' }),
  TreemapWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'treemap' }),
  SankeyWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'sankey' }),
  WaterfallWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'waterfall' }),
  BoxPlotWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'box-plot' }),
  GaugeWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'gauge' }),
  TableWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'table' }),
  KPICardWidget: (props: Record<string, unknown>) => mockChartWidget({ ...props, widgetType: 'kpi-card' }),
}));

vi.mock('@supersubset/runtime', () => ({}));

import { ChartPreview } from '../src/preview/ChartPreview';

// ─── Helpers ─────────────────────────────────────────────────

function renderPreview(widgetType: string, puckProps: Record<string, unknown>) {
  mockChartWidget.mockClear();
  render(
    React.createElement(ChartPreview, {
      widgetType,
      puckProps: { title: 'Test', ...puckProps },
      fallbackIcon: '📊',
    })
  );
  expect(mockChartWidget).toHaveBeenCalled();
  return mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0]
    .config as Record<string, unknown>;
}

// ─── LINE-CHART per-chart props ──────────────────────────────

describe('ChartPreview — Line per-chart props', () => {
  it('maps showMarkers=false', () => {
    const c = renderPreview('line-chart', { showMarkers: 'false' });
    expect(c.showMarkers).toBe(false);
  });

  it('maps markerSize', () => {
    const c = renderPreview('line-chart', { markerSize: '12' });
    expect(c.markerSize).toBe(12);
  });

  it('maps step=start', () => {
    const c = renderPreview('line-chart', { step: 'start' });
    expect(c.step).toBe('start');
  });

  it('maps connectNulls=true', () => {
    const c = renderPreview('line-chart', { connectNulls: 'true' });
    expect(c.connectNulls).toBe(true);
  });
});

// ─── BAR-CHART per-chart props ───────────────────────────────

describe('ChartPreview — Bar per-chart props', () => {
  it('maps barWidth', () => {
    const c = renderPreview('bar-chart', { barWidth: '40%' });
    expect(c.barWidth).toBe('40%');
  });

  it('maps barGap', () => {
    const c = renderPreview('bar-chart', { barGap: '10%' });
    expect(c.barGap).toBe('10%');
  });

  it('maps borderRadius', () => {
    const c = renderPreview('bar-chart', { borderRadius: '6' });
    expect(c.borderRadius).toBe(6);
  });

  it('skips borderRadius=0', () => {
    const c = renderPreview('bar-chart', { borderRadius: '0' });
    expect(c.borderRadius).toBeUndefined();
  });

  it('maps barMinHeight', () => {
    const c = renderPreview('bar-chart', { barMinHeight: '5' });
    expect(c.barMinHeight).toBe(5);
  });
});

// ─── PIE-CHART per-chart props ───────────────────────────────

describe('ChartPreview — Pie per-chart props', () => {
  it('maps innerRadius', () => {
    const c = renderPreview('pie-chart', { innerRadius: '50' });
    expect(c.innerRadius).toBe(50);
  });

  it('maps outerRadius', () => {
    const c = renderPreview('pie-chart', { outerRadius: '85' });
    expect(c.outerRadius).toBe(85);
  });

  it('maps labelPosition=inside', () => {
    const c = renderPreview('pie-chart', { labelPosition: 'inside' });
    expect(c.labelPosition).toBe('inside');
  });

  it('maps padAngle', () => {
    const c = renderPreview('pie-chart', { padAngle: '5' });
    expect(c.padAngle).toBe(5);
  });

  it('skips padAngle=0', () => {
    const c = renderPreview('pie-chart', { padAngle: '0' });
    expect(c.padAngle).toBeUndefined();
  });

  it('maps variant=donut to donut=true', () => {
    const c = renderPreview('pie-chart', { variant: 'donut' });
    expect(c.donut).toBe(true);
  });

  it('maps variant=rose to roseType', () => {
    const c = renderPreview('pie-chart', { variant: 'rose' });
    expect(c.roseType).toBe('radius');
  });
});

// ─── AREA-CHART per-chart props ──────────────────────────────

describe('ChartPreview — Area per-chart props', () => {
  it('maps areaOpacity', () => {
    const c = renderPreview('area-chart', { areaOpacity: '0.3' });
    expect(c.areaOpacity).toBe(0.3);
  });

  it('maps showMarkers=false', () => {
    const c = renderPreview('area-chart', { showMarkers: 'false' });
    expect(c.showMarkers).toBe(false);
  });

  it('maps step=end', () => {
    const c = renderPreview('area-chart', { step: 'end' });
    expect(c.step).toBe('end');
  });
});

// ─── SCATTER per-chart props ─────────────────────────────────

describe('ChartPreview — Scatter per-chart props', () => {
  it('maps symbolSize', () => {
    const c = renderPreview('scatter-chart', { symbolSize: '20' });
    expect(c.symbolSize).toBe(20);
  });

  it('maps opacity', () => {
    const c = renderPreview('scatter-chart', { opacity: '0.5' });
    expect(c.opacity).toBe(0.5);
  });
});

// ─── COMBO per-chart props ───────────────────────────────────

describe('ChartPreview — Combo per-chart props', () => {
  it('maps lineSmooth=false', () => {
    const c = renderPreview('combo-chart', { lineSmooth: 'false' });
    expect(c.lineSmooth).toBe(false);
  });

  it('maps barBorderRadius', () => {
    const c = renderPreview('combo-chart', { barBorderRadius: '4' });
    expect(c.barBorderRadius).toBe(4);
  });

  it('skips barBorderRadius=0', () => {
    const c = renderPreview('combo-chart', { barBorderRadius: '0' });
    expect(c.barBorderRadius).toBeUndefined();
  });
});

// ─── HEATMAP per-chart props ─────────────────────────────────

describe('ChartPreview — Heatmap per-chart props', () => {
  it('maps cellBorderWidth', () => {
    const c = renderPreview('heatmap', { cellBorderWidth: '3' });
    expect(c.cellBorderWidth).toBe(3);
  });

  it('maps cellBorderColor', () => {
    const c = renderPreview('heatmap', { cellBorderColor: '#000' });
    expect(c.cellBorderColor).toBe('#000');
  });
});

// ─── RADAR per-chart props ───────────────────────────────────

describe('ChartPreview — Radar per-chart props', () => {
  it('maps shape=circle', () => {
    const c = renderPreview('radar-chart', { shape: 'circle' });
    expect(c.shape).toBe('circle');
  });

  it('maps areaFill=false', () => {
    const c = renderPreview('radar-chart', { areaFill: 'false' });
    expect(c.areaFill).toBe(false);
  });
});

// ─── FUNNEL per-chart props ──────────────────────────────────

describe('ChartPreview — Funnel per-chart props', () => {
  it('maps sort=ascending', () => {
    const c = renderPreview('funnel-chart', { sort: 'ascending' });
    expect(c.sort).toBe('ascending');
  });

  it('maps funnelAlign=left', () => {
    const c = renderPreview('funnel-chart', { funnelAlign: 'left' });
    expect(c.funnelAlign).toBe('left');
  });

  it('maps gap', () => {
    const c = renderPreview('funnel-chart', { gap: '5' });
    expect(c.gap).toBe(5);
  });

  it('skips gap=0', () => {
    const c = renderPreview('funnel-chart', { gap: '0' });
    expect(c.gap).toBeUndefined();
  });
});

// ─── TREEMAP per-chart props ─────────────────────────────────

describe('ChartPreview — Treemap per-chart props', () => {
  it('maps showUpperLabel=true', () => {
    const c = renderPreview('treemap', { showUpperLabel: 'true' });
    expect(c.showUpperLabel).toBe(true);
  });

  it('maps maxDepth', () => {
    const c = renderPreview('treemap', { maxDepth: '2' });
    expect(c.maxDepth).toBe(2);
  });

  it('maps borderWidth', () => {
    const c = renderPreview('treemap', { borderWidth: '3' });
    expect(c.borderWidth).toBe(3);
  });
});

// ─── SANKEY per-chart props ──────────────────────────────────

describe('ChartPreview — Sankey per-chart props', () => {
  it('maps nodeWidth', () => {
    const c = renderPreview('sankey', { nodeWidth: '30' });
    expect(c.nodeWidth).toBe(30);
  });

  it('maps nodeGap', () => {
    const c = renderPreview('sankey', { nodeGap: '15' });
    expect(c.nodeGap).toBe(15);
  });

  it('maps orient=vertical', () => {
    const c = renderPreview('sankey', { orient: 'vertical' });
    expect(c.orient).toBe('vertical');
  });
});

// ─── WATERFALL per-chart props ───────────────────────────────

describe('ChartPreview — Waterfall per-chart props', () => {
  it('maps totalLabel', () => {
    const c = renderPreview('waterfall', { totalLabel: 'Net' });
    expect(c.totalLabel).toBe('Net');
  });

  it('maps increaseColor', () => {
    const c = renderPreview('waterfall', { increaseColor: '#00ff00' });
    expect(c.increaseColor).toBe('#00ff00');
  });

  it('maps decreaseColor', () => {
    const c = renderPreview('waterfall', { decreaseColor: '#ff0000' });
    expect(c.decreaseColor).toBe('#ff0000');
  });

  it('maps totalColor', () => {
    const c = renderPreview('waterfall', { totalColor: '#0000ff' });
    expect(c.totalColor).toBe('#0000ff');
  });
});

// ─── BOX-PLOT per-chart props ────────────────────────────────

describe('ChartPreview — BoxPlot per-chart props', () => {
  it('maps boxWidth', () => {
    const c = renderPreview('box-plot', { boxWidth: '30' });
    expect(c.boxWidth).toBe('30');
  });
});

// ─── GAUGE per-chart props ───────────────────────────────────

describe('ChartPreview — Gauge per-chart props', () => {
  it('maps startAngle', () => {
    const c = renderPreview('gauge', { startAngle: '180' });
    expect(c.startAngle).toBe(180);
  });

  it('maps endAngle', () => {
    const c = renderPreview('gauge', { endAngle: '0' });
    expect(c.endAngle).toBe(0);
  });

  it('maps splitCount', () => {
    const c = renderPreview('gauge', { splitCount: '5' });
    expect(c.splitCount).toBe(5);
  });

  it('maps progressMode=true', () => {
    const c = renderPreview('gauge', { progressMode: 'true' });
    expect(c.progressMode).toBe(true);
  });

  it('maps roundCap=true', () => {
    const c = renderPreview('gauge', { roundCap: 'true' });
    expect(c.roundCap).toBe(true);
  });
});

// ─── TABLE per-chart props ───────────────────────────────────

describe('ChartPreview — Table per-chart props', () => {
  it('maps showRowNumbers=true', () => {
    const c = renderPreview('table', { showRowNumbers: 'true' });
    expect(c.showRowNumbers).toBe(true);
  });

  it('maps showTotals=true', () => {
    const c = renderPreview('table', { showTotals: 'true' });
    expect(c.showTotals).toBe(true);
  });

  it('maps headerAlign', () => {
    const c = renderPreview('table', { headerAlign: 'center' });
    expect(c.headerAlign).toBe('center');
  });

  it('maps cellAlign', () => {
    const c = renderPreview('table', { cellAlign: 'right' });
    expect(c.cellAlign).toBe('right');
  });
});

// ─── KPI per-chart props ─────────────────────────────────────

describe('ChartPreview — KPI per-chart props', () => {
  it('maps subtitleField', () => {
    const c = renderPreview('kpi-card', { subtitleField: 'note' });
    expect(c.subtitleField).toBe('note');
  });

  it('maps fontSize=lg', () => {
    const c = renderPreview('kpi-card', { fontSize: 'lg' });
    expect(c.fontSize).toBe('lg');
  });

  it('maps trendDirection', () => {
    const c = renderPreview('kpi-card', { trendDirection: 'down-good' });
    expect(c.trendDirection).toBe('down-good');
  });
});
