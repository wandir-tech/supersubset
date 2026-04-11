# HC-9 — Checkpoint Brief: Release Readiness Review

> **Gate**: HC-9 — Human release readiness review
> **Phase**: 6 — Hardening
> **Prepared**: 2026-04-11

---

## Project Acceptance Criteria

| # | Criterion | Evidence | Status |
|---|-----------|----------|--------|
| 1 | Host React app can mount `<SupersubsetDesigner />` and save a dashboard definition | Both example apps mount designer; `onSave` emits `DashboardDefinition` | ✅ |
| 2 | Definition serializes to JSON and YAML without semantic differences | `e2e/workflows/import-export-cycle.spec.ts` round-trip test passes | ✅ |
| 3 | Host React app can mount `<SupersubsetRenderer />` and render the dashboard | Next.js example renders runtime-only; Vite example renders both modes | ✅ |
| 4 | Renderer executes queries through a pluggable adapter | Vite example uses host-owned `sql.js` adapter; Next.js uses fixture adapter | ✅ |
| 5 | Developer can point at Prisma schema and expose fields in designer | `packages/adapter-prisma/` (18 tests), `packages/cli/` introspection | ✅ |
| 6 | `npx supersubset import-schema` produces a working adapter from a DB schema | CLI workflow tests (34 tests); `e2e/workflows/metadata-to-dashboard.spec.ts` | ✅ |
| 7 | Chart property panels have Superset Explore–level configurability | 18 widget types with 104 per-chart property tests | ✅ |
| 8 | System works without Superset, Rill, or Lightdash servers | Network audit shows zero external requests (Plan D) | ✅ |
| 9 | Editor and runtime are independently shippable packages | Separate `packages/designer/` and `packages/runtime/`; Next.js imports only runtime | ✅ |
| 10 | Sample apps demonstrate end-to-end flow | `examples/nextjs-ecommerce/` + `examples/vite-sqlite/` | ✅ |
| 11 | Getting-started guide works from `npm init` to live dashboard | HC-8 passed (delegated preflight) | ✅ |
| 12 | Navigation APIs address page targets and anticipate dashboard targets | ADR-006; `NavigateTarget` schema; page navigation e2e tested | ✅ |
| 13 | Alerts widget renders data-driven tiles with semantic theme colors | AlertsWidget renders 3 severity levels with theme color override (19 tests) | ✅ |
| 14 | All browser test plans pass | Plan A+B: HC-7 ✅, Plan C: 7 screenshots ✅, Plan D: host verified ✅ | ✅ |
| 15 | Snyk security scan clean | ⏭ Skipped (Snyk MCP trust issue); no known vulnerabilities in first-party code | ⏭ |

---

## Test Summary

| Category | Count |
|----------|-------|
| Unit tests | 1,082 |
| E2E tests (Chromium) | 42 |
| **Total** | **1,124** |

All tests pass as of 2026-04-11.

---

## Bundle Sizes (Vite example)

- Total JS: 2.8 MB raw / **672 KB gzipped**
- Largest vendor chunks: ECharts (518K), Puck (~930K combined)
- First-party Supersubset code is a minor fraction of the bundle

---

## Package Sizes (dist/)

| Package | Size |
|---------|------|
| schema | 268K |
| runtime | 108K |
| designer | 412K |
| theme | 20K |
| charts-echarts | 276K |
| data-model | 24K |
| query-client | 16K |
| cli | 12K |
| adapters (4) | 16–20K each |

---

## What To Verify

1. **Run both examples** — `pnpm dev:nextjs-example` (port 3001) and `pnpm dev:vite-sqlite-example` (port 3002)
2. **Designer round-trip** — create/edit a widget, export JSON, re-import, verify no data loss
3. **Filter interaction** — change a filter dropdown, verify charts and SQL log update
4. **Theme toggle** — click "Switch to cool theme" in the Next.js example
5. **Responsive** — resize browser to mobile width, verify layout reflows
6. **Review docs** — skim `docs/getting-started.md` and `docs/api/README.md`

---

## How To Record Your Result

After review, create `docs/status/checkpoints/hc-9-result.md` with:
- **Verdict**: PASS / PASS WITH NOTES / FAIL
- **Notes**: anything that needs fixing before publish
- **Date**: review date
