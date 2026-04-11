/**
 * Storybook stories for the FieldBindingPicker component.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { FieldBindingPicker } from '../components/FieldBindingPicker';
import type { NormalizedDataset } from '@supersubset/data-model';

const ordersDataset: NormalizedDataset = {
  id: 'ds-orders',
  label: 'Orders',
  fields: [
    { id: 'order_date', label: 'Order Date', dataType: 'date', role: 'time' },
    { id: 'category', label: 'Category', dataType: 'string', role: 'dimension' },
    { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
    { id: 'product', label: 'Product', dataType: 'string', role: 'dimension' },
    { id: 'revenue', label: 'Revenue', dataType: 'number', role: 'measure', defaultAggregation: 'sum' },
    { id: 'quantity', label: 'Quantity', dataType: 'integer', role: 'measure', defaultAggregation: 'sum' },
    { id: 'profit', label: 'Profit', dataType: 'number', role: 'measure', defaultAggregation: 'sum' },
    { id: 'customer_id', label: 'Customer ID', dataType: 'string', role: 'key' },
  ],
  source: { type: 'table', name: 'orders' },
};

const productsDataset: NormalizedDataset = {
  id: 'ds-products',
  label: 'Products',
  fields: [
    { id: 'product_name', label: 'Product Name', dataType: 'string', role: 'dimension' },
    { id: 'price', label: 'Price', dataType: 'number', role: 'measure' },
    { id: 'sku', label: 'SKU', dataType: 'string', role: 'key' },
  ],
  source: { type: 'table', name: 'products' },
};

const meta: Meta<typeof FieldBindingPicker> = {
  title: 'Designer/FieldBindingPicker',
  component: FieldBindingPicker,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof FieldBindingPicker>;

export const SingleDataset: Story = {
  args: {
    datasets: [ordersDataset],
    selectedDatasetId: 'ds-orders',
    onFieldSelect: (field, dsId) => console.log('Field:', field.id, 'from', dsId),
  },
};

export const MultipleDatasets: Story = {
  args: {
    datasets: [ordersDataset, productsDataset],
    selectedDatasetId: 'ds-orders',
    onDatasetChange: (id) => console.log('Dataset:', id),
    onFieldSelect: (field, dsId) => console.log('Field:', field.id, 'from', dsId),
  },
};

export const WithBindingSlots: Story = {
  args: {
    datasets: [ordersDataset],
    selectedDatasetId: 'ds-orders',
    slots: [
      { role: 'x-axis', label: 'X Axis', acceptRoles: ['dimension', 'time'] },
      { role: 'y-axis', label: 'Y Axis', acceptRoles: ['measure'], multiple: true },
      { role: 'series', label: 'Series', acceptRoles: ['dimension'] },
    ],
    bindings: [
      { role: 'x-axis', fieldId: 'order_date', datasetId: 'ds-orders' },
      { role: 'y-axis', fieldId: 'revenue', datasetId: 'ds-orders' },
    ],
    onBindingsChange: (bindings) => console.log('Bindings:', bindings),
    onFieldSelect: (field) => console.log('Field:', field.id),
  },
};

export const EmptyState: Story = {
  args: {
    datasets: [],
  },
};
