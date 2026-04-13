---
name: orchestration
description: "Expert delegation of multi-step tasks to specialized subagents. Use when coordinating complex work across architecture, designer, runtime, charts, metadata, testing, or research agents. Covers task decomposition, dependency analysis, parallel vs sequential planning, brief writing, result reconciliation, and phase-gate verification."
---

# Agent Orchestration Skill

This skill teaches how to decompose complex tasks and delegate them to specialized subagents in the Supersubset project.

## When to Use This Skill

- A task touches multiple packages or domains
- Work can be parallelized across independent agents
- A feature requires coordinated changes to schema + runtime + designer
- A phase gate or human checkpoint is approaching
- You need to plan, execute, verify, and reconcile multi-agent work

## Available Subagents

| Agent | Domain | Modifies | Read-only tools? |
|-------|--------|----------|-----------------|
| `architecture` | Schema, ADRs, package boundaries | `packages/schema/`, `docs/adr/`, `docs/schema/` | No |
| `designer` | Puck editor, drag/drop, property panels | `packages/designer/`, `packages/dev-app/` | No |
| `runtime` | Renderer, layout, widget registry, filters | `packages/runtime/`, `packages/dev-app/` | No |
| `charts` | ECharts wrappers, config translation, themes | `packages/charts-echarts/` | No |
| `metadata` | Adapters, Prisma/SQL/dbt/JSON, data-model | `packages/data-model/`, `packages/adapter-*/`, `packages/query-client/` | No |
| `testing` | E2E tests, Chrome MCP, QA, fixtures | `e2e/`, `docs/testing/`, `screenshots/` | No |
| `research` | OSS archaeology, reuse analysis, landscape | `docs/research/` | Yes (read + web) |
| `Explore` | Fast read-only codebase Q&A | None | Yes |

## Task Decomposition Protocol

### Step 1: Analyze the Request

Before delegating, determine:

1. **Which packages are affected?** Map the request to package boundaries.
2. **Are there dependency edges?** E.g., schema changes must land before runtime can consume them.
3. **What is parallelizable?** Independent research, independent package changes, and independent tests can run in parallel.
4. **What requires sequential ordering?** Interface changes → consumers, schema → validation → serialization.
5. **Is a human gate involved?** Check `docs/status/master-plan.md` for upcoming HC-N checkpoints.

### Step 2: Write the Brief

For each subagent task, write a structured brief:

```markdown
## Brief for [Agent Name]

**Scope**: What exactly to do (be specific about files/functions)
**Expected outputs**: List of files to create/modify, tests to write
**Non-goals**: What NOT to do (prevents drift)
**Acceptance criteria**: How to verify the work is correct
**Context**: Links to relevant ADRs, schema types, interfaces
**Constraints**: Which files/packages the agent must NOT modify
```

### Step 3: Determine Execution Order

Classify each subtask:

- **Phase A (parallel)**: Tasks with no dependencies on each other
- **Phase B (sequential after A)**: Tasks that consume Phase A outputs
- **Phase C (verification)**: Testing and validation after implementation

### Step 4: Delegate via Subagents

When invoking subagents:

- **Be specific**: Pass the exact brief, not a vague description
- **Set expectations for output**: Tell the subagent what to return (files changed, test results, issues found)
- **Use the right agent**: Match the domain — don't ask the charts agent to modify the designer
- **Invoke parallel subagents simultaneously**: Use multiple `runSubagent` calls for independent tasks
- **Keep the orchestrator's context clean**: Subagents return summaries, not raw file contents

### Step 5: Reconcile Results

After subagents complete:

1. **Check for conflicts**: Did two agents modify the same file? Resolve before proceeding.
2. **Verify interfaces**: Do the outputs of one agent match what another agent expects?
3. **Run tests**: Execute `pnpm test` in affected packages to validate integration.
4. **Run type check**: Execute `pnpm typecheck` to catch interface mismatches.
5. **Update status**: Record completion in `docs/status/master-plan.md`.

## Delegation Patterns

### Pattern 1: Schema-First Feature

When a new feature requires schema changes:

```
1. architecture agent → Define types + Zod schemas
2. WAIT for schema to land
3. PARALLEL:
   a. runtime agent → Consume new types in renderer
   b. designer agent → Add property editors for new config
   c. charts agent → Update chart wrappers if chart config changed
4. WAIT for all implementations
5. testing agent → Write E2E tests covering the full flow
```

### Pattern 2: Bug Fix Across Packages

```
1. Explore agent → Research the bug: find affected code, root cause
2. Determine which agent owns the fix
3. [owning agent] → Implement the fix
4. testing agent → Add regression test
5. Run verification: pnpm test && pnpm typecheck
```

### Pattern 3: Research → Decision → Implementation

```
1. research agent → Analyze options, produce findings document
2. HUMAN GATE → Review findings
3. architecture agent → Write ADR based on approved findings
4. PARALLEL: implementation agents → Build the approved approach
5. testing agent → Verify
```

### Pattern 4: Independent Package Work

When tasks touch different packages with no shared interfaces:

```
PARALLEL (all at once):
  a. metadata agent → Adapter changes in packages/adapter-*
  b. designer agent → UI changes in packages/designer
  c. charts agent → Chart changes in packages/charts-echarts
```

## Anti-Patterns to Avoid

1. **Sending the whole ask to one agent**: Break it down. Each agent should have a focused brief.
2. **Sequential when parallel is possible**: If two agents touch different packages, run them simultaneously.
3. **Skipping verification**: Always run tests and type checks after reconciliation.
4. **Letting agents drift into architecture changes**: Schema/package boundary changes require the architecture agent and ADR approval.
5. **Not specifying non-goals**: Without non-goals, agents add "improvements" outside scope.
6. **Vague briefs**: "Fix the charts" is bad. "In `packages/charts-echarts/src/bar.tsx`, fix the Y-axis label truncation when labels exceed 20 characters" is good.
7. **Ignoring dependency edges**: Starting runtime work before schema types are finalized causes rework.

## Verification Checklist

After all subagent work completes:

- [ ] All expected output files exist
- [ ] `pnpm test` passes in affected packages
- [ ] `pnpm typecheck` passes across the monorepo
- [ ] No unauthorized schema/package boundary changes
- [ ] `docs/status/master-plan.md` updated with task completion
- [ ] Any new ADRs are properly numbered and linked
- [ ] For UI changes: visual verification via testing agent or Chrome MCP

## Context Recovery

If resuming work after a context reset:

1. Read `docs/status/master-plan.md` — current phase and task state
2. Read `docs/status/risk-register.md` — active risks
3. Read latest `docs/status/phase-summaries/` — recent progress
4. Check `git log --oneline -20` — recent commits
5. Read `docs/adr/` — architecture decisions constraining the work
6. Resume from the first incomplete task in the current phase

## See also

- `.github/skills/github-cli/SKILL.md` — Issues, PRs, Actions via `gh`
- `.github/skills/work-kickoff/SKILL.md` — Spec and GitHub issue before large implementation
- `.github/skills/branch-ci-promotion/SKILL.md` — `pnpm lint` / `typecheck` / `test` merge readiness
- `.github/skills/maintaining-ai-context/SKILL.md` — Editing or auditing skills and agents
- `docs/dev/parallel-agent-environments.md` — Ports and parallel worktrees / agents
