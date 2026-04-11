# HC-6 — Checkpoint Brief: Interaction Model

> **Gate**: HC-6 — Human clicks a cross-filter in browser
> **Phase**: 4 — Interaction Model
> **Prepared**: 2026-04-10
> **Tests**: 983 unit + 21 e2e = 1004 total (all passing)

---

## What Was Built

### Dashboard-Level Filters (Task 4.1)
- `FilterBar` component renders filter controls (select, text, range, date) from FilterDefinition[]
- Filters scoped: global / page / specific widgets
- Reset All button
- FilterProvider hooks deliver active filter values to each widget

### Cross-Filtering (Task 4.2)
- `InteractionEngine` processes WidgetEvents against InteractionDefinition[]
- Click on a chart → filter action → setFilter on target widgets
- Cross-filter IDs prefixed `cross-filter:` to avoid collision with dashboard filters
- Toggle behavior: click same value again to clear

### Click-to-Filter (Task 4.3)
- `useInteractionHandler(widgetId)` hook creates per-widget event handlers
- Routes through interaction engine, falls back to host `onWidgetEvent`

### Drill-to-Detail (Task 4.5)
- `DrillManager` with `DrillProvider`, `useDrill()` hook
- `DrillBreadcrumbBar` component shows interactive breadcrumb trail
- Drill state: breadcrumb stack, current field/value, source widget

### Navigate Actions (Task 4.6)
- `onNavigate(pageId, filterState?)` callback — host controls routing
- Navigate actions carry click payload as filter state for target page

### State Persistence (Task 4.7)
- `serializeState` / `deserializeState` — JSON round-trip
- `stateToUrlParams` / `stateFromUrlParams` — URL param encoding (f_ prefix)
- `useStatePersistence` hook — syncs to URL / sessionStorage / localStorage

### Interaction Editor (Task 4.8)
- `InteractionEditorPanel` in designer — configure triggers + actions
- Supports all 4 action types: filter, navigate, drill, external
- Multi-select target widgets for filter scope

---

## How to Test Cross-Filtering

1. Start the dev app:
   ```bash
   pnpm --filter @supersubset/dev-app dev
   ```

2. Open the app in Viewer mode (the default)

3. The demo dashboard now has:
   - **Two filter controls**: Region and Category (in filter bar at top)
   - **One cross-filter interaction**: clicking the Region Sales bar chart cross-filters other widgets

4. Try:
   - Select a value from the Region dropdown filter
   - Look at the console for `[Supersubset] Filter state:` logs
   - Click on a bar in the Region Sales chart
   - Check console for `[Supersubset] Widget event:` logs

5. Open the browser console to see event flow

**Note**: Cross-filtering visually changes widget data only when widgets are wired to a query adapter that re-queries with active filters. The demo app uses static fixture data, so the filter bar and cross-filter events fire correctly but don't visually re-render with filtered data. The console logs prove the plumbing works.

---

## Test Summary

| Component | Tests |
|-----------|-------|
| FilterBar | 11 |
| InteractionEngine | 8 |
| Click-to-Filter | 6 |
| DrillManager | 14 |
| Navigate Actions | 4 |
| State Persistence | 18 |
| Interaction Editor (Designer) | 10 |
| **Phase 4 new** | **71** |
| **Project total** | **1004** |

---

## Approval Criteria

- [ ] Dev app loads in browser without errors
- [ ] Filter bar appears in viewer mode
- [ ] Console shows filter state changes when using dropdowns
- [ ] Console shows widget events when clicking chart areas
- [ ] Cross-filtering concept makes sense for the architecture
