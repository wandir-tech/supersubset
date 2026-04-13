# Supersubset — Workspace Instructions

## Project Identity

**Supersubset** is an embeddable open-source analytics builder/runtime library for React applications.
It is NOT a full BI platform. It is a library-first, schema-first toolkit.

## Architecture Invariants

1. **Library-first**: Everything ships as npm packages consumable by host React apps.
2. **Schema-first**: The canonical dashboard schema IS the product contract.
3. **Backend-agnostic**: No required Superset/Rill/Lightdash backend.
4. **Adapter-first metadata**: Designer/runtime never depend directly on Prisma/dbt/ClickHouse specifics.
5. **Renderer independent from editor**: Runtime works without designer dependencies.
6. **Host-owned persistence**: Designer emits schema; host app persists it.
7. **Host-owned auth**: Supersubset accepts capability metadata within caller permissions.
8. **No iframe architecture**: Core editor/renderer are React components, not iframes.

## Tech Stack

- TypeScript throughout all frontend packages
- React for UI components
- Puck as the base editor shell (unless discovery proves it a blocker)
- Apache ECharts as primary chart runtime
- Zod for runtime validation
- JSON Schema generated from canonical types
- Monorepo with package boundaries enforced
- Storybook for component documentation

## Key Conventions

- All code in `packages/` follows the monorepo structure defined in initial-spec.md
- Every package has its own `package.json`, `tsconfig.json`, and test setup
- Use `pnpm` as the package manager
- Tests are mandatory for every significant feature
- ADRs go in `docs/adr/` using the template in `docs/adr/000-template.md`
- Status updates go in `docs/status/`
- Browser test plans go in `docs/testing/`

## Security

- Run Snyk code scan on all new first-party code
- Fix any security issues before merging
- No hardcoded credentials or secrets
- Validate all external inputs at system boundaries
- Follow OWASP Top 10 guidelines

## Non-Goals (Do NOT Build)

- A full BI warehouse platform
- A warehouse-native semantic layer product
- A multi-tenant hosted analytics service
- An iframe-based embedded whole-app clone
- Tight dependency on dbt, Rill, ClickHouse, or any single modeling system
- A forced metastore/backend coupling like Superset's architecture

## Agent Coordination

- The orchestrator agent maintains the master plan in `docs/status/master-plan.md`
- Subagents produce artifacts, not just prose
- All architecture changes require ADR approval via the orchestrator
- Subagents work in parallel only when interfaces are already specified or mockable
- Every phase includes code validation, tests, and browser verification

## Additional skills (`.github/skills/`)

- **`github-cli`** — Prefer `gh` for issues, PRs, Actions runs, and API (`gh auth status` first)
- **`work-kickoff`** — Plan/spec → GitHub issue before implementation
- **`branch-ci-promotion`** — Branch + `pnpm lint` / `typecheck` / `test` (+ E2E when relevant) before merge
- **`maintaining-ai-context`** — Keep skills, agents, and entry points lean and cross-linked
- **`docs/dev/parallel-agent-environments.md`** — Avoid port conflicts when multiple agents or worktrees run dev servers (`SUPERSUBSET_DEV_APP_PORT`)
