---
name: browser-testing
description: 'Run browser tests against Supersubset using Chrome MCP. Use when verifying designer UI interactions, renderer output, drag-and-drop behavior, filter propagation, responsive modes, or visual regression. Covers Chrome DevTools MCP integration, test plan execution, screenshot capture, and console error detection.'
---

# Browser Testing with Chrome MCP

## When to Use

- Verifying the designer loads and functions correctly
- Testing drag-and-drop widget interactions
- Verifying property edits update rendered widgets
- Testing JSON/YAML import/export round-trips
- Validating Probe mode against pasted metadata or controlled live discovery/query backends
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

### Probe Workflows

1. Use `e2e/workflows/probe-metadata-paste.spec.ts` for deterministic paste-JSON onboarding coverage
2. Use a sibling workflow in `e2e/workflows/` for live backend discovery/query/auth validation when the branch includes one
3. Anchor live backend assertions to the probe contract documented in `docs/api/metadata-and-cli.md`

## Procedure

1. Decide first whether browser automation is the right layer by reading `.github/skills/testing-strategy/SKILL.md`
2. If multiple agents or checkouts share the machine, lease ports first:
   `mapfile -t LEASED_PORTS < <(node scripts/find-free-port.mjs --start 3110 --end 3199 --count 3)`
3. Export explicit origins before starting servers or Playwright-backed flows:
   `SUPERSUBSET_DEV_APP_PORT`, `SUPERSUBSET_EXAMPLE_NEXTJS_PORT`, `SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT`
4. Start the target app or stack on the leased ports, or reuse the configured Playwright web server
5. Use Chrome MCP to navigate to the explicit app URL, not an assumed shared default
6. Take an initial screenshot for baseline
7. Execute test plan steps using Chrome MCP tools:
   - `chr_navigate_page` — navigate to URLs
   - `chr_click` — click elements
   - `chr_fill` — fill input fields
   - `chr_take_screenshot` — capture visual state
   - `chr_take_snapshot` — capture DOM state
   - `chr_list_console_messages` — check for errors
   - `chr_evaluate_script` — run assertions in browser
8. Compare screenshots and DOM state to expected outcomes
9. Report results with evidence, including the leased local origin that was tested

## Verification Checklist

- [ ] No console errors during test
- [ ] All widgets render without visual defects
- [ ] Drag-and-drop produces correct layout changes
- [ ] Property edits reflect immediately in preview
- [ ] Filter changes propagate to all bound widgets
- [ ] Export/import produces semantically identical schema
- [ ] Responsive resize works without layout breaks

## See Also

- `.github/skills/testing-strategy/SKILL.md`
- `docs/testing/verification-strategy.md`
