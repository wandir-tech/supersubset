/**
 * Tests that ChartPreview uses real data from PreviewDataProvider
 * instead of static sample data, and that changing field selections
 * causes actually different data values to reach the chart widget.
 *
 * This is the key correctness test: we're plotting data, not painting screens.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';

// ─── Mock chart widgets ──────────────────────────────────────

const mockChartWidget = vi.fn((props: Record<string, unknown>) =>
  React.createElement('div', {
    'data-testid': `chart-${props.widgetType}`,
  }),
);

vi.mock('@supersubset/charts-echarts', () => ({
  LineChartWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'line-chart' }),
  BarChartWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'bar-chart' }),
  PieChartWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'pie-chart' }),
  ScatterChartWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'scatter-chart' }),
  AreaChartWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'area-chart' }),
  ComboChartWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'combo-chart' }),
  HeatmapWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'heatmap' }),
  RadarChartWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'radar-chart' }),
  FunnelChartWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'funnel-chart' }),
  TreemapWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'treemap' }),
  SankeyWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'sankey' }),
  WaterfallWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'waterfall' }),
  BoxPlotWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'box-plot' }),
  GaugeWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'gauge' }),
  TableWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'table' }),
  KPICardWidget: (props: Record<string, unknown>) =>
    mockChartWidget({ ...props, widgetType: 'kpi-card' }),
}));

vi.mock('@supersubset/runtime', () => ({}));

import { ChartPreview } from '../src/preview/ChartPreview';
import { PreviewDataProvider, type PreviewDataRequest } from '../src/context/PreviewDataContext';

// ─── Simulated "database" ────────────────────────────────────
// This mirrors what a real host app would return from SQL queries.

const DATABASE_ROWS = [
  { month: 'Jan', revenue: 8500, orders: 42, units: 120, category: 'Apparel' },
  { month: 'Feb', revenue: 9200, orders: 48, units: 135, category: 'Footwear' },
  { month: 'Mar', revenue: 7800, orders: 38, units: 98, category: 'Accessories' },
  { month: 'Apr', revenue: 11000, orders: 55, units: 160, category: 'Apparel' },
  { month: 'May', revenue: 10500, orders: 52, units: 145, category: 'Footwear' },
  { month: 'Jun', revenue: 12300, orders: 61, units: 178, category: 'Accessories' },
];

/**
 * Simulated host data fetcher — returns rows with only the requested fields.
 * This is what a real host app would do: run a SQL query and return matching columns.
 */
function mockFetchPreviewData(request: PreviewDataRequest): Record<string, unknown>[] {
  const { fields } = request;

  // Collect all requested field names into a flat set
  const requestedFields = new Set<string>();
  for (const val of Object.values(fields)) {
    if (typeof val === 'string') requestedFields.add(val);
    if (Array.isArray(val)) val.forEach((v) => requestedFields.add(v));
  }

  // Project only requested columns from the "database"
  return DATABASE_ROWS.map((row) => {
    const projected: Record<string, unknown> = {};
    for (const field of requestedFields) {
      if (field in row) {
        projected[field] = (row as Record<string, unknown>)[field];
      }
    }
    return projected;
  });
}

// ─── Helpers ─────────────────────────────────────────────────

function renderWithProvider(
  widgetType: string,
  puckProps: Record<string, unknown>,
  fetcher: (req: PreviewDataRequest) => Record<string, unknown>[],
) {
  mockChartWidget.mockClear();
  const fetchSpy = vi.fn(fetcher);

  let result: ReturnType<typeof render>;
  act(() => {
    result = render(
      React.createElement(
        PreviewDataProvider,
        { fetchPreviewData: fetchSpy },
        React.createElement(ChartPreview, {
          widgetType,
          puckProps: { title: 'Test', datasetRef: 'test-orders', ...puckProps },
          fallbackIcon: '📊',
        }),
      ),
    );
  });

  const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1];
  const widgetData = lastCall?.[0]?.data as Record<string, unknown>[] | undefined;
  const widgetConfig = lastCall?.[0]?.config as Record<string, unknown> | undefined;

  return { fetchSpy, widgetData, widgetConfig, result: result! };
}

function renderWithoutProvider(widgetType: string, puckProps: Record<string, unknown>) {
  mockChartWidget.mockClear();
  render(
    React.createElement(ChartPreview, {
      widgetType,
      puckProps: { title: 'Test', ...puckProps },
      fallbackIcon: '📊',
    }),
  );
  const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1];
  return lastCall?.[0]?.data as Record<string, unknown>[];
}

// ─── Tests ───────────────────────────────────────────────────

describe('ChartPreview — real data from host', () => {
  describe('data provider integration', () => {
    it('calls fetchPreviewData with the correct dataset ref and fields', () => {
      const { fetchSpy } = renderWithProvider(
        'line-chart',
        {
          xAxisField: 'month',
          yAxisField: 'revenue',
          aggregation: 'avg',
        },
        mockFetchPreviewData,
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const request = fetchSpy.mock.calls[0][0] as PreviewDataRequest;
      expect(request.datasetRef).toBe('test-orders');
      expect(request.fields.xField).toBe('month');
      expect(request.fields.yFields).toEqual(['revenue']);
      expect(request.fields.metricFields).toEqual(['revenue']);
      expect(request.fields.aggregation).toBe('avg');
    });

    it('passes host data to chart widget instead of sample data', () => {
      const { widgetData } = renderWithProvider(
        'line-chart',
        {
          xAxisField: 'month',
          yAxisField: 'revenue',
        },
        mockFetchPreviewData,
      );

      // Host returns our DATABASE_ROWS projected to month + revenue
      expect(widgetData).toBeDefined();
      expect(widgetData!.length).toBe(DATABASE_ROWS.length);
      expect(widgetData![0]).toHaveProperty('month', 'Jan');
      expect(widgetData![0]).toHaveProperty('revenue', 8500);

      // These are NOT the sample data values (120, 150, 180...)
      const revenues = widgetData!.map((r) => r.revenue);
      expect(revenues).toEqual([8500, 9200, 7800, 11000, 10500, 12300]);
    });

    it('uses sample data when no provider is present', () => {
      const sampleRows = renderWithoutProvider('line-chart', {
        xAxisField: 'month',
        yAxisField: 'revenue',
      });

      // Sample data has revenue values 120, 150, 180, 140, 200, 230
      const revenues = sampleRows.map((r) => r.revenue);
      expect(revenues).toEqual([120, 150, 180, 140, 200, 230]);
    });

    it('uses sample data when datasetRef is not set', () => {
      mockChartWidget.mockClear();
      const fetchSpy = vi.fn(mockFetchPreviewData);

      act(() => {
        render(
          React.createElement(
            PreviewDataProvider,
            { fetchPreviewData: fetchSpy },
            React.createElement(ChartPreview, {
              widgetType: 'line-chart',
              puckProps: { title: 'Test', xAxisField: 'month', yAxisField: 'revenue' },
              fallbackIcon: '📊',
            }),
          ),
        );
      });

      // Without datasetRef, should NOT call fetchPreviewData
      expect(fetchSpy).not.toHaveBeenCalled();

      // Should fall back to sample data
      const lastCall = mockChartWidget.mock.calls[mockChartWidget.mock.calls.length - 1];
      const data = lastCall?.[0]?.data as Record<string, unknown>[];
      const revenues = data.map((r) => r.revenue);
      expect(revenues).toEqual([120, 150, 180, 140, 200, 230]);
    });
  });

  describe('line chart — changing Y axis shows different data', () => {
    it('revenue data values differ from units data values', () => {
      // Step 1: Render with yAxisField = revenue
      const { widgetData: revenueData } = renderWithProvider(
        'line-chart',
        {
          xAxisField: 'month',
          yAxisField: 'revenue',
        },
        mockFetchPreviewData,
      );

      const revenueValues = revenueData!.map((r) => r.revenue);
      expect(revenueValues).toEqual([8500, 9200, 7800, 11000, 10500, 12300]);

      // Step 2: Render with yAxisField = units
      const { widgetData: unitsData } = renderWithProvider(
        'line-chart',
        {
          xAxisField: 'month',
          yAxisField: 'units',
        },
        mockFetchPreviewData,
      );

      const unitsValues = unitsData!.map((r) => r.units);
      expect(unitsValues).toEqual([120, 135, 98, 160, 145, 178]);

      // KEY ASSERTION: the two datasets are NOT the same
      expect(revenueValues).not.toEqual(unitsValues);
    });

    it('the data rows contain the correct field key for the selected Y axis', () => {
      const { widgetData: revenueData, widgetConfig: revenueConfig } = renderWithProvider(
        'line-chart',
        {
          xAxisField: 'month',
          yAxisField: 'revenue',
        },
        mockFetchPreviewData,
      );

      expect(revenueConfig!.yFields).toEqual(['revenue']);
      expect(revenueData![0]).toHaveProperty('revenue');

      const { widgetData: unitsData, widgetConfig: unitsConfig } = renderWithProvider(
        'line-chart',
        {
          xAxisField: 'month',
          yAxisField: 'units',
        },
        mockFetchPreviewData,
      );

      expect(unitsConfig!.yFields).toEqual(['units']);
      expect(unitsData![0]).toHaveProperty('units');
    });
  });

  describe('line chart — changing X axis shows different data', () => {
    it('changing xAxisField from month to category returns category data', () => {
      const { widgetData: monthData, widgetConfig: monthConfig } = renderWithProvider(
        'line-chart',
        {
          xAxisField: 'month',
          yAxisField: 'revenue',
        },
        mockFetchPreviewData,
      );

      expect(monthConfig!.xField).toBe('month');
      const months = monthData!.map((r) => r.month);
      expect(months).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);

      const { widgetData: catData, widgetConfig: catConfig } = renderWithProvider(
        'line-chart',
        {
          xAxisField: 'category',
          yAxisField: 'revenue',
        },
        mockFetchPreviewData,
      );

      expect(catConfig!.xField).toBe('category');
      const categories = catData!.map((r) => r.category);
      expect(categories).toEqual([
        'Apparel',
        'Footwear',
        'Accessories',
        'Apparel',
        'Footwear',
        'Accessories',
      ]);

      // Months and categories must be different
      expect(months).not.toEqual(categories);
    });
  });

  describe('field request correctness', () => {
    it('requests the right fields for a bar chart', () => {
      const { fetchSpy } = renderWithProvider(
        'bar-chart',
        {
          xAxisField: 'category',
          yAxisField: 'revenue',
        },
        mockFetchPreviewData,
      );

      const request = fetchSpy.mock.calls[0][0] as PreviewDataRequest;
      expect(request.fields.xField).toBe('category');
      expect(request.fields.yFields).toEqual(['revenue']);
    });

    it('includes seriesField when specified', () => {
      const { fetchSpy } = renderWithProvider(
        'line-chart',
        {
          xAxisField: 'month',
          yAxisField: 'revenue',
          seriesField: 'category',
        },
        mockFetchPreviewData,
      );

      const request = fetchSpy.mock.calls[0][0] as PreviewDataRequest;
      expect(request.fields.seriesField).toBe('category');
    });
  });
});
