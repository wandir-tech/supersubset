---
name: release-runbook
description: 'End-to-end release execution for Supersubset from release candidate validation through staging/main promotion, Changesets publishing, and downstream consumer upgrade. Use when preparing, monitoring, or unblocking a release.'
---

# Release Runbook (Supersubset)

This skill coordinates the full release path for published Supersubset packages. It bridges branch promotion, CI triage, exploratory validation, Changesets versioning, npm publish, and downstream adoption.

## When to Use

- A bugfix or feature slice on `develop` is approaching release.
- `develop` or `staging` has merged fixes and you need to know the next step.
- A promotion workflow or release workflow failed and you need a safe recovery path.
- You need to verify a release in a downstream host app such as Tripmatch before or after publish.

## Release goals

1. Ship only from a known-green candidate.
2. Distinguish release blockers from non-blocking follow-up issues.
3. Never promote branches without verifying whether a publishable `.changeset` exists.
4. Validate the published artifact in at least one real host integration after publish.

## Prerequisites

- Read `.github/skills/branch-ci-promotion/SKILL.md`.
- Use `gh` per `.github/skills/github-cli/SKILL.md`.
- Use a clean worktree if local `develop` is dirty or tracks the wrong remote.
- Prefer the dedicated release worktree over a user's day-to-day checkout.
- If browser validation is part of the release, use `.github/skills/browser-testing/SKILL.md`.

## Repository-specific release mechanics

- Promotion workflows:
  - `.github/workflows/promote-staging.yml`
  - `.github/workflows/promote-main.yml`
- Publish workflow:
  - `.github/workflows/release.yml`
- Changesets config:
  - `.changeset/config.json`
- Package versions are kept in a single `fixed` group. A patch, minor, or major change to one published package drives a coordinated version bump across the fixed package set.
- `@supersubset/dev-app`, `@supersubset/docs`, and example packages are ignored for publishing.
- A `main` merge without a pending `.changeset` does not produce a new publishable version.

## Step 0: Decide the release mode

| Mode            | Goal                                        | Required before `main` promotion  |
| --------------- | ------------------------------------------- | --------------------------------- |
| Validation-only | Prove `staging` is good                     | No new `.changeset` required      |
| Publish         | Cut npm packages from the current candidate | At least one pending `.changeset` |

If the user wants a real package release, do not skip the `.changeset` check.

## Step 1: Establish the candidate

From a clean worktree:

```bash
git fetch origin
git log --oneline --decorate --left-right origin/main...origin/staging
gh pr list --state open --json number,title,baseRefName,headRefName,url,isDraft
```

Confirm:

- which fixes are already in `develop`
- whether `staging` already contains those fixes
- whether `main` is behind `staging`
- whether a promotion PR already exists

If the local checkout is misleading or dirty, create or use a dedicated worktree before doing anything else.

## Step 2: Check versioning inputs first

Before spending time on final promotion:

```bash
find .changeset -maxdepth 1 -type f | sort
cat .changeset/config.json
```

Interpretation:

- Only `config.json` and `README.md`: there is no pending release note, so no npm release will be created.
- New `.md` changeset files present: release metadata exists; continue.
- Because the repo uses a fixed package group, a single patch changeset can drive a coordinated patch release across published packages.

Rule:

- If the release is publish-intended and there is no pending changeset, create a focused changeset PR on `develop` before promoting `staging -> main`.
- Default to a patch changeset for bugfix-only releases unless the diff includes a deliberate public feature addition or breaking API change.

## Step 3: Validate the candidate locally

Minimum gate from repo root:

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

If designer, runtime, or examples changed:

```bash
pnpm test:e2e
```

If local Playwright `webServer` startup is flaky, start the servers manually and use the lighter config:

```bash
pnpm exec playwright test --config=playwright.e2e.config.ts
```

Optional but recommended for release confidence:

```bash
pnpm build-storybook
```

Security:

- Run Snyk code scan on new first-party code before release.
- If the local `snyk` shebang is broken on macOS, invoke it through the working Node binary instead of silently skipping the scan.

## Step 4: Do exploratory host validation

Use browser testing to cover the surfaces most likely to regress:

- Supersubset dev app
- example hosts under `examples/`
- one real downstream host if available, such as Tripmatch

Classify findings:

- Release blockers: broken primary flows, failed CI-required tests, publish pipeline breakage
- Non-blockers: known browser-specific edge cases, performance follow-ups, docs-only visual issues, toolchain deprecation warnings without current breakage

File non-blockers as GitHub issues. Do not let them stay as chat-only knowledge.

## Step 5: Promote `develop -> staging`

Preferred path:

```bash
gh workflow run promote-staging.yml
gh run list --workflow promote-staging.yml --limit 5
```

Then monitor the promotion PR and the CI it triggers.

If the workflow fails:

1. Inspect the failed job with `gh run view <id> --log-failed`.
2. Identify whether the failure is a real blocker or an environment issue.
3. Fix blockers on a focused branch targeting `develop`.
4. Merge the fix.
5. Re-run or re-dispatch the promotion.

Do not patch `staging` directly unless the team explicitly chooses a hotfix path.

## Step 6: Re-validate on `staging`

After `develop` is merged into `staging`:

- rerun any targeted local or browser checks needed for confidence
- confirm the important exploratory findings are either fixed or tracked
- confirm there is still a pending `.changeset` if this is a publish-intended release

If `staging` is green but there is no `.changeset`, the branch is validation-ready but not publish-ready.

## Step 7: Promote `staging -> main`

When `staging` is green and versioning inputs are present:

```bash
gh workflow run promote-main.yml
gh run list --workflow promote-main.yml --limit 5
```

Monitor the promotion PR and its CI exactly the same way as the staging promotion.

## Step 8: Watch the Changesets release flow on `main`

After the `staging -> main` PR merges:

```bash
gh run list --workflow release.yml --limit 5
```

Expected behavior:

- First pass: Changesets opens or updates `chore(release): version packages`.
- Merge that PR after verifying the generated version bumps and changelog.
- Second pass on `main`: `release.yml` publishes the packages.

If no version-packages PR appears, verify again that the merged branch actually contained a pending `.changeset`.

## Step 9: Verify published artifacts

After publish:

- check the release workflow conclusion in GitHub Actions
- confirm the expected package versions exist in npm
- note the published version that downstream consumers should adopt

Do not open downstream upgrade PRs against hypothetical versions that have not been published yet.

## Step 10: Upgrade a downstream consumer

For Tripmatch or another host app:

1. create a branch in the downstream repo
2. install the published Supersubset version
3. run the host app's tests and a targeted analytics smoke path
4. open a PR referencing the published version and release PRs

Prefer published versions. If pre-publish validation is required, use tarballs or a canary build instead of inventing a future semver.

## Failure patterns and responses

- Missing visual snapshot or Linux-only baseline:
  - treat as a release blocker if CI requires it
  - recover from the CI artifact or regenerate the correct baseline, then re-promote
- Local Playwright `webServer` timeouts:
  - switch to manually started servers and `playwright.e2e.config.ts`
- No pending `.changeset`:
  - stop the publish path and add a release note on `develop`
- Browser-auth-gated downstream app:
  - verify as much as possible locally, then call out the blocked surface explicitly
- GitHub API or tool restrictions:
  - fall back to `gh` CLI rather than abandoning issue or PR automation

## Current default path for the repo

If `develop` has been validated and merged to `staging`, use this decision:

1. If the goal is only branch-promotion confidence, next step is `staging -> main`.
2. If the goal is an npm release, next step is to confirm or add a `.changeset` before `staging -> main`.
3. After publish, create the Tripmatch upgrade PR against the real published version.

## See also

- `.github/skills/branch-ci-promotion/SKILL.md`
- `.github/skills/github-cli/SKILL.md`
- `.github/skills/browser-testing/SKILL.md`
- `.github/skills/orchestration/SKILL.md`
- `.github/skills/maintaining-ai-context/SKILL.md`
