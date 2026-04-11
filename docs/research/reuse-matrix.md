# Supersubset — Reuse Matrix

> **Status**: Completed — Phase 0, Task 0.7  
> **Date**: 2026-04-08  
> **Based on**: Research tasks 0.1–0.6

## Summary

| Source Project | License | Overall Classification | Key Reuse Areas |
|---------------|---------|----------------------|-----------------|
| Apache Superset | Apache 2.0 | **Architectural inspiration** | Chart plugin pattern, filter state model, explore UX reference |
| Puck | MIT | **Code donor** | Editor shell, drag-and-drop, property editing, host integration |
| Apache ECharts | Apache 2.0 | **Code donor** | Chart rendering (primary runtime) |
| Rill | Apache 2.0 | **Architectural inspiration** | Dimension/measure type system, schema patterns, Canvas layout model |
| Dashbuilder | Apache 2.0 | **Architectural inspiration** | Editor/runtime split, static deployment, dashboard-as-file concept |
| Perspective | Apache 2.0 | **Discarded** | Dropped — WASM bundle (3-5MB) incompatible with library-first approach (HC-0 decision) |
| geOrchestra superset-core | Apache 2.0 | **Discarded** | Fork approach validates our no-iframe, no-fork stance |
| open-source-dashboard | N/A | **Discarded** | Repository deleted (404) |
| GrapesJS | BSD 3-clause | **Discarded** | HTML-centric model, wrong paradigm for data dashboards |
| Craft.js | MIT | **Discarded (fallback)** | Viable Puck alternative if blockers emerge |
| Cube.js Frontend | MIT | **Architectural inspiration** | Query abstraction pattern |

## Detailed Module Analysis

### Apache Superset — Frontend

| Module | Path | Classification | Coupling | Notes |
|--------|------|---------------|----------|-------|
| Chart plugin system | `superset-frontend/plugins/` | Architectural inspiration | Partially coupled | `EchartsChartPlugin` pattern with `buildQuery`/`transformProps`/`controlPanel`. Registration API is clean; query format is Superset-specific. Study the pipeline, reimplement without backend coupling. |
| Explore controls | `superset-frontend/src/explore/` | Architectural inspiration | Heavily coupled | Rich control library (column selectors, aggregation pickers). Every action calls REST endpoints. Study UX patterns, build our own with Puck custom fields. |
| Dashboard layout | `superset-frontend/src/dashboard/` | Discarded | Heavily coupled | 729-line `DashboardBuilder.tsx` with Redux, `HYDRATE_DASHBOARD`, custom grid system. Too entangled with backend state hydration and Superset-specific component tree. |
| Filter state (dataMask) | `superset-frontend/src/dataMask/` | Architectural inspiration | Heavily coupled | `DataMask = { extraFormData, filterState, ownState }` per-filter state model is a clean concept. But reducer handles native filters, chart customizations, explore hydration simultaneously. Extract concept, reimpl cleanly. |
| UI components | `superset-frontend/src/components/` | Discarded | Partially coupled | Standard UI components with Superset's emotion theme system. No advantage over any React component library. |

### Puck

| Feature | Classification | Suitability | Notes |
|---------|---------------|-------------|-------|
| Block registration | **Code donor** | Excellent | `config.components = { MyChart: { fields, render, defaultProps, resolveData } }` — maps directly to widget palette. |
| Drag-and-drop | **Code donor** | Excellent | @dnd-kit based, with `DraggableComponent` and zone management. Production-ready. |
| Property editing | **Code donor** | Excellent | Built-in field types (text, number, select, radio, custom) plus `resolveFields` for dynamic fields. |
| Responsive layout | **Limitation** | Manageable | No built-in grid system. Requires custom Row/Column/Grid blocks with CSS Grid and slot fields. Standard Puck usage pattern. |
| Custom field editors | **Code donor** | Excellent | Custom field type renders any React component. Use for axis pickers, color scheme selectors, data binding UI. |
| Data resolution | **Code donor** | Excellent | `resolveData` async function called on prop changes with `changed`, `lastData`, `trigger` params. Perfect for editor chart preview data. |
| Host integration | **Code donor** | Excellent | Props-controlled: `data`, `onPublish`, `plugins`, `overrides`, `metadata`. Host owns data and persistence. |

### Rill

| Feature | Classification | Suitability | Notes |
|---------|---------------|-------------|-------|
| MetricsView schema | Architectural inspiration | High | Dimension/measure definition with types (`categorical`/`time`/`geospatial`), d3 format strings, window functions, required dimensions. Adopt type system for Supersubset metadata model. |
| Explore/Canvas model | Architectural inspiration | Medium | Separation of data model (MetricsView) from presentation (Explore/Canvas). Canvas row/item layout is clean but simple. Supersubset needs more flexible layout. |
| FieldSelector | Architectural inspiration | Medium | Dynamic field selection via `{ all, fields, regex, invert }`. Useful for computed field sets. |
| ComponentVariable | Architectural inspiration | Medium | Input/output variables for widget params. Enables widget-to-widget data flow. |
| Security rules | Architectural inspiration | Medium | Row-level, field-level, resource-level security with condition expressions. Good pattern for host-delegated permissions. |
| Svelte frontend | Discarded | N/A | Svelte-based, no React code reusable. |

### Dashbuilder

| Feature | Classification | Suitability | Notes |
|---------|---------------|-------------|-------|
| Dashboard-as-file | Architectural inspiration | High | YAML/JSON definition validates Supersubset's approach. |
| Editor/runtime split | Architectural inspiration | High | Validates architecture invariant #5 (renderer independent from editor). |
| Pluggable renderers | Architectural inspiration | Medium | Registry-based renderer dispatch maps to Supersubset's widget registry. |
| Static client deployment | Architectural inspiration | Medium | Validates host-owned persistence and no-backend approach. |
| GWT/Java codebase | Discarded | N/A | Archived Java project. Zero code reuse possible. |

### Perspective

| Feature | Classification | Suitability | Notes |
|---------|---------------|-------------|-------|
| Table widget | Optional code donor | Conditional | Lightweight React table preferred for MVP. Perspective only for advanced needs. WASM adds 3-5MB. |
| Pivot widget | Optional code donor | High | Best-in-class pivot table. No good React alternative. Include as optional lazy-loaded widget in Phase 5. |
| Explorer widget | Discarded | Low | Too opinionated — full interactive analytics UI conflicts with designer-controlled experience. |
| Config save/restore | Architectural inspiration | Medium | Clean JSON config model maps to widget config concept in canonical schema. |
| WASM engine | Conditional | N/A | Must be lazy-loaded, optional dependency. Never in core bundle. |

### Landscape

| Project | Classification | Notes |
|---------|---------------|-------|
| geOrchestra superset-core | Discarded | Fork maintenance trap, validates no-fork approach |
| open-source-dashboard | Discarded | Repository deleted (404) |
| GrapesJS | Discarded | HTML/CSS output model, wrong paradigm for data dashboards |
| Craft.js | Discarded (fallback) | Viable Puck alternative if Puck proves insufficient |
| Metabase Embedding | Discarded | Product embedding, requires backend |
| Cube.js Frontend | Architectural inspiration | Clean query abstraction (`{ measures, dimensions, timeDimensions, filters }`) |
| BuilderIO | Discarded | Commercial SaaS, not a library |
| react-page | Discarded | Less maintained than Puck |

## License Compliance Summary

| Source | License | Compatible | Attribution Required | Notes |
|--------|---------|-----------|---------------------|-------|
| Apache Superset | Apache 2.0 | Yes | NOTICE file | No code donated, only patterns studied |
| Puck | MIT | Yes | Copyright notice | Primary code donor — include MIT notice |
| Apache ECharts | Apache 2.0 | Yes | NOTICE file | Primary chart runtime — include NOTICE |
| Rill | Apache 2.0 | Yes | NOTICE file | No code donated, only patterns studied |
| Dashbuilder | Apache 2.0 | Yes | NOTICE file | No code donated, archived project |
| Perspective | Apache 2.0 | Yes | NOTICE file | Optional dependency — include NOTICE if used |
| Craft.js | MIT | Yes | Copyright notice | Not used unless Puck is abandoned |
| GrapesJS | BSD 3-clause | Yes (BSD compatible) | License notice | Not used |
| Cube.js Frontend | MIT | Yes | Copyright notice | Not used, patterns only |

## Key Decision: Recommended Stack

Based on all research findings, the recommended technology stack is:

| Layer | Choice | Confidence | Alternative |
|-------|--------|------------|-------------|
| **Editor shell** | Puck v0.21+ | High | Craft.js (if Puck hits blockers) |
| **Chart runtime** | Apache ECharts | High | None needed |
| **Table widget (MVP)** | Custom React table or ECharts table | Medium | Perspective (Phase 5) |
| **Pivot widget** | Perspective (optional, Phase 5) | Medium | react-pivottable |
| **Schema validation** | Zod | High | None needed |
| **Schema format** | JSON + YAML | High | None needed |
| **Canonical types** | TypeScript | High | None needed |
| **State management** | Zustand (Puck) + React context | High | Redux (if Puck drops Zustand) |
| **Test framework** | Vitest + Playwright | High | None needed |
