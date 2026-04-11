/**
 * Storybook stories for the FilterBuilderPanel component.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { FilterBuilderPanel, type FilterDefinition } from '../components/FilterBuilderPanel';
import type { NormalizedDataset } from '@supersubset/data-model';

const ordersDataset: NormalizedDataset = {
  id: 'ds-orders',
  label: 'Orders',
  fields: [
    { id: 'order_date', label: 'Order Date', dataType: 'date', role: 'time' },
    { id: 'category', label: 'Category', dataType: 'string', role: 'dimension' },
    { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
    { id: 'revenue', label: 'Revenue', dataType: 'number', role: 'measure', defaultAggregation: 'sum' },
  ],
  source: { type: 'table', name: 'orders' },
};

const sampleFilters: FilterDefinition[] = [
  {
    id: 'f-region',
    title: 'Region Filter',
    type: 'select',
    fieldRef: 'region',
    datasetRef: 'ds-orders',
    operator: 'equals',
    scope: { type: 'global' },
  },
  {
    id: 'f-date',
    title: 'Date Range',
    type: 'date-range',
    fieldRef: 'order_date',
    datasetRef: 'ds-orders',
    operator: 'between',
    scope: { type: 'page', pageId: 'page-1' },
  },
];

const meta: Meta<typeof FilterBuilderPanel> = {
  title: 'Designer/FilterBuilderPanel',
  component: FilterBuilderPanel,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof FilterBuilderPanel>;

export const Empty: Story = {
  args: {
    filters: [],
    onChange: (filters) => console.log('Filters:', filters),
    datasets: [ordersDataset],
  },
};

export const WithFilters: Story = {
  args: {
    filters: sampleFilters,
    onChange: (filters) => console.log('Filters:', filters),
    datasets: [ordersDataset],
    pageIds: ['page-1', 'page-2'],
    widgetIds: ['widget-1', 'widget-2', 'widget-3'],
  },
};
