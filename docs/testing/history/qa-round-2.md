# QA Round 2 — 2026-04-16

**Agent**: Lint, a11y, undo/redo, edge cases, performance  
**Branch**: `feature/qa-round-2`  
**PR**: #62 (open, targeting develop)

## Scope

Systematic audit across lint, accessibility, undo/redo, import validation, and performance.

## Changes Made

1. **Lint cleanup** — Fixed 16 lint warnings (all `@typescript-eslint/no-unused-vars`):
   - `packages/designer/src/adapters/puck-canonical.ts` — unused DataBinding import, destructured \_id
   - `packages/designer/src/components/FilterBuilderPanel.tsx` — unused useState, NormalizedField
   - `packages/designer/src/components/SupersubsetDesigner.tsx` — unused PuckAction
   - `packages/designer/src/fields/field-ref-field.tsx` — unused ROLE_BADGE_COLORS
   - `packages/runtime/src/components/FilterBar.tsx` — unused useCallback
   - `packages/runtime/src/components/SupersubsetRenderer.tsx` — unused ReactNode, InlineThemeDefinition
   - `packages/runtime/src/filters/FilterEngine.tsx` — unused filters variable
   - `packages/runtime/src/interactions/InteractionEngine.tsx` — unused handled variable
   - `packages/runtime/src/layout/LayoutRenderer.tsx` — unused GRID_COLUMN_COUNT
   - `packages/schema/test/serializers.test.ts` — unused DashboardDefinition type

2. **A11y fix** — Added `<main>` landmark to dev-app (fixes `landmark-one-main` Lighthouse audit)

## Issues Filed (3)

| #   | Title                                                        | Severity   | Fixable?                                                  |
| --- | ------------------------------------------------------------ | ---------- | --------------------------------------------------------- |
| #59 | a11y: Lighthouse accessibility audit findings (score 87/100) | Low        | Partially (Puck-internal issues not ours)                 |
| #60 | Dashboard title sidebar input changes bypass undo/redo stack | Medium     | Yes — need to route title changes through undoRedo.push() |
| #61 | Puck property panel does not sync after undo/redo            | Low-Medium | Puck limitation — may need key-forcing or Puck dispatch   |

## Testing Performed

### Typecheck & Lint

- `pnpm typecheck` — all 16 packages clean
- `pnpm lint` — 0 errors, 0 warnings (was 16 warnings)

### Chart Gallery Completeness

All 17 widget types verified rendering in browser:

- Overview page: Line, Bar, Table, KPI Cards, Alerts
- Chart Gallery page: Pie, Scatter, Area, Combo, Gauge, Funnel, Radar, Treemap, Heatmap, Waterfall, Sankey, Box Plot

### Lighthouse Accessibility (Designer mode)

- Score: **87/100** (Best Practices: 100/100)
- 39 buttons all have accessible text/labels, 0 unlabeled
- 69 focusable elements
- 4 failures:
  - `aria-prohibited-attr` — Puck internal (not our code)
  - `color-contrast` — disabled undo/redo buttons (WCAG-exempt)
  - `frame-title` — Puck preview iframe (not our code)
  - `landmark-one-main` — **FIXED** in this PR

### Undo/Redo

- ↩ Undo button: works correctly for Puck property changes
- ↪ Redo button: works correctly
- ⌘Z keyboard shortcut: works
- ⌘⇧Z keyboard shortcut: works
- **Bug**: Dashboard title changes bypass undo stack (#60)
- **Bug**: Puck property panel doesn't sync on undo (#61)

### Import Validation

- Invalid JSON → shows "Invalid JSON: Unexpected token..." error ✅
- Valid JSON, invalid schema → shows "Dashboard definition is missing schemaVersion" ✅
- Dashboard remains intact after failed imports ✅

### Performance

- First Contentful Paint: **84ms**
- DOM Interactive: **10ms**
- JS Heap: **35MB**
- 45 resources loaded
- Zero console errors (only 4 known ECharts dispose warnings, #55)

## Not Yet Tested

- Responsive/viewport resizing in designer
- Multi-page navigation (switch pages, add/delete pages)
- Full import → edit → export round-trip via live browser
- Cross-filter propagation manual browser verification
- Example apps (nextjs-ecommerce, vite-sqlite) manual walkthrough
- Dark mode / theme switching
- Very large dashboards (stress test with 20+ widgets)

## Test Count After

1,248 unit tests + 44 Playwright E2E tests, all passing
