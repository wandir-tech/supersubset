import { describe, it, expect, vi } from 'vitest';
import type {
  FilterOptionRequest,
  FilterOptionResponse,
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
  resolveFilterOptionsWithAdapter,
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

  it('supports an optional filter option resolver capability', async () => {
    const request: FilterOptionRequest = {
      filterId: 'status-filter',
      datasetId: 'orders',
      fieldId: 'status',
      search: 'op',
      limit: 10,
    };

    const mockResponse: FilterOptionResponse = {
      options: [
        { value: 'open', label: 'Open' },
        { value: 'opened_recently', label: 'Opened Recently', disabled: true },
      ],
      complete: false,
      nextCursor: 'cursor-2',
    };

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
      async resolveFilterOptions() {
        return mockResponse;
      },
    };

    const response = await mockQuery.resolveFilterOptions?.(request);
    expect(response).toEqual(mockResponse);
  });
});

describe('resolveFilterOptionsWithAdapter', () => {
  function makeAdapter(
    rows: Array<Record<string, unknown>>,
    extra: Partial<QueryResult> = {},
  ): QueryAdapter & { execute: ReturnType<typeof vi.fn> } {
    return {
      name: 'mock',
      execute: vi.fn().mockResolvedValue({
        columns: [{ fieldId: 'status', label: 'Status', dataType: 'string' }],
        rows,
        ...extra,
      } satisfies QueryResult),
    };
  }

  it('synthesizes a distinct LogicalQuery and returns dedup-defensive options', async () => {
    const adapter = makeAdapter([
      { status: 'open' },
      { status: 'open' },
      { status: 'closed' },
      { status: null },
    ]);

    const response = await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f',
      datasetId: 'orders',
      fieldId: 'status',
      limit: 50,
    });

    expect(adapter.execute).toHaveBeenCalledWith({
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }],
      limit: 50,
      distinct: true,
    });
    expect(response.options).toEqual([{ value: 'open' }, { value: 'closed' }]);
  });

  it('wraps a bare search term with % for contains semantics', async () => {
    const adapter = makeAdapter([{ status: 'open' }]);

    await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f',
      datasetId: 'orders',
      fieldId: 'status',
      search: 'op',
    });

    expect(adapter.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ fieldId: 'status', operator: 'like', value: '%op%' }],
      }),
    );
  });

  it('passes a search term through verbatim when the caller already uses wildcards', async () => {
    const adapter = makeAdapter([{ status: 'op_en' }]);

    await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f',
      datasetId: 'orders',
      fieldId: 'status',
      search: 'op_%',
    });

    expect(adapter.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ fieldId: 'status', operator: 'like', value: 'op_%' }],
      }),
    );
  });

  it('reports complete: false when the adapter signals truncation', async () => {
    const adapter = makeAdapter([{ status: 'open' }, { status: 'closed' }], { truncated: true });

    const response = await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f',
      datasetId: 'orders',
      fieldId: 'status',
      limit: 50,
    });

    expect(response.complete).toBe(false);
  });

  it('reports complete: true when the adapter signals no truncation, even if dedup shrank the list below limit', async () => {
    const adapter = makeAdapter(
      // 3 rows post-dedup → 2 distinct values, well below limit 50, but
      // truncated:false means there are no more rows to fetch
      [{ status: 'open' }, { status: 'open' }, { status: 'closed' }],
      { truncated: false },
    );

    const response = await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f',
      datasetId: 'orders',
      fieldId: 'status',
      limit: 50,
    });

    expect(response.options).toHaveLength(2);
    expect(response.complete).toBe(true);
  });

  it('falls back to the length heuristic when the adapter does not set truncated', async () => {
    const adapter = makeAdapter([{ status: 'open' }, { status: 'closed' }]);

    const response = await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f',
      datasetId: 'orders',
      fieldId: 'status',
      limit: 50,
    });

    expect(response.complete).toBe(true);
  });

  it('delegates to the adapter when resolveFilterOptions is implemented', async () => {
    const mockResponse: FilterOptionResponse = {
      options: [{ value: 'curated' }],
      complete: true,
    };
    const adapter: QueryAdapter = {
      name: 'curated',
      execute: vi.fn(),
      resolveFilterOptions: vi.fn().mockResolvedValue(mockResponse),
    };

    const response = await resolveFilterOptionsWithAdapter(adapter, {
      filterId: 'f',
      datasetId: 'orders',
      fieldId: 'status',
    });

    expect(adapter.execute).not.toHaveBeenCalled();
    expect(response).toEqual(mockResponse);
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
