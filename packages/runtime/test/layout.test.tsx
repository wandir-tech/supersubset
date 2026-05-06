import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { LayoutRenderer } from '../src/layout/LayoutRenderer';
import { createWidgetRegistry } from '../src/widgets/registry';
import type { WidgetProps } from '../src/widgets/registry';
import type { FilterDefinition, LayoutMap, WidgetDefinition } from '@supersubset/schema';
import type { QueryAdapter, QueryResult } from '@supersubset/data-model';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createQueryResult(revenue: number): QueryResult {
  return {
    columns: [{ fieldId: 'revenue', label: 'Revenue', dataType: 'number' }],
    rows: [{ revenue }],
    totalRows: 1,
  };
}

// Mock widget component
function MockWidget({ title, widgetType }: WidgetProps) {
  return <div data-testid={`widget-${widgetType}`}>{title ?? widgetType}</div>;
}

function QueryProbeWidget({ data, loading, error }: WidgetProps) {
  if (loading) {
    return <div data-testid="widget-query-probe">loading</div>;
  }

  if (error) {
    return <div data-testid="widget-query-probe">error:{error.message}</div>;
  }

  return <div data-testid="widget-query-probe">{String(data?.[0]?.revenue ?? 'no-data')}</div>;
}

function AlertRuleProbeWidget({ data, loading, error }: WidgetProps) {
  if (loading) {
    return <div data-testid="widget-alert-rule-probe">loading</div>;
  }

  if (error) {
    return <div data-testid="widget-alert-rule-probe">error:{error.message}</div>;
  }

  const firstRow = data?.[0];

  return (
    <div data-testid="widget-alert-rule-probe">
      {`${data?.length ?? 0}:${String(firstRow?.alert_title ?? 'none')}:${String(firstRow?.severity ?? 'none')}`}
    </div>
  );
}

const registry = createWidgetRegistry([
  ['kpi-card', MockWidget],
  ['line-chart', MockWidget],
  ['query-probe', QueryProbeWidget],
  ['alerts', AlertRuleProbeWidget],
]);

afterEach(() => {
  cleanup();
});

describe('LayoutRenderer', () => {
  it('renders a simple grid with one widget', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': {
        id: 'grid-1',
        type: 'grid',
        children: ['w-1'],
        parentId: 'root',
        meta: { columns: 12 },
      },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'kpi-1', width: 4, height: 50 },
      },
    };
    const widgets: WidgetDefinition[] = [
      { id: 'kpi-1', type: 'kpi-card', title: 'Revenue', config: {} },
    ];

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={widgets} registry={registry} />,
    );

    expect(container.querySelector('.ss-layout-root')).toBeTruthy();
    expect(container.querySelector('.ss-grid')).toBeTruthy();
    expect(container.querySelector('.ss-widget')).toBeTruthy();
    expect(screen.getByTestId('widget-kpi-card')).toBeTruthy();
    expect(screen.getByText('Revenue')).toBeTruthy();
  });

  it('renders row with multiple widgets using width proportions', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['row-1'], parentId: 'root', meta: {} },
      'row-1': { id: 'row-1', type: 'row', children: ['w-1', 'w-2'], parentId: 'grid-1', meta: {} },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'row-1',
        meta: { widgetRef: 'chart-1', width: 8 },
      },
      'w-2': {
        id: 'w-2',
        type: 'widget',
        children: [],
        parentId: 'row-1',
        meta: { widgetRef: 'chart-2', width: 4 },
      },
    };
    const widgets: WidgetDefinition[] = [
      { id: 'chart-1', type: 'line-chart', title: 'Sales Trend', config: {} },
      { id: 'chart-2', type: 'kpi-card', title: 'Total', config: {} },
    ];

    render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={widgets} registry={registry} />,
    );

    expect(screen.getByText('Sales Trend')).toBeTruthy();
    expect(screen.getByText('Total')).toBeTruthy();
  });

  it('shows message for missing widget ref', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'nonexistent' },
      },
    };

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={[]} registry={registry} />,
    );

    expect(container.querySelector('.ss-widget-missing')).toBeTruthy();
  });

  it('shows message for unregistered widget type', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'x-1' },
      },
    };
    const widgets: WidgetDefinition[] = [{ id: 'x-1', type: 'unknown-chart-type', config: {} }];

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={widgets} registry={registry} />,
    );

    expect(container.querySelector('.ss-widget-unregistered')).toBeTruthy();
  });

  it('renders header and divider components', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': {
        id: 'grid-1',
        type: 'grid',
        children: ['h-1', 'div-1'],
        parentId: 'root',
        meta: {},
      },
      'h-1': {
        id: 'h-1',
        type: 'header',
        children: [],
        parentId: 'grid-1',
        meta: { text: 'Dashboard Title', headerSize: 'large' },
      },
      'div-1': { id: 'div-1', type: 'divider', children: [], parentId: 'grid-1', meta: {} },
    };

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={[]} registry={registry} />,
    );

    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('h1')?.textContent).toBe('Dashboard Title');
    expect(container.querySelector('hr')).toBeTruthy();
  });

  it('renders missing root node message', () => {
    const { container } = render(
      <LayoutRenderer layout={{}} rootNodeId="nonexistent" widgets={[]} registry={registry} />,
    );

    expect(container.querySelector('.ss-layout-error')).toBeTruthy();
  });

  it('renders spacer with correct height', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['sp-1'], parentId: 'root', meta: {} },
      'sp-1': {
        id: 'sp-1',
        type: 'spacer',
        children: [],
        parentId: 'grid-1',
        meta: { height: 48 },
      },
    };

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={[]} registry={registry} />,
    );

    const spacer = container.querySelector('.ss-spacer');
    expect(spacer).toBeTruthy();
  });

  it('renders markdown content blocks emitted by the designer', () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': {
        id: 'grid-1',
        type: 'grid',
        children: ['markdown-1'],
        parentId: 'root',
        meta: {},
      },
      'markdown-1': {
        id: 'markdown-1',
        type: 'markdown',
        children: [],
        parentId: 'grid-1',
        meta: { text: 'Review the chart cookbook for field-mapping examples.' },
      },
    };

    const { container } = render(
      <LayoutRenderer layout={layout} rootNodeId="root" widgets={[]} registry={registry} />,
    );

    expect(container.querySelector('.ss-markdown')).toBeTruthy();
    expect(screen.getByText('Review the chart cookbook for field-mapping examples.')).toBeTruthy();
  });

  it('executes widget queries via the host query adapter and passes rows to widgets', async () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'query-1' },
      },
    };
    const widgets: WidgetDefinition[] = [
      {
        id: 'query-1',
        type: 'query-probe',
        title: 'Query Probe',
        config: {},
        dataBinding: {
          datasetRef: 'sales',
          fields: [{ role: 'value', fieldRef: 'revenue' }],
        },
      },
    ];

    const queryAdapter: QueryAdapter = {
      name: 'mock-query',
      execute: vi.fn().mockResolvedValue({
        columns: [{ fieldId: 'revenue', label: 'Revenue', dataType: 'number' }],
        rows: [{ revenue: 123 }],
        totalRows: 1,
      }),
    };

    render(
      <LayoutRenderer
        layout={layout}
        rootNodeId="root"
        widgets={widgets}
        registry={registry}
        queryAdapter={queryAdapter}
      />,
    );

    await waitFor(() => {
      expect(queryAdapter.execute).toHaveBeenCalledWith({
        datasetId: 'sales',
        fields: [{ fieldId: 'revenue' }],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('widget-query-probe').textContent).toBe('123');
    });
  });

  it('executes structured alert rules via the host query adapter and synthesizes alert rows', async () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'alerts-1' },
      },
    };
    const widgets: WidgetDefinition[] = [
      {
        id: 'alerts-1',
        type: 'alerts',
        title: 'Alert Rule Probe',
        config: {
          titleField: 'alert_title',
          messageField: 'alert_message',
          severityField: 'severity',
          alertRule: {
            mode: 'structured',
            metricFieldRef: 'revenue',
            aggregation: 'sum',
            operator: 'gte',
            threshold: 1000,
            alert: {
              title: 'Revenue threshold breached',
              message: 'Revenue crossed the configured threshold.',
              severity: 'warning',
            },
          },
        },
        dataBinding: {
          datasetRef: 'sales',
          fields: [],
        },
      },
    ];

    const queryAdapter: QueryAdapter = {
      name: 'mock-query',
      execute: vi.fn().mockResolvedValue({
        columns: [{ fieldId: 'revenue', label: 'Revenue', dataType: 'number' }],
        rows: [{ revenue: 1200 }],
        totalRows: 1,
      }),
    };

    render(
      <LayoutRenderer
        layout={layout}
        rootNodeId="root"
        widgets={widgets}
        registry={registry}
        queryAdapter={queryAdapter}
      />,
    );

    await waitFor(() => {
      expect(queryAdapter.execute).toHaveBeenCalledWith({
        datasetId: 'sales',
        fields: [{ fieldId: 'revenue', aggregation: 'sum' }],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('widget-alert-rule-probe').textContent).toBe(
        '1:Revenue threshold breached:warning',
      );
    });
  });

  it('does not execute a query for widgets without dataBinding', async () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'query-1' },
      },
    };
    const widgets: WidgetDefinition[] = [
      {
        id: 'query-1',
        type: 'query-probe',
        title: 'Query Probe',
        config: {},
      },
    ];

    const queryAdapter: QueryAdapter = {
      name: 'mock-query',
      execute: vi.fn().mockResolvedValue(createQueryResult(123)),
    };

    render(
      <LayoutRenderer
        layout={layout}
        rootNodeId="root"
        widgets={widgets}
        registry={registry}
        queryAdapter={queryAdapter}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('widget-query-probe').textContent).toBe('no-data');
    });

    expect(queryAdapter.execute).not.toHaveBeenCalled();
  });

  it('compiles scoped filters and aggregations into widget queries', async () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'query-1' },
      },
    };
    const widgets: WidgetDefinition[] = [
      {
        id: 'query-1',
        type: 'query-probe',
        title: 'Query Probe',
        config: {},
        dataBinding: {
          datasetRef: 'sales',
          fields: [{ role: 'value', fieldRef: 'revenue', aggregation: 'sum' }],
        },
      },
    ];
    const filters: FilterDefinition[] = [
      {
        id: 'status',
        title: 'Status',
        type: 'select',
        fieldRef: 'status',
        datasetRef: 'sales',
        operator: 'not_in',
        scope: { type: 'global' },
      },
      {
        id: 'segments',
        title: 'Segments',
        type: 'select',
        fieldRef: 'segment',
        datasetRef: 'sales',
        operator: 'equals',
        scope: { type: 'widgets', widgetIds: ['query-1'] },
      },
      {
        id: 'region',
        title: 'Region',
        type: 'select',
        fieldRef: 'region',
        datasetRef: 'sales',
        operator: 'equals',
        scope: { type: 'page', pageId: 'page-1' },
      },
      {
        id: 'created-at',
        title: 'Created At',
        type: 'date-range',
        fieldRef: 'created_at',
        datasetRef: 'sales',
        operator: 'between',
        scope: { type: 'widgets', widgetIds: ['query-1'] },
      },
      {
        id: 'other-page-region',
        title: 'Other Page Region',
        type: 'select',
        fieldRef: 'other_region',
        datasetRef: 'sales',
        operator: 'equals',
        scope: { type: 'page', pageId: 'page-2' },
      },
      {
        id: 'customer-region',
        title: 'Customer Region',
        type: 'select',
        fieldRef: 'customer_region',
        datasetRef: 'customers',
        operator: 'equals',
        scope: { type: 'widgets', widgetIds: ['query-1'] },
      },
    ];

    const queryAdapter: QueryAdapter = {
      name: 'mock-query',
      execute: vi.fn().mockResolvedValue({
        columns: [{ fieldId: 'revenue', label: 'Revenue', dataType: 'number' }],
        rows: [{ revenue: 123 }],
        totalRows: 1,
      }),
    };

    render(
      <LayoutRenderer
        layout={layout}
        rootNodeId="root"
        widgets={widgets}
        registry={registry}
        activePageId="page-1"
        filters={filters}
        activeFilterValues={[
          { filterId: 'status', value: ['Closed', 'Suppressed'] },
          { filterId: 'segments', value: ['Enterprise', 'SMB'] },
          { filterId: 'region', value: 'EMEA' },
          {
            filterId: 'created-at',
            value: { start: '2024-01-01', end: '2024-01-31' },
          },
          { filterId: 'other-page-region', value: 'APAC' },
          { filterId: 'customer-region', value: 'France' },
        ]}
        queryAdapter={queryAdapter}
      />,
    );

    await waitFor(() => {
      expect(queryAdapter.execute).toHaveBeenCalledWith({
        datasetId: 'sales',
        fields: [{ fieldId: 'revenue', aggregation: 'sum' }],
        filters: [
          {
            fieldId: 'status',
            operator: 'not_in',
            value: ['Closed', 'Suppressed'],
          },
          {
            fieldId: 'segment',
            operator: 'in',
            value: ['Enterprise', 'SMB'],
          },
          {
            fieldId: 'region',
            operator: 'eq',
            value: 'EMEA',
          },
          {
            fieldId: 'created_at',
            operator: 'between',
            value: ['2024-01-01', '2024-01-31'],
          },
        ],
      });
    });
  });

  it('surfaces loading and error states from the host query adapter to widgets', async () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'query-1' },
      },
    };
    const widgets: WidgetDefinition[] = [
      {
        id: 'query-1',
        type: 'query-probe',
        title: 'Query Probe',
        config: {},
        dataBinding: {
          datasetRef: 'sales',
          fields: [{ role: 'value', fieldRef: 'revenue' }],
        },
      },
    ];
    const deferred = createDeferred<QueryResult>();

    const queryAdapter: QueryAdapter = {
      name: 'mock-query',
      execute: vi.fn().mockImplementation(() => deferred.promise),
    };

    render(
      <LayoutRenderer
        layout={layout}
        rootNodeId="root"
        widgets={widgets}
        registry={registry}
        queryAdapter={queryAdapter}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('widget-query-probe').textContent).toBe('loading');
    });

    await act(async () => {
      deferred.reject(new Error('query failed'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('widget-query-probe').textContent).toBe('error:query failed');
    });
  });

  it('re-executes queries when filters change and ignores stale responses', async () => {
    const layout: LayoutMap = {
      root: { id: 'root', type: 'root', children: ['grid-1'], meta: {} },
      'grid-1': { id: 'grid-1', type: 'grid', children: ['w-1'], parentId: 'root', meta: {} },
      'w-1': {
        id: 'w-1',
        type: 'widget',
        children: [],
        parentId: 'grid-1',
        meta: { widgetRef: 'query-1' },
      },
    };
    const widgets: WidgetDefinition[] = [
      {
        id: 'query-1',
        type: 'query-probe',
        title: 'Query Probe',
        config: {},
        dataBinding: {
          datasetRef: 'sales',
          fields: [{ role: 'value', fieldRef: 'revenue' }],
        },
      },
    ];
    const filters: FilterDefinition[] = [
      {
        id: 'region',
        title: 'Region',
        type: 'select',
        fieldRef: 'region',
        datasetRef: 'sales',
        operator: 'equals',
        scope: { type: 'global' },
      },
    ];
    const firstQuery = createDeferred<QueryResult>();
    const secondQuery = createDeferred<QueryResult>();
    const execute = vi
      .fn<QueryAdapter['execute']>()
      .mockImplementationOnce(() => firstQuery.promise)
      .mockImplementationOnce(() => secondQuery.promise);

    const queryAdapter: QueryAdapter = {
      name: 'mock-query',
      execute,
    };

    const { rerender } = render(
      <LayoutRenderer
        layout={layout}
        rootNodeId="root"
        widgets={widgets}
        registry={registry}
        filters={filters}
        activeFilterValues={[{ filterId: 'region', value: 'EMEA' }]}
        queryAdapter={queryAdapter}
      />,
    );

    await waitFor(() => {
      expect(execute).toHaveBeenNthCalledWith(1, {
        datasetId: 'sales',
        fields: [{ fieldId: 'revenue' }],
        filters: [{ fieldId: 'region', operator: 'eq', value: 'EMEA' }],
      });
    });

    rerender(
      <LayoutRenderer
        layout={layout}
        rootNodeId="root"
        widgets={widgets}
        registry={registry}
        filters={filters}
        activeFilterValues={[{ filterId: 'region', value: 'APAC' }]}
        queryAdapter={queryAdapter}
      />,
    );

    await waitFor(() => {
      expect(execute).toHaveBeenNthCalledWith(2, {
        datasetId: 'sales',
        fields: [{ fieldId: 'revenue' }],
        filters: [{ fieldId: 'region', operator: 'eq', value: 'APAC' }],
      });
    });

    await act(async () => {
      secondQuery.resolve(createQueryResult(200));
      await secondQuery.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId('widget-query-probe').textContent).toBe('200');
    });

    await act(async () => {
      firstQuery.resolve(createQueryResult(100));
      await firstQuery.promise;
    });

    expect(screen.getByTestId('widget-query-probe').textContent).toBe('200');
  });
});
