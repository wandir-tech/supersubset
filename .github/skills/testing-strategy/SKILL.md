---
name: testing-strategy
description: 'Plan and route Supersubset tests across package tests, Playwright workflows, docs screenshot harnesses, and live-backend probe validation. Use when deciding what tests to add or run for a feature, bug, regression, or release gate.'
---

# Testing Strategy

## When to Use

- Deciding what test layer should cover a feature, bug, or regression
- Choosing between package tests, Playwright workflows, browser verification, and screenshot capture
- Planning evidence for a human checkpoint or release gate
- Auditing whether a test change is too broad, too flaky, or too weak
- Validating host-owned backends through Probe mode or other integration surfaces

## Purpose

This skill is the routing layer for Supersubset testing work.

It does not replace the detailed testing docs or the browser-testing skill.
Instead, it answers four questions first:

1. What is the real risk?
2. What is the cheapest test that can catch it reliably?
3. Which local test surface owns that risk?
4. What evidence is required before the task is done?

Use this skill before writing or expanding tests. Then route into the narrower skill or document that owns the implementation details.

For BI-facing work, use this skill together with `.github/skills/bi-visualization-quality/SKILL.md`. Technical correctness is not enough if the resulting dashboard is misleading, unreadable, or hard to operate.

## AI Tester Agent Design Principles

Adapted to Supersubset, a strong tester agent should behave like this:

- prefer the simplest workflow that can produce trustworthy evidence
- state the risk being tested before choosing tools or files
- collect ground truth from executable checks, browser output, traces, screenshots, and console logs rather than intuition
- keep package boundaries clear: tests may change, product architecture should not be silently redesigned from the testing surface
- choose the narrowest layer that can falsify the current hypothesis, then climb only when more confidence is needed
- treat evaluation as an explicit loop: pick a check, run it, interpret it, then either stop or add the next layer
- hand product bugs back to the owning domain once the failure is reproduced clearly
- test the analytical outcome, not just the control state; if a filter changed, prove the query, rows, KPI, or chart changed in a way a user can perceive
- challenge test scaffolding that carries product semantics; if a flow only works because the harness injects sidecar props or manual metadata, decide whether that dependency is intentional or a contract leak

This follows the same principle we use elsewhere in the repo: simple, inspectable workflows beat elaborate autonomous wandering.

## Local Test Surfaces

Supersubset already has several distinct testing surfaces. Route to the one that matches the risk.

### Package Tests

Use `packages/*/test/` or `packages/*/__tests__/` for narrow, deterministic checks.

Examples already in the repo:

- `packages/data-model/test/` for heuristics and normalized metadata rules
- `packages/query-client/test/` for query orchestration and metadata caching
- `packages/theme/test/` for resolved theme defaults and CSS variable bridging
- `packages/designer/test/` for field editors and other focused designer logic
- `packages/charts-echarts/test/` for widget rendering and theme-aware states
- `packages/adapter-*/test/` for normalization behavior and edge cases

Use these when the bug or feature is fundamentally about data transformation, serialization, configuration, state logic, or component behavior that does not require a full browser journey.

### Playwright Workflow Tests

Use `e2e/` when the risk only appears in the browser or across multiple packages.

Current workflow examples include:

- `e2e/workflows/probe-metadata-paste.spec.ts`
- `e2e/workflows/designer-to-renderer.spec.ts`
- `e2e/workflows/import-export-cycle.spec.ts`
- `e2e/workflows/host-integration.spec.ts`
- `e2e/interactions/dashboard-filter.spec.ts`
- `e2e/visual/chart-header-layout.spec.ts`

Use these when the issue is about real authoring flow, rendering flow, persistence flow, page switching, host integration, or UI regressions that only emerge in a browser.

### Docs Screenshot Harness

Use `pnpm docs:screenshots` and `packages/docs/playwright.config.ts` when the goal is documentation-grade screenshots or reviewer-facing visual artifacts.

This harness is not the default place to prove core product behavior. It is for curated screenshots with stable framing and documentation-quality output.

When a PR changes a documented, user-visible property, authoring panel, or viewer rendering in a way a reviewer should be able to see, the default expectation is to refresh the affected screenshot artifacts in `packages/docs/src/assets/screenshots/` or explain explicitly why screenshot refresh is being deferred.

### Manual QA and Human Gates

Use these docs when the task affects milestone confidence, not just one automated test:

- `docs/testing/verification-strategy.md`
- `docs/testing/qa-checklist.md`
- `docs/testing/human-checkpoints.md`

These are the authority for human-review expectations, screenshot checkpoints, and gate criteria.

- `docs/testing/widget-control-regression-matrix.md`

This matrix is the per-surface source of truth for widget and control coverage. Use it whenever a task changes exposed widget or control properties.

## Test Routing Heuristics

### Start Low, Climb Only When Needed

- If the risk is a pure transform, heuristic, serializer, mapper, or query-builder rule, start in package tests.
- If the risk sits at a system boundary such as metadata ingestion, query execution, or transport envelopes, add a boundary-focused test before a browser test.
- If the risk is a user journey, authoring interaction, persistence flow, or browser-only regression, use Playwright.
- If the risk is mostly visual hierarchy, overlap, spacing, or state affordance, add a targeted screenshot assertion or screenshot review artifact instead of only a full-page smoke test.
- If the risk is documentation fidelity, use the docs screenshot harness rather than general E2E tests.
- If the risk is a market-critical BI workflow, require semantic proof as high in the stack as needed: query-log change, visible row-count change, KPI/value change, chart-series change, or another user-visible analytical outcome.

For user-visible property changes, think in pairs:

- semantic proof for correctness
- screenshot proof for what the human will actually see

Do not assume one replaces the other when the feature needs both.

### Push Tests Down

Follow the practical test pyramid, adapted for this repo:

- many package tests
- some boundary or workflow tests
- few broad end-to-end journeys

If a broad browser test fails and no lower-level test tells you why, add the missing lower-level test.

### Avoid Duplicate Confidence

Do not restate the same edge cases at every layer.

- lower layers should cover logic breadth
- higher layers should prove the integration point the lower layers could not prove

Example:

- field role inference belongs in `packages/data-model/test/`
- a field picker showing the inferred result belongs in a designer or workflow test
- the full dashboard journey should only assert that the user-facing outcome still works

For dashboards and host examples, do not stop at proving that a dropdown, toggle, or click handler changed internal state. Prove that the dashboard meaning changed in the way the user expected.

## Contract-Closure Checks

When the product claims schema-first or definition-driven behavior, run this check before accepting a fix:

- Add at least one proof run without host-only semantic helpers such as manual option records, hard-coded field lists, or injected UI defaults.
- If the flow fails without that helper, classify it as a contract gap unless the dependency is an explicit invariant from `AGENTS.md`.
- Treat helper inputs that carry authored meaning differently from intentional seams:
  - intentional seams: widget registry, auth, persistence callbacks, backend query execution
  - suspect seams: filter option lists, field display metadata, authored defaults, control labels, derived view state
- When a human finds one miss, search sibling tests, examples, and docs for the same workaround so the coverage plan hardens the whole class, not just one path.

## Market-Critical Discovery Priorities

When hardening toward release, hunt for blockers in this order:

1. host-owned filtering and query refresh
2. authoring to publish/import to viewer round-trip
3. import/export robustness and schema survivability
4. cross-filter, drill, and page-management flows
5. probe and live-backend onboarding behavior
6. multi-instance isolation, theming, and responsive integrity
7. large-dashboard performance and memory stability
8. docs-following first-use onboarding

Treat a human-found miss as a tracer bullet, not as proof that only one workflow is weak.

## Live Backend Probe Validation

This repo is backend-agnostic, but it still needs a disciplined way to validate host-owned backends through Probe mode.

Treat live backend testing as a staged workflow, not as a single giant E2E test.

### Stage 1: Contract Confidence

Read `docs/api/metadata-and-cli.md` first.

The key contract types are:

- `ProbeDatasetsResponse`
- `ProbeQueryRequest`
- `ProbeQueryResponse`
- `ProbeErrorResponse`
- `PROBE_PROTOCOL_VERSION`

If the risk is the transport envelope or logical query shape, prefer narrow tests around the contract and adapters before a browser run.

### Stage 2: Deterministic Probe Workflow

Use or add a Playwright workflow in `e2e/workflows/` beside `probe-metadata-paste.spec.ts` for discovery/query/auth behavior.

This is the right place to verify that Probe mode:

- accepts a discovery URL or base URL
- sends the expected auth header or credential mode
- shows dataset count and metadata source summary
- enables or disables preview appropriately
- reaches the `Supersubset Probe Designer` state

Prefer routing or request interception for this layer so the UI contract stays deterministic.

### Stage 3: Controlled Live Backend Smoke

Only use a real backend when it is local, team-owned, or a stable dedicated test target.

- do not make routine tests depend on an uncontrolled third-party service
- do not hide live-backend checks inside unrelated smoke suites
- keep auth, base URL, and environment selection explicit
- treat console errors, failed discovery, and broken preview queries as first-class failures

If the current branch already has a dedicated live-backend probe workflow, use it before inventing a new one. If not, add it in `e2e/workflows/` rather than scattering probe validation across ad hoc files.

### What a Good Live Backend Test Should Prove

- the discovery endpoint responds with the documented probe contract or an explicitly supported compatibility shape
- query preview can execute against the host backend when the flow requires it
- auth is actually sent, not just entered into a form
- the designer loads with the discovered datasets visible to the user
- the failure mode is legible when discovery or preview is unavailable

## Playwright Rules for Supersubset

Use these rules whenever work routes into browser automation:

- test user-visible behavior, not implementation details
- keep each test isolated; never depend on prior test state
- prefer `getByRole()`, `getByTestId()`, and other stable user-facing locators
- avoid brittle CSS selectors or DOM-shape assertions unless there is no stable contract
- use Playwright web-first assertions such as `toBeVisible()` and `toHaveText()`
- stub or route dependencies you do not control
- keep broad journeys short and focused on product-critical flows
- treat unexpected console errors as failures

Repo-specific notes:

- `playwright.config.ts` already records traces on first retry and screenshots only on failure
- the root suite currently targets Chromium and Firefox
- the dev app origin is controlled by `SUPERSUBSET_DEV_APP_PORT` and defaults to `http://localhost:3000`
- for unattended agent runs, prefer terminal-only Playwright output: set `PLAYWRIGHT_HTML_OPEN=never` and use `--reporter=line` so progress and failures stay in chat instead of opening the HTML report UI
- do not assume source edits are live in browser tests when the target app imports a workspace package through package exports; rebuild the touched package first if it resolves from `dist/`

For release-oriented BI validation, prefer the strongest host-owned test bed that can prove the behavior:

- `examples/vite-sqlite` for deterministic query-log and rendered-data assertions
- `examples/nextjs-ecommerce` workbench for auth and host query contract assertions
- `packages/dev-app` for rich authoring and reproduction of designer-side behavior

## Evidence Expectations

Before calling testing work done, leave evidence at the right layer:

- changed or added test file(s)
- the narrowest command(s) run to validate the affected surface
- trace, screenshot, console output, or failing assertion details when the problem is browser-based
- updated checklist, checkpoint brief, or screenshot artifact when the work affects a milestone gate
- an updated row in `docs/testing/widget-control-regression-matrix.md` when a widget or control inventory or property surface changed

When a change affects a documented visual property or authoring surface, include one of these outcomes in the change evidence:

- refreshed screenshot assets under `packages/docs/src/assets/screenshots/`
- a new or updated docs capture script
- an explicit note that screenshot refresh is deferred, with the reason

For human-found bugs:

- reproduce the bug cheaply
- add the regression at the lowest adequate layer
- add a higher-level test only if the user-facing risk still needs explicit proof
- if the current harness only passes because of a helper prop or sidecar payload, add a proof that omits it or document the dependency as intentional
- if the bug is critical or high severity and survives initial triage, open an issue immediately and treat it as a release blocker until fixed and regressed

## Anti-Patterns

- adding only a broad workflow test when a package test would catch the root cause faster
- relying on uncontrolled live services for routine CI confidence
- asserting CSS classes or internal implementation names when the user cannot perceive them
- treating a screenshot as enough evidence for data-contract correctness
- adding manual QA notes without turning repeatable bugs into automated regressions
- widening a flaky test instead of isolating the unstable dependency or state leak

## See Also

- `.github/skills/browser-testing/SKILL.md`
- `.github/skills/bi-visualization-quality/SKILL.md`
- `.github/skills/branch-ci-promotion/SKILL.md`
- `docs/testing/verification-strategy.md`
- `docs/testing/qa-checklist.md`
- `docs/testing/human-checkpoints.md`
