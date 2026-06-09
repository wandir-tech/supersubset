# Chart Feature Testing — Browser Gates (required)

Unit tests in `@supersubset/designer` are **necessary but not sufficient**. A fix is not done until these browser gates pass on the host stack.

## Setup

```bash
export SUPERSET_ROOT=~/apps/supersubset
export TRIPMATCH_ROOT=~/apps/issue-604-editing-chart-type-d  # or your worktree

cd "$SUPERSET_ROOT/packages/designer" && pnpm build && yalc push
cd "$TRIPMATCH_ROOT"
bash tools/verify-yalc-supersubset.sh chart-type-switch-panel
rm -rf node_modules/.vite
bash tools/devenv.sh restart ui-app
```

Hard-refresh the browser (`Cmd+Shift+R`).

## Gate A — Bindings visible on load (P0)

1. `/admin/analytics` → **Revert dashboard to seed** (toast, no dialog)
2. **Dashboard Editor** tab → wait for **Components** sidebar
3. Click the **6/12** canvas slot for **Plans created per day** (second row, left chart — not KPI cards)
4. Right panel must show:
   - **X-Axis Field:** Event Date (`event_date`)
   - **Y-Axis Field:** Event Id (`event_id`) — **not** “Select y-axis field…”
   - **Aggregation:** Count

**MCP check** (`evaluate_script`):

```javascript
() => {
  const y = document.querySelector('[data-testid="field-ref-yAxisField"]');
  const x = document.querySelector('[data-testid="field-ref-xAxisField"]');
  return {
    xValue: x?.value,
    yValue: y?.value,
    pass: x?.value === 'event_date' && y?.value === 'event_id',
  };
};
```

## Gate B — Chart type switch + publish (P0)

1. With chart selected → **Chart type** → **Bar chart**
2. Confirm X/Y fields still populated (Gate A selectors)
3. **Publish**
4. **Metrics** tab → **Plans created per day** must show **date** X-axis ticks (`2026-03-11`, …), not a single numeric bucket (`415`)
5. **Dashboard JSON** tab → `plan_chart_day`:
   - `"type": "bar-chart"`
   - `"xField": "event_date"`
   - `"yField": "count"`
   - `logicalQuery.fields` includes `event_date` + `event_id` count alias

## Gate C — JSON evidence after revert (sanity)

Dashboard JSON → find `plan_chart_day` → must have `config.yField: "count"` and `logicalQuery` even before any edit.

## Failure protocol

If a gate fails:

1. Capture Gate A `evaluate_script` output + screenshot
2. Confirm yalc marker in `node_modules/.vite/ui-app/deps/@supersubset_designer.js`
3. Fix in `packages/designer` (load path + chart-type switch preserve list + publish supplement)
4. Re-run unit tests **and** repeat browser gates

## Why unit tests alone miss these bugs

Puck merges block `defaultProps` (`yAxisField: ''`) **after** `canonicalToPuck()` runs. The editor field panel reads **Puck store** props, not the adapter output. Fixes must include:

- `chartAxisResolveData` on chart blocks (via `puck-config.ts`)
- `repairChartAxisPropsInPuckData` on designer load/change/publish
- Remove empty-string axis defaults from chart `defaultProps`
- `normalizePuckOptionProps` for wrapped select values like `'{"value":"count"}'`

## Login automation note

Tripmatch login is two-step (email → password). Use slow typing on the email field so MUI validation accepts the value before clicking Continue.

## Publish control

Puck **Publish** may be hidden until **Toggle menu bar** is clicked. Query `span` text "Publish" and click its parent if no `<button>` is found.

See also `scripts/browser-verify-bindings.mjs`.
