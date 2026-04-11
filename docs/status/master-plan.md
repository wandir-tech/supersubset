# Supersubset — Master Plan

> **Last updated**: 2026-04-11
> **Current phase**: Phase 6 — Hardening
> **Status**: 1034 unit tests + 63 doc-screenshot tests + e2e suite. Phases 0-5 complete, all human checkpoints through HC-8 passed. Phase 6 hardening tasks 6.1-6.6 done + end-user docs site (38 pages, 60 screenshots). HC-9 release readiness review is the final gate. ADR-007 records documentation tooling decisions.

---

## Phase Overview

| Phase | Name | Status | Depends On |
|-------|------|--------|------------|
| 0 | Discovery & Research | ✅ **COMPLETE** | — |
| 1 | Schema + Runtime Skeleton | ✅ **COMPLETE** | Phase 0 |
| 2 | Designer MVP | ✅ **COMPLETE** | Phase 1 |
| 2.A | Chart Property Parity | ✅ **COMPLETE** | Phase 2.5 |
| 3 | Metadata Adapters + Schema Import Tool | ✅ **COMPLETE** | Phase 1 |
| 4 | Interaction Model | ✅ **COMPLETE** | Phase 2 + 3 |
| 5 | Developer Experience | ✅ **COMPLETE** | Phase 3 + 4 |
| 6 | Hardening | **ACTIVE** | Phase 5 |
| 6.A | End-User Documentation | ✅ **COMPLETE** | Phase 6 |

---

## Phase 0 — Discovery & Research

**Goal**: Produce architecture decisions, reuse matrix, canonical schema draft, and verified technology recommendations before writing significant code.

**Assigned agents**: Research, Architecture

### Task Graph

| ID | Task | Agent | Status | Depends | Output |
|----|------|-------|--------|---------|--------|
| 0.1 | Superset archaeology | Research | ✅ Done | — | `docs/research/superset-archaeology.md` |
| 0.2 | Puck study | Research | ✅ Done | — | `docs/research/puck-study.md` |
| 0.3 | Rill schema study | Research | ✅ Done | — | `docs/research/rill-study.md` |
| 0.4 | Dashbuilder study | Research | ✅ Done | — | `docs/research/dashbuilder-study.md` |
| 0.5 | Perspective study | Research | ✅ Done | — | `docs/research/perspective-study.md` |
| 0.6 | Landscape scan | Research | ✅ Done | — | `docs/research/landscape-scan.md` |
| 0.7 | Produce reuse matrix | Research | ✅ Done | 0.1-0.6 | `docs/research/reuse-matrix.md` |
| 0.14 | Browser test strategy | Testing | ✅ Done | 0.2 | `docs/testing/playwright-scaffold-plan.md` |
| **0.15** | **🛑 HC-0: Human reviews reuse matrix** | **Human** | ✅ Done | 0.7 | `docs/status/checkpoints/hc-0-result.md` |
| 0.16 | ADR-001: Editor shell (Puck) | Architecture | ✅ Done | **0.15** | `docs/adr/001-editor-shell.md` |
| 0.17 | ADR-002: Chart runtime (ECharts) | Architecture | ✅ Done | **0.15** | `docs/adr/002-chart-runtime.md` |
| 0.18 | ADR-003: Canonical schema format | Architecture | ✅ Done | **0.15** | `docs/adr/003-canonical-schema.md` |
| 0.19 | ADR-004: Package boundaries | Architecture | ✅ Done | **0.15** | `docs/adr/004-package-boundaries.md` |
| 0.20 | Canonical schema v0 draft | Architecture | ✅ Done | 0.18 | `packages/schema/` |
| 0.21 | Monorepo package skeleton | Architecture | ✅ Done | 0.19 | `packages/*/package.json` |
| 0.22 | Playwright test scaffold | Testing | ✅ Done | 0.21 | `e2e/` + `playwright.config.ts` |
| **0.23** | **🛑 HC-1: Human reviews ADRs + schema** | **Human** | ✅ Done | 0.16-0.22 | `docs/status/checkpoints/hc-1-result.md` |
| 0.24 | Phase 0 summary | Orchestrator | ✅ Done | **0.23** | `docs/status/phase-summaries/phase-0.md` |

### Parallelization Notes

- Tasks 0.1 through 0.6 are **fully parallel** (independent research)
- Task 0.7 depends on all research completing
- **HC-0 (task 0.15) is a HUMAN GATE** — agents STOP and prepare a checkpoint brief
- Tasks 0.16-0.19 (ADRs) start only after human approves research
- Tasks 0.20, 0.21 depend on ADRs
- Task 0.22 (Playwright scaffold) can start once package skeleton exists
- **HC-1 (task 0.23) is a HUMAN GATE** — agents STOP before writing Phase 1 code
- Task 0.14 can run in parallel with 0.7

---

## Phase 1 — Schema + Runtime Skeleton ✅ COMPLETE

**Goal**: Deliver working schema package, validation, serialization, runtime shell, widget registry, and basic ECharts integration.

**Assigned agents**: Architecture, Runtime, Charts
**Completion**: All 19 tasks done. HC-2 approved. 145 tests at phase end.

### Task Graph

| ID | Task | Agent | Status | Depends | Output |
|----|------|-------|--------|---------|--------|
| 1.1 | Schema types (TypeScript) | Architecture | ✅ Done | 0.24 | `packages/schema/src/types/` |
| 1.2 | Zod validation schemas | Architecture | ✅ Done | 1.1 | `packages/schema/src/validation/` |
| 1.3 | JSON Schema generation | Architecture | ✅ Done | 1.2 | `packages/schema/src/json-schema/` |
| 1.4 | JSON/YAML serializers | Architecture | ✅ Done | 1.1 | `packages/schema/src/serializers/` |
| 1.5 | Schema tests (unit + round-trip) | Architecture | ✅ Done | 1.2, 1.4 | `packages/schema/test/` (29 tests) |
| 1.6 | Runtime shell + layout engine | Runtime | ✅ Done | 1.1 | `packages/runtime/src/` |
| 1.7 | Widget registry | Runtime | ✅ Done | 1.1 | `packages/runtime/src/widgets/` |
| 1.8 | Filter state engine | Runtime | ✅ Done | 1.1 | `packages/runtime/src/filters/` |
| 1.9 | Data model interfaces | Metadata | ✅ Done | 1.1 | `packages/data-model/src/` |
| 1.10 | ECharts base wrapper | Charts | ✅ Done | 1.7 | `packages/charts-echarts/src/` |
| 1.11 | Line chart + Playwright test | Charts | ✅ Done | 1.10 | `LineChartWidget` + unit tests |
| 1.12 | Bar chart + Playwright test | Charts | ✅ Done | 1.10 | `BarChartWidget` + unit tests |
| 1.13 | Table widget + Playwright test | Charts | ✅ Done | 1.10 | `TableWidget` + unit tests |
| 1.14 | KPI card + Playwright test | Charts | ✅ Done | 1.10 | `KPICardWidget` + unit tests |
| 1.15 | Theme package | Architecture | ✅ Done | 1.1 | `packages/theme/` (12 tests) |
| 1.16 | Dev app scaffold + basic render test | Runtime | ✅ Done | 1.6 | `packages/dev-app/` — full demo render |
| 1.17 | Chrome MCP: first render screenshots | Testing | ✅ Done | 1.16 | `screenshots/phase-1/` |
| **1.18** | **🛑 HC-2: Human opens dev app, reviews first render** | **Human** | ✅ Done | 1.17 | `docs/status/checkpoints/hc-2-result.md` |
| 1.19 | Phase 1 summary | Orchestrator | ✅ Done | **1.18** | `docs/status/phase-summaries/phase-1.md` |

### Parallelization Notes

- Tasks 1.1-1.5 (schema) are sequential
- Tasks 1.6-1.8 (runtime) can start once 1.1 is done
- Task 1.9 (data model interfaces) can start once 1.1 is done
- Tasks 1.10-1.14 (charts) depend on 1.7 (widget registry); each chart ships WITH its Playwright test
- Task 1.15 (theme) can run in parallel with 1.6-1.8
- **HC-2 (task 1.18) is a HUMAN GATE** — human opens dev app in browser and reviews screenshots

---

## Phase 2 — Designer MVP

**Goal**: Deliver Puck-based drag/drop editor with property panels, field bindings, chart picker, import/export, and live preview. Chart property panels must reach Superset parity before advancing.

**Assigned agents**: Designer, Charts, Testing

### Task Graph

| ID | Task | Agent | Status | Depends | Output |
|----|------|-------|--------|---------|--------|
| 2.1 | Puck editor shell setup | Designer | ✅ Done | 1.19 | `packages/designer/` base |
| 2.2 | Custom blocks: charts + drag-drop test | Designer | ✅ Done | 2.1 | 16 chart + 1 table + 1 KPI blocks |
| 2.3 | Custom blocks: content | Designer | ✅ Done | 2.1 | Header, Markdown, Divider, Spacer |
| 2.4 | Custom blocks: controls | Designer | ✅ Done | 2.1 | FilterBar block |
| 2.5 | Property panel editors + tests | Designer | ✅ Done | 2.2-2.4 | Puck fields + 335 tests |
| 2.10 | Puck ↔ canonical adapter | Designer | ✅ Done | 2.1, 1.4 | `puckToCanonical()` + `canonicalToPuck()` |
| — | Sidebar icons (23 SVG) | Designer | ✅ Done | 2.1 | `icons/component-icons.ts` |
| — | Row/Column layout blocks | Designer | ✅ Done | 2.1 | 12-col CSS Grid |
| — | Sample data provider | Designer | ✅ Done | 2.2 | `data/sample-data.ts` |
| — | Live ECharts preview | Designer | ✅ Done | 2.2 | `preview/ChartPreview.tsx` |

### Phase 2.A — Chart Property Parity (Superset Alignment)

**Goal**: Expand every chart type's designer fields AND ECharts widget config to match Apache Superset's Explore panel. This is required before HC-3.

| ID | Task | Agent | Status | Depends | Output |
|----|------|-------|--------|---------|--------|
| 2.A.1 | Shared chart controls: legend, color scheme, tooltip, number format | Charts + Designer | ✅ Done | 2.5 | Shared field defs + widget support |
| 2.A.2 | Line Chart parity: markers, area, stack style, zoom, axis format, axis bounds, log axis, show values | Charts + Designer | ✅ Done | 2.A.1 | Updated LineChart block + widget |
| 2.A.3 | Bar Chart parity: stack style, show values, zoom, axis format/bounds, log axis, minor ticks | Charts + Designer | ✅ Done | 2.A.1 | Updated BarChart block + widget |
| 2.A.4 | Pie Chart parity: donut inner/outer radius, label options, show total, labels outside, label template, rose type | Charts + Designer | ✅ Done | 2.A.1 | Updated PieChart block + widget |
| 2.A.5 | Area Chart parity: opacity, series type (smooth/step), markers, stack style | Charts + Designer | ✅ Done | 2.A.1 | Updated AreaChart block + widget |
| 2.A.6 | Scatter Chart parity: marker size, zoom, axis format/bounds | Charts + Designer | ✅ Done | 2.A.1 | Updated ScatterChart block + widget |
| 2.A.7 | Combo/Mixed Chart parity: dual Y-axis, per-series type (bar/line/scatter), per-series stack/area/markers | Charts + Designer | ✅ Done | 2.A.1 | Updated ComboChart block + widget |
| 2.A.8 | Heatmap parity: linear color scheme, normalize, border, cell values, axis sort | Charts + Designer | ✅ Done | 2.A.1 | Updated HeatmapChart block + widget |
| 2.A.9 | Radar Chart parity: circle/polygon shape, label position, per-indicator min/max | Charts + Designer | ✅ Done | 2.A.1 | Updated RadarChart block + widget |
| 2.A.10 | Funnel Chart parity: sort direction, % calc type, label options | Charts + Designer | ✅ Done | 2.A.1 | Updated FunnelChart block + widget |
| 2.A.11 | Treemap parity: show labels, upper labels, label type | Charts + Designer | ✅ Done | 2.A.1 | Updated TreemapChart block + widget |
| 2.A.12 | Sankey parity: (already minimal — verify color scheme) | Charts + Designer | ✅ Done | 2.A.1 | Verified SankeyChart |
| 2.A.13 | Waterfall parity: increase/decrease/total colors and labels, show values | Charts + Designer | ✅ Done | 2.A.1 | Updated WaterfallChart block + widget |
| 2.A.14 | Box Plot parity: whisker options, zoom, tick layout, number format | Charts + Designer | ✅ Done | 2.A.1 | Updated BoxPlotChart block + widget |
| 2.A.15 | Gauge parity: start/end angle, progress arc, split lines, round cap, intervals/colors, animation | Charts + Designer | ✅ Done | 2.A.1 | Updated GaugeChart block + widget |
| 2.A.16 | Table parity: column config, search, conditional formatting, show totals, cell bars, color +/- | Charts + Designer | ✅ Done | 2.A.1 | Updated Table block + widget |
| 2.A.17 | KPI Card parity: header/subtitle font size, trendline, conditional formatting, number format | Charts + Designer | ✅ Done | 2.A.1 | Updated KPICard block + widget |
| 2.A.18 | Update adapter for new properties (round-trip all new fields) | Designer | ✅ Done | 2.A.2-17 | Updated `puck-canonical.ts` |
| 2.A.19 | Update sample data + ChartPreview for new configs | Designer | ✅ Done | 2.A.2-17 | Updated preview |
| 2.A.20 | Comprehensive parity test suite | Testing | ✅ Done | 2.A.18-19 | 192 tests across 3 files |

### Phase 2 continued (after parity)

| ID | Task | Agent | Status | Depends | Output |
|----|------|-------|--------|---------|--------|
| **2.6** | **🛑 HC-3: Human tries drag-drop + property edit** | **Human** | ✅ Done | 2.A.20 | Approved — "nothing popped out" |
| 2.7 | Data model browser + field binding test | Designer | ✅ Done | **2.6**, 1.9 | `FieldBindingPicker` + 10 tests |
| 2.8 | Chart type picker | Designer | ✅ Done | **2.6** | `ChartTypePicker` + 7 tests |
| 2.9 | Filter builder UI | Designer | ✅ Done | 2.4, 1.8 | `FilterBuilderPanel` + 12 tests |
| 2.11 | Import/export JSON/YAML + Playwright test | Designer | ✅ Done | 2.10 | `ImportExportPanel` + 7 tests |
| 2.12 | Code view panel + test | Designer | ✅ Done | 2.10 | `CodeViewPanel` + 5 tests |
| 2.13 | Live preview pane | Designer | ✅ Done | 2.10, 1.6 | `LivePreviewPane` + 4 tests |
| 2.14 | Undo/redo + Playwright test | Designer | ✅ Done | 2.1 | `useUndoRedo` + `UndoRedoToolbar` + 10 tests |
| 2.15 | Responsive preview modes | Designer | ✅ Done | 2.13 | Viewport switcher in LivePreviewPane |
| 2.16 | Storybook stories | Designer | ✅ Done | 2.2-2.15 | 6 story files + config |
| 2.17 | Workflow test: designer-to-renderer | Testing | ✅ Done | 2.16 | 7 Playwright tests |
| 2.18 | Workflow test: import-export-cycle | Testing | ✅ Done | 2.11 | 3 Playwright tests |
| 2.19 | Chrome MCP: Test Plan A execution | Testing | ✅ Done | 2.16 | 7 Playwright tests + 8 screenshots |
| **2.20** | **🛑 HC-4: Human creates dashboard, tests round-trip** | **Human** | ✅ Done | 2.17-2.19 | `docs/status/checkpoints/hc-4-result.md` |
| 2.21 | Phase 2 summary | Orchestrator | ✅ Done | **2.20** | `docs/status/phase-summaries/phase-2.md` |

### Parallelization Notes

- Tasks 2.2-2.4 (blocks) are parallel once 2.1 is done
- **HC-3 (task 2.6) is a HUMAN GATE** — human tries the editor before more features are built on it
- Tasks 2.7-2.15 proceed after HC-3 approval
- Tasks 2.17, 2.18 (workflow tests) can be written in parallel
- **HC-4 (task 2.20) is a HUMAN GATE** — human personally creates and round-trips a dashboard

---

## Phase 3 — Metadata Adapters + Schema Import Tool

**Goal**: Deliver working adapters for Prisma, SQL, JSON, and a CLI tool that auto-generates adapters from database schemas. Great out-of-the-box experience: point at a DB and get a working dashboard.

**Assigned agents**: Metadata, Testing

### Task Graph

| ID | Task | Agent | Status | Depends | Output |
|----|------|-------|--------|---------|--------|
| 3.1 | Adapter interface finalization + heuristics | Metadata | ✅ Done | 1.9 | `packages/data-model/src/heuristics.ts` |
| 3.2 | Query client abstraction | Metadata | ✅ Done | 3.1 | `packages/query-client/` (18 tests) |
| 3.3 | Prisma adapter + fixture tests | Metadata | ✅ Done | 3.1 | `packages/adapter-prisma/` (18 tests) |
| 3.4 | SQL metadata adapter + fixture tests | Metadata | ✅ Done | 3.1 | `packages/adapter-sql/` (25 tests) |
| 3.5 | Generic JSON adapter + fixture tests | Metadata | ✅ Done | 3.1 | `packages/adapter-json/` (20 tests) |
| 3.6 | dbt adapter + fixture tests | Metadata | ✅ Done | 3.1 | `packages/adapter-dbt/` (19 tests) |
| 3.7 | **Schema import CLI tool** | Metadata | ✅ Done | 3.3-3.6 | `packages/cli/` (23 tests) |
| 3.7.1 | — Introspect Prisma schema → adapter config | Metadata | ✅ Done | 3.3, 3.7 | Prisma introspection |
| 3.7.2 | — Introspect SQL DB (pg/mysql/sqlite) → adapter config | Metadata | ✅ Done | 3.4, 3.7 | SQL introspection |
| 3.7.3 | — Introspect dbt manifest → adapter config | Metadata | ✅ Done | 3.6, 3.7 | dbt introspection |
| 3.7.4 | — Auto-generate field types, relationships, measures | Metadata | ✅ Done | 3.7.1-3 | Smart defaults via heuristics |
| 3.7.5 | — Produce starter dashboard from imported schema | Metadata | ✅ Done | 3.7.4, 2.21 | Auto-dashboard generator |
| 3.8 | Workflow test: metadata-to-dashboard | Testing | ✅ Done | 3.3, 2.21 | `e2e/workflows/` + `packages/cli/test/workflow-*` (14 tests) |
| **3.9** | **🛑 HC-5: Human reviews adapter normalization + import tool** | **Human** | ✅ Done | 3.7, 3.8 | `docs/status/checkpoints/hc-5-result.md` |
| 3.10 | Phase 3 summary | Orchestrator | ✅ Done | **3.9** | `docs/status/phase-summaries/phase-3.md` |

### Parallelization Notes

- Tasks 3.3-3.6 are **fully parallel** once 3.1 is done; each adapter ships WITH its fixture tests
- Task 3.7 (schema import tool) depends on at least one adapter being done; sub-tasks are parallel per adapter type
- Task 3.7.5 (auto-dashboard) is the capstone — produces a starter dashboard from imported metadata
- **HC-5 (task 3.9) is a HUMAN GATE** — human points the tool at a real DB schema and reviews results

---

## Phase 4 — Interaction Model

**Goal**: Deliver dashboard-level filters, cross-filtering, drilldowns, routing hooks, state persistence.

**Assigned agents**: Runtime, Designer, Testing

### Task Graph

| ID | Task | Agent | Status | Depends | Output |
|----|------|-------|--------|---------|--------|
| 4.1 | Dashboard-level filters + Playwright test | Runtime | ✅ Done | 2.21, 3.10 | FilterBar + 11 tests |
| 4.2 | Cross-filtering + Playwright test | Runtime | ✅ Done | 4.1 | InteractionEngine + 8 tests |
| 4.3 | Click-to-filter | Runtime | ✅ Done | 4.2 | useInteractionHandler + 6 tests |
| **4.4** | **🛑 HC-6: Human clicks a cross-filter in browser** | **Human** | ✅ Done | 4.3 | `docs/status/checkpoints/hc-6-result.md` |
| 4.5 | Drill-to-detail + Playwright test | Runtime | ✅ Done | **4.4** | DrillManager + DrillBreadcrumbBar + 14 tests |
| 4.6 | Navigate actions | Runtime | ✅ Done | **4.4** | navigate w/ filter state + 4 tests |
| 4.7 | State persistence + Playwright test | Runtime | ✅ Done | 4.1 | StatePersistence + useStatePersistence + 18 tests |
| 4.8 | Interaction editor in designer | Designer | ✅ Done | 4.1-4.6 | InteractionEditorPanel + 10 tests |
| 4.9 | Workflow test: filter-cascade | Testing | ✅ Done | 4.7 | `e2e/workflows/filter-cascade.spec.ts` + `e2e/interactions/` |
| 4.10 | Chrome MCP: Test Plan B execution | Testing | ✅ Done | 4.7 | 33 chromium e2e tests passing + visual baseline |
| **4.11** | **🛑 HC-7: Human does full Test Plans A+B manually** | **Human** | ✅ Done | 4.9, 4.10 | `docs/status/checkpoints/hc-7-result.md` |
| 4.12 | Phase 4 summary | Orchestrator | ✅ Done | **4.11** | `docs/status/phase-summaries/phase-4.md` |

### Parallelization Notes

- **HC-6 (task 4.4) is a HUMAN GATE** — must verify cross-filtering feels right before building drilldowns
- Tasks 4.5-4.7 proceed after HC-6 approval
- **HC-7 (task 4.11) is a HUMAN GATE** — human manually walks through BOTH Test Plans A and B

---

## Phase 5 — Developer Experience

**Goal**: Great out-of-the-box experience. Developer documentation, sample app, getting-started guide, and polished onboarding flow.

**Assigned agents**: All

### Task Graph

| ID | Task | Agent | Status | Depends | Output |
|----|------|-------|--------|---------|--------|
| 5.1 | Sample app: Next.js e-commerce dashboard | Designer + Metadata | ✅ Done | 3.10, 4.12 | `examples/nextjs-ecommerce/` |
| 5.2 | Sample app: Vite + SQLite analytics | Designer + Metadata | ✅ Done | 3.10, 4.12 | `examples/vite-sqlite/` |
| 5.3 | Getting-started guide (README + docs) | All | ✅ Done | 5.1, 5.2 | `docs/getting-started.md` |
| 5.4 | API reference documentation | All | ✅ Done | 4.12 | `docs/api/` |
| 5.5 | Schema import tool tutorial | Metadata | ✅ Done | 3.10 | `docs/guides/schema-import.md` |
| 5.6 | Chart configuration cookbook | Charts | ✅ Done | 2.A.20 | `docs/guides/chart-cookbook.md` |
| 5.7 | Custom adapter authoring guide | Metadata | ✅ Done | 3.10 | `docs/guides/custom-adapter.md` |
| 5.8 | Storybook stories (designer panels) | Designer | ✅ Done | 2.2-2.15 | 7 story files (ChartTypePicker, ImportExport, FieldBinding, CodeView, UndoRedo, FilterBuilder, InteractionEditor) |
| 5.8b | Storybook stories for chart widgets | Charts | ⏭ Deferred | 2.A.20 | No `.storybook/` runner configured; story files exist but no chart-type stories |
| 5.9 | Interactive playground (hosted demo) | Designer | ⏭ Deferred | 5.1 | Online demo |
| **5.10** | **🛑 HC-8: Human follows getting-started guide from scratch** | **Human** | ✅ Pass with notes (delegated) | 5.3 | `docs/status/checkpoints/hc-8-result.md` |
| 5.11 | Phase 5 summary | Orchestrator | ✅ Done | **5.10** | `docs/status/phase-summaries/phase-5.md` |

### Parallelization Notes

- Tasks 5.1 and 5.2 are parallel (independent sample apps)
- Task 5.3 depends on both sample apps existing
- Tasks 5.4-5.7 (guides) can run in parallel
- **HC-8 (task 5.10) is a HUMAN GATE** — human follows the guide from `npm init` to running dashboard

---

## Phase 6 — Hardening

**Goal**: Migration engine, comprehensive tests, performance, security audit, release readiness.

**Assigned agents**: All

### Task Graph

| ID | Task | Agent | Status | Depends | Output |
|----|------|-------|--------|---------|--------|
| 6.1 | Schema migration engine | Architecture | ✅ Done | 5.11 | migration system |
| 6.2 | Chrome MCP: Test Plan C execution | Testing | ✅ Done | 5.11 | `screenshots/phase-6/plan-c/` 7 screenshots |
| 6.3 | Chrome MCP: Test Plan D execution | Testing | ✅ Done | 5.11 | `screenshots/phase-6/plan-d/` host integration verified |
| 6.4 | Performance profiling | Runtime | ✅ Done | 5.11 | bundle analysis complete |
| 6.5 | Workflow test: host-integration | Testing | ✅ Done | 5.1, 5.2 | `e2e/workflows/host-integration.spec.ts` |
| 6.6 | Playwright regression suite (all) | Testing | ✅ Done | 6.5 | 1034 unit tests + e2e suite passing |
| 6.7 | Security audit (Snyk) | Testing | ⏭ Skipped | 6.6 | deferred — Snyk MCP trust issue |
| 6.A.1 | ADR-007: Documentation tooling & screenshot QA | Architecture | ✅ Done | 6.6 | `docs/adr/007-documentation-tooling-screenshot-qa.md` |
| 6.A.2 | Document-a-Feature skill | Orchestrator | ✅ Done | 6.A.1 | `.github/skills/document-feature/SKILL.md` |
| 6.A.3 | Astro Starlight docs site scaffold | Designer | ✅ Done | 6.A.1 | `packages/docs/` — Starlight + custom MDX components |
| 6.A.4 | 38 MDX content pages (8 categories) | All | ✅ Done | 6.A.3 | Getting Started, Chart Types, Widgets, Layout, Filters, Interactions, Pages, Import/Export |
| 6.A.5 | Playwright screenshot capture harness | Testing | ✅ Done | 6.A.3 | 6 capture specs, 63 tests, 60 PNG screenshots |
| 6.A.6 | Wire screenshots into MDX pages | All | ✅ Done | 6.A.5 | ScreenshotComparison components with real images |
| 6.A.7 | Docs build verification | Testing | ✅ Done | 6.A.6 | 39 pages built, Pagefind indexed 38, clean build |
| **6.8** | **🛑 HC-9: Human release readiness review** | **Human** | 🔶 Ready for review | 6.A.7 | `docs/status/checkpoints/hc-9-result.md` |
| 6.9 | Final summary | Orchestrator | Not started | **6.8** | release readiness |

---

## Acceptance Criteria (Project-Level)

- [ ] Host React app can mount `<SupersubsetDesigner />` and save a dashboard definition
- [ ] Definition serializes to JSON and YAML without semantic differences
- [ ] Host React app can mount `<SupersubsetRenderer />` and render the dashboard
- [ ] Renderer executes queries through a pluggable adapter
- [ ] Developer can point at Prisma schema and expose fields in designer
- [ ] `npx supersubset import-schema` produces a working adapter from a DB schema
- [ ] Chart property panels have Superset Explore–level configurability
- [ ] System works without Superset, Rill, or Lightdash servers
- [ ] Editor and runtime are independently shippable packages
- [ ] Sample apps demonstrate end-to-end flow (Next.js + Vite)
- [ ] Getting-started guide works from `npm init` to live dashboard
- [ ] Navigation APIs can address page targets now and anticipate future dashboard targets without another breaking contract change
- [ ] Alerts widget can render multiple data-driven tiles with semantic theme-aware colors
- [ ] All browser test plans pass
- [ ] Snyk security scan clean

---

## Follow-Up Backlog

Items to think through after core workflow is up and running.

### Promoted Must-Haves

- Alerts widget / alert strip with data-driven tiles and semantic theme-aware colors is now must-have scope. See `docs/adr/006-multi-dashboard-navigation-alerts-and-filter-editor.md`.
- Navigation APIs now reserve space for future inter-dashboard targets, but multi-dashboard runtime orchestration is deferred follow-up scope. See `docs/adr/006-multi-dashboard-navigation-alerts-and-filter-editor.md`.
- Extract reusable filter-rule editing primitives from `FilterBuilderPanel` after a scheduled feature needs them. See `docs/adr/006-multi-dashboard-navigation-alerts-and-filter-editor.md`.
- If these features materially change onboarding or public APIs before release, rerun HC-8 against the updated getting-started guide before treating Phase 5 docs as stable.

### Theming Strategy
- Current: Puck built-in field UI + plain React/CSS for feature panels
- No component library dependency (MUI rejected for bundle size / coupling)
- Need to decide: how does the host app's theme propagate into designer + runtime?
- Consider: CSS custom properties, theme token contract, ECharts theme bridge
- Extend theme tokens beyond primary/secondary to include semantic status colors (`success`, `warning`, `danger`, `info`, `border`) for alerts and future status UI
- Related: host apps may use MUI, Chakra, Tailwind, or custom — must not conflict

### Inter-Dashboard Navigation
- Link widgets, drill-to-dashboard, breadcrumb state, URL params
- Superset approach (deferred in research): tabs, URL routing, permalinks
- Constraint: host-owned navigation, no iframe
- Current accepted direction: keep `DashboardDefinition` atomic, broaden the `navigate` API to structured page-or-dashboard targets now, and defer runtime bundle/host orchestration until a real routing slice is scheduled

### Alerts Widget
- Current implementation direction: add a first-class alerts widget with data-driven row rendering and semantic theme colors rather than forcing an ECharts implementation
- Follow-up: decide whether future rule-driven alerts belong inside the library or stay host-owned

### Reusable Filter Rule Editor
- Current `FilterBuilderPanel` is reusable at the panel level but still dashboard-filter specific
- Deferred direction: extract reusable condition/rule editors once dashboard-target mapping or rule-driven alerts are scheduled

### Calculated Fields
- Derived measures/dimensions defined by expressions (e.g. `revenue - cost` → profit)
- Questions: expression language? validation? dependency graph? live preview?
- Related: Superset has "calculated columns" and "custom SQL" in Explore

### Alert Evaluation & Delivery
- After the in-dashboard Alerts widget lands, decide which alert classes are evaluated inside the library versus by the host application
- Separate visual status tiles from out-of-band notification concerns such as email, Slack, or incident delivery

### a11y
