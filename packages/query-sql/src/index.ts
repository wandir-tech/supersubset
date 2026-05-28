/**
 * @supersubset/query-sql — SQL QueryAdapter and translator.
 *
 * Hosts implement `SqlExecutor` (one `run(sql)` method) and use
 * `SqlQueryAdapter` to get full `LogicalQuery → SQL` behavior, including
 * `LogicalQuery.distinct` support.
 *
 * See ADR-011.
 */
export {
  SqlQueryAdapter,
  type SqlExecutor,
  type SqlQueryAdapterOptions,
  type ExecuteResult,
} from './adapter';

export {
  toSql,
  planFields,
  escapeLiteral,
  isRealAggregation,
  type PlannedField,
  type TranslateOptions,
  type TranslateResult,
} from './translator';
