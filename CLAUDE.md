# Supersubset — Claude Code Instructions

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
- Puck as the base editor shell
- Apache ECharts as primary chart runtime
- Zod for runtime validation
- JSON Schema generated from canonical types
- Monorepo managed with pnpm workspaces + Nx
- Storybook for component documentation

## Key Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm dev              # Start dev server (dev-app)
pnpm test             # Run unit tests
pnpm test:e2e         # Run Playwright E2E tests
pnpm lint             # ESLint
pnpm typecheck        # TypeScript type checking
pnpm docs:dev         # Start documentation site
```

## Key Conventions

- All code in `packages/` follows the monorepo structure
- Every package has its own `package.json`, `tsconfig.json`, and test setup
- Use `pnpm` as the package manager
- Tests are mandatory for every significant feature
- ADRs go in `docs/adr/`
- Status updates go in `docs/status/`

## Security

- Run Snyk code scan on all new first-party code
- No hardcoded credentials or secrets
- Validate all external inputs at system boundaries
- Follow OWASP Top 10 guidelines

## Non-Goals (Do NOT Build)

- A full BI warehouse platform
- A warehouse-native semantic layer product
- A multi-tenant hosted analytics service
- An iframe-based embedded whole-app clone
- Tight dependency on dbt, Rill, ClickHouse, or any single modeling system

## Package Map

| Package                   | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `packages/schema`         | Canonical dashboard schema types + Zod validation    |
| `packages/runtime`        | Rendering engine, layout, widget registry, filters   |
| `packages/designer`       | Puck-based visual dashboard editor                   |
| `packages/charts-echarts` | ECharts chart wrappers implementing widget interface |
| `packages/theme`          | Theming tokens and ECharts theme bridge              |
| `packages/data-model`     | Normalized metadata model + adapter interface        |
| `packages/adapter-prisma` | Prisma schema → metadata adapter                     |
| `packages/adapter-sql`    | SQL catalog → metadata adapter                       |
| `packages/adapter-dbt`    | dbt manifest → metadata adapter                      |
| `packages/adapter-json`   | JSON definition → metadata adapter                   |
| `packages/query-client`   | Query abstraction layer                              |
| `packages/cli`            | CLI tooling                                          |
| `packages/dev-app`        | Development/demo application                         |
| `packages/docs`           | Documentation site                                   |

## Package-Specific Rules

When modifying files in specific packages, read the corresponding instruction file:

- `packages/schema/**` → `.github/instructions/schema.instructions.md`
- `packages/runtime/**` → `.github/instructions/runtime.instructions.md`
- `packages/designer/**` → `.github/instructions/designer.instructions.md`
- `packages/charts-echarts/**` → `.github/instructions/charts.instructions.md`
- `packages/data-model/**`, `packages/adapter-*/**`, `packages/query-client/**` → `.github/instructions/adapters.instructions.md`

## Detailed Skills (read on demand)

For domain-specific knowledge, read the relevant skill file:

- **Schema design**: `.github/skills/schema-design/SKILL.md`
- **ECharts widgets**: `.github/skills/echarts-widgets/SKILL.md`
- **Puck integration**: `.github/skills/puck-integration/SKILL.md`
- **Adapter development**: `.github/skills/adapter-development/SKILL.md`
- **Browser testing**: `.github/skills/browser-testing/SKILL.md`
- **OSS archaeology**: `.github/skills/oss-archaeology/SKILL.md`
- **Orchestration**: `.github/skills/orchestration/SKILL.md`
- **GitHub CLI usage**: `.github/skills/github-cli/SKILL.md`
- **Work kickoff**: `.github/skills/work-kickoff/SKILL.md`
- **Branch/CI promotion**: `.github/skills/branch-ci-promotion/SKILL.md`
- **Release runbook**: `.github/skills/release-runbook/SKILL.md`
- **Document a feature**: `.github/skills/document-feature/SKILL.md`
- **AI context maintenance**: `.github/skills/maintaining-ai-context/SKILL.md`
- **Parallel agent work**: `.github/skills/parallel-agent-environments/SKILL.md`

## Agent Roles (for multi-agent coordination)

See `AGENTS.md` for orchestrator instructions and `.github/agents/` for specialized agent definitions.

## Context Recovery

If resuming work on this project:

1. Read `docs/status/master-plan.md` for current phase and task state
2. Read `docs/status/risk-register.md` for active risks
3. Check `docs/adr/` for architecture decisions
4. Check `git log --oneline -20` for recent commits
