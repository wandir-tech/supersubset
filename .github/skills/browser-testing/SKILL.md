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
- Verifying that host-owned query refresh actually changes visible dashboard output
- Checking whether schema-first behavior still works without undocumented host-only helper props
- Detecting console errors and rendering regressions
- Responsive mode testing
- Running release-oriented blocker discovery sweeps in real host examples

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

### Plan F — Market-Critical BI Sweep

1. Use the strongest host or authoring surface for the workflow under test
2. Reproduce the end-user journey that changes analytical meaning
3. Verify any host query or request payload mutation when the host owns data refresh
4. Verify the visible dashboard outcome changed in a way a user can perceive
5. Capture console, network, screenshot, and query-log evidence
6. Record whether the result is a blocker, a regression gap, or a pass

### Probe Workflows

1. Use `e2e/workflows/probe-metadata-paste.spec.ts` for deterministic paste-JSON onboarding coverage
2. Use a sibling workflow in `e2e/workflows/` for live backend discovery/query/auth validation when the branch includes one
3. Anchor live backend assertions to the probe contract documented in `docs/api/metadata-and-cli.md`

## Procedure

1. Decide first whether browser automation is the right layer by reading `.github/skills/testing-strategy/SKILL.md`
2. List any helper props or seeded globals the target flow relies on, such as `filterOptions`, preview data injectors, or test-only defaults
3. If the feature is supposed to be schema-driven, remove or neutralize those helpers for at least one proof run before treating the browser result as a pass
4. If multiple agents or checkouts share the machine, lease ports first:
   `mapfile -t LEASED_PORTS < <(node scripts/find-free-port.mjs --start 3110 --end 3199 --count 3)`
5. Export explicit origins before starting servers or Playwright-backed flows:
   `SUPERSUBSET_DEV_APP_PORT`, `SUPERSUBSET_EXAMPLE_NEXTJS_PORT`, `SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT`
6. Start the target app or stack on the leased ports, or reuse the configured Playwright web server
7. Use Chrome MCP to navigate to the explicit app URL, not an assumed shared default
8. Take an initial screenshot for baseline
9. If the change affects a user-visible property or authoring surface, capture a matching "after" screenshot once the changed state is reached
10. If the property is something dashboard authors configure, prefer a pair that shows both:

- the designer or authoring surface with the changed setting visible
- the viewer or preview result after the change

11. Execute test plan steps using Chrome MCP tools:

- `chr_navigate_page` — navigate to URLs
- `chr_click` — click elements
- `chr_fill` — fill input fields
- `chr_take_screenshot` — capture visual state
- `chr_take_snapshot` — capture DOM state
- `chr_list_console_messages` — check for errors
- `chr_evaluate_script` — run assertions in browser

12. Compare screenshots and DOM state to expected outcomes
13. Report results with evidence, including the leased local origin that was tested, whether the proof depended on any helper props, and whether docs screenshot artifacts should be refreshed

## Agent Run Hygiene

When running Playwright unattended from an agent session:

- set `PLAYWRIGHT_HTML_OPEN=never` so Playwright does not open the HTML report UI on failures
- prefer `--reporter=line` for focused runs so progress and failures stay in terminal output
- avoid adding `CI=1` when you intend to reuse an already-running local dev server; Playwright may treat the configured web server as exclusive and fail on an occupied port
- if the target app imports a workspace package through package exports, rebuild the touched package before rerunning browser tests when that package resolves from `dist/`

In this repo, this matters especially for `packages/dev-app` and the example hosts, which consume built workspace package outputs rather than raw source in several flows.

For BI workflows, do not stop at screenshots or control values when a stronger proof exists. Prefer evidence like:

- query log changed from the previous value set
- row count or table contents changed
- KPI value or delta changed
- legend, series, or mark count changed in the rendered chart
- network request payload reflects the expected filter or interaction state

Do not let the test harness manufacture the semantic state being tested. If a control needs option values, field metadata, or defaults, prove where they come from and whether that source is part of the intended contract.

For property-level UI changes, screenshots are not just decoration. If a human reviewer should be able to see the difference, capture before/after evidence and route to `.github/skills/document-feature/SKILL.md` when the docs artifacts should be updated in the same change.

## Verification Checklist

- [ ] No console errors during test
- [ ] All widgets render without visual defects
- [ ] Drag-and-drop produces correct layout changes
- [ ] Property edits reflect immediately in preview
- [ ] User-visible property or layout changes have before/after screenshot evidence when a reviewer would need to see the difference
- [ ] Filter changes propagate to all bound widgets
- [ ] Schema-authored controls still function without undocumented host-only semantic helpers, or the dependency is explicitly documented as intentional
- [ ] When the host owns query refresh, filter changes mutate the expected query or request payload
- [ ] Filter or interaction changes produce an obvious analytical outcome, not only a control-state update
- [ ] Export/import produces semantically identical schema
- [ ] Responsive resize works without layout breaks

## See Also

- `.github/skills/testing-strategy/SKILL.md`
- `.github/skills/bi-visualization-quality/SKILL.md`
- `docs/testing/verification-strategy.md`
