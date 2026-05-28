/**
 * @supersubset/data-model — Analytical metadata model and adapter interfaces.
 *
 * This package defines the normalized metadata model that all adapters produce
 * and the query abstraction that the runtime consumes. It has NO adapter-specific
 * dependencies — those live in packages/adapter-*.
 */

// ─── Normalized Metadata Model ───────────────────────────────

/**
 * A logical dataset (table, view, model) in the host's data layer.
 * Adapters normalize source-specific metadata into this shape.
 */
export interface NormalizedDataset {
  id: string;
  label: string;
  description?: string;
  source?: DatasetSource;
  fields: NormalizedField[];
  relationships?: DatasetRelationship[];
}

export interface DatasetSource {
  type: 'table' | 'view' | 'model' | 'query' | 'file';
  ref?: string;
}

/**
 * A field (column, measure, computed) in a dataset.
 * Adapters infer role via heuristics; hosts can override.
 */
export interface NormalizedField {
  id: string;
  label: string;
  dataType: FieldDataType;
  role: FieldRole;
  defaultAggregation?: AggregationType;
  format?: string;
  sourceExpression?: string;
  description?: string;
}

export type FieldDataType =
  | 'string'
  | 'number'
  | 'integer'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'json'
  | 'unknown';

export type FieldRole = 'dimension' | 'measure' | 'time' | 'key' | 'unknown';

export type AggregationType = 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max' | 'none';

export interface DatasetRelationship {
  targetDatasetId: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  sourceFieldId: string;
  targetFieldId: string;
  joinType?: 'inner' | 'left' | 'right' | 'full';
}

// ─── Adapter Interface ───────────────────────────────────────

/**
 * A MetadataAdapter normalizes a source-specific schema into NormalizedDatasets.
 * Each adapter (Prisma, SQL, dbt, JSON) implements this interface.
 */
export interface MetadataAdapter<TSource = unknown> {
  readonly name: string;
  getDatasets(source: TSource): Promise<NormalizedDataset[]>;
  getDataset(source: TSource, datasetId: string): Promise<NormalizedDataset | undefined>;
}

// ─── Query Abstraction ───────────────────────────────────────

export interface LogicalQuery {
  datasetId: string;
  fields: QueryField[];
  filters?: QueryFilter[];
  sort?: QuerySort[];
  limit?: number;
  offset?: number;
  /**
   * When true, the executor must return distinct rows (SQL `SELECT DISTINCT` or
   * equivalent). Additive — adapters that ignore it return non-distinct rows
   * (legacy behavior). See ADR-011.
   */
  distinct?: boolean;
}

export interface QueryField {
  fieldId: string;
  aggregation?: AggregationType;
  alias?: string;
}

export interface QueryFilter {
  fieldId: string;
  operator: QueryFilterOperator;
  /** Omitted for operators like `is_null` / `is_not_null` that take no value. */
  value?: unknown;
}

export type QueryFilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'like'
  | 'not_like'
  | 'is_null'
  | 'is_not_null'
  | 'between';

export interface QuerySort {
  fieldId: string;
  direction: 'asc' | 'desc';
}

export interface QueryResult {
  columns: QueryResultColumn[];
  rows: Record<string, unknown>[];
  totalRows?: number;
  /** True when the executor saw more rows than `limit` and trimmed the response. */
  truncated?: boolean;
  /** Wall-clock duration of the underlying execution, in milliseconds. */
  executionTimeMs?: number;
}

export interface QueryResultColumn {
  fieldId: string;
  label: string;
  dataType: FieldDataType;
}

export interface QueryFilterOption {
  value: string;
  label?: string;
  disabled?: boolean;
}

export interface FilterOptionRequest {
  filterId: string;
  datasetId: string;
  fieldId: string;
  search?: string;
  limit?: number;
  cursor?: string;
  filterState?: Record<string, unknown>;
}

export interface FilterOptionResponse {
  options: QueryFilterOption[];
  nextCursor?: string;
  complete: boolean;
}

/**
 * A QueryAdapter executes LogicalQuery against a data source.
 * The host application provides this — Supersubset never queries directly.
 */
export interface QueryAdapter {
  readonly name: string;
  execute(query: LogicalQuery): Promise<QueryResult>;
  cancel?(queryId: string): Promise<void>;
  resolveFilterOptions?(request: FilterOptionRequest): Promise<FilterOptionResponse>;
}

/**
 * Resolve filter options through a QueryAdapter, with a generic fallback.
 *
 * If the adapter implements `resolveFilterOptions`, that path is used (the host
 * may curate, authorize, or use a backend-specific lookup). Otherwise, a
 * distinct-values `LogicalQuery` is synthesized — adapters that honor
 * `distinct: true` (e.g. `SqlQueryAdapter` from `@supersubset/query-sql`)
 * produce de-duplicated values; older adapters that ignore the flag still work
 * but may return duplicates.
 *
 * See ADR-009 §2 and ADR-011.
 */
const DEFAULT_FIELD_OPTIONS_LIMIT = 200;

export async function resolveFilterOptionsWithAdapter(
  adapter: QueryAdapter,
  request: FilterOptionRequest,
): Promise<FilterOptionResponse> {
  if (adapter.resolveFilterOptions) {
    return adapter.resolveFilterOptions(request);
  }

  const limit = request.limit ?? DEFAULT_FIELD_OPTIONS_LIMIT;
  const query: LogicalQuery = {
    datasetId: request.datasetId,
    fields: [{ fieldId: request.fieldId }],
    limit,
    distinct: true,
  };
  if (request.search) {
    query.filters = [
      {
        fieldId: request.fieldId,
        operator: 'like',
        value: normalizeSearchToContains(request.search),
      },
    ];
  }

  const result = await adapter.execute(query);
  const seen = new Set<string>();
  const options: QueryFilterOption[] = [];
  for (const row of result.rows) {
    const raw = row[request.fieldId];
    if (raw === null || raw === undefined) continue;
    const value = String(raw);
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value });
  }

  // Prefer execution evidence over a post-dedupe heuristic: client-side dedup
  // can shrink `options.length` below `limit` even when more distinct values
  // exist on the source. `QueryResult.truncated` is set by adapters that know
  // (e.g. `SqlQueryAdapter` via the +1 sentinel); fall back to the heuristic
  // only when the adapter hasn't reported truncation.
  const complete =
    result.truncated === false ? true : result.truncated === true ? false : options.length < limit;

  return { options, complete };
}

/**
 * Wrap a search term with `%` for contains-style matching unless the caller
 * already supplied wildcards. Keeps the contract predictable across hosts.
 */
function normalizeSearchToContains(search: string): string {
  if (search.includes('%') || search.includes('_')) return search;
  return `%${search}%`;
}

// ─── Probe Contract ──────────────────────────────────────────

/**
 * Version identifier for the Supersubset host probe contract.
 *
 * Probe responses should include this so hosts and libraries can reject
 * incompatible envelopes before attempting to interpret discovery or query
 * payloads.
 */
export const PROBE_PROTOCOL_VERSION = 'v1' as const;

/**
 * Standard filter operators understood by the logical query contract.
 * Individual hosts may support a subset and should advertise that subset via
 * ProbeCapabilities.supportedFilterOperators.
 */
export const PROBE_STANDARD_FILTER_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'like',
  'not_like',
  'is_null',
  'is_not_null',
  'between',
] as const satisfies readonly QueryFilterOperator[];

/**
 * Standard aggregations available to hosts implementing the probe contract.
 * Hosts should advertise their exact support level via ProbeCapabilities.
 */
export const PROBE_STANDARD_AGGREGATIONS = [
  'sum',
  'avg',
  'count',
  'count_distinct',
  'min',
  'max',
  'none',
] as const satisfies readonly AggregationType[];

/**
 * Dataset source kinds that discovery endpoints may expose.
 */
export const PROBE_STANDARD_SOURCE_TYPES = [
  'table',
  'view',
  'model',
  'query',
  'file',
] as const satisfies readonly DatasetSource['type'][];

/**
 * Host-advertised capabilities for the probe contract.
 *
 * This avoids forcing consumers to guess which logical operators or
 * aggregations a specific backend actually supports.
 */
export interface ProbeCapabilities {
  supportedAggregations: AggregationType[];
  supportedFilterOperators: QueryFilterOperator[];
  supportedSourceTypes: DatasetSource['type'][];
  supportsMetadataDiscovery: boolean;
  supportsQueryExecution: boolean;
  supportsCancellation?: boolean;
  maxLimit?: number;
}

/**
 * Discovery response envelope for metadata probe endpoints.
 */
export interface ProbeDatasetsResponse {
  protocolVersion: typeof PROBE_PROTOCOL_VERSION;
  capabilities: ProbeCapabilities;
  datasets: NormalizedDataset[];
}

/**
 * Logical query request shape for probe-backed query execution.
 */
export type ProbeQueryRequest = LogicalQuery;

/**
 * Query response envelope for probe-backed query execution.
 */
export interface ProbeQueryResponse extends QueryResult {
  protocolVersion: typeof PROBE_PROTOCOL_VERSION;
  capabilities: ProbeCapabilities;
}

export type ProbeErrorCode =
  | 'INVALID_QUERY'
  | 'UNSUPPORTED_FEATURE'
  | 'UNAUTHORIZED'
  | 'UNAVAILABLE'
  | 'INTERNAL_ERROR';

/**
 * Error envelope for probe endpoints.
 */
export interface ProbeErrorResponse {
  protocolVersion: typeof PROBE_PROTOCOL_VERSION;
  error: {
    code: ProbeErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  capabilities?: ProbeCapabilities;
}

// ─── Field Heuristics ────────────────────────────────────────

export { inferFieldRole, inferAggregation, humanizeFieldName } from './heuristics.js';
