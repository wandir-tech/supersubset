# Checkpoint HC-1 Brief

> **Gate**: ADR + Schema Approval  
> **Date**: 2026-04-08  
> **Tasks completed**: 0.16–0.22

## What Was Built Since Last Checkpoint

| Task | Output | Status |
|------|--------|--------|
| 0.16 | [ADR-001: Editor Shell — Puck](../../adr/001-editor-shell.md) | ✅ Complete |
| 0.17 | [ADR-002: Chart Runtime — ECharts](../../adr/002-chart-runtime.md) | ✅ Complete |
| 0.18 | [ADR-003: Canonical Schema Format](../../adr/003-canonical-schema.md) | ✅ Complete |
| 0.19 | [ADR-004: Package Boundaries](../../adr/004-package-boundaries.md) | ✅ Complete |
| 0.20 | Canonical schema v0.2.0 draft (`packages/schema/`) | ✅ Complete — 20 tests pass |
| 0.21 | Monorepo package skeleton (12 packages) | ✅ Complete |
| 0.22 | Playwright test scaffold (`e2e/` + config) | ✅ Complete |
| — | Schema evolution: flat normalized layout map (v0.2.0) | ✅ Complete |
| — | Nx migration for task orchestration | ✅ Complete |

## ADR Summaries

### ADR-001: Editor Shell — Puck
- **Decision**: Use Puck (`@measured/puck`, MIT) as the editor shell
- **Layout**: Custom CSS Grid/Row/Column components using Puck slots (per HC-0 decision)
- **Integration**: Puck is wrapped inside `packages/designer/` — never exposed to host apps
- **Alternatives rejected**: Craft.js (more boilerplate), GrapesJS (HTML paradigm), custom from scratch (months of work)

### ADR-002: Chart Runtime — ECharts
- **Decision**: Use Apache ECharts (Apache 2.0) as primary chart renderer
- **Architecture**: Pipeline pattern: `CanonicalConfig → Translator → ECharts Option`
- **Table**: ECharts dataset/table (per HC-0 decision) — no separate table library
- **Theming**: Theme bridge translates Supersubset tokens → ECharts theme
- **Alternatives rejected**: D3 (library not solution), Recharts (limited types), Plotly (3MB)

### ADR-003: Canonical Schema Format
- **Decision**: TypeScript interfaces as source of truth, Zod for validation, JSON Schema generated
- **Domain-agnostic**: No built-in dimension/measure taxonomies (per HC-0 decision)
- **Layout model**: Flat normalized map (`LayoutMap = Record<string, LayoutComponent>`) — inspired by Superset's entity-map pattern. Each component has `children: string[]`, `parentId`, and `meta` with explicit `width`/`height` in grid column units
- **10 component types**: root, grid, row, column, widget, tabs, tab, spacer, header, divider
- **Nesting validation**: `VALID_CHILDREN` constant + `validateNesting()` function enforce parent-child rules and max depth (5)
- **12-column grid**: `GRID_COLUMN_COUNT = 12`, default widget width = 4 columns
- **Key types**: `DashboardDefinition`, `PageDefinition`, `LayoutMap`, `LayoutComponent`, `LayoutMeta`, `WidgetDefinition`, `DataBinding`, `FieldBinding`, `FilterDefinition`, `InteractionDefinition`
- **Encoding**: JSON and YAML are interchangeable encodings, deterministic serialization, sorted keys
- **Versioning**: semver, v0.x explicitly unstable, migration functions planned

### ADR-004: Package Boundaries
- **12 packages**: schema, runtime, designer, charts-echarts, data-model, 4 adapters, query-client, theme, dev-app
- **Key rule**: `schema` is the root dependency, `runtime` is chart-agnostic, `designer` never imports adapters
- **Naming**: `@supersubset/<name>` npm scope
- **Tooling**: pnpm workspaces + **Nx v22.6.4** for task orchestration (caching, affected-only builds, dependency graph), tsup build (ESM + CJS), Vitest, Playwright
- **Nx benefits**: Verified ~0ms cache hits on unchanged packages; `nx affected -t test` runs only what changed

## Schema Package — Verified

The `packages/schema/` package is implemented and verified:

### Files
- `src/types/dashboard.ts` — TypeScript interfaces + constants: `LayoutMap`, `LayoutComponent`, `LayoutMeta`, `VALID_CHILDREN`, `MAX_NESTING_DEPTH`, `GRID_COLUMN_COUNT`, and 15+ widget/filter/interaction types
- `src/validation/dashboard.ts` — Zod schemas with discriminated unions + `validateNesting()` function
- `src/serializers/json.ts` — deterministic JSON serializer with sorted keys + validated parser
- `src/migrations/index.ts` — version constant `0.2.0` (migrations to be added as schema evolves)
- `test/fixtures/sales-dashboard.json` — realistic fixture with 14 flat-map layout components, KPIs, line/pie/table charts, filters, interactions
- `test/dashboard.test.ts` — 20 tests

### Test Results
```
✓ DashboardDefinition schema (10 tests)
  - validates fixture, rejects bad input, validates discriminated unions, validates layout map
✓ Layout nesting validation (5 tests)
  - rejects widget-in-widget, rejects row-in-root, accepts tabs-in-grid, detects missing children, validates depth
✓ JSON serialization round-trip (4 tests)
  - semantic preservation, deterministic output, valid JSON, layout map structure
✓ Minimal valid dashboard (1 test)
```

### Build Output
- ESM: `dist/index.js` (8.4 KB)
- CJS: `dist/index.cjs` (12.4 KB)
- DTS: `dist/index.d.ts` (87.5 KB)

## Monorepo Structure

```
supersubset/
├── package.json              # root workspace (Nx scripts)
├── nx.json                   # Nx config (caching, affected)
├── pnpm-workspace.yaml
├── tsconfig.json             # base config
├── playwright.config.ts      # Chromium + Firefox
├── e2e/smoke.spec.ts         # smoke test placeholder
├── packages/
│   ├── schema/               # ✅ IMPLEMENTED (types, validation, serializers, tests)
│   ├── runtime/              # stub
│   ├── designer/             # stub
│   ├── charts-echarts/       # stub
│   ├── data-model/           # stub
│   ├── adapter-prisma/       # stub
│   ├── adapter-sql/          # stub
│   ├── adapter-dbt/          # stub
│   ├── adapter-json/         # stub
│   ├── query-client/         # stub
│   ├── theme/                # stub
│   └── dev-app/              # Vite playground (private)
└── docs/, .github/           # unchanged
```

## Questions for the Human Reviewer

1. **Flat layout map model**: The layout is now a flat normalized map (`Record<string, LayoutComponent>`) inspired by Superset's entity-map pattern, not a recursive tree. Each component has `children: string[]` and `parentId`. Review in [packages/schema/src/types/dashboard.ts](../../../packages/schema/src/types/dashboard.ts). Does this feel right for drag-and-drop editing? Any concerns about the flat vs tree tradeoff?

2. **Nesting rules**: 10 component types with parent-child validation (`VALID_CHILDREN` constant). For example: root accepts only grid; grid accepts row/tabs/header/divider; row accepts column/widget/spacer; column accepts row/widget/tabs/spacer. Review the `VALID_CHILDREN` map and `validateNesting()`. Are these rules correct? Missing any combination?

3. **Sizing model**: Every component has explicit `width` (grid columns out of 12) and `height` (grid row units). Defaults: widget = 4 columns wide, 50 row units tall. Is this the right granularity for sizing? Should height use pixels instead of abstract units?

4. **Widget config extensibility**: Widget configs are `Record<string, unknown>` in the canonical schema, with per-widget-type Zod schemas in `charts-echarts`. Is this the right level of type safety, or do you want stricter typing in the canonical schema itself?

5. **Field binding model**: `FieldBinding` has `{ role, fieldRef, aggregation, format, sort }`. Roles (e.g., "x-axis", "y-axis", "value") are strings defined by each chart type. Is this flexible enough, or should roles be more structured?

6. **Nx as build orchestrator**: Nx v22.6.4 added on top of pnpm workspaces for task caching and affected-only builds. Comfortable with this addition?

## Time Estimate for Review

~30 minutes. Read ADRs first (they're concise), then browse the schema types file and the test fixture JSON for a concrete example.

## Next Steps After HC-1 Approval

Phase 0 wraps up with task 0.24 (phase summary), then Phase 1 begins:
- 1.1–1.5: Schema refinement, Zod + JSON Schema, serializers, tests
- 1.6–1.8: Runtime shell, widget registry, filter engine
- 1.9: Data model interfaces
- 1.10–1.14: ECharts wrappers (line, bar, table, KPI)
- 1.15: Theme package
- 1.16: Dev app with first render
