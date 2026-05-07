# Supersubset — Testing & Verification Strategy

> **Purpose**: Define when, where, and how testing happens — including Playwright automation, Chrome MCP manual verification, screenshot review, and human checkpoints.

## Core Principle: Test-During, Not Test-After

Testing is NOT a phase gate activity. It happens **during** every development task:

```
Write code → Unit test → Visual verify → Screenshot → Review → Commit
```

Not:

```
Write all code → Hope it works → Test at end → Find drift → Rework
```

For BI-facing features, add one more rule: do not stop at proving that a control changed state when the real user expectation is a changed analytical result.

For schema-first features, add another rule: do not treat a test as sufficient when it only passes because the harness injects authored semantics through helper props, static option maps, or other sidecar data that is not part of the intended product contract.

---

## Test Layers and Ownership

### Layer 1: Unit Tests (every task, every agent)

| What                      | When                         | Where                           | Tool   |
| ------------------------- | ---------------------------- | ------------------------------- | ------ |
| Schema validation         | With every type change       | `packages/schema/test/`         | Vitest |
| Serialization round-trips | With every serializer change | `packages/schema/test/`         | Vitest |
| Widget config validation  | With every widget            | `packages/charts-echarts/test/` | Vitest |
| Adapter normalization     | With every adapter           | `packages/adapter-*/test/`      | Vitest |
| Filter state transitions  | With filter engine           | `packages/runtime/test/`        | Vitest |
| Registry lookup           | With widget registry         | `packages/runtime/test/`        | Vitest |

**Rule**: No task is marked complete without passing unit tests in the affected package.

### Layer 2: Playwright E2E Tests (incremental, per-feature)

| What                               | When Written                 | Where               | Runs            |
| ---------------------------------- | ---------------------------- | ------------------- | --------------- |
| Renderer renders fixture dashboard | Task 1.16 (dev app scaffold) | `e2e/renderer/`     | CI + pre-commit |
| Each chart type renders            | Tasks 1.11–1.14 (each chart) | `e2e/charts/`       | CI              |
| Designer loads empty state         | Task 2.1 (editor shell)      | `e2e/designer/`     | CI              |
| Drag-and-drop adds widget          | Task 2.2 (first block)       | `e2e/designer/`     | CI              |
| Property edit updates widget       | Task 2.5 (property panels)   | `e2e/designer/`     | CI              |
| Import/export round-trip           | Task 2.10 (import/export)    | `e2e/designer/`     | CI              |
| Cross-filter propagates            | Task 4.2 (cross-filtering)   | `e2e/interactions/` | CI              |
| Host mount works                   | Task 5.5 (host examples)     | `e2e/integration/`  | CI              |

**Rule**: Every UI-visible feature ships WITH its Playwright test, not after.

**BI release rule**: If a filter, interaction, or host refresh is central to the feature, the Playwright test must assert a user-visible analytical outcome such as changed rows, KPI values, chart content, or host query payloads.

### Layer 3: Chrome MCP Verification (milestone screenshots)

Chrome MCP is for **human-reviewable visual verification** at key moments:

| When                           | What to Capture                | Screenshot Naming                                            |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------ |
| First chart renders in dev-app | All 4 chart types side-by-side | `screenshots/phase-1/charts-first-render.png`                |
| Designer shell loads           | Empty editor state             | `screenshots/phase-2/designer-empty.png`                     |
| First widget drag-and-drop     | Before/after drag              | `screenshots/phase-2/drag-drop-{before,after}.png`           |
| Property panel edits widget    | Before/after edit              | `screenshots/phase-2/property-edit-{before,after}.png`       |
| Full 4-widget dashboard        | Complete designer state        | `screenshots/phase-2/full-dashboard.png`                     |
| JSON export → reimport         | Side-by-side comparison        | `screenshots/phase-2/round-trip-{original,reimported}.png`   |
| Cross-filter in action         | Before/after filter click      | `screenshots/phase-4/cross-filter-{before,after}.png`        |
| Responsive modes               | Desktop/tablet/mobile          | `screenshots/phase-5/responsive-{desktop,tablet,mobile}.png` |
| Dark theme                     | Full dashboard in dark mode    | `screenshots/phase-5/theme-dark.png`                         |

**Rule**: Screenshots are stored in `screenshots/` and committed to git. The human checkpoint review explicitly references which screenshots to inspect.

### Layer 4: Acceptance Workflow Tests (end-to-end user journeys)

These are the "complete workflow" Playwright tests that exercise full user journeys:

| Test                                             | Covers                                                                      | When Built                          |
| ------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------- |
| `e2e/workflows/designer-to-renderer.spec.ts`     | Create dashboard in designer → save → load in renderer → verify all widgets | After Phase 2                       |
| `e2e/workflows/designer-page-management.spec.ts` | Responsive designer shell + page add/rename/delete flows                    | After page-management controls land |
| `e2e/workflows/import-export-cycle.spec.ts`      | Create → export JSON → export YAML → import JSON → import YAML → compare    | After Task 2.10                     |
| `e2e/workflows/metadata-to-dashboard.spec.ts`    | Load Prisma model → browse fields → bind to chart → render                  | After Phase 3                       |
| `e2e/workflows/filter-cascade.spec.ts`           | Add 3 filters → apply → verify all widgets update → clear → verify reset    | After Phase 4                       |
| `e2e/workflows/host-integration.spec.ts`         | Mount in host → save via callback → remount renderer → verify               | After Phase 5                       |

Release hardening should add or strengthen workflows whenever a human finds a gap in one of these journeys. Human-found misses are evidence that the workflow matrix is incomplete, not just that one test needs a tweak.

When a miss involves an undocumented helper prop or host-side semantic sidecar, expand the workflow and lower-level tests to prove the same journey without that helper, or document the dependency explicitly as an intentional architecture seam.

## Widget And Control Regression Matrix

Use `docs/testing/widget-control-regression-matrix.md` as the living source of truth for widget and control coverage.

That matrix owns:

- the inventory of bundled widgets and analytical controls
- the attribute families that must be covered for each surface
- the minimum `U` + `D` + `B` evidence expected for each row
- the commands that should be run when a surface changes

Any PR that changes a widget or control field, default, option set, mapping, or runtime behavior must update the matrix in the same PR.

For dashboard filter work, treat coverage as a chain rather than one row:

1. designer shell discoverability and layout
2. dashboard-level filter definition editing
3. placed filter-bar subset/presentation behavior
4. viewer or host analytical outcome

If one link is weak, the feature is not fully covered even when the others pass.

## Market-Critical Discovery Order

When preparing for release or hardening a branch after human-found misses, investigate in this order:

1. host-owned filtering and query refresh
2. authoring → publish/import → viewer round-trip
3. import/export robustness and schema survivability
4. cross-filter, drill, and page-management behavior
5. probe and live-backend onboarding
6. multi-instance isolation, theming, and responsive integrity
7. large-dashboard performance and memory stability
8. docs-following first-use onboarding

Use the real host examples whenever they provide stronger proof than the dev-app alone.

---

## Playwright Test Architecture

```
e2e/
├── playwright.config.ts
├── fixtures/
│   ├── sample-dashboard.json      # Canonical dashboard for renderer tests
│   ├── sample-dashboard.yaml      # Same in YAML
│   ├── prisma-schema.prisma       # Sample Prisma model
│   ├── metadata-model.json        # Pre-normalized metadata
│   └── query-results/             # Mock query responses
│       ├── sales-by-month.json
│       ├── products-table.json
│       └── kpi-revenue.json
├── helpers/
│   ├── dev-app.ts                 # Start/stop dev app
│   ├── screenshot.ts              # Screenshot capture + naming
│   └── schema-assertions.ts       # Canonical schema validation helpers
├── renderer/
│   ├── basic-render.spec.ts       # Fixture dashboard renders all widgets
│   ├── chart-types.spec.ts        # Each chart type renders correctly
│   ├── loading-states.spec.ts     # Loading/error/empty states
│   └── responsive.spec.ts         # Viewport resize behavior
├── designer/
│   ├── editor-load.spec.ts        # Designer mounts and loads
│   ├── drag-drop.spec.ts          # Drag widget to canvas
│   ├── property-edit.spec.ts      # Edit properties, verify update
│   ├── field-binding.spec.ts      # Bind data fields to widgets
│   ├── import-export.spec.ts      # JSON/YAML import/export
│   ├── undo-redo.spec.ts          # Undo/redo across operations
│   └── code-view.spec.ts          # Code view shows valid schema
├── interactions/
│   ├── dashboard-filter.spec.ts   # Dashboard-level filter
│   ├── cross-filter.spec.ts       # Click chart → other widgets update
│   ├── drill-action.spec.ts       # Drill-to-detail behavior
│   └── state-persistence.spec.ts  # Saved filter/interaction state
├── integration/
│   ├── host-mount.spec.ts         # Mount in host app container
│   ├── multiple-instances.spec.ts # Two renderers on same page
│   ├── no-backend.spec.ts         # Verify no external API calls
│   └── bundle-size.spec.ts        # Bundle size regression check
└── workflows/
    ├── designer-to-renderer.spec.ts
    ├── import-export-cycle.spec.ts
    ├── metadata-to-dashboard.spec.ts
    ├── filter-cascade.spec.ts
    └── host-integration.spec.ts
```

---

## Screenshot Review Protocol

Screenshots are not just captured — they are **explicitly reviewed** at human checkpoints.

### Storage

```
screenshots/
├── phase-1/          # Renderer and chart screenshots
├── phase-2/          # Designer screenshots
├── phase-4/          # Interaction screenshots
├── phase-5/          # Responsive, theme, integration screenshots
└── baselines/        # Approved baseline screenshots for regression comparison
```

### Automated Comparison

- Playwright `toHaveScreenshot()` for pixel-diff regression
- Baseline screenshots committed to `screenshots/baselines/`
- Any diff > 1% threshold fails the test and requires human review

### Human Review Points

At every human checkpoint, the review includes:

1. Open `screenshots/phase-N/` in a file browser
2. Visually inspect each screenshot for layout correctness
3. Compare before/after pairs
4. Flag any visual issues as GitHub issues or `docs/testing/issues/`
5. Approve or reject the phase gate

---

## When Playwright Tests Are Written — Per-Task Mapping

This is the critical part. Tests are **not deferred**. Each development task has a paired test requirement:

### Phase 1

| Dev Task             | Test Task (same sprint)         | Test File                           |
| -------------------- | ------------------------------- | ----------------------------------- |
| 1.6 Runtime shell    | Renderer mounts empty           | `e2e/renderer/basic-render.spec.ts` |
| 1.10 ECharts wrapper | Chart renders with fixture data | `e2e/renderer/chart-types.spec.ts`  |
| 1.11 Line chart      | Line chart specific assertions  | `e2e/renderer/chart-types.spec.ts`  |
| 1.12 Bar chart       | Bar chart assertions            | same file                           |
| 1.13 Table           | Table column/row assertions     | same file                           |
| 1.14 KPI card        | KPI value/label assertions      | same file                           |
| 1.16 Dev app         | Full dev app loads, no errors   | `e2e/renderer/basic-render.spec.ts` |

### Phase 2

| Dev Task               | Test Task (same sprint)      | Test File                                    |
| ---------------------- | ---------------------------- | -------------------------------------------- |
| 2.1 Puck shell         | Designer loads empty         | `e2e/designer/editor-load.spec.ts`           |
| 2.2 Chart blocks       | Drag chart to canvas         | `e2e/designer/drag-drop.spec.ts`             |
| 2.5 Property panel     | Edit prop → widget updates   | `e2e/designer/property-edit.spec.ts`         |
| 2.6 Data model browser | Field picker shows fields    | `e2e/designer/field-binding.spec.ts`         |
| 2.9 Schema adapter     | Puck data → canonical → back | unit test + `e2e/designer/code-view.spec.ts` |
| 2.10 Import/export     | Round-trip JSON/YAML         | `e2e/designer/import-export.spec.ts`         |
| 2.12 Live preview      | Preview matches editor       | `e2e/designer/editor-load.spec.ts`           |
| 2.13 Undo/redo         | Ctrl+Z works across edits    | `e2e/designer/undo-redo.spec.ts`             |

### Phase 4

| Dev Task              | Test Task (same sprint)    | Test File                                    |
| --------------------- | -------------------------- | -------------------------------------------- |
| 4.1 Dashboard filters | Filter widget filters data | `e2e/interactions/dashboard-filter.spec.ts`  |
| 4.2 Cross-filtering   | Click bar → table updates  | `e2e/interactions/cross-filter.spec.ts`      |
| 4.4 Drill-to-detail   | Click → drill action fires | `e2e/interactions/drill-action.spec.ts`      |
| 4.6 State persistence | Reload → filters preserved | `e2e/interactions/state-persistence.spec.ts` |
