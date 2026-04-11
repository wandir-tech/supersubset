# Schema Import Tutorial

This guide shows the supported schema import workflow in the current repository state.

Today, the supported entrypoint is the programmatic `importSchema()` API from `@supersubset/cli`. The package is published with a binary name, but the documented and tested workflow in this repo is the library API, not a separate argument-parsing command surface.

## What Import Produces

`importSchema()` takes source metadata, normalizes it through one of the adapter packages, and generates a starter `DashboardDefinition`.

The result includes:

- `dashboard`: generated dashboard document
- `datasets`: normalized metadata used to build it
- `stats`: dataset, field, and widget counts

The generated dashboard is a starting point. Expect to edit titles, layout, filters, and interactions in the designer or in code.

## Supported Source Types

`importSchema()` accepts four source kinds:

- `prisma`: raw Prisma schema text
- `sql`: structured SQL catalog object or JSON string
- `json`: array of dataset definitions or JSON string
- `dbt`: parsed dbt manifest object or JSON string

## Minimal Example

```ts
import { importSchema } from '@supersubset/cli';
import { dashboardDefinitionSchema, serializeToYAML } from '@supersubset/schema';

const source = [
  {
    id: 'orders',
    label: 'Orders',
    fields: [
      { id: 'ordered_at', dataType: 'date', role: 'time' },
      { id: 'region', dataType: 'string', role: 'dimension' },
      { id: 'revenue', dataType: 'number', role: 'measure', defaultAggregation: 'sum' },
    ],
  },
];

const result = await importSchema({
  sourceType: 'json',
  source,
  title: 'Imported Orders Dashboard',
});

dashboardDefinitionSchema.parse(result.dashboard);

console.log(result.stats);
console.log(serializeToYAML(result.dashboard));
```

## Step-By-Step Flow

1. Prepare source metadata in one of the supported formats.
2. Call `importSchema()` with `sourceType`, `source`, and optional `title` or `id`.
3. Validate the generated dashboard with `dashboardDefinitionSchema`.
4. Serialize it to JSON or YAML if you want to persist or inspect it.
5. Mount it in `SupersubsetRenderer` or open it in `SupersubsetDesigner` for refinement.

## Prisma Example

```ts
const prismaSchema = `
model Order {
  id        Int      @id @default(autoincrement())
  total     Float
  status    String
  createdAt DateTime @default(now())
}
`;

const result = await importSchema({
  sourceType: 'prisma',
  source: prismaSchema,
  title: 'Imported Prisma Dashboard',
});
```

## What The Generator Infers

The importer tries to infer enough structure to produce a useful first dashboard:

- time field + measure -> line chart
- dimension + measure -> bar chart
- first measure -> KPI card
- every dataset -> table widget

Those defaults are intentionally conservative. After import, use the designer to reshape the dashboard into the actual product experience you want.

## Common Follow-Up Steps

- add dashboard filters
- rename pages and widgets
- tighten field bindings and number formatting
- add interactions such as cross-filtering or page navigation
- attach host-specific query execution and filter options

## Limitations

- import creates starter layouts, not polished production dashboards
- dashboard-to-dashboard navigation is still a deferred runtime feature
- the currently documented import surface is the library API, not a standalone CLI command tutorial

## Related Docs

- [API Reference: Metadata And CLI](../api/metadata-and-cli.md)
- [API Reference: Schema](../api/schema.md)
- [Getting Started](../getting-started.md)