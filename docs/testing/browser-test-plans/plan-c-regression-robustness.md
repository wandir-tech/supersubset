# Browser Test Plan C — Regression and Robustness

## Objective
Verify the system handles edge cases, malformed input, and adverse conditions gracefully.

## Steps

### 1. Malformed Schema Import
- [ ] Import JSON with missing required fields
- [ ] Verify validation error displayed to user
- [ ] Import JSON with wrong `schemaVersion`
- [ ] Verify migration attempted or clear error shown
- [ ] Import completely invalid JSON
- [ ] Verify graceful error, no crash

### 2. Missing Field Bindings
- [ ] Load dashboard with widget pointing to non-existent field
- [ ] Verify widget shows error state, not crash
- [ ] Verify other widgets still render
- [ ] Verify error is reported in validation panel

### 3. Unsupported Chart Config
- [ ] Load dashboard with unrecognized `type` in widget definition
- [ ] Verify fallback/placeholder widget rendered
- [ ] Verify console warning but no crash

### 4. Slow Query / Timeout
- [ ] Configure mock adapter with 10s delay
- [ ] Verify loading state persists
- [ ] After timeout threshold, verify timeout error displayed
- [ ] Verify user can retry or dismiss

### 5. Empty Dataset
- [ ] Provide adapter returning zero rows for all queries
- [ ] Verify each widget type handles empty data:
  - [ ] Chart: "No data" message
  - [ ] Table: empty state or "No rows"
  - [ ] KPI: dash or zero indicator
- [ ] No console errors

### 6. Adapter Error
- [ ] Configure mock adapter to throw on specific queries
- [ ] Verify per-widget error isolation
- [ ] Verify error details accessible (not swallowed)
- [ ] Verify retry mechanism if available

### 7. Browser Resize
- [ ] Start at 1920x1080 desktop
- [ ] Take screenshot
- [ ] Resize to 1024x768 tablet
- [ ] Verify layout reflows correctly, take screenshot
- [ ] Resize to 375x667 mobile
- [ ] Verify responsive behavior, take screenshot
- [ ] Resize back to 1920x1080
- [ ] Verify layout restores, take screenshot

### 8. Theme Switch
- [ ] Load dashboard with default theme
- [ ] Take screenshot
- [ ] Switch to dark theme
- [ ] Verify all widgets re-render with dark theme
- [ ] Take screenshot
- [ ] Switch back to light theme
- [ ] Verify restoration

### 9. Rapid Interaction
- [ ] Click 10 different filters in quick succession
- [ ] Verify no race conditions or stale data
- [ ] Verify final state is consistent

### 10. Large Dashboard
- [ ] Load dashboard with 20+ widgets
- [ ] Verify all render without performance collapse
- [ ] Measure time to interactive
- [ ] Verify smooth scrolling

## Pass Criteria
- No uncaught exceptions in any scenario
- All error states are user-friendly (not raw stack traces)
- Layout responsive behavior is smooth
- Theme switching is instant
- Large dashboards render in acceptable time
