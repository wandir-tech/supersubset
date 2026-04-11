# ADR-004: Package Boundaries

## Status

Accepted

## Date

2026-04-08

## Context

Supersubset is a monorepo of npm packages. Package boundaries enforce architecture rules:
- Runtime works without designer
- Designer works without specific chart implementations
- Adapters are pluggable — host apps choose which to install
- Schema is the central contract all packages depend on

The spec defines a recommended layout. This ADR finalizes the package plan with dependency rules.

## Decision

### Package map

```
packages/
├── schema/              # Canonical types, Zod validation, JSON Schema, serializers, migrations
├── runtime/             # Renderer, layout engine, widget registry, filter engine, lifecycle hooks
├── designer/            # Puck-based visual editor, property panels, palette, import/export
├── charts-echarts/      # ECharts chart widgets (line, bar, pie, scatter, heatmap, combo, table, KPI)
├── data-model/          # Normalized metadata model, adapter interfaces, field inference
├── adapter-prisma/      # Prisma schema → normalized metadata
├── adapter-sql/         # SQL catalog introspection → normalized metadata
├── adapter-dbt/         # dbt manifest → normalized metadata
├── adapter-json/        # Generic JSON metadata → normalized metadata
├── query-client/        # Pluggable query transport, logical query plan, SQL generation
├── theme/               # Theme tokens, host-style bridge, ECharts theme translation
└── dev-app/             # Local development playground (Vite + React)

e2e/                     # Playwright E2E tests (monorepo root)
```

### Dependency rules

```
                    ┌──────────┐
                    │  schema  │  ← depends on nothing (leaf package)
                    └────┬─────┘
            ┌────────────┼────────────┐
            ▼            ▼            ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │  runtime │ │data-model│ │  theme   │
      └────┬─────┘ └────┬─────┘ └──────────┘
           │             │
     ┌─────┼─────┐       ├──────────┬──────────┬──────────┐
     ▼     ▼     ▼       ▼          ▼          ▼          ▼
┌────────┐│┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│designer│││charts-   │ │adapter-│ │adapter-│ │adapter-│ │adapter-│
│        │││echarts   │ │prisma  │ │sql     │ │dbt     │ │json    │
└────────┘│└──────────┘ └────────┘ └────────┘ └────────┘ └────────┘
          ▼
    ┌──────────┐
    │query-    │
    │client    │
    └──────────┘
```

### Strict dependency rules

| Package | May depend on | Must NOT depend on |
|---------|--------------|-------------------|
| `schema` | (nothing) | everything |
| `runtime` | `schema` | `designer`, `charts-echarts`, any adapter |
| `designer` | `schema`, `runtime`, `data-model` | any adapter, `query-client` |
| `charts-echarts` | `schema`, `runtime` (widget registry types) | `designer`, any adapter |
| `data-model` | `schema` | `runtime`, `designer`, any adapter impl |
| `adapter-*` | `data-model` | `runtime`, `designer`, `schema` directly |
| `query-client` | `schema` | `runtime`, `designer`, any adapter |
| `theme` | `schema` | `runtime`, `designer` |
| `dev-app` | any (development only) | — |

### Key rules

1. **`schema` is the root** — every package ultimately depends on `schema` for types
2. **`runtime` is chart-agnostic** — it knows about the widget registry interface but not ECharts
3. **`designer` does NOT import adapters** — it receives a `DataModel` object via props
4. **`charts-echarts` registers widgets** — runtime discovers them via the registry, not direct imports
5. **Adapters depend only on `data-model`** — they implement the adapter interface
6. **Host apps compose packages** — they install `@supersubset/designer` + `@supersubset/charts-echarts` + `@supersubset/adapter-prisma` as needed

### Package naming

npm scope: `@supersubset/`

| Package | npm name |
|---------|----------|
| schema | `@supersubset/schema` |
| runtime | `@supersubset/runtime` |
| designer | `@supersubset/designer` |
| charts-echarts | `@supersubset/charts-echarts` |
| data-model | `@supersubset/data-model` |
| adapter-prisma | `@supersubset/adapter-prisma` |
| adapter-sql | `@supersubset/adapter-sql` |
| adapter-dbt | `@supersubset/adapter-dbt` |
| adapter-json | `@supersubset/adapter-json` |
| query-client | `@supersubset/query-client` |
| theme | `@supersubset/theme` |

### Build tooling

- **pnpm** workspaces for monorepo package management
- **Nx** for task orchestration (caching, affected-only builds, dependency graph)
- **TypeScript** project references for incremental builds
- **tsup** or **unbuild** for package bundling (ESM + CJS)
- **Vitest** for unit tests (per-package)
- **Playwright** for E2E tests (monorepo root `e2e/`)

#### Nx configuration

Nx runs on top of pnpm workspaces. Key scripts:
- `nx run-many -t build` — build all packages (with caching)
- `nx affected -t test` — test only packages affected by changes
- `nx graph` — visualize package dependency graph
- Cache stored locally in `.nx/cache`; tasks are skipped if inputs haven't changed

## Consequences

### Positive

- Architecture rules are enforced by package boundaries — circular deps are caught by tooling
- Host apps install only what they need (tree of dependencies)
- Runtime works without designer (key architecture invariant)
- New chart libraries can be added (`charts-d3`, `charts-plotly`) without changing schema or runtime
- New adapters can be added without changing any other package

### Negative

- 12 packages is significant monorepo overhead (CI, releases, version management)
- Internal cross-package imports require build step — slightly slower dev loop than a single package
- pnpm workspace protocol requires discipline in `package.json` management

### Neutral

- `dev-app` is not published — it's a local development tool only
- `e2e/` tests live at monorepo root, not inside any package

## Alternatives Considered

| Alternative | Pros | Cons | Why Rejected |
|------------|------|------|-------------|
| **Fewer, larger packages** (e.g., merge runtime + charts) | Simpler monorepo, fewer releases | Violates "runtime is chart-agnostic" rule; harder to tree-shake | Breaks architecture invariant |
| **Single package** | Simplest development and release | No enforced boundaries; host apps pull everything; violates library-first approach | Library-first requires granular packages |
| **Turborepo instead of Nx** | Simpler configuration (turbo.json), task caching | Less feature-rich (no generators, weaker dependency graph, no affected-only) | Nx provides better tooling for 12+ packages |
| **pnpm workspaces only (no task runner)** | Zero overhead | No task caching, no affected-only testing; will slow down as project grows | 12 packages need caching for reasonable CI times |

## References

- [Initial spec — package layout](../../initial-spec.md)
- [Reuse matrix — recommended stack](../research/reuse-matrix.md)
- [HC-0 decision record](../status/checkpoints/hc-0-result.md)
