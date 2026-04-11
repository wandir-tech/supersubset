# HC-5 — Checkpoint Brief: Metadata Adapters + Schema Import Tool

> **Gate**: HC-5 — Human reviews adapter normalization + import tool
> **Phase**: 3 — Metadata Adapters + Schema Import Tool
> **Prepared**: 2026-04-09
> **Tests**: 881 unit + 21 e2e = 902 total (all passing)

---

## What to Review

### 1. Field Role Heuristics (`packages/data-model/src/heuristics.ts`)

Three pure functions shared across all adapters:

| Function | Purpose |
|----------|---------|
| `inferFieldRole(name, dataType)` | Pattern-matches field names and types → `key`, `time`, `measure`, `dimension` |
| `inferAggregation(role, dataType)` | Chooses default aggregation (`sum`, `count`, `avg`, `none`) |
| `humanizeFieldName(id)` | Converts `snake_case` / `camelCase` → Title Case labels |

**To verify**: Do the heuristics produce sensible defaults for your typical schemas?

### 2. Four Metadata Adapters

All implement `MetadataAdapter<TSource>` from `@supersubset/data-model`:

| Adapter | Package | Source Format | Tests |
|---------|---------|---------------|-------|
| **Prisma** | `packages/adapter-prisma/` | Prisma schema string (model blocks) | 18 |
| **SQL** | `packages/adapter-sql/` | JSON catalog (`{ tables, foreignKeys }`) | 25 |
| **JSON** | `packages/adapter-json/` | Hand-authored dataset definitions | 20 |
| **dbt** | `packages/adapter-dbt/` | dbt `manifest.json` (nodes) | 19 |

Each adapter:
- Parses its source format into `NormalizedDataset[]`
- Uses heuristics for field role and aggregation inference
- Has zero external dependencies (pure parsing logic)
- Handles edge cases (empty inputs, unknown types, mixed formats)

**To verify**: Try one of these with a real schema you have on hand.

### 3. Query Client (`packages/query-client/`)

- `QueryClient<TSource>` — wraps host-provided `QueryAdapter` + `MetadataAdapter`
- Metadata caching with configurable TTL
- Cache invalidation API
- `QueryBuilder` fluent API: `.select().where().orderBy().limit().execute()`
- 18 unit tests

### 4. Schema Import Tool (`packages/cli/`)

Core function: `importSchema(options) → ImportSchemaResult`

```typescript
const result = await importSchema({
  sourceType: 'prisma',  // or 'sql' | 'json' | 'dbt'
  source: prismaSchemaString,
  title: 'My Dashboard',
});
// result.dashboard → full DashboardDefinition
// result.datasets → NormalizedDataset[]
// result.stats → { datasetsCount, fieldsCount, widgetsGenerated }
```

**Auto-widget generation rules**:
- Time field + measure → Line Chart
- Dimension + measure → Bar Chart
- Any measure → KPI Card
- Always → Table widget

**To verify**: Does the auto-generated dashboard make sense for your data model?

### 5. Workflow Tests

- `e2e/workflows/metadata-to-dashboard.spec.ts` — 3 Playwright browser tests
- `packages/cli/test/workflow-metadata-to-dashboard.test.ts` — 11 programmatic tests covering all 4 adapter types, field role inference, widget generation, layout structure, and deterministic IDs

---

## Test Summary

| Package | Tests |
|---------|-------|
| schema | 29 |
| data-model | 24 |
| theme | 12 |
| runtime | 15 |
| adapter-prisma | 18 |
| adapter-sql | 25 |
| adapter-json | 20 |
| adapter-dbt | 19 |
| query-client | 18 |
| charts-echarts | 170 |
| cli | 34 |
| designer | 496 |
| dev-app | 1 |
| **Total unit** | **881** |
| e2e (Playwright) | 21 |
| **Grand total** | **902** |

---

## How to Try It

```bash
# Run all tests
pnpm test

# Start the dev app
pnpm --filter @supersubset/dev-app dev

# Try the import function programmatically
cd packages/cli
node -e "
  import('./dist/import-schema.js').then(m =>
    m.importSchema({
      sourceType: 'prisma',
      source: \`model User { id Int @id; name String; createdAt DateTime }\`,
      title: 'Quick Test'
    }).then(r => console.log(JSON.stringify(r.dashboard, null, 2)))
  )
"
```

---

## Approval Criteria

- [ ] Heuristics produce reasonable field roles for reviewer's real schemas
- [ ] At least one adapter tested with non-fixture data
- [ ] Auto-generated dashboard structure looks sensible
- [ ] Query client API feels right for host-app integration
- [ ] No security concerns in adapter parsing logic
