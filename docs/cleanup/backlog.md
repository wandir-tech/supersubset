# Actual Cleanup Backlog

This is the ranked queue for repo-specific cleanup work with meaningful signal.

It prioritizes low-signal tests, oversized mixed-responsibility files, and partial runtime seams over generic style cleanup.

## Current status

1. Completed in the current working tree:
   - removed literal placeholder suites from `@supersubset/dev-app`, `@supersubset/designer`, and `@supersubset/query-client`
   - renamed substantive adapter suites so they no longer read like scaffolds

## Ranked queue

### 1. Runtime layout render context extraction

- Files: `packages/runtime/src/layout/LayoutRenderer.tsx`, `packages/runtime/src/components/SupersubsetRenderer.tsx`
- Signal: `LayoutRenderer.tsx` is 1356 lines and threads the same render arguments through `renderChildren`, `renderNode`, `renderGrid`, `renderRow`, `renderColumn`, and `renderWidget`.
- Why it matters: the current shape makes every layout or widget rendering change higher-risk than necessary and hides the real renderer contract inside positional argument lists.
- Proposed PR slice:
  - introduce a local render context object for layout traversal state and shared renderer dependencies
  - split query-bound widget execution helpers from pure layout/container rendering
  - keep `SupersubsetRenderer.tsx` as thin provider wiring and page selection only
- Validation:
  - `corepack pnpm --filter @supersubset/runtime test`
  - `corepack pnpm --filter @supersubset/runtime typecheck`
  - if consumed through the dev app, `corepack pnpm --filter @supersubset/runtime build && corepack pnpm --filter @supersubset/dev-app test`

### 2. Probe workspace shell split

- Files: `packages/dev-app/src/probe/ProbeWorkspace.tsx`
- Signal: `ProbeWorkspace.tsx` is 1293 lines and combines session restoration, auth mode handling, login flow, metadata loading, preview query state, import/export actions, and a large repeated form surface.
- Why it matters: this is a high-churn developer tool surface where duplicated label/input/help-text/style blocks and mixed async orchestration will keep accumulating drift.
- Proposed PR slice:
  - extract a `ProbeConnectionForm` subcomponent for metadata/auth inputs
  - extract a `ProbeConnectStatus` or similar component for staged login/metadata feedback
  - keep connection orchestration in one hook or controller and leave rendering components mostly declarative
- Validation:
  - `corepack pnpm --filter @supersubset/dev-app test`
  - `corepack pnpm --filter @supersubset/dev-app typecheck`

### 3. Designer shell header extraction

- Files: `packages/designer/src/components/SupersubsetDesigner.tsx`
- Signal: `SupersubsetDesigner.tsx` is 1060 lines and mixes CSS injection, DOM accessibility decoration, controlled/uncontrolled sync, page lifecycle, Puck plugin wiring, header UI, and slide-over panels.
- Why it matters: header/page-management changes are harder to test because state sync and shell rendering are interleaved in one component.
- Proposed PR slice:
  - extract header/page controls into a dedicated component with explicit props
  - move DOM decoration and style-injection helpers behind a small shell utility boundary
  - preserve current public designer API and controlled-mode behavior
- Validation:
  - `corepack pnpm --filter @supersubset/designer test`
  - `corepack pnpm --filter @supersubset/designer typecheck`

### 4. Filter builder normalization and editor split

- Files: `packages/designer/src/components/FilterBuilderPanel.tsx`
- Signal: `FilterBuilderPanel.tsx` is 1014 lines and mixes migration helpers, normalization rules, option-source factories, scope logic, and a large inline editor UI with repeated field-control patterns.
- Why it matters: authoring rules and authoring UI are currently too coupled, which makes filter behavior changes harder to test independently from React rendering.
- Proposed PR slice:
  - extract normalization and migration helpers into a neighboring utility module
  - extract repeated labeled control groups or option-source editors into smaller subcomponents
  - keep canonical schema behavior unchanged
- Validation:
  - `corepack pnpm --filter @supersubset/designer test`
  - `corepack pnpm --filter @supersubset/designer typecheck`

### 5. Field-backed filter option contract completion

- Files: `packages/runtime/src/components/FilterBar.tsx`
- Signal: the runtime explicitly recognizes `filter.optionSource.kind === 'field'` but still returns `Field-backed options require host support` with a TODO bridge.
- Why it matters: this is real product debt, not just refactor debt, and it blocks the schema contract from being fully represented at runtime.
- Proposed PR slice:
  - decide whether the host/query contract should resolve field-backed options directly or through the query adapter
  - implement the contract end-to-end instead of keeping a partial unavailable state
  - only after the contract is clear, refactor repeated filter control render helpers if still needed
- Validation:
  - `corepack pnpm --filter @supersubset/runtime test`
  - `corepack pnpm --filter @supersubset/runtime typecheck`
  - targeted browser or host validation once the runtime seam is wired

### 6. Renderer provider orchestration tightening

- Files: `packages/runtime/src/components/SupersubsetRenderer.tsx`
- Signal: the file is only 200 lines, but it owns page selection, container style derivation, provider wiring, interaction callback assembly, and filter-state to layout translation.
- Why it matters: this is a secondary cleanup candidate after `LayoutRenderer.tsx`, because some responsibilities can only be made obvious once the layout traversal contract is smaller.
- Proposed PR slice:
  - defer until item 1 lands
  - keep this file focused on host-facing props and provider composition
- Validation:
  - `corepack pnpm --filter @supersubset/runtime test`
  - `corepack pnpm --filter @supersubset/runtime typecheck`

## De-prioritized cleanup

- broad lint-only or formatting-only sweeps without behavior or signal gains
- generic file-size reductions without a clear extraction seam
- filter-bar render helper deduplication before the field-backed option contract is settled
