/**
 * LogicalQuery → SQL translator. Standard ANSI SQL with double-quoted
 * identifiers. Compatible with DuckDB, Postgres, and SQLite out of the box;
 * other dialects (MySQL backticks, ClickHouse) can wrap or replace this in
 * a future dialect layer.
 *
 * See ADR-011.
 */
import type {
  AggregationType,
  LogicalQuery,
  QueryField,
  QueryFilter,
  QuerySort,
} from '@supersubset/data-model';

/**
 * Per-field planning info used by both the translator (for SELECT/GROUP BY/
 * ORDER BY) and the adapter (for remapping result rows to outputKey).
 */
export interface PlannedField {
  field: QueryField;
  /** SQL `AS` alias — stable, unique even when the same fieldId appears twice. */
  sqlAlias: string;
  /** Key used in the returned `QueryResult.rows` (matches Supersubset convention). */
  outputKey: string;
}

export interface TranslateOptions {
  /**
   * If set, the emitted SQL adds 1 to the LogicalQuery's `limit` so the caller
   * can detect truncation by checking `rows.length > limit`. The adapter sets
   * this to true; standalone `toSql` callers can opt in.
   */
  truncationProbe?: boolean;
}

export interface TranslateResult {
  sql: string;
  planned: PlannedField[];
}

const REAL_AGGREGATIONS: ReadonlySet<AggregationType> = new Set([
  'sum',
  'avg',
  'count',
  'count_distinct',
  'min',
  'max',
]);

export function isRealAggregation(agg: AggregationType | undefined): boolean {
  return agg !== undefined && REAL_AGGREGATIONS.has(agg);
}

export function planFields(query: LogicalQuery): PlannedField[] {
  return query.fields.map((field) => {
    const sqlAlias = field.alias
      ? field.alias
      : isRealAggregation(field.aggregation)
        ? `${field.aggregation}_${field.fieldId}`
        : field.fieldId;
    const outputKey = field.alias ?? field.fieldId;
    return { field, sqlAlias, outputKey };
  });
}

export function toSql(query: LogicalQuery, options: TranslateOptions = {}): TranslateResult {
  if (!query.datasetId) {
    throw new Error('toSql: query.datasetId is required');
  }
  if (!Array.isArray(query.fields) || query.fields.length === 0) {
    throw new Error('toSql: query.fields must contain at least one entry');
  }

  const planned = planFields(query);
  const hasAggregation = planned.some((p) => isRealAggregation(p.field.aggregation));

  // SELECT [DISTINCT] ...
  const selectParts = planned.map(({ field, sqlAlias }) => {
    const col = quoteIdent(field.fieldId);
    if (isRealAggregation(field.aggregation)) {
      if (field.aggregation === 'count_distinct') {
        return `COUNT(DISTINCT ${col}) AS ${quoteIdent(sqlAlias)}`;
      }
      const aggFn = (field.aggregation as string).toUpperCase();
      return `${aggFn}(${col}) AS ${quoteIdent(sqlAlias)}`;
    }
    return `${col} AS ${quoteIdent(sqlAlias)}`;
  });

  const distinctKeyword = query.distinct && !hasAggregation ? 'DISTINCT ' : '';

  let sql = `SELECT ${distinctKeyword}${selectParts.join(', ')} FROM ${quoteIdent(query.datasetId)}`;

  // WHERE
  const whereParts = (query.filters ?? []).map((filter) => filterToSql(filter));
  if (whereParts.length > 0) sql += ` WHERE ${whereParts.join(' AND ')}`;

  // GROUP BY — non-aggregated projection fields are grouped when at least one
  // aggregation is present. SELECT DISTINCT handles the aggregation-free case.
  if (hasAggregation) {
    const groupByFields = planned
      .filter((p) => !isRealAggregation(p.field.aggregation))
      .map((p) => quoteIdent(p.field.fieldId));
    if (groupByFields.length > 0) sql += ` GROUP BY ${groupByFields.join(', ')}`;
  }

  // ORDER BY — accepts either a raw fieldId or an outputKey/alias.
  const orderParts = (query.sort ?? []).map((s) => sortToSql(s, planned));
  if (orderParts.length > 0) sql += ` ORDER BY ${orderParts.join(', ')}`;

  // LIMIT (+1 sentinel if truncation probe requested)
  if (query.limit !== undefined) {
    const limit = options.truncationProbe ? query.limit + 1 : query.limit;
    sql += ` LIMIT ${limit}`;
  }

  // OFFSET
  if (query.offset !== undefined && query.offset > 0) {
    sql += ` OFFSET ${query.offset}`;
  }

  return { sql, planned };
}

// ─── Filters ─────────────────────────────────────────────────

function filterToSql(filter: QueryFilter): string {
  const col = quoteIdent(filter.fieldId);
  switch (filter.operator) {
    case 'eq':
      return `${col} = ${escapeLiteral(filter.value)}`;
    case 'neq':
      return `${col} != ${escapeLiteral(filter.value)}`;
    case 'gt':
      return `${col} > ${escapeLiteral(filter.value)}`;
    case 'gte':
      return `${col} >= ${escapeLiteral(filter.value)}`;
    case 'lt':
      return `${col} < ${escapeLiteral(filter.value)}`;
    case 'lte':
      return `${col} <= ${escapeLiteral(filter.value)}`;
    case 'in': {
      const list = requireArray(filter, 'in').map(escapeLiteral).join(', ');
      return `${col} IN (${list || 'NULL'})`;
    }
    case 'not_in': {
      const list = requireArray(filter, 'not_in').map(escapeLiteral).join(', ');
      return `${col} NOT IN (${list || 'NULL'})`;
    }
    case 'like':
      return `${col} LIKE ${escapeLiteral(filter.value)}`;
    case 'not_like':
      return `${col} NOT LIKE ${escapeLiteral(filter.value)}`;
    case 'is_null':
      return `${col} IS NULL`;
    case 'is_not_null':
      return `${col} IS NOT NULL`;
    case 'between': {
      const arr = requireArray(filter, 'between');
      if (arr.length !== 2) {
        throw new Error(`filterToSql: "between" on "${filter.fieldId}" requires [min, max]`);
      }
      return `${col} BETWEEN ${escapeLiteral(arr[0])} AND ${escapeLiteral(arr[1])}`;
    }
    default:
      throw new Error(`filterToSql: unsupported operator "${String(filter.operator)}"`);
  }
}

function sortToSql(sort: QuerySort, planned: PlannedField[]): string {
  if (sort.direction !== 'asc' && sort.direction !== 'desc') {
    throw new Error(`sortToSql: direction must be "asc" or "desc" (got "${sort.direction}")`);
  }
  const direction = sort.direction === 'desc' ? 'DESC' : 'ASC';
  const byOutput = planned.find((p) => p.outputKey === sort.fieldId);
  if (byOutput) return `${quoteIdent(byOutput.sqlAlias)} ${direction}`;
  return `${quoteIdent(sort.fieldId)} ${direction}`;
}

function requireArray(filter: QueryFilter, op: string): unknown[] {
  if (!Array.isArray(filter.value)) {
    throw new Error(`filterToSql: "${op}" on "${filter.fieldId}" requires an array value`);
  }
  return filter.value;
}

// ─── Quoting / escaping ──────────────────────────────────────

function quoteIdent(ident: string): string {
  // Double-quote identifiers per ANSI SQL. Embedded double quotes are doubled.
  return `"${ident.replace(/"/g, '""')}"`;
}

export function escapeLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`escapeLiteral: invalid numeric value: ${value}`);
    }
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}
