# Custom Adapter Authoring Guide

This guide shows how to plug a new metadata source into Supersubset without breaking the adapter-first architecture.

The core rule is simple: normalize source-specific metadata into `@supersubset/data-model` types and keep execution host-owned.

## When To Write A Custom Adapter

Write a custom adapter when your metadata source is not already covered by the shipped Prisma, SQL, JSON, or dbt packages.

Common cases:

- internal catalog APIs
- proprietary semantic layers
- CMS or analytics metadata services
- precomputed dataset manifests

## The Required Interface

At minimum, implement `MetadataAdapter<TSource>`:

```ts
import type { MetadataAdapter, NormalizedDataset } from '@supersubset/data-model';

export class CmsMetadataAdapter implements MetadataAdapter<CmsSource> {
  readonly name = 'cms';

  async getDatasets(source: CmsSource): Promise<NormalizedDataset[]> {
    return source.collections.map(normalizeCollection);
  }

  async getDataset(source: CmsSource, datasetId: string): Promise<NormalizedDataset | undefined> {
    const datasets = await this.getDatasets(source);
    return datasets.find((dataset) => dataset.id === datasetId);
  }
}
```

## Normalization Checklist

Each `NormalizedDataset` should have:

- stable `id`
- human-readable `label`
- normalized `fields`
- optional `description`
- optional `relationships`

Each `NormalizedField` should have:

- stable `id`
- readable `label`
- `dataType`
- `role`
- optional `defaultAggregation`
- optional `format` or `description`

The easiest way to stay consistent is to reuse the helper utilities from `@supersubset/data-model`.

## Recommended Helpers

```ts
import {
  inferFieldRole,
  inferAggregation,
  humanizeFieldName,
  type NormalizedDataset,
  type NormalizedField,
} from '@supersubset/data-model';
```

Typical field normalization:

```ts
function normalizeField(column: CmsColumn): NormalizedField {
  const dataType = mapCmsType(column.kind);
  const role = inferFieldRole(column.name, dataType);
  const defaultAggregation = inferAggregation(role, dataType);

  return {
    id: column.name,
    label: humanizeFieldName(column.name),
    dataType,
    role,
    ...(defaultAggregation !== undefined && { defaultAggregation }),
  };
}
```

## Optional Query Adapter

If the host also wants a reusable execution layer, implement `QueryAdapter`.

```ts
import type { LogicalQuery, QueryAdapter, QueryResult } from '@supersubset/data-model';

export class CmsQueryAdapter implements QueryAdapter {
  readonly name = 'cms';

  async execute(query: LogicalQuery): Promise<QueryResult> {
    const response = await fetch('/api/analytics/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(query),
    });

    return response.json() as Promise<QueryResult>;
  }
}
```

This keeps the runtime backend-agnostic. Supersubset emits logical intent, and the host decides how queries actually run.

## Wiring With QueryClient

`QueryClient` is useful when you want one host-side place for both metadata caching and logical query execution.

```ts
import { QueryClient } from '@supersubset/query-client';

const client = new QueryClient({
  queryAdapter: new CmsQueryAdapter(),
  metadataAdapter: new CmsMetadataAdapter(),
  metadataSource: cmsSource,
});

const datasets = await client.getDatasets();
```

## Design Rules To Keep

- keep dataset and field ids stable across runs
- normalize into the shared data model instead of leaking source-specific shapes
- keep auth, credentials, and transport concerns in the host app
- keep query execution separate from metadata normalization unless the host explicitly wants both
- avoid coupling the runtime or designer directly to a source-specific SDK

## Validation Strategy

Good adapter tests usually cover:

- field type mapping
- role inference
- relationship extraction
- invalid input handling
- stable dataset ids
- representative end-to-end import through `importSchema()` when appropriate

## Related Docs

- [API Reference: Metadata And CLI](../api/metadata-and-cli.md)
- [Schema Import Tutorial](./schema-import.md)
- [API Reference: Schema](../api/schema.md)