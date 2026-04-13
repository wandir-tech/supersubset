---
name: maintaining-ai-context
description: "Add, update, or audit Supersubset AI context: .github/skills, .github/agents, AGENTS.md, copilot-instructions, docs/status, docs/testing. Use when creating a skill, shrinking bloat, fixing stale cross-references, or aligning agents with orchestration."
---

# Maintaining AI Context (Supersubset)

Supersubset keeps agent/playbook context in **`.github/`** and **`docs/`** (not a separate `.ai/` tree). This skill merges the **“how to edit”** and **“how to audit”** responsibilities into one place.

## Scope (what this skill owns)

| Artifact | Role |
| -------- | ---- |
| `.github/skills/*/SKILL.md` | How-to playbooks |
| `.github/agents/*.agent.md` | Subagent definitions + tool allowlists |
| `AGENTS.md` | Orchestrator + recovery + pointers |
| `.github/copilot-instructions.md` | Lean always-on Copilot summary |
| `.github/skills/github-cli/SKILL.md` | Canonical `gh` patterns for GitHub operations |
| `docs/bootstrap.md` | Fresh-session orientation |
| `docs/status/*` | Master plan, risks, phase summaries, checkpoints |
| `docs/testing/*` | Verification strategy, QA lists, browser plans |

## When to add a new skill

- A **repeatable procedure** is being reinvented across issues (orchestration already points to patterns — extract when stable).
- **Triggers** belong in the YAML `description:` (one line, “Use when …”).
- Keep body **focused**; link to `docs/` for long reference material.
- Add a **See also** back-link from related skills or `AGENTS.md` if discoverability is low.

## When to add or change an agent file

- **Package boundaries** and **tool lists** stay accurate (`tools:`, MCP tool names).
- **Handoffs** must reference agents that **exist** in `.github/agents/`.
- Keep **`user-invocable`** accurate for Copilot Agents UX.

## Audit passes (targeted “ai-context-review”)

Run these when context feels bloated or agents misfire.

### Pass A — Structural

- [ ] Every skill referenced from `AGENTS.md` / `orchestration` / `bootstrap` exists.
- [ ] Agent `handoffs` → existing agent files.
- [ ] `docs/bootstrap.md` file tree matches repo (update counts/paths when packages move).

### Pass B — Signal vs noise

- [ ] **`copilot-instructions.md`** stays short; deep content lives in skills or `docs/guides/`.
- [ ] Skills avoid duplicating **`initial-spec.md`** invariants — reference instead.
- [ ] No stale ports/URLs/commands — compare to `package.json` scripts and `playwright.config.ts`.

### Pass C — Duplication

- [ ] One source of truth per workflow (e.g. verification commands not copy-pasted in five skills — cross-link `branch-ci-promotion`).

### Pass D — Discoverability

- [ ] New skills linked from `bootstrap.md` “read first” or orchestration “See also” as appropriate.

## Size guidance

| Artifact | Heuristic |
| -------- | --------- |
| `copilot-instructions.md` | Keep roughly under ~80 lines of dense lists |
| Single skill | Split beyond ~300 lines; add `docs/guides/` for narrative |
| `AGENTS.md` | Index + protocols; move long prose into skills |

## Anti-patterns

- Duplicating the same verification checklist in every skill — use **`branch-ci-promotion`**.
- Putting architecture essays in **`copilot-instructions.md`** — use ADRs + schema docs.
- Orphan skills never linked from bootstrap, AGENTS, or another skill.

## See also

- `.github/skills/github-cli/SKILL.md`
- `.github/skills/orchestration/SKILL.md`
- `.github/skills/branch-ci-promotion/SKILL.md`
- `docs/bootstrap.md`
