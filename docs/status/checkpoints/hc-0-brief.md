# Checkpoint HC-0 Brief

> **Gate**: Research Approval  
> **Date**: 2026-04-08  
> **Tasks completed**: 0.1–0.7, 0.14

## What Was Built Since Last Checkpoint

This is the first checkpoint. Phase 0, Wave 1 has completed all research tasks:

| Task | Output | Status |
|------|--------|--------|
| 0.1 Superset archaeology | [docs/research/superset-archaeology.md](../research/superset-archaeology.md) | ✅ Complete |
| 0.2 Puck study | [docs/research/puck-study.md](../research/puck-study.md) | ✅ Complete |
| 0.3 Rill schema study | [docs/research/rill-study.md](../research/rill-study.md) | ✅ Complete |
| 0.4 Dashbuilder study | [docs/research/dashbuilder-study.md](../research/dashbuilder-study.md) | ✅ Complete |
| 0.5 Perspective study | [docs/research/perspective-study.md](../research/perspective-study.md) | ✅ Complete |
| 0.6 Landscape scan | [docs/research/landscape-scan.md](../research/landscape-scan.md) | ✅ Complete |
| 0.7 Reuse matrix | [docs/research/reuse-matrix.md](../research/reuse-matrix.md) | ✅ Complete |
| 0.14 Browser test strategy | [docs/testing/playwright-scaffold-plan.md](../testing/playwright-scaffold-plan.md) | ✅ Complete |

## Summary of Findings

### Apache Superset (0.1)
Superset's frontend is a ~200k LoC React app deeply coupled to its Flask backend. **No module can be extracted as a code donor.** The chart plugin system (`EchartsChartPlugin` with `buildQuery`/`transformProps`/`controlPanel`) is the cleanest pattern to study — a pipeline from canonical config to ECharts options. The `dataMask` filter state model (`{ extraFormData, filterState, ownState }` per filter) is a useful conceptual pattern. The dashboard layout engine, explore view, and UI components are all too entangled with backend hydration and Redux state to reuse.

### Puck (0.2)
Puck is a **strong fit** for the editor shell. Key strengths: clean component registration API, `resolveData` for async data fetching during editing, slot fields for nested components, JSON-serializable state, MIT license, active development (v0.21.2). **Main concern**: no built-in responsive grid system — requires custom layout blocks (Row/Column/Grid using CSS Grid + slots). This is manageable and standard Puck usage. The `overrides` API allows extensive customization of the editor chrome. Host integration is excellent (controlled React component pattern).

### Rill (0.3)
Rill's protobuf-defined resource model provides the best schema patterns found. Key takeaways: (1) MetricsView separates data model from presentation — adopt this separation; (2) Dimension/Measure type system with `categorical`/`time`/`geospatial` dimensions and `simple`/`derived`/`time_comparison` measures — directly applicable to our metadata model; (3) `FieldSelector` with `{ all, fields, regex, invert }` — flexible dynamic field selection; (4) Canvas model with `CanvasRow` → `CanvasItem` — simple human-readable layout. Svelte frontend is not reusable.

### Dashbuilder (0.4)
Archived Java/GWT project. Zero code reuse possible. However, it independently validates several Supersubset design choices: dashboard-as-files, editor/runtime split, pluggable renderers, static client deployment, host-owned data access.

### Perspective (0.5)
High-performance WASM-based analytics component. **Best-in-class for pivot tables** (handles millions of rows in-browser). But WASM adds 3-5MB to bundle — must be an optional, lazy-loaded widget, never in core. Recommended as Phase 5 addition for advanced table/pivot needs. MVP table should use a lightweight React table or ECharts table plugin.

### Landscape (0.6)
**No existing project fills Supersubset's niche.** Key findings:
- geOrchestra/superset-core fork shows the maintenance trap of forking Superset
- GrapesJS is HTML/CSS-centric (wrong paradigm for data dashboards)
- Craft.js is a viable Puck fallback but requires more boilerplate
- Metabase/Cube.js are product-level solutions, not libraries
- This validates Supersubset's unique library-first positioning

## The Completed Reuse Matrix

See [docs/research/reuse-matrix.md](../research/reuse-matrix.md) for the full classified matrix. Summary:

| Source | Classification | Key Decision |
|--------|---------------|-------------|
| Superset | Architectural inspiration | Study patterns, reimplement without backend coupling |
| **Puck** | **Code donor** | Use as editor shell |
| **ECharts** | **Code donor** | Use as chart runtime |
| Rill | Architectural inspiration | Adopt dimension/measure type system for schema |
| Dashbuilder | Architectural inspiration | Validates design choices |
| Perspective | Optional code donor | Phase 5 pivot/table widget, lazy-loaded |
| Craft.js | Fallback option | Use only if Puck hits blockers |

## Top 3 Surprises or Risks

### 1. Puck Has No Responsive Grid System — Medium Risk
**Surprise**: Puck does not provide built-in responsive breakpoints or column systems. Dashboards need "2 charts side-by-side on desktop, stacked on mobile."
**Mitigation**: Build custom Grid/Row/Column blocks using CSS Grid with Puck slot fields. This is standard Puck usage — many users build their own grid systems. Should be validated in Phase 1 POC.
**Risk level**: Medium — manageable but adds work to Phase 2.

### 2. Superset Has Zero Extractable Code — Not a Surprise, But Important
**Confirmation**: Despite being the primary "feature quarry," not a single Superset module can be used as a code donor. Every module is entangled with Flask backend, Redux state hydration, and Superset-specific abstractions. This means Supersubset must build from primitives (Puck + ECharts + custom code), not extracted Superset modules.
**Impact**: Validates the clean-room approach. No shortcuts via Superset extraction.

### 3. Perspective's WASM Bundle Is 3-5MB — Important for Library-First
**Surprise**: The WASM engine for Perspective adds 3-5MB to the bundle. For an embeddable library, this is massive.
**Decision**: Perspective MUST be optional and lazy-loaded. It cannot be a core dependency. MVP table widget should use a lightweight solution.
**Risk level**: Low — as long as Perspective remains optional.

## Questions for the Human Reviewer

1. **Puck confidence**: The research is strongly in favor of Puck, with manageable concerns. Are there any Puck experiences or constraints from your side that should factor in? Any concerns about Puck's v0.x maturity (they haven't reached v1.0)?

2. **Responsive layout approach**: The plan is to build custom CSS Grid layout blocks as Puck components. Would you prefer exploring a different approach (e.g., react-grid-layout, custom layout engine) before committing to this?

3. **Perspective scope**: The recommendation is to defer Perspective to Phase 5 as an optional widget. Do you agree, or would you like pivot table support in the MVP (Phase 1)?

4. **ECharts table vs custom table**: For the MVP table widget, should we use ECharts' plugin-chart-table approach (consistent with other charts) or build a custom React table component (more flexible)?

5. **Schema format priority**: Rill's schema patterns suggest a rich dimension/measure type system. Are there specific field types or metadata patterns from your domain that should inform the canonical schema design?

## Recommendation: Proceed with Puck + ECharts

**Yes, proceed with Puck + ECharts as assumed.**

The research confirms:
- ✅ Puck is the best available editor shell for React (MIT license, active development, clean API)
- ✅ ECharts is the established chart runtime (already planned, confirmed by Superset's own migration to ECharts)
- ✅ No competing project fills Supersubset's niche
- ✅ The composition of Puck (editor) + ECharts (charts) + custom canonical schema is the pragmatic approach
- ⚠️ Puck responsive layout needs custom work (medium effort, bounded risk)
- ⚠️ Perspective should be optional Phase 5 widget, not core dependency

## Time Estimate for Review

~30 minutes. Read the reuse matrix first, then skim each research doc's summary and classification sections. The questions above are the key decision points.

## Next Steps After HC-0 Approval

If approved, agents will proceed to Wave 2:
- 0.16: ADR-001 — Editor shell (Puck) decision
- 0.17: ADR-002 — Chart runtime (ECharts) decision
- 0.18: ADR-003 — Canonical schema format
- 0.19: ADR-004 — Package boundaries
- 0.20: Canonical schema v0 draft
- 0.21: Monorepo package skeleton
- 0.22: Playwright test scaffold

All blocked until HC-0 passes.
