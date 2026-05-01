# Supersubset — Bootstrap Document

> **Purpose**: Enable a fresh agent session (Claude Opus 4.6, GPT-5.4, or equivalent) to resume work on Supersubset without any prior chat history.

## Quick Orientation

**Supersubset** is an embeddable open-source analytics builder/runtime library for React applications. It is NOT a full BI platform. Think "Form.io for analytics dashboards."

### Key Files to Read First

1. **`initial-spec.md`** — Full project specification
2. **`AGENTS.md`** — Orchestrator operating instructions
3. **`docs/status/master-plan.md`** — Current phase, task graph, and progress
4. **`docs/status/risk-register.md`** — Active risks and mitigations
5. **`.github/copilot-instructions.md`** — Workspace-wide conventions
6. **`docs/testing/human-checkpoints.md`** — Human gate definitions and review protocols
7. **`docs/testing/verification-strategy.md`** — When/where Playwright and Chrome MCP tests happen
8. **`.github/skills/parallel-agent-environments/SKILL.md`** — Parallel work: branch isolation, file-scope ownership, ports, merge sequencing
9. **`.github/skills/github-cli/SKILL.md`** — Use `gh` for GitHub (issues, PRs, Actions, API); avoid slow browser-first flows
10. **`.github/skills/release-runbook/SKILL.md`** — End-to-end release path: candidate validation, changesets, promotion, publish, downstream upgrade

### Where Things Are

```
.github/
├── agents/           # Specialized subagent definitions (orchestrator + domain agents)
├── skills/           # Domain + planning skills (orchestration, testing, work-kickoff, branch-ci-promotion, …)
├── instructions/     # File-specific coding rules
└── copilot-instructions.md

docs/
├── dev/              # Local multi-agent / port / worktree notes
├── adr/              # Architecture Decision Records
├── api/              # Public package reference docs
├── guides/           # Task-focused how-to guides
├── status/
│   ├── master-plan.md
│   ├── risk-register.md
│   ├── checkpoints/  # HC-N briefs and results (HUMAN GATES)
│   └── phase-summaries/
├── testing/
│   ├── verification-strategy.md   # When/where tests happen
│   ├── human-checkpoints.md       # Human review protocol
│   ├── browser-test-plans/        # Chrome MCP plans A/B/C/D
│   └── qa-checklist.md
├── schema/
└── research/

e2e/                  # Playwright E2E tests (created in Phase 0)
├── renderer/         # Chart/widget rendering tests
├── designer/         # Editor UI tests
├── interactions/     # Filter/cross-filter tests
├── integration/      # Host app mount tests
├── workflows/        # Full user journey tests
└── fixtures/         # Test data

screenshots/          # Visual verification evidence
├── phase-N/          # Milestone screenshots
└── baselines/        # Approved baselines for regression

packages/             # Monorepo packages (once created)
```

## How to Resume Work

### Step 1: Determine Current State

```
1. Read docs/status/master-plan.md
   → Find current phase and which tasks are complete/in-progress
2. Read docs/status/risk-register.md
   → Check for any blockers
3. Read the latest docs/status/phase-summaries/*.md
   → Understand recent progress
4. Run: git log --oneline -20
   → See recent commits
```

### Step 2: Understand What's Been Decided

```
1. Read all files in docs/adr/
   → These are the binding architecture decisions
2. Read docs/research/reuse-matrix.md (if exists)
   → Understand reuse vs rewrite decisions
```

### Step 3: Pick Up Next Task

```
1. Find the first "Not started" task in the current phase
2. Check its dependencies — are they all complete?
3. Read the relevant agent definition in .github/agents/
4. Execute the task according to the agent's constraints
5. Update master-plan.md when the task is complete
```

### Step 4: Validate Your Work

```
1. Run tests: pnpm test (in affected packages)
2. Run lint: pnpm lint
3. Run typecheck: pnpm typecheck
4. For UI work: use Chrome MCP for browser verification
5. Run Snyk code scan for new code
```

## Core Architectural Rules (Quick Reference)

1. **Library-first**: npm packages, not a standalone app
2. **Schema-first**: The canonical schema IS the contract
3. **Backend-agnostic**: No required Superset/Rill/Lightdash backend
4. **Adapter-first metadata**: Never depend directly on Prisma/dbt specifics in core
5. **Renderer ≠ editor**: Runtime works without designer imports
6. **Host-owned persistence**: Designer emits schema, host persists
7. **Host-owned auth**: Accept capability metadata only
8. **No iframe**: Core editor/renderer are React components

## Tech Stack

- TypeScript, React, pnpm monorepo
- Puck (editor shell), ECharts (chart rendering)
- Zod (validation), JSON Schema (canonical format)
- Vitest (testing), Storybook (docs), Chrome MCP (browser testing)

## Non-Goals

Do NOT accidentally build:

- A full BI platform
- A warehouse-native semantic layer
- An iframe-based embedding system
- A Superset/Rill/Lightdash clone
- A required backend service
