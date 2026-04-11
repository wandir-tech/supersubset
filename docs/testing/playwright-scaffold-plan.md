# Supersubset — Playwright Scaffold Plan

> **Task**: 0.14 — Browser Test Strategy  
> **Status**: Finalized  
> **Author**: Testing Agent  
> **Date**: 2026-04-08

---

## 1. Playwright Project Configuration

### `playwright.config.ts` (monorepo root)

The Playwright configuration lives at the monorepo root to access all packages and the dev app.

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['html', { outputFolder: 'e2e/playwright-report' }], ['github']]
    : [['html', { outputFolder: 'e2e/playwright-report' }]],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /responsive|mobile/,
    },
  ],

  webServer: {
    command: 'pnpm --filter dev-app dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },

  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
});
```

### Key decisions

| Decision | Rationale |
|----------|-----------|
| Config at monorepo root | Single `pnpm test:e2e` entry point; accesses `packages/dev-app` via `webServer` |
| Chromium + Firefox only | WebKit adds CI cost with minimal user base benefit; add later in Phase 5 |
| Mobile Chrome project | Scoped to responsive-tagged tests only; avoids running all tests on mobile viewport |
| 2 retries in CI | Handles transient ECharts rendering timing issues |
| 2 workers in CI | Balances speed vs determinism on standard CI runners |
| `trace: on-first-retry` | Captures Playwright traces only when needed, keeps artifacts small |
| 1% pixel diff threshold | Tight enough to catch regressions, loose enough for anti-aliasing differences |

---

## 2. Test Fixture Architecture

### Directory layout

```
e2e/
├── fixtures/
│   ├── dashboards/
│   │   ├── four-widget-dashboard.json     # Canonical: line, bar, table, KPI
│   │   ├── four-widget-dashboard.yaml     # Same content in YAML
│   │   ├── empty-dashboard.json           # Valid schema, zero widgets
│   │   ├── single-chart-dashboard.json    # Minimal: one line chart
│   │   ├── large-dashboard.json           # 20+ widgets for stress tests
│   │   └── malformed/
│   │       ├── missing-version.json       # Missing schemaVersion
│   │       ├── invalid-widget-type.json   # Unrecognized widget type
│   │       ├── broken-bindings.json       # References non-existent fields
│   │       └── garbage.json               # Not valid JSON structure
│   ├── metadata/
│   │   ├── prisma-schema.prisma           # Sample e-commerce Prisma model
│   │   ├── normalized-model.json          # Pre-normalized metadata model
│   │   └── field-catalog.json             # Flat field list with types
│   └── query-results/
│       ├── sales-by-month.json            # Time-series data (line chart)
│       ├── products-by-category.json      # Categorical data (bar chart)
│       ├── orders-table.json              # Tabular data (table widget)
│       ├── revenue-kpi.json               # Single aggregate (KPI card)
│       └── empty-result.json              # Zero rows
├── helpers/
│   ├── dev-app.ts                         # Dev app lifecycle (health check, wait-for-ready)
│   ├── fixtures.ts                        # Load/parse fixture files
│   ├── screenshot.ts                      # Screenshot naming + baseline path helpers
│   ├── schema-assertions.ts               # Zod-based schema validation in tests
│   ├── widget-locators.ts                 # Page object locators for widgets
│   └── mock-adapter.ts                    # Route interception for mock query responses
```

### Fixture dashboard (`four-widget-dashboard.json`)

This is the primary test fixture. It represents a canonical `DashboardDefinition` with:
- 1 line chart (sales over time, x = `order_date`, y = `revenue`)
- 1 bar chart (products by category, x = `category`, y = `count`)
- 1 table (order details, columns: `id`, `customer`, `amount`, `date`)
- 1 KPI card (total revenue, measure = `sum(revenue)`)
- 1 dashboard-level filter (bound to `category` dimension)

The fixture is authored by hand (not generated) against the canonical schema v0 once it is finalized in task 0.20. A placeholder structure will be created in task 0.22 and updated as the schema solidifies.

### Mock adapter strategy

Tests use Playwright's `page.route()` to intercept query adapter requests and return fixture data:

```ts
// e2e/helpers/mock-adapter.ts
import type { Page } from '@playwright/test';
import salesByMonth from '../fixtures/query-results/sales-by-month.json';

export async function mockQueryAdapter(page: Page) {
  await page.route('**/api/query/**', async (route) => {
    const url = new URL(route.request().url());
    const queryId = url.searchParams.get('id');
    const fixtures: Record<string, unknown> = {
      'sales-by-month': salesByMonth,
      // ... other fixtures
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixtures[queryId ?? ''] ?? { rows: [] }),
    });
  });
}
```

If the dev app uses an in-process adapter (no HTTP), tests will instead inject fixture data via the dev app's adapter configuration props. The mock adapter helper will support both modes.

### Widget locators (page objects)

```ts
// e2e/helpers/widget-locators.ts
import type { Page, Locator } from '@playwright/test';

export class WidgetLocators {
  constructor(private page: Page) {}

  widget(id: string): Locator {
    return this.page.locator(`[data-widget-id="${id}"]`);
  }

  chartCanvas(widgetId: string): Locator {
    return this.widget(widgetId).locator('canvas');
  }

  tableRows(widgetId: string): Locator {
    return this.widget(widgetId).locator('tbody tr');
  }

  kpiValue(widgetId: string): Locator {
    return this.widget(widgetId).locator('[data-testid="kpi-value"]');
  }

  designerPalette(): Locator {
    return this.page.locator('[data-testid="widget-palette"]');
  }

  designerCanvas(): Locator {
    return this.page.locator('[data-testid="designer-canvas"]');
  }

  propertyPanel(): Locator {
    return this.page.locator('[data-testid="property-panel"]');
  }
}
```

**Requirement for dev app / runtime / designer**: All interactive elements must have `data-testid` or `data-widget-id` attributes. This is a non-negotiable prerequisite documented in section 4 below.

---

## 3. Dev App Requirements for E2E Testing

The dev app (`packages/dev-app/`) must satisfy these requirements so Playwright can test against it:

### 3.1 Routes

| Route | Purpose | Available from |
|-------|---------|----------------|
| `/` | Renderer: loads `four-widget-dashboard.json` fixture | Phase 1 (task 1.16) |
| `/renderer` | Renderer: accepts `?fixture=<name>` query param | Phase 1 (task 1.16) |
| `/renderer/empty` | Renderer: empty dashboard (zero widgets) | Phase 1 |
| `/designer` | Designer: empty editor state | Phase 2 (task 2.1) |
| `/designer?load=<name>` | Designer: pre-loaded with named fixture | Phase 2 |
| `/integration/host-mount` | Host integration: simulates host app mounting | Phase 5 (task 5.5) |
| `/integration/multi-instance` | Two renderer instances on one page | Phase 5 |

### 3.2 Data attributes

All Supersubset React components must include testability attributes:

```
data-testid="widget-palette"         — Designer widget palette
data-testid="designer-canvas"        — Designer drop target canvas
data-testid="property-panel"         — Designer property editor panel
data-testid="code-view"              — Designer code view panel
data-testid="filter-bar"             — Dashboard filter bar
data-testid="export-json-btn"        — Export JSON button
data-testid="export-yaml-btn"        — Export YAML button
data-testid="import-btn"             — Import button
data-widget-id="{widget.id}"         — Each rendered widget container
data-widget-type="{widget.type}"     — Widget type identifier
data-testid="kpi-value"              — KPI card value display
data-testid="loading-indicator"      — Loading state indicator
data-testid="error-state"            — Error state container
data-testid="empty-state"            — Empty data state container
```

### 3.3 Adapter configuration

The dev app must support a **fixture adapter** that:
1. Returns pre-defined query results from `e2e/fixtures/query-results/`
2. Can simulate delays (for loading state tests)
3. Can simulate errors (for error state tests)
4. Requires zero network requests

Configuration via environment variable or query parameter:
```
VITE_ADAPTER_MODE=fixture      # Use fixture adapter
VITE_ADAPTER_DELAY=0           # Default: no delay
VITE_ADAPTER_ERROR=false       # Default: no errors
```

### 3.4 Vite dev server

- Port: `5173` (Vite default, referenced in Playwright config `baseURL`)
- Hot reload must not break Playwright tests in progress (tests use `webServer.reuseExistingServer`)
- Dev app must boot in < 10s for CI `webServer.timeout`

---

## 4. Phased Test Rollout

Tests are written **with** each feature, not after. This section maps which test files are created in which phase, aligned with the master plan task graph.

### Phase 0 — Scaffold only (task 0.22)

| File | Content |
|------|---------|
| `e2e/playwright.config.ts` | Configuration per section 1 |
| `e2e/fixtures/` | Directory structure + placeholder fixture files |
| `e2e/helpers/dev-app.ts` | Health-check helper (waits for dev app) |
| `e2e/helpers/fixtures.ts` | Fixture loader |
| `e2e/helpers/screenshot.ts` | Screenshot naming utility |
| `e2e/helpers/widget-locators.ts` | Page object stub |
| `e2e/helpers/mock-adapter.ts` | Mock adapter stub |
| `e2e/helpers/schema-assertions.ts` | Schema validation stub |
| `e2e/renderer/.gitkeep` | Placeholder |
| `e2e/designer/.gitkeep` | Placeholder |
| `e2e/interactions/.gitkeep` | Placeholder |
| `e2e/integration/.gitkeep` | Placeholder |
| `e2e/workflows/.gitkeep` | Placeholder |

No runnable tests yet — just the harness.

### Phase 1 — Renderer & Chart Tests

| Task | Test file created | Test scope |
|------|-------------------|------------|
| 1.6 | `e2e/renderer/basic-render.spec.ts` | Renderer mounts, no console errors, empty dashboard renders placeholder |
| 1.11 | `e2e/renderer/chart-types.spec.ts` | Line chart renders from fixture, canvas present, no errors |
| 1.12 | (same file) | Bar chart renders from fixture |
| 1.13 | (same file) | Table renders with correct row/column count |
| 1.14 | (same file) | KPI card shows value and label |
| 1.16 | `e2e/renderer/basic-render.spec.ts` (extended) | Full dev app loads fixture dashboard, all 4 widgets visible |

**Phase 1 also produces**:
- `e2e/renderer/loading-states.spec.ts` — skeleton/spinner during adapter delay
- `e2e/renderer/responsive.spec.ts` — viewport resize test stub (filled in Phase 5)

### Phase 2 — Designer Tests

| Task | Test file created | Test scope |
|------|-------------------|------------|
| 2.1 | `e2e/designer/editor-load.spec.ts` | Designer mounts empty, palette visible, no errors |
| 2.2 | `e2e/designer/drag-drop.spec.ts` | Drag chart block from palette to canvas, widget appears |
| 2.5 | `e2e/designer/property-edit.spec.ts` | Select widget, edit property, widget updates |
| 2.7 | `e2e/designer/field-binding.spec.ts` | Open field picker, bind field to axis, chart updates |
| 2.11 | `e2e/designer/import-export.spec.ts` | Export JSON, export YAML, import JSON, compare |
| 2.12 | `e2e/designer/code-view.spec.ts` | Code view shows valid canonical JSON, edits sync |
| 2.14 | `e2e/designer/undo-redo.spec.ts` | Add widget → undo → widget removed → redo → widget back |
| 2.17 | `e2e/workflows/designer-to-renderer.spec.ts` | Full workflow: create in designer → save → load in renderer |
| 2.18 | `e2e/workflows/import-export-cycle.spec.ts` | Create → export JSON → export YAML → import both → compare |

### Phase 3 — Adapter Tests (unit only, no new E2E)

Phase 3 adapters are tested via Vitest unit/integration tests in each `packages/adapter-*/test/` directory. One E2E workflow test validates the end-to-end chain:

| Task | Test file created | Test scope |
|------|-------------------|------------|
| 3.7 | `e2e/workflows/metadata-to-dashboard.spec.ts` | Load Prisma fixture → browse fields → bind → render |

### Phase 4 — Interaction Tests

| Task | Test file created | Test scope |
|------|-------------------|------------|
| 4.1 | `e2e/interactions/dashboard-filter.spec.ts` | Add filter, select value, all widgets update |
| 4.2 | `e2e/interactions/cross-filter.spec.ts` | Click bar chart → line chart + table filter |
| 4.5 | `e2e/interactions/drill-action.spec.ts` | Click data point → drill callback fires |
| 4.7 | `e2e/interactions/state-persistence.spec.ts` | Apply filter → reload → filter state preserved |
| 4.9 | `e2e/workflows/filter-cascade.spec.ts` | 3 cascading filters → apply → clear → verify |

### Phase 5 — Integration & Hardening Tests

| Task | Test file created | Test scope |
|------|-------------------|------------|
| 5.7 | `e2e/workflows/host-integration.spec.ts` | Mount in host → save → remount renderer → verify |
| 5.7 | `e2e/integration/host-mount.spec.ts` | Component mounts in host container |
| 5.7 | `e2e/integration/multiple-instances.spec.ts` | Two renderers coexist |
| 5.7 | `e2e/integration/no-backend.spec.ts` | No external network requests |
| 5.8 | `e2e/integration/bundle-size.spec.ts` | Bundle size within thresholds |
| 5.2 | Plan C regression tests integrated into existing spec files | Edge cases + robustness |
| 5.8 | `e2e/renderer/responsive.spec.ts` (filled in) | Desktop → tablet → mobile viewports |

---

## 5. CI Integration Plan

### GitHub Actions workflow: `e2e.yml`

```yaml
name: E2E Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps chromium firefox
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: e2e/playwright-report/
          retention-days: 14
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: e2e/test-results/
          retention-days: 7
```

### `package.json` scripts (root)

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:update-snapshots": "playwright test --update-snapshots",
    "test:e2e:report": "playwright show-report e2e/playwright-report"
  }
}
```

### Execution model

| Trigger | Projects | Workers | Retries |
|---------|----------|---------|---------|
| PR | chromium only | 2 | 2 |
| Push to main | chromium + firefox | 2 | 2 |
| Manual (release) | chromium + firefox + mobile-chrome | 1 | 0 |

**PR optimization**: Only run chromium in PRs to keep CI fast. Full browser matrix runs on `main` merges.

### Artifact retention

| Artifact | When uploaded | Retention |
|----------|-------------|-----------|
| HTML report | Always | 14 days |
| Playwright traces | On failure | 7 days |
| Screenshot diffs | On failure | 14 days |

---

## 6. Screenshot Comparison Strategy

### Two modes of screenshots

| Mode | Tool | Purpose | Storage |
|------|------|---------|---------|
| **Regression baselines** | Playwright `toHaveScreenshot()` | Automated pixel-diff in CI | `e2e/__screenshots__/` (gitignored selectively) |
| **Milestone evidence** | Chrome MCP | Human-reviewable proof at checkpoints | `screenshots/phase-N/` (committed to git) |

### Regression baselines (`toHaveScreenshot()`)

**Baseline location**: `e2e/__screenshots__/{testFilePath}/{snapshotName}.png`  
(Configured via `snapshotPathTemplate` in `playwright.config.ts`)

**Baseline management workflow**:
1. Developer writes test with `await expect(page).toHaveScreenshot('chart-rendered.png')`
2. First run: `pnpm test:e2e:update-snapshots` creates baseline image
3. Baseline committed to git
4. Subsequent runs compare against baseline
5. If diff > 1% pixel ratio → test fails
6. Developer reviews diff in HTML report → either fixes regression or updates baseline

**Baseline update protocol**:
- Only update baselines intentionally: `pnpm test:e2e:update-snapshots`
- Baseline update commits must include a justification in the commit message
- PR reviewers must inspect baseline diffs before approving
- Never auto-update baselines in CI

**Diff thresholds**:

| Content type | `maxDiffPixelRatio` | Rationale |
|-------------|---------------------|-----------|
| Chart rendering | 0.01 (1%) | Anti-aliasing + font rendering variance |
| Layout structure | 0.005 (0.5%) | Tighter — layout shifts are always bugs |
| Full page | 0.01 (1%) | Balanced for overall stability |

Per-assertion overrides are allowed:
```ts
await expect(page).toHaveScreenshot('layout.png', {
  maxDiffPixelRatio: 0.005,
});
```

**Animation handling**: `animations: 'disabled'` in config ensures ECharts entry animations don't cause flaky diffs.

### Milestone screenshots (Chrome MCP)

These are NOT used for automated comparison — they are visual evidence for human checkpoint reviews.

| Phase | Screenshots captured | Naming convention |
|-------|---------------------|-------------------|
| 1 | First chart render, all 4 types | `screenshots/phase-1/charts-first-render.png` |
| 2 | Empty designer, drag-drop before/after, property edit, full dashboard, round-trip | `screenshots/phase-2/{descriptive-name}.png` |
| 4 | Cross-filter before/after | `screenshots/phase-4/cross-filter-{before,after}.png` |
| 5 | Responsive (desktop/tablet/mobile), dark theme, host integration | `screenshots/phase-5/{descriptive-name}.png` |

**Protocol**: The testing agent captures these using Chrome MCP at the milestone moment, commits them to `screenshots/`, and references them in the human checkpoint brief (`docs/status/checkpoints/hc-N-brief.md`).

### `.gitignore` additions

```gitignore
# Playwright artifacts (not committed)
e2e/test-results/
e2e/playwright-report/

# Screenshot baselines ARE committed (do NOT gitignore)
# e2e/__screenshots__/

# Milestone screenshots ARE committed
# screenshots/
```

---

## 7. Dependencies

### npm packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@playwright/test` | `^1.50` | Test framework + assertions + runner |

That's it. Playwright bundles its own browser binaries, expect library, and reporter. No additional test dependencies are needed.

### pnpm workspace integration

Playwright is installed at the **monorepo root** (not in any individual package):

```json
// root package.json (devDependencies)
{
  "@playwright/test": "^1.50"
}
```

### Browser installation

```bash
# Local development
pnpm exec playwright install chromium firefox

# CI (includes system deps)
pnpm exec playwright install --with-deps chromium firefox
```

### Dev app dependencies (prerequisites, not Playwright deps)

The dev app must be buildable and servable before E2E tests run. This means:
- `packages/dev-app` depends on `packages/runtime`, `packages/schema`, `packages/charts-echarts`
- The `webServer` config in Playwright handles starting the dev app
- `pnpm build` must succeed before `pnpm test:e2e`

---

## Appendix: Test File ↔ Test Plan Traceability

Each browser test plan maps to specific Playwright spec files:

| Test Plan | Playwright Coverage |
|-----------|-------------------|
| [Plan A — Designer Happy Path](browser-test-plans/plan-a-designer-happy-path.md) | `e2e/designer/*.spec.ts` + `e2e/workflows/designer-to-renderer.spec.ts` + `e2e/workflows/import-export-cycle.spec.ts` |
| [Plan B — Renderer Happy Path](browser-test-plans/plan-b-renderer-happy-path.md) | `e2e/renderer/*.spec.ts` + `e2e/interactions/*.spec.ts` |
| [Plan C — Regression & Robustness](browser-test-plans/plan-c-regression-robustness.md) | Assertions distributed across existing spec files + `e2e/renderer/responsive.spec.ts` |
| [Plan D — Host Integration](browser-test-plans/plan-d-host-integration.md) | `e2e/integration/*.spec.ts` + `e2e/workflows/host-integration.spec.ts` |

Plan C regression scenarios are **not** a separate test suite — they are woven into existing spec files as edge-case assertions (malformed input in import tests, error states in render tests, etc.).

---

## Appendix: Relationship to Verification Strategy

This scaffold plan implements the Playwright-specific portions of the [Verification Strategy](verification-strategy.md). The verification strategy remains the authoritative document for:
- Layer definitions (unit → E2E → Chrome MCP → acceptance workflows)
- Per-task test requirements
- Screenshot review protocol
- Human checkpoint gates

This document adds the concrete **how**: configuration, fixtures, CI, baselines, and dependencies.
