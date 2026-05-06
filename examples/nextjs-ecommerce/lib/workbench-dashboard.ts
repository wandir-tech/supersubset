import type { DashboardDefinition } from '@supersubset/schema';
import { WORKBENCH_DATASET_ID, workbenchFilterOptions } from './workbench-shared';

export const workbenchStarterDashboard: DashboardDefinition = {
  schemaVersion: '0.2.0',
  id: 'northstar-logistics-workbench',
  title: 'Northstar Logistics Control Tower',
  description:
    'A full-stack sample host that edits and renders dashboards against a secured local analytics backend.',
  filters: [
    {
      id: 'filter-region',
      title: 'Region',
      type: 'select',
      fieldRef: 'region',
      datasetRef: WORKBENCH_DATASET_ID,
      operator: 'equals',
      optionSource: {
        kind: 'static',
        completeness: 'complete',
        options: workbenchFilterOptions['filter-region'].map((value) => ({ value })),
      },
      scope: { type: 'global' },
    },
    {
      id: 'filter-carrier',
      title: 'Carrier',
      type: 'select',
      fieldRef: 'carrier',
      datasetRef: WORKBENCH_DATASET_ID,
      operator: 'equals',
      optionSource: {
        kind: 'static',
        completeness: 'complete',
        options: workbenchFilterOptions['filter-carrier'].map((value) => ({ value })),
      },
      scope: { type: 'global' },
    },
    {
      id: 'filter-shipped-at',
      title: 'Shipped At',
      type: 'date',
      fieldRef: 'shipped_at',
      datasetRef: WORKBENCH_DATASET_ID,
      operator: 'between',
      scope: { type: 'global' },
    },
  ],
  theme: {
    type: 'inline',
    colors: {
      primary: '#0f4c81',
      background: '#f4f8fd',
      surface: '#ffffff',
      text: '#10243b',
      muted: '#5f7389',
      border: '#d8e4f1',
    },
    typography: {
      fontFamily: 'Avenir Next, Segoe UI, sans-serif',
    },
  },
  defaults: {
    activePage: 'overview',
  },
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
          meta: { text: 'Northstar Logistics Control Tower', headerSize: 'large' },
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
          meta: { widgetRef: 'filters-all', width: 12, height: 88 },
        },
        'row-kpis': {
          id: 'row-kpis',
          type: 'row',
          parentId: 'grid-main',
          children: ['w-kpi-revenue', 'w-kpi-shipments', 'w-kpi-on-time'],
          meta: {},
        },
        'w-kpi-revenue': {
          id: 'w-kpi-revenue',
          type: 'widget',
          parentId: 'row-kpis',
          children: [],
          meta: { widgetRef: 'kpi-revenue', width: 4, height: 132 },
        },
        'w-kpi-shipments': {
          id: 'w-kpi-shipments',
          type: 'widget',
          parentId: 'row-kpis',
          children: [],
          meta: { widgetRef: 'kpi-shipments', width: 4, height: 132 },
        },
        'w-kpi-on-time': {
          id: 'w-kpi-on-time',
          type: 'widget',
          parentId: 'row-kpis',
          children: [],
          meta: { widgetRef: 'kpi-on-time', width: 4, height: 132 },
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
          meta: { widgetRef: 'chart-monthly-revenue', width: 7, height: 360 },
        },
        'w-bar': {
          id: 'w-bar',
          type: 'widget',
          parentId: 'row-charts',
          children: [],
          meta: { widgetRef: 'chart-carrier-delays', width: 5, height: 360 },
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
          meta: { widgetRef: 'table-lanes', width: 12, height: 340 },
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
            datasetRef: WORKBENCH_DATASET_ID,
            fields: [{ role: 'value', fieldRef: 'revenue', aggregation: 'sum' }],
          },
          config: { valueField: 'revenue', format: 'compact', prefix: '$' },
        },
        {
          id: 'kpi-shipments',
          type: 'kpi-card',
          title: 'Shipments',
          dataBinding: {
            datasetRef: WORKBENCH_DATASET_ID,
            fields: [{ role: 'value', fieldRef: 'shipment_count', aggregation: 'sum' }],
          },
          config: { valueField: 'shipment_count', format: 'compact' },
        },
        {
          id: 'kpi-on-time',
          type: 'kpi-card',
          title: 'On-Time Rate',
          dataBinding: {
            datasetRef: WORKBENCH_DATASET_ID,
            fields: [{ role: 'value', fieldRef: 'on_time_rate', aggregation: 'avg' }],
          },
          config: { valueField: 'on_time_rate', suffix: '%' },
        },
        {
          id: 'chart-monthly-revenue',
          type: 'line-chart',
          title: 'Monthly Revenue',
          dataBinding: {
            datasetRef: WORKBENCH_DATASET_ID,
            fields: [
              { role: 'x-axis', fieldRef: 'month' },
              { role: 'y-axis', fieldRef: 'revenue', aggregation: 'sum' },
            ],
          },
          config: { smooth: true, showLegend: false },
        },
        {
          id: 'chart-carrier-delays',
          type: 'bar-chart',
          title: 'Delayed Shipments by Carrier',
          dataBinding: {
            datasetRef: WORKBENCH_DATASET_ID,
            fields: [
              { role: 'x-axis', fieldRef: 'carrier' },
              { role: 'y-axis', fieldRef: 'delayed_shipments', aggregation: 'sum' },
            ],
          },
          config: { horizontal: true, showLegend: false },
        },
        {
          id: 'table-lanes',
          type: 'table',
          title: 'Lane Performance',
          dataBinding: {
            datasetRef: WORKBENCH_DATASET_ID,
            fields: [
              { role: 'category', fieldRef: 'lane' },
              { role: 'series', fieldRef: 'hub' },
              { role: 'name', fieldRef: 'carrier' },
              { role: 'value', fieldRef: 'on_time_rate', aggregation: 'avg' },
              { role: 'comparison', fieldRef: 'revenue', aggregation: 'sum' },
            ],
          },
          config: {
            columns: ['lane', 'hub', 'carrier', 'on_time_rate', 'revenue'],
            pageSize: 8,
          },
        },
      ],
    },
  ],
};
