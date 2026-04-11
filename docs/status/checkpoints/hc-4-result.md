# HC-4 Result — Human Creates Dashboard, Tests Round-Trip

**Date**: 2026-04-09
**Status**: ✅ APPROVED (with fixes applied)

## What Was Tested

Human opened the dev app at `http://localhost:3006/`, switched to Designer mode, and tested the full editing workflow.

## Bugs Found & Fixed

### Bug 1: Chart title changes had no effect
- **Symptom**: Editing the title in the property panel didn't render on charts
- **Root cause**: All 14 ECharts widgets only included `title` in the `buildEmptyOption` fallback (no-data case). The main `useMemo` option never set `title`.
- **Fix**: Created `buildTitleOption(title?)` helper in `shared-options.ts`, added it to all 15 ECharts widget option objects.
- **Tests**: 15 new tests in `per-chart-properties.test.tsx` (14 positive + 1 negative). All pass.

### Bug 2: Code button did nothing
- **Symptom**: Clicking the `</>` Code button in the toolbar didn't show the CodeViewPanel.
- **Root cause**: Flex layout issue — designer took `height="100%"` without `overflow: hidden` or `minHeight: 0`, pushing CodeViewPanel offscreen.
- **Fix**: Added `overflow: hidden`, `minHeight: 0` to flex container; wrapped CodeViewPanel in `flex: '0 0 300px'` div.

## UX Feedback & Fixes

### Issue: Confusing toolbar navigation
- **Symptoms reported**: "Tools button confuses me", "Blocks and Left Bar do the same thing", "What does Outline do?"
- **Root cause**: Two toolbars (dev-app + Puck's built-in) with redundant/unclear labels.
- **Fix**:
  1. Renamed Puck sidebar tabs: "Blocks" → "Components", "Outline" → "Layers"
  2. Moved all designer controls (Undo/Redo, Import/Export, Code, Data & Filters) into Puck's header via new `headerActions` prop
  3. Renamed "Tools" to "Data & Filters"
  4. Simplified dev-app top bar to just brand + mode switcher
- **Tests**: 3 new tests for `headerActions` prop + plugin rename verification. All pass.

## Deferred Items

- **Dashboard navigation**: Research on Superset's dashboard listing/nav completed. Decision: defer — host app owns navigation. May add tab/page support to schema in a future phase.
- **Full UX audit**: May revisit toolbar layout with a dedicated UX review pass later.

## Final Test Count

- 733 total tests (496 designer + 170 charts + 29 schema + 15 runtime + 12 theme + 4 data-model + 4 adapters + 2 query-client + 1 dev-app)
- 18 Playwright e2e tests (separate)
- All passing ✅
