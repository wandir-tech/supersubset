# HC-7 — Checkpoint Brief: Full Test Plans A+B

> **Gate**: HC-7 — Human manually walks through Test Plans A and B
> **Phase**: 4 — Interaction Model
> **Prepared**: 2026-04-10
> **Tests**: 983 unit + 29 e2e = 1012 total (all passing)

---

## Automated Test Summary

| Suite | Tests | Status |
|-------|-------|--------|
| schema | 29 | ✅ |
| data-model | 55 | ✅ |
| theme | 12 | ✅ |
| runtime | 76 | ✅ |
| adapter-prisma | 18 | ✅ |
| adapter-sql | 25 | ✅ |
| adapter-json | 20 | ✅ |
| adapter-dbt | 19 | ✅ |
| query-client | 18 | ✅ |
| charts-echarts | 170 | ✅ |
| cli | 34 | ✅ |
| designer | 506 | ✅ |
| dev-app | 1 | ✅ |
| **Unit Total** | **983** | ✅ |
| **E2E (Playwright)** | **29** | ✅ |
| **Grand Total** | **1012** | ✅ |

---

## What to Test Manually

### Test Plan A — Designer Happy Path

1. **Load Designer**: Click "Designer" in the top bar. Puck editor should load with Components/Layers tabs on left.
2. **Drag a chart**: Drag a BarChart from Components → canvas. It should render with sample data.
3. **Edit properties**: Click the chart → right panel shows Title, Height, Color Scheme, etc.
4. **Filters panel**: Click "⛶ Filters" in toolbar → slide-over opens → "Dashboard Filters" heading → click Done to close.
5. **Interactions panel**: Click "⚡ Interactions" in toolbar → slide-over opens → "Widget Interactions" heading → click Done to close.
6. **Code view**: Click "</> Code" → bottom panel shows JSON schema.
7. **Import/Export**: Export button → JSON download. Import → can load a JSON file.
8. **Publish**: Click Publish → alert confirms save.

### Test Plan B — Renderer Happy Path

1. **Load Viewer**: Click "Viewer" (default mode). Dashboard renders with charts/tables/KPIs.
2. **Page tabs**: Two pages (Overview, Chart Gallery). Click between them.
3. **Filter bar**: Three filters visible: Region (select), Category (select), Order Date (preset dropdown).
4. **Date filter**: Click the Order Date dropdown → see presets (Today, This Month, Last 30 Days, etc.). Select "Custom range…" → two date pickers appear.
5. **Select filters**: Choose "North" from Region dropdown → console logs filter state change.
6. **Clear filters**: After selecting filters, "✕ Clear filters" button appears → click to reset all.
7. **Cross-filtering**: Click a bar in the Region Sales bar chart → console logs cross-filter event.
8. **Page navigation**: Both pages render correctly with all chart types.

### Known Limitations

- Cross-filtering doesn't visually update charts (static fixture data — no query adapter to re-query). Console logs prove the plumbing works.
- Date filter presets emit resolved date ranges but don't filter fixture data.
- Filter configuration in designer's slide-over is auto-saved (onChange fires per edit); "Done" closes the panel.

---

## ADRs Written This Phase

- **ADR-005**: Designer Information Architecture & Navigation Redesign

## Key Artifacts

- `packages/runtime/src/components/FilterBar.tsx` — Relative date presets, styled controls
- `packages/runtime/src/interactions/` — InteractionEngine, DrillManager, useInteractionHandler
- `packages/runtime/src/state/` — StatePersistence, useStatePersistence
- `packages/designer/src/components/SlideOverPanel.tsx` — Reusable slide-over drawer
- `packages/designer/src/components/InteractionEditorPanel.tsx` — Interaction config UI
- `e2e/interactions/` + `e2e/workflows/filter-cascade.spec.ts` — Playwright e2e tests
