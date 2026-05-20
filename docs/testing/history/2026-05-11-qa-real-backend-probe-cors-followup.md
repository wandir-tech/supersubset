# QA Round 8 — Real Backend Probe CORS Follow-Up On Synced Develop

**Date**: 2026-05-11  
**Role**: Testing / browser-led real backend probe follow-up  
**Trigger**: approved shift from mocked probe edge cases to live backend validation, then fast-forwarded the main repo branch to current `origin/develop`

## Repo State

- main repo branch `issue/cleanup-designer-shell-header-20260511` fast-forwarded from `e6e9d7d` to `25189a9`
- default dev env ports were unavailable because another local project already owned `3000`, so this round used `WorktreeDevEnv` leased ports instead
- leased URLs for this round:
  - dev app: `http://localhost:3113`
  - Next.js example: `http://localhost:3114`
  - Next.js workbench: `http://localhost:3114/workbench`
  - Vite + SQLite example: `http://localhost:3115`

## Scope

Validate the backend probe against a real local backend surface instead of mocked `page.route(...)` endpoints. The selected target was the Next.js workbench host because it already exposes the exact probe-compatible seams:

- `POST /api/graphql` for login
- `GET /api/analytics/supersubset/datasets` for discovery
- `POST /api/analytics/supersubset/query` for preview queries

## Coverage

- `e2e/workflows/backend-probe.spec.ts`
  - added one real-backend regression that points the dev-app probe UI at the Next.js workbench host over cross-origin browser requests
- `e2e/workflows/host-workbench.spec.ts`
  - rerun after the backend fix because it exercises the same API routes from the same host surface

Validated behaviors:

- the dev-app probe can now log in against the real Next.js workbench GraphQL endpoint from a different origin
- the same probe session can discover datasets from the real host-owned analytics endpoint
- importing a workbench-shaped dashboard now triggers a live preview query against the real query endpoint and returns grouped rows successfully
- the existing workbench host browser coverage remains green after the backend change

## Bug Found

The first live probe attempt failed before the designer loaded. Manual browser verification showed the actual blocker:

- `http://localhost:3113` -> dev-app probe
- `http://localhost:3114` -> Next.js workbench backend
- browser error: cross-origin `POST /api/graphql` was blocked because the response did not include `Access-Control-Allow-Origin`

This was not visible in the mocked probe suite because mocked `page.route(...)` coverage never exercised a real browser preflight. The same missing-CORS bug would also block cross-origin probe discovery/query requests that carry `Authorization` headers.

## Fix Applied

- added `examples/nextjs-ecommerce/lib/dev-cors.ts`
- wired the helper into:
  - `examples/nextjs-ecommerce/pages/api/graphql.ts`
  - `examples/nextjs-ecommerce/pages/api/analytics/supersubset/datasets.ts`
  - `examples/nextjs-ecommerce/pages/api/analytics/supersubset/query.ts`

The helper allows local browser-origin probe traffic from `localhost` and `127.0.0.1`, answers `OPTIONS` preflights, and exposes the headers needed for JSON and bearer-token requests.

## Validation Notes

- targeted validation first:
  - `e2e/workflows/backend-probe.spec.ts --grep "connects to the real Next.js workbench backend and runs a live preview query"`
  - result after fix: `1 passed`
- broader regression next:
  - `e2e/workflows/backend-probe.spec.ts`
  - `e2e/workflows/host-workbench.spec.ts`
  - result: `24 passed`

## Remaining Gaps

- fresh consumer-host install-from-scratch coverage is still pending
- multi-instance isolation is still unverified in a live browser round
- large-dashboard performance and memory testing is still pending
- probe validation still needs at least one non-Next.js real backend with slightly noncanonical contracts or auth behavior
