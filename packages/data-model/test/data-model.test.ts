import { describe, it, expect } from 'vitest';
import type {
  NormalizedDataset,
  NormalizedField,
  MetadataAdapter,
  QueryAdapter,
  LogicalQuery,
  QueryResult,
} from '../src';

describe('NormalizedDataset type', () => {
  it('can construct a dataset with fields', () => {
    const dataset: NormalizedDataset = {
      id: 'orders',
      label: 'Orders',
      fields: [
        { id: 'id', label: 'Order ID', dataType: 'integer', role: 'key' },
        { id: 'total', label: 'Total', dataType: 'number', role: 'measure', defaultAggregation: 'sum' },
        { id: 'date', label: 'Order Date', dataType: 'date', role: 'time' },
        { id: 'status', label: 'Status', dataType: 'string', role: 'dimension' },
      ],
    };
    expect(dataset.fields).toHaveLength(4);
    expect(dataset.fields[1].role).toBe('measure');
  });

  it('supports optional relationships', () => {
    const dataset: NormalizedDataset = {
      id: 'order_items',
      label: 'Order Items',
      fields: [
        { id: 'order_id', label: 'Order ID', dataType: 'integer', role: 'key' },
        { id: 'quantity', label: 'Quantity', dataType: 'integer', role: 'measure' },
      ],
      relationships: [
        {
          targetDatasetId: 'orders',
          type: 'many-to-one',
          sourceFieldId: 'order_id',
          targetFieldId: 'id',
          joinType: 'inner',
        },
      ],
    };
    expect(dataset.relationships).toHaveLength(1);
    expect(dataset.relationships![0].type).toBe('many-to-one');
  });
});

describe('MetadataAdapter interface', () => {
  it('can implement a minimal adapter', async () => {
    const mockAdapter: MetadataAdapter<string> = {
      name: 'test-adapter',
      async getDatasets() {
        return [
          {
            id: 'test',
            label: 'Test',
            fields: [{ id: 'f1', label: 'Field', dataType: 'string', role: 'dimension' }],
          },
        ];
      },
      async getDataset(_source, id) {
        if (id === 'test') {
          return {
            id: 'test',
            label: 'Test',
            fields: [{ id: 'f1', label: 'Field', dataType: 'string', role: 'dimension' }],
          };
        }
        return undefined;
      },
    };

    const datasets = await mockAdapter.getDatasets('source');
    expect(datasets).toHaveLength(1);

    const single = await mockAdapter.getDataset('source', 'test');
    expect(single?.id).toBe('test');

    const missing = await mockAdapter.getDataset('source', 'nope');
    expect(missing).toBeUndefined();
  });
});

describe('QueryAdapter interface', () => {
  it('can implement a mock query adapter', async () => {
    const mockQuery: QueryAdapter = {
      name: 'mock-query',
      async execute(query: LogicalQuery): Promise<QueryResult> {
        return {
          columns: query.fields.map((f) => ({
            fieldId: f.fieldId,
            label: f.fieldId,
            dataType: 'string',
          })),
          rows: [{ [query.fields[0].fieldId]: 'test-value' }],
          totalRows: 1,
        };
      },
    };

    const result = await mockQuery.execute({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }],
    });
    expect(result.rows).toHaveLength(1);
    expect(result.columns[0].fieldId).toBe('status');
  });
});
