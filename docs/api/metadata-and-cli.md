# Metadata And CLI API

This reference covers the metadata model, host query helpers, source adapters, and schema import entrypoints.

## @supersubset/data-model

This package defines the normalized metadata contract that all adapters emit.

Main exports:

- `NormalizedDataset`, `NormalizedField`, `DatasetRelationship`
- `MetadataAdapter`
- `LogicalQuery`, `QueryField`, `QueryFilter`, `QuerySort`, `QueryResult`
- `QueryAdapter`
- `PROBE_PROTOCOL_VERSION`, `PROBE_STANDARD_FILTER_OPERATORS`, `PROBE_STANDARD_AGGREGATIONS`
- `ProbeCapabilities`, `ProbeDatasetsResponse`, `ProbeQueryRequest`, `ProbeQueryResponse`, `ProbeErrorResponse`
- `inferFieldRole()`, `inferAggregation()`, `humanizeFieldName()`

Use `MetadataAdapter` when normalizing source metadata into a backend-agnostic analytical model. Use `QueryAdapter` when the host wants to execute logical queries against its own backend or in-browser engine.

### Probe contract

The same package now defines the canonical host probe envelope used when a host exposes Supersubset-compatible discovery and query endpoints.

Core pieces:

- `PROBE_PROTOCOL_VERSION`: version string emitted by discovery and query endpoints
- `ProbeCapabilities`: host-advertised support for operators, aggregations, source types, and limits
- `ProbeDatasetsResponse`: discovery envelope with `protocolVersion`, `capabilities`, and `datasets`
- `ProbeQueryRequest`: logical query payload sent to a host endpoint
- `ProbeQueryResponse`: query result envelope with `protocolVersion`, `capabilities`, and result columns/rows
- `ProbeErrorResponse`: error envelope for invalid queries or unavailable features

This keeps the transport contract explicit instead of forcing each host app to re-declare a near-copy of the TypeScript types.

## @supersubset/query-client

`QueryClient` wraps a host-provided `QueryAdapter` and optional `MetadataAdapter`.

Important APIs:

- `new QueryClient({ queryAdapter, metadataAdapter, metadataSource, cacheTtlMs })`
- `execute(query, options?)`
- `cancel(queryId)`
- `getDatasets()`
- `getDataset(datasetId)`
- `invalidateCache()`
- `buildQuery(datasetId)`

`buildQuery()` returns a fluent `QueryBuilder` with:

- `select(fieldId, aggregation?, alias?)`
- `where(filter)`
- `orderBy(fieldId, direction?)`
- `limit(n)`
- `offset(n)`
- `toQuery()`
- `execute(options?)`

Example:

```ts
const client = new QueryClient({ queryAdapter, metadataAdapter, metadataSource });

const result = await client
  .buildQuery('orders')
  .select('revenue', 'sum', 'total_revenue')
  .where({ fieldId: 'region', operator: 'eq', value: 'West' })
  .orderBy('ordered_at', 'desc')
  .limit(20)
  .execute();
```

## Adapter Packages

Supersubset ships four metadata normalization packages today:

- `@supersubset/adapter-prisma`: parses Prisma schema text via `PrismaAdapter`
- `@supersubset/adapter-sql`: normalizes structured catalog objects via `SqlAdapter`
- `@supersubset/adapter-json`: normalizes hand-authored JSON dataset definitions via `JsonAdapter`
- `@supersubset/adapter-dbt`: normalizes dbt manifest objects via `DbtAdapter`; dataset ids come from dbt manifest node ids so they stay stable across schemas and packages, and `meta.supersubset` can override dataset and field metadata such as labels, roles, aggregations, formats, and source types

These packages normalize metadata only. They do not connect the runtime directly to a database.

## @supersubset/cli

The CLI package exposes both a programmatic import API and the `supersubset` binary.

Main exports:

- `importSchema(options)`
- `ImportSchemaOptions`
- `ImportSchemaResult`

`ImportSchemaOptions`:

- `sourceType`: `prisma`, `sql`, `json`, or `dbt`
- `source`: raw source payload as a string or parsed object
- `title`: optional dashboard title override
- `id`: optional dashboard id override

`ImportSchemaResult`:

- `dashboard`: generated `DashboardDefinition`
- `datasets`: normalized dataset output from the chosen adapter
- `stats`: dataset, field, and widget counts

Example:

```ts
import { importSchema } from '@supersubset/cli';

const result = await importSchema({
  sourceType: 'json',
  source: [
    {
      id: 'orders',
      label: 'Orders',
      fields: [
        { id: 'ordered_at', dataType: 'date', role: 'time' },
        { id: 'region', dataType: 'string', role: 'dimension' },
        { id: 'revenue', dataType: 'number', role: 'measure', defaultAggregation: 'sum' },
      ],
    },
  ],
  title: 'Imported Dashboard',
});

console.log(result.dashboard);
```

## Related Docs

- [schema.md](./schema.md)
- [Schema Import Tutorial](../guides/schema-import.md)
- [Custom Adapter Authoring Guide](../guides/custom-adapter.md)
- [Getting Started](../getting-started.md)
