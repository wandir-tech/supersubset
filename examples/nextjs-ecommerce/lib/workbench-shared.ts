import type { DashboardDefinition } from '@supersubset/schema';
import type { NormalizedDataset } from '@supersubset/data-model';

export const WORKBENCH_DATASET_ID = 'ops-shipments';
export const WORKBENCH_DASHBOARD_STORAGE_KEY = 'supersubset:nextjs-workbench-dashboard';
export const WORKBENCH_TOKEN_STORAGE_KEY = 'supersubset:nextjs-workbench-token';

export const workbenchFilterOptions = {
  'filter-region': ['APAC', 'Europe', 'Latin America', 'North America'],
  'filter-carrier': ['Atlas Air', 'Horizon Freight', 'Meridian Cargo'],
};

export const workbenchDatasets: NormalizedDataset[] = [
  {
    id: WORKBENCH_DATASET_ID,
    label: 'Shipment Performance',
    description: 'Monthly and lane-level shipment performance for the Northstar logistics network.',
    source: { type: 'model', ref: 'northstar.shipment_performance' },
    fields: [
      { id: 'shipped_at', label: 'Shipped At', dataType: 'date', role: 'time' },
      { id: 'month', label: 'Month', dataType: 'string', role: 'time' },
      { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
      { id: 'hub', label: 'Hub', dataType: 'string', role: 'dimension' },
      { id: 'carrier', label: 'Carrier', dataType: 'string', role: 'dimension' },
      { id: 'lane', label: 'Lane', dataType: 'string', role: 'dimension' },
      { id: 'service_level', label: 'Service Level', dataType: 'string', role: 'dimension' },
      {
        id: 'revenue',
        label: 'Revenue',
        dataType: 'number',
        role: 'measure',
        defaultAggregation: 'sum',
      },
      {
        id: 'shipment_count',
        label: 'Shipment Count',
        dataType: 'integer',
        role: 'measure',
        defaultAggregation: 'sum',
      },
      {
        id: 'delayed_shipments',
        label: 'Delayed Shipments',
        dataType: 'integer',
        role: 'measure',
        defaultAggregation: 'sum',
      },
      {
        id: 'on_time_rate',
        label: 'On-Time Rate',
        dataType: 'number',
        role: 'measure',
        defaultAggregation: 'avg',
      },
      {
        id: 'average_delay_hours',
        label: 'Average Delay Hours',
        dataType: 'number',
        role: 'measure',
        defaultAggregation: 'avg',
      },
      {
        id: 'load_factor',
        label: 'Load Factor',
        dataType: 'number',
        role: 'measure',
        defaultAggregation: 'avg',
      },
    ],
  },
];

export function isDashboardDefinition(value: unknown): value is DashboardDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    'pages' in value &&
    Array.isArray((value as { pages?: unknown }).pages)
  );
}
