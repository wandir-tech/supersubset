import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryBuilder } from '../src/index';
import type {
  FilterOptionResponse,
  QueryAdapter,
  MetadataAdapter,
  NormalizedDataset,
  LogicalQuery,
  QueryResult,
} from '../src/index';

// ─── Test Fixtures ───────────────────────────────────────────

const mockDatasets: NormalizedDataset[] = [
  {
    id: 'orders',
    label: 'Orders',
    fields: [
      { id: 'id', label: 'ID', dataType: 'integer', role: 'key' },
      {
        id: 'total',
        label: 'Total',
        dataType: 'number',
        role: 'measure',
        defaultAggregation: 'sum',
      },
      { id: 'status', label: 'Status', dataType: 'string', role: 'dimension' },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    fields: [
      { id: 'id', label: 'ID', dataType: 'integer', role: 'key' },
      { id: 'name', label: 'Name', dataType: 'string', role: 'dimension' },
    ],
  },
];

const mockResult: QueryResult = {
  columns: [
    { fieldId: 'status', label: 'Status', dataType: 'string' },
    { fieldId: 'total', label: 'Total', dataType: 'number' },
  ],
  rows: [
    { status: 'delivered', total: 1000 },
    { status: 'shipped', total: 500 },
  ],
  totalRows: 2,
};

function createMockAdapters() {
  const mockFilterOptionResponse: FilterOptionResponse = {
    options: [
      { value: 'delivered', label: 'Delivered' },
      { value: 'shipped', label: 'Shipped' },
    ],
    complete: true,
  };

  const queryAdapter: QueryAdapter = {
    name: 'mock-query',
    execute: vi.fn().mockResolvedValue(mockResult),
    cancel: vi.fn().mockResolvedValue(undefined),
    resolveFilterOptions: vi.fn().mockResolvedValue(mockFilterOptionResponse),
  };

  const metadataAdapter: MetadataAdapter<string> = {
    name: 'mock-metadata',
    getDatasets: vi.fn().mockResolvedValue(mockDatasets),
    getDataset: vi
      .fn()
      .mockImplementation(async (_source: string, id: string) =>
        mockDatasets.find((d) => d.id === id),
      ),
  };

  return { queryAdapter, metadataAdapter };
}

// ─── Tests ───────────────────────────────────────────────────

describe('QueryClient', () => {
  let queryAdapter: QueryAdapter;
  let metadataAdapter: MetadataAdapter<string>;
  let client: QueryClient<string>;

  beforeEach(() => {
    const mocks = createMockAdapters();
    queryAdapter = mocks.queryAdapter;
    metadataAdapter = mocks.metadataAdapter;
    client = new QueryClient({
      queryAdapter,
      metadataAdapter,
      metadataSource: 'test-source',
    });
  });

  it('executes a query via the adapter', async () => {
    const query: LogicalQuery = {
      datasetId: 'orders',
      fields: [{ fieldId: 'status' }, { fieldId: 'total', aggregation: 'sum' }],
    };
    const result = await client.execute(query);
    expect(queryAdapter.execute).toHaveBeenCalledWith(query);
    expect(result.rows).toHaveLength(2);
    expect(result.totalRows).toBe(2);
  });

  it('throws on aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const query: LogicalQuery = { datasetId: 'orders', fields: [{ fieldId: 'status' }] };
    await expect(client.execute(query, { signal: controller.signal })).rejects.toThrow(
      'Query aborted',
    );
  });

  it('cancels a query via the adapter', async () => {
    await client.cancel('query-123');
    expect(queryAdapter.cancel).toHaveBeenCalledWith('query-123');
  });

  it('resolves filter options via the adapter', async () => {
    const response = await client.resolveFilterOptions({
      filterId: 'status-filter',
      datasetId: 'orders',
      fieldId: 'status',
      search: 'sh',
      limit: 25,
    });

    expect(queryAdapter.resolveFilterOptions).toHaveBeenCalledWith({
      filterId: 'status-filter',
      datasetId: 'orders',
      fieldId: 'status',
      search: 'sh',
      limit: 25,
    });
    expect(response.options).toHaveLength(2);
    expect(response.complete).toBe(true);
  });

  it('throws when filter option resolution is not supported', async () => {
    const clientNoResolver = new QueryClient({
      queryAdapter: { name: 'no-resolver', execute: vi.fn().mockResolvedValue(mockResult) },
    });

    await expect(
      clientNoResolver.resolveFilterOptions({
        filterId: 'status-filter',
        datasetId: 'orders',
        fieldId: 'status',
      }),
    ).rejects.toThrow('Query adapter does not support filter option resolution');
  });

  it('cancel is a no-op when adapter has no cancel', async () => {
    const clientNoCancel = new QueryClient({
      queryAdapter: { name: 'no-cancel', execute: vi.fn() },
    });
    // Should not throw
    await clientNoCancel.cancel('query-123');
  });

  it('fetches datasets from metadata adapter', async () => {
    const datasets = await client.getDatasets();
    expect(metadataAdapter.getDatasets).toHaveBeenCalledWith('test-source');
    expect(datasets).toHaveLength(2);
    expect(datasets[0].id).toBe('orders');
  });

  it('caches datasets within TTL', async () => {
    await client.getDatasets();
    await client.getDatasets();
    // Second call should use cache
    expect(metadataAdapter.getDatasets).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache', async () => {
    await client.getDatasets();
    client.invalidateCache();
    await client.getDatasets();
    expect(metadataAdapter.getDatasets).toHaveBeenCalledTimes(2);
  });

  it('fetches a single dataset by ID', async () => {
    const dataset = await client.getDataset('orders');
    expect(dataset?.id).toBe('orders');
    expect(dataset?.fields).toHaveLength(3);
  });

  it('returns undefined for unknown dataset', async () => {
    const dataset = await client.getDataset('nonexistent');
    expect(dataset).toBeUndefined();
  });

  it('throws when getDatasets called without metadataAdapter', async () => {
    const clientNoMeta = new QueryClient({ queryAdapter });
    await expect(clientNoMeta.getDatasets()).rejects.toThrow('No metadataAdapter configured');
  });

  it('throws when getDataset called without metadataAdapter', async () => {
    const clientNoMeta = new QueryClient({ queryAdapter });
    await expect(clientNoMeta.getDataset('orders')).rejects.toThrow(
      'No metadataAdapter configured',
    );
  });
});

describe('QueryBuilder', () => {
  let queryAdapter: QueryAdapter;
  let client: QueryClient;

  beforeEach(() => {
    queryAdapter = {
      name: 'mock-query',
      execute: vi.fn().mockResolvedValue(mockResult),
    };
    client = new QueryClient({ queryAdapter });
  });

  it('builds a basic query', () => {
    const query = client.buildQuery('orders').select('status').select('total', 'sum').toQuery();

    expect(query.datasetId).toBe('orders');
    expect(query.fields).toHaveLength(2);
    expect(query.fields[0]).toEqual({
      fieldId: 'status',
      aggregation: undefined,
      alias: undefined,
    });
    expect(query.fields[1]).toEqual({ fieldId: 'total', aggregation: 'sum', alias: undefined });
  });

  it('builds a query with filters', () => {
    const query = client
      .buildQuery('orders')
      .select('total', 'sum')
      .where({ fieldId: 'status', operator: 'eq', value: 'delivered' })
      .toQuery();

    expect(query.filters).toHaveLength(1);
    expect(query.filters![0].operator).toBe('eq');
  });

  it('builds a query with sorting and pagination', () => {
    const query = client
      .buildQuery('orders')
      .select('total')
      .orderBy('total', 'desc')
      .limit(10)
      .offset(20)
      .toQuery();

    expect(query.sort).toEqual([{ fieldId: 'total', direction: 'desc' }]);
    expect(query.limit).toBe(10);
    expect(query.offset).toBe(20);
  });

  it('executes the built query', async () => {
    const result = await client.buildQuery('orders').select('status').execute();

    expect(queryAdapter.execute).toHaveBeenCalled();
    expect(result.rows).toHaveLength(2);
  });

  it('chains multiple filters', () => {
    const query = client
      .buildQuery('orders')
      .select('total')
      .where({ fieldId: 'status', operator: 'eq', value: 'delivered' })
      .where({ fieldId: 'total', operator: 'gt', value: 100 })
      .toQuery();

    expect(query.filters).toHaveLength(2);
  });

  it('supports field alias', () => {
    const query = client.buildQuery('orders').select('total', 'sum', 'revenue').toQuery();

    expect(query.fields[0].alias).toBe('revenue');
  });
});
