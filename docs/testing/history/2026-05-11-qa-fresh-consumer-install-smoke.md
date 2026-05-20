# QA Round: Fresh Consumer Install Smoke

- Date: 2026-05-11
- Scope: validate the documented runtime embedding path from a clean consumer host outside the repo examples, using packed local `@supersubset/*` artifacts and a minimal React + Vite host.
- Repo state: synced `develop` baseline plus the live-backend probe CORS fix from the earlier 2026-05-11 round.

## Why this round

The next highest-value test after the live backend-probe round was a true consumer-host install from scratch. The goal was to stop assuming that the monorepo examples cover the library distribution path and instead prove that a brand-new host app can install, build, and render `@supersubset/runtime` using published-package semantics.

## What was tested

1. Packed the distributable package artifacts for:
   - `@supersubset/runtime`
   - `@supersubset/charts-echarts`
   - `@supersubset/theme`
   - `@supersubset/schema`
   - `@supersubset/data-model`
2. Created a disposable React + Vite host under `tmp/` that:
   - installed those packed artifacts via `file:` tarball dependencies
   - created a widget registry with `registerEssentialWidgets(...)`
   - rendered `SupersubsetRenderer` with a small authored dashboard definition and host-owned fixture injection
3. Validated the external-host path with:
   - `corepack pnpm install --ignore-workspace`
   - `corepack pnpm build`
   - browser smoke via `vite preview` on `http://127.0.0.1:3216/`

## Bugs and findings

### 1. Scratch installs inside the repo require `pnpm install --ignore-workspace`

Running plain `pnpm install` from the disposable host directory was not a valid consumer-host check because pnpm walked up to the monorepo root and operated on the parent workspace instead of the scratch app itself.

This is not a product bug in Supersubset, but it is an important QA constraint for future install-from-scratch rounds when the temporary host lives inside this repository.

### 2. Fresh consumer render surfaced ECharts disposed-instance warnings

The first browser smoke passed visually, but the page logged repeated warnings:

`[ECharts] Instance ... has been disposed`

The warnings were emitted during `BaseChart` cleanup in `packages/charts-echarts/src/base/BaseChart.tsx` when listener teardown could still call `chart.off(...)` after the chart instance had already been disposed.

## Fix applied

Updated `BaseChart` cleanup to guard both `chart.dispose()` and `chart.off(...)` behind `isChartDisposed(...)`, so unmount and remount flows do not call ECharts APIs on a disposed instance.

Added a regression test in `packages/charts-echarts/test/base-chart-events.test.tsx` to verify that listener cleanup is skipped once the chart reports itself disposed.

## Validation evidence

- `corepack pnpm --filter @supersubset/charts-echarts test -- base-chart-events.test.tsx`
  - Passed: 10 tests
- Rebuilt and repacked `@supersubset/charts-echarts`
- Scratch host:
  - `corepack pnpm install --ignore-workspace --force`
  - `corepack pnpm build`
  - Passed
- Browser smoke:
  - `vite preview --host 127.0.0.1 --port 3216`
  - `Fresh Consumer Runtime Smoke` page loaded successfully
  - KPI widgets rendered expected values (`$428,000.00`, `6.8K`)
  - disposed-instance console warnings no longer reproduced after the fix

## Additional notes

- The scratch app production build emitted a Vite chunk-size warning (`index-*.js` slightly above 1 MB minified). This is not a release blocker for the smoke round, but it is a real signal that the default chart bundle remains heavy for a minimal consumer host.
- The round validated package consumption via packed artifacts, not npm registry publication. A later release-readiness round should repeat this against published packages or a registry-equivalent pack/install flow.

## Remaining high-value gaps

1. Validate a second real backend target with a different auth or endpoint contract.
2. Test multi-instance isolation with more than one renderer/designer surface on the same page.
3. Run a large-dashboard performance and memory round focused on bundle weight, chart lifecycle churn, and browser stability.
