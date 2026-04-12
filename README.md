# Supersubset

**An embeddable, open-source analytics builder and runtime for React applications.**

Supersubset aims to be an embeddable [Apache Superset](https://superset.apache.org/) — giving React host apps a drag-and-drop dashboard designer and a lightweight rendering engine without requiring a full BI server.

## Key Principles

- **Library-first** — ships as npm packages, not a hosted platform
- **Schema-first** — the canonical `DashboardDefinition` is the product contract
- **Backend-agnostic** — no required Superset/Rill/Lightdash server
- **Adapter-first metadata** — designer and runtime never depend on Prisma/dbt/ClickHouse specifics
- **Host-owned persistence** — the designer emits schema; the host app decides where to store it
- **Host-owned auth** — Supersubset accepts capability metadata; auth is the host's responsibility
- **No iframes** — core editor and renderer are React components

## Packages

| Package | Description |
|---------|-------------|
| `@supersubset/schema` | Canonical dashboard types, Zod validation, JSON/YAML serialization, migration engine |
| `@supersubset/runtime` | `<SupersubsetRenderer />`, widget registry, filter engine, interactions, state persistence |
| `@supersubset/designer` | `<SupersubsetDesigner />` — Puck-based drag-and-drop editor with property panels |
| `@supersubset/charts-echarts` | 18 ECharts widget wrappers (line, bar, pie, scatter, area, combo, heatmap, radar, treemap, funnel, gauge, waterfall, sankey, box-plot, table, KPI card, markdown, alerts) |
| `@supersubset/theme` | Theme tokens, defaults, CSS variable bridge, ECharts theme integration |
| `@supersubset/data-model` | Normalized analytical metadata model (entities, fields, measures, relationships) |
| `@supersubset/query-client` | Query abstraction with fluent `QueryBuilder` |
| `@supersubset/cli` | `npx supersubset import-schema` — introspect Prisma/SQL/dbt/JSON sources |
| `@supersubset/adapter-prisma` | Prisma schema → normalized metadata adapter |
| `@supersubset/adapter-sql` | PostgreSQL/MySQL/SQLite introspection adapter |
| `@supersubset/adapter-json` | JSON/fixture metadata adapter |
| `@supersubset/adapter-dbt` | dbt manifest adapter |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+

### Build

```bash
git clone https://github.com/wandir-tech/supersubset.git
cd supersubset
pnpm install
pnpm build
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
      onSave={onSave}           // Host owns persistence
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
└── dev-app/           # Development playground
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

- [Getting Started](docs/getting-started.md) — fastest path to a running dashboard
- [API Reference](docs/api/README.md) — package-level surface docs
- [Chart Cookbook](docs/guides/chart-cookbook.md) — config recipes for all 18 widget types
- [Custom Adapter Guide](docs/guides/custom-adapter.md) — write your own metadata adapter
- [Schema Import Tutorial](docs/guides/schema-import.md) — import from Prisma/SQL/dbt

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
