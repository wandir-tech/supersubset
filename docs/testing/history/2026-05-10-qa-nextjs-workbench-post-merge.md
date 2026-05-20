# QA Round 4 — Post-Merge Host And Dev App Workflow Hardening

**Date**: 2026-05-10  
**Role**: Testing / browser-led workflow QA  
**Trigger**: Continued post-merge release-surface testing after the workbench sync fixes landed and the cleanup/history skill updates were merged  
**Worktrees**:

- `issue/qa-config-only-hosts` synced to `38ad046`
- `issue/qa-pages-filters-nav` synced to `0549db2`

## Scope

Extended real-workflow verification across the host-owned example surfaces and the dev-app authoring/runtime workflows after fast-forwarding the active QA branches to current `develop`.

## Host Workflow Coverage

- `e2e/workflows/host-integration.spec.ts` — `3 passed`
- `e2e/workflows/host-workbench.spec.ts` — `10 passed`

Verified behaviors:

- config-only host integration remains green on the synced baseline
- Next.js workbench login, persistence, publish/reload, and cross-tab sync flows remain green on the synced baseline

## Dev App Workflow Coverage

- `e2e/workflows/filter-cascade.spec.ts` — `8 passed`
- `e2e/workflows/designer-page-management.spec.ts` — `5 passed`
- `e2e/workflows/persistence-regression.spec.ts` — `2 passed`
- `e2e/workflows/designer-to-renderer.spec.ts` — `9 passed`
- `e2e/workflows/import-export-cycle.spec.ts` — `5 passed`
- `e2e/workflows/probe-metadata-paste.spec.ts` — `1 passed`
- `e2e/workflows/metadata-to-dashboard.spec.ts` — `3 passed`
- `e2e/workflows/backend-probe.spec.ts` — `8 passed`
- `e2e/workflows/alerts-widget.spec.ts` — `2 passed`
- `e2e/workflows/markdown-widget.spec.ts` — `1 passed`
- `e2e/workflows/designer-chart-matrix.spec.ts` — `33 passed`
- `e2e/interactions/dashboard-filter.spec.ts` — `9 passed`
- `e2e/visual/chart-header-layout.spec.ts` — `1 passed`
- `e2e/smoke.spec.ts` — `1 passed`
- `e2e/plan-a-designer-happy-path.spec.ts` — `7 passed`

Verified behaviors:

- shared filters and page navigation remain correct in the workbook demo
- page add/rename/delete flows remain correct in the designer
- import/export, persistence, and designer-to-viewer round-trips remain stable
- probe metadata onboarding, bearer/custom/login auth flows, basic probe error handling, CORS-style fetch failure handling, direct terminal endpoint compatibility, and preview-query execution remain green
- alerts, markdown, and chart-control/runtime-event workflows remain green
- placed filter-bar widgets, filter state sharing, and live filter-driven KPI/table changes remain green
- chart-header visual layout regression remains stable against the screenshot baseline
- the smoke surface and the automated designer happy-path browser plan both remain green on the synced baseline

## False Alarms Resolved During The Pass

Two failures reproduced immediately after fast-forwarding the QA worktrees to `develop`, but both were stale-build issues rather than fresh product regressions:

1. `host-workbench.spec.ts` initially failed on title/publish persistence expectations because the Next.js example was still consuming stale `@supersubset/designer` build output.
2. `filter-cascade.spec.ts` initially failed on chart-click page navigation because the dev app was still consuming stale `@supersubset/runtime` / `@supersubset/charts-echarts` build output.

Recovery that restored the expected behavior:

- rebuild the affected workspace packages before trusting browser results after a fast-forward
- restart the consuming dev server after rebuilds
- clear `examples/nextjs-ecommerce/.next` before restarting the Next.js example when workbench behavior stays stale

## Durable QA Notes

- Freshly synced worktrees can look regressed until consumed workspace packages are rebuilt from `dist/*`.
- For host testing, the quickest discriminator is often: rebuild the owning package, restart the example, rerun the narrowest previously failing workflow.
- Generated `examples/nextjs-ecommerce/next-env.d.ts` noise still appears during Next.js runs and should not be treated as a product change.

## Remaining Gaps

- The main remaining browser gap is deeper probe/live-backend variation against an actual backend surface, especially real cross-origin behavior and contract drift outside the current mocked endpoints.
- Capture a later dated history entry if this turns into another distinct multi-round QA campaign rather than a continuation of the current post-merge sweep.
