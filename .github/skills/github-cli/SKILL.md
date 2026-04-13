---
name: github-cli
description: "Use the GitHub CLI (`gh`) as the default interface for issues, PRs, Actions runs, and API queries. Use when creating or triaging issues, opening or reviewing PRs, inspecting workflow logs, dispatching workflows, or avoiding slow browser-based GitHub access."
---

# GitHub CLI (`gh`)

Prefer **`gh`** over driving github.com in a browser or ad-hoc REST guesses. It is fast, scriptable, and returns **JSON** agents can parse.

## Preconditions

```bash
gh auth status
```

If not logged in: `gh auth login` (human step). Do not assume token access without verifying.

Default repo: run from the Supersubset clone root so `gh` resolves `origin` correctly. Otherwise pass `--repo owner/name`.

## Output style

- Prefer **`--json field1,field2`** and **`-q` / `--jq`** for filters instead of scraping table output.
- Use **`--limit`** on list commands to keep responses small.

## Issues

```bash
gh issue list --state open --limit 20
gh issue view 42 --json title,body,state,labels,url
gh issue create --title "…" --body-file plan.md --label enhancement
```

Comment on an existing issue (e.g. after `work-kickoff` planning):

```bash
gh issue comment 42 --body-file plan-comment.md
```

## Pull requests

```bash
gh pr list --state open
gh pr view 12 --json title,state,mergeable,url,commits
gh pr checks 12
gh pr diff 12
gh pr create --fill --base main
```

## Actions and CI

```bash
gh run list --workflow ci.yml --limit 15 --json databaseId,status,conclusion,headBranch,url
gh run watch <run-id>
gh run view <run-id> --log-failed
gh workflow list
gh workflow run ci.yml --ref main
```

Use **`gh run view --log-failed`** first when a check is red; escalate to workflow YAML only after you know which job failed.

## API escape hatch

When `gh` has no subcommand for the call:

```bash
gh api repos/{owner}/{repo}/issues/42 --jq '.title'
```

Use **`gh api -h`** or GitHub’s REST docs for path and method; keep payloads minimal.

## Anti-patterns

- Opening GitHub in a browser as the **first** move for data that `gh issue view` / `gh pr view` / `gh run view` returns.
- Pasting large HTML or scraping the web UI.
- Assuming CI state without `gh pr checks` or `gh run list` for the relevant commit/branch.

## See also

- `.github/skills/branch-ci-promotion/SKILL.md` — merge readiness and local `pnpm` verification
- `.github/skills/work-kickoff/SKILL.md` — planning output into issues via `gh`
- `.github/skills/maintaining-ai-context/SKILL.md` — updating skills that reference GitHub workflows
