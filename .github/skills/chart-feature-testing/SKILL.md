---
name: chart-feature-testing
description: 'End-to-end verification of Supersubset chart features in a host app (Tripmatch/Wandir). Formulate user intents, exercise the Dashboard Editor, and confirm Metrics/runtime behavior. Use when validating chart type switching, field binding round-trips, publish flows, or running a BI quality sweep before release.'
---

# Chart Feature Testing (Host-Embedded)

## When to Use

- A chart feature ships in `@supersubset/designer` and must work in a **real host** (Tripmatch `/admin/analytics`), not just unit tests
- You need to verify **editor state ↔ published JSON ↔ Metrics view** stay aligned
- You are doing a pre-release sweep of chart editing, binding, or visualization quality
- A bug report mentions “properties look wrong”, “chart broke after publish”, or “type switch clobbered fields”

## Prerequisites

- Supersubset clone (`$SUPERSET_ROOT`) and Tripmatch checkout or issue worktree (`$TRIPMATCH_ROOT`)
- yalc linked per Tripmatch `.ai/skills/supersubset-development/SKILL.md` (all six packages)
- Tripmatch dev stack running (`bash tools/devenv.sh up` in the host checkout)
- Analytics mart seeded when testing real data: `prisma-seed`, `BI_TEST_DATA_GEN_BATCH` (see Tripmatch analytics docs)

## Core loop

```text
Intent → Editor action → Publish (if persistence matters) → Metrics / JSON evidence
```

1. **State intent** as a user would (“I want to change this area chart to a bar without losing date on X”)
2. **Open host**: `http://localhost:<UI_APP_PORT>/admin/analytics` → Dashboard Editor tab
3. **Login**: `admin@wandir.com` / `11111111` (Tripmatch local seed)
4. **Select widget** on canvas; confirm property panel reflects bindings
5. **Make the edit** (chart type, axis field, aggregation, etc.)
6. **Publish** when testing persistence (Puck header Publish control)
7. **Verify**:
   - Dashboard JSON tab: widget `type`, `config.xField` / `config.yField`, `dataBinding`, `logicalQuery`
   - Metrics tab: chart renders with correct axes/legend (not a single mystery bar)
8. **Automated checks** (run before/after fixes — **not a substitute for browser gates**):

```bash
cd "$SUPERSET_ROOT/packages/designer"
pnpm test -- run host-embedded-chart-roundtrip switch-puck-chart-type

cd "$TRIPMATCH_ROOT"
npx nx run analytics-worker:test --testPathPattern=analytics-dashboard-definition.normalization
```

9. **Browser gates (required)** — see [BROWSER-GATES.md](./BROWSER-GATES.md). A chart binding or type-switch fix is **not complete** until Gate A + Gate B pass in Chrome on the host stack.

**Why the skill exists:** `@supersubset/designer` unit tests exercise `canonicalToPuck()` / `puckToCanonical()` in isolation. Puck's runtime merges `defaultProps` and serializes select values (`'{"value":"count"}'`) in the live editor — only browser gates catch that.

10. **yalc refresh** after designer changes:

```bash
cd "$SUPERSET_ROOT/packages/designer" && pnpm build && yalc push
cd "$TRIPMATCH_ROOT" && bash tools/verify-yalc-supersubset.sh chart-type-switch-panel
bash tools/devenv.sh restart ui-app
```

Hard-refresh the browser before re-testing.

## Intent catalog (starter set)

Use these as templates; extend with `.github/skills/bi-visualization-quality/SKILL.md` heuristics.

| Intent                         | Editor steps                                    | Pass criteria                                                                                  |
| ------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Change chart type in place** | Select area chart → Chart type → Bar → Publish  | JSON `"type": "bar-chart"`; Metrics shows dated X-axis, not one bucket labeled with a field id |
| **Bindings visible on load**   | Revert to seed → select “Plans created per day” | X-axis shows Event Date; Y-axis shows Event Id (count) or aggregation, not empty “Select…”     |
| **Publish round-trip**         | Edit title only → Publish → reload page         | Unrelated bindings unchanged in JSON and Metrics                                               |
| **Filter + chart**             | Metrics tab → change Plan Type filter           | Chart data changes; no console errors                                                          |
| **Pie ↔ bar task fit**         | (quality review) part-to-whole vs trend         | Flag mismatches per bi-visualization-quality                                                   |

### Generating broader intent sets

Read `.github/skills/bi-visualization-quality/SKILL.md` and translate each concern into a **testable intent**:

- Chart type fits task → intent + expected visual encoding
- Labels/units clear → intent to inspect axis labels and legend after publish
- Filters discoverable → intent to change filter and assert visible data shift
- Misleading patterns → intent to flag (e.g., count on wrong axis, truncated axis)

Record intents in the tracking issue (see below) before executing; check off with evidence links (screenshot path, JSON snippet, test name).

## Browser execution

Use Chrome DevTools MCP or Tripmatch `.ai/skills/browser-debugging/SKILL.md`:

- Dashboard Editor is lazy-loaded; wait for “Components” sidebar
- Puck Publish is a `span` with primary button class, not always `<button>` — use DOM query if automation misses it
- Select charts by clicking the canvas overlay (6/12 column), not KPI cards
- **Revert to seed** is a one-click admin action (toast on success, no native `confirm` dialog)

## Known host-bridge invariants

Tripmatch runtime reads **`config.xField` / `config.yField`** and **`logicalQuery`** with **`alias: 'count'`** for count aggregations. The designer uses **`dataBinding`** + Puck props (`xAxisField`, `yAxisField`, `aggregation`).

Fixes must preserve:

- `dataBinding.fields` with correct roles (x-axis without spurious aggregation)
- `config.xField` / `config.yField` mirrored on publish (`mirrorHostRuntimeConfigFields` in designer)
- `normalizeAnalyticsDashboardDefinition` in Tripmatch rebuilds `logicalQuery` **and** host config fields

## Tracking defects

Log all host-embedded chart bugs in **one Supersubset GitHub issue** per initiative (no per-bug tickets unless scope explodes). Include:

- Intent that failed
- Editor vs JSON vs Metrics observations
- Root cause package (designer / api-access / runtime)
- Test added (file + test name)

## See Also

- `.github/skills/bi-visualization-quality/SKILL.md` — generate quality-oriented intents
- `.github/skills/browser-testing/SKILL.md` — MCP browser setup
- `.github/skills/testing-strategy/SKILL.md` — unit vs integration vs browser layers
- `.github/skills/puck-integration/SKILL.md` — Puck props and publish mechanics
- Tripmatch `.ai/skills/supersubset-development/SKILL.md` — yalc loop with host stack
