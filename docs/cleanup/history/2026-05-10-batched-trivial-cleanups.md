# Batched Trivial Cleanups

## Signal

The cleanup loop was moving too slowly because trivial one-line changes were being sent as separate PRs. The repo also still had living testing docs that described the retired `e2e/renderer`, `e2e/designer`, and `e2e/integration` layout.

## Scope

- cleanup skill batching guidance
- testing docs that still describe the old Playwright topology

## Findings

- the cleanup skill encouraged small slices but did not explicitly say when multiple trivial same-class fixes should be batched into one PR
- `docs/testing/verification-strategy.md` still presented the old split E2E layout as current
- `docs/testing/playwright-scaffold-plan.md` still reads like the older scaffold paths are the live source of truth unless the reader already knows the repo evolved

## Fixes

- updated `.github/skills/ai-code-cleanup/SKILL.md` with explicit trivial-batch guidance
- updated `docs/testing/verification-strategy.md` to point at the current `e2e/` topology
- added a historical-note banner to `docs/testing/playwright-scaffold-plan.md`

## Local Validation

- `get_errors` reported no issues in the touched skill and markdown files
- verified every newly referenced `e2e/...` path exists in the current repo tree
- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm -r build`
- `corepack pnpm -r lint`
- `corepack pnpm -r typecheck`
- `corepack pnpm -r test`
- note: root `corepack pnpm lint` shells to bare `pnpm -r lint` and failed in this shell because `pnpm` is not on `PATH`; reran the branch gate with explicit `corepack pnpm -r ...` commands

## PR

- pending

## Cloud CI

- pending

## Human Check

- not required before local validation, PR creation, and green required CI

## Next Step

- open one batched cleanup PR instead of separate docs/process PRs
