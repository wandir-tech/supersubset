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

export type FieldDataType = 'string' | 'number' | 'integer' | 'date' | 'datetime' | 'boolean' | 'json' | 'unknown';

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
}

export interface QueryField {
  fieldId: string;
  aggregation?: AggregationType;
  alias?: string;
}

export interface QueryFilter {
  fieldId: string;
  operator: QueryFilterOperator;
  value: unknown;
}

export type QueryFilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'not_in'
  | 'like' | 'not_like'
  | 'is_null' | 'is_not_null'
  | 'between';

export interface QuerySort {
  fieldId: string;
  direction: 'asc' | 'desc';
}

export interface QueryResult {
  columns: QueryResultColumn[];
  rows: Record<string, unknown>[];
  totalRows?: number;
}

export interface QueryResultColumn {
  fieldId: string;
  label: string;
  dataType: FieldDataType;
}

/**
 * A QueryAdapter executes LogicalQuery against a data source.
 * The host application provides this — Supersubset never queries directly.
 */
export interface QueryAdapter {
  readonly name: string;
  execute(query: LogicalQuery): Promise<QueryResult>;
  cancel?(queryId: string): Promise<void>;
}

// ─── Field Heuristics ────────────────────────────────────────

export { inferFieldRole, inferAggregation, humanizeFieldName } from './heuristics.js';
