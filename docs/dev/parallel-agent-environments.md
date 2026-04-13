# Parallel agents, branches, and ports

Supersubset is simpler than Tripmatch: a handful of fixed ports power local dev and Playwright. **Collisions still happen** when multiple people or multiple autonomous agents run the same defaults on one machine.

## Default ports (today)

| Port | Consumer | Notes |
| ---- | -------- | ----- |
| **3000** | `@supersubset/dev-app` (Vite) | Primary designer/runtime dev shell. `playwright.config.ts` `baseURL` and first `webServer` entry. |
| **3001** | Next.js ecommerce example | Playwright `webServer` second entry. |
| **3002** | Vite + SQLite example | Playwright `webServer` third entry. |
| **6006** | Storybook (`pnpm storybook`) | Optional; separate from Playwright defaults. |
| **4321** | Astro docs (`pnpm --filter @supersubset/docs dev`) | Fixed in `packages/docs/package.json` (`astro dev --port 4321`). |

## Failure modes

1. **Two `pnpm dev` for dev-app** — second process loses the race on **3000** (bind error or wrong server).
2. **Playwright + human dev** — Playwright’s `reuseExistingServer: !CI` reuses whatever is on **3000**; can be correct or can attach to a stale wrong revision.
3. **Two Playwright runs** — both try to start the same `webServer` commands on the same ports.
4. **Agent A on issue 12 + Agent B on issue 34 in one checkout** — git conflicts; separate **worktrees** fix git, not ports — still one dev server unless ports differ.

## Strategy A — One writer per machine (simplest)

- Only one long-lived `pnpm --filter @supersubset/dev-app dev` on **3000**.
- Other agents do **read-only** exploration or run **tests sequentially**.
- Good for solo dev + occasional agent assist.

## Strategy B — Git worktrees (isolate branches, share ports policy)

Use a **separate clone or `git worktree add`** per active issue when agents need parallel **git** state.

1. Create a worktree:  
   `git worktree add ../supersubset-issue-NNN -b issue/NNN-slug origin/main`  
   (Adjust base branch to your team’s convention.)
2. Each worktree is an independent working directory with its own `node_modules` after `pnpm install`.
3. **Still assign a unique dev port per worktree** if more than one dev server runs at once (Strategy C).

Worktrees do **not** automatically solve ports; they solve **branch + dependency + build artifact** isolation.

## Strategy C — Port lease per active server (multi-agent / multi-worktree)

### Dev-app only

Set **`SUPERSUBSET_DEV_APP_PORT`** to a free port (e.g. `3010`, `3020`) **before** starting Vite in that worktree/session:

```bash
export SUPERSUBSET_DEV_APP_PORT=3010
pnpm --filter @supersubset/dev-app dev
```

Chrome MCP / manual browser: open `http://localhost:3010`.

Playwright against that instance:

```bash
export SUPERSUBSET_DEV_APP_PORT=3010
pnpm exec playwright test
```

The root `playwright.config.ts` and `packages/dev-app/vite.config.ts` read this env (default **3000** when unset).

### Full Playwright stack (dev-app + examples)

The repo `webServer` block also starts examples on **3001** and **3002**. Running **two** full Playwright stacks on one host is usually wrong; **serialize** E2E runs or add follow-up work to parameterize example ports via env (same pattern as dev-app).

## Recommended conventions for orchestrated multi-agent work

1. **Coordinator assigns a port** in each brief when two implementation agents could run servers concurrently, e.g. “Agent 1: `SUPERSUBSET_DEV_APP_PORT=3010` … Agent 2: `3011` …”.
2. **Document the port** in the GitHub issue or PR comment so humans do not collide.
3. **Do not** assume Playwright “always starts the right server” when something is already listening — prefer explicit `SUPERSUBSET_DEV_APP_PORT` for agent-driven sessions.
4. **CI**: leave env unset so CI keeps default **3000** unless the workflow defines otherwise.

## Optional future automation (not implemented)

- `tools/issue-worktree.sh` — create worktree + pick next free port from a range + write `.env.local.supersubset` with assigned port.
- `pnpm dev:agent -- --port 3012` — thin wrapper setting env.
- **File lock** under `/tmp` or `.git/` to reserve ports on shared machines — only if you routinely run many agents on one host.

## Related skills

- `.github/skills/branch-ci-promotion/SKILL.md` — what to run before merge.
- `.github/skills/browser-testing/SKILL.md` — Chrome MCP against a **running** URL (include port in the brief).
- `.github/skills/work-kickoff/SKILL.md` — planning handoff should mention port/worktree expectations when relevant.
