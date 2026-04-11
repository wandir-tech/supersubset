# Supersubset — Manual QA Checklist

> **Living document** — Updated as features are implemented

## Designer Usability

- [ ] Widget palette is discoverable and organized
- [ ] Drag-and-drop feels responsive (< 100ms visual feedback)
- [ ] Property panel opens quickly when widget is selected
- [ ] Field picker shows appropriate fields for the context
- [ ] Chart type switching preserves compatible bindings
- [ ] Undo/redo works across all edit operations
- [ ] Copy/paste works for widgets
- [ ] Keyboard shortcuts are discoverable (help panel or tooltips)
- [ ] Empty states have clear calls-to-action
- [ ] Error messages are actionable, not cryptic

## Visual Layout Consistency

- [ ] Widget spacing is uniform
- [ ] Designer canvas remains visible and usable at medium desktop widths when page controls are present
- [ ] Grid snapping aligns widgets consistently
- [ ] Text rendering is crisp at all zoom levels
- [ ] Charts have consistent margins and padding
- [ ] Chart titles, legends, axis labels, and plot areas do not overlap
- [ ] Long legend labels wrap or scroll without colliding with chart titles
- [ ] Color palette is consistent across chart types
- [ ] Icons are clear and properly sized

## Keyboard Navigation

- [ ] Tab order follows visual layout
- [ ] Focus indicators are visible
- [ ] Escape closes modals/panels
- [ ] Enter activates focused buttons
- [ ] Arrow keys navigate within widget palette
- [ ] Delete key removes selected widget

## Accessibility Basics

- [ ] All interactive elements have accessible labels
- [ ] Color is not the only means of conveying information
- [ ] Charts have text alternatives (data table fallback)
- [ ] Focus management is correct for modals/dialogs
- [ ] Screen reader can navigate designer structure

## Performance

- [ ] Designer loads in < 3s on standard hardware
- [ ] Adding a widget is instant (< 200ms)
- [ ] Property panel updates don't cause visible lag
- [ ] Scrolling through a 20-widget dashboard is smooth (60fps)
- [ ] Chart resize is smooth during responsive preview
- [ ] Memory usage doesn't grow unbounded during editing session

## Renderer Visual Quality

- [ ] Alerts widgets show title, message, severity, and timestamp with clear visual hierarchy
- [ ] Alerts severity colors match theme tokens for info/success/warning/danger states
- [ ] Alerts empty-state behavior is intentional for both placeholder and hide modes
- [ ] Charts render identically to designer preview
- [ ] Table column widths are appropriate for content
- [ ] KPI cards display values with correct formatting
- [ ] Loading spinners are visible and centered
- [ ] Error states don't break the layout
- [ ] Tooltips appear within viewport bounds

## State & Persistence Workflows

- [ ] Import after refresh updates the live designer, not only host-side state
- [ ] Imported dashboards survive Designer → Preview → Viewer mode switches
- [ ] Publishing updates the same dashboard definition used by viewer/preview
- [ ] Imported/published dashboards preserve alerts widgets and structured navigate targets
- [ ] Page selection recovers safely when an imported dashboard changes the page set
- [ ] Page delete confirmation names the targeted page and fallback selection is predictable
- [ ] Undo/redo history resets or advances intentionally after import/publish actions

## Automated Regression Expectations

- [ ] Every human-found defect has a named regression test
- [ ] Visual regressions for canvas charts use targeted screenshot baselines
- [ ] Workflow tests fail on unexpected console errors or warnings
- [ ] Import/export tests assert semantic equivalence, not only that a dialog opens
