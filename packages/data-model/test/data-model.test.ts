import { describe, it, expect } from 'vitest';
import type {
  NormalizedDataset,
  NormalizedField,
  MetadataAdapter,
  QueryAdapter,
  LogicalQuery,
  QueryResult,
  ProbeCapabilities,
  ProbeDatasetsResponse,
  ProbeQueryResponse,
} from '../src';
import {
  PROBE_PROTOCOL_VERSION,
  PROBE_STANDARD_AGGREGATIONS,
  PROBE_STANDARD_FILTER_OPERATORS,
  PROBE_STANDARD_SOURCE_TYPES,
} from '../src';

describe('NormalizedDataset type', () => {
  it('can construct a dataset with fields', () => {
    const dataset: NormalizedDataset = {
      id: 'orders',
      label: 'Orders',
      fields: [
        { id: 'id', label: 'Order ID', dataType: 'integer', role: 'key' },
        {
          id: 'total',
          label: 'Total',
          dataType: 'number',
          role: 'measure',
          defaultAggregation: 'sum',
        },
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

describe('probe contract', () => {
  const capabilities: ProbeCapabilities = {
    supportedAggregations: [...PROBE_STANDARD_AGGREGATIONS],
    supportedFilterOperators: [...PROBE_STANDARD_FILTER_OPERATORS],
    supportedSourceTypes: [...PROBE_STANDARD_SOURCE_TYPES],
    supportsMetadataDiscovery: true,
    supportsQueryExecution: true,
    maxLimit: 5000,
  };

  it('exposes a stable protocol version', () => {
    expect(PROBE_PROTOCOL_VERSION).toBe('v1');
  });

  it('can construct a datasets response envelope', () => {
    const response: ProbeDatasetsResponse = {
      protocolVersion: PROBE_PROTOCOL_VERSION,
      capabilities,
      datasets: [
        {
          id: 'orders',
          label: 'Orders',
          source: { type: 'table', ref: 'public.orders' },
          fields: [
            { id: 'region', label: 'Region', dataType: 'string', role: 'dimension' },
            {
              id: 'revenue',
              label: 'Revenue',
              dataType: 'number',
              role: 'measure',
              defaultAggregation: 'sum',
            },
          ],
        },
      ],
    };

    expect(response.capabilities.supportedFilterOperators).toContain('between');
    expect(response.datasets[0].source?.type).toBe('table');
  });

  it('can construct a query response envelope', () => {
    const response: ProbeQueryResponse = {
      protocolVersion: PROBE_PROTOCOL_VERSION,
      capabilities,
      columns: [
        { fieldId: 'region', label: 'Region', dataType: 'string' },
        { fieldId: 'revenue', label: 'Revenue', dataType: 'number' },
      ],
      rows: [{ region: 'North', revenue: 12_500 }],
      totalRows: 1,
    };

    expect(response.capabilities.supportedAggregations).toContain('count_distinct');
    expect(response.rows[0].region).toBe('North');
  });
});
