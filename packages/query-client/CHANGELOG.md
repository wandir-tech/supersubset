# @supersubset/query-client

## 0.2.2

### Patch Changes

- Updated dependencies []:
  - @supersubset/schema@0.2.2
  - @supersubset/data-model@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies []:
  - @supersubset/schema@0.2.1
  - @supersubset/data-model@0.2.1

## 0.2.0

### Minor Changes

- [#164](https://github.com/wandir-tech/supersubset/pull/164) [`499a3e8`](https://github.com/wandir-tech/supersubset/commit/499a3e8298015315f081ea0fc18049a2fb99053e) Thanks [@kokokenada](https://github.com/kokokenada)! - Date-aware dashboard filters (closes [#162](https://github.com/wandir-tech/supersubset/issues/162)).

  **Schema** — adds optional `FilterDefinition.dateConfig` describing the date-control style (`preset` / `range` / `weekly`), the weekday boundary, and weekly lookback/lookahead. `dateFilterConfigSchema` cross-validates unknown preset values and rejects weekly configs that would generate zero options.

  **Shared date utilities** — new `@supersubset/schema/date-utils` exports `generateWeeklyDateRangeOptions`, `resolveRelativeDate`, `isRangeLikeValue` / `isDateRangeLike`, `normalizeRangeBound`, `DATE_PRESETS`, and the supporting `DateRangeValue` / `WeeklyDateRangeOption` types. Designer and runtime now share one source of truth for week-boundary and preset math.

  **Designer** — date-typed fields automatically switch to date-aware controls and hide the generic value/operator + select-option-source UI. Authors pick the control style (`Relative date menu` / `Custom date range` / `Weekly range dropdown`), the week-start day, lookback/lookahead, and an authored default value. The weekly mode shows a live dropdown preview with an honest "showing N of M weeks" count.

  **Runtime** — `FilterBar` renders weekly dropdowns, custom-range inputs, or relative presets depending on `dateConfig.mode`. Partial custom-range inputs now compile to one-sided `gte` / `lte` filters (previously produced a malformed `between` with `null` bounds). Cross-filter compilation routes through the same `compileFilterDefinitionValue` path so date-range cross-filters behave consistently.

  **Backwards compatible.** `dateConfig` is optional; existing dashboards without it keep their prior preset-with-custom-range behavior. The `resolveRelativeDate` and `DATE_PRESETS` public exports keep the same signatures (`resolveRelativeDate` gains an optional third `config` arg).

- [#161](https://github.com/wandir-tech/supersubset/pull/161) [`339b27f`](https://github.com/wandir-tech/supersubset/commit/339b27f4638b620d7305e01b9b08db4f6545bb11) Thanks [@kokokenada](https://github.com/kokokenada)! - Centralize SQL generation in a reusable `SqlQueryAdapter` (ADR-012).

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

  **ADR updates**: ADR-012 (Accepted) documents the SQL-flavored execution layer the original spec called for, fixing the drift identified in [#160](https://github.com/wandir-tech/supersubset/issues/160). ADR-008 amended to point at ADR-012 for SQL-backed hosts; ADR-009 §2 softened to make the host-side resolver optional (the generic fallback is the default path).

  **Designer**: updated the field-backed authoring hint to reflect the new architecture.

### Patch Changes

- Updated dependencies [[`499a3e8`](https://github.com/wandir-tech/supersubset/commit/499a3e8298015315f081ea0fc18049a2fb99053e), [`339b27f`](https://github.com/wandir-tech/supersubset/commit/339b27f4638b620d7305e01b9b08db4f6545bb11)]:
  - @supersubset/schema@0.2.0
  - @supersubset/data-model@0.2.0

## 0.1.4

### Patch Changes

- Updated dependencies []:
  - @supersubset/schema@0.1.4
  - @supersubset/data-model@0.1.4

## 0.1.3

### Patch Changes

- Updated dependencies []:
  - @supersubset/schema@0.1.3
  - @supersubset/data-model@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @supersubset/schema@0.1.2
  - @supersubset/data-model@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @supersubset/schema@0.1.1
  - @supersubset/data-model@0.1.1

## 0.1.0

### Minor Changes

- [`09ca46d`](https://github.com/wandir-tech/supersubset/commit/09ca46d83f56444d9828846de97a5abd4c8625e1) - release for testing

### Patch Changes

- Updated dependencies [[`09ca46d`](https://github.com/wandir-tech/supersubset/commit/09ca46d83f56444d9828846de97a5abd4c8625e1)]:
  - @supersubset/data-model@0.1.0
  - @supersubset/schema@0.1.0
