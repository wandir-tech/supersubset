import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import type { LogicalQuery, QueryAdapter, QueryResult } from '@supersubset/data-model';
import type { DashboardDefinition } from '@supersubset/schema';
import { SupersubsetRenderer } from '../src/components/SupersubsetRenderer';
import { createWidgetRegistry, type WidgetProps } from '../src/widgets/registry';

function ClickableWidget({ widgetId, onEvent }: WidgetProps) {
  return createElement(
    'button',
    {
      type: 'button',
      onClick: () =>
        onEvent?.({
          type: 'click',
          widgetId,
          payload: { region: 'East' },
        }),
    },
    'Trigger interaction',
  );
}

function ChartTriggerWidget({ widgetId, onEvent }: WidgetProps) {
  return createElement(
    'button',
    {
      type: 'button',
      onClick: () =>
        onEvent?.({
          type: 'click',
          widgetId,
          payload: { region: 'North' },
        }),
    },
    'Filter by North',
  );
}

function QueryProbeWidget({ data, loading, error }: WidgetProps) {
  if (loading) {
    return createElement('div', { 'data-testid': 'widget-query-probe' }, 'loading');
  }

  if (error) {
    return createElement('div', { 'data-testid': 'widget-query-probe' }, `error:${error.message}`);
  }

  return createElement(
    'div',
    { 'data-testid': 'widget-query-probe' },
    String(data?.[0]?.revenue ?? 'no-data'),
  );
}

function createQueryResult(revenue: number): QueryResult {
  return {
    columns: [{ fieldId: 'revenue', label: 'Revenue', dataType: 'number' }],
    rows: [{ revenue }],
    totalRows: 1,
  };
}

afterEach(() => {
  cleanup();
});

const dashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'interaction-dashboard',
  title: 'Interaction Dashboard',
  interactions: [
    {
      id: 'navigate-on-click',
      trigger: { type: 'click', sourceWidgetId: 'widget-1' },
      action: { type: 'navigate', target: { kind: 'page', pageId: 'page-detail' } },
    },
  ],
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
          children: ['widget-node'],
          parentId: 'root',
          meta: { columns: 12 },
        },
        'widget-node': {
          id: 'widget-node',
          type: 'widget',
          children: [],
          parentId: 'grid-main',
          meta: { widgetRef: 'widget-1', width: 12 },
        },
      },
      widgets: [
        {
          id: 'widget-1',
          type: 'clickable-widget',
          title: 'Clickable Widget',
          config: {},
        },
      ],
    },
    {
      id: 'page-detail',
      title: 'Detail',
      rootNodeId: 'detail-root',
      layout: {
        'detail-root': { id: 'detail-root', type: 'root', children: ['detail-grid'], meta: {} },
        'detail-grid': {
          id: 'detail-grid',
          type: 'grid',
          children: [],
          parentId: 'detail-root',
          meta: { columns: 12 },
        },
      },
      widgets: [],
    },
  ],
};

describe('SupersubsetRenderer interactions', () => {
  it('routes widget click events through the interaction engine', () => {
    const onNavigate = vi.fn();
    const onWidgetEvent = vi.fn();
    const registry = createWidgetRegistry([['clickable-widget', ClickableWidget]]);

    render(
      createElement(SupersubsetRenderer, {
        definition: dashboard,
        registry,
        onNavigate,
        onWidgetEvent,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger interaction' }));

    expect(onNavigate).toHaveBeenCalledWith({
      target: { kind: 'page', pageId: 'page-detail' },
      filterState: { region: 'East' },
    });
    expect(onWidgetEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'click',
        widgetId: 'widget-1',
        payload: { region: 'East' },
      }),
    );
  });

  it('re-executes query-bound widgets when a chart click sets a cross-filter', async () => {
    const execute = vi.fn<QueryAdapter['execute']>().mockImplementation(async (query) => {
      const activeRegion = query.filters?.find((filter) => filter.fieldId === 'region')?.value;
      return createQueryResult(activeRegion === 'North' ? 6400 : 23000);
    });

    const queryAdapter: QueryAdapter = {
      name: 'mock-query',
      execute,
    };

    const registry = createWidgetRegistry([
      ['mock-chart', ChartTriggerWidget],
      ['query-probe', QueryProbeWidget],
    ]);

    const crossFilterDashboard: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'cross-filter-dashboard',
      title: 'Cross Filter Dashboard',
      interactions: [
        {
          id: 'cross-filter-region',
          trigger: { type: 'click', sourceWidgetId: 'chart-region-sales' },
          action: { type: 'filter', fieldRef: 'region', targetWidgetIds: ['kpi-total-revenue'] },
        },
      ],
      pages: [
        {
          id: 'overview',
          title: 'Overview',
          rootNodeId: 'root',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: ['chart-node', 'kpi-node'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'chart-node': {
              id: 'chart-node',
              type: 'widget',
              children: [],
              parentId: 'grid-main',
              meta: { widgetRef: 'chart-region-sales', width: 6 },
            },
            'kpi-node': {
              id: 'kpi-node',
              type: 'widget',
              children: [],
              parentId: 'grid-main',
              meta: { widgetRef: 'kpi-total-revenue', width: 6 },
            },
          },
          widgets: [
            {
              id: 'chart-region-sales',
              type: 'mock-chart',
              title: 'Region Sales',
              config: {},
            },
            {
              id: 'kpi-total-revenue',
              type: 'query-probe',
              title: 'Total Revenue',
              config: {},
              dataBinding: {
                datasetRef: 'sales',
                fields: [{ role: 'value', fieldRef: 'revenue' }],
              },
            },
          ],
        },
      ],
    };

    render(
      createElement(SupersubsetRenderer, {
        definition: crossFilterDashboard,
        registry,
        queryAdapter,
      }),
    );

    await waitFor(() => {
      expect(execute).toHaveBeenNthCalledWith(1, {
        datasetId: 'sales',
        fields: [{ fieldId: 'revenue' }],
      } satisfies LogicalQuery);
    });

    await waitFor(() => {
      expect(screen.getByTestId('widget-query-probe').textContent).toBe('23000');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Filter by North' }));

    await waitFor(() => {
      expect(execute).toHaveBeenNthCalledWith(2, {
        datasetId: 'sales',
        fields: [{ fieldId: 'revenue' }],
        filters: [{ fieldId: 'region', operator: 'eq', value: 'North' }],
      } satisfies LogicalQuery);
    });

    await waitFor(() => {
      expect(screen.getByTestId('widget-query-probe').textContent).toBe('6400');
    });
  });
});
