---
name: parallel-agent-environments
description: 'Coordinate parallel agent work on unrelated tasks. Use when multiple agents need to run concurrently — covers branch isolation, file-scope ownership, port assignment, merge sequencing, and worktree setup.'
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

| File                         | Why                                                    |
| ---------------------------- | ------------------------------------------------------ |
| `package.json` (root)        | Workspace deps, scripts                                |
| `tsconfig.json` (root)       | Path aliases                                           |
| `packages/schema/src/**`     | Canonical types consumed everywhere                    |
| `pnpm-lock.yaml`             | Auto-generated; two branches adding deps will conflict |
| `docs/status/master-plan.md` | Single-writer: the orchestrator                        |

If an agent needs a hot file, the orchestrator either: (a) does that edit itself before dispatching, or (b) assigns it to **one** agent and makes others wait.

### 4. Merge order

- First agent to complete merges first.
- Second agent rebases onto the updated target branch before merging, usually `develop` for normal feature/fix work.
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

| Port     | Consumer                      | Notes                                                                                                       |
| -------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **3000** | `@supersubset/dev-app` (Vite) | `playwright.config.ts` `baseURL` + first `webServer` entry; env-configurable via `SUPERSUBSET_DEV_APP_PORT` |
| **3001** | Next.js ecommerce example     | Default; env-configurable via `SUPERSUBSET_EXAMPLE_NEXTJS_PORT`                                             |
| **3002** | Vite + SQLite example         | Default; env-configurable via `SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT`                                        |
| **6006** | Storybook                     | Optional; separate from Playwright                                                                          |
| **4321** | Astro docs                    | Fixed in `packages/docs/package.json`                                                                       |

Treat these as **defaults**, not leases. Parallel agents should claim ports explicitly rather than assuming `3000`/`3001`/`3002` are free.

### Failure modes

1. **Two `pnpm dev` for dev-app** — second process loses the port race.
2. **Playwright + human dev** — `reuseExistingServer: !CI` may attach to a stale revision.
3. **Two Playwright runs** — both start the same `webServer` on the same ports.
4. **Two agents, one checkout** — git conflicts; worktrees fix git but not ports.
5. **An agent forgets to export the leased example ports** — Playwright or browser tooling attaches to the default examples instead of the branch-local instance.

### Strategy A — One writer per machine (simplest)

- One long-lived `pnpm --filter @supersubset/dev-app dev` on **3000**.
- Other agents do read-only exploration or run tests sequentially.

### Strategy B — Git worktrees

Separate `git worktree add` per active issue when agents need parallel git state:

```bash
git fetch origin
git worktree add ../supersubset-issue-NNN -b issue/NNN-slug origin/develop
cd ../supersubset-issue-NNN && pnpm install
```

Base worktrees from the remote target branch, not a stale local branch.

- Normal feature/fix work: `origin/develop`
- Hotfix/release work only: `origin/main` or the explicit promotion branch

Worktrees solve **branch + dependency + build artifact** isolation — not ports.

### Strategy C — Port lease per server

Use the shared probe script at repo root instead of guessing or copy-pasting one-off shell snippets.

Single port:

```bash
node scripts/find-free-port.mjs --start 3010 --end 3099
```

Full browser-validation tuple:

```bash
mapfile -t LEASED_PORTS < <(node scripts/find-free-port.mjs --start 3110 --end 3199 --count 3)
export SUPERSUBSET_DEV_APP_PORT="${LEASED_PORTS[0]}"
export SUPERSUBSET_EXAMPLE_NEXTJS_PORT="${LEASED_PORTS[1]}"
export SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT="${LEASED_PORTS[2]}"
```

Port lease protocol:

1. Probe a free port from the team's agreed local range.
2. Claim it in the brief, issue comment, or PR draft.
3. Start only the servers that branch actually needs.
4. Pass the leased port explicitly to tests and browser tooling.
5. Release the port when validation is complete.

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

`playwright.config.ts`, the example host dev servers, `e2e/workflows/host-integration.spec.ts`, and `e2e/workflows/host-workbench.spec.ts` now accept these env vars:

- `SUPERSUBSET_DEV_APP_PORT`
- `SUPERSUBSET_EXAMPLE_NEXTJS_PORT`
- `SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT`

For a full isolated browser stack, lease a **port tuple**, then export all three before running Playwright.

```bash
mapfile -t LEASED_PORTS < <(node scripts/find-free-port.mjs --start 3110 --end 3199 --count 3)
export SUPERSUBSET_DEV_APP_PORT="${LEASED_PORTS[0]}"
export SUPERSUBSET_EXAMPLE_NEXTJS_PORT="${LEASED_PORTS[1]}"
export SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT="${LEASED_PORTS[2]}"
pnpm exec playwright test e2e/workflows/host-integration.spec.ts --project=chromium
```

**Full Playwright stack**: The default `webServer` block still tries to stand up the whole stack, but it can now do so on a leased port tuple. Two agents can run in parallel if they use disjoint tuples.

### Strategy D — Independent PR mode

This is the target behavior for parallel agents: each agent can get to a PR without relying on another checkout's servers.

Use this stack:

1. Dedicated worktree from the current remote base.
2. Disjoint file scope.
3. Leased local ports recorded in the brief as a tuple when full-stack browser validation is needed.
4. Targeted validation in that worktree (`typecheck`, `build`, focused tests).
5. Browser validation against the branch's explicit URL, not an assumed shared default.

If a branch adds or edits browser tests, prefer env-aware origins over hardcoded `http://localhost:3001` style URLs.

### Orchestrator port conventions

1. **Assign or lease a port tuple** in the brief when needed: `SUPERSUBSET_DEV_APP_PORT=3110`, `SUPERSUBSET_EXAMPLE_NEXTJS_PORT=3111`, `SUPERSUBSET_EXAMPLE_VITE_SQLITE_PORT=3112`.
2. **Document the full origin** in the GitHub issue/PR comment when browser validation is involved.
3. **Never assume** Playwright or Chrome MCP picked the right server — be explicit.
4. **Avoid hardcoded local URLs** in new tests when an env-driven origin is feasible.
5. **CI**: leave env unset unless the workflow intentionally overrides defaults.

---

## Checklist for the orchestrator

Before dispatching parallel agents:

- [ ] Each agent has its own branch name
- [ ] Each worktree/branch is created from the current remote target base (`origin/develop` for normal work)
- [ ] File scopes are disjoint (no overlapping packages)
- [ ] Hot files are pre-edited or assigned to one agent only
- [ ] Ports assigned if agents need dev servers
- [ ] Ports are probed or leased, not guessed from defaults
- [ ] Browser validation uses the branch's explicit origin when shared defaults are unsafe
- [ ] Merge order documented if agents share a target branch

## See also

- `.github/skills/orchestration/SKILL.md` — task decomposition and delegation
- `.github/skills/branch-ci-promotion/SKILL.md` — merge readiness checks
- `.github/skills/browser-testing/SKILL.md` — Chrome MCP against a running URL
- `.github/skills/work-kickoff/SKILL.md` — planning handoff with port/worktree expectations
