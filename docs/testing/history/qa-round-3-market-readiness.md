# QA Round 3 — Market Readiness Campaign Kickoff

**Date**: 2026-05-02  
**Role**: Orchestrator  
**Branch**: `issue/market-readiness-orchestrator`

## Purpose

This entry is the repo-tracked source of truth for the market-readiness campaign.

The triggering signal was a human-found dropdown/filter configuration miss. The campaign does not assume that issue is the only blocker. It treats that miss as a tracer bullet for a broader release-blocker hunt across the highest-risk Supersubset workflows.

## Release Standard

Supersubset is not ready for market until:

- all campaign-found critical and high severity issues are fixed, reviewed by a human, and merged into `develop`
- medium severity issues are triaged with owners and explicit follow-up
- release-gate evidence is refreshed with focused browser proof plus full repo validation

## Campaign Scope

The campaign targets the workflows most likely to hide release-stopping defects:

1. Host-owned filtering and query refresh in real host examples
2. Authoring to publish/import to viewer round-trip
3. Import/export robustness and schema survivability
4. Cross-filter, drill, and page-management flows
5. Probe and live-backend onboarding behavior
6. Multi-instance isolation, theming, and responsive integrity
7. Large-dashboard performance and memory stability
8. Docs-following first-use onboarding from a clean shell

The authored filter incident remains the first tracer bullet, not the only target.

## Test Beds

- `examples/vite-sqlite` is the primary deterministic BI environment
- `examples/nextjs-ecommerce` workbench is the auth/query contract environment
- `packages/dev-app` is the rich authoring and reproduction surface

## Execution Phases

### Phase 0 — Orchestrator setup

- create isolated worktrees from fresh `origin/develop`
- reserve explicit local port tuples for browser validation
- keep hot files single-writer
- use this file as the canonical cross-tool plan artifact

### Phase 1 — Testing skill hardening

- update `.github/skills/testing-strategy/SKILL.md`
- update `.github/skills/browser-testing/SKILL.md`
- require semantic BI assertions, not just control-state or screenshot proof

### Phase 2 — BI visualization quality guidance

- add a new BI visualization quality skill grounded in Data-to-Viz, Claus Wilke, and Tableau guidance
- thread it into testing strategy, browser testing, and release-check docs

### Phase 3 — History and browser-plan refresh

- update testing history and add any new browser-plan artifacts needed for repeatable release checks

### Phase 4 — Blocker discovery sweep

- run a market-critical sweep across the primary test beds
- collect browser evidence, query-log evidence, and console/network evidence
- convert reproduced blockers into issues immediately

### Phase 5 — Observability augmentation

- add stable test ids, query-log hooks, explicit fixtures, and reset/versioning helpers only where needed to prove failures clearly
- preserve the host-owned contract unless the product contract itself is proven wrong

### Phase 6 — Coverage closure

- tighten low-level tests where coverage stops at state, serialization, or smoke presence
- add or extend Playwright workflows for every release-critical class exposed by discovery

### Phase 7 — Parallel blocker dispatch

- every reproduced critical/high blocker that survives initial triage gets a GitHub issue
- the orchestrator dispatches bounded subagents in parallel, each with its own worktree, branch, file scope, leased ports, and acceptance criteria
- each subagent is expected to return a PR-ready branch targeting `develop`
- human review and merge remain mandatory

### Phase 8 — Reconciliation

- rebase and sequence branches that overlap on shared `e2e/**` files or other hot surfaces
- rerun the narrowest affected checks after each merge-order change

### Phase 9 — Final release gate

- rerun focused package and browser checks
- rerun `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:e2e`
- refresh HC-9 style evidence before declaring readiness

## Parallel Blocker Dispatch Matrix

### Authored filter design or serialization defect

- agent: `designer`
- branch: `issue/filter-authoring-gap-designer`
- worktree: `../supersubset-issue-filter-authoring-designer`
- may modify: `packages/designer/**`, `packages/dev-app/**`, `packages/designer/test/**`
- must not modify: `packages/runtime/**`, `e2e/**`, `examples/**`, root hot files

### Runtime filter propagation or callback contract defect

- agent: `runtime`
- branch: `issue/filter-runtime-contract`
- worktree: `../supersubset-issue-filter-runtime`
- may modify: `packages/runtime/**`, `packages/runtime/test/**`, minimal `packages/dev-app/**` if required for repro
- must not modify: `packages/designer/**`, `e2e/**`, `examples/**`, root hot files

### Deterministic BI host defect in Vite SQLite

- agent: `testing`
- branch: `issue/filter-host-vite-sqlite`
- worktree: `../supersubset-issue-filter-vite-sqlite`
- may modify: `examples/vite-sqlite/**`, `e2e/workflows/**`, `e2e/interactions/**`, `docs/testing/browser-test-plans/**`
- must not modify: `packages/designer/**`, `packages/runtime/**`, root hot files

### Auth/query contract defect in Next.js workbench

- agent: `testing`
- branch: `issue/filter-host-nextjs-workbench`
- worktree: `../supersubset-issue-filter-nextjs-workbench`
- may modify: `examples/nextjs-ecommerce/**`, `e2e/workflows/**`, `docs/testing/browser-test-plans/**`
- must not modify: `packages/designer/**`, `packages/runtime/**`, root hot files

### Coverage hole without a proven product defect

- agent: `testing`
- branch: `issue/filter-e2e-gap`
- worktree: `../supersubset-issue-filter-e2e`
- may modify: `e2e/**`, `docs/testing/**`, `screenshots/**`
- must not modify: `packages/**`, `examples/**`, root hot files

### Testing playbook or BI-quality guidance gap

- agent: orchestrator or bounded docs-only subagent
- branch: `issue/testing-playbook-hardening`
- worktree: `../supersubset-issue-testing-playbook`
- may modify: `.github/skills/**`, `docs/testing/**`, `docs/status/checkpoints/**`
- must not modify: `packages/**`, `examples/**`, `e2e/**` except for doc-only references

## Exact Blocker Brief Templates

### Template: Authored filter design or serialization defect

- agent: `designer`
- scope: fix authored filter creation, editing, filter-bar configuration, or designer-side round-trip defects
- expected outputs: PR-ready branch, focused designer tests, concise before/after behavior note
- non-goals: runtime contract redesign, host-query logic changes, unrelated broad `e2e/**` work
- acceptance: filter definitions and `FilterBarBlock` config survive create/edit/publish/import with regression coverage

### Template: Runtime filter propagation or callback contract defect

- agent: `runtime`
- scope: fix defects where authored filters, `onFilterChange`, `activeFilters`, or runtime controls violate the documented contract
- expected outputs: PR-ready branch, focused runtime validation, explicit note about contract preservation or change
- non-goals: designer authoring fixes, example-specific business logic rewrites, broad Playwright work
- acceptance: runtime emits the right filter state and preserves the host-owned model unless escalation was explicitly approved

### Template: Vite SQLite host query or render defect

- agent: `testing`
- scope: reproduce in `examples/vite-sqlite/**`, add only the observability hooks required, and tighten the smallest relevant workflow test
- expected outputs: PR-ready branch, targeted Playwright evidence, query-log before/after proof
- non-goals: speculative runtime or designer refactors, unrelated workbench changes
- acceptance: host action changes SQLite query inputs and visible dashboard output deterministically

### Template: Next.js workbench auth or query contract defect

- agent: `testing`
- scope: reproduce in `examples/nextjs-ecommerce/**`, fix the smallest auth/session/query path needed, and tighten the narrowest workflow
- expected outputs: PR-ready branch, targeted Playwright evidence showing payload/query mutation plus visible viewer change
- non-goals: broad designer/runtime rewrites, SQLite example edits
- acceptance: workbench stays auth-correct, query-correct, and visually correct through the failing journey

### Template: Coverage hole with no product defect proven yet

- agent: `testing`
- scope: modify `e2e/**`, `docs/testing/**`, and `screenshots/**` only
- expected outputs: PR-ready branch, strengthened workflow or browser plan, proof that the new check owns the previously unguarded behavior
- non-goals: speculative product fixes or package changes
- acceptance: the missing release-critical behavior is now covered by a repeatable check

### Template: Testing playbook or BI-visualization guidance gap

- agent: orchestrator or docs-only bounded subagent
- scope: modify `.github/skills/**`, `docs/testing/**`, and checkpoint docs only
- expected outputs: PR-ready branch, linked skill/docs updates, concise summary of the new required evidence
- non-goals: product code changes, broad E2E rewrites beyond reference updates
- acceptance: the missing rule is explicit, linked, and reflected in release-gate docs

## Merge-Order Table

- `issue/testing-playbook-hardening` with any other branch: parallel-safe
- `issue/filter-authoring-gap-designer` with `issue/filter-runtime-contract`: parallel-safe unless both touch `packages/dev-app/**`
- `issue/filter-authoring-gap-designer` with `issue/filter-e2e-gap`: merge designer first if new test hooks are required
- `issue/filter-runtime-contract` with `issue/filter-e2e-gap`: merge runtime first when E2E asserts new runtime behavior
- `issue/filter-host-vite-sqlite` with `issue/filter-host-nextjs-workbench`: parallel-safe if `e2e/**` files do not overlap
- `issue/filter-host-vite-sqlite` with `issue/filter-e2e-gap`: usually merge host branch first if generic E2E depends on its hooks
- `issue/filter-host-nextjs-workbench` with `issue/filter-e2e-gap`: same sequencing rule as above
- any overlapping `e2e/workflows/**` edits: treat as sequential
- any unexpected root hot-file or `packages/schema/src/**` touch: stop parallel execution and escalate to orchestrator
- after sequential merges on shared E2E surfaces, rerun the narrowest impacted specs before the full release gate

## Immediate Next Step

Implementation begins by using this file, not tool memory, as the canonical campaign plan.

The first active work should be:

1. update the testing skills and QA/checkpoint docs to reflect semantic BI assertions
2. run the discovery sweep on the real host examples and dev-app authoring surface
3. open GitHub issues for any reproduced critical/high blockers
4. dispatch parallel subagents where blockers survive initial triage

## Initial Findings — 2026-05-02

### PASS — Vite SQLite host example proves semantic filter behavior

- environment: `http://localhost:3112`
- check: changed `Region` from `All` to `APAC`
- result: SQL statements changed from unfiltered queries to `WHERE region = ? -- ["APAC"]`
- visible outcome: KPI values changed from `$37,780.00 / 24 / $1,574.17` to `$11,535.00 / 8 / $1,441.88`
- visible outcome: table rows collapsed to APAC-only records
- conclusion: the host-owned filter contract is sound in the deterministic BI example

### PASS — Next.js real host workbench proves auth + query contract behavior

- environment: `http://localhost:3111/workbench`
- check: logged in with demo credentials, switched to viewer, changed `Region` from `All` to `APAC`
- result: host query log changed from empty filters to `{"fieldId":"region","operator":"eq","value":"APAC"}` across all published widgets
- visible outcome: KPI values changed from `$403.9K / 2.5K / 91.06%` to `$108.6K / 646 / 93.78%`
- visible outcome: table rows collapsed to APAC lanes only
- conclusion: the production-like host example also honors the filter contract

## Focused Executable Validations — 2026-05-02

### PASS — Host integration workflow

- command: `SUPERSUBSET_DEV_APP_PORT=3110 SUPERSUBSET_EXAMPLE_NEXTJS_PORT=3111 SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT=3112 pnpm --dir /Users/kenxono/apps/supersubset-issue-market-readiness-orchestrator exec playwright test e2e/workflows/host-integration.spec.ts --config=playwright.e2e.config.ts`
- result: `2 passed`
- scope proven: runtime-only Next host mount/theming path and Vite SQLite import/persist/reload path

### PASS — Next.js workbench workflow

- command: `SUPERSUBSET_DEV_APP_PORT=3110 SUPERSUBSET_EXAMPLE_NEXTJS_PORT=3111 SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT=3112 pnpm --dir /Users/kenxono/apps/supersubset-issue-market-readiness-orchestrator exec playwright test e2e/workflows/host-workbench.spec.ts --config=playwright.e2e.config.ts`
- result: `1 passed`
- scope proven: login, dataset loading, publish, viewer-mode re-query, and host-owned payload mutation

### PASS — Probe onboarding workflow

- command: `SUPERSUBSET_DEV_APP_PORT=3110 SUPERSUBSET_EXAMPLE_NEXTJS_PORT=3111 SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT=3112 pnpm --dir /Users/kenxono/apps/supersubset-issue-market-readiness-orchestrator exec playwright test e2e/workflows/probe-metadata-paste.spec.ts --project=chromium`
- result: `1 passed`
- scope proven: metadata paste onboarding reaches the probe designer with deterministic discovery status

### PASS — Import/export workflow

- command: `SUPERSUBSET_DEV_APP_PORT=3110 SUPERSUBSET_EXAMPLE_NEXTJS_PORT=3111 SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT=3112 pnpm --dir /Users/kenxono/apps/supersubset-issue-market-readiness-orchestrator exec playwright test e2e/workflows/import-export-cycle.spec.ts --project=chromium`
- result: `5 passed`
- scope proven: import/export cycle remains healthy in the leased-port orchestrator environment

### PASS — Persistence regression workflow

- command: `SUPERSUBSET_DEV_APP_PORT=3110 SUPERSUBSET_EXAMPLE_NEXTJS_PORT=3111 SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT=3112 pnpm --dir /Users/kenxono/apps/supersubset-issue-market-readiness-orchestrator exec playwright test e2e/workflows/persistence-regression.spec.ts --project=chromium`
- result: `2 passed`
- scope proven: persisted state workflows remain intact in the leased-port orchestrator environment

### PASS — Full Chromium Playwright suite on orchestrator branch

- command: `SUPERSUBSET_DEV_APP_PORT=3110 SUPERSUBSET_EXAMPLE_NEXTJS_PORT=3111 SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT=3112 pnpm --dir /Users/kenxono/apps/supersubset-issue-market-readiness-orchestrator exec playwright test --project=chromium`
- result: `43 passed`
- campaign read: broad browser regression health is currently strong, but this full-suite pass coexists with known story/demo gaps such as issues `#104` and `#106`, which confirms that the remaining risk is concentrated in missing semantic/assertion coverage and first-party demo fidelity rather than general browser instability

### GAP — Existing dashboard-filter workflow missed issue #104

- command: `SUPERSUBSET_DEV_APP_PORT=3110 SUPERSUBSET_EXAMPLE_NEXTJS_PORT=3111 SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT=3112 pnpm --dir /Users/kenxono/apps/supersubset-issue-market-readiness-orchestrator exec playwright test e2e/interactions/dashboard-filter.spec.ts --config=playwright.e2e.config.ts`
- result: `3 passed`
- important context: this suite passed on the orchestrator branch while the dev-app live dashboard still exhibited issue `#104`
- conclusion: the current interaction coverage proves control-state sharing and registry integrity, but not the visible analytical outcome a human expects
- campaign impact: semantic BI assertions are required in this class of workflow, not only control-state assertions

### HIGH — Dev app live dashboard makes authored filters appear broken

- environment: `http://localhost:3110`
- check: stayed in `Viewer` with the default `Live dashboard` scenario and changed `Region` from `All` to `North`
- result: filter controls updated, mirrored filter bar updated, and `Clear filters` appeared
- visible outcome: KPI values and the orders table did not change
- localization: `packages/dev-app/src/main.tsx` injects static `DEMO_DATA` and only logs `onFilterChange`
- triage: this is not a core runtime-contract failure because both real host examples pass; it is a first-party demo and release-readiness blocker because a human can reasonably conclude that authored dropdown filters do not work

### HIGH — Leased-port E2E config bug blocks parallel-worktree workflow validation

- localization: `playwright.e2e.config.ts`
- reproduction: focused workflows such as `designer-page-management` and `filter-cascade` fail immediately with `ERR_CONNECTION_REFUSED` at `http://localhost:3006/` even while the correct worktree services are running on leased ports
- cause: the E2E config hardcodes `baseURL` to `http://localhost:3006`
- triage: this is a testing-infrastructure blocker for the parallel-agent environment, not a product-runtime defect

### MEDIUM/HIGH — Multi-page dev-app demo misrepresents shared filters and chart navigation

- environment: `http://localhost:3110`, `Viewer` -> `One dashboard, two pages`
- reproduced behavior: both `Overview` and `Region Detail` showed `0` `.ss-filter-bar` elements even though the scenario copy claims shared filters
- reproduced behavior: the overview rendered five widgets, but the last two widget slots were empty/inert from a user perspective and clicking the first empty chart slot did not navigate to the detail page
- localization: `packages/dev-app/src/navigation-demo.ts` declares global filters and a click-to-page interaction, but the user-facing demo does not currently expose that behavior in an exercisable way
- triage: this is currently a first-party demo/story mismatch; underlying runtime health is not yet disproven by this finding

## Issue Dispatches

### Issue #104 — Dev app live dashboard filters update controls but not rendered data

- issue: `https://github.com/wandir-tech/supersubset/issues/104`
- severity: high
- status: fixed in PR `#107`, merged into `develop`
- dedicated fix branch: `issue/104-dev-app-live-dashboard-filters`
- dedicated fix worktree: `/Users/kenxono/apps/supersubset-issue-104-dev-app-filters`
- assigned mode: bounded parallel implementation for PR-ready human review
- subagent outcome: testing subagent reported a PR-ready fix branch that makes the dev-app live viewer recompute demo KPI, trend, region, and table payloads from current filter values and adds regression coverage in `e2e/interactions/dashboard-filter.spec.ts`
- PR: `https://github.com/wandir-tech/supersubset/pull/107`

### Issue #105 — `playwright.e2e.config.ts` hardcodes localhost:3006 and breaks leased-port worktree runs

- issue: `https://github.com/wandir-tech/supersubset/issues/105`
- severity: high for testing infrastructure
- status: fixed in PR `#108`, merged into `develop`
- dedicated fix branch: `issue/105-playwright-e2e-leased-ports`
- dedicated fix worktree: `/Users/kenxono/apps/supersubset-issue-105-playwright-e2e`
- assigned mode: bounded parallel implementation for PR-ready human review
- subagent outcome: testing subagent reported a PR-ready fix in `playwright.e2e.config.ts` that resolves the dev-app origin from env vars and/or `tmp/devenv-state.json`, validated via leased-port smoke runs
- PR: `https://github.com/wandir-tech/supersubset/pull/108`

### Issue #106 — Multi-page dev-app demo claims shared filters and chart navigation, but renders no filter bar and inert chart slots

- issue: `https://github.com/wandir-tech/supersubset/issues/106`
- severity: medium/high
- status: fixed in PR `#109`, merged into `develop`
- dedicated fix branch: `issue/106-page-demo-fidelity`
- dedicated fix worktree: `/Users/kenxono/apps/supersubset-issue-106-page-demo`
- assigned mode: bounded parallel implementation for PR-ready human review
- subagent outcome: page-demo definitions now render shared filter bars on both pages, scenario copy matches the exercisable behavior, and browser coverage proves filter state persists across page switches
- PR: `https://github.com/wandir-tech/supersubset/pull/109`

## Update — 2026-05-02 after merged blocker branches

### PASS — Current `develop` workflow sweep after PRs #107, #108, and #109

- command: `pnpm exec playwright test e2e/workflows --project=chromium`
- result: `33 passed`
- scope proven: current `develop` keeps the workflow matrix green after the live-dashboard, leased-port, and page-demo fixes landed

### PASS — Current `develop` interaction and first-party happy-path sweep

- command: `pnpm exec playwright test e2e/smoke.spec.ts e2e/plan-a-designer-happy-path.spec.ts e2e/interactions/dashboard-filter.spec.ts --project=chromium`
- result: `12 passed`
- scope proven: smoke coverage, the core designer path, and the semantic dashboard-filter regression remain healthy on the merged base

### PASS — Current `develop` visual snapshot sweep

- command: `pnpm exec playwright test e2e/visual/chart-header-layout.spec.ts --project=chromium`
- result: `1 passed`
- scope proven: the remaining visual snapshot check still matches its baseline on the merged base

## Current Campaign Read

- host-owned filter/query behavior: proven in both real host examples
- authoring/publish/import/viewer round-trip: currently backed by passing focused Playwright workflows in the host examples
- probe onboarding: currently backed by a passing focused workflow in the leased-port orchestrator environment
- import/export and persistence: currently backed by passing focused workflows in the leased-port orchestrator environment
- designer filter configuration surface: present and supports dropdown control authoring in the dev app
- first-party live demo readiness: repaired on `develop` by issue `#104` / PR `#107`
- test-infrastructure readiness: repaired on `develop` by issue `#105` / PR `#108`
- page-demo story health: repaired on `develop` by issue `#106` / PR `#109`
- current browser-suite health: current `develop` passed `33` workflow tests, `12` smoke/interaction/happy-path tests, and `1` visual snapshot test in Chromium after the blocker merges
- next discovery class: docs-following onboarding, repo-wide release-gate commands, and deeper performance or memory validation now that the first-party blocker set is merged
