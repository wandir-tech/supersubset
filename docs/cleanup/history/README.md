# Cleanup History

`docs/cleanup/history/` is the canonical history bucket for multi-round cleanup campaigns.

Use it when cleanup work spans more than one round, branch, PR, or agent session.

## Naming

- Use `YYYY-MM-DD-slug.md` for append-only entries.
- Keep one file per campaign or checkpoint-sized cleanup slice.

## What to record

- triggering signal
- scope and owning branch or worktree
- findings and fixes applied
- local validation status
- PR status
- required cloud CI status
- human-check status
- next step

## When not to use it

- one-shot local cleanup with no follow-up history
- QA-only or browser-only hardening campaigns that belong in `docs/testing/history/`

## Suggested template

```md
# [Campaign title]

## Signal

## Scope

## Findings

## Fixes

## Local Validation

## PR

## Cloud CI

## Human Check

## Next Step
```
