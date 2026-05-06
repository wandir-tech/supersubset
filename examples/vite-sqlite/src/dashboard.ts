import type { DashboardDefinition } from '@supersubset/schema';

const REGION_OPTIONS = ['North America', 'Europe', 'APAC'];
const CATEGORY_OPTIONS = ['Footwear', 'Accessories', 'Apparel', 'Hydration'];

export const defaultDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'vite-sqlite-dashboard',
  title: 'SQLite Analytics Workbench',
  description:
    'A Vite host app that re-queries an in-browser SQLite database based on Supersubset filter state.',
  filters: [
    {
      id: 'filter-region',
      title: 'Region',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'sqlite-orders',
      operator: 'equals',
      optionSource: {
        kind: 'static',
        completeness: 'complete',
        options: REGION_OPTIONS.map((value) => ({ value })),
      },
      scope: { type: 'global' },
    },
    {
      id: 'filter-category',
      title: 'Category',
      type: 'multi-select',
      fieldRef: 'category',
      datasetRef: 'sqlite-orders',
      operator: 'in',
      optionSource: {
        kind: 'static',
        completeness: 'complete',
        options: CATEGORY_OPTIONS.map((value) => ({ value })),
      },
      scope: { type: 'global' },
    },
    {
      id: 'filter-date',
      title: 'Order Date',
      type: 'date',
      fieldRef: 'ordered_at',
      datasetRef: 'sqlite-orders',
      operator: 'between',
      scope: { type: 'global' },
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
          parentId: 'root',
          children: [
            'header-title',
            'divider',
            'row-filter-bars',
            'row-kpis',
            'row-charts',
            'row-table',
          ],
          meta: { columns: 12 },
        },
        'header-title': {
          id: 'header-title',
          type: 'header',
          parentId: 'grid-main',
          children: [],
          meta: { text: 'Local SQLite Analytics', headerSize: 'large' },
        },
        divider: {
          id: 'divider',
          type: 'divider',
          parentId: 'grid-main',
          children: [],
          meta: {},
        },
        'row-filter-bars': {
          id: 'row-filter-bars',
          type: 'row',
          parentId: 'grid-main',
          children: ['w-filter-bar-all'],
          meta: {},
        },
        'w-filter-bar-all': {
          id: 'w-filter-bar-all',
          type: 'widget',
          parentId: 'row-filter-bars',
          children: [],
          meta: { widgetRef: 'filters-all', width: 12, height: 128 },
        },
        'row-kpis': {
          id: 'row-kpis',
          type: 'row',
          parentId: 'grid-main',
          children: ['w-kpi-revenue', 'w-kpi-orders', 'w-kpi-aov'],
          meta: {},
        },
        'w-kpi-revenue': {
          id: 'w-kpi-revenue',
          type: 'widget',
          parentId: 'row-kpis',
          children: [],
          meta: { widgetRef: 'kpi-revenue', width: 4, height: 130 },
        },
        'w-kpi-orders': {
          id: 'w-kpi-orders',
          type: 'widget',
          parentId: 'row-kpis',
          children: [],
          meta: { widgetRef: 'kpi-orders', width: 4, height: 130 },
        },
        'w-kpi-aov': {
          id: 'w-kpi-aov',
          type: 'widget',
          parentId: 'row-kpis',
          children: [],
          meta: { widgetRef: 'kpi-aov', width: 4, height: 130 },
        },
        'row-charts': {
          id: 'row-charts',
          type: 'row',
          parentId: 'grid-main',
          children: ['w-line', 'w-bar'],
          meta: {},
        },
        'w-line': {
          id: 'w-line',
          type: 'widget',
          parentId: 'row-charts',
          children: [],
          meta: { widgetRef: 'chart-monthly-sales', width: 8, height: 360 },
        },
        'w-bar': {
          id: 'w-bar',
          type: 'widget',
          parentId: 'row-charts',
          children: [],
          meta: { widgetRef: 'chart-category-sales', width: 4, height: 360 },
        },
        'row-table': {
          id: 'row-table',
          type: 'row',
          parentId: 'grid-main',
          children: ['w-table'],
          meta: {},
        },
        'w-table': {
          id: 'w-table',
          type: 'widget',
          parentId: 'row-table',
          children: [],
          meta: { widgetRef: 'table-top-products', width: 12, height: 320 },
        },
      },
      widgets: [
        {
          id: 'filters-all',
          type: 'filter-bar',
          title: 'All Dashboard Filters',
          config: {},
        },
        {
          id: 'kpi-revenue',
          type: 'kpi-card',
          title: 'Revenue',
          dataBinding: {
            datasetRef: 'sqlite-orders',
            fields: [
              { role: 'value', fieldRef: 'revenue' },
              { role: 'comparison', fieldRef: 'previousRevenue' },
            ],
          },
          config: {
            valueField: 'revenue',
            comparisonField: 'previousRevenue',
            format: 'currency',
            prefix: '$',
          },
        },
        {
          id: 'kpi-orders',
          type: 'kpi-card',
          title: 'Orders',
          dataBinding: {
            datasetRef: 'sqlite-orders',
            fields: [
              { role: 'value', fieldRef: 'orders' },
              { role: 'comparison', fieldRef: 'previousOrders' },
            ],
          },
          config: { valueField: 'orders', comparisonField: 'previousOrders', format: 'compact' },
        },
        {
          id: 'kpi-aov',
          type: 'kpi-card',
          title: 'Average Order Value',
          dataBinding: {
            datasetRef: 'sqlite-orders',
            fields: [
              { role: 'value', fieldRef: 'aov' },
              { role: 'comparison', fieldRef: 'previousAov' },
            ],
          },
          config: {
            valueField: 'aov',
            comparisonField: 'previousAov',
            format: 'currency',
            prefix: '$',
          },
        },
        {
          id: 'chart-monthly-sales',
          type: 'line-chart',
          title: 'Monthly Revenue + Orders',
          dataBinding: {
            datasetRef: 'sqlite-orders',
            fields: [
              { role: 'x-axis', fieldRef: 'month' },
              { role: 'y-axis', fieldRef: 'revenue' },
            ],
          },
          config: {
            smooth: true,
            showLegend: true,
            legendPosition: 'top',
          },
        },
        {
          id: 'chart-category-sales',
          type: 'bar-chart',
          title: 'Revenue by Category',
          dataBinding: {
            datasetRef: 'sqlite-orders',
            fields: [
              { role: 'x-axis', fieldRef: 'category' },
              { role: 'y-axis', fieldRef: 'revenue' },
            ],
          },
          config: {
            showLegend: false,
          },
        },
        {
          id: 'table-top-products',
          type: 'table',
          title: 'Top Products',
          dataBinding: {
            datasetRef: 'sqlite-orders',
            fields: [],
          },
          config: { columns: ['product_name', 'units', 'revenue', 'region'] },
        },
      ],
    },
  ],
};
