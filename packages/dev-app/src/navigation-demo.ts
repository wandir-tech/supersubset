import type { DashboardDefinition } from '@supersubset/schema';

export interface DashboardSwitchingDemo {
  dashboards: DashboardDefinition[];
  initialDashboardId: string;
}

const pageDemoTheme = {
  type: 'inline' as const,
  colors: {
    primary: '#1677ff',
    chartPalette: ['#1677ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d'],
  },
};

const executiveTheme = {
  type: 'inline' as const,
  colors: {
    primary: '#1d4ed8',
    chartPalette: ['#1d4ed8', '#0f766e', '#f59e0b', '#ef4444', '#7c3aed'],
  },
};

const operationsTheme = {
  type: 'inline' as const,
  colors: {
    primary: '#0f766e',
    chartPalette: ['#0f766e', '#14b8a6', '#f59e0b', '#dc2626', '#1d4ed8'],
  },
};

export const pageNavigationDemoDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'demo-pages-workbook',
  title: 'Regional Sales Workbook',
  description: 'One dashboard with two pages that share filters, theme, and interaction state.',
  defaults: {
    activePage: 'page-overview',
  },
  filters: [
    {
      id: 'filter-region',
      title: 'Region',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    },
    {
      id: 'filter-category',
      title: 'Category',
      type: 'select',
      fieldRef: 'category',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    },
  ],
  interactions: [
    {
      id: 'pages-click-to-detail',
      trigger: { type: 'click', sourceWidgetId: 'pages-chart-region-sales' },
      action: { type: 'navigate', target: { kind: 'page', pageId: 'page-detail' } },
    },
  ],
  pages: [
    {
      id: 'page-overview',
      title: 'Overview',
      rootNodeId: 'pages-root',
      layout: {
        'pages-root': { id: 'pages-root', type: 'root', children: ['pages-grid'], meta: {} },
        'pages-grid': {
          id: 'pages-grid',
          type: 'grid',
          children: ['pages-header', 'pages-note-row', 'pages-kpi-row', 'pages-chart-row'],
          parentId: 'pages-root',
          meta: { columns: 12 },
        },
        'pages-header': {
          id: 'pages-header',
          type: 'header',
          children: [],
          parentId: 'pages-grid',
          meta: { text: 'Single Dashboard, Multiple Pages', headerSize: 'large' },
        },
        'pages-note-row': {
          id: 'pages-note-row',
          type: 'row',
          children: ['pages-note-widget'],
          parentId: 'pages-grid',
          meta: {},
        },
        'pages-note-widget': {
          id: 'pages-note-widget',
          type: 'widget',
          children: [],
          parentId: 'pages-note-row',
          meta: { widgetRef: 'pages-note', width: 12, height: 96 },
        },
        'pages-kpi-row': {
          id: 'pages-kpi-row',
          type: 'row',
          children: ['pages-kpi-revenue-host', 'pages-kpi-orders-host'],
          parentId: 'pages-grid',
          meta: {},
        },
        'pages-kpi-revenue-host': {
          id: 'pages-kpi-revenue-host',
          type: 'widget',
          children: [],
          parentId: 'pages-kpi-row',
          meta: { widgetRef: 'pages-kpi-revenue', width: 6, height: 120 },
        },
        'pages-kpi-orders-host': {
          id: 'pages-kpi-orders-host',
          type: 'widget',
          children: [],
          parentId: 'pages-kpi-row',
          meta: { widgetRef: 'pages-kpi-orders', width: 6, height: 120 },
        },
        'pages-chart-row': {
          id: 'pages-chart-row',
          type: 'row',
          children: ['pages-region-chart-host', 'pages-trend-chart-host'],
          parentId: 'pages-grid',
          meta: {},
        },
        'pages-region-chart-host': {
          id: 'pages-region-chart-host',
          type: 'widget',
          children: [],
          parentId: 'pages-chart-row',
          meta: { widgetRef: 'pages-chart-region-sales', width: 5, height: 320 },
        },
        'pages-trend-chart-host': {
          id: 'pages-trend-chart-host',
          type: 'widget',
          children: [],
          parentId: 'pages-chart-row',
          meta: { widgetRef: 'pages-chart-revenue-trend', width: 7, height: 320 },
        },
      },
      widgets: [
        {
          id: 'pages-note',
          type: 'markdown',
          title: '',
          config: {
            content:
              'A page is another canvas inside the same dashboard document. These two pages share the same dashboard id, filters, interactions, theme, and saved state. Click **Sales by Region** to jump to the detail page.',
          },
        },
        {
          id: 'pages-kpi-revenue',
          type: 'kpi-card',
          title: 'Revenue',
          config: { valueField: 'revenue', comparisonField: 'prevRevenue', format: 'compact', prefix: '$' },
        },
        {
          id: 'pages-kpi-orders',
          type: 'kpi-card',
          title: 'Orders',
          config: { valueField: 'orders', comparisonField: 'prevOrders', format: 'compact' },
        },
        {
          id: 'pages-chart-region-sales',
          type: 'bar-chart',
          title: 'Sales by Region',
          config: { xField: 'region', yFields: ['revenue'], horizontal: true },
        },
        {
          id: 'pages-chart-revenue-trend',
          type: 'line-chart',
          title: 'Revenue Trend',
          config: { xField: 'month', yFields: ['revenue', 'cost'], smooth: true },
        },
      ],
    },
    {
      id: 'page-detail',
      title: 'Region Detail',
      rootNodeId: 'page-detail-root',
      layout: {
        'page-detail-root': { id: 'page-detail-root', type: 'root', children: ['page-detail-grid'], meta: {} },
        'page-detail-grid': {
          id: 'page-detail-grid',
          type: 'grid',
          children: ['page-detail-header', 'page-detail-note-row', 'page-detail-table-row'],
          parentId: 'page-detail-root',
          meta: { columns: 12 },
        },
        'page-detail-header': {
          id: 'page-detail-header',
          type: 'header',
          children: [],
          parentId: 'page-detail-grid',
          meta: { text: 'Detail Page Inside the Same Dashboard', headerSize: 'large' },
        },
        'page-detail-note-row': {
          id: 'page-detail-note-row',
          type: 'row',
          children: ['page-detail-note-widget', 'page-detail-kpi-host'],
          parentId: 'page-detail-grid',
          meta: {},
        },
        'page-detail-note-widget': {
          id: 'page-detail-note-widget',
          type: 'widget',
          children: [],
          parentId: 'page-detail-note-row',
          meta: { widgetRef: 'page-detail-note', width: 8, height: 96 },
        },
        'page-detail-kpi-host': {
          id: 'page-detail-kpi-host',
          type: 'widget',
          children: [],
          parentId: 'page-detail-note-row',
          meta: { widgetRef: 'pages-kpi-aov', width: 4, height: 96 },
        },
        'page-detail-table-row': {
          id: 'page-detail-table-row',
          type: 'row',
          children: ['page-detail-table-host'],
          parentId: 'page-detail-grid',
          meta: {},
        },
        'page-detail-table-host': {
          id: 'page-detail-table-host',
          type: 'widget',
          children: [],
          parentId: 'page-detail-table-row',
          meta: { widgetRef: 'pages-table-orders', width: 12, height: 320 },
        },
      },
      widgets: [
        {
          id: 'page-detail-note',
          type: 'markdown',
          title: '',
          config: {
            content:
              'This is still the same dashboard. The filter bar, theme, and persisted state are shared with the overview page. Use pages when you want one analytical workbook with multiple canvases.',
          },
        },
        {
          id: 'pages-kpi-aov',
          type: 'kpi-card',
          title: 'Average Order Value',
          config: { valueField: 'aov', format: 'currency' },
        },
        {
          id: 'pages-table-orders',
          type: 'table',
          title: 'Orders in Context',
          config: { pageSize: 8 },
        },
      ],
    },
  ],
  theme: pageDemoTheme,
};

const executiveDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'dashboard-executive',
  title: 'Executive Overview',
  description: 'A top-level dashboard for executive KPI monitoring.',
  filters: [
    {
      id: 'filter-region',
      title: 'Region',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    },
  ],
  pages: [
    {
      id: 'page-executive',
      title: 'Executive',
      rootNodeId: 'exec-root',
      layout: {
        'exec-root': { id: 'exec-root', type: 'root', children: ['exec-grid'], meta: {} },
        'exec-grid': {
          id: 'exec-grid',
          type: 'grid',
          children: ['exec-header', 'exec-note-row', 'exec-kpi-row', 'exec-chart-row'],
          parentId: 'exec-root',
          meta: { columns: 12 },
        },
        'exec-header': {
          id: 'exec-header',
          type: 'header',
          children: [],
          parentId: 'exec-grid',
          meta: { text: 'Dashboard 1: Executive Overview', headerSize: 'large' },
        },
        'exec-note-row': {
          id: 'exec-note-row',
          type: 'row',
          children: ['exec-note-host'],
          parentId: 'exec-grid',
          meta: {},
        },
        'exec-note-host': {
          id: 'exec-note-host',
          type: 'widget',
          children: [],
          parentId: 'exec-note-row',
          meta: { widgetRef: 'exec-note', width: 12, height: 88 },
        },
        'exec-kpi-row': {
          id: 'exec-kpi-row',
          type: 'row',
          children: ['exec-kpi-revenue-host', 'exec-kpi-orders-host'],
          parentId: 'exec-grid',
          meta: {},
        },
        'exec-kpi-revenue-host': {
          id: 'exec-kpi-revenue-host',
          type: 'widget',
          children: [],
          parentId: 'exec-kpi-row',
          meta: { widgetRef: 'exec-kpi-revenue', width: 6, height: 120 },
        },
        'exec-kpi-orders-host': {
          id: 'exec-kpi-orders-host',
          type: 'widget',
          children: [],
          parentId: 'exec-kpi-row',
          meta: { widgetRef: 'exec-kpi-orders', width: 6, height: 120 },
        },
        'exec-chart-row': {
          id: 'exec-chart-row',
          type: 'row',
          children: ['exec-chart-trend-host', 'exec-chart-region-host'],
          parentId: 'exec-grid',
          meta: {},
        },
        'exec-chart-trend-host': {
          id: 'exec-chart-trend-host',
          type: 'widget',
          children: [],
          parentId: 'exec-chart-row',
          meta: { widgetRef: 'exec-chart-revenue-trend', width: 7, height: 320 },
        },
        'exec-chart-region-host': {
          id: 'exec-chart-region-host',
          type: 'widget',
          children: [],
          parentId: 'exec-chart-row',
          meta: { widgetRef: 'exec-chart-region-sales', width: 5, height: 320 },
        },
      },
      widgets: [
        {
          id: 'exec-note',
          type: 'markdown',
          title: '',
          config: {
            content:
              'This is its own dashboard document. It has its own id, saved layout, defaults, and purpose. Use separate dashboards when the experience wants a different document, not just a different canvas.',
          },
        },
        {
          id: 'exec-kpi-revenue',
          type: 'kpi-card',
          title: 'Revenue',
          config: { valueField: 'revenue', comparisonField: 'prevRevenue', format: 'compact', prefix: '$' },
        },
        {
          id: 'exec-kpi-orders',
          type: 'kpi-card',
          title: 'Orders',
          config: { valueField: 'orders', comparisonField: 'prevOrders', format: 'compact' },
        },
        {
          id: 'exec-chart-revenue-trend',
          type: 'line-chart',
          title: 'Revenue Trend',
          config: { xField: 'month', yFields: ['revenue', 'cost'], smooth: true },
        },
        {
          id: 'exec-chart-region-sales',
          type: 'bar-chart',
          title: 'Region Mix',
          config: { xField: 'region', yFields: ['revenue'], horizontal: true },
        },
      ],
    },
  ],
  theme: executiveTheme,
};

const operationsDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'dashboard-operations',
  title: 'Fulfillment Ops',
  description: 'A separate dashboard for operational detail and follow-up.',
  filters: [
    {
      id: 'filter-category',
      title: 'Category',
      type: 'select',
      fieldRef: 'category',
      datasetRef: 'ds-orders',
      operator: 'equals',
      scope: { type: 'global' },
    },
  ],
  pages: [
    {
      id: 'page-operations',
      title: 'Operations',
      rootNodeId: 'ops-root',
      layout: {
        'ops-root': { id: 'ops-root', type: 'root', children: ['ops-grid'], meta: {} },
        'ops-grid': {
          id: 'ops-grid',
          type: 'grid',
          children: ['ops-header', 'ops-note-row', 'ops-kpi-row', 'ops-table-row'],
          parentId: 'ops-root',
          meta: { columns: 12 },
        },
        'ops-header': {
          id: 'ops-header',
          type: 'header',
          children: [],
          parentId: 'ops-grid',
          meta: { text: 'Dashboard 2: Fulfillment Ops', headerSize: 'large' },
        },
        'ops-note-row': {
          id: 'ops-note-row',
          type: 'row',
          children: ['ops-note-host'],
          parentId: 'ops-grid',
          meta: {},
        },
        'ops-note-host': {
          id: 'ops-note-host',
          type: 'widget',
          children: [],
          parentId: 'ops-note-row',
          meta: { widgetRef: 'ops-note', width: 12, height: 88 },
        },
        'ops-kpi-row': {
          id: 'ops-kpi-row',
          type: 'row',
          children: ['ops-kpi-orders-host', 'ops-kpi-aov-host', 'ops-chart-region-host'],
          parentId: 'ops-grid',
          meta: {},
        },
        'ops-kpi-orders-host': {
          id: 'ops-kpi-orders-host',
          type: 'widget',
          children: [],
          parentId: 'ops-kpi-row',
          meta: { widgetRef: 'ops-kpi-orders', width: 3, height: 120 },
        },
        'ops-kpi-aov-host': {
          id: 'ops-kpi-aov-host',
          type: 'widget',
          children: [],
          parentId: 'ops-kpi-row',
          meta: { widgetRef: 'ops-kpi-aov', width: 3, height: 120 },
        },
        'ops-chart-region-host': {
          id: 'ops-chart-region-host',
          type: 'widget',
          children: [],
          parentId: 'ops-kpi-row',
          meta: { widgetRef: 'ops-chart-region-sales', width: 6, height: 120 },
        },
        'ops-table-row': {
          id: 'ops-table-row',
          type: 'row',
          children: ['ops-table-host'],
          parentId: 'ops-grid',
          meta: {},
        },
        'ops-table-host': {
          id: 'ops-table-host',
          type: 'widget',
          children: [],
          parentId: 'ops-table-row',
          meta: { widgetRef: 'ops-table-orders', width: 12, height: 320 },
        },
      },
      widgets: [
        {
          id: 'ops-note',
          type: 'markdown',
          title: '',
          config: {
            content:
              'This second dashboard could have different owners, different sharing, a different route, and a different filter contract. Switching dashboards is a host concern because you are leaving one document and entering another.',
          },
        },
        {
          id: 'ops-kpi-orders',
          type: 'kpi-card',
          title: 'Orders',
          config: { valueField: 'orders', comparisonField: 'prevOrders', format: 'compact' },
        },
        {
          id: 'ops-kpi-aov',
          type: 'kpi-card',
          title: 'Average Order Value',
          config: { valueField: 'aov', format: 'currency' },
        },
        {
          id: 'ops-chart-region-sales',
          type: 'bar-chart',
          title: 'Open Work by Region',
          config: { xField: 'region', yFields: ['revenue'], horizontal: true },
        },
        {
          id: 'ops-table-orders',
          type: 'table',
          title: 'Orders Requiring Follow-up',
          config: { pageSize: 8 },
        },
      ],
    },
  ],
  theme: operationsTheme,
};

export const dashboardSwitchingDemo: DashboardSwitchingDemo = {
  initialDashboardId: executiveDashboard.id,
  dashboards: [executiveDashboard, operationsDashboard],
};