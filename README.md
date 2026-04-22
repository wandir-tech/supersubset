<p align="center">
  <img src="logo.svg" alt="Supersubset" width="80" height="80" />
</p>
<h1 align="center">Supersubset</h1>

<p align="center"><strong>An embeddable, open-source analytics builder and runtime for React applications.</strong></p>

> **⚠️ Experimental — not production-ready.**
> This project is an experiment and may not be actively maintained.
> Use it for exploration, prototyping, or as a reference — not for production workloads.

## Origin Story

Supersubset grew out of a search for an embeddable analytics library that checked every box: React-native components (no iframes), host-owned persistence, backend-agnostic data access, and a real drag-and-drop designer. There were a lot of close calls — Apache Superset, Rill, Perspective, Dashbuilder — but nothing fit the "library you drop into your own app" model without dragging in a full BI server or a tightly coupled backend.

The experiment: **can AI conjure a production-shaped library by using those other projects as a living spec?** Every adapter interface, chart wrapper, and schema contract in Supersubset was shaped by studying what worked (and what coupled too tightly) in the open-source analytics landscape, then having AI agents generate, test, and iterate on the code. The result is this library — useful, but honest about its origins.

## Workflow Assumptions

Supersubset assumes:

- **The data model is set by the developer and the backend.** Modeling tools, semantic layers, and warehouse management are out of scope. You bring your own schema; Supersubset renders against it.
- **A secure SQL interface is available.** The query client sends queries to an endpoint you provide. Auth, row-level security, and connection management are your responsibility.
- **Dashboards can live in code _or_ in a database.** Define dashboards as JSON/YAML in your repo and manage them through CI/CD, or store them in a database and let end users build and edit them through the designer. Either workflow is supported — the library doesn't prescribe one.

## Key Principles

- **Library-first** — ships as npm packages, not a hosted platform
- **Schema-first** — the canonical `DashboardDefinition` is the product contract
- **Backend-agnostic** — no required Superset/Rill/Lightdash server
- **Adapter-first metadata** — designer and runtime never depend on Prisma/dbt/ClickHouse specifics
- **Host-owned persistence** — the designer emits schema; the host app decides where to store it
- **Host-owned auth** — Supersubset accepts capability metadata; auth is the host's responsibility
- **No iframes** — core editor and renderer are React components

## Packages

| Package                       | Description                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@supersubset/schema`         | Canonical dashboard types, Zod validation, JSON/YAML serialization, migration engine                                                                                      |
| `@supersubset/runtime`        | `<SupersubsetRenderer />`, widget registry, filter engine, interactions, state persistence                                                                                |
| `@supersubset/designer`       | `<SupersubsetDesigner />` — Puck-based drag-and-drop editor with property panels                                                                                          |
| `@supersubset/charts-echarts` | 18 ECharts widget wrappers (line, bar, pie, scatter, area, combo, heatmap, radar, treemap, funnel, gauge, waterfall, sankey, box-plot, table, KPI card, markdown, alerts) |
| `@supersubset/theme`          | Theme tokens, defaults, CSS variable bridge, ECharts theme integration                                                                                                    |
| `@supersubset/data-model`     | Normalized analytical metadata model (entities, fields, measures, relationships)                                                                                          |
| `@supersubset/query-client`   | Query abstraction with fluent `QueryBuilder`                                                                                                                              |
| `@supersubset/cli`            | `npx supersubset import-schema` — introspect Prisma/SQL/dbt/JSON sources                                                                                                  |
| `@supersubset/adapter-prisma` | Prisma schema → normalized metadata adapter                                                                                                                               |
| `@supersubset/adapter-sql`    | PostgreSQL/MySQL/SQLite introspection adapter                                                                                                                             |
| `@supersubset/adapter-json`   | JSON/fixture metadata adapter                                                                                                                                             |
| `@supersubset/adapter-dbt`    | dbt manifest adapter                                                                                                                                                      |
| `@supersubset/docs`           | End-user docs site (Astro Starlight) with screenshots                                                                                                                     |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+

### Build

> **Important**: You must build the workspace packages before running any examples.
> The examples import from `dist/` which doesn't exist until you build.

```bash
git clone https://github.com/wandir-tech/supersubset.git
cd supersubset
pnpm install
pnpm build        # ← required before running examples
```

### Run the Examples

**Next.js e-commerce dashboard** (runtime-only embedding):

```bash
pnpm dev:nextjs-example
# Open http://localhost:3001
```

**Vite + SQLite analytics** (runtime + designer with host-owned SQL):

```bash
pnpm dev:vite-sqlite-example
# Open http://localhost:3002
```

**Dev app** (full designer + viewer + preview):

```bash
pnpm dev
# Open http://localhost:3000
```

### Run Tests

```bash
# Unit tests (all packages)
pnpm test

# E2E tests (Playwright — starts servers automatically)
pnpm test:e2e

# Type checking
pnpm typecheck
```

## Getting Started with Your Data

Supersubset needs two kinds of information before it can build charts against your backend:

1. **Metadata**: datasets, fields, types, and semantic roles like dimension, measure, and time.
2. **Query execution**: a backend endpoint that can answer logical chart-preview queries.

The discovery endpoint is optional. You can onboard your data model in three ways:

### 1. Discovery URL

If your backend can expose normalized metadata directly, point Probe mode at a discovery URL or backend base URL and Supersubset will fetch datasets automatically.

### 2. CLI-generated metadata snapshot

If you already have Prisma, SQL catalog, dbt, or JSON metadata, generate a normalized snapshot with the CLI:

```bash
npx supersubset export-metadata \
  --source-type prisma \
  --source ./prisma/schema.prisma \
  --out ./supersubset-metadata.json
```

The output is an envelope shaped like:

```json
{
  "datasets": [
    {
      "id": "orders",
      "label": "Orders",
      "fields": [
        { "id": "region", "label": "Region", "dataType": "string", "role": "dimension" },
        {
          "id": "revenue",
          "label": "Revenue",
          "dataType": "number",
          "role": "measure",
          "defaultAggregation": "sum"
        }
      ]
    }
  ]
}
```

### 3. Paste metadata JSON into Probe mode

For the fastest proof of concept, open the dev app, switch to `Probe`, choose `Paste metadata JSON`, and paste either:

- a raw `NormalizedDataset[]`
- or an object with a `datasets` array

### Probe mode workflow

1. Run the dev app: `pnpm dev`
2. Open http://localhost:3000
3. Switch to `Probe`
4. Choose a metadata source: `Discovery URL` or `Paste metadata JSON`
5. Optionally provide a separate query endpoint URL for live chart preview
6. Add auth as either Bearer JWT or custom header
7. Load metadata and start building charts

If you provide metadata but no query endpoint, you can still design the dashboard and export JSON, but chart previews will fall back to sample data.

## Embedding in Your App

### Runtime Only

```tsx
import { SupersubsetRenderer } from '@supersubset/runtime';
import { registerAllCharts } from '@supersubset/charts-echarts';
import { resolveTheme } from '@supersubset/theme';

// Register chart widgets once at app startup
const registry = registerAllCharts();

function Dashboard({ definition, data }) {
  return (
    <SupersubsetRenderer
      definition={definition}
      widgetRegistry={registry}
      theme={resolveTheme({})}
      dataProvider={(widgetId) => data[widgetId]}
    />
  );
}
```

### Designer

```tsx
import { SupersubsetDesigner } from '@supersubset/designer';

function Editor({ definition, onSave }) {
  return (
    <SupersubsetDesigner
      definition={definition}
      onSave={onSave} // Host owns persistence
      widgetRegistry={registry}
    />
  );
}
```

## Project Structure

```
packages/
├── schema/            # Canonical types + validation
├── runtime/           # Renderer, filters, interactions
├── designer/          # Puck-based visual editor
├── charts-echarts/    # 18 chart widget wrappers
├── theme/             # Theme tokens + CSS bridge
├── data-model/        # Normalized metadata model
├── query-client/      # Query abstraction layer
├── cli/               # Schema import tool
├── adapter-prisma/    # Prisma adapter
├── adapter-sql/       # SQL introspection adapter
├── adapter-json/      # JSON/fixture adapter
├── adapter-dbt/       # dbt manifest adapter
├── dev-app/           # Development playground
└── docs/              # End-user docs site (Astro Starlight)
examples/
├── nextjs-ecommerce/  # Next.js runtime host demo
└── vite-sqlite/       # Vite + SQLite full demo
docs/
├── api/               # Package-level API reference
├── guides/            # Task-focused tutorials
├── adr/               # Architecture Decision Records
└── status/            # Project tracking
```

## Documentation

### End-User Docs (Dashboard Authors)

The interactive docs site lives in `packages/docs/` and covers every feature with screenshots from both the designer and viewer perspectives.

```bash
# Run locally
pnpm docs:dev
# Open http://localhost:4321

# Build for production
pnpm docs:build
pnpm docs:preview

# Re-capture all screenshots (requires dev-app running on :3000)
pnpm docs:screenshots
```

The site includes 38 pages across 8 categories: Getting Started, Chart Types (14), Widgets, Layout, Filters, Interactions, Pages, and Import/Export.

### Developer Docs

- [Getting Started](docs/getting-started.md) — fastest path to a running dashboard
- [API Reference](docs/api/README.md) — package-level surface docs
- [Chart Cookbook](docs/guides/chart-cookbook.md) — config recipes for all 18 widget types
- [Custom Adapter Guide](docs/guides/custom-adapter.md) — write your own metadata adapter
- [Schema Import Tutorial](docs/guides/schema-import.md) — import from Prisma/SQL/dbt
- [Architecture Decision Records](docs/adr/) — design rationale and tradeoffs

## Acknowledgments

This project was developed with inspiration from and, in some areas, design adaptations based on **[Apache Superset](https://superset.apache.org/)**. Where Supersubset includes code adapted from Apache Superset (such as the default color palette and layout nesting model), such code is provided in compliance with the Apache License 2.0. See `LICENSE` and `NOTICE` for details.

Supersubset also builds on these open-source projects:

- **[Puck](https://github.com/puckeditor/puck)** — the React visual editor that serves as Supersubset's designer shell
- **[Apache ECharts](https://echarts.apache.org/)** — powers all chart rendering through thin, schema-driven wrappers
- **[Rill](https://github.com/rilldata/rill)** — influenced the adapter-first metadata approach
- **[Perspective](https://perspective.finos.org/)** — streaming analytics inspiration for future extensions

## License

Copyright 2026 Wandir Technologies Inc.

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full text and [NOTICE](NOTICE) for third-party attributions.
