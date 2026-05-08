---
name: publish-npm-release
description: >-
  Publishes Supersubset @supersubset/* packages to npm via Changesets and the
  Release GitHub Action. Use when cutting an npm release, fixing a failed Release
  workflow, or when the user mentions changesets, version packages PR, NPM_TOKEN,
  or publishing packages.
---

# Publish npm release (Supersubset)

Supersubset uses **Changesets** plus `.github/workflows/release.yml`. The **fixed** group versions together: `@supersubset/schema`, `runtime`, `designer`, `charts-echarts`, `theme`, `data-model`, `query-client`, `cli`, and all four `adapter-*` packages.

## One release = two merges (normal case)

1. **Changeset on `main`** — A commit adds `.changeset/<random-name>.md` (from `pnpm changeset`). Pushing to `main` runs **Release**; it opens **PR: “chore(release): version packages”** (branch like `changeset-release/main`).
2. **Merge that PR** — Applies version bumps + CHANGELOGs + removes consumed changesets. The **next** `main` push runs **Release** again and runs **`pnpm run release`** → `changeset publish` to npm.

You **do not** run `pnpm changeset` again for the same release after step 2. A **new** changeset is only for a **later** release with new user-facing changes.

## After a release lands on `main`

**Backport to `develop` (recommended):** open **`main` → `develop`** (or merge `main` into `develop` via PR) so integration branch picks up `package.json` versions, `CHANGELOG.md`, and lockfile if any. Otherwise the next feature PR from `develop` will conflict or drift from published versions.

Promotion context: **`.github/skills/branch-ci-promotion/SKILL.md`**.

## Author a changeset (maintainer)

```bash
git checkout main && git pull
pnpm install
pnpm changeset
```

- **Major / minor / patch:** leave **major** empty unless you intend a breaking semver step. For routine releases, prefer **patch**; **minor** when the release note warrants it.
- **Do not** include examples or private apps — they are ignored in `.changeset/config.json`; if the CLI still lists them, skip them.

Commit and push the new `.changeset/*.md` (and any config edits) to `main`.

## Preconditions (CI / org)

- Repo secret **`NPM_TOKEN`**: npm token with publish access to **`@supersubset`** (granular token: scope + read/write + bypass 2FA for automation if required).
- **Org → Actions → Workflow permissions:** allow **read/write** and **“Allow GitHub Actions to create and approve pull requests”** so `changesets/action` can open the version PR. If repo UI is grayed out, an **org owner** must relax the org default.

## When Release fails

| Symptom                                            | Fix                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| “not permitted to create or approve pull requests” | Org/repo workflow permissions (above). Re-run failed **Release** job.      |
| `403` / `ENEEDAUTH` on publish                     | `NPM_TOKEN` missing, expired, wrong scope, or npm 2FA blocking automation. |
| Duplicate version                                  | Version already on registry; add a new changeset with a higher bump.       |

Inspect: **Actions → Release → failed run → logs**. Locally: `pnpm -r publish --dry-run --no-git-checks` (from repo root) to validate tarballs without publishing.

## Branch protection

Keep **`main` protected**. Land the **changeset commit** via **PR into `main`** (do not disable protection for routine pushes). The **version packages** PR is merged like any other; approvers review changelog + version bumps.

## Verify publish

```bash
npm view @supersubset/schema version
npm view @supersubset/cli version
```

## Anti-patterns

- Running **`pnpm changeset` again** immediately after merging the version PR for the **same** release.
- **Major** bump for “first test publish” or docs-only — signals breaking change incorrectly.
- Publishing **example** apps — they are not part of the fixed publish set; keep them out of changesets.
