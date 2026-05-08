---
name: work-kickoff
description: 'Plan new Supersubset work (feature, bug, refactor) from conversation to an implementation-ready GitHub issue. Use when the human wants a spec before code, needs a tiered skill list for implementers, or should gate scope via master-plan / ADRs. Planning only — not implementation.'
---

# Work Kickoff (Supersubset)

Turn a described work item into a **self-contained GitHub issue** so a fresh agent (or subagent) can implement without chat history.

## When to Use

- The human wants **design + plan captured in GitHub** before implementation.
- Work may touch **multiple packages** (`packages/schema`, `packages/designer`, `packages/runtime`, adapters, `e2e/`, etc.) and needs explicit sequencing.
- You need to **list which `.github/skills/`** and **which agents** apply so implementers load the right context.

**Not for:** writing production code in the same session. For multi-package implementation after approval, use `.github/skills/orchestration/SKILL.md` and the appropriate `.github/agents/*.agent.md` briefs.

## Workflow

### Step 1: Orient in-repo

1. Read **`initial-spec.md`** for invariants that must not be violated.
2. Read **`AGENTS.md`** (orchestrator rules, verification expectations).
3. Read **`docs/status/master-plan.md`** — note current phase, related tasks, and human checkpoints (HC-N) if any.
4. Skim **`docs/status/risk-register.md`** when the change affects stability, compatibility, or release timing.
5. Explore code in the affected packages; find patterns to extend, not reinvent.
6. For schema-first work, perform a contract-closure audit: can the feature work from `DashboardDefinition` plus explicit host-owned boundaries only, or is the current design sneaking authored semantics into extra props/callbacks?

### Step 2: Tier the skills (and agents)

Scan **`.github/skills/*/SKILL.md`** and classify each as **essential**, **supporting**, or **not relevant**. Optionally map work to **`.github/agents/`** (e.g. `designer`, `runtime`, `testing`) for delegation later.

| Tier             | Meaning                                        |
| ---------------- | ---------------------------------------------- |
| **Essential**    | Implementer must read before coding            |
| **Supporting**   | Read when touching that surface                |
| **Not relevant** | Explicitly excluded (proves you considered it) |

Always evaluate **`orchestration`** for multi-package delivery and **`browser-testing`** when UI behavior is in scope.

### Step 3: Write the implementation plan (in the issue body or comment)

Structure:

1. **Context** — Problem, user-visible outcome, link to master-plan task if applicable.
2. **Design decisions** — Choices + rationale (schema vs UI-only, adapter boundaries, etc.). Name every required host-owned seam and justify any sidecar input that carries authored semantics.
3. **Phases** — Ordered steps (e.g. schema/types → runtime → designer → tests → docs/screenshots).
4. **Key files** — Table: path → one-line intent.
5. **Testing** — Unit targets, `pnpm test`, Playwright / Chrome MCP plans (`docs/testing/`), Storybook if relevant.
   For parallel local validation, include the leased port tuple and the probe command (`node scripts/find-free-port.mjs --count 3`) in the issue.
6. **Verification** — Commands: `pnpm lint && pnpm typecheck && pnpm test` (root); package-scoped variants if faster.
7. **Docs / evidence** — If UI-facing: follow **`document-feature`** (screenshots, MDX); do not commit throwaway images to unrelated paths.

### Step 4: Create or augment the GitHub issue

Follow **`.github/skills/github-cli/SKILL.md`** for `gh` flags and JSON output patterns.

- If an issue already exists, **append** a planning comment with the tiers + plan; do not duplicate tickets.
- Otherwise `gh issue create` with summary, requirements, **tiered skills table**, design, plan, testing, verification.
- Link **`docs/adr/`** candidates when the change might need a new ADR (orchestrator approves architecture ADRs per `AGENTS.md`).

The issue must be **self-contained** — a new session implements from the issue + linked files only.

### Step 5: Human review gate

Stop for human approval of the issue before implementation unless they explicitly waived it.

### Step 6: Hand off

After approval, implementers: follow the issue, load essential skills, respect agent/package boundaries from **`AGENTS.md`**. For **parallel agents or multiple checkouts**, see **`.github/skills/parallel-agent-environments/SKILL.md`** to avoid port and file-scope collisions, and record the exact leased local origins in the issue if browser validation is part of the work.

## Principles

- **Plan in GitHub**, not only in chat.
- **Skills are the playbook** — list them explicitly in the issue.
- **Master plan alignment** — if the repo uses phased delivery, tie the issue to a master-plan line or add a follow-up to update `docs/status/master-plan.md`.
- **No silent architecture** — schema/package/deps changes belong in ADR + orchestrator path per `AGENTS.md`.

## Anti-patterns

- Coding before issue approval.
- Duplicate issues for the same workstream.
- Vague “fix the designer” without files, acceptance criteria, or test expectations.
- Plans that omit **`pnpm lint` / `pnpm typecheck` / `pnpm test`** verification.
- Treating an undocumented host sidecar prop as acceptable completion for a schema-first feature.

## See also

- `.github/skills/github-cli/SKILL.md`
- `.github/skills/orchestration/SKILL.md`
- `.github/skills/document-feature/SKILL.md`
- `.github/skills/parallel-agent-environments/SKILL.md`
- `docs/bootstrap.md`
