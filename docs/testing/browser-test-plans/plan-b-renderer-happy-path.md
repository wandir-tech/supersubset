# Browser Test Plan B — Renderer Happy Path

## Objective
Verify the standalone renderer correctly renders a saved dashboard definition with live data.

## Prerequisites
- Renderer dev app running
- Saved dashboard definition from Plan A (or fixture)
- Mock query adapter returning fixture data
- Chrome with DevTools MCP available

## Steps

### 1. Load Dashboard Definition
- [ ] Mount `<SupersubsetRenderer />` with saved definition
- [ ] Verify renderer initializes without console errors
- [ ] Take screenshot: initial load state

### 2. Verify Widget Rendering
- [ ] Alerts widget renders alert tiles with title, message, severity badge, and timestamp
- [ ] Line chart renders with correct axes and data points
- [ ] Bar chart renders with correct bars and labels
- [ ] Table renders with correct columns, rows, and data
- [ ] KPI card renders with correct value and label
- [ ] Take screenshot: all widgets rendered

### 3. Verify Layout
- [ ] Widgets are positioned according to the layout definition
- [ ] Grid/flex layout is respected
- [ ] No overlapping widgets
- [ ] Spacing and margins are correct
- [ ] Take screenshot: overall layout

### 4. Test Mock Adapter Query Execution
- [ ] Monitor network/adapter calls via console
- [ ] Verify each widget triggers a query request
- [ ] Verify query requests match widget data bindings
- [ ] Verify query results are correctly applied to widgets

### 5. Test Real Adapter Fixture
- [ ] Switch to real adapter fixture (e.g., JSON adapter with static data)
- [ ] Verify same dashboard renders correctly
- [ ] Verify field mappings resolve
- [ ] Take screenshot: real adapter rendering

### 6. Cross-Filtering
- [ ] Click a bar in the bar chart
- [ ] Verify line chart updates with filtered data
- [ ] Verify table filters to matching rows
- [ ] Verify KPI card recalculates
- [ ] Take screenshot: cross-filtered state

### 7. Drill Actions
- [ ] Click a data point with drill action configured
- [ ] Verify drill behavior (navigate/filter/detail)
- [ ] Verify host callback is fired
- [ ] Take screenshot: drill result

### 8. Loading States
- [ ] Simulate slow query (delayed adapter response)
- [ ] Verify loading spinners/skeletons appear
- [ ] Verify widgets resolve when data arrives
- [ ] Take screenshot: loading state

### 9. Error States
- [ ] Simulate adapter error for one widget
- [ ] Verify error state displays gracefully
- [ ] Verify other widgets continue to function
- [ ] Take screenshot: error state

### 10. Empty Data States
- [ ] Provide empty query result
- [ ] Verify "no data" message or placeholder
- [ ] Verify no crashes or console errors
- [ ] Take screenshot: empty state

### 11. Alerts-Specific States
- [ ] Verify semantic severity colors render consistently for info, success, warning, and danger
- [ ] Verify `maxItems` limits the visible alert tiles
- [ ] Verify `emptyState: hide` removes the widget without leaving a broken layout gap
- [ ] Take screenshot: alerts widget states

## Pass Criteria
- All widgets render correctly from saved definition
- Alerts render with the expected severity styling and empty-state behavior
- Cross-filtering updates all bound widgets
- Loading/error/empty states handled gracefully
- No console errors during normal operation
- Mock and real adapter both work
