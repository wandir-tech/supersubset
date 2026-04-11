# Perspective Study — Research Report

> **Task**: 0.5  
> **Agent**: Research  
> **Date**: 2026-04-08  
> **Repository**: `perspective-dev/perspective` @ `master` (formerly `finos/perspective`)

## Executive Summary

FINOS Perspective is a high-performance interactive analytics and data visualization component built on C++/Rust compiled to WebAssembly. It provides a framework-agnostic Custom Element (`<perspective-viewer>`) with built-in datagrid, 10+ chart types, pivot tables, and a pluggable data model API. Version 4.4.0 (April 2026) represents significant maturity with 10.4k GitHub stars.

**For Supersubset**: Perspective is an excellent **table/pivot widget candidate** but NOT a replacement for the overall architecture. Its WASM dependency, custom element approach, and monolithic viewer design make it unsuitable as the primary chart runtime. However, it could serve as a specialized high-performance table/pivot widget within Supersubset's widget registry, particularly for large dataset exploration.

**Recommendation**: Consider Perspective as an optional widget for advanced table/pivot/explorer use cases. Do NOT use it as the primary rendering engine — that role belongs to ECharts.

## Feature Assessment

### 1. Embeddable Custom Element / React Runtime

- **How it works**: Perspective provides `<perspective-viewer>` as a Web Component (Custom Element). React integration via `@perspective-dev/viewer` package.
- **Strengths**:
  - Framework-agnostic — works with React, Vue, vanilla JS
  - Self-contained rendering — no external chart library needed
  - React wrapper available for controlled component usage
  - DuckDB and ClickHouse virtual server support for external data sources
- **Concerns**:
  - Custom Elements have React interop friction (event handling, props vs attributes)
  - Viewer is opinionated — it's a complete interactive analytics UI, not just a chart
  - Difficult to customize the viewer's built-in UI (toolbar, column selectors)
- **Assessment for Supersubset**: **Usable as a widget** — Wrap `<perspective-viewer>` as a Supersubset widget type, but don't depend on it for core rendering.

### 2. Save/Restore Config Model

- **How it works**: Perspective viewer configuration can be saved and restored as JSON:
  ```json
  {
    "plugin": "Datagrid",
    "columns": ["Sales", "Profit"],
    "group_by": ["Region"],
    "split_by": ["Category"],
    "sort": [["Sales", "desc"]],
    "filter": [["Profit", ">", 0]],
    "expressions": ["\"Sales\" * 2"],
    "aggregates": { "Sales": "sum" },
    "theme": "Pro Light"
  }
  ```
- **Strengths**:
  - Clean JSON config — easily serializable
  - Covers: columns, group_by, split_by, sort, filter, expressions, aggregates
  - Expressions support computed columns
  - Theme reference
- **Assessment for Supersubset**: **Architectural inspiration** — The config model maps well to Supersubset's widget config concept. If we include a Perspective widget, we'd embed this config within the canonical widget definition.

### 3. Pivot Table Implementation

- **How it works**: Built-in pivot functionality with `group_by` (row pivots) and `split_by` (column pivots). Supports multiple aggregation types.
- **Strengths**:
  - True pivot computation, not just visual grouping
  - Handles large datasets via WASM (millions of rows)
  - Interactive — users can expand/collapse groups, sort by any column
  - Computed expressions available for derived columns
- **Assessment for Supersubset**: **Best-in-class for pivots** — If Supersubset needs a pivot table, Perspective is the strongest option. Building an equivalent from scratch would be a massive effort. ECharts does not have competitive pivot table support.

### 4. Performance with Large Datasets

- **How it works**: Core data engine is C++ compiled to WASM. Data is stored in columnar Apache Arrow format. Query engine runs in the browser or on a server.
- **Performance characteristics**:
  - Handles millions of rows in-browser via WASM
  - Streaming data updates supported
  - Virtual server mode offloads computation to DuckDB/ClickHouse
  - Arrow-based ingestion for efficient data transfer
- **Assessment for Supersubset**: **Excellent for data-heavy scenarios** — For dashboards with large datasets, Perspective's WASM engine provides performance that JavaScript-based solutions can't match. However, this only matters for the table/pivot/explorer use case.

### 5. Integration with React Host Apps

- **How it works**: React wrapper package provides controlled component:
  ```jsx
  import "@perspective-dev/viewer";
  // Use as a custom element in JSX
  <perspective-viewer
    ref={viewerRef}
    columns={columns}
    group_by={groupBy}
  />
  ```
- **Concerns**:
  - WASM loading: Initial ~2-4MB WASM download required
  - Async initialization: Viewer needs to load WASM before rendering
  - Custom Element lifecycle differs from React lifecycle
  - Shadow DOM isolation can conflict with host app styling
- **Assessment for Supersubset**: **Moderate complexity** — Integration is doable but requires careful handling of WASM loading, async initialization, and styling isolation.

### 6. Bundle Size and WASM Requirements

- **Bundle analysis**:
  - `@perspective-dev/client` (WASM engine): ~2-4MB compressed
  - `@perspective-dev/viewer` (UI component): ~500KB additional
  - Total: ~3-5MB for the Perspective widget
- **Concerns**:
  - This is **massive** compared to typical React components
  - For an embeddable library, adding 3-5MB for a single widget type is significant
  - WASM loading is asynchronous — adds to initial load time
  - Must be loaded lazily, not bundled with the main package
- **Assessment for Supersubset**: **Must be optional** — Perspective should be an opt-in widget, lazy-loaded only when a dashboard uses table/pivot/explorer widgets. It should NOT be included in the core bundle.

## Best Use for Supersubset

| Use Case | Recommendation | Rationale |
|----------|---------------|-----------|
| **Table widget** | Optional, prefer lightweight | ECharts table or custom React table are lighter. Use Perspective only for advanced table needs. |
| **Pivot table** | Strong candidate | No good alternatives in the React ecosystem for high-performance pivots. |
| **Full explorer** | Not recommended | Too opinionated — the viewer's built-in UI conflicts with Supersubset's designer-controlled experience. |
| **Widget runtime** | Not recommended | Would add WASM dependency for all users. ECharts is a better general-purpose runtime. |

**Recommended integration**:
- `packages/widget-perspective/` — Optional package providing `PerspectiveTable` and `PerspectivePivot` widgets
- Lazy-loaded, tree-shakeable
- Not a dependency of core `packages/runtime/`
- Widget config maps Supersubset schema → Perspective config

## Perspective vs Native ECharts Tables

| Criterion | Perspective | ECharts Table Plugin | Custom React Table |
|-----------|-------------|---------------------|-------------------|
| **Bundle size** | 3-5MB (WASM) | ~100KB (part of ECharts) | ~50-200KB |
| **Max rows (browser)** | Millions | ~10K comfortable | ~10K comfortable |
| **Pivot support** | Full | None | With library (e.g., react-pivottable) |
| **Streaming data** | Yes | No | Possible |
| **Customization** | Limited (Custom Element) | High (ECharts config) | Full (React) |
| **Integration effort** | Medium (WASM + CE) | Low (same as other charts) | Low (React) |
| **Sorting/filtering** | Built-in interactive | Static | Custom implementation |

**Recommendation**: Use ECharts or a custom React table for the MVP table widget. Add Perspective as an optional advanced widget in Phase 5 (Hardening) for users who need large-dataset exploration or pivot tables.

## License Assessment

- **License**: Apache License 2.0
- **Organization**: OpenJS Foundation (formerly FINOS)
- **Attribution**: NOTICE file required for derived works
- **Compatibility**: Fully compatible with Supersubset
- **Note**: Perspective is a member of the OpenJS Foundation. Copyright is held by OpenJS Foundation and Perspective contributors.

## Risks and Recommendations

### Risks
1. **WASM dependency for an embeddable library** — Hosts may not want 3-5MB added to their bundle
2. **Custom Element interop** — Shadow DOM and React interop have known friction points
3. **Styling isolation** — Perspective's built-in theme system may conflict with host app themes

### Recommendations
1. **Phase 0 decision**: Classify Perspective as "optional future widget" — do not include in core architecture
2. **Phase 5 task**: Add `packages/widget-perspective/` with lazy loading
3. **MVP table**: Use a lightweight React table component or ECharts plugin-chart-table approach
4. **Future pivot**: Perspective is the best option when pivot support is needed
