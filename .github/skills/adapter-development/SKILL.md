---
name: adapter-development
description: "Build data model adapters for Supersubset that normalize metadata from Prisma, SQL, dbt, or JSON sources into the analytical metadata model. Use when implementing new adapters, defining query abstractions, or building the normalized field/entity/measure model."
---

# Adapter Development Skill

## When to Use
- Implementing a new metadata adapter (Prisma, SQL, dbt, JSON)
- Defining the normalized analytical metadata model
- Building the query client abstraction
- Adding field typing, relationship inference, or measure/dimension normalization
- Writing fixture-based adapter tests

## Normalized Metadata Model

All adapters must produce this normalized shape:

```typescript
interface AnalyticalModel {
  entities: Entity[];
  relationships: Relationship[];
}

interface Entity {
  id: string;
  name: string;
  displayName: string;
  source: string; // adapter-specific source ref
  fields: Field[];
}

interface Field {
  id: string;
  name: string;
  displayName: string;
  dataType: FieldDataType; // string | number | date | boolean | json
  role: 'dimension' | 'measure' | 'time' | 'key';
  defaultAggregation?: AggregationType;
  formatHint?: FormatHint;
  filterOperators: FilterOperator[];
}

interface Relationship {
  from: { entityId: string; fieldId: string };
  to: { entityId: string; fieldId: string };
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}
```

## Query Abstraction

```typescript
interface QueryRequest {
  dataset: string;
  fields: FieldSelection[];
  aggregations: AggregationSpec[];
  groupBy: string[];
  filters: FilterExpression[];
  sort: SortSpec[];
  limit?: number;
  offset?: number;
  timeGrain?: TimeGrain;
  comparisonPeriod?: ComparisonSpec;
}

interface QueryAdapter {
  execute(query: QueryRequest): Promise<QueryResult>;
  getMetadata(): Promise<AnalyticalModel>;
}
```

## Adapter Priority

1. **Prisma** — Parse `.prisma` schema files, infer entities/fields/relationships
2. **SQL** — Introspect via `INFORMATION_SCHEMA` or catalog queries
3. **JSON** — Accept hand-authored JSON metadata files
4. **dbt** — Parse `manifest.json` and `catalog.json`

## Procedure

1. Define adapter interface in `packages/data-model/src/adapter.ts`
2. Create adapter package: `packages/adapter-{name}/`
3. Implement `getMetadata()` — source-specific parsing
4. Implement field role inference (dimension vs measure heuristics)
5. Implement relationship detection
6. Write fixture-based tests with sample schemas
7. Implement `execute()` for query-capable adapters

## Field Role Heuristics

| Pattern | Inferred Role |
|---------|--------------|
| `*_id`, `*Id`, primary key | `key` |
| `*_at`, `*Date`, `*Time`, date/timestamp type | `time` |
| numeric type without `_id` suffix | `measure` |
| string, enum, boolean | `dimension` |
| float named `*_amount`, `*_total`, `*_count` | `measure` |
