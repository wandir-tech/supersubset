# QA Round 5 — Backend Probe Follow-Up On Synced Develop

**Date**: 2026-05-11  
**Role**: Testing / browser-led probe follow-up  
**Trigger**: PR #146 merged, then `issue/qa-pages-filters-nav` was fast-forwarded to current `origin/develop` to continue probe testing on the new baseline

## Worktree State

- `issue/qa-pages-filters-nav` fast-forwarded from `29f1490` to `3d0eee0`
- worktree packages rebuilt with `corepack pnpm -r build`
- leased DevEnv port tuple:
  - dev app `http://localhost:3111`
  - Next.js example `http://localhost:3113`
  - Vite + SQLite example `http://localhost:3114`

## Scope

Validate that the merged backend-probe coverage still passes on synced `develop`, then extend the same probe slice into preview-query fallback behavior without widening into unrelated workflows.

## Coverage

- `e2e/workflows/backend-probe.spec.ts` — `10 passed`

Validated behaviors:

- bearer auth, custom auth header, and login token exchange still work on synced `develop`
- login failure, empty discovery, and metadata fetch failure still surface the expected probe-form errors
- direct terminal endpoint compatibility for `/datasets` and `/query` still works
- preview-query execution via pasted metadata plus explicit query URL still reaches live data
- preview-query empty results now surface `Empty result (falling back to sample data)` while leaving the designer open
- preview-query HTTP failures now surface `Failed (falling back to sample data)` plus the backend error message while leaving the designer open

## Validation Notes

- Rebuilt the synced worktree before rerunning browser checks to avoid stale-package false alarms.
- Re-ran the committed 8-test backend-probe suite on `develop` first; it stayed green.
- Added the two new preview fallback regressions and reran the same spec; result was `10 passed (5.3s)`.

## Remaining Gaps

- The main remaining probe gap is still live backend behavior outside mocked endpoints: real cross-origin browser behavior, auth/session quirks, and contract drift from actual backend implementations.
- If that next round exercises a real backend surface rather than mocked routes, capture it in another dated history entry instead of extending this one.
