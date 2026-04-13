/**
 * Tests that ChartPreview uses host-provided data when available.
 *
 * The core contract: when a PreviewDataProvider supplies a fetchPreviewData
 * callback, ChartPreview must call it with the dataset ref + field config
 * and pass the returned rows (not sample data) to the chart widget.
 *
 * Changing Y-axis from "revenue" to "units" must cause different VALUES
 * to appear in the data — not just renamed keys on the same numbers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';

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
import { PreviewDataProvider } from '../src/context/PreviewDataContext';

// ─── Simulated host datasets ────────────────────────────────

/** Revenue data: month → big numbers (thousands) */
const REVENUE_BY_MONTH = [
  { month: 'Jan', revenue: 12450 },
  { month: 'Feb', revenue: 15800 },
  { month: 'Mar', revenue: 18200 },
  { month: 'Apr', revenue: 14700 },
  { month: 'May', revenue: 21300 },
  { month: 'Jun', revenue: 24100 },
];

/** Units data: month → small numbers (tens) */
const UNITS_BY_MONTH = [
  { month: 'Jan', units: 24 },
  { month: 'Feb', units: 28 },
  { month: 'Mar', units: 35 },
  { month: 'Apr', units: 21 },
  { month: 'May', units: 48 },
  { month: 'Jun', units: 52 },
];

/** Category breakdown data */
const REVENUE_BY_CATEGORY = [
  { category: 'Footwear', revenue: 14250 },
  { category: 'Apparel', revenue: 7800 },
  { category: 'Accessories', revenue: 5030 },
  { category: 'Hydration', revenue: 4800 },
];

/**
 * Mock data provider that simulates host-side query execution.
 * Returns different data based on the requested fields.
 */
function createMockFetcher() {
  const fetcher = vi.fn(
    (request: { datasetRef: string; fields: Record<string, string | string[] | undefined> }) => {
      const { fields } = request;
      const xField = fields.xField as string | undefined;
      const yFields = fields.yFields as string[] | undefined;
      const yField = yFields?.[0] ?? (fields.yField as string | undefined);

      // Route based on which fields are requested
      if (xField === 'month' && yField === 'revenue') {
        return REVENUE_BY_MONTH;
      }
      if (xField === 'month' && yField === 'units') {
        return UNITS_BY_MONTH;
      }
      if (xField === 'category') {
        return REVENUE_BY_CATEGORY;
      }
      // Fallback
      return REVENUE_BY_MONTH;
    }
  );
  return fetcher;
}

// ─── Helpers ─────────────────────────────────────────────────

function getLastWidgetProps() {
  expect(mockChartWidget).toHaveBeenCalled();
  return mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1][0];
}

function renderWithProvider(
  fetcher: ReturnType<typeof createMockFetcher>,
  widgetType: string,
  puckProps: Record<string, unknown>,
) {
  mockChartWidget.mockClear();
  return render(
    React.createElement(
      PreviewDataProvider,
      { fetchPreviewData: fetcher },
      React.createElement(ChartPreview, {
        widgetType,
        puckProps: { title: 'Test', datasetRef: 'sqlite-orders', ...puckProps },
        fallbackIcon: '📊',
      })
    )
  );
}

// ─── Test suites ─────────────────────────────────────────────

describe('ChartPreview — live data from host', () => {
  beforeEach(() => {
    mockChartWidget.mockClear();
  });

  describe('without PreviewDataProvider (backward compat)', () => {
    it('still renders using sample data', () => {
      render(
        React.createElement(ChartPreview, {
          widgetType: 'line-chart',
          puckProps: { title: 'Test', yAxisField: 'revenue', xAxisField: 'month' },
          fallbackIcon: '📊',
        })
      );
      const props = getLastWidgetProps();
      // Sample data has 6 rows with small numbers (120–230)
      expect(props.data.length).toBe(6);
      expect(props.data[0].revenue).toBeLessThan(1000);
    });
  });

  describe('with PreviewDataProvider', () => {
    it('calls fetchPreviewData with dataset ref and field config', async () => {
      const fetcher = createMockFetcher();
      await act(async () => {
        renderWithProvider(fetcher, 'line-chart', {
          xAxisField: 'month',
          yAxisField: 'revenue',
        });
      });

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(1);
      });

      const call = fetcher.mock.calls[0][0];
      expect(call.datasetRef).toBe('sqlite-orders');
      expect(call.fields.xField).toBe('month');
    });

    it('passes fetched data (not sample data) to chart widget', async () => {
      const fetcher = createMockFetcher();
      await act(async () => {
        renderWithProvider(fetcher, 'line-chart', {
          xAxisField: 'month',
          yAxisField: 'revenue',
        });
      });

      await waitFor(() => {
        const props = getLastWidgetProps();
        // Real data has values in thousands (12450, 15800, ...)
        expect(props.data[0].revenue).toBe(12450);
      });

      const props = getLastWidgetProps();
      expect(props.data).toHaveLength(6);
      expect(props.data.map((r: Record<string, unknown>) => r.revenue)).toEqual([
        12450, 15800, 18200, 14700, 21300, 24100,
      ]);
    });

    it('changing Y-axis from revenue to units produces DIFFERENT values', async () => {
      const fetcher = createMockFetcher();

      // First render with revenue
      let result: ReturnType<typeof render>;
      await act(async () => {
        result = renderWithProvider(fetcher, 'line-chart', {
          xAxisField: 'month',
          yAxisField: 'revenue',
        });
      });

      await waitFor(() => {
        expect(getLastWidgetProps().data[0].revenue).toBe(12450);
      });

      const revenueValues = getLastWidgetProps().data.map(
        (r: Record<string, unknown>) => r.revenue
      );

      // Re-render with units
      mockChartWidget.mockClear();
      await act(async () => {
        result!.rerender(
          React.createElement(
            PreviewDataProvider,
            { fetchPreviewData: fetcher },
            React.createElement(ChartPreview, {
              widgetType: 'line-chart',
              puckProps: {
                title: 'Test',
                datasetRef: 'sqlite-orders',
                xAxisField: 'month',
                yAxisField: 'units',
              },
              fallbackIcon: '📊',
            })
          )
        );
      });

      await waitFor(() => {
        const props = getLastWidgetProps();
        return expect(props.data[0]).toHaveProperty('units');
      });

      const unitsProps = getLastWidgetProps();
      const unitValues = unitsProps.data.map(
        (r: Record<string, unknown>) => r.units
      );

      // The actual assertion: values MUST be different
      expect(unitValues).not.toEqual(revenueValues);
      expect(unitValues).toEqual([24, 28, 35, 21, 48, 52]);
    });

    it('changing X-axis from month to category produces different x values', async () => {
      const fetcher = createMockFetcher();

      await act(async () => {
        renderWithProvider(fetcher, 'line-chart', {
          xAxisField: 'category',
          yAxisField: 'revenue',
        });
      });

      await waitFor(() => {
        expect(fetcher).toHaveBeenCalled();
        const props = getLastWidgetProps();
        expect(props.data[0]).toHaveProperty('category');
      });

      const props = getLastWidgetProps();
      // Should have category-based data, not month-based
      expect(props.data[0].category).toBe('Footwear');
      expect(props.data).toHaveLength(4); // 4 categories, not 6 months
    });
  });
});
