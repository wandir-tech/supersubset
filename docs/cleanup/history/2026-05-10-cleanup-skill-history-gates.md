# Cleanup Skill History And Gates

## Signal

The cleanup workflow had an implied history pattern but no dedicated `docs/cleanup/history/` home, and the pre-human-check gate was not explicit enough about local verification, PR creation, and cloud CI.

## Scope

- cleanup skill guidance
- branch and CI readiness guidance
- bootstrap discoverability for cleanup memory

## Findings

- `docs/cleanup/history/` did not exist in the current checkout.
- `ai-code-cleanup` described campaign memory generically, which made `docs/testing/history/` look like the only established pattern.
- The workflow did not explicitly block human checks until local validation, an open PR, and green cloud CI were all in place.

## Fixes

- created `docs/cleanup/history/README.md`
- updated `.github/skills/ai-code-cleanup/SKILL.md`
- updated `.github/skills/branch-ci-promotion/SKILL.md`
- updated `docs/bootstrap.md`

## Local Validation

- `corepack pnpm -r lint` passed with one pre-existing runtime warning about an unused `useMemo` import in `packages/runtime/src/layout/LayoutRenderer.tsx`
- `corepack pnpm -r typecheck` passed
- `corepack pnpm -r test` passed on rerun after one transient `packages/charts-echarts/test/charts.test.tsx` timeout during the first full-suite attempt

## PR

- pending

## Cloud CI

- pending

## Human Check

- blocked until local validation passes, a PR is open, and required cloud CI is green

## Next Step

- run local verification for the cleanup/docs skill branch
- commit and push the branch
- open a PR to `develop`
- wait for required cloud CI to pass before requesting a human check
