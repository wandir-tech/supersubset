# ADR-009: Select Filter Option Source Contract

## Status

Proposed

## Date

2026-05-04

## Context

Issue #118 exposed a contract gap in Supersubset's current filter model.

Today, authored select filters only work reliably when the host injects a sidecar `filterOptions` prop at runtime. The dashboard schema does not describe where select options come from, and the query contract has no standardized way to resolve option values for a filter control.

That misses the point of a schema-first analytics library:

- the author can configure a select filter in the dashboard definition
- the runtime can render the control shell
- but the control's actual option values still depend on undocumented host code

At the same time, the naive fix would also be wrong.

It is not acceptable to assume that every select filter can safely run an unbounded distinct-value query on page load:

- some fields have too many distinct values to preload
- some backends cannot cheaply support that query shape
- some hosts need curated business values instead of raw field distincts
- some embeddings need a static fallback when a live option query is unavailable or undesirable

We need a contract that keeps authored behavior explicit without forcing every option list into the schema or forcing every host to run expensive queries.

## Decision

### 1. Make option sourcing explicit for select-like filters

Select-style filters must declare their option source as part of the authored contract instead of relying on an implicit host prop.

Illustrative schema shape:

```ts
interface FilterOptionDefinition {
  value: string;
  label?: string;
  disabled?: boolean;
}

type FilterOptionSource =
  | {
      kind: 'static';
      options: FilterOptionDefinition[];
      completeness?: 'complete' | 'curated';
    }
  | {
      kind: 'field';
      strategy: 'preload' | 'search';
      maxOptions?: number;
      minSearchChars?: number;
    };

interface FilterDefinition {
  id: string;
  title?: string;
  type: string;
  fieldRef: string;
  datasetRef: string;
  operator: string;
  defaultValue?: unknown;
  scope: FilterScope;
  optionSource?: FilterOptionSource;
}
```

Implications:

- `type: 'select'` and `type: 'multi-select'` should use `optionSource`
- non-select filters such as text, date, and range filters do not need this contract
- `kind: 'static'` is first-class, not a temporary workaround
- `completeness: 'curated'` explicitly means the authored list is an intentional subset rather than the full domain

### 2. Add a standardized host-owned option resolver for dynamic sources

For `optionSource.kind = 'field'`, Supersubset should use an explicit host-owned resolution method instead of overloading undocumented props.

Illustrative data-model contract:

```ts
interface FilterOptionRequest {
  filterId: string;
  datasetRef: string;
  fieldRef: string;
  search?: string;
  limit?: number;
  cursor?: string;
  filterState?: Record<string, unknown>;
}

interface FilterOptionResponse {
  options: FilterOptionDefinition[];
  nextCursor?: string;
  complete: boolean;
}

interface QueryAdapter {
  readonly name: string;
  execute(query: LogicalQuery): Promise<QueryResult>;
  cancel?(queryId: string): void;
  resolveFilterOptions?(request: FilterOptionRequest): Promise<FilterOptionResponse>;
}
```

This remains host-owned and backend-agnostic:

- Supersubset does not prescribe SQL, Prisma, dbt, or warehouse semantics
- the host decides how to authorize and execute the lookup
- the runtime gets one stable capability instead of private app wiring

### 3. Dynamic option resolution must be search-first for large-cardinality fields

Supersubset should not assume that a select filter can preload every value.

Rules:

- `strategy: 'preload'` is only for low-cardinality or otherwise known-safe fields
- `strategy: 'search'` is the default scalable mode for unknown or large cardinality
- the runtime must not issue an unbounded distinct query automatically on initial render
- `maxOptions`, `minSearchChars`, and cursor-based pagination exist specifically to avoid full-domain fetches

This gives the product a path for both small enumerations and very large lookup domains.

### 4. Static configured options remain a first-class path

Some select filters should not query the backend at all.

Examples:

- business-owned status lists such as `Open`, `Closed`, `Escalated`
- curated subsets such as top-level regions or supported service tiers
- embeds where live option queries are disabled, too expensive, or not yet implemented

Decision:

- static configured options in the authored filter contract are valid and supported
- they are not considered a schema violation because they are explicit authored semantics
- they replace the need for an undocumented host-side map for these cases

### 5. Keep the legacy `filterOptions` runtime prop only as a compatibility bridge

The current runtime prop should remain temporarily so existing hosts do not break during rollout, but it is no longer the primary contract.

Resolution order should become:

1. `FilterDefinition.optionSource.kind = 'static'`
2. `FilterDefinition.optionSource.kind = 'field'` via `resolveFilterOptions`
3. deprecated legacy `filterOptions` prop
4. explicit unavailable state

If a select filter has no valid option source, the runtime should render a clear unavailable state and the designer should warn during authoring. It should not silently render an empty dropdown that looks valid but cannot function.

### 6. Keep option-source semantics on the filter, not only on dataset metadata

Field metadata may later grow hints such as low-cardinality, enum-like values, or recommended strategies, but that is not sufficient as the primary contract.

Reason:

- a filter may intentionally expose only a curated subset of field values
- a filter may need custom labels or ordering
- multiple filters over the same field may legitimately choose different source strategies

Therefore the authored filter definition owns the option-source decision, while dataset metadata may remain advisory.

## Consequences

### Positive

- Select-filter behavior becomes part of the explicit authored contract.
- Static lists become legitimate schema-authored configuration instead of an accidental host prop.
- Large-cardinality fields get a scalable search-first path rather than an unsafe preload assumption.
- The runtime remains backend-agnostic while still gaining a standard dynamic option-resolution seam.
- Tests and examples can prove select-filter behavior without hiding the problem behind private host wiring.

### Negative

- The schema and query contracts both gain new surface area.
- The runtime will need async control states such as loading, empty, unavailable, and paginated search.
- Hosts that want dynamic select filters must implement another optional capability beyond `execute()`.
- Designer UX becomes slightly more complex because authors must choose or confirm an option-source strategy.

### Neutral

- Text, date, and range filters are unaffected by this ADR.
- Dataset metadata hints may still be added later, but they are secondary to the filter-level contract.
- The legacy `filterOptions` prop remains temporarily for compatibility, not as the long-term API.

## Alternatives Considered

| Alternative                                                                            | Pros                                                      | Cons                                                                                               | Why Rejected                                                                        |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Keep host-side `filterOptions` as the main solution                                    | No schema/query changes; easy for current examples        | Preserves the core contract leak; authored filters still depend on undocumented host wiring        | Rejected because it conflicts with the schema-first product model                   |
| Put all option values directly into dataset field metadata                             | Simple for low-cardinality enums; reusable across filters | Breaks down for large-cardinality fields; cannot express filter-specific curation or ordering well | Rejected because field metadata alone is not expressive enough                      |
| Always query distinct field values on mount                                            | Minimal authored configuration                            | Unsafe for large datasets; expensive; backend-specific; poor UX for huge domains                   | Rejected because scalability must be part of the design, not an afterthought        |
| Support only static configured lists                                                   | Fully schema-contained; predictable                       | No path for live field-backed filters; forces duplication or manual sync with data                 | Rejected because many dashboards need data-backed option discovery                  |
| Ban select filters on large-cardinality fields and require text search filters instead | Simplifies runtime implementation                         | Too restrictive; gives up on a common BI workflow where remote search is appropriate               | Rejected because search-backed select controls are a valid and useful middle ground |

## References

- [ADR-003: Canonical Schema Format](./003-canonical-schema.md)
- [ADR-006: Multi-Dashboard Navigation, Alerts Widget, and Reusable Filter Rule Editor](./006-multi-dashboard-navigation-alerts-and-filter-editor.md)
- [ADR-008: Supersubset HTTP Probe Contract](./008-supersubset-http-probe-contract.md)
- [Issue #118](https://github.com/wandir-tech/supersubset/issues/118)
- [Runtime API](../api/runtime.md)
