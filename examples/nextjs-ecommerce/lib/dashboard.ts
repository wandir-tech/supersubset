import type { DashboardDefinition } from '@supersubset/schema';

const REGION_OPTIONS = ['North America', 'Europe', 'APAC'];
const CHANNEL_OPTIONS = ['Direct', 'Marketplace', 'Retail Partners', 'Email Campaigns'];

export const ecommerceDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'nextjs-ecommerce-dashboard',
  title: 'E-Commerce Command Center',
  description: 'A Next.js host app using Supersubset runtime with host-owned data injection.',
  filters: [
    {
      id: 'filter-region',
      title: 'Region',
      type: 'select',
      fieldRef: 'region',
      datasetRef: 'sales-orders',
      operator: 'equals',
      optionSource: {
        kind: 'static',
        completeness: 'complete',
        options: REGION_OPTIONS.map((value) => ({ value })),
      },
      scope: { type: 'global' },
    },
    {
      id: 'filter-channel',
      title: 'Channel',
      type: 'select',
      fieldRef: 'channel',
      datasetRef: 'sales-orders',
      operator: 'equals',
      optionSource: {
        kind: 'static',
        completeness: 'complete',
        options: CHANNEL_OPTIONS.map((value) => ({ value })),
      },
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
          children: ['hero-title', 'hero-divider', 'row-kpis', 'row-charts', 'row-table'],
          meta: { columns: 12 },
        },
        'hero-title': {
          id: 'hero-title',
          type: 'header',
          parentId: 'grid-main',
          children: [],
          meta: { text: 'Merchandising + Revenue Overview', headerSize: 'large' },
        },
        'hero-divider': {
          id: 'hero-divider',
          type: 'divider',
          parentId: 'grid-main',
          children: [],
          meta: {},
        },
        'row-kpis': {
          id: 'row-kpis',
          type: 'row',
          parentId: 'grid-main',
          children: ['w-kpi-gmv', 'w-kpi-orders', 'w-kpi-aov'],
          meta: {},
        },
        'w-kpi-gmv': {
          id: 'w-kpi-gmv',
          type: 'widget',
          parentId: 'row-kpis',
          children: [],
          meta: { widgetRef: 'kpi-gmv', width: 4, height: 130 },
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
          children: ['w-revenue-trend', 'w-channel-mix'],
          meta: {},
        },
        'w-revenue-trend': {
          id: 'w-revenue-trend',
          type: 'widget',
          parentId: 'row-charts',
          children: [],
          meta: { widgetRef: 'chart-revenue-trend', width: 8, height: 360 },
        },
        'w-channel-mix': {
          id: 'w-channel-mix',
          type: 'widget',
          parentId: 'row-charts',
          children: [],
          meta: { widgetRef: 'chart-channel-mix', width: 4, height: 360 },
        },
        'row-table': {
          id: 'row-table',
          type: 'row',
          parentId: 'grid-main',
          children: ['w-top-products'],
          meta: {},
        },
        'w-top-products': {
          id: 'w-top-products',
          type: 'widget',
          parentId: 'row-table',
          children: [],
          meta: { widgetRef: 'table-top-products', width: 12, height: 320 },
        },
      },
      widgets: [
        {
          id: 'kpi-gmv',
          type: 'kpi-card',
          title: 'Gross Merchandise Value',
          dataBinding: {
            datasetRef: 'sales-orders',
            fields: [
              { role: 'value', fieldRef: 'gmv' },
              { role: 'comparison', fieldRef: 'previousGmv' },
            ],
          },
          config: {
            valueField: 'gmv',
            comparisonField: 'previousGmv',
            format: 'currency',
            prefix: '$',
          },
        },
        {
          id: 'kpi-orders',
          type: 'kpi-card',
          title: 'Orders Fulfilled',
          dataBinding: {
            datasetRef: 'sales-orders',
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
            datasetRef: 'sales-orders',
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
          id: 'chart-revenue-trend',
          type: 'line-chart',
          title: 'Revenue + Orders by Month',
          dataBinding: {
            datasetRef: 'sales-orders',
            fields: [
              { role: 'x-axis', fieldRef: 'month' },
              { role: 'y-axis', fieldRef: 'gmv' },
            ],
          },
          config: {
            smooth: true,
            showLegend: true,
            legendPosition: 'top',
          },
        },
        {
          id: 'chart-channel-mix',
          type: 'pie-chart',
          title: 'Channel Mix',
          dataBinding: {
            datasetRef: 'sales-orders',
            fields: [
              { role: 'name', fieldRef: 'channel' },
              { role: 'value', fieldRef: 'gmv' },
            ],
          },
          config: {
            donut: true,
            showLegend: true,
            legendPosition: 'right',
          },
        },
        {
          id: 'table-top-products',
          type: 'table',
          title: 'Top Products',
          config: {
            columns: ['product', 'units', 'gmv', 'channel'],
          },
        },
      ],
    },
  ],
  theme: {
    type: 'inline',
    colors: {
      primary: '#b55d26',
      background: '#fffaf3',
      surface: '#fffdf8',
      text: '#261b12',
      muted: '#786454',
      border: '#e4d5c7',
    },
    typography: {
      fontFamily: 'Georgia, Iowan Old Style, Palatino Linotype, serif',
    },
  },
};
