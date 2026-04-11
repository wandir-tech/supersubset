/**
 * @supersubset/query-client — Query execution client for Supersubset.
 *
 * Coordinates query execution via host-provided QueryAdapter and caches
 * metadata from MetadataAdapter. The host app instantiates this and provides
 * the concrete adapters — Supersubset never connects to databases directly.
 */
import type {
  LogicalQuery,
  QueryResult,
  QueryAdapter,
  MetadataAdapter,
  NormalizedDataset,
  QueryFilter,
  QuerySort,
  AggregationType,
} from '@supersubset/data-model';

// Re-export key data-model types for convenience
export type {
  LogicalQuery,
  QueryResult,
  QueryAdapter,
  MetadataAdapter,
  NormalizedDataset,
  QueryFilter,
  QuerySort,
  AggregationType,
};

// ─── Query Client ────────────────────────────────────────────

export interface QueryClientOptions<TSource = unknown> {
  /** Host-provided query adapter for executing queries */
  queryAdapter: QueryAdapter;
  /** Host-provided metadata adapter for resolving dataset schemas */
  metadataAdapter?: MetadataAdapter<TSource>;
  /** Metadata source (passed to metadataAdapter.getDatasets) */
  metadataSource?: TSource;
  /** Cache TTL for metadata in ms. Default: 60000 (1 minute) */
  cacheTtlMs?: number;
}

export interface QueryClientQueryOptions {
  /** Signal for aborting the query (DOM AbortSignal) */
  signal?: { aborted: boolean };
}

/**
 * QueryClient wraps a host-provided QueryAdapter and MetadataAdapter.
 * It provides a higher-level API for executing queries and resolving metadata.
 */
export class QueryClient<TSource = unknown> {
  private readonly queryAdapter: QueryAdapter;
  private readonly metadataAdapter?: MetadataAdapter<TSource>;
  private readonly metadataSource?: TSource;
  private readonly cacheTtlMs: number;

  private cachedDatasets: NormalizedDataset[] | null = null;
  private cacheTimestamp = 0;

  constructor(options: QueryClientOptions<TSource>) {
    this.queryAdapter = options.queryAdapter;
    this.metadataAdapter = options.metadataAdapter;
    this.metadataSource = options.metadataSource;
    this.cacheTtlMs = options.cacheTtlMs ?? 60_000;
  }

  /** Execute a LogicalQuery via the host adapter */
  async execute(query: LogicalQuery, options?: QueryClientQueryOptions): Promise<QueryResult> {
    if (options?.signal?.aborted) {
      throw new Error('Query aborted');
    }
    return this.queryAdapter.execute(query);
  }

  /** Cancel a running query (if supported by the adapter) */
  async cancel(queryId: string): Promise<void> {
    if (this.queryAdapter.cancel) {
      return this.queryAdapter.cancel(queryId);
    }
  }

  /** Get all datasets from metadata adapter (cached) */
  async getDatasets(): Promise<NormalizedDataset[]> {
    if (!this.metadataAdapter) {
      throw new Error('No metadataAdapter configured');
    }
    const now = Date.now();
    if (this.cachedDatasets && now - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cachedDatasets;
    }
    this.cachedDatasets = await this.metadataAdapter.getDatasets(this.metadataSource as TSource);
    this.cacheTimestamp = now;
    return this.cachedDatasets;
  }

  /** Get a single dataset by ID */
  async getDataset(datasetId: string): Promise<NormalizedDataset | undefined> {
    if (!this.metadataAdapter) {
      throw new Error('No metadataAdapter configured');
    }
    return this.metadataAdapter.getDataset(this.metadataSource as TSource, datasetId);
  }

  /** Invalidate the metadata cache */
  invalidateCache(): void {
    this.cachedDatasets = null;
    this.cacheTimestamp = 0;
  }

  /** Build a query helper with fluent API */
  buildQuery(datasetId: string): QueryBuilder {
    return new QueryBuilder(datasetId, this);
  }
}

// ─── Query Builder (Fluent API) ──────────────────────────────

/**
 * Fluent query builder for constructing LogicalQuery objects.
 */
export class QueryBuilder {
  private query: LogicalQuery;
  private client: QueryClient;

  constructor(datasetId: string, client: QueryClient) {
    this.query = { datasetId, fields: [] };
    this.client = client;
  }

  /** Add a field to select */
  select(fieldId: string, aggregation?: AggregationType, alias?: string): this {
    this.query.fields.push({ fieldId, aggregation, alias });
    return this;
  }

  /** Add a filter */
  where(filter: QueryFilter): this {
    if (!this.query.filters) this.query.filters = [];
    this.query.filters.push(filter);
    return this;
  }

  /** Add sorting */
  orderBy(fieldId: string, direction: 'asc' | 'desc' = 'asc'): this {
    if (!this.query.sort) this.query.sort = [];
    this.query.sort.push({ fieldId, direction });
    return this;
  }

  /** Set limit */
  limit(n: number): this {
    this.query.limit = n;
    return this;
  }

  /** Set offset */
  offset(n: number): this {
    this.query.offset = n;
    return this;
  }

  /** Get the built LogicalQuery */
  toQuery(): LogicalQuery {
    return { ...this.query };
  }

  /** Execute the query */
  async execute(options?: QueryClientQueryOptions): Promise<QueryResult> {
    return this.client.execute(this.toQuery(), options);
  }
}
