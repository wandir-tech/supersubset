# ADR-011: Centralize SQL Generation in a Reusable SqlQueryAdapter

## Status

Accepted (2026-05-27) — implemented in `@supersubset/query-sql` v0.1.4; Tripmatch migrated.

## Date

2026-05-27

## Context

Supersubset's `initial-spec.md` defined a two-layer architecture:

- **Metadata / discovery layer** — pluggable, because schema definitions live in many formats (Prisma, dbt, JSON Schema, OpenAPI, SQL catalog). The `MetadataAdapter` interface and per-format adapters (`adapter-prisma`, `adapter-sql`, `adapter-dbt`, `adapter-json`) implement this layer.
- **Query / execution layer** — the spec assumes SQL: "compatible with a ClickHouse-based backend exposed through a secure SQL API," and `packages/query-client` was specified to own "pluggable query transport, **secure SQL execution contract**, ... SQL generation." The spec also called for "direct SQL generation for environments that want it."

The current implementation has drifted from that on the execution layer:

- `@supersubset/query-client` (189 lines) is a thin orchestrator around `QueryAdapter.execute()`. It performs no SQL generation.
- `@supersubset/adapter-sql` (147 lines) only normalizes SQL catalog metadata into `NormalizedDataset[]`. It contains no query translation.
- `LogicalQuery` is treated as the only contract, with no SQL-flavored adapter shipped alongside it.
- [ADR-008](./008-supersubset-http-probe-contract.md) (2026-05-01) codified the drift by explicitly making the probe contract backend-agnostic ("it does not prescribe database access, ORM choice, or authentication framework").

Consequence: every SQL-backed host writes its own `LogicalQuery → SQL` translator. In Tripmatch's case that is ~600 lines of `translateQuery`, `filterToSql`, `sortToSql` inside `analytics-mart-query.service.ts`, paired with a bespoke probe handler.

This duplication has produced real defects:

- **Issue [#159](https://github.com/wandir-tech/supersubset/issues/159)**: field-backed filter options return non-distinct rows because Tripmatch's translator only emits `GROUP BY` when an aggregation is present. The data-model has no way to express `DISTINCT` and the host's translator did not invent one.
- **Issue [#121](https://github.com/wandir-tech/supersubset/issues/121)**: field-backed runtime resolution was deferred for nearly three weeks partly because the runtime had no shared SQL surface to lean on.
- Every future SQL semantic gap (NULL handling, `CASE`, `HAVING`, joins, window functions) will hit the same dynamic: discovered by one host, fixed locally, re-discovered by the next.

Supersubset's value proposition is "embeddable analytics for hosts that already have a SQL warehouse." Asking each host to re-implement the warehouse semantics defeats the point.

## Decision

### 1. Reaffirm the spec: SQL is a first-class execution layer

The metadata layer remains pluggable (correct, as Ken notes: tables and columns live in many formats). The execution layer commits to SQL as the primary supported shape, with `QueryAdapter` retained as the escape hatch for non-SQL hosts.

This is not a new direction — it is what `initial-spec.md` already prescribed. ADR-008 stays valid for non-SQL hosts and for the dev-app probe; this ADR adds the SQL path the spec called for.

### 2. Introduce `@supersubset/query-sql` with `SqlQueryAdapter`

A new package implements `LogicalQuery → SQL` translation and ships a ready-to-use `QueryAdapter`:

```ts
// @supersubset/query-sql

export interface SqlExecutor {
  /** Execute a SQL string and return rows in {column: value} shape. */
  run(sql: string, params?: unknown[]): Promise<QueryResult>;
}

export interface SqlQueryAdapterOptions {
  executor: SqlExecutor;
  dialect?: SqlDialect; // 'duckdb' | 'postgres' | 'clickhouse' | 'standard'
  parameterized?: boolean; // default true — use $1, $2 placeholders
}

export class SqlQueryAdapter implements QueryAdapter {
  readonly name: string;
  constructor(options: SqlQueryAdapterOptions);
  execute(query: LogicalQuery): Promise<QueryResult>;
  resolveFilterOptions(request: FilterOptionRequest): Promise<FilterOptionResponse>;
}

/** Public translator — also usable standalone for diagnostics or custom executors. */
export function toSql(
  query: LogicalQuery,
  opts?: { dialect?: SqlDialect },
): { sql: string; params: unknown[] };
```

Behavior:

- Translates `LogicalQuery.fields` to a `SELECT` list. Honors aggregations and aliases. Rejects duplicate `sqlAlias` collisions with an explicit error rather than producing ambiguous columns.
- Translates `LogicalQuery.filters` to a `WHERE` clause. Values are SQL-escaped (string literals quoted, embedded quotes doubled; numerics validated; nulls / booleans emitted directly).
- Emits `SELECT DISTINCT` when `LogicalQuery.distinct === true` and no aggregations are present; emits `GROUP BY` for non-aggregated projection fields when at least one aggregation is present.
- Translates `LogicalQuery.sort`, `limit`, `offset` directly.
- `resolveFilterOptionsWithAdapter` (in `@supersubset/data-model`) synthesizes a `distinct: true` `LogicalQuery` and runs it via `executor.run`, without relying on the host to implement anything beyond `run(sql)`. For search, the term is normalized to **contains semantics** (wrapped with `%…%`) unless the caller already supplied `%` or `_` wildcards. The returned `complete` flag prefers `QueryResult.truncated` over a post-dedupe length heuristic so duplicate rows from older adapters cannot falsely report "all options loaded."

### Security boundary

`SqlQueryAdapter` emits inline-literal SQL in this MVP (no `?` / `$1` parameters). The contract is:

- **Hosts MUST validate `datasetId` and `fieldId`** against an allowlist before calling `adapter.execute(query)`. The translator quotes identifiers but does not authorize them.
- **Filter values are SQL-escaped** at the literal level by the translator, so user-supplied `value` payloads cannot break out of a quoted string.
- **Hosts SHOULD validate `value` types** that don't pass through `escapeLiteral` cleanly (e.g. arrays for `in`, `[min, max]` for `between`).

Parameterized execution is intentionally out of scope for the MVP; tracked as a follow-up so adapters can opt into `?` / `$1` placeholders once a dialect layer exists.

### 3. Extend `LogicalQuery` with `distinct?: boolean`

To support the synthesized distinct query and the broader case of "user wants distinct projection rows":

```ts
export interface LogicalQuery {
  datasetId: string;
  fields: QueryField[];
  filters?: QueryFilter[];
  sort?: QuerySort[];
  limit?: number;
  offset?: number;
  distinct?: boolean; // new
}
```

The flag is additive. Adapters that ignore it produce non-distinct results (current behavior). `SqlQueryAdapter` honors it. Other adapters (Prisma, GraphQL) can adopt it on their own timeline.

### 4. Auth and dataset scoping remain host-owned

Per the spec, authentication and authorization stay at the transport layer. The recommended host pattern becomes:

```ts
// Host pseudo-code
app.post('/supersubset/query', async (req, res) => {
  const jwt = verifyJwt(req.headers.authorization);
  const query: LogicalQuery = req.body;
  if (!datasetAllowedFor(jwt.role, query.datasetId)) return res.status(403).end();
  const adapter = new SqlQueryAdapter({ executor: duckDbExecutor, dialect: 'duckdb' });
  res.json(await adapter.execute(query));
});
```

The host writes ~10 lines of plumbing. SQL semantics live in supersubset.

Future fine-grained authorization (row-level filters by JWT claim, column masking) can be added as a `SqlQueryAdapter` middleware option that injects predicates into the generated SQL, without each host re-inventing it.

### 5. The metadata layer is unaffected

`adapter-prisma`, `adapter-sql`, `adapter-dbt`, `adapter-json` retain their current `MetadataAdapter` shape. Schema discovery legitimately comes from many sources; query execution does not.

### 6. ADR-008 is amended, not superseded

ADR-008's backend-agnostic probe contract remains valid for non-SQL hosts and the dev-app probe. This ADR adds the SQL-flavored execution path the spec called for. A short "Update" section will be added to ADR-008 pointing here.

## Consequences

### Positive

- Hosts implementing a SQL-backed `QueryAdapter` write ~10 lines (auth + executor binding) instead of 600 lines of bespoke translator.
- SQL semantic bugs (DISTINCT, NULLs, CASE, window functions) get fixed once, in one tested package, and propagate to every host on the next `@supersubset/query-sql` bump.
- The `LogicalQuery` contract gains an explicit `distinct` flag, closing the synthesized-options gap in #159.
- The runtime's `resolveFilterOptionsWithAdapter` fallback (added for #121) becomes reliable across hosts.
- The library's value proposition — "embeddable analytics for hosts with a SQL warehouse" — is honored instead of pushed onto host implementers.

### Negative

- Adds a new published package to maintain.
- Hosts already running custom SQL translators (Tripmatch) need a migration path. The migration is straightforward (replace `translateQuery` calls with `SqlQueryAdapter`), but it is real work.
- SQL dialect handling becomes a supersubset responsibility. The MVP supports DuckDB and a "standard" dialect; Postgres / ClickHouse / Snowflake follow.

### Neutral

- The non-SQL `QueryAdapter` escape hatch is preserved — Prisma-direct, GraphQL, or REST-backed hosts can still implement `QueryAdapter` themselves.
- The metadata adapter packages are unchanged.

## Alternatives Considered

| Alternative                                                                       | Pros                                            | Cons                                                                                                                                          | Why Rejected                                                    |
| --------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Add `distinct?: boolean` to `LogicalQuery` only; leave translation in hosts       | Smallest change. Closes #159 today.             | Leaves the 600-line duplication. Next semantic gap repeats the same dynamic. Defers the work without removing it.                             | Treats a symptom, not the cause.                                |
| Put SQL translation inside `query-client`                                         | Matches the literal words of `initial-spec.md`. | `query-client` is the public face for the runtime to talk to _any_ backend. Mixing SQL specifics into it bloats the agnostic surface.         | Separation of concerns is clearer with a sibling package.       |
| Extend `adapter-sql` with query translation                                       | One fewer package.                              | "adapter-sql" is documented as a `MetadataAdapter` (catalog introspection). Overloading it with query execution muddies the naming and scope. | Keep metadata adapters for metadata. New package for execution. |
| Build a server-side service hosted by Supersubset that hosts call over HTTP       | Centralizes everything.                         | Violates "no required vendor backend, no forced hosted service" from `initial-spec.md`.                                                       | Out of scope for a library.                                     |
| Stay backend-agnostic; require each host to implement `QueryAdapter` from scratch | Already what ADR-008 says.                      | Costs every SQL-backed host hundreds of lines, creates DISTINCT-class bugs, and fights the spec.                                              | The status quo, which produced #159.                            |

## References

- [`initial-spec.md`](../../initial-spec.md) — original architectural direction (SQL-first execution, pluggable metadata)
- [ADR-004: Package Boundaries](./004-package-boundaries.md) — current package layout
- [ADR-008: Supersubset HTTP Probe Contract](./008-supersubset-http-probe-contract.md) — amended by this ADR
- [ADR-009: Filter Option Source Contract](./009-filter-option-source-contract.md) — `resolveFilterOptionsWithAdapter` is the proximate user of the new SQL path
- [Issue #121](https://github.com/wandir-tech/supersubset/issues/121) — field-backed runtime resolution
- [Issue #159](https://github.com/wandir-tech/supersubset/issues/159) — field-backed options don't work (the surface symptom)
