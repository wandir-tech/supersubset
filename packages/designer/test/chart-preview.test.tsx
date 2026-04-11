/**
 * Comprehensive tests for ChartPreview component.
 * Exercises every widget type with sample data and verifies the rendering path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PUCK_NAME_TO_WIDGET_TYPE } from '../src/blocks/charts';
import { getSampleData } from '../src/data/sample-data';

// ─── Mock chart widgets ──────────────────────────────────────
// We mock the external chart package so we can test ChartPreview in isolation.
const mockChartWidget = vi.fn((props: Record<string, unknown>) =>
  React.createElement('div', {
    'data-testid': `chart-${props.widgetType}`,
    'data-widget-id': props.widgetId,
    'data-title': props.title,
    'data-config': JSON.stringify(props.config),
    'data-has-data': Array.isArray(props.data),
    'data-data-length': Array.isArray(props.data) ? (props.data as unknown[]).length : 0,
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

// ─── All widget types to test ────────────────────────────────

const ALL_WIDGET_TYPES = Object.values(PUCK_NAME_TO_WIDGET_TYPE);

describe('ChartPreview — renders every widget type', () => {
  beforeEach(() => {
    mockChartWidget.mockClear();
  });

  it.each(ALL_WIDGET_TYPES)(
    'renders %s with sample data',
    (widgetType) => {
      const sampleData = getSampleData(widgetType);
      expect(sampleData).not.toBeNull();

      const { container } = render(
        React.createElement(ChartPreview, {
          widgetType,
          puckProps: { title: `Test ${widgetType}` },
          fallbackIcon: '📊',
        })
      );

      expect(container.firstChild).toBeDefined();
      if (widgetType === 'alerts') {
        expect(mockChartWidget).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Payment retries elevated');
        expect(container.textContent).toContain('warning');
        return;
      }

      // Chart widget should have been called with sample data
      expect(mockChartWidget).toHaveBeenCalled();
      const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
      expect(lastCall.widgetType).toBe(widgetType);
      expect(lastCall.data).toEqual(sampleData!.data);
    }
  );
});

describe('ChartPreview — config mapping', () => {
  beforeEach(() => {
    mockChartWidget.mockClear();
  });

  it('uses default config when puckProps are empty strings', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'line-chart',
        puckProps: { title: 'Test', xAxisField: '', yAxisField: '' },
        fallbackIcon: '📈',
      })
    );

    const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
    // Should use defaults since fields are empty strings
    expect(lastCall.config.xField).toBe('month');
    expect(lastCall.config.yFields).toEqual(['revenue', 'orders']);
  });

  it('overrides default config when puckProps have values', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'line-chart',
        puckProps: { title: 'Test', xAxisField: 'date', yAxisField: 'amount' },
        fallbackIcon: '📈',
      })
    );

    const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
    expect(lastCall.config.xField).toBe('date');
    expect(lastCall.config.yFields).toEqual(['amount']);
  });

  it('maps smooth=true from puckProps', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'line-chart',
        puckProps: { title: 'Test', smooth: 'true' },
        fallbackIcon: '📈',
      })
    );

    const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
    expect(lastCall.config.smooth).toBe(true);
  });

  it('maps stacked=true from puckProps', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'bar-chart',
        puckProps: { title: 'Test', stacked: 'true' },
        fallbackIcon: '📊',
      })
    );

    const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
    expect(lastCall.config.stacked).toBe(true);
  });

  it('maps horizontal orientation from puckProps', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'bar-chart',
        puckProps: { title: 'Test', orientation: 'horizontal' },
        fallbackIcon: '📊',
      })
    );

    const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
    expect(lastCall.config.horizontal).toBe(true);
  });

  it('maps categoryField for pie charts', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'pie-chart',
        puckProps: { title: 'Test', categoryField: 'region' },
        fallbackIcon: '🥧',
      })
    );

    const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
    expect(lastCall.config.nameField).toBe('region');
    expect(lastCall.config.categoryField).toBe('region');
  });

  it('maps valueField for gauge', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'gauge',
        puckProps: { title: 'Score', valueField: 'score' },
        fallbackIcon: '🎯',
      })
    );

    const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
    expect(lastCall.config.valueField).toBe('score');
  });

  it('renders alerts preview with maxItems and timestamp controls', () => {
    const { container } = render(
      React.createElement(ChartPreview, {
        widgetType: 'alerts',
        puckProps: {
          title: 'Operations Watchlist',
          maxItems: 2,
          showTimestamp: 'false',
          layout: 'inline',
        },
        fallbackIcon: '🚨',
      })
    );

    expect(container.textContent).toContain('Payment retries elevated');
    expect(container.textContent).toContain('EU warehouse backlog cleared');
    expect(container.textContent).not.toContain('North America revenue feed delayed');
    expect(container.textContent).not.toContain('2026-04-11 09:12 UTC');
  });
});

describe('ChartPreview — fallback behavior', () => {
  beforeEach(() => {
    mockChartWidget.mockClear();
  });

  it('shows fallback placeholder for unknown widget type', () => {
    const { container } = render(
      React.createElement(ChartPreview, {
        widgetType: 'nonexistent-chart',
        puckProps: { title: 'Unknown' },
        fallbackIcon: '❓',
      })
    );

    // Should NOT call any chart widget
    expect(mockChartWidget).not.toHaveBeenCalled();
    // Should render a fallback with the icon
    expect(container.textContent).toContain('❓');
    expect(container.textContent).toContain('Unknown');
    expect(container.textContent).toContain('nonexistent-chart');
  });

  it('uses title from puckProps in the widget', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'line-chart',
        puckProps: { title: 'Revenue Over Time' },
        fallbackIcon: '📈',
      })
    );

    const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
    expect(lastCall.title).toBe('Revenue Over Time');
  });

  it('uses widgetType as title fallback when title is empty', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'bar-chart',
        puckProps: { title: '' },
        fallbackIcon: '📊',
      })
    );

    const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
    expect(lastCall.title).toBe('bar-chart');
  });
});

describe('ChartPreview — WidgetProps shape', () => {
  beforeEach(() => {
    mockChartWidget.mockClear();
  });

  it('passes correct widgetId format', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'pie-chart',
        puckProps: { title: 'Test' },
        fallbackIcon: '🥧',
      })
    );

    const lastCall = mockChartWidget.mock.calls[0][0];
    expect(lastCall.widgetId).toBe('preview-pie-chart');
  });

  it('passes height=200 for standard charts', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'line-chart',
        puckProps: { title: 'Test' },
        fallbackIcon: '📈',
      })
    );

    const lastCall = mockChartWidget.mock.calls[0][0];
    expect(lastCall.height).toBe(200);
  });

  it('passes height=120 for KPI cards', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'kpi-card',
        puckProps: { title: 'Revenue' },
        fallbackIcon: '🔢',
      })
    );

    const lastCall = mockChartWidget.mock.calls[0][0];
    expect(lastCall.height).toBe(120);
  });

  it('passes columns metadata for table widget', () => {
    render(
      React.createElement(ChartPreview, {
        widgetType: 'table',
        puckProps: { title: 'Data Table' },
        fallbackIcon: '📋',
      })
    );

    const lastCall = mockChartWidget.mock.calls[0][0];
    expect(lastCall.columns).toBeDefined();
    expect(lastCall.columns.length).toBeGreaterThan(0);
    expect(lastCall.columns[0]).toHaveProperty('fieldId');
    expect(lastCall.columns[0]).toHaveProperty('label');
    expect(lastCall.columns[0]).toHaveProperty('dataType');
  });
});
