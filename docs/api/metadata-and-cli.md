# Metadata And CLI API

This reference covers the metadata model, host query helpers, source adapters, and schema import entrypoints.

## @supersubset/data-model

This package defines the normalized metadata contract that all adapters emit.

Main exports:

- `NormalizedDataset`, `NormalizedField`, `DatasetRelationship`
- `MetadataAdapter`
- `LogicalQuery`, `QueryField`, `QueryFilter`, `QuerySort`, `QueryResult`
- `QueryAdapter`
- `inferFieldRole()`, `inferAggregation()`, `humanizeFieldName()`

Use `MetadataAdapter` when normalizing source metadata into a backend-agnostic analytical model. Use `QueryAdapter` when the host wants to execute logical queries against its own backend or in-browser engine.

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
- `@supersubset/adapter-dbt`: normalizes dbt manifest objects via `DbtAdapter`

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