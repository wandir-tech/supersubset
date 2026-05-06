import type { DataModelRef } from '@supersubset/schema';

export const SQLITE_DATASET_ID = 'sqlite-orders';

export const sqliteDatasetFields = [
  { id: 'ordered_at', label: 'Order Date', dataType: 'date', role: 'time' },
  { id: 'month', label: 'Month', dataType: 'string', role: 'time' },
  { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
  { id: 'category', label: 'Category', dataType: 'string', role: 'dimension' },
  { id: 'product_name', label: 'Product', dataType: 'string', role: 'dimension' },
  { id: 'channel', label: 'Channel', dataType: 'string', role: 'dimension' },
  {
    id: 'revenue',
    label: 'Revenue',
    dataType: 'number',
    role: 'measure',
    defaultAggregation: 'sum',
  },
  {
    id: 'orders',
    label: 'Orders',
    dataType: 'integer',
    role: 'measure',
    defaultAggregation: 'count',
  },
  {
    id: 'units',
    label: 'Units',
    dataType: 'integer',
    role: 'measure',
    defaultAggregation: 'sum',
  },
  {
    id: 'aov',
    label: 'Average Order Value',
    dataType: 'number',
    role: 'measure',
    defaultAggregation: 'avg',
  },
  {
    id: 'previousRevenue',
    label: 'Previous Revenue',
    dataType: 'number',
    role: 'measure',
    defaultAggregation: 'sum',
  },
  {
    id: 'previousOrders',
    label: 'Previous Orders',
    dataType: 'integer',
    role: 'measure',
    defaultAggregation: 'count',
  },
  {
    id: 'previousAov',
    label: 'Previous Average Order Value',
    dataType: 'number',
    role: 'measure',
    defaultAggregation: 'avg',
  },
] as const;

export const sqliteDataModel = {
  type: 'inline',
  datasets: [
    {
      id: SQLITE_DATASET_ID,
      label: 'SQLite Orders',
      fields: [...sqliteDatasetFields],
    },
  ],
} satisfies DataModelRef;
