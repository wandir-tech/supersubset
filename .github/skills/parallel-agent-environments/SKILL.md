---
name: parallel-agent-environments
description: "Coordinate parallel agent work on unrelated tasks. Use when multiple agents need to run concurrently — covers branch isolation, file-scope ownership, port assignment, merge sequencing, and worktree setup."
---

# Parallel Agent Environments

Rules for running multiple agents (or a human + agent) on the same machine without conflicts. Two layers: **coordination** (who edits what) and **infrastructure** (ports, branches, worktrees).

## Coordination protocol

### 1. One branch per agent/task

Every agent works on its own branch. Never two agents on the same branch.

```
agent-1 → issue/42-chart-tooltip
agent-2 → issue/55-filter-cascade
```

Branch naming follows `issue/NNN-slug` or `fix/slug` — the orchestrator assigns in the brief.

### 2. Disjoint file scopes

The orchestrator's brief **must** list which packages/files each agent may write. Scopes must not overlap.

```markdown
## Brief for Agent 1
**May modify**: packages/charts-echarts/, e2e/visual/
**Must NOT modify**: packages/designer/, packages/runtime/, packages/schema/

## Brief for Agent 2
**May modify**: packages/runtime/src/filters/, e2e/interactions/
**Must NOT modify**: packages/charts-echarts/, packages/designer/
```

If two tasks need the same file, the orchestrator **sequences** those edits (one completes and merges first).

### 3. Hot files — always sequential

These files are touched by many tasks and must never be edited in parallel:

| File | Why |
| ---- | --- |
| `package.json` (root) | Workspace deps, scripts |
| `tsconfig.json` (root) | Path aliases |
| `packages/schema/src/**` | Canonical types consumed everywhere |
| `pnpm-lock.yaml` | Auto-generated; two branches adding deps will conflict |
| `docs/status/master-plan.md` | Single-writer: the orchestrator |

If an agent needs a hot file, the orchestrator either: (a) does that edit itself before dispatching, or (b) assigns it to **one** agent and makes others wait.

### 4. Merge order

- First agent to complete merges first.
- Second agent rebases onto updated `main` before merging.
- If both touch a hot file despite precautions, the orchestrator resolves the conflict manually before the second merge.
- Always run `pnpm typecheck && pnpm test` after rebase.

### 5. Status signaling

Agents report completion to the orchestrator (via subagent return or PR). The orchestrator:
1. Verifies the output matches the brief
2. Merges (or asks the human to merge)
3. Updates `docs/status/master-plan.md`
4. Dispatches the next batch

---

## Infrastructure isolation

### Default ports

| Port | Consumer | Notes |
| ---- | -------- | ----- |
| **3000** | `@supersubset/dev-app` (Vite) | `playwright.config.ts` `baseURL` + first `webServer` entry |
| **3001** | Next.js ecommerce example | Playwright `webServer` second entry |
| **3002** | Vite + SQLite example | Playwright `webServer` third entry |
| **6006** | Storybook | Optional; separate from Playwright |
| **4321** | Astro docs | Fixed in `packages/docs/package.json` |

### Failure modes

1. **Two `pnpm dev` for dev-app** — second process loses the port race.
2. **Playwright + human dev** — `reuseExistingServer: !CI` may attach to a stale revision.
3. **Two Playwright runs** — both start the same `webServer` on the same ports.
4. **Two agents, one checkout** — git conflicts; worktrees fix git but not ports.

### Strategy A — One writer per machine (simplest)

- One long-lived `pnpm --filter @supersubset/dev-app dev` on **3000**.
- Other agents do read-only exploration or run tests sequentially.

### Strategy B — Git worktrees

Separate `git worktree add` per active issue when agents need parallel git state:

```bash
git worktree add ../supersubset-issue-NNN -b issue/NNN-slug origin/main
cd ../supersubset-issue-NNN && pnpm install
```

Worktrees solve **branch + dependency + build artifact** isolation — not ports.

### Strategy C — Port lease per server

Set **`SUPERSUBSET_DEV_APP_PORT`** before starting Vite:

```bash
export SUPERSUBSET_DEV_APP_PORT=3010
pnpm --filter @supersubset/dev-app dev
```

Playwright against that instance:

```bash
export SUPERSUBSET_DEV_APP_PORT=3010
pnpm exec playwright test
```

`playwright.config.ts` and `packages/dev-app/vite.config.ts` read this env (default **3000**).

**Full Playwright stack**: The `webServer` block also starts examples on 3001/3002. Running two full stacks on one host is usually wrong — serialize E2E runs.

### Orchestrator port conventions

1. **Assign a port** in the brief: "Agent 1: `SUPERSUBSET_DEV_APP_PORT=3010`, Agent 2: `3011`".
2. **Document the port** in the GitHub issue/PR comment.
3. **Never assume** Playwright picks the right server — be explicit.
4. **CI**: leave env unset (default 3000).

---

## Checklist for the orchestrator

Before dispatching parallel agents:

- [ ] Each agent has its own branch name
- [ ] File scopes are disjoint (no overlapping packages)
- [ ] Hot files are pre-edited or assigned to one agent only
- [ ] Ports assigned if agents need dev servers
- [ ] Merge order documented if agents share a target branch

## See also

- `.github/skills/orchestration/SKILL.md` — task decomposition and delegation
- `.github/skills/branch-ci-promotion/SKILL.md` — merge readiness checks
- `.github/skills/browser-testing/SKILL.md` — Chrome MCP against a running URL
- `.github/skills/work-kickoff/SKILL.md` — planning handoff with port/worktree expectations
