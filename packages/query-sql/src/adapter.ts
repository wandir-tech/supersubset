/**
 * SqlQueryAdapter — a QueryAdapter implementation that turns LogicalQuery into
 * SQL via the translator, executes it through a host-provided SqlExecutor, and
 * returns Supersubset-shaped QueryResult.
 *
 * Hosts implement SqlExecutor (one tiny method: `run(sql) → rows`) and get
 * complete LogicalQuery → SQL behavior for free, including DISTINCT support
 * via `LogicalQuery.distinct`. See ADR-011.
 */
import {
  type FieldDataType,
  type LogicalQuery,
  type NormalizedDataset,
  type QueryAdapter,
  type QueryResult,
  type QueryResultColumn,
} from '@supersubset/data-model';
import { isRealAggregation, toSql, type PlannedField } from './translator';

export interface SqlExecutor {
  /**
   * Execute a SQL string. Return raw rows keyed by SQL column name (the alias
   * from the SELECT clause). The executor is responsible for any driver-level
   * normalization (BigInt → Number, Date decoding, Decimal handling, etc.) so
   * the adapter sees plain JS values.
   */
  run(sql: string): Promise<Array<Record<string, unknown>>>;
}

export interface SqlQueryAdapterOptions {
  /** Host-provided SQL executor (DuckDB, Postgres client, etc.). */
  executor: SqlExecutor;
  /** Adapter name reported via `QueryAdapter.name`. Defaults to "sql". */
  name?: string;
  /**
   * Optional catalog so the adapter can stamp `QueryResultColumn.dataType` and
   * humanize labels. Without it, dataType falls back to 'unknown'.
   */
  catalog?: NormalizedDataset[];
  /**
   * Maximum LIMIT the adapter will request from the executor. Caps any
   * user-supplied limit. Defaults to 10_000 (matches typical OLAP bounds).
   */
  maxLimit?: number;
  /** Default LIMIT when the query doesn't specify one. Defaults to 200. */
  defaultLimit?: number;
}

export interface ExecuteResult extends QueryResult {
  /** SQL actually executed — useful for diagnostics. */
  sql?: string;
}

const DEFAULT_MAX_LIMIT = 10_000;
const DEFAULT_LIMIT = 200;

export class SqlQueryAdapter implements QueryAdapter {
  readonly name: string;
  private readonly executor: SqlExecutor;
  private readonly catalog?: NormalizedDataset[];
  private readonly maxLimit: number;
  private readonly defaultLimit: number;

  constructor(options: SqlQueryAdapterOptions) {
    this.executor = options.executor;
    this.name = options.name ?? 'sql';
    this.catalog = options.catalog;
    this.maxLimit = options.maxLimit ?? DEFAULT_MAX_LIMIT;
    this.defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  }

  async execute(query: LogicalQuery): Promise<ExecuteResult> {
    const effectiveLimit = Math.min(query.limit ?? this.defaultLimit, this.maxLimit);
    const queryWithLimit: LogicalQuery = { ...query, limit: effectiveLimit };

    const { sql, planned } = toSql(queryWithLimit, { truncationProbe: true });
    const rawRows = await this.executor.run(sql);

    const truncated = rawRows.length > effectiveLimit;
    const slicedRows = truncated ? rawRows.slice(0, effectiveLimit) : rawRows;
    const rows = slicedRows.map((row) => remapRowToOutputKeys(row, planned));

    const columns = planned.map((p) => this.columnMetadata(p, query.datasetId));

    return {
      columns,
      rows,
      totalRows: rows.length,
      truncated,
      sql,
    };
  }

  // resolveFilterOptions is intentionally not implemented: the data-model
  // helper `resolveFilterOptionsWithAdapter` falls back to synthesizing a
  // `distinct: true` LogicalQuery via `execute`, which this adapter honors.
  // Hosts that need curation/authorization beyond raw distinct values can
  // wrap or extend SqlQueryAdapter and implement resolveFilterOptions themselves.

  private columnMetadata(planned: PlannedField, datasetId: string): QueryResultColumn {
    const { field, outputKey } = planned;
    const datasetMeta = this.catalog?.find((d) => d.id === datasetId);
    const fieldMeta = datasetMeta?.fields.find((f) => f.id === field.fieldId);
    const rawDataType: FieldDataType = fieldMeta?.dataType ?? 'unknown';
    const dataType = isRealAggregation(field.aggregation)
      ? aggregationDataType(
          field.aggregation as Exclude<typeof field.aggregation, undefined>,
          rawDataType,
        )
      : rawDataType;
    const label = fieldMeta?.label ?? humanLabel(outputKey);
    return { fieldId: outputKey, label, dataType };
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function remapRowToOutputKeys(
  row: Record<string, unknown>,
  planned: PlannedField[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { sqlAlias, outputKey } of planned) {
    out[outputKey] = row[sqlAlias] ?? null;
  }
  return out;
}

function aggregationDataType(
  agg: NonNullable<PlannedField['field']['aggregation']>,
  base: FieldDataType,
): FieldDataType {
  switch (agg) {
    case 'count':
    case 'count_distinct':
      return 'integer';
    case 'avg':
      return 'number';
    case 'sum':
    case 'min':
    case 'max':
      return base === 'integer' ? 'integer' : 'number';
    default:
      return base;
  }
}

function humanLabel(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ');
}
