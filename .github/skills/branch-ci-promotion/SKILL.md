---
name: branch-ci-promotion
description: "Lightweight branch and CI readiness for Supersubset: verify pnpm lint/typecheck/test before merge, interpret PR checks, and keep `main` shippable. Use when preparing or reviewing a PR, validating a topic branch, or documenting release discipline — not full Tripmatch-style release trains."
---

# Branch & CI Readiness (Supersubset)

Supersubset is a **library monorepo** without Tripmatch’s `rel-*` / staging / multi-env deploy matrix. This skill is the **subset** that still matters: **branch hygiene + local/CI verification + merge gates**.

## When to Use

- Before opening or merging a PR.
- After CI fails on a branch — triage without guessing.
- When defining “green” for a release tag or publishing docs/examples.

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

(E2E starts dev servers via Playwright `webServer`; ensure ports per **`docs/dev/parallel-agent-environments.md`** if multiple agents run locally.)

## PR / merge checklist

- [ ] **Branch** is up to date with target (`main` or the agreed base) or merge conflicts resolved intentionally.
- [ ] **`pnpm lint`** — no new violations in touched packages.
- [ ] **`pnpm typecheck`** — strict TS clean across workspace.
- [ ] **`pnpm test`** — unit/integration tests for changed packages pass.
- [ ] **E2E** — run when behavior crosses packages or host mounting (`e2e/`).
- [ ] **ADRs** — significant architecture/schema/deps decisions recorded under `docs/adr/` per orchestrator rules in `AGENTS.md`.
- [ ] **`docs/status/`** — if the project tracks phased work, update `master-plan.md` / phase summary when the issue completes a planned slice.

## CI expectations (when workflows exist)

If `.github/workflows/` defines PR checks:

- Treat **required** checks as merge blockers; investigate with `gh run view <id> --log-failed`.
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

- `.github/skills/orchestration/SKILL.md`
- `.github/skills/browser-testing/SKILL.md`
- `docs/bootstrap.md`
