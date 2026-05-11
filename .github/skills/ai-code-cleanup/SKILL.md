---
name: ai-code-cleanup
description: 'Continuously detect and remove AI-assisted code drift in Supersubset. Use when generated code has introduced duplication, dead abstractions, prompt-shaped code, hidden coupling, stale instructions, weak validation, or oversized cleanup PRs; routes work through the orchestrator and package owners.'
---

# AI Code Cleanup

Supersubset treats cleanup as continuous maintenance, not a rare refactor sprint.

Agents amplify whatever patterns are already nearby. If the repo contains one-off helpers, weak boundaries, stale instructions, or low-signal tests, later generations will reproduce those shapes faster than humans can manually unwind them. This skill keeps the codebase legible and prevents AI-assisted output from turning local shortcuts into project standards.

## When to Use

- AI-assisted changes introduced duplicate helpers, components, hooks, adapters, option builders, or fixtures.
- Generated code copied a pattern that already has a better repo-native implementation.
- Review feedback repeats the same themes: dead abstractions, hidden coupling, prompt-shaped code, weak tests, stale docs, or unnecessary flags.
- A change only passes because CI, lint, or test thresholds were weakened.
- Similar cleanup comments keep reappearing across packages or worktrees.
- A release candidate or milestone needs a ranked cleanup queue rather than another feature PR.

## What Good Cleanup Means

A good cleanup task does four things:

1. Removes local drift without reopening architecture unnecessarily.
2. Restores or strengthens the nearest reusable abstraction.
3. Proves the cleaned path still works with executable evidence.
4. Encodes the lesson so the same debt is harder to reintroduce.

## Cadence

- Default to cleanup inside the same branch or PR that introduced the drift.
- Run a short orchestrated cleanup pass when the same review themes repeat or before a release checkpoint.
- Do not depend on a big monthly cleanup sprint. Continuous garbage collection scales better than delayed rescue work.

## Memory Construct

In this repo, memory is formalized first as written project artifacts, then secondarily as tool or session memory.

### Canonical memory

Use repo-tracked documents as the source of truth when another agent or a future session must be able to resume without chat history.

- `docs/bootstrap.md` is the recovery entry point for fresh sessions.
- `docs/status/master-plan.md` is the canonical task graph and current-state ledger.
- `docs/status/risk-register.md` records active risks and mitigations.
- `docs/cleanup/history/` stores multi-round cleanup campaign logs, PR links, CI state, and next-step handoffs.
- `docs/status/checkpoints/` stores checkpoint briefs and human decisions.
- `docs/status/phase-summaries/` stores durable completion summaries.

This is the repo's formal long-term memory. If a cleanup campaign matters after the current turn or branch, its state belongs here or in another committed repo artifact, not only in tool memory.

### Campaign memory

`docs/cleanup/history/` is the default history bucket for cross-domain cleanup campaigns.

Follow its structure when the cleanup work is itself a repeated audit campaign:

- use dated markdown entries named `YYYY-MM-DD-slug.md`
- record the triggering signal, scope, findings, fixes, local validation, PR status, CI status, human-check status, and next step
- make the file the canonical campaign plan when multiple agents or sessions will touch the work

`docs/testing/history/` remains a sibling pattern for testing-only or QA-specific hardening campaigns.

Do not put general cleanup history under `docs/testing/history/` unless the campaign is specifically about QA, browser verification, or testing hardening.

### Session memory

Session memory is allowed for in-progress notes, but it is not the system of record. The risk register already treats session memory as support for long-running execution, not as a substitute for durable project artifacts.

Before ending a cleanup session, promote anything another agent must know into repo-tracked docs, tests, instructions, or issue records.

### Naming rule

- append-only memory or history entries should use `YYYY-MM-DD-slug.md`
- singleton canonical artifacts such as `docs/status/master-plan.md`, `docs/status/risk-register.md`, and checkpoint IDs keep their stable names

### Practical rule

- one-shot local cleanup: tests, diffs, and the skill or instruction update may be enough; no separate history file by default
- multi-round cleanup campaign: create or update `docs/cleanup/history/YYYY-MM-DD-slug.md` and treat it as canonical memory
- testing-only hardening or QA sweep: reuse the `docs/testing/history/` pattern directly

## Common Drift Signals

| Signal                                                        | Typical problem                                               | Default owner                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| Duplicate helpers or near-clone logic                         | AI extended nearby code instead of reusing existing utilities | owning domain agent + `Explore`                                     |
| Abstraction with one caller or many optional flags            | premature generalization                                      | owning domain agent                                                 |
| Hidden cross-package imports or boundary leaks                | local fix bypassed package contract                           | `architecture` before implementation                                |
| Test asserts internal steps but not user-visible outcome      | low-signal validation                                         | `testing` + owning domain agent                                     |
| Stale `AGENTS.md`, skill docs, or examples after code cleanup | harness drift                                                 | current agent with `.github/skills/maintaining-ai-context/SKILL.md` |
| Repeated lint disables or TODO comments                       | unresolved debt being normalized                              | owning domain agent                                                 |
| Large cleanup PR spanning unrelated packages                  | cleanup not sliced by boundary                                | `orchestrator`                                                      |

## Anti-Patterns

- Adding a new helper before searching for an existing repo-native one.
- Extracting an abstraction from a single call site with speculative flags.
- Keeping dead branches, stale props, or compatibility aliases after the caller set is known.
- Bundling behavior changes, formatting churn, and cleanup in the same PR.
- Opening one PR per trivial lint-only cleanup when a same-class batch would stay readable and share the same proof.
- Relaxing CI, tests, or types to make a generated diff pass.
- Writing tests that prove a click happened but not that the dashboard meaning changed.
- Treating cleanup as a monthly refactor sprint instead of continuous garbage collection.
- Creating a generic cleanup agent that crosses package boundaries by default. Use the existing package owners unless the task is purely signal collection.

## Cleanup Loop

### 1. Collect signals

- Start from the narrowest concrete signal: review comment, failing test, repeated lint disable, dead export, duplicate helper, stale instruction, or large generated diff.
- Use `Explore` for fast codebase mapping before opening broad manual searches.
- Prefer evidence from executable checks, diffs, and repeated review patterns over subjective "this feels messy" reports.

### 2. Slice the work

- Keep each cleanup task inside one package or one explicit shared contract whenever possible.
- Split local simplification from architecture decisions.
- Prefer several small cleanup tasks over one omnibus "AI cleanup" branch.

### 2.5 Batch trivial slices

- Batch trivial cleanup changes into one PR when they are the same class of change, carry the same risk, and share the same proof standard.
- Good batch candidates: several unused imports or dead locals in one package, several stale path references in one docs area, or several adjacent lint-only simplifications that do not change behavior.
- A trivial batch should still stay small enough to review quickly. Prefer one cleanup class per PR, usually across roughly 3 to 10 low-risk edits.
- Stop batching when the next edit changes package ownership, needs a different validation method, touches hot files, or changes runtime behavior.
- For trivial batches, run one local verification gate for the whole batch and then one PR plus CI cycle. Do not open a separate PR for every single unused import or stale path fix.

### 3. Route through the orchestrator

- Local package cleanup goes to the owning domain agent.
- Cross-package consolidation or contract changes go to `architecture` first, then the consumers.
- Repeated test weakness goes to `testing` with the owning domain agent.
- Repeated instruction or harness misses should end with a skill, docs, lint, or template update.
- When two or more cleanup slices are truly disjoint, pair this skill with `.github/skills/parallel-agent-environments/SKILL.md` so branch isolation, file ownership, port leasing, and merge order are explicit.

### 4. Clean up locally

- State one falsifiable hypothesis about the drift before editing.
- Search for existing utilities or patterns before creating a new abstraction.
- Delete first, consolidate second, abstract last.
- Prefer narrower APIs, fewer flags, and repo-native contracts over generic wrappers.
- Avoid drive-by edits outside the owning boundary.

### 5. Validate with the narrowest proof

- Run the cheapest behavior-scoped check that can disconfirm the cleanup.
- If the cleanup is user-visible, prove the user-visible outcome, not just internal state changes.
- For browser flows, combine semantic proof with screenshot or visible-state proof when appropriate.
- Cleanup is not complete until there is post-edit executable validation or a clear statement that no focused executable check exists.

### 6. Encode the lesson

- Add or tighten a regression test.
- Update a skill, instruction, lint rule, template, or helper when the same mistake is likely to recur.
- Escalate to an ADR only when cleanup reveals a real boundary or contract decision.

### 6.5 Human-check gate

- Do not request a human checkpoint, QA pass, or manual sign-off until the required local tests and checks for the touched surface are green.
- Push the cleanup branch and open a PR to `develop` before asking for a human check.
- Required cloud CI on that PR must be green before a human checkpoint begins.
- Use `.github/skills/branch-ci-promotion/SKILL.md` for the branch and CI gate, and `.github/skills/github-cli/SKILL.md` for PR and Actions commands.

### 7. Merge or escalate

- Small, reversible cleanup with strong proof can merge quickly.
- Trivial same-class cleanup may merge as a batched PR when the review surface is still tight and the validation is shared.
- Cleanup that changes public API, package boundaries, schema contracts, or behavior requires explicit review and often `architecture` involvement.
- Never weaken CI or coverage gates just to land a cleanup PR.

## Agent Decomposition

This workflow should usually use existing agents, not a new generic cleanup agent.

| Role                                           | Responsibility                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `orchestrator`                                 | Collect cleanup signals, cluster them into PR-sized tasks, define proof, and sequence parallel vs sequential work |
| `Explore`                                      | Map duplicate call sites, dead code, existing utilities, and likely owning abstractions                           |
| `architecture`                                 | Decide whether cleanup crosses package boundaries, shared contracts, or ADR-worthy architecture                   |
| `designer` / `runtime` / `charts` / `metadata` | Perform local cleanup inside owned package boundaries                                                             |
| `testing`                                      | Add regression checks and outcome-based verification, especially for browser-visible behavior                     |
| current agent + `maintaining-ai-context`       | Update skills, AGENTS guidance, or docs when cleanup findings should become repo standards                        |

Use a dedicated cleanup agent only if signal collection itself becomes a stable, repeated workflow that is independent from product-package ownership.

## Parallel Cleanup Execution

Use `.github/skills/parallel-agent-environments/SKILL.md` whenever cleanup has been sliced into independent tasks that can run concurrently.

That skill is sufficient for the execution mechanics:

- one branch and worktree per agent
- disjoint file scopes
- hot files forced back to sequential execution
- leased port tuples for browser or full-stack validation
- merge-order and rebase discipline

It is not sufficient by itself for cleanup strategy. It does not decide:

- what counts as one cleanup slice
- which package owns the drift
- which abstractions should be deleted, consolidated, or preserved
- what proof is required before merge

Use the skills together like this:

- `ai-code-cleanup` decides the drift class, slice boundaries, non-goals, and proof standard
- `orchestration` decides delegation order and worker briefs
- `parallel-agent-environments` makes the concurrent execution safe on a shared machine

### When parallel cleanup is safe

- each slice stays inside a disjoint package or explicitly non-overlapping file set
- no slice needs a hot file such as root `package.json`, root `tsconfig.json`, `pnpm-lock.yaml`, `packages/schema/src/**`, or `docs/status/master-plan.md`
- interfaces are already stable, or one upstream contract change lands first and the rest wait
- validation can run against separate worktrees and explicit origins without attaching to a stale shared server

### When to stay sequential

- the cleanup changes package boundaries, public contracts, or schema types
- several slices need the same helper, test file, or root config
- the cleanup requires one agent's output before another can decide what to delete
- browser validation depends on shared defaults rather than leased ports and explicit URLs

## Orchestrator Pattern

### Phase A - Triage and mapping

- `orchestrator` gathers the signal.
- `Explore` maps duplication, call sites, dead exports, boundary leaks, or repeated suppressions.
- `orchestrator` decides whether the task is local cleanup, cross-package consolidation, or harness/standards work.

### Phase B - Local cleanup work

- Run package-owned cleanup in parallel only when interfaces are already stable.
- Use `.github/skills/parallel-agent-environments/SKILL.md` for the actual branch/worktree/port protocol whenever more than one cleanup agent is active.
- If a shared contract or boundary is implicated, stop and route through `architecture` before parallelizing.
- Keep each agent brief bounded to named files, non-goals, and required validation.

### Phase C - Independent verification and standards update

- `testing` verifies the cleaned-up path with the narrowest reliable proof.
- If the same cleanup class is likely to recur, update instructions, skills, templates, or checks before closing the task.

## Brief Template

```md
## Brief for [Agent Name]

**Signal**: What concrete drift triggered this cleanup?
**Scope**: Which files, symbols, or package boundary does the task own?
**Allowed files**: Exact packages or files the agent may modify
**Off-limits**: What must not change
**Branch/worktree**: Required when running in parallel
**Port tuple**: Required when the slice needs browser or full-stack validation
**Desired simplification**: What duplication, dead abstraction, or coupling should be removed
**Validation**: The narrowest executable proof required before handoff
**Non-goals**: What this cleanup must not expand into
```

## Done Criteria

- The duplicated or drifting pattern is removed or consolidated.
- The resulting code is simpler or more local than before.
- Validation proves the cleaned-up behavior still works.
- Any repeated lesson is encoded into tests, instructions, lints, or helpers.
- Multi-round cleanup campaigns record status in `docs/cleanup/history/YYYY-MM-DD-slug.md`.
- When a human check is required, the branch already has an open PR and green required CI before that checkpoint.
- The cleanup did not silently redesign architecture outside approved boundaries.

## See also

- `.github/skills/orchestration/SKILL.md`
- `.github/skills/testing-strategy/SKILL.md`
- `.github/skills/maintaining-ai-context/SKILL.md`
- `.github/skills/branch-ci-promotion/SKILL.md`
- `.github/skills/parallel-agent-environments/SKILL.md`

## External Basis

This skill is informed primarily by OpenAI guidance on harness engineering and living execution plans, Anthropic guidance on effective agents and long-running harnesses, GitHub guidance on reviewing agent pull requests and validating outcomes, and Thoughtworks' warning about complacency with AI-generated code.
