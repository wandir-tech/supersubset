---
name: branch-ci-promotion
description: 'Branch model (feature→develop→staging→main), CI readiness, and merge gates for Supersubset. Use when preparing or reviewing a PR, choosing a target branch, promoting between environments, or validating a topic branch.'
---

# Branch & CI Readiness (Supersubset)

Supersubset uses a **four-tier branch model**: feature branches → `develop` → `staging` → `main`. This skill covers the model, merge gates, and local/CI verification.

## Branch model

| Branch                          | Purpose                           | PR target for        | Deploys to             |
| ------------------------------- | --------------------------------- | -------------------- | ---------------------- |
| `feature/*`, `fix/*`, `issue/*` | All new work                      | `develop`            | —                      |
| `develop`                       | Integration of completed features | feature/fix branches | Dev preview (if any)   |
| `staging`                       | Pre-release validation            | `develop`            | Staging env (if any)   |
| `main`                          | Production-ready                  | `staging`            | Docs site, npm publish |

### Rules

1. **Feature branches always target `develop`** — never `staging` or `main` directly.
2. **`develop → staging`** is a promotion PR. Create it when `develop` is stable and ready for validation.
3. **`staging → main`** is a release promotion PR. Create it after staging passes all checks.
4. **No direct commits** to `develop`, `staging`, or `main` — all changes go through PRs.
5. **Hotfixes**: branch from `main`, merge back to both `main` and `develop` (two PRs or cherry-pick).
6. **CI runs on PRs targeting** `develop`, `staging`, and `main` (see `.github/workflows/ci.yml`).

## When to Use

- Before opening or merging a PR.
- After CI fails on a branch — triage without guessing.
- When defining “green” for a release tag or publishing docs/examples.

## Branch base preflight (required before branching)

Never create a normal `feature/*`, `fix/*`, or `issue/*` branch from an unrefreshed local `develop`.

Use one of these flows:

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c fix/my-slice
```

If local `develop` is dirty, has local-only commits, or you want a cleaner start, branch directly from the remote tip instead:

```bash
git fetch origin
git switch -c fix/my-slice origin/develop
```

Failure mode to avoid:

- branching from stale local `develop`
- re-implementing changes that are already on `origin/develop`
- opening a PR that conflicts because the same files were already changed upstream

For worktree-based flows, follow **`.github/skills/parallel-agent-environments/SKILL.md`** and base the worktree on `origin/develop` for normal feature work.

## Local verification (authoritative before push)

From repo root:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

For UI/e2e coverage when you touched designer/runtime/examples:

```bash
pnpm test:e2e
```

(E2E starts dev servers via Playwright `webServer`; ensure ports per **`.github/skills/parallel-agent-environments/SKILL.md`** if multiple agents run locally.)

## PR / merge checklist

- [ ] **Branch base** was created from the current remote target base (`git fetch origin` + `git pull --ff-only`, or direct branch from `origin/develop` for normal work).
- [ ] **Branch** is rebased or merged with the target before final review if the target moved after branch creation.
- [ ] **`pnpm lint`** — no new violations in touched packages.
- [ ] **`pnpm typecheck`** — strict TS clean across workspace.
- [ ] **`pnpm test`** — unit/integration tests for changed packages pass.
- [ ] **E2E** — run when behavior crosses packages or host mounting (`e2e/`).
- [ ] **ADRs** — significant architecture/schema/deps decisions recorded under `docs/adr/` per orchestrator rules in `AGENTS.md`.
- [ ] **`docs/status/`** — if the project tracks phased work, update `master-plan.md` / phase summary when the issue completes a planned slice.

## CI expectations (when workflows exist)

If `.github/workflows/` defines PR checks:

- Treat **required** checks as merge blockers; investigate with `gh run view <id> --log-failed` (see **`.github/skills/github-cli/SKILL.md`** for listing runs and JSON filters).
- **Optional** checks (e.g. informational scans): note failures in the PR without blocking if project policy says so — state that explicitly in the PR description.

If **no workflows** yet, this skill still applies: **run the same commands locally** and paste summarized results in the PR for reviewers.

## Promotion / release (library-shaped)

- **Version bumps** and **changelog** live in package `CHANGELOG.md` / release process the maintainers choose — do not invent a heavy release train here.
- **Docs site** (`pnpm docs:build`) when documentation or screenshot pipelines changed.
- **Examples** (`pnpm build:examples`) when public examples must compile after API changes.

## Anti-patterns

- Merging with “CI will catch it” when you have not run `lint` / `typecheck` / `test` locally for the touched surface.
- Skipping E2E when the diff changes Playwright-covered flows or `webServer` ports.
- Silent cross-package refactors without ADR/orchestrator alignment when `AGENTS.md` requires it.

## See also

- `.github/skills/github-cli/SKILL.md`
- `.github/skills/orchestration/SKILL.md`
- `.github/skills/browser-testing/SKILL.md`
- `docs/bootstrap.md`
