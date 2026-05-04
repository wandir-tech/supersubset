/**
 * Tests for the Puck ↔ Canonical adapter (bidirectional conversion).
 */
import { describe, it, expect } from 'vitest';
import type { Data } from '@puckeditor/core';
import type { DashboardDefinition } from '@supersubset/schema';
import { puckToCanonical, canonicalToPuck } from '../src/adapters/puck-canonical';

describe('puckToCanonical', () => {
  it('converts empty Puck data to a valid DashboardDefinition', () => {
    const puckData: Data = {
      root: { props: { title: 'Test Dashboard' } },
      content: [],
    };

    const result = puckToCanonical(puckData);

    expect(result.schemaVersion).toBe('0.2.0');
    expect(result.title).toBe('Test Dashboard');
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].widgets).toHaveLength(0);
    expect(result.pages[0].layout).toBeDefined();
    expect(result.pages[0].layout['root']).toBeDefined();
    expect(result.pages[0].layout['root'].type).toBe('root');
  });

  it('converts a line chart component to widget + layout', () => {
    const puckData: Data = {
      root: { props: { title: 'Chart Test' } },
      content: [
        {
          type: 'LineChart',
          props: {
            id: 'line-1',
            title: 'Revenue Trend',
            datasetRef: 'sales',
            xAxisField: 'month',
            yAxisField: 'revenue',
            seriesField: '',
            aggregation: 'sum',
            smooth: 'true',
          },
        },
      ],
    };

    const result = puckToCanonical(puckData);
    const page = result.pages[0];

    // Should have one widget
    expect(page.widgets).toHaveLength(1);
    const widget = page.widgets[0];
    expect(widget.id).toBe('line-1');
    expect(widget.type).toBe('line-chart');
    expect(widget.title).toBe('Revenue Trend');

    // Data binding
    expect(widget.dataBinding).toBeDefined();
    expect(widget.dataBinding!.datasetRef).toBe('sales');
    expect(widget.dataBinding!.fields).toHaveLength(2); // x-axis + y-axis
    expect(widget.dataBinding!.fields[0].role).toBe('x-axis');
    expect(widget.dataBinding!.fields[0].fieldRef).toBe('month');
    expect(widget.dataBinding!.fields[1].role).toBe('y-axis');
    expect(widget.dataBinding!.fields[1].aggregation).toBe('sum');

    // Config
    expect(widget.config.smooth).toBe(true);

    // Layout should have root, grid, and widget entry
    expect(page.layout['root']).toBeDefined();
    expect(page.layout['grid-main']).toBeDefined();
    expect(page.layout['layout-line-1']).toBeDefined();
    expect(page.layout['layout-line-1'].type).toBe('widget');
    expect(page.layout['layout-line-1'].meta.widgetRef).toBe('line-1');
  });

  it('converts a content block (Header) to layout node', () => {
    const puckData: Data = {
      root: { props: { title: 'Content Test' } },
      content: [
        {
          type: 'HeaderBlock',
          props: {
            id: 'header-1',
            text: 'My Dashboard',
            size: 'large',
            align: 'center',
          },
        },
      ],
    };

    const result = puckToCanonical(puckData);
    const page = result.pages[0];

    // No widgets — header is a layout node, not a widget
    expect(page.widgets).toHaveLength(0);

    // Layout should have the header
    const headerNode = page.layout['layout-header-1'];
    expect(headerNode).toBeDefined();
    expect(headerNode.type).toBe('header');
    expect(headerNode.meta.text).toBe('My Dashboard');
    expect(headerNode.meta.headerSize).toBe('large');
  });

  it('converts a KPI card with data binding', () => {
    const puckData: Data = {
      root: { props: { title: 'KPI Test' } },
      content: [
        {
          type: 'KPICard',
          props: {
            id: 'kpi-1',
            title: 'Total Revenue',
            datasetRef: 'sales',
            valueField: 'revenue',
            aggregation: 'sum',
            prefix: '$',
            suffix: '',
            comparisonField: 'prev_revenue',
          },
        },
      ],
    };

    const result = puckToCanonical(puckData);
    const widget = result.pages[0].widgets[0];

    expect(widget.type).toBe('kpi-card');
    expect(widget.dataBinding).toBeDefined();
    expect(widget.dataBinding!.fields).toHaveLength(2); // value + comparison
    expect(widget.config.prefix).toBe('$');
  });

  it('converts an alerts widget with field bindings and config', () => {
    const puckData: Data = {
      root: { props: { title: 'Alerts Test' } },
      content: [
        {
          type: 'AlertsWidgetBlock',
          props: {
            id: 'alerts-1',
            title: 'Operations Watchlist',
            datasetRef: 'ops_alerts',
            titleField: 'alert_title',
            messageField: 'alert_message',
            severityField: 'severity',
            timestampField: 'detected_at',
            layout: 'wrap',
            maxItems: 3,
            emptyState: 'placeholder',
            showTimestamp: 'true',
            defaultSeverity: 'warning',
          },
        },
      ],
    };

    const result = puckToCanonical(puckData);
    const widget = result.pages[0].widgets[0];

    expect(widget.type).toBe('alerts');
    expect(widget.dataBinding).toBeDefined();
    expect(widget.dataBinding!.datasetRef).toBe('ops_alerts');
    expect(widget.dataBinding!.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'alert-title', fieldRef: 'alert_title' }),
        expect.objectContaining({ role: 'alert-message', fieldRef: 'alert_message' }),
        expect.objectContaining({ role: 'alert-severity', fieldRef: 'severity' }),
        expect.objectContaining({ role: 'alert-timestamp', fieldRef: 'detected_at' }),
      ]),
    );
    expect(widget.config.layout).toBe('wrap');
    expect(widget.config.titleField).toBe('alert_title');
    expect(widget.config.defaultSeverity).toBe('warning');
  });

  it('respects dashboardId option', () => {
    const puckData: Data = { root: { props: {} }, content: [] };
    const result = puckToCanonical(puckData, { dashboardId: 'my-id' });
    expect(result.id).toBe('my-id');
  });

  it('preserves sibling pages when editing a specific page', () => {
    const baseDashboard: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'multi-page',
      title: 'Multi Page',
      pages: [
        {
          id: 'page-overview',
          title: 'Overview',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: ['header-overview'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'header-overview': {
              id: 'header-overview',
              type: 'header',
              children: [],
              parentId: 'grid-main',
              meta: { text: 'Overview', headerSize: 'large' },
            },
          },
          rootNodeId: 'root',
          widgets: [],
        },
        {
          id: 'page-detail',
          title: 'Detail',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: ['header-detail'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'header-detail': {
              id: 'header-detail',
              type: 'header',
              children: [],
              parentId: 'grid-main',
              meta: { text: 'Detail', headerSize: 'large' },
            },
          },
          rootNodeId: 'root',
          widgets: [],
        },
      ],
    };

    const puckData: Data = {
      root: { props: { title: 'Multi Page' } },
      content: [
        {
          type: 'HeaderBlock',
          props: {
            id: 'detail-header-updated',
            text: 'Updated Detail',
            size: 'large',
          },
        },
      ],
    };

    const result = puckToCanonical(puckData, {
      baseDashboard,
      pageIndex: 1,
      pageId: 'page-detail',
      pageTitle: 'Detail',
    });

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].id).toBe('page-overview');
    expect(result.pages[0].layout['header-overview']).toBeDefined();
    expect(result.pages[1].id).toBe('page-detail');
    expect(result.pages[1].title).toBe('Detail');
    expect(result.pages[1].layout['layout-detail-header-updated']).toBeDefined();
  });

  it('converts multiple chart types', () => {
    const puckData: Data = {
      root: { props: { title: 'Multi Charts' } },
      content: [
        {
          type: 'BarChart',
          props: {
            id: 'bar-1',
            title: 'Sales',
            datasetRef: 'ds',
            xAxisField: 'cat',
            yAxisField: 'val',
            seriesField: '',
            aggregation: 'none',
            orientation: 'vertical',
            stacked: 'false',
          },
        },
        {
          type: 'PieChart',
          props: {
            id: 'pie-1',
            title: 'Share',
            datasetRef: 'ds',
            categoryField: 'cat',
            valueField: 'val',
            aggregation: 'none',
            variant: 'donut',
          },
        },
        {
          type: 'GaugeChart',
          props: {
            id: 'gauge-1',
            title: 'Score',
            datasetRef: 'ds',
            valueField: 'score',
            minValue: 0,
            maxValue: 100,
          },
        },
      ],
    };

    const result = puckToCanonical(puckData);
    expect(result.pages[0].widgets).toHaveLength(3);
    expect(result.pages[0].widgets.map((w) => w.type)).toEqual(['bar-chart', 'pie-chart', 'gauge']);
  });
});

describe('canonicalToPuck', () => {
  it('converts empty dashboard to Puck data', () => {
    const dashboard: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test',
      title: 'Empty Dashboard',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: [],
              parentId: 'root',
              meta: { columns: 12 },
            },
          },
          rootNodeId: 'root',
          widgets: [],
        },
      ],
    };

    const result = canonicalToPuck(dashboard);
    expect(result.root?.props ?? {}).toEqual({});
    expect(result.content).toHaveLength(0);
  });

  it('converts widgets back to Puck content', () => {
    const dashboard: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test',
      title: 'With Charts',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: ['layout-line-1'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'layout-line-1': {
              id: 'layout-line-1',
              type: 'widget',
              children: [],
              parentId: 'grid-main',
              meta: { widgetRef: 'line-1', width: 12 },
            },
          },
          rootNodeId: 'root',
          widgets: [
            {
              id: 'line-1',
              type: 'line-chart',
              title: 'Revenue',
              config: { smooth: 'true' },
              dataBinding: {
                datasetRef: 'sales',
                fields: [
                  { role: 'x-axis', fieldRef: 'month' },
                  { role: 'y-axis', fieldRef: 'revenue', aggregation: 'sum' },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = canonicalToPuck(dashboard);
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('LineChart');
    expect(result.content![0].props.title).toBe('Revenue');
    expect(result.content![0].props.datasetRef).toBe('sales');
    expect(result.content![0].props.xAxisField).toBe('month');
    expect(result.content![0].props.yAxisField).toBe('revenue');
    expect(result.content![0].props.aggregation).toBe('sum');
    expect(result.content![0].props.smooth).toBe('true');
  });

  it('restores alerts widget props from canonical data', () => {
    const dashboard: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test',
      title: 'Alerts Dashboard',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: ['layout-alerts-1'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'layout-alerts-1': {
              id: 'layout-alerts-1',
              type: 'widget',
              children: [],
              parentId: 'grid-main',
              meta: { widgetRef: 'alerts-1', width: 12 },
            },
          },
          rootNodeId: 'root',
          widgets: [
            {
              id: 'alerts-1',
              type: 'alerts',
              title: 'Operations Watchlist',
              config: {
                titleField: 'alert_title',
                messageField: 'alert_message',
                severityField: 'severity',
                timestampField: 'detected_at',
                layout: 'stack',
                maxItems: 4,
                emptyState: 'placeholder',
                showTimestamp: 'true',
                defaultSeverity: 'danger',
              },
              dataBinding: {
                datasetRef: 'ops_alerts',
                fields: [
                  { role: 'alert-title', fieldRef: 'alert_title' },
                  { role: 'alert-message', fieldRef: 'alert_message' },
                  { role: 'alert-severity', fieldRef: 'severity' },
                  { role: 'alert-timestamp', fieldRef: 'detected_at' },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = canonicalToPuck(dashboard);
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('AlertsWidgetBlock');
    expect(result.content![0].props.datasetRef).toBe('ops_alerts');
    expect(result.content![0].props.titleField).toBe('alert_title');
    expect(result.content![0].props.messageField).toBe('alert_message');
    expect(result.content![0].props.severityField).toBe('severity');
    expect(result.content![0].props.timestampField).toBe('detected_at');
    expect(result.content![0].props.defaultSeverity).toBe('danger');
  });

  it('wraps row widget widths into ColumnBlocks when restoring canonical dashboards', () => {
    const dashboard: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test',
      title: 'Viewer Fidelity Dashboard',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: ['row-overview'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'row-overview': {
              id: 'row-overview',
              type: 'row',
              children: ['layout-alerts-1', 'layout-kpi-1'],
              parentId: 'grid-main',
              meta: {},
            },
            'layout-alerts-1': {
              id: 'layout-alerts-1',
              type: 'widget',
              children: [],
              parentId: 'row-overview',
              meta: { widgetRef: 'alerts-1', width: 8 },
            },
            'layout-kpi-1': {
              id: 'layout-kpi-1',
              type: 'widget',
              children: [],
              parentId: 'row-overview',
              meta: { widgetRef: 'kpi-1', width: 4 },
            },
          },
          rootNodeId: 'root',
          widgets: [
            {
              id: 'alerts-1',
              type: 'alerts',
              title: 'Operations Watchlist',
              config: {
                titleField: 'alert_title',
                messageField: 'alert_message',
                severityField: 'severity',
                timestampField: 'detected_at',
                layout: 'wrap',
                maxItems: 3,
                emptyState: 'placeholder',
                showTimestamp: true,
                defaultSeverity: 'warning',
              },
              dataBinding: {
                datasetRef: 'ops_alerts',
                fields: [
                  { role: 'alert-title', fieldRef: 'alert_title' },
                  { role: 'alert-message', fieldRef: 'alert_message' },
                  { role: 'alert-severity', fieldRef: 'severity' },
                  { role: 'alert-timestamp', fieldRef: 'detected_at' },
                ],
              },
            },
            {
              id: 'kpi-1',
              type: 'kpi-card',
              title: 'Orders',
              config: { valueField: 'orders', format: 'compact' },
              dataBinding: {
                datasetRef: 'sales',
                fields: [{ role: 'value', fieldRef: 'orders' }],
              },
            },
          ],
        },
      ],
    };

    const result = canonicalToPuck(dashboard);
    expect(result.content).toHaveLength(1);

    const row = result.content![0] as { type: string; props: Record<string, unknown> };
    expect(row.type).toBe('RowBlock');

    const columns = row.props.content as Array<{ type: string; props: Record<string, unknown> }>;
    expect(columns).toHaveLength(2);
    expect(columns.map((column) => column.type)).toEqual(['ColumnBlock', 'ColumnBlock']);
    expect(columns.map((column) => column.props.span)).toEqual([8, 4]);

    const alerts = (
      columns[0].props.content as Array<{ type: string; props: Record<string, unknown> }>
    )[0];
    expect(alerts.type).toBe('AlertsWidgetBlock');
    expect(alerts.props.layout).toBe('wrap');

    const kpi = (
      columns[1].props.content as Array<{ type: string; props: Record<string, unknown> }>
    )[0];
    expect(kpi.type).toBe('KPICard');
    expect(kpi.props.valueField).toBe('orders');
  });

  it('converts header layout nodes back to Puck content', () => {
    const dashboard: DashboardDefinition = {
      schemaVersion: '0.2.0',
      id: 'test',
      title: 'With Header',
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          layout: {
            root: { id: 'root', type: 'root', children: ['grid-main'], meta: {} },
            'grid-main': {
              id: 'grid-main',
              type: 'grid',
              children: ['header-1'],
              parentId: 'root',
              meta: { columns: 12 },
            },
            'header-1': {
              id: 'header-1',
              type: 'header',
              children: [],
              parentId: 'grid-main',
              meta: { text: 'Dashboard Title', headerSize: 'large' },
            },
          },
          rootNodeId: 'root',
          widgets: [],
        },
      ],
    };

    const result = canonicalToPuck(dashboard);
    expect(result.content).toHaveLength(1);
    expect(result.content![0].type).toBe('HeaderBlock');
    expect(result.content![0].props.text).toBe('Dashboard Title');
    expect(result.content![0].props.size).toBe('large');
  });
});

describe('round-trip: puckToCanonical → canonicalToPuck', () => {
  it('preserves chart data through round-trip', () => {
    const original: Data = {
      root: { props: { title: 'Round-trip Test' } },
      content: [
        {
          type: 'BarChart',
          props: {
            id: 'bar-1',
            title: 'Sales by Region',
            datasetRef: 'sales',
            xAxisField: 'region',
            yAxisField: 'revenue',
            seriesField: '',
            aggregation: 'sum',
            orientation: 'vertical',
            stacked: 'false',
          },
        },
      ],
    };

    const canonical = puckToCanonical(original);
    const restored = canonicalToPuck(canonical);

    expect(restored.content).toHaveLength(1);
    expect(restored.content![0].type).toBe('BarChart');
    expect(restored.content![0].props.title).toBe('Sales by Region');
    expect(restored.content![0].props.datasetRef).toBe('sales');
    expect(restored.content![0].props.xAxisField).toBe('region');
    expect(restored.content![0].props.yAxisField).toBe('revenue');
    expect(restored.content![0].props.aggregation).toBe('sum');
    expect(restored.content![0].props.orientation).toBe('vertical');
    expect(restored.content![0].props.stacked).toBe('false');
  });
});
