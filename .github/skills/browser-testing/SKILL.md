---
name: browser-testing
description: "Run browser tests against Supersubset using Chrome MCP. Use when verifying designer UI interactions, renderer output, drag-and-drop behavior, filter propagation, responsive modes, or visual regression. Covers Chrome DevTools MCP integration, test plan execution, screenshot capture, and console error detection."
---

# Browser Testing with Chrome MCP

## When to Use
- Verifying the designer loads and functions correctly
- Testing drag-and-drop widget interactions
- Verifying property edits update rendered widgets
- Testing JSON/YAML import/export round-trips
- Verifying renderer output against saved definitions
- Checking filter propagation across widgets
- Detecting console errors and rendering regressions
- Responsive mode testing

## Chrome MCP Setup

The workspace has Chrome MCP configured in `.vscode/mcp.json`:
```json
{
  "io.github.ChromeDevTools/chrome-devtools-mcp": {
    "command": "npx",
    "args": ["-y", "chrome-devtools-mcp"]
  }
}
```

## Test Plans

### Plan A — Designer Happy Path
1. Open local dev app (`http://localhost:5173` or configured port)
2. Load sample metadata model
3. Create new dashboard
4. Add 4 widget types (line chart, bar chart, table, KPI card)
5. Bind fields from the metadata model
6. Configure filters
7. Save to canonical schema
8. Export JSON and YAML
9. Reload and verify semantic equivalence

### Plan B — Renderer Happy Path
1. Load saved dashboard definition
2. Execute through mock adapter and real adapter fixture
3. Verify charts/tables/cards appear correctly
4. Verify cross-filtering and drill actions

### Plan C — Regression and Robustness
1. Malformed schema import
2. Missing field bindings
3. Unsupported chart config
4. Slow query / timeout
5. Empty dataset
6. Adapter error
7. Browser resize
8. Theme switch

### Plan D — Host Integration
1. Mount designer inside host shell
2. Persist schema via host callback
3. Mount renderer in separate route/component tree
4. Verify no hidden backend dependency

## Procedure

1. Start the dev app: `cd packages/dev-app && pnpm dev`
2. Use Chrome MCP to navigate to the app URL
3. Take initial screenshot for baseline
4. Execute test plan steps using Chrome MCP tools:
   - `chr_navigate_page` — navigate to URLs
   - `chr_click` — click elements
   - `chr_fill` — fill input fields
   - `chr_take_screenshot` — capture visual state
   - `chr_take_snapshot` — capture DOM state
   - `chr_list_console_messages` — check for errors
   - `chr_evaluate_script` — run assertions in browser
5. Compare screenshots and DOM state to expected outcomes
6. Report results with evidence

## Verification Checklist
- [ ] No console errors during test
- [ ] All widgets render without visual defects
- [ ] Drag-and-drop produces correct layout changes
- [ ] Property edits reflect immediately in preview
- [ ] Filter changes propagate to all bound widgets
- [ ] Export/import produces semantically identical schema
- [ ] Responsive resize works without layout breaks
