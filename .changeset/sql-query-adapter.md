---
'@supersubset/query-sql': minor
'@supersubset/data-model': minor
'@supersubset/query-client': minor
'@supersubset/runtime': minor
'@supersubset/designer': minor
'@supersubset/schema': minor
'@supersubset/charts-echarts': minor
'@supersubset/theme': minor
'@supersubset/cli': minor
'@supersubset/adapter-prisma': minor
'@supersubset/adapter-sql': minor
'@supersubset/adapter-json': minor
'@supersubset/adapter-dbt': minor
---

Centralize SQL generation in a reusable `SqlQueryAdapter` (ADR-011).

**New package `@supersubset/query-sql`** exporting:

- `SqlQueryAdapter` — a `QueryAdapter` implementation that turns `LogicalQuery` into SQL via the translator, executes it through a host-provided `SqlExecutor` (`run(sql) → rows`), and returns Supersubset-shaped `QueryResult`. Hosts implement one tiny method (`run(sql)`) instead of writing their own translator.
- `toSql(query, options?)` — standalone translator returning `{ sql, planned }` for diagnostics, custom executors, or test assertions.
- Helpers: `planFields`, `escapeLiteral`, `isRealAggregation`.

**`@supersubset/data-model` additions** (all additive):

- `LogicalQuery.distinct?: boolean` — when true, the executor must return distinct rows (`SELECT DISTINCT`). Adapters that ignore it preserve legacy behavior.
- `QueryResult.truncated?: boolean` and `QueryResult.executionTimeMs?: number` — promoted from previously host-only fields.
- `QueryFilter.value?: unknown` (was required) — operators like `is_null` / `is_not_null` legitimately omit it.
- `resolveFilterOptionsWithAdapter(adapter, request)` helper — delegates to `adapter.resolveFilterOptions` if implemented, otherwise synthesizes a `distinct: true` `LogicalQuery` and runs it via `adapter.execute`. Defensive client-side dedup as a safety net.

**`@supersubset/runtime` `FilterBar`** now resolves `optionSource.kind = 'field'` filters asynchronously via the host-provided `QueryAdapter`, with `loading | ready | unavailable | error` states surfaced through the existing select / multi-select controls. Closes the runtime side of [#121](https://github.com/wandir-tech/supersubset/issues/121); combined with `query-sql`, field-backed filters now work end-to-end on any SQL-backed host. Closes [#159](https://github.com/wandir-tech/supersubset/issues/159).

**`@supersubset/query-client` `QueryClient.resolveFilterOptions`** delegates to the data-model helper instead of throwing when the adapter has no `resolveFilterOptions` — falls through to the generic distinct query.

**ADR updates**: ADR-011 (Accepted) documents the SQL-flavored execution layer the original spec called for, fixing the drift identified in [#160](https://github.com/wandir-tech/supersubset/issues/160). ADR-008 amended to point at ADR-011 for SQL-backed hosts; ADR-009 §2 softened to make the host-side resolver optional (the generic fallback is the default path).

**Designer**: updated the field-backed authoring hint to reflect the new architecture.
