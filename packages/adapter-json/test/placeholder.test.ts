import { describe, it, expect } from 'vitest';
import { JsonAdapter } from '../src/index.js';
import type { JsonAdapterSource } from '../src/index.js';

const adapter = new JsonAdapter();

const FIXTURE: JsonAdapterSource = [
  {
    id: 'orders',
    label: 'Orders',
    description: 'Customer orders',
    fields: [
      { id: 'id', dataType: 'integer', role: 'key' },
      { id: 'order_date', dataType: 'date' },
      { id: 'total_amount', dataType: 'number' },
      { id: 'status', dataType: 'string' },
      { id: 'is_fulfilled', dataType: 'boolean' },
      { id: 'customer_id', dataType: 'integer' },
    ],
    relationships: [
      {
        targetDatasetId: 'customers',
        type: 'many-to-one',
        sourceFieldId: 'customer_id',
        targetFieldId: 'id',
      },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    fields: [
      { id: 'id', dataType: 'integer', role: 'key' },
      { id: 'name', dataType: 'string', label: 'Customer Name' },
      { id: 'email', dataType: 'string' },
    ],
  },
];

describe('JsonAdapter', () => {
  it('has correct name', () => {
    expect(adapter.name).toBe('json');
  });

  describe('getDatasets', () => {
    it('returns all datasets', async () => {
      const datasets = await adapter.getDatasets(FIXTURE);
      expect(datasets).toHaveLength(2);
      expect(datasets[0].id).toBe('orders');
      expect(datasets[1].id).toBe('customers');
    });

    it('preserves dataset metadata', async () => {
      const [orders] = await adapter.getDatasets(FIXTURE);
      expect(orders.label).toBe('Orders');
      expect(orders.description).toBe('Customer orders');
    });

    it('normalizes fields', async () => {
      const [orders] = await adapter.getDatasets(FIXTURE);
      expect(orders.fields).toHaveLength(6);
      const idField = orders.fields.find((f) => f.id === 'id');
      expect(idField?.role).toBe('key');
    });

    it('infers roles when not provided', async () => {
      const [orders] = await adapter.getDatasets(FIXTURE);
      const dateField = orders.fields.find((f) => f.id === 'order_date');
      expect(dateField?.role).toBe('time');

      const amountField = orders.fields.find((f) => f.id === 'total_amount');
      expect(amountField?.role).toBe('measure');
      expect(amountField?.defaultAggregation).toBe('sum');

      const statusField = orders.fields.find((f) => f.id === 'status');
      expect(statusField?.role).toBe('dimension');
    });

    it('infers labels via humanizeFieldName when not provided', async () => {
      const [orders] = await adapter.getDatasets(FIXTURE);
      const dateField = orders.fields.find((f) => f.id === 'order_date');
      expect(dateField?.label).toBe('Order Date');

      const amountField = orders.fields.find((f) => f.id === 'total_amount');
      expect(amountField?.label).toBe('Total Amount');
    });

    it('preserves explicit labels', async () => {
      const [, customers] = await adapter.getDatasets(FIXTURE);
      const nameField = customers.fields.find((f) => f.id === 'name');
      expect(nameField?.label).toBe('Customer Name');
    });

    it('preserves relationships', async () => {
      const [orders] = await adapter.getDatasets(FIXTURE);
      expect(orders.relationships).toHaveLength(1);
      expect(orders.relationships![0].targetDatasetId).toBe('customers');
    });

    it('infers key role for customer_id', async () => {
      const [orders] = await adapter.getDatasets(FIXTURE);
      const custId = orders.fields.find((f) => f.id === 'customer_id');
      expect(custId?.role).toBe('key');
    });

    it('identifies boolean fields as dimension', async () => {
      const [orders] = await adapter.getDatasets(FIXTURE);
      const fulfilled = orders.fields.find((f) => f.id === 'is_fulfilled');
      expect(fulfilled?.role).toBe('dimension');
    });
  });

  describe('getDataset', () => {
    it('returns a single dataset by id', async () => {
      const ds = await adapter.getDataset(FIXTURE, 'orders');
      expect(ds?.id).toBe('orders');
    });

    it('returns undefined for missing dataset', async () => {
      const ds = await adapter.getDataset(FIXTURE, 'nonexistent');
      expect(ds).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty source array', async () => {
      const datasets = await adapter.getDatasets([]);
      expect(datasets).toEqual([]);
    });

    it('handles dataset with no relationships', async () => {
      const datasets = await adapter.getDatasets([
        { id: 'simple', label: 'Simple', fields: [{ id: 'x', dataType: 'string' }] },
      ]);
      expect(datasets[0].relationships).toBeUndefined();
    });

    it('preserves optional field properties', async () => {
      const datasets = await adapter.getDatasets([
        {
          id: 'test',
          label: 'Test',
          fields: [
            { id: 'price', dataType: 'number', format: '$0,0.00', description: 'Unit price' },
          ],
        },
      ]);
      const f = datasets[0].fields[0];
      expect(f.format).toBe('$0,0.00');
      expect(f.description).toBe('Unit price');
    });
  });

  describe('validation', () => {
    it('rejects non-array source', async () => {
      await expect(adapter.getDatasets('bad' as unknown as JsonAdapterSource)).rejects.toThrow(
        'source must be an array',
      );
    });

    it('rejects dataset without id', async () => {
      await expect(
        adapter.getDatasets([{ label: 'X', fields: [] } as unknown as JsonAdapterSource[0]]),
      ).rejects.toThrow('non-empty string "id"');
    });

    it('rejects dataset without label', async () => {
      await expect(
        adapter.getDatasets([{ id: 'x', fields: [] } as unknown as JsonAdapterSource[0]]),
      ).rejects.toThrow('non-empty string "label"');
    });

    it('rejects field with invalid dataType', async () => {
      await expect(
        adapter.getDatasets([
          { id: 'x', label: 'X', fields: [{ id: 'f', dataType: 'bad' as never }] },
        ]),
      ).rejects.toThrow('invalid dataType');
    });

    it('rejects field with invalid role', async () => {
      await expect(
        adapter.getDatasets([
          { id: 'x', label: 'X', fields: [{ id: 'f', dataType: 'string', role: 'bad' as never }] },
        ]),
      ).rejects.toThrow('invalid role');
    });
  });
});
