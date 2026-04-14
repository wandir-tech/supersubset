import type { DashboardDefinition } from '@supersubset/schema';

/**
 * Demo dashboard with sample data for the dev app.
 * Uses fixture data inline so the dev app has no backend dependency.
 */
export const demoDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'demo-sales',
  title: 'Sales Dashboard',
  description: 'Demo dashboard for development and testing',
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
    {
      id: 'filter-date',
      title: 'Order Date',
      type: 'date',
      fieldRef: 'order_date',
      datasetRef: 'ds-orders',
      operator: 'between',
      scope: { type: 'global' },
    },
  ],
  interactions: [
    {
      id: 'cross-filter-region-bar',
      trigger: { type: 'click' as const, sourceWidgetId: 'chart-region-sales' },
      action: { type: 'filter' as const, fieldRef: 'region' },
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
          children: [
            'header-title',
            'divider-1',
            'row-alerts',
            'row-kpis',
            'row-charts',
            'row-table',
          ],
          parentId: 'root',
          meta: { columns: 12 },
        },
        'header-title': {
          id: 'header-title',
          type: 'header',
          children: [],
          parentId: 'grid-main',
          meta: { text: 'Sales Overview', headerSize: 'large' },
        },
        'divider-1': {
          id: 'divider-1',
          type: 'divider',
          children: [],
          parentId: 'grid-main',
          meta: {},
        },
        'row-alerts': {
          id: 'row-alerts',
          type: 'row',
          children: ['w-alerts'],
          parentId: 'grid-main',
          meta: {},
        },
        'w-alerts': {
          id: 'w-alerts',
          type: 'widget',
          children: [],
          parentId: 'row-alerts',
          meta: { widgetRef: 'alerts-overview', width: 12, height: 180 },
        },
        'row-kpis': {
          id: 'row-kpis',
          type: 'row',
          children: ['w-kpi-revenue', 'w-kpi-orders', 'w-kpi-aov'],
          parentId: 'grid-main',
          meta: {},
        },
        'w-kpi-revenue': {
          id: 'w-kpi-revenue',
          type: 'widget',
          children: [],
          parentId: 'row-kpis',
          meta: { widgetRef: 'kpi-revenue', width: 4, height: 120 },
        },
        'w-kpi-orders': {
          id: 'w-kpi-orders',
          type: 'widget',
          children: [],
          parentId: 'row-kpis',
          meta: { widgetRef: 'kpi-orders', width: 4, height: 120 },
        },
        'w-kpi-aov': {
          id: 'w-kpi-aov',
          type: 'widget',
          children: [],
          parentId: 'row-kpis',
          meta: { widgetRef: 'kpi-aov', width: 4, height: 120 },
        },
        'row-charts': {
          id: 'row-charts',
          type: 'row',
          children: ['w-line', 'w-bar'],
          parentId: 'grid-main',
          meta: {},
        },
        'w-line': {
          id: 'w-line',
          type: 'widget',
          children: [],
          parentId: 'row-charts',
          meta: { widgetRef: 'chart-revenue-trend', width: 8, height: 350 },
        },
        'w-bar': {
          id: 'w-bar',
          type: 'widget',
          children: [],
          parentId: 'row-charts',
          meta: { widgetRef: 'chart-region-sales', width: 4, height: 350 },
        },
        'row-table': {
          id: 'row-table',
          type: 'row',
          children: ['w-table'],
          parentId: 'grid-main',
          meta: {},
        },
        'w-table': {
          id: 'w-table',
          type: 'widget',
          children: [],
          parentId: 'row-table',
          meta: { widgetRef: 'table-orders', width: 12, height: 300 },
        },
      },
      widgets: [
        {
          id: 'alerts-overview',
          type: 'alerts',
          title: 'Operations Watchlist',
          dataBinding: {
            datasetRef: 'ds-ops-alerts',
            fields: [
              { role: 'alert-title', fieldRef: 'alert_title' },
              { role: 'alert-message', fieldRef: 'alert_message' },
              { role: 'alert-severity', fieldRef: 'severity' },
              { role: 'alert-timestamp', fieldRef: 'detected_at' },
            ],
          },
          config: {
            titleField: 'alert_title',
            messageField: 'alert_message',
            severityField: 'severity',
            timestampField: 'detected_at',
            layout: 'wrap',
            maxItems: 3,
            emptyState: 'placeholder',
            showTimestamp: true,
            defaultSeverity: 'info',
          },
        },
        {
          id: 'kpi-revenue',
          type: 'kpi-card',
          title: 'Total Revenue',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'value', fieldRef: 'revenue' },
              { role: 'comparison', fieldRef: 'prevRevenue' },
            ],
          },
          config: {
            valueField: 'revenue',
            comparisonField: 'prevRevenue',
            format: 'compact',
            prefix: '$',
          },
        },
        {
          id: 'kpi-orders',
          type: 'kpi-card',
          title: 'Orders',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'value', fieldRef: 'orders' },
              { role: 'comparison', fieldRef: 'prevOrders' },
            ],
          },
          config: { valueField: 'orders', comparisonField: 'prevOrders', format: 'compact' },
        },
        {
          id: 'kpi-aov',
          type: 'kpi-card',
          title: 'Avg Order Value',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [{ role: 'value', fieldRef: 'aov' }],
          },
          config: { valueField: 'aov', format: 'currency' },
        },
        {
          id: 'chart-revenue-trend',
          type: 'line-chart',
          title: 'Revenue Trend',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'x-axis', fieldRef: 'month' },
              { role: 'y-axis', fieldRef: 'revenue' },
            ],
          },
          config: { smooth: true, area: false },
        },
        {
          id: 'chart-region-sales',
          type: 'bar-chart',
          title: 'Sales by Region',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'x-axis', fieldRef: 'region' },
              { role: 'y-axis', fieldRef: 'revenue' },
            ],
          },
          config: { horizontal: true },
        },
        {
          id: 'table-orders',
          type: 'table',
          title: 'Recent Orders',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [],
          },
          config: { pageSize: 10 },
        },
      ],
    },
    {
      id: 'page-gallery',
      title: 'Chart Gallery',
      rootNodeId: 'gallery-root',
      layout: {
        'gallery-root': { id: 'gallery-root', type: 'root', children: ['gallery-grid'], meta: {} },
        'gallery-grid': {
          id: 'gallery-grid',
          type: 'grid',
          children: [
            'gallery-header',
            'gallery-divider',
            'gallery-md-row',
            'row-pie-scatter',
            'row-area-combo',
            'row-gauge-funnel',
            'row-radar-treemap',
            'row-heatmap-waterfall',
            'row-sankey-box',
          ],
          parentId: 'gallery-root',
          meta: { columns: 12 },
        },
        'gallery-header': {
          id: 'gallery-header',
          type: 'header',
          children: [],
          parentId: 'gallery-grid',
          meta: { text: 'Widget Gallery', headerSize: 'large' },
        },
        'gallery-divider': {
          id: 'gallery-divider',
          type: 'divider',
          children: [],
          parentId: 'gallery-grid',
          meta: {},
        },
        // Markdown row
        'gallery-md-row': {
          id: 'gallery-md-row',
          type: 'row',
          children: ['w-markdown'],
          parentId: 'gallery-grid',
          meta: {},
        },
        'w-markdown': {
          id: 'w-markdown',
          type: 'widget',
          children: [],
          parentId: 'gallery-md-row',
          meta: { widgetRef: 'widget-markdown', width: 12, height: 80 },
        },
        // Pie + Scatter
        'row-pie-scatter': {
          id: 'row-pie-scatter',
          type: 'row',
          children: ['w-pie', 'w-scatter'],
          parentId: 'gallery-grid',
          meta: {},
        },
        'w-pie': {
          id: 'w-pie',
          type: 'widget',
          children: [],
          parentId: 'row-pie-scatter',
          meta: { widgetRef: 'chart-pie', width: 6, height: 350 },
        },
        'w-scatter': {
          id: 'w-scatter',
          type: 'widget',
          children: [],
          parentId: 'row-pie-scatter',
          meta: { widgetRef: 'chart-scatter', width: 6, height: 350 },
        },
        // Area + Combo
        'row-area-combo': {
          id: 'row-area-combo',
          type: 'row',
          children: ['w-area', 'w-combo'],
          parentId: 'gallery-grid',
          meta: {},
        },
        'w-area': {
          id: 'w-area',
          type: 'widget',
          children: [],
          parentId: 'row-area-combo',
          meta: { widgetRef: 'chart-area', width: 6, height: 350 },
        },
        'w-combo': {
          id: 'w-combo',
          type: 'widget',
          children: [],
          parentId: 'row-area-combo',
          meta: { widgetRef: 'chart-combo', width: 6, height: 350 },
        },
        // Gauge + Funnel
        'row-gauge-funnel': {
          id: 'row-gauge-funnel',
          type: 'row',
          children: ['w-gauge', 'w-funnel'],
          parentId: 'gallery-grid',
          meta: {},
        },
        'w-gauge': {
          id: 'w-gauge',
          type: 'widget',
          children: [],
          parentId: 'row-gauge-funnel',
          meta: { widgetRef: 'chart-gauge', width: 4, height: 300 },
        },
        'w-funnel': {
          id: 'w-funnel',
          type: 'widget',
          children: [],
          parentId: 'row-gauge-funnel',
          meta: { widgetRef: 'chart-funnel', width: 8, height: 300 },
        },
        // Radar + Treemap
        'row-radar-treemap': {
          id: 'row-radar-treemap',
          type: 'row',
          children: ['w-radar', 'w-treemap'],
          parentId: 'gallery-grid',
          meta: {},
        },
        'w-radar': {
          id: 'w-radar',
          type: 'widget',
          children: [],
          parentId: 'row-radar-treemap',
          meta: { widgetRef: 'chart-radar', width: 6, height: 350 },
        },
        'w-treemap': {
          id: 'w-treemap',
          type: 'widget',
          children: [],
          parentId: 'row-radar-treemap',
          meta: { widgetRef: 'chart-treemap', width: 6, height: 350 },
        },
        // Heatmap + Waterfall
        'row-heatmap-waterfall': {
          id: 'row-heatmap-waterfall',
          type: 'row',
          children: ['w-heatmap', 'w-waterfall'],
          parentId: 'gallery-grid',
          meta: {},
        },
        'w-heatmap': {
          id: 'w-heatmap',
          type: 'widget',
          children: [],
          parentId: 'row-heatmap-waterfall',
          meta: { widgetRef: 'chart-heatmap', width: 6, height: 380 },
        },
        'w-waterfall': {
          id: 'w-waterfall',
          type: 'widget',
          children: [],
          parentId: 'row-heatmap-waterfall',
          meta: { widgetRef: 'chart-waterfall', width: 6, height: 380 },
        },
        // Sankey + Box Plot
        'row-sankey-box': {
          id: 'row-sankey-box',
          type: 'row',
          children: ['w-sankey', 'w-boxplot'],
          parentId: 'gallery-grid',
          meta: {},
        },
        'w-sankey': {
          id: 'w-sankey',
          type: 'widget',
          children: [],
          parentId: 'row-sankey-box',
          meta: { widgetRef: 'chart-sankey', width: 6, height: 350 },
        },
        'w-boxplot': {
          id: 'w-boxplot',
          type: 'widget',
          children: [],
          parentId: 'row-sankey-box',
          meta: { widgetRef: 'chart-boxplot', width: 6, height: 350 },
        },
      },
      widgets: [
        {
          id: 'widget-markdown',
          type: 'markdown',
          title: '',
          config: {
            content:
              'This page showcases **all 17 widget types** available in the Supersubset chart library. Each chart uses inline fixture data.',
          },
        },
        {
          id: 'chart-pie',
          type: 'pie-chart',
          title: 'Revenue by Region',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'category', fieldRef: 'region' },
              { role: 'value', fieldRef: 'revenue' },
            ],
          },
          config: { donut: true },
        },
        {
          id: 'chart-scatter',
          type: 'scatter-chart',
          title: 'Order Size vs Quantity',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'x-axis', fieldRef: 'quantity' },
              { role: 'y-axis', fieldRef: 'amount' },
              { role: 'size', fieldRef: 'profit' },
            ],
          },
          config: {},
        },
        {
          id: 'chart-area',
          type: 'area-chart',
          title: 'Revenue Breakdown (Stacked)',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'x-axis', fieldRef: 'month' },
              { role: 'y-axis', fieldRef: 'online' },
            ],
          },
          config: { smooth: true, stacked: true },
        },
        {
          id: 'chart-combo',
          type: 'combo-chart',
          title: 'Revenue vs Margin %',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'x-axis', fieldRef: 'month' },
              { role: 'bar-y', fieldRef: 'revenue' },
              { role: 'line-y', fieldRef: 'margin' },
            ],
          },
          config: {},
        },
        {
          id: 'chart-gauge',
          type: 'gauge',
          title: 'Target Achievement',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [{ role: 'value', fieldRef: 'achievement' }],
          },
          config: {
            min: 0,
            max: 100,
            thresholds: [
              { value: 30, color: '#f5222d' },
              { value: 70, color: '#faad14' },
              { value: 100, color: '#52c41a' },
            ],
          },
        },
        {
          id: 'chart-funnel',
          type: 'funnel-chart',
          title: 'Sales Pipeline',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'category', fieldRef: 'stage' },
              { role: 'value', fieldRef: 'count' },
            ],
          },
          config: { sort: 'descending' },
        },
        {
          id: 'chart-radar',
          type: 'radar-chart',
          title: 'Product Comparison',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [{ role: 'category', fieldRef: 'product' }],
          },
          config: { valueFields: ['quality', 'price', 'support', 'features', 'delivery'] },
        },
        {
          id: 'chart-treemap',
          type: 'treemap',
          title: 'Expense Breakdown',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'name', fieldRef: 'category' },
              { role: 'value', fieldRef: 'amount' },
            ],
          },
          config: {},
        },
        {
          id: 'chart-heatmap',
          type: 'heatmap',
          title: 'Sales by Day × Hour',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'x-axis', fieldRef: 'hour' },
              { role: 'y-axis', fieldRef: 'day' },
              { role: 'value', fieldRef: 'sales' },
            ],
          },
          config: {},
        },
        {
          id: 'chart-waterfall',
          type: 'waterfall',
          title: 'Profit Bridge',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'category', fieldRef: 'item' },
              { role: 'value', fieldRef: 'amount' },
            ],
          },
          config: { totalLabel: 'Net Profit' },
        },
        {
          id: 'chart-sankey',
          type: 'sankey',
          title: 'Traffic Sources → Pages',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'source', fieldRef: 'source' },
              { role: 'target', fieldRef: 'page' },
              { role: 'value', fieldRef: 'visits' },
            ],
          },
          config: { sourceField: 'source', targetField: 'page', valueField: 'visits' },
        },
        {
          id: 'chart-boxplot',
          type: 'box-plot',
          title: 'Order Amount Distribution',
          dataBinding: {
            datasetRef: 'ds-orders',
            fields: [
              { role: 'category', fieldRef: 'region' },
              { role: 'value', fieldRef: 'amount' },
            ],
          },
          config: {},
        },
      ],
    },
  ],
  theme: {
    type: 'inline',
    colors: {
      primary: '#1677ff',
      chartPalette: ['#1677ff', '#722ed1', '#13c2c2', '#52c41a', '#faad14', '#f5222d'],
    },
  },
};

// ─── Sample Data ─────────────────────────────────────────────

export const kpiData = [
  { revenue: 2450000, prevRevenue: 2100000, orders: 18420, prevOrders: 16800, aov: 133.01 },
];

export const trendData = [
  { month: 'Jan', revenue: 180000, cost: 120000 },
  { month: 'Feb', revenue: 195000, cost: 125000 },
  { month: 'Mar', revenue: 210000, cost: 130000 },
  { month: 'Apr', revenue: 225000, cost: 135000 },
  { month: 'May', revenue: 240000, cost: 140000 },
  { month: 'Jun', revenue: 260000, cost: 145000 },
  { month: 'Jul', revenue: 280000, cost: 150000 },
  { month: 'Aug', revenue: 300000, cost: 155000 },
  { month: 'Sep', revenue: 290000, cost: 150000 },
  { month: 'Oct', revenue: 310000, cost: 155000 },
  { month: 'Nov', revenue: 330000, cost: 160000 },
  { month: 'Dec', revenue: 350000, cost: 165000 },
];

export const regionData = [
  { region: 'North', revenue: 680000 },
  { region: 'South', revenue: 520000 },
  { region: 'East', revenue: 750000 },
  { region: 'West', revenue: 500000 },
];

export const ordersTableData = [
  {
    orderId: 'ORD-1001',
    customer: 'Acme Corp',
    amount: 2450,
    status: 'Delivered',
    date: '2026-04-01',
  },
  {
    orderId: 'ORD-1002',
    customer: 'Globex Inc',
    amount: 1890,
    status: 'Shipped',
    date: '2026-04-02',
  },
  {
    orderId: 'ORD-1003',
    customer: 'Initech',
    amount: 3200,
    status: 'Delivered',
    date: '2026-04-03',
  },
  {
    orderId: 'ORD-1004',
    customer: 'Umbrella',
    amount: 1560,
    status: 'Processing',
    date: '2026-04-04',
  },
  {
    orderId: 'ORD-1005',
    customer: 'Waystar',
    amount: 4100,
    status: 'Delivered',
    date: '2026-04-05',
  },
  {
    orderId: 'ORD-1006',
    customer: 'Stark Ind',
    amount: 2780,
    status: 'Shipped',
    date: '2026-04-06',
  },
  {
    orderId: 'ORD-1007',
    customer: 'Wayne Ent',
    amount: 5200,
    status: 'Delivered',
    date: '2026-04-07',
  },
  {
    orderId: 'ORD-1008',
    customer: 'Cyberdyne',
    amount: 1920,
    status: 'Processing',
    date: '2026-04-08',
  },
];

export const ordersTableColumns = [
  { fieldId: 'orderId', label: 'Order ID', dataType: 'string' },
  { fieldId: 'customer', label: 'Customer', dataType: 'string' },
  { fieldId: 'amount', label: 'Amount', dataType: 'number' },
  { fieldId: 'status', label: 'Status', dataType: 'string' },
  { fieldId: 'date', label: 'Date', dataType: 'date' },
];

export const alertsData = [
  {
    alert_title: 'Revenue ETL delayed in North America',
    alert_message:
      'The 08:00 UTC warehouse refresh is 37 minutes behind schedule. Executive revenue charts may lag fresh orders.',
    severity: 'danger',
    detected_at: '2026-04-11 08:21 UTC',
  },
  {
    alert_title: 'Checkout retry rate elevated',
    alert_message:
      'Checkout API retries climbed to 8.2% in the last 15 minutes, above the 3% operating target.',
    severity: 'warning',
    detected_at: '2026-04-11 09:12 UTC',
  },
  {
    alert_title: 'EU fulfillment backlog cleared',
    alert_message:
      'Average pick-pack latency returned below 2 hours after the overnight queue drain completed.',
    severity: 'success',
    detected_at: '2026-04-11 08:45 UTC',
  },
  {
    alert_title: 'Forecast refresh queued',
    alert_message:
      'A finance-approved model refresh is scheduled for 10:00 UTC after the latest bookings import.',
    severity: 'info',
    detected_at: '2026-04-11 07:55 UTC',
  },
];

// ─── Gallery Page Data ───────────────────────────────────────

export const pieData = [
  { region: 'North', revenue: 680000 },
  { region: 'South', revenue: 520000 },
  { region: 'East', revenue: 750000 },
  { region: 'West', revenue: 500000 },
];

export const scatterData = [
  { quantity: 10, amount: 150, profit: 40 },
  { quantity: 25, amount: 380, profit: 95 },
  { quantity: 5, amount: 90, profit: 20 },
  { quantity: 40, amount: 600, profit: 180 },
  { quantity: 15, amount: 220, profit: 55 },
  { quantity: 30, amount: 480, profit: 120 },
  { quantity: 8, amount: 110, profit: 25 },
  { quantity: 50, amount: 750, profit: 200 },
  { quantity: 20, amount: 300, profit: 80 },
  { quantity: 35, amount: 520, profit: 140 },
];

export const areaData = [
  { month: 'Jan', online: 60000, retail: 80000, wholesale: 40000 },
  { month: 'Feb', online: 65000, retail: 85000, wholesale: 45000 },
  { month: 'Mar', online: 72000, retail: 90000, wholesale: 48000 },
  { month: 'Apr', online: 78000, retail: 88000, wholesale: 55000 },
  { month: 'May', online: 85000, retail: 92000, wholesale: 58000 },
  { month: 'Jun', online: 95000, retail: 98000, wholesale: 62000 },
  { month: 'Jul', online: 100000, retail: 105000, wholesale: 65000 },
  { month: 'Aug', online: 110000, retail: 108000, wholesale: 68000 },
  { month: 'Sep', online: 105000, retail: 102000, wholesale: 66000 },
  { month: 'Oct', online: 115000, retail: 110000, wholesale: 72000 },
  { month: 'Nov', online: 125000, retail: 115000, wholesale: 78000 },
  { month: 'Dec', online: 135000, retail: 120000, wholesale: 82000 },
];

export const comboData = [
  { month: 'Jan', revenue: 180000, margin: 33 },
  { month: 'Feb', revenue: 195000, margin: 36 },
  { month: 'Mar', revenue: 210000, margin: 38 },
  { month: 'Apr', revenue: 225000, margin: 40 },
  { month: 'May', revenue: 240000, margin: 42 },
  { month: 'Jun', revenue: 260000, margin: 44 },
  { month: 'Jul', revenue: 280000, margin: 46 },
  { month: 'Aug', revenue: 300000, margin: 48 },
  { month: 'Sep', revenue: 290000, margin: 48 },
  { month: 'Oct', revenue: 310000, margin: 50 },
  { month: 'Nov', revenue: 330000, margin: 52 },
  { month: 'Dec', revenue: 350000, margin: 53 },
];

export const gaugeData = [{ achievement: 73 }];

export const funnelData = [
  { stage: 'Prospects', count: 5000 },
  { stage: 'Qualified', count: 3200 },
  { stage: 'Proposals', count: 1800 },
  { stage: 'Negotiations', count: 900 },
  { stage: 'Closed Won', count: 450 },
];

export const radarData = [
  { product: 'Product A', quality: 85, price: 70, support: 90, features: 75, delivery: 88 },
  { product: 'Product B', quality: 72, price: 90, support: 65, features: 88, delivery: 70 },
];

export const treemapData = [
  { category: 'Salaries', amount: 450000 },
  { category: 'Marketing', amount: 120000 },
  { category: 'R&D', amount: 180000 },
  { category: 'Operations', amount: 95000 },
  { category: 'Office', amount: 65000 },
  { category: 'Travel', amount: 45000 },
  { category: 'Legal', amount: 35000 },
  { category: 'IT', amount: 85000 },
];

export const heatmapData = (() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];
  const result: Array<{ day: string; hour: string; sales: number }> = [];
  for (const day of days) {
    for (const hour of hours) {
      result.push({ day, hour, sales: Math.floor(Math.random() * 80 + 20) });
    }
  }
  return result;
})();

export const waterfallData = [
  { item: 'Revenue', amount: 350000 },
  { item: 'COGS', amount: -165000 },
  { item: 'Gross Profit', amount: 0 },
  { item: 'Marketing', amount: -45000 },
  { item: 'Salaries', amount: -80000 },
  { item: 'Other', amount: -25000 },
  { item: 'Net Profit', amount: 0 },
];
// Fix waterfall: Gross Profit = revenue - COGS, Net Profit = total
// The widget uses running totals, so zero-value items become "total" markers
// Actually, we model this differently: the widget treats "Net Profit" as totalLabel

export const sankeyData = [
  { source: 'Google', page: 'Homepage', visits: 5000 },
  { source: 'Google', page: 'Product', visits: 3200 },
  { source: 'Google', page: 'Blog', visits: 1800 },
  { source: 'Social', page: 'Homepage', visits: 2500 },
  { source: 'Social', page: 'Product', visits: 1500 },
  { source: 'Direct', page: 'Homepage', visits: 4000 },
  { source: 'Direct', page: 'Product', visits: 2800 },
  { source: 'Direct', page: 'Pricing', visits: 1200 },
  { source: 'Email', page: 'Product', visits: 800 },
  { source: 'Email', page: 'Pricing', visits: 600 },
];

export const boxplotData = [
  // Raw order amounts per region — box plot computes stats
  ...Array.from({ length: 30 }, () => ({
    region: 'North',
    amount: Math.floor(Math.random() * 300 + 100),
  })),
  ...Array.from({ length: 30 }, () => ({
    region: 'South',
    amount: Math.floor(Math.random() * 250 + 80),
  })),
  ...Array.from({ length: 30 }, () => ({
    region: 'East',
    amount: Math.floor(Math.random() * 400 + 150),
  })),
  ...Array.from({ length: 30 }, () => ({
    region: 'West',
    amount: Math.floor(Math.random() * 200 + 90),
  })),
];
